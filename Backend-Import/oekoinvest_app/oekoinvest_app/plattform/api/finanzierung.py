# Copyright (c) 2026, ÖkoInvest GmbH
#
# Finanzierung (docs/API.md, Abschnitt „Finanzierung“; Recherche docs/FINANZIERUNG.md) – Referenz:
# src/lib/plattform/backend/demo/finanzierung.js. Aufteilung mit der Website (Frappe-Adapter backend/frappe/finanzierung.js):
#   Frappe   prüft Rolle UND Eigentum, speichert, versendet E-Mails/Benachrichtigungen, rechnet Covenants (Scheduler)
#   Website  rechnet Financial Model, Finanzierungsvarianten, Term-Sheet-Vergleich und Geschäftsmodell mit denselben reinen
#            Funktionen wie das Demo-Backend (src/lib/plattform/finanzierung/*.js) – auf dem Server, nie im Browser
#
# Rechte:
#   Investor/Anbieter – Cockpit je Projekt nur mit freigegebenem Datenraum (NDA) bzw. als Anbieter; Szenarien nur eigene
#   Backoffice        – Bereich „finanzierung“ (rechte.py): lesen ≥ 1, schreiben = 2; Entscheidung und Geschäftsmodell nur Leitung
#   Bank              – Website-Rolle „bank“ (nur per Einladung) UND Konto in `Plattform Bank.konten` der angefragten Bank;
#                       sieht nur Anfragen ihrer Bank und darin nur freigegebene Bausteine

import base64
import re
import secrets

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, getdate, now_datetime, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.finanzierung_kern import (
	BANKENPAKET, BANKENPAKET_IDS, CP_STANDARD, GESCHAEFTSMODELLE, FinanzierungFehler, all_in_zins, capex_quelle, covenant_pruefung,
	kalkulation_kurz, monats_cfads, termsheet_bereinigen, tilgungsplan,
)
from oekoinvest_app.plattform.kern import (
	als_json, aus_json, iso, ist_admin, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten,
)
from oekoinvest_app.plattform.rechte import stufe, unterrollen

DT_FALL = "Plattform Finanzierungsfall"
DT_BANK = "Plattform Bank"
DT_ANFRAGE = "Plattform Finanzierungsanfrage"
DT_TS = "Plattform Term Sheet"
DT_KV = "Plattform Kreditvertrag"
DT_CO = "Plattform Covenant Pruefung"
DT_DOK = "Plattform Finanzierungsdokument"
DT_SZ = "Plattform Finanzierungsszenario"
EINLADUNG_TAGE = 14
MAX_SZENARIEN = 30
UPLOAD_TYPEN = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}

# ================================================================ Rechte


def bo_lesen(n):
	return ist_admin(n) and stufe(n, "finanzierung") >= 1


def bo_schreiben(n):
	return ist_admin(n) and stufe(n, "finanzierung") >= 2


def leitung(n):
	return ist_admin(n) and "leitung" in unterrollen(n)


def lese_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_lesen(n):
		verboten("Nur für das Backoffice (Finanzierung).")


def schreib_noetig(n):
	if not n:
		nicht_angemeldet()
	if not bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzierung & Banken“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Finanzierung).")


def _fach(fn, *a):
	try:
		return fn(*a)
	except FinanzierungFehler as e:
		ungueltig(str(e))


def _fall(kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_FALL, k):
		nicht_gefunden("Finanzierungsfall nicht gefunden.")
	return frappe.get_doc(DT_FALL, k)


def _banken_des_kontos(n):
	if not n or "bank" not in (n.get("rollen") or []):
		return []
	return [b.name for b in frappe.get_all(DT_BANK, fields=["name", "konten"], limit_page_length=0) if n.id in (aus_json(b.konten, []) or [])]


def _bank_anfrage(n, anfrage_id):
	"""Anfrage der eigenen Bank (sonst 403/404) → (anfrage, fall)."""
	k = v.kennung(anfrage_id)
	if not k or not frappe.db.exists(DT_ANFRAGE, k):
		nicht_gefunden("Anfrage nicht gefunden.")
	a = frappe.get_doc(DT_ANFRAGE, k)
	if a.bank_id not in _banken_des_kontos(n):
		verboten("Diese Anfrage richtet sich an eine andere Bank.")
	if a.status == "zurueckgezogen":
		verboten("Die Anfrage wurde zurückgezogen.")
	return a, frappe.get_doc(DT_FALL, a.fall_id)


def _verlauf(f, n, text):
	liste = aus_json(f.verlauf, []) or []
	liste.append({"am": iso(now_datetime()), "von": name_von(n.id) if n else "System", "text": v.text(text, 300)})
	f.verlauf = als_json(liste[-200:])


def _anfrage_verlauf(a, text, fuer_bank=True):
	liste = aus_json(a.verlauf, []) or []
	liste.append({"am": iso(now_datetime()), "text": v.text(text, 400), "fuerBank": fuer_bank})
	a.verlauf = als_json(liste[-100:])


def _backoffice_melden(titel, text, link, objekt_id, mail=True):
	for k in aktive_admins():
		konto = frappe.db.get_value("Plattform Konto", k, ["name", "backoffice_rollen"], as_dict=True)
		if konto and stufe(frappe._dict(rollen=["admin"], backofficeRollen=konto.backoffice_rollen or ""), "finanzierung") >= 1:
			benachrichtigen(k, "finanzierung", titel, text, link, "finanzierung", objekt_id, mail=mail, mail_betreff=f"ÖkoInvest: {titel}", mail_text="Es gibt Neuigkeiten zu einer Finanzierung. Details sehen Sie nach der Anmeldung im Portal.")


# ================================================================ Ausgabe


def _bank_json(b):
	return {
		"id": b.name, "name": b.bank_name, "land": b.land, "art": b.art, "ansprechpartner": b.ansprechpartner or "", "email": b.email, "telefon": b.telefon or "",
		"schwerpunkt": b.schwerpunkt or "", "notiz": b.notiz or "", "portalKonten": len(aus_json(b.konten, []) or []), "anfragen": frappe.db.count(DT_ANFRAGE, {"bank_id": b.name}),
	}


def _ts_json(t):
	return {"id": t.name, "am": iso(t.am), "von": t.von, "daten": aus_json(t.termsheet, {}) or {}}


def _anfrage_json(a, intern=True):
	b = frappe.db.get_value(DT_BANK, a.bank_id, ["bank_name", "ansprechpartner"], as_dict=True) or {}
	ts = frappe.get_all(DT_TS, filters={"anfrage_id": a.name}, fields=["name", "am", "von", "termsheet"], order_by="am desc")
	verlauf = aus_json(a.verlauf, []) or []
	return {
		"id": a.name, "fallId": a.fall_id, "bankId": a.bank_id, "bank": b.get("bank_name", ""), "ansprechpartner": b.get("ansprechpartner", "") if intern else None,
		"status": a.status, "frist": str(a.frist or ""), "gesendetAm": iso(a.gesendet_am), "nachricht": a.nachricht or "",
		"termsheet": {**_ts_json(frappe._dict(ts[0])), "version": len(ts)} if ts else None,
		"verlauf": verlauf if intern else [x for x in verlauf if x.get("fuerBank")],
		"einladungOffen": (a.einladung_status == "offen" and a.einladung_ablauf and get_datetime(a.einladung_ablauf) > now_datetime()) if intern else None,
	}


def _dok_json(d):
	return {"id": d.name, "baustein": d.baustein, "name": d.dateiname, "mime": d.mime, "groesse": cint(d.groesse), "am": iso(d.am)}


def _kv_json(f):
	name = frappe.db.get_value(DT_KV, {"fall_id": f.name}, "name")
	if not name:
		return None
	k = frappe.get_doc(DT_KV, name)
	return {
		"id": k.name, "nummer": k.nummer, "unterzeichnetAm": str(k.unterzeichnet_am or ""), "auszahlungAm": str(k.auszahlung_am or ""), "bank": frappe.db.get_value(DT_BANK, k.bank_id, "bank_name") or "",
		"betrag": flt(k.betrag), "zinsPct": flt(k.zins_pct), "laufzeitJahre": cint(k.laufzeit_jahre), "tilgungsprofil": k.tilgungsprofil, "tilgungsfreiJahre": cint(k.tilgungsfrei_jahre),
		"dscrCovenant": flt(k.dscr_covenant), "dscrLockup": flt(k.dscr_lockup), "llcrCovenant": flt(k.llcr_covenant) or None, "dsraMonate": cint(k.dsra_monate),
		"berichtspflichten": [x for x in (k.berichtspflichten or "").split("\n") if x.strip()],
	}


def _bezug(f):
	if f.bezug_art == "entwicklung" and f.bezug_id and frappe.db.exists("Plattform Entwicklungsprojekt", f.bezug_id):
		return {"art": "entwicklung", "id": f.bezug_id, "titel": frappe.db.get_value("Plattform Entwicklungsprojekt", f.bezug_id, "titel"), "link": f"/portal/admin/entwicklung/{f.bezug_id}"}
	if f.bezug_art == "anlage" and f.bezug_id and frappe.db.exists("Plattform Anlage", f.bezug_id):
		return {"art": "anlage", "id": f.bezug_id, "titel": frappe.db.get_value("Plattform Anlage", f.bezug_id, "titel") or f.bezug_id, "link": f"/portal/admin/anlagen/{f.bezug_id}"}
	return None


FALL_LABEL = {"vorbereitung": "Vorbereitung", "angefragt": "Banken angefragt", "termsheets": "Term Sheets liegen vor", "entschieden": "Bank ausgewählt", "vertrag": "Kreditvertrag unterzeichnet", "auszahlung": "Ausgezahlt / Betrieb", "abgebrochen": "Abgebrochen"}


def _kalkulation_kurz(projekt_id):
	"""Übergebener Stand der Projektkostenkalkulation eines Entwicklungsprojekts (Plattform Kostenkalkulation.uebergabe) – oder None."""
	if not projekt_id or not frappe.db.exists("DocType", "Plattform Kostenkalkulation"):
		return None
	return kalkulation_kurz(aus_json(frappe.db.get_value("Plattform Kostenkalkulation", {"projekt_id": projekt_id}, "uebergabe"), None))


def _fall_json(f, voll=False):
	e = aus_json(f.eingaben, {}) or {}
	quelle = e.pop("_capexQuelle", None)  # Herkunft des Capex (im JSON der Eingaben mitgeführt, nicht Teil des Financial Model)
	cov = aus_json(f.covenant, None)
	gm = aus_json(f.geschaeftsmodell_detail, None)
	out = {
		"id": f.name, "titel": f.titel, "spv": f.spv or "", "spvOrganisationId": f.spv_organisation_id or None, "land": e.get("land", f.land), "typ": e.get("typ"), "mwp": e.get("mwp", flt(f.mwp)),
		"capex": e.get("capex"), "betragWunsch": flt(f.betrag_wunsch), "status": f.status, "statusLabel": FALL_LABEL.get(f.status, f.status), "bezug": _bezug(f), "geschaeftsmodell": gm,
		"anfragenAnzahl": frappe.db.count(DT_ANFRAGE, {"fall_id": f.name}), "termsheetsAnzahl": frappe.db.count(DT_ANFRAGE, {"fall_id": f.name, "status": ["in", ["termsheet", "ausgewaehlt"]]}),
		"covenant": {"ampel": cov.get("ampel"), "letzte": cov.get("letzte"), "llcr": cov.get("llcr"), "geprueftAm": cov.get("geprueftAm")} if cov else None,
		"kreditvertrag": _kv_json(f), "reporting": {"naechsteFrist": str(f.reporting_frist or ""), "zuletzt": iso(f.reporting_zuletzt), "gemahnt": bool(cint(f.reporting_gemahnt))} if f.reporting_frist else None,
		"erstelltAm": iso(f.creation), "geaendertAm": iso(f.modified),
		"capexQuelle": quelle,  # { art: kostenkalkulation|standard|manuell, stand, standLabel, am, finanzierungsbedarf }
	}
	if not voll:
		return out
	frei = aus_json(f.paket_freigabe, []) or []
	doks = [_dok_json(frappe._dict(d)) for d in frappe.get_all(DT_DOK, filters={"fall_id": f.name}, fields=["name", "baustein", "dateiname", "mime", "groesse", "am"], order_by="am desc")]
	kyb = None
	if f.spv_organisation_id:
		try:
			from oekoinvest_app.plattform.kyc_kern import kyc_status

			kyb = kyc_status(organisation=f.spv_organisation_id)
		except Exception:
			kyb = None
	paket = []
	for bid, label, quelle, pflicht in BANKENPAKET:
		d = [x for x in doks if x["baustein"] == bid]
		vorhanden = True if quelle == "auto" else ((kyb or {}).get("status") == "verifiziert" or bool(d)) if quelle == "kyb" else bool(d)
		paket.append({"id": bid, "label": label, "quelle": quelle, "pflicht": pflicht, "vorhanden": vorhanden, "freigegeben": bid in frei, "dokumente": d, "kyb": kyb if quelle == "kyb" else None})
	out.update({
		"eingaben": e, "notiz": f.notiz or "", "paket": paket, "paketFreigabe": frei, "cps": aus_json(f.cps, []) or [], "entscheidung": aus_json(f.entscheidung, None),
		"anfragen": [_anfrage_json(frappe.get_doc(DT_ANFRAGE, a)) for a in frappe.get_all(DT_ANFRAGE, filters={"fall_id": f.name}, pluck="name", order_by="creation asc")],
		"covenantDetail": cov, "verlauf": list(reversed((aus_json(f.verlauf, []) or [])[-40:])), "dokumente": doks,
	})
	return out


# ================================================================ 1. Investoren-Cockpit


def _cockpit_zugriff(n, projekt_id):
	if not n:
		nicht_angemeldet()
	rollen = n.get("rollen") or []
	if not ist_admin(n) and not any(r in rollen for r in ("investor", "anbieter")):
		verboten("Das Finanzierungscockpit mit Projektdaten steht Investoren und Anbietern zur Verfügung.")
	from oekoinvest_app.plattform.ausgabe import projekt_json
	from oekoinvest_app.plattform.oeffentlich import projekt_vertraulich
	from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, interesse_fuer
	from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS
	from oekoinvest_app.plattform.api.boerse import boerse_eintrag

	k = v.kennung(projekt_id)
	if not k or not frappe.db.exists("Plattform Projekt", k):
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", k)
	eigentuemer = p.anbieter_id == n.id or darf_team_lesen_objekt(n, p)
	if p.status not in BOERSE_STATUS and not eigentuemer and not ist_admin(n):
		nicht_gefunden("Projekt nicht gefunden.")
	interesse = interesse_fuer(n, p.name)
	nda = bool(interesse) and interesse.status in DATENRAUM_STATUS
	zugriff = "admin" if ist_admin(n) else "eigentuemer" if eigentuemer else "nda" if nda else "oeffentlich"
	if zugriff == "oeffentlich":
		verboten("Das Cockpit mit Projektdaten ist nach Freigabe des Datenraums (NDA) möglich.")
	pj = projekt_json(p)
	return {"projekt": boerse_eintrag(p, n), "zugriff": zugriff, "vertraulich": projekt_vertraulich(pj), "datenblatt": pj.get("datenblatt") or {}}


def _szenario_json(s):
	return {"id": s.name, "name": s.name_szenario, "projektId": s.projekt_id or None, "projektTitel": s.projekt_titel or "", "fokus": s.fokus, "eingaben": aus_json(s.eingaben, {}), "ergebnis": aus_json(s.ergebnis, {}), "am": iso(s.am)}


@frappe.whitelist(methods=["POST"])
def cockpit_liste(als_benutzer=None):
	n = nutzer(als_benutzer)
	from oekoinvest_app.plattform.prozesse import DATENRAUM_STATUS

	ids = set(frappe.get_all("Plattform Interesse", filters={"investor_id": n.id, "status": ["in", list(DATENRAUM_STATUS) + ["abgeschlossen"]]}, pluck="projekt_id", limit_page_length=0))
	if "anbieter" in (n.get("rollen") or []):
		ids |= set(frappe.get_all("Plattform Projekt", filters={"anbieter_id": n.id, "status": "veroeffentlicht"}, pluck="name", limit_page_length=0))
	projekte = []
	for pid in list(ids)[:40]:
		try:
			d = _cockpit_zugriff(n, pid)
			pr = d["projekt"]
			projekte.append({"id": pr.get("id"), "titel": pr.get("titel"), "mwp": pr.get("mwp"), "land": pr.get("land"), "typ": pr.get("typ"), "phase": pr.get("phase"), "zugriff": d["zugriff"]})
		except frappe.PermissionError:
			continue
		except frappe.DoesNotExistError:
			continue
	sz = frappe.get_all(DT_SZ, filters={"nutzer_id": n.id}, fields=["*"], order_by="am desc", limit_page_length=MAX_SZENARIEN)
	return {"projekte": projekte, "szenarien": [_szenario_json(frappe._dict(s)) for s in sz]}


@frappe.whitelist(methods=["POST"])
def cockpit_projekt(projektId=None, als_benutzer=None):  # noqa: N803
	"""Rechtegeprüfte Projektdaten (Datenblatt, vertrauliche Angaben) – die Vorbelegung rechnet der Adapter (vorbelegung.js)."""
	n = nutzer(als_benutzer)
	d = _cockpit_zugriff(n, projektId)
	pid = d["projekt"].get("id")
	sz = frappe.get_all(DT_SZ, filters={"nutzer_id": n.id, "projekt_id": pid}, fields=["*"], order_by="am desc")
	return {**d, "szenarien": [_szenario_json(frappe._dict(s)) for s in sz]}


@frappe.whitelist(methods=["POST"])
def szenario_speichern(projektId=None, name=None, eingaben=None, ergebnis=None, fokus=None, als_benutzer=None):  # noqa: N803
	"""Eingaben (bereinigt) und Ergebnis rechnet der Website-Server mit kern.js und übergibt beides."""
	n = nutzer(als_benutzer)
	titel = v.text(name, 80)
	if len(titel) < 2:
		ungueltig("Bitte geben Sie dem Szenario einen Namen.")
	projekt = _cockpit_zugriff(n, projektId)["projekt"] if projektId else None
	if frappe.db.count(DT_SZ, {"nutzer_id": n.id}) >= MAX_SZENARIEN:
		ungueltig(f"Höchstens {MAX_SZENARIEN} Szenarien – bitte ältere löschen.")
	s = frappe.get_doc({
		"doctype": DT_SZ, "nutzer_id": n.id, "projekt_id": (projekt or {}).get("id"), "projekt_titel": (projekt or {}).get("titel") or "", "name_szenario": titel,
		"fokus": v.auswahl(fokus, ["skulptiert", "ek", "annuitaet", "foerder", "leasing", "mietkauf", "misch"], "skulptiert"), "am": now_datetime(),
		"eingaben": als_json(aus_json(eingaben, {}) or {}), "ergebnis": als_json(aus_json(ergebnis, {}) or {}),
	}).insert(ignore_permissions=True)
	protokoll(n, "szenario", "projekt" if projekt else "finanzierung", (projekt or {}).get("id") or s.name, f"Finanzierungsszenario „{titel}“ gespeichert")
	return _szenario_json(s)


def _eigenes_szenario(n, kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(DT_SZ, k):
		nicht_gefunden("Szenario nicht gefunden.")
	s = frappe.get_doc(DT_SZ, k)
	if s.nutzer_id != n.id:
		verboten()
	return s


@frappe.whitelist(methods=["POST"])
def szenario_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	s = _eigenes_szenario(n, id)
	frappe.delete_doc(DT_SZ, s.name, ignore_permissions=True, force=True)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def szenario(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	s = _eigenes_szenario(n, id)
	if s.projekt_id:
		_cockpit_zugriff(n, s.projekt_id)
	protokoll(n, "szenario_pdf", "finanzierung", s.name, f"Szenario-PDF „{s.name_szenario}“ erzeugt", ip or "")
	return {**_szenario_json(s), "empfaenger": {"name": name_von(n.id), "email": n.email}}


# ================================================================ 2. Backoffice


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	faelle = [_fall_json(frappe.get_doc(DT_FALL, x)) for x in frappe.get_all(DT_FALL, pluck="name", order_by="modified desc", limit_page_length=500)]
	aktiv = [f for f in faelle if f["status"] != "abgebrochen"]
	grenze = str(add_days(nowdate(), 14))
	return {
		"faelle": faelle,
		"banken": [_bank_json(frappe.get_doc(DT_BANK, b)) for b in frappe.get_all(DT_BANK, pluck="name", order_by="bank_name asc", limit_page_length=500)],
		"kennzahlen": {
			"faelleAktiv": len(aktiv),
			"volumenAngefragt": sum(f["betragWunsch"] for f in aktiv if f["status"] in ("angefragt", "termsheets", "entschieden")),
			"kreditvolumen": sum((f["kreditvertrag"] or {}).get("betrag", 0) for f in aktiv),
			"ampelRot": sum(1 for f in aktiv if ((f["covenant"] or {}).get("ampel") or {}).get("id") == "rot"),
			"ampelGelb": sum(1 for f in aktiv if ((f["covenant"] or {}).get("ampel") or {}).get("id") == "gelb"),
			"reportingFaellig": sum(1 for f in aktiv if f["reporting"] and f["reporting"]["naechsteFrist"] and f["reporting"]["naechsteFrist"] <= grenze),
		},
		"covenantLaufAm": iso(frappe.db.sql("select max(covenant_geprueft_am) from `tabPlattform Finanzierungsfall`")[0][0]),
		"darfSchreiben": bo_schreiben(n),
		"leitung": leitung(n),
	}


@frappe.whitelist(methods=["POST"])
def fall(id=None, als_benutzer=None):  # noqa: A002
	"""Fall inkl. Anfragen/Term Sheets – Financial Model (`modell`) und Vergleich (`vergleich`) ergänzt der Adapter."""
	n = nutzer(als_benutzer)
	lese_noetig(n)
	f = _fall(id)
	banken = [_bank_json(frappe.get_doc(DT_BANK, b)) for b in frappe.get_all(DT_BANK, filters={"status": "aktiv"}, pluck="name", limit_page_length=500)]
	return {**_fall_json(f, voll=True), "banken": banken, "darfSchreiben": bo_schreiben(n), "leitung": leitung(n)}


@frappe.whitelist(methods=["POST"])
def auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	lese_noetig(n)
	ent = frappe.get_all("Plattform Entwicklungsprojekt", filters={"status": ["!=", "abgebrochen"]}, fields=["name", "titel", "mwp", "land", "typ"], limit_page_length=500) if frappe.db.exists("DocType", "Plattform Entwicklungsprojekt") else []
	anl = frappe.get_all("Plattform Anlage", filters={"kwp": [">", 0]}, fields=["name", "kwp", "land", "typ"], limit_page_length=500)
	return {
		"entwicklung": [{"id": x.name, "titel": x.titel, "mwp": flt(x.mwp), "land": x.land, "typ": x.typ, "kostenkalkulation": _kalkulation_kurz(x.name)} for x in ent],
		"anlagen": [{"id": x.name, "titel": frappe.db.get_value("Plattform Anlage", x.name, "titel") or x.name, "kwp": flt(x.kwp), "land": x.land, "typ": x.typ} for x in anl],
	}


@frappe.whitelist(methods=["POST"])
def fall_anlegen(daten=None, als_benutzer=None):
	"""`daten.eingaben` sind bereits vom Adapter bereinigt (cockpitBereinigen inkl. Vorbelegung aus dem Bezug)."""
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	bezug_art = v.auswahl(d.get("bezugArt"), ["entwicklung", "anlage", "frei"], "frei")
	bezug_id = v.kennung(d.get("bezugId")) if bezug_art != "frei" else None
	if bezug_art != "frei" and not bezug_id:
		ungueltig("Bitte das Projekt bzw. die Anlage wählen.")
	e = d.get("eingaben") or {}
	titel = v.text(d.get("titel"), 120)
	if len(titel) < 3:
		ungueltig("Bitte einen Titel angeben.")
	capex = flt(e.get("capex"))
	quelle = capex_quelle(capex, _kalkulation_kurz(bezug_id)) if bezug_art == "entwicklung" else None
	e = {**e, "_capexQuelle": quelle} if quelle else e
	f = frappe.get_doc({
		"doctype": DT_FALL, "titel": titel, "spv": v.text(d.get("spv"), 160), "spv_organisation_id": v.kennung(d.get("spvOrganisationId")) or None,
		"bezug_art": bezug_art, "bezug_id": bezug_id, "land": v.auswahl(e.get("land"), ["DE", "AT", "CH"], "DE"), "mwp": flt(e.get("mwp")),
		"betrag_wunsch": round(v.zahl(d.get("betragWunsch"), 0, 5e9) or capex * flt(e.get("fkQuote") or 0.75)), "status": "vorbereitung",
		"eingaben": als_json(e), "paket_freigabe": als_json(["steckbrief", "financial_model"]),
		"cps": als_json([{"id": i, "label": l, "erledigt": False, "am": None, "von": None, "nachweis": ""} for i, l in CP_STANDARD]),
		"notiz": v.mehrzeilig(d.get("notiz"), 2000), "erstellt_von": n.id, "verlauf": als_json([]),
	})
	_verlauf(f, n, f"Finanzierungsfall angelegt – Capex aus Kostenkalkulation{' (' + quelle['standLabel'] + ')' if quelle.get('standLabel') else ''}" if (quelle or {}).get("art") == "kostenkalkulation" else "Finanzierungsfall angelegt")
	f.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "finanzierung", f.name, f"Finanzierungsfall „{f.titel}“ angelegt")
	return _fall_json(f)


@frappe.whitelist(methods=["POST"])
def fall_aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	f = _fall(id)
	d = aus_json(daten, {}) or {}
	for feld, schluessel, laenge in (("titel", "titel", 120), ("spv", "spv", 160)):
		if d.get(schluessel) is not None:
			f.set(feld, v.text(d.get(schluessel), laenge) or f.get(feld))
	if d.get("notiz") is not None:
		f.notiz = v.mehrzeilig(d.get("notiz"), 2000)
	if d.get("betragWunsch") is not None:
		f.betrag_wunsch = round(v.zahl(d.get("betragWunsch"), 0, 5e9) or 0)
	if d.get("eingaben"):
		alt = aus_json(f.eingaben, {}) or {}
		neu = dict(d.get("eingaben") or {})  # vom Adapter bereinigt (cockpitBereinigen)
		neu.pop("_capexQuelle", None)
		if alt.get("_capexQuelle"):  # Herkunft behalten, solange der Capex unverändert ist
			neu["_capexQuelle"] = alt["_capexQuelle"] if abs(flt(neu.get("capex")) - flt(alt.get("capex"))) < 1 else {"art": "manuell"}
		f.eingaben = als_json(neu)
		_verlauf(f, n, "Financial Model aktualisiert")
	if d.get("status") is not None:
		s = v.auswahl(d.get("status"), ["abgebrochen", "vorbereitung"], "")
		if not s:
			ungueltig("Status nur über die Aktionen ändern (abbrechen bzw. wieder aufnehmen).")
		if s == "abgebrochen" and len(v.text(d.get("begruendung"), 500)) < 5:
			ungueltig("Bitte eine Begründung angeben.")
		f.status = s
		_verlauf(f, n, "Abgebrochen" if s == "abgebrochen" else "Wieder aufgenommen")
	f.save(ignore_permissions=True)
	protokoll(n, "aendern", "finanzierung", f.name, "Finanzierungsfall geändert")
	return _fall_json(f)


@frappe.whitelist(methods=["POST"])
def bank_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	name = v.text(d.get("name"), 160)
	email = v.email(d.get("email"))
	if len(name) < 3:
		ungueltig("Bitte den Namen der Bank angeben.")
	if not email:
		ungueltig("Bitte eine gültige E-Mail-Adresse der Ansprechperson angeben.")
	k = v.kennung(d.get("id"))
	b = frappe.get_doc(DT_BANK, k) if k and frappe.db.exists(DT_BANK, k) else frappe.new_doc(DT_BANK)
	if d.get("id") and b.is_new():
		nicht_gefunden("Bank nicht gefunden.")
	b.update({
		"bank_name": name, "email": email, "land": v.auswahl(d.get("land"), ["DE", "AT", "CH"], "DE"),
		"art": v.auswahl(d.get("art"), ["geschaeftsbank", "foerderbank", "sparkasse", "genossenschaft", "leasing", "sonstige"], "geschaeftsbank"),
		"ansprechpartner": v.text(d.get("ansprechpartner"), 120), "telefon": v.text(d.get("telefon"), 40), "schwerpunkt": v.text(d.get("schwerpunkt"), 200), "notiz": v.mehrzeilig(d.get("notiz"), 1000),
	})
	if b.is_new():
		b.konten = als_json([])
	b.save(ignore_permissions=True)
	protokoll(n, "aendern", "bank", b.name, f"Bankenstamm: {b.bank_name}")
	return _bank_json(b)


def _einladung(n, a, email, basis):
	token = secrets.token_urlsafe(32)
	a.einladung_email = email
	a.einladung_hash = sha256(token)
	a.einladung_ablauf = add_days(now_datetime(), EINLADUNG_TAGE)
	a.einladung_status = "offen"
	return f"{basis}/einladung/bank/{token}"


def _bank_mail(email, empfaenger_name, betreff, text, link):
	from oekoinvest_app.plattform.mail import _senden, basis_url

	basis = basis_url()
	if not basis:
		return False
	return _senden(email, betreff, "oekoinvest_hinweis", {"vorname": empfaenger_name or "", "text": text, "link": link, "basis": basis})


def _neueste_ts(anfrage_id):
	name = frappe.get_all(DT_TS, filters={"anfrage_id": anfrage_id}, pluck="name", order_by="am desc", limit_page_length=1)
	return frappe.get_doc(DT_TS, name[0]) if name else None


def _ts_ablegen(n, f, a, t, von):
	if a.status in ("zurueckgezogen", "nicht_ausgewaehlt"):
		konflikt("Die Anfrage ist nicht mehr offen.")
	if aus_json(f.entscheidung, None):
		konflikt("Die Bankentscheidung ist bereits gefallen.")
	frappe.get_doc({
		"doctype": DT_TS, "anfrage_id": a.name, "fall_id": f.name, "bank_id": a.bank_id, "von": von, "von_id": n.id, "am": now_datetime(),
		"betrag": t["betrag"], "laufzeit_jahre": t["laufzeitJahre"], "zins_art": t["zinsArt"], "zins_pct": t["zinsPct"], "marge_pct": t["margePct"],
		"tilgungsprofil": t["tilgungsprofil"], "dscr_covenant": t["dscrCovenant"], "dscr_lockup": t["dscrLockup"], "termsheet": als_json(t),
	}).insert(ignore_permissions=True)
	a.status = "termsheet"
	_anfrage_verlauf(a, "Term Sheet von der Bank eingereicht" if von == "bank" else "Term Sheet durch ÖkoInvest erfasst")
	a.save(ignore_permissions=True)
	if f.status in ("vorbereitung", "angefragt"):
		f.status = "termsheets"
	_verlauf(f, n, f"Term Sheet {frappe.db.get_value(DT_BANK, a.bank_id, 'bank_name')} ({round(t['betrag'] / 1000)} T€, {t['laufzeitJahre']} J.)")


def _naechste_reporting_frist(heute=None):
	d = getdate(heute or nowdate())
	q_ende_monat = ((d.month - 1) // 3) * 3 + 3
	jahr = d.year
	from calendar import monthrange

	ende = d.replace(month=q_ende_monat, day=monthrange(jahr, q_ende_monat)[1])
	return add_days(ende, 45)


@frappe.whitelist(methods=["POST"])
def aktion(fallId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("aktion"), ["anfragen", "paket", "termsheet", "entscheidung", "kreditvertrag", "cp", "covenant", "geschaeftsmodell", "einladung_neu", "anfrage_zurueck"], "")
	if not art:
		ungueltig("Unbekannte Aktion.")
	f = _fall(fallId)
	if f.status == "abgebrochen" and art != "geschaeftsmodell":
		konflikt("Der Fall ist abgebrochen.")
	demo_links = []
	basis = str(d.get("basisUrl") or "").rstrip("/")
	if art == "covenant":
		_covenant_fall(f, n)
	elif art == "anfragen":
		ids = list(dict.fromkeys(x for x in (v.kennung(y) for y in (d.get("bankIds") or [])) if x))
		if not 1 <= len(ids) <= 15:
			ungueltig("Bitte eine bis 15 Banken wählen.")
		frist = str(d.get("frist") or "") if re.match(r"^\d{4}-\d{2}-\d{2}$", str(d.get("frist") or "")) else str(add_days(nowdate(), 21))
		if frist <= nowdate():
			ungueltig("Die Frist muss in der Zukunft liegen.")
		neu = 0
		for bid in ids:
			if not frappe.db.exists(DT_BANK, bid):
				nicht_gefunden("Bank nicht gefunden.")
			if frappe.db.exists(DT_ANFRAGE, {"fall_id": f.name, "bank_id": bid, "status": ["not in", ["abgesagt", "zurueckgezogen"]]}):
				continue
			b = frappe.get_doc(DT_BANK, bid)
			a = frappe.get_doc({"doctype": DT_ANFRAGE, "fall_id": f.name, "bank_id": bid, "status": "offen", "frist": frist, "nachricht": v.mehrzeilig(d.get("nachricht"), 2000), "gesendet_am": now_datetime(), "verlauf": als_json([])})
			_anfrage_verlauf(a, "Anfrage gesendet")
			link = _einladung(n, a, b.email, basis)
			a.insert(ignore_permissions=True)
			_bank_mail(b.email, b.ansprechpartner, f"Finanzierungsanfrage „{f.titel}“ – ÖkoInvest", f"ÖkoInvest bittet um ein indikatives Finanzierungsangebot (Term Sheet) für „{f.titel}“. Frist: {frist}. Das Bankenpaket steht im gesicherten Datenraum bereit – der Link ist persönlich, {EINLADUNG_TAGE} Tage gültig und nur mit Anmeldung nutzbar.", link)
			for k in aus_json(b.konten, []) or []:
				benachrichtigen(k, "finanzierung", "Neue Finanzierungsanfrage", f"„{f.titel}“ – Frist {frist}", f"/portal/bank/{a.name}", "finanzierung", a.name, mail=False)
			if frappe.conf.get("developer_mode"):
				demo_links.append({"bankId": bid, "link": link})
			neu += 1
		if not neu:
			ungueltig("Alle gewählten Banken sind bereits angefragt.")
		if f.status == "vorbereitung":
			f.status = "angefragt"
		_verlauf(f, n, f"{neu} Bank(en) angefragt, Frist {frist}")
	elif art in ("einladung_neu", "anfrage_zurueck"):
		k = v.kennung(d.get("anfrageId"))
		if not k or frappe.db.get_value(DT_ANFRAGE, k, "fall_id") != f.name:
			nicht_gefunden("Anfrage nicht gefunden.")
		a = frappe.get_doc(DT_ANFRAGE, k)
		b = frappe.get_doc(DT_BANK, a.bank_id)
		if art == "einladung_neu":
			link = _einladung(n, a, b.email, basis)
			_bank_mail(b.email, b.ansprechpartner, f"Neuer Zugang: Finanzierungsanfrage „{f.titel}“", "Ihr Zugangslink zum Bankenpaket wurde erneuert. Ältere Links sind ungültig.", link)
			if frappe.conf.get("developer_mode"):
				demo_links.append({"bankId": b.name, "link": link})
			_verlauf(f, n, f"Zugangslink für {b.bank_name} erneuert")
		else:
			a.status = "zurueckgezogen"
			a.einladung_status = "widerrufen"
			_anfrage_verlauf(a, "Anfrage von ÖkoInvest zurückgezogen")
			_verlauf(f, n, f"Anfrage an {b.bank_name} zurückgezogen")
		a.save(ignore_permissions=True)
	elif art == "paket":
		frei = v.mehrfach(d.get("freigabe"), BANKENPAKET_IDS)
		f.paket_freigabe = als_json(frei)
		_verlauf(f, n, f"Bankenpaket freigegeben: {len(frei)} von {len(BANKENPAKET_IDS)} Bausteinen")
	elif art == "termsheet":
		k = v.kennung(d.get("anfrageId"))
		if not k or frappe.db.get_value(DT_ANFRAGE, k, "fall_id") != f.name:
			nicht_gefunden("Anfrage nicht gefunden.")
		_ts_ablegen(n, f, frappe.get_doc(DT_ANFRAGE, k), _fach(termsheet_bereinigen, d.get("termsheet") or {}), "backoffice")
	elif art == "entscheidung":
		if not leitung(n):
			verboten("Die Bankentscheidung trifft die Leitung.")
		k = v.kennung(d.get("anfrageId"))
		if not k or frappe.db.get_value(DT_ANFRAGE, k, "fall_id") != f.name:
			nicht_gefunden("Anfrage nicht gefunden.")
		ts = _neueste_ts(k)
		if not ts:
			konflikt("Für diese Bank liegt kein Term Sheet vor.")
		begruendung = v.mehrzeilig(d.get("begruendung"), 1500)
		if len(begruendung) < 10:
			ungueltig("Bitte die Entscheidung begründen (mind. 10 Zeichen).")
		a = frappe.get_doc(DT_ANFRAGE, k)
		bank_name = frappe.db.get_value(DT_BANK, a.bank_id, "bank_name")
		f.entscheidung = als_json({"anfrageId": k, "termsheetId": ts.name, "bankId": a.bank_id, "bank": bank_name, "begruendung": begruendung, "am": iso(now_datetime()), "vonId": n.id, "von": name_von(n.id), "kennzahlen": d.get("kennzahlen")})
		for an in frappe.get_all(DT_ANFRAGE, filters={"fall_id": f.name}, pluck="name"):
			x = frappe.get_doc(DT_ANFRAGE, an)
			if x.name == k:
				x.status = "ausgewaehlt"
				_anfrage_verlauf(x, "Ihr Angebot wurde ausgewählt – ÖkoInvest meldet sich zur Dokumentation.")
			elif x.status in ("offen", "in_pruefung", "termsheet"):
				x.status = "nicht_ausgewaehlt"
				_anfrage_verlauf(x, "Vielen Dank – wir haben uns für ein anderes Angebot entschieden.")
			x.save(ignore_permissions=True)
			for konto in aus_json(frappe.db.get_value(DT_BANK, x.bank_id, "konten"), []) or []:
				benachrichtigen(konto, "finanzierung", "Angebot ausgewählt" if x.name == k else "Finanzierungsanfrage entschieden", f"„{f.titel}“", f"/portal/bank/{x.name}", "finanzierung", x.name)
		f.status = "entschieden"
		_verlauf(f, n, f"Entscheidung: {bank_name}")
	elif art == "kreditvertrag":
		ent = aus_json(f.entscheidung, None)
		if not ent:
			konflikt("Bitte zuerst eine Bank auswählen.")
		ts = aus_json(frappe.db.get_value(DT_TS, ent.get("termsheetId"), "termsheet"), {}) or {}
		k = d.get("kreditvertrag") or {}
		unterzeichnet = str(k.get("unterzeichnetAm") or "")
		if len(v.text(k.get("nummer"), 60)) < 2:
			ungueltig("Bitte die Vertragsnummer angeben.")
		if not re.match(r"^\d{4}-\d{2}-\d{2}$", unterzeichnet):
			ungueltig("Bitte das Unterzeichnungsdatum angeben.")
		pflichten = v.text_liste(k.get("berichtspflichten"), 10, 160) or ["Quartalsbericht mit DSCR (rollierend 12 Monate) binnen 45 Tagen nach Quartalsende", "Jahresabschluss der SPV binnen 6 Monaten", "Jährlicher technischer Betriebsbericht", "Versicherungsnachweis jährlich"]
		auszahlung = str(k.get("auszahlungAm") or "") if re.match(r"^\d{4}-\d{2}-\d{2}$", str(k.get("auszahlungAm") or "")) else None
		frappe.get_doc({
			"doctype": DT_KV, "fall_id": f.name, "bank_id": ent.get("bankId"), "nummer": v.text(k.get("nummer"), 60), "unterzeichnet_am": unterzeichnet, "auszahlung_am": auszahlung,
			"betrag": v.zahl(k.get("betrag"), 1, 5e9) or ts.get("betrag"), "zins_pct": v.zahl(k.get("zinsPct"), 0, 20) or round(all_in_zins(ts) * 100, 4),
			"laufzeit_jahre": cint(v.zahl(k.get("laufzeitJahre"), 1, 35) or ts.get("laufzeitJahre") or 18),
			"tilgungsprofil": v.auswahl(k.get("tilgungsprofil"), ["annuitaet", "linear", "skulptiert", "endfaellig"], ts.get("tilgungsprofil") or "annuitaet"),
			"tilgungsfrei_jahre": cint(v.zahl(k.get("tilgungsfreiJahre"), 0, 5) or ts.get("tilgungsfreiJahre") or 0),
			"dscr_covenant": v.zahl(k.get("dscrCovenant"), 1, 3) or ts.get("dscrCovenant") or 1.05, "dscr_lockup": v.zahl(k.get("dscrLockup"), 1, 3) or ts.get("dscrLockup") or 1.1,
			"llcr_covenant": v.zahl(k.get("llcrCovenant"), 1, 3) or ts.get("llcrCovenant"), "dsra_monate": cint(v.zahl(k.get("dsraMonate"), 0, 24) if k.get("dsraMonate") not in (None, "") else ts.get("dsraMonate", 6)),
			"berichtspflichten": "\n".join(pflichten), "plan_cfads": als_json(d.get("planCfads") or []),
		}).insert(ignore_permissions=True)
		f.reporting_frist = _naechste_reporting_frist()
		f.status = "auszahlung" if auszahlung else "vertrag"
		_verlauf(f, n, f"Kreditvertrag {v.text(k.get('nummer'), 60)} erfasst")
	elif art == "cp":
		cps = aus_json(f.cps, []) or []
		cp = next((c for c in cps if c.get("id") == v.text(d.get("cpId"), 40)), None)
		if not cp:
			nicht_gefunden("Auszahlungsvoraussetzung nicht gefunden.")
		cp["erledigt"] = v.wahr(d.get("erledigt"))
		cp["am"] = iso(now_datetime()) if cp["erledigt"] else None
		cp["von"] = name_von(n.id) if cp["erledigt"] else None
		cp["nachweis"] = v.text(d.get("nachweis"), 200)
		f.cps = als_json(cps)
		_verlauf(f, n, f"CP „{cp['label']}“ {'erledigt' if cp['erledigt'] else 'wieder offen'}")
	elif art == "geschaeftsmodell":
		g = v.auswahl(d.get("gewaehlt"), list(GESCHAEFTSMODELLE), "")
		if not g:
			ungueltig("Bitte ein Geschäftsmodell wählen.")
		if not leitung(n):
			verboten("Die Entscheidung zum Geschäftsmodell trifft die Leitung (Geschäftsführung).")
		f.geschaeftsmodell = g
		f.geschaeftsmodell_detail = als_json({"gewaehlt": g, "label": GESCHAEFTSMODELLE[g], "begruendung": v.mehrzeilig(d.get("begruendung"), 1500), "annahmen": d.get("annahmen") or {}, "werte": d.get("werte") or [], "am": iso(now_datetime()), "von": name_von(n.id)})
		_verlauf(f, n, f"Geschäftsmodell: {GESCHAEFTSMODELLE[g]}")
	f.save(ignore_permissions=True)
	protokoll(n, f"finanzierung_{art}", "finanzierung", f.name, f"Finanzierung: {art}")
	out = {"ok": True, "fall": fall(f.name, als_benutzer)}
	if demo_links:
		out["demoLinks"] = demo_links
	return out


@frappe.whitelist(methods=["POST"])
def dokument_speichern(fallId=None, baustein=None, name=None, mime=None, inhalt=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	f = _fall(fallId)
	if mime not in UPLOAD_TYPEN:
		ungueltig("Erlaubt sind PDF, JPG und PNG.")
	if baustein not in [b[0] for b in BANKENPAKET if b[2] != "auto"]:
		ungueltig("Bitte einen Baustein des Bankenpakets wählen.")
	daten = base64.b64decode(inhalt or "")
	if not daten or len(daten) > 10 * 1024 * 1024:
		ungueltig("Die Datei ist leer oder größer als 10 MB.")
	dateiname = v.text(str(name or "").replace("/", "_").replace("\\", "_"), 160) or f"dokument.{UPLOAD_TYPEN[mime]}"
	d = frappe.get_doc({"doctype": DT_DOK, "fall_id": f.name, "baustein": baustein, "dateiname": dateiname, "mime": mime, "groesse": len(daten), "sha256": sha256(daten), "von_id": n.id, "am": now_datetime()}).insert(ignore_permissions=True)
	datei = frappe.get_doc({"doctype": "File", "file_name": f"{d.name}.{UPLOAD_TYPEN[mime]}", "is_private": 1, "content": daten, "attached_to_doctype": DT_DOK, "attached_to_name": d.name, "attached_to_field": "datei"}).insert(ignore_permissions=True)
	d.db_set("datei", datei.file_url)
	_verlauf(f, n, f"Dokument „{dateiname}“ → {baustein}")
	f.save(ignore_permissions=True)
	protokoll(n, "dokument", "finanzierung", f.name, f"Bankenpaket: {dateiname}")
	return _dok_json(d)


@frappe.whitelist(methods=["POST"])
def dokument_lesen(id=None, anfrageId=None, ip=None, als_benutzer=None):  # noqa: A002, N803
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists(DT_DOK, k):
		nicht_gefunden("Dokument nicht gefunden.")
	d = frappe.get_doc(DT_DOK, k)
	if not bo_lesen(n):
		_a, f = _bank_anfrage(n, anfrageId)
		if f.name != d.fall_id or d.baustein not in (aus_json(f.paket_freigabe, []) or []):
			verboten("Dieses Dokument ist für Ihre Bank nicht freigegeben.")
	datei = frappe.get_doc("File", {"file_url": d.datei}) if d.datei else None
	if not datei:
		nicht_gefunden("Datei nicht gefunden.")
	protokoll(n, "download", "finanzierung", d.fall_id, f"Bankenpaket-Download: {d.dateiname}", ip or "")
	return {"name": d.dateiname, "mime": d.mime, "inhalt": base64.b64encode(datei.get_content()).decode()}


@frappe.whitelist(methods=["POST"])
def modell_daten(fallId=None, anfrageId=None, baustein=None, ip=None, als_benutzer=None):  # noqa: N803
	"""Eingaben für Steckbrief/Financial Model (PDF, CSV) – Backoffice oder Bank mit freigegebenem Baustein; gerechnet wird im Adapter."""
	n = nutzer(als_benutzer)
	b = baustein if baustein in ("steckbrief", "financial_model") else "financial_model"
	bank_name = ""
	if bo_lesen(n):
		f = _fall(fallId)
	else:
		a, f = _bank_anfrage(n, anfrageId)
		if b not in (aus_json(f.paket_freigabe, []) or []):
			verboten("Dieser Baustein ist für Ihre Bank nicht freigegeben.")
		bank_name = frappe.db.get_value(DT_BANK, a.bank_id, "bank_name")
	protokoll(n, "download", "finanzierung", f.name, "Projektsteckbrief abgerufen" if b == "steckbrief" else "Financial Model abgerufen", ip or "")
	bezug = _bezug(f)
	return {"fall": {"id": f.name, "titel": f.titel, "spv": f.spv or "", "betragWunsch": flt(f.betrag_wunsch), "bezug": (bezug or {}).get("titel", "")}, "eingaben": aus_json(f.eingaben, {}), "empfaenger": {"name": name_von(n.id) or n.email, "email": n.email, "bank": bank_name}}


@frappe.whitelist(methods=["POST"])
def reporting_daten(fallId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	lese_noetig(n)
	f = _fall(fallId)
	kv = _kv_json(f)
	if not kv:
		konflikt("Ohne Kreditvertrag gibt es kein Bank-Reporting.")
	f.db_set({"reporting_zuletzt": now_datetime(), "reporting_frist": _naechste_reporting_frist(add_days(nowdate(), 50)), "reporting_gemahnt": 0})
	protokoll(n, "download", "finanzierung", f.name, "Bank-Reporting (PDF) erzeugt", ip or "")
	return {"fall": _fall_json(f), "kreditvertrag": kv, "covenant": aus_json(f.covenant, None), "eingaben": aus_json(f.eingaben, {}), "bezug": _bezug(f), "ersteller": name_von(n.id)}


@frappe.whitelist(methods=["POST"])
def geschaeftsmodell(fallId=None, als_benutzer=None):  # noqa: N803
	"""Rechteprüfung + Eingaben des Falls – der Vergleich selbst wird im Adapter gerechnet (geschaeftsmodell.js)."""
	n = nutzer(als_benutzer)
	lese_noetig(n)
	return {"eingaben": aus_json(_fall(fallId).eingaben, {}) if fallId else None}


# ================================================================ Covenant-Monitoring


def _monatsreihe(f, kv):
	"""CFADS und Schuldendienst je Monat aus den abrechnungsrelevanten Zählerwerten der verknüpften Anlage."""
	if f.bezug_art != "anlage" or not f.bezug_id:
		return []
	e = aus_json(f.eingaben, {}) or {}
	vertrag = frappe.db.get_value("Plattform Contracting Vertrag", {"anlage_id": f.bezug_id}, ["strompreis_ct", "grundgebuehr_monat"], as_dict=True) or {}
	arten = {m.name: m.art for m in frappe.get_all("Plattform Messpunkt", filters={"anlage_id": f.bezug_id, "abrechnungsrelevant": 1}, fields=["name", "art"], limit_page_length=0)}
	monate = {}
	for w in frappe.get_all("Plattform Zaehlerstand Monatswert", filters={"anlage_id": f.bezug_id}, fields=["messpunkt_id", "monat", "register", "menge"], limit_page_length=0):
		m = monate.setdefault(w.monat, {"erzeugung": 0.0, "einspeisung": 0.0})
		if arten.get(w.messpunkt_id) == "erzeugung":
			m["erzeugung"] += flt(w.menge)
		elif arten.get(w.messpunkt_id) == "zweirichtung" and w.register == "2.8.0":
			m["einspeisung"] += flt(w.menge)
	plan = tilgungsplan(flt(kv.betrag), flt(kv.zins_pct) / 100, cint(kv.laufzeit_jahre), kv.tilgungsprofil, cint(kv.tilgungsfrei_jahre), T=40)
	start = getdate(kv.auszahlung_am or kv.unterzeichnet_am)
	aktuell = nowdate()[:7]
	reihe = []
	for monat in sorted(monate):
		if monat >= aktuell:
			continue
		m = monate[monat]
		erloes, kosten, cfads = monats_cfads(m["erzeugung"], m["einspeisung"], flt(vertrag.get("strompreis_ct")) or flt(e.get("preisCt")), flt(vertrag.get("grundgebuehr_monat")), flt(e.get("merchantCt") or 4.0), flt(e.get("mwp")) * 1000 * flt(e.get("opexKwp")) / 12, flt(e.get("pachtJahr")) / 12)
		jahr_idx = max(0, int((getdate(f"{monat}-15") - start).days / 365.25))
		ds = 0.0 if monat < str(start)[:7] else (plan["dienst"][jahr_idx] if jahr_idx < len(plan["dienst"]) else 0) / 12
		reihe.append({"monat": monat, "erzeugung": m["erzeugung"], "einspeisung": m["einspeisung"], "erloes": erloes, "kosten": kosten, "cfads": cfads, "schuldendienst": ds, "quelle": "zaehler"})
	return reihe


def _covenant_fall(f, n=None):
	name = frappe.db.get_value(DT_KV, {"fall_id": f.name}, "name")
	if not name:
		konflikt("Ohne Kreditvertrag gibt es keine Covenants.")
	if f.bezug_art != "anlage":
		konflikt("Covenant-Monitoring braucht eine verknüpfte Anlage (Messdaten).")
	kv = frappe.get_doc(DT_KV, name)
	reihe = _monatsreihe(f, kv)
	plan = tilgungsplan(flt(kv.betrag), flt(kv.zins_pct) / 100, cint(kv.laufzeit_jahre), kv.tilgungsprofil, cint(kv.tilgungsfrei_jahre), T=40)
	jahr_idx = max(0, int((getdate(nowdate()) - getdate(kv.auszahlung_am or kv.unterzeichnet_am)).days / 365.25))
	restschuld = plan["rest"][jahr_idx - 1] if jahr_idx > 0 else flt(kv.betrag)
	plan_cfads = (aus_json(kv.plan_cfads, []) or [])[jahr_idx : cint(kv.laufzeit_jahre)]
	erg = covenant_pruefung(reihe, flt(kv.dscr_lockup) or 1.1, flt(kv.dscr_covenant) or 1.05, flt(kv.llcr_covenant) or None, restschuld, plan_cfads, flt(kv.zins_pct) / 100)
	vorher = ((aus_json(f.covenant, None) or {}).get("ampel") or {}).get("id")
	jetzt_iso = iso(now_datetime())
	f.covenant = als_json({**erg, "monate": reihe[-24:], "restschuld": restschuld, "geprueftAm": jetzt_iso})
	f.covenant_ampel = erg["ampel"]["id"]
	f.covenant_geprueft_am = now_datetime()
	letzte = erg["letzte"] or {}
	frappe.get_doc({
		"doctype": DT_CO, "fall_id": f.name, "kreditvertrag_id": kv.name, "periode": letzte.get("periode") or "", "bis": letzte.get("bis") or "", "geprueft_am": now_datetime(),
		"cfads": letzte.get("cfads"), "schuldendienst": letzte.get("schuldendienst"), "dscr": letzte.get("dscr"), "llcr": erg["llcr"], "ampel": erg["ampel"]["id"], "grund": erg["ampel"]["grund"], "monate": als_json(reihe[-12:]),
	}).insert(ignore_permissions=True)
	if vorher != erg["ampel"]["id"]:
		_verlauf(f, n, f"Covenant-Ampel: {erg['ampel']['id']} – {erg['ampel']['grund']}")
		if erg["ampel"]["id"] in ("gelb", "rot"):
			_backoffice_melden("Covenant: Lock-up bzw. Verletzung" if erg["ampel"]["id"] == "rot" else "Covenant-Frühwarnung", f"{f.titel}: {erg['ampel']['grund']}", f"/portal/admin/finanzierung/{f.name}?tab=covenants", f.name)
	f.save(ignore_permissions=True)
	return erg


@frappe.whitelist(methods=["POST"])
def covenant_lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	schreib_noetig(n)
	return _lauf(n)


def _lauf(n=None):
	ergebnisse = []
	for name in frappe.get_all(DT_FALL, filters={"bezug_art": "anlage", "status": ["!=", "abgebrochen"]}, pluck="name", limit_page_length=0):
		if not frappe.db.exists(DT_KV, {"fall_id": name}):
			continue
		try:
			erg = _covenant_fall(frappe.get_doc(DT_FALL, name), n)
			ergebnisse.append({"fallId": name, "ampel": erg["ampel"]["id"]})
		except Exception as e:  # ein fehlerhafter Fall hält die übrigen nicht auf
			frappe.log_error(title="ÖkoInvest: Covenant-Prüfung", message=f"{name}: {e}")
			ergebnisse.append({"fallId": name, "fehler": str(e)[:200]})
	for name in frappe.get_all(DT_FALL, filters={"reporting_frist": ["<", nowdate()], "reporting_gemahnt": 0, "status": ["!=", "abgebrochen"]}, pluck="name", limit_page_length=0):
		f = frappe.get_doc(DT_FALL, name)
		f.db_set("reporting_gemahnt", 1)
		_backoffice_melden("Bank-Reporting überfällig", f.titel, f"/portal/admin/finanzierung/{f.name}?tab=covenants", f.name)
	return {"geprueft": len(ergebnisse), "ergebnisse": ergebnisse}


def covenants_taeglich():
	"""Scheduler (hooks.py, täglich): Covenant-Prüfung aller Fälle mit Kreditvertrag und Anlage + Reporting-Fristen."""
	_lauf(None)
	frappe.db.commit()


# ================================================================ 3. Bank (externe Rolle)


def _anfrage_per_token(token):
	t = str(token or "")
	if not re.match(r"^[A-Za-z0-9_-]{20,200}$", t):
		return None
	name = frappe.db.get_value(DT_ANFRAGE, {"einladung_hash": sha256(t)}, "name")
	return frappe.get_doc(DT_ANFRAGE, name) if name else None


@frappe.whitelist(methods=["POST"])
def bank_einladung_info(token=None):
	from oekoinvest_app.plattform.kern import api_pruefen

	api_pruefen()
	a = _anfrage_per_token(token)
	if not a or a.einladung_status != "offen" or not a.einladung_ablauf or get_datetime(a.einladung_ablauf) < now_datetime():
		return {"gueltig": False}
	return {"gueltig": True, "email": a.einladung_email, "bank": frappe.db.get_value(DT_BANK, a.bank_id, "bank_name") or "", "ablauf": iso(a.einladung_ablauf)}


@frappe.whitelist(methods=["POST"])
def bank_einladung_annehmen(token=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	a = _anfrage_per_token(token)
	if not a or a.einladung_status != "offen" or not a.einladung_ablauf or get_datetime(a.einladung_ablauf) < now_datetime():
		ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.")
	konto = frappe.get_doc("Plattform Konto", n.id)
	if konto.email != a.einladung_email:
		verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.")
	rollen = [r.rolle for r in konto.rollen]
	if "admin" in rollen:
		konflikt("Backoffice-Konten brauchen keine Bank-Einladung.")
	if "bank" not in rollen:
		konto.append("rollen", {"rolle": "bank"})
	if not cint(konto.email_bestaetigt):
		konto.email_bestaetigt = 1
	konto.save(ignore_permissions=True)
	b = frappe.get_doc(DT_BANK, a.bank_id)
	konten = aus_json(b.konten, []) or []
	if n.id not in konten:
		b.konten = als_json(konten + [n.id])
		b.save(ignore_permissions=True)
	a.einladung_status = "angenommen"
	if a.status == "offen":
		a.status = "in_pruefung"
		_anfrage_verlauf(a, "Bankenpaket geöffnet")
	a.save(ignore_permissions=True)
	protokoll(n, "bank_einladung", "finanzierung", a.name, f"Bank-Zugang angenommen ({b.bank_name})")
	return {"anfrageId": a.name}


@frappe.whitelist(methods=["POST"])
def bank_meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "bank" not in (n.get("rollen") or []):
		verboten("Nur für Finanzierungspartner.")
	ids = _banken_des_kontos(n)
	anfragen = []
	for a in frappe.get_all(DT_ANFRAGE, filters={"bank_id": ["in", ids or ["-"]], "status": ["!=", "zurueckgezogen"]}, fields=["name", "fall_id", "status", "frist", "gesendet_am"], order_by="creation desc", limit_page_length=200):
		f = frappe.get_doc(DT_FALL, a.fall_id)
		e = aus_json(f.eingaben, {}) or {}
		anfragen.append({"id": a.name, "titel": f.titel, "land": e.get("land"), "mwp": e.get("mwp"), "betragWunsch": flt(f.betrag_wunsch), "status": a.status, "frist": str(a.frist or ""), "gesendetAm": iso(a.gesendet_am)})
	return {"banken": [{"id": b, "name": frappe.db.get_value(DT_BANK, b, "bank_name")} for b in ids], "anfragen": anfragen}


@frappe.whitelist(methods=["POST"])
def bank_anfrage(anfrageId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a, f = _bank_anfrage(n, anfrageId)
	frei = aus_json(f.paket_freigabe, []) or []
	e = aus_json(f.eingaben, {}) or {}
	doks = [_dok_json(frappe._dict(d)) for d in frappe.get_all(DT_DOK, filters={"fall_id": f.name, "baustein": ["in", frei or ["-"]]}, fields=["name", "baustein", "dateiname", "mime", "groesse", "am"])]
	return {
		"anfrage": _anfrage_json(a, intern=False),
		"vorhaben": {"titel": f.titel, "spv": f.spv or "", "land": e.get("land"), "typ": e.get("typ"), "mwp": e.get("mwp"), "capex": e.get("capex"), "betragWunsch": flt(f.betrag_wunsch), "modell": e.get("modell"), "vertragJahre": e.get("vertragJahre")},
		"paket": [{"id": bid, "label": label, "quelle": quelle, "text": "", "dokumente": [d for d in doks if d["baustein"] == bid]} for bid, label, quelle, _p in BANKENPAKET if bid in frei],
		"nichtFreigegeben": len([b for b in BANKENPAKET_IDS if b not in frei]),
		"darfTermsheet": a.status in ("offen", "in_pruefung", "termsheet") and not aus_json(f.entscheidung, None),
	}


@frappe.whitelist(methods=["POST"])
def bank_aktion(anfrageId=None, daten=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	d = aus_json(daten, {}) or {}
	art = v.auswahl(d.get("aktion"), ["termsheet", "absage", "rueckfrage"], "")
	if not art:
		ungueltig("Unbekannte Aktion.")
	a, f = _bank_anfrage(n, anfrageId)
	bank_name = frappe.db.get_value(DT_BANK, a.bank_id, "bank_name")
	if art == "termsheet":
		_ts_ablegen(n, f, a, _fach(termsheet_bereinigen, d.get("termsheet") or {}), "bank")
	else:
		text = v.mehrzeilig(d.get("text"), 1500)
		if len(text) < 5:
			ungueltig("Bitte kurz begründen." if art == "absage" else "Bitte Ihre Frage eingeben.")
		if art == "absage":
			if a.status in ("ausgewaehlt", "nicht_ausgewaehlt"):
				konflikt("Die Anfrage ist bereits entschieden.")
			a.status = "abgesagt"
		_anfrage_verlauf(a, f"{'Absage' if art == 'absage' else 'Rückfrage'} der Bank: {text}")
		a.save(ignore_permissions=True)
		_verlauf(f, n, f"{bank_name}: {'Absage' if art == 'absage' else 'Rückfrage'}")
	f.save(ignore_permissions=True)
	_backoffice_melden("Term Sheet eingegangen" if art == "termsheet" else "Bank hat abgesagt" if art == "absage" else "Rückfrage einer Bank", f"{bank_name} – {f.titel}", f"/portal/admin/finanzierung/{f.name}?tab=banken", f.name, mail=art != "rueckfrage")
	protokoll(n, f"bank_{art}", "finanzierung", a.name, f"Bank: {art}")
	return {"ok": True, "status": frappe.db.get_value(DT_ANFRAGE, a.name, "status")}


@frappe.whitelist(methods=["POST"])
def bank_zaehler(als_benutzer=None):
	n = nutzer(als_benutzer)
	ids = _banken_des_kontos(n)
	if not ids:
		return {"offen": 0}
	return {"offen": frappe.db.count(DT_ANFRAGE, {"bank_id": ["in", ids], "status": ["in", ["offen", "in_pruefung"]]})}

