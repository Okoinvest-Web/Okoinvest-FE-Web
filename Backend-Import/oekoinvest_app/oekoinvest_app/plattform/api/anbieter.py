# Copyright (c) 2026, ÖkoInvest GmbH
# Anbieter / Verkäufer – wie backend/demo/anbieter.js (Vertrag: docs/API.md, Abschnitt „Anbieter / Verkäufer“).
#
# Anbieter-Akte je Projekt (DocType „Plattform Anbieter Akte“, Name = Projekt-ID): Vermittlungsauftrag, Prüfpunkte
# (Rückfragen/Nachbesserung), Stellungnahmen zu LOIs, Vorkenntnis-Meldungen, Bestandsanlage (Ertragshistorie, Verträge,
# Förderung, technische DD). Regeln: plattform/anbieter_kern.py (= src/lib/plattform/anbieter/*.js).
#
# Rechte (jede Methode prüft selbst, als_benutzer):
#   Anbieter = Eigentümer des Projekts bzw. Team (lesen ≥ „Nur lesen“, schreiben ≥ „Mitglied“, Auftrag ≥ Admin/Inhaber)
#   Backoffice = Unterrollen-Bereich „projekte“ (lesen ≥ 1, schreiben = 2)
#   Investor = nur Bestandsdaten und nur mit freigegebenem Datenraum
# Investoren erscheinen dem Anbieter pseudonym (dealroom_kern.pseudonyme), Kontaktangaben in LOI-Texten werden entfernt.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import anbieter_kern as K
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.dealroom_kern import anonymisieren, pseudonyme
from oekoinvest_app.plattform.kern import (
	als_json,
	aus_json,
	iso,
	ist_admin,
	jetzt_iso,
	konflikt,
	kurz,
	nachricht_anlegen,
	name_von,
	nicht_angemeldet,
	nicht_gefunden,
	nutzer,
	protokoll,
	ungueltig,
	verboten,
)
from oekoinvest_app.plattform.konstanten import PROVISION_MAX, PROVISION_MIN, PROVISION_TEXT
from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, darf_team_schreiben_objekt, darf_team_verwalten_objekt, listen_filter
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS
from oekoinvest_app.plattform.rechte import darf_lesen, stufe

DT = "Plattform Anbieter Akte"
BEREICH = "projekte"
PROVISION = {"min": PROVISION_MIN, "max": PROVISION_MAX}


def _fach(fn):
	try:
		return fn()
	except K.AnbieterFehler as e:
		if e.status == 403:
			verboten(str(e))
		if e.status == 404:
			nicht_gefunden(str(e))
		if e.status == 409:
			konflikt(str(e))
		ungueltig(str(e))


def _neue_id(praefix):
	import secrets

	from frappe.utils import now_datetime

	return f"{praefix}-{now_datetime().strftime('%y')}-" + "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))


def _tag_de(d):
	return ".".join(reversed(str(d)[:10].split("-"))) if d else ""


# ================================================================ Laden & Rechte


def _projekt(projekt_id):
	k = v.kennung(projekt_id)
	if not k or not frappe.db.exists("Plattform Projekt", k):
		nicht_gefunden("Projekt nicht gefunden.")
	return frappe.get_doc("Plattform Projekt", k)


def _projekt_dict(pj):
	return {
		"id": pj.name, "titel": pj.titel, "status": pj.status, "phase": pj.phase, "mwp": pj.mwp or 0, "land": pj.land or "DE",
		"region": pj.region or "", "beschreibung": pj.beschreibung or "", "highlights": aus_json(pj.highlights, []) or [],
		"vertraulich": aus_json(pj.vertraulich, {}) or {}, "provisionSatz": pj.provision_satz if pj.provision_satz else None,
	}


def _akte_doc(projekt_id, anlegen=False):
	if frappe.db.exists(DT, projekt_id):
		return frappe.get_doc(DT, projekt_id)
	if not anlegen:
		return None
	d = frappe.get_doc({"doctype": DT, "projekt_id": projekt_id, "mandat": None, "pruefpunkte": "[]", "voten": "[]", "vorkenntnis": "[]", "bestand": "{}"})
	d.insert(ignore_permissions=True)
	return d


def _akte(doc):
	if not doc:
		return {"mandat": None, "pruefpunkte": [], "voten": [], "vorkenntnis": [], "bestand": {}}
	return {
		"mandat": aus_json(doc.mandat, None),
		"pruefpunkte": aus_json(doc.pruefpunkte, []) or [],
		"voten": aus_json(doc.voten, []) or [],
		"vorkenntnis": aus_json(doc.vorkenntnis, []) or [],
		"bestand": aus_json(doc.bestand, {}) or {},
	}


def _speichern(doc, a):
	doc.mandat = als_json(a["mandat"]) if a.get("mandat") else None
	doc.pruefpunkte = als_json(a["pruefpunkte"])
	doc.voten = als_json(a["voten"])
	doc.vorkenntnis = als_json(a["vorkenntnis"])
	doc.bestand = als_json(a["bestand"])
	doc.save(ignore_permissions=True)


def _rolle(n, pj):
	if not n:
		nicht_angemeldet()
	if ist_admin(n):
		if not darf_lesen(n, BEREICH):
			verboten("Ihre Backoffice-Rolle erlaubt den Bereich „Projekte“ nicht.")
		return "admin"
	if pj.anbieter_id == n.id or darf_team_lesen_objekt(n, pj):
		return "anbieter"
	if "investor" in (n.get("rollen") or []) and pj.status in (BOERSE_STATUS + ["verkauft"]):
		for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": pj.name, "status": ["in", DATENRAUM_STATUS]}, fields=["name", "investor_id", "organisation_id"]):
			if i.investor_id == n.id or darf_team_lesen_objekt(n, i):
				return "investor"
	verboten()


def _schreibt(n, pj):
	return pj.anbieter_id == n.id or darf_team_schreiben_objekt(n, pj)


def _verwaltet(n, pj):
	return pj.anbieter_id == n.id or darf_team_verwalten_objekt(n, pj)


def _interessen(projekt_id):
	zeilen = frappe.get_all("Plattform Interesse", filters={"projekt_id": projekt_id}, fields=["name", "status", "nda", "loi", "creation", "investor_id"])
	pseudo = pseudonyme(projekt_id)
	out = []
	for z in zeilen:
		if z.name not in pseudo:
			continue
		nda = aus_json(z.nda, {}) or {}
		out.append({"id": z.name, "status": z.status, "nda": nda, "loi": aus_json(z.loi, None), "erstelltAm": iso(z.creation), "investorId": z.investor_id, "pseudonym": pseudo[z.name]})
	out.sort(key=lambda x: (str(x["nda"].get("am") or x["erstelltAm"]), x["id"]))
	return out


# ================================================================ Ausgabe


def _mandat_ausgabe(a, pj, rolle):
	m = a["mandat"]
	st = K.mandat_stand(m, K.heute_wien())
	if not m:
		pa = aus_json(pj.provision_akzeptiert, None) or {}
		return {"stand": st, "statusLabel": K.MANDAT_STATUS[st["status"]], "altKlick": bool(pa.get("am")) and not pa.get("mandat")}
	return {
		"art": m.get("art"), "artLabel": K.MANDAT_ARTEN.get(m.get("art"), {}).get("label", m.get("art")), "dauerMonate": m.get("dauerMonate"),
		"vorbehalte": m.get("vorbehalte") or [], "erteiltAm": m.get("erteiltAm"), "erteiltVon": m.get("erteiltVonName") or "", "name": m.get("name"),
		"sha256": m.get("sha256"), "version": m.get("version"), "ip": (m.get("ip") or "") if rolle == "admin" else None,
		"bestaetigtAm": m.get("bestaetigtAm"), "mindestBis": m.get("mindestBis") or "", "exklusivEndetAm": m.get("exklusivEndetAm") or "",
		"gekuendigtAm": m.get("gekuendigtAm"), "endetAm": m.get("endetAm") or "", "kuendigungDurch": m.get("kuendigungDurch") or "",
		"stand": st, "statusLabel": K.MANDAT_STATUS[st["status"]],
	}


GEBOT_STATUS_LABEL = {"abgegeben": "Abgegeben", "zurueckgezogen": "Zurückgezogen", "zuschlag": "Zuschlag", "unterlegen": "Nicht berücksichtigt"}


def _gebote_fuer_akte(pj, a, rolle):
	"""Bieterverfahren: Gebote, die der Verkäufer sehen darf (Bieterstand freigegeben bzw. Backoffice) – je Interesse (= demo geboteFuerAkte)."""
	from oekoinvest_app.plattform.dealroom_kern import RUNDEN_ARTEN, gebot_gesamt

	vf_filter = {"projekt_id": pj.name} if rolle == "admin" else {"projekt_id": pj.name, "anbieter_freigabe": 1}
	verfahren = {x.name: x for x in frappe.get_all("Plattform Bieterverfahren", filters=vf_filter, fields=["name", "status"], limit_page_length=0)}
	out = {}
	if not verfahren:
		return out
	felder = ["name", "verfahren_id", "interesse_id", "runde", "runde_art", "version", "preis_modus", "preis", "preis_pro_kwp", "bedingungen", "status", "am"]
	for g in frappe.get_all("Plattform Gebot", filters={"projekt_id": pj.name, "verfahren_id": ("in", list(verfahren)), "status": ("!=", "zurueckgezogen")}, fields=felder, limit_page_length=0):
		version = cint(g.version) or 1
		vt = K.gebot_votum(a["voten"], g.name, version)
		vf = verfahren.get(g.verfahren_id)
		zeile = {
			"id": g.name, "verfahrenId": g.verfahren_id, "runde": cint(g.runde), "rundeLabel": RUNDEN_ARTEN.get(g.runde_art, ""), "version": version,
			"preisGesamt": gebot_gesamt(g.preis_modus, g.preis, g.preis_pro_kwp, pj.mwp),
			"bedingungen": (g.bedingungen or "") if rolle == "admin" else anonymisieren(g.bedingungen or "")[0],
			"status": g.status, "statusLabel": GEBOT_STATUS_LABEL.get(g.status, g.status), "am": iso(g.am),
			"votum": {"art": vt["art"], "label": K.VOTUM_ARTEN[vt["art"]], "kommentar": vt.get("kommentar"), "gegenvorschlag": vt.get("gegenvorschlag"), "am": vt.get("am"), "von": vt.get("vonName")} if vt else None,
			"votumMoeglich": g.status == "abgegeben" and bool(vf) and vf.status not in ("zuschlag", "abgebrochen"),
		}
		out.setdefault(g.interesse_id, []).append(zeile)
	for liste in out.values():
		liste.sort(key=lambda x: -x["runde"])
	return out


def _interessenten_ausgabe(pj, a, rolle):
	h = K.heute_wien()
	out = []
	gebote = _gebote_fuer_akte(pj, a, rolle)
	for i in _interessen(pj.name):
		angezeigt = i["nda"].get("am") or i["erstelltAm"]
		frist = K.vorkenntnis_frist(angezeigt)
		vk = next((x for x in reversed(a["vorkenntnis"]) if x.get("interesseId") == i["id"]), None)
		loi = i["loi"]
		loi_am = (loi or {}).get("am")
		vt = K.aktuelles_votum(a["voten"], i["id"], loi_am)
		zeilen = []
		for z in K.loi_zeilen(loi):
			if z["label"] == "Inhalt" and rolle != "admin":
				z = {**z, "wert": anonymisieren(z["wert"])[0]}
			zeilen.append(z)
		e = {
			"interesseId": i["id"], "pseudonym": i["pseudonym"], "status": i["status"], "angezeigtAm": angezeigt, "vorkenntnisFrist": frist,
			"vorkenntnisOffen": not vk and bool(frist) and h <= frist,
			"vorkenntnis": {**vk, "statusLabel": K.VORKENNTNIS_STATUS.get(vk.get("status"), vk.get("status"))} if vk else None,
			"loi": {"am": loi_am, "zeilen": zeilen, "betrag": (loi or {}).get("betrag")} if zeilen else None,
			"votum": {"art": vt["art"], "label": K.VOTUM_ARTEN[vt["art"]], "kommentar": vt.get("kommentar"), "gegenvorschlag": vt.get("gegenvorschlag"), "am": vt.get("am"), "von": vt.get("vonName")} if vt else None,
			"votumMoeglich": i["status"] == "loi_abgegeben" and bool(loi),
			"gebote": gebote.get(i["id"], []),
		}
		if rolle == "admin":
			e["investor"] = kurz(i["investorId"])
		out.append(e)
	return out


def _pp_ausgabe(pp, rolle):
	st = K.PRUEFPUNKT_STATUS.get(pp.get("status"), {})
	return {**pp, "statusLabel": st.get("labelBo" if rolle == "admin" else "label"), "ton": st.get("ton"), "ueberfaellig": pp.get("status") == "offen" and bool(pp.get("fristAm")) and pp["fristAm"] < K.heute_wien()}


def _ausgabe(n, pj, rolle, a=None):
	a = a or _akte(_akte_doc(pj.name))
	p = _projekt_dict(pj)
	kopf = {"id": pj.name, "titel": pj.titel, "status": pj.status, "phase": pj.phase, "mwp": pj.mwp or 0, "land": pj.land or "DE", "provisionSatz": p["provisionSatz"], "bestandsanlage": pj.phase == "cod"}
	bestand = {"daten": a["bestand"], "auswertung": K.bestand_auswertung(a["bestand"], p, K.heute_wien())}
	if rolle == "investor":
		return {"rolle": rolle, "projekt": kopf, "bestand": bestand}
	docs = frappe.get_all("Plattform Dokument", filters={"bezug_art": "projekt", "bezug_id": pj.name}, fields=["name", "dateiname", "kategorie"], limit_page_length=500)
	anbieter = kurz(pj.anbieter_id) or {}
	return {
		"rolle": rolle,
		"projekt": kopf,
		"rechte": {"schreiben": _schreibt(n, pj) if rolle == "anbieter" else stufe(n, BEREICH) >= 2, "auftrag": _verwaltet(n, pj) if rolle == "anbieter" else False},
		"mandat": _mandat_ausgabe(a, pj, rolle),
		"pruefpunkte": [_pp_ausgabe(x, rolle) for x in a["pruefpunkte"]],
		"anonymitaet": K.anonymitaet_pruefen(p, anbieter=anbieter),
		"interessenten": _interessenten_ausgabe(pj, a, rolle),
		"bestand": bestand,
		"dokumente": [{"id": d.name, "name": d.dateiname or d.name, "kategorie": d.kategorie} for d in docs],
		"hinweis": K.MANDAT_HINWEIS,
	}


# ================================================================ Lesen


@frappe.whitelist(methods=["POST"])
def akte(projektId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	pj = _projekt(projektId)
	return _ausgabe(n, pj, _rolle(n, pj))


@frappe.whitelist(methods=["POST"])
def vermittlungsauftrag_daten(projektId=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	pj = _projekt(projektId)
	if _rolle(n, pj) == "investor":
		verboten()
	a = _akte(_akte_doc(pj.name))
	m = a["mandat"]
	mandat = m or {"art": "einfach", "vorbehalte": []}
	# Erteilter Auftrag: genau der Wortlaut, dessen Prüfsumme protokolliert wurde; sonst aktueller Entwurf
	absaetze = (m or {}).get("absaetze") or K.mandat_text(_projekt_dict(pj), mandat, kurz(pj.anbieter_id) or {}, PROVISION)
	protokoll(n, "vermittlungsauftrag_pdf", "projekt", pj.name, "Vermittlungsauftrag als PDF abgerufen", v.text(ip, 64))
	return {
		"titel": K.MANDAT_ARTEN.get(mandat.get("art"), {}).get("label", "Vermittlungsauftrag"),
		"untertitel": f"Projekt {pj.name} · „{pj.titel}“ · Version {(m or {}).get('version') or K.MANDAT_VERSION}",
		"absaetze": absaetze,
		"entwurf": not m,
		"erklaerung": {"name": m.get("name"), "am": m.get("erteiltAm"), "sha256": m.get("sha256"), "bestaetigtAm": m.get("bestaetigtAm"), "gekuendigtAm": m.get("gekuendigtAm"), "endetAm": m.get("endetAm") or "", "exklusivEndetAm": m.get("exklusivEndetAm") or "", "satz": pj.provision_satz or None} if m else None,
		"hinweis": K.MANDAT_HINWEIS,
	}


# ================================================================ Anbieter-Aktionen

ANBIETER_AKTIONEN = ["mandat_erteilen", "mandat_kuendigen", "exklusivitaet_beenden", "pruefpunkt_antworten", "votum", "gebot_votum", "vorkenntnis_melden", "bestand_speichern", "ertrag_import"]


@frappe.whitelist(methods=["POST"])
def aktion(projektId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else frappe.parse_json(daten or "{}") or {}
	akt = v.auswahl(d.get("aktion"), ANBIETER_AKTIONEN, "")
	if not akt:
		ungueltig("Unbekannte Aktion.")
	ip = v.text(ip, 64)
	pj = _projekt(projektId)
	if _rolle(n, pj) != "anbieter":
		verboten("Nur der Anbieter des Projekts.")
	if not _schreibt(n, pj):
		verboten("Mit der Teamrolle „Nur lesen“ können Sie nichts ändern.")
	doc = _akte_doc(pj.name, anlegen=True)
	a = _akte(doc)
	h = K.heute_wien()
	zusatz = {}
	name = name_von(n.id)

	if akt == "mandat_erteilen":
		if not _verwaltet(n, pj):
			verboten("Den Vermittlungsauftrag erteilt der Anbieter bzw. Admin/Inhaber der Organisation.")
		if a["mandat"] and not a["mandat"].get("gekuendigtAm"):
			konflikt("Für dieses Projekt besteht bereits ein Vermittlungsauftrag.")
		if pj.status == "verkauft":
			konflikt("Das Projekt ist bereits verkauft.")
		e = _fach(lambda: K.mandat_eingabe(d, konto_name=name))
		absaetze = K.mandat_text(_projekt_dict(pj), e, kurz(pj.anbieter_id) or {}, PROVISION)
		hsh = K.mandat_hash(absaetze)
		a["mandat"] = {**e, "absaetze": absaetze, "version": K.MANDAT_VERSION, "erteiltAm": jetzt_iso(), "erteiltVonId": n.id, "erteiltVonName": name, "ip": ip, "sha256": hsh, "bestaetigtAm": None, "mindestBis": "", "exklusivEndetAm": "", "gekuendigtAm": None, "endetAm": ""}
		pj.db_set("provision_akzeptiert", als_json({"am": a["mandat"]["erteiltAm"], "ip": ip, "version": K.MANDAT_VERSION, "text": PROVISION_TEXT, "mandat": True, "art": e["art"]}))
		protokoll(n, "vermittlungsauftrag", "projekt", pj.name, f"Vermittlungsauftrag erteilt ({K.MANDAT_ARTEN[e['art']]['label']}, SHA-256 {hsh[:12]}…)", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Vermittlungsauftrag erteilt: {K.MANDAT_ARTEN[e['art']]['label']}" + (f" (Mindestlaufzeit {e['dauerMonate']} Monate) – bitte gegenbestätigen" if e["art"] == "exklusiv" else "") + ".")
	elif akt == "mandat_kuendigen":
		if not _verwaltet(n, pj):
			verboten("Kündigen kann der Anbieter bzw. Admin/Inhaber der Organisation.")
		wirkung = _fach(lambda: K.mandat_kuendigung(a["mandat"], h, pj.status))
		a["mandat"].update({"gekuendigtAm": jetzt_iso(), "kuendigungDurch": "anbieter", "endetAm": wirkung})
		pj.db_set("provision_akzeptiert", None)
		protokoll(n, "vermittlungsauftrag", "projekt", pj.name, "Vermittlungsauftrag gekündigt", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text="Vermittlungsauftrag gekündigt. Ansprüche aus bereits nachgewiesenen Investoren und der Umgehungsschutz bleiben bestehen.")
	elif akt == "exklusivitaet_beenden":
		if not _verwaltet(n, pj):
			verboten("Beenden kann der Anbieter bzw. Admin/Inhaber der Organisation.")
		wirkung = _fach(lambda: K.exklusivitaet_ende(a["mandat"], h))
		a["mandat"].update({"exklusivEndetAm": wirkung, "exklusivGekuendigtAm": jetzt_iso()})
		protokoll(n, "vermittlungsauftrag", "projekt", pj.name, f"Exklusivität beendet zum {_tag_de(wirkung)}", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Exklusivität beendet zum {_tag_de(wirkung)}. Danach gilt der Auftrag als einfacher Vermittlungsauftrag weiter.")
	elif akt == "pruefpunkt_antworten":
		pp = next((x for x in a["pruefpunkte"] if x.get("id") == v.kennung(d.get("id"))), None)
		if not pp:
			nicht_gefunden("Prüfpunkt nicht gefunden.")
		r = _fach(lambda: K.pruefpunkt_aktion(pp, "antworten", "anbieter", antwort=d.get("antwort")))
		pp.update({"status": r["status"], "antwort": r["antwort"], "beantwortetAm": jetzt_iso(), "beantwortetVon": name})
		pp.setdefault("verlauf", []).append({"am": jetzt_iso(), "text": "Antwort des Anbieters", "status": r["status"]})
		protokoll(n, "pruefpunkt", "projekt", pj.name, f"Rückfrage {pp['id']} beantwortet", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Antwort auf Rückfrage „{pp['text'][:80]}{' …' if len(pp['text']) > 80 else ''}“: {r['antwort']}")
	elif akt == "votum":
		i = frappe.db.get_value("Plattform Interesse", {"name": v.kennung(d.get("interesseId")), "projekt_id": pj.name}, ["name", "status", "loi"], as_dict=True)
		if not i:
			nicht_gefunden("Interessent nicht gefunden.")
		loi = aus_json(i.loi, None)
		if i.status != "loi_abgegeben" or not loi:
			konflikt("Eine Stellungnahme ist nur zu einer offenen LOI möglich.")
		e = _fach(lambda: K.votum_eingabe(d))
		pseudo = pseudonyme(pj.name).get(i.name, "Investor")
		a["voten"].append({"id": _neue_id("VT"), "interesseId": i.name, "loiAm": loi.get("am"), **e, "am": jetzt_iso(), "vonId": n.id, "vonName": name})
		protokoll(n, "votum", "interesse", i.name, f"Stellungnahme des Verkäufers: {K.VOTUM_ARTEN[e['art']]}", ip)
		gv = f" Gegenvorschlag: {K.de_zahl(e['gegenvorschlag'], 0)} €." if e.get("gegenvorschlag") else ""
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Stellungnahme zur LOI von {pseudo}: {K.VOTUM_ARTEN[e['art']]}.{gv}" + (f" {e['kommentar']}" if e["kommentar"] else ""))
		zusatz = {"votum": e["art"]}
	elif akt == "gebot_votum":
		g = frappe.db.get_value("Plattform Gebot", {"name": v.kennung(d.get("gebotId")), "projekt_id": pj.name}, ["name", "verfahren_id", "interesse_id", "runde", "version", "status"], as_dict=True)
		if not g:
			nicht_gefunden("Gebot nicht gefunden.")
		vf = frappe.db.get_value("Plattform Bieterverfahren", g.verfahren_id, ["name", "status", "anbieter_freigabe"], as_dict=True)
		if not vf or not cint(vf.anbieter_freigabe):
			konflikt("Der Bieterstand ist für Sie noch nicht freigegeben.")
		if g.status != "abgegeben" or vf.status in ("zuschlag", "abgebrochen"):
			konflikt("Eine Stellungnahme ist nur zu einem offenen Gebot möglich.")
		e = _fach(lambda: K.votum_eingabe(d))
		pseudo = pseudonyme(pj.name).get(g.interesse_id, "Investor")
		a["voten"].append({"id": _neue_id("VT"), "interesseId": g.interesse_id, "gebotId": g.name, "gebotVersion": cint(g.version) or 1, "verfahrenId": vf.name, **e, "am": jetzt_iso(), "vonId": n.id, "vonName": name})
		protokoll(n, "votum", "interesse", g.interesse_id, f"Stellungnahme des Verkäufers zu Gebot {g.name}: {K.VOTUM_ARTEN[e['art']]}", ip)
		gv = f" Gegenvorschlag: {K.de_zahl(e['gegenvorschlag'], 0)} €." if e.get("gegenvorschlag") else ""
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Stellungnahme zum Gebot von {pseudo} (Runde {cint(g.runde)}): {K.VOTUM_ARTEN[e['art']]}.{gv}" + (f" {e['kommentar']}" if e["kommentar"] else ""))
		zusatz = {"votum": e["art"]}
	elif akt == "vorkenntnis_melden":
		i = frappe.db.get_value("Plattform Interesse", {"name": v.kennung(d.get("interesseId")), "projekt_id": pj.name}, ["name", "nda", "creation"], as_dict=True)
		if not i:
			nicht_gefunden("Interessent nicht gefunden.")
		if any(x.get("interesseId") == i.name and x.get("status") != "abgelehnt" for x in a["vorkenntnis"]):
			konflikt("Für diesen Interessenten liegt bereits eine Meldung vor.")
		angezeigt = (aus_json(i.nda, {}) or {}).get("am") or iso(i.creation)
		e = _fach(lambda: K.vorkenntnis_eingabe(d, angezeigt, h))
		if e["dokumentId"] and not frappe.db.exists("Plattform Dokument", {"name": e["dokumentId"], "bezug_art": "projekt", "bezug_id": pj.name}):
			ungueltig("Der Nachweis muss ein Dokument dieses Projekts sein.")
		pseudo = pseudonyme(pj.name).get(i.name, "Investor")
		a["vorkenntnis"].append({"id": _neue_id("VK"), "interesseId": i.name, "pseudonym": pseudo, **e, "status": "gemeldet", "gemeldetAm": jetzt_iso(), "vonName": name})
		protokoll(n, "vorkenntnis", "interesse", i.name, "Vorkenntnis gemeldet" + (" (nach Fristablauf)" if e["verspaetet"] else ""), ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, text=f"Vorkenntnis gemeldet für {pseudo} (Nachweis: {_tag_de(e['nachweisDatum'])})" + (" – nach Ablauf der Frist von zehn Werktagen" if e["verspaetet"] else "") + f". {e['begruendung']}")
	elif akt in ("bestand_speichern", "ertrag_import"):
		if pj.status == "verkauft":
			konflikt("Das Projekt ist verkauft – Bestandsdaten sind abgeschlossen.")
		eingabe = d.get("bestand") if isinstance(d.get("bestand"), dict) else {}
		if akt == "ertrag_import":
			r = K.ertrag_csv_lesen(d.get("csv"))
			if not r["monate"]:
				ungueltig(r["fehler"][0] if r["fehler"] else "Keine Monatswerte erkannt.")
			eingabe = {"monate": r["monate"] if d.get("ersetzen") else K.monate_bereinigen((a["bestand"].get("monate") or []) + r["monate"])}
			zusatz = {"importiert": len(r["monate"]), "fehler": r["fehler"]}
		docs = set(frappe.get_all("Plattform Dokument", filters={"bezug_art": "projekt", "bezug_id": pj.name}, pluck="name", limit_page_length=2000))
		neu = _fach(lambda: K.bestand_bereinigen(eingabe, a["bestand"], land=pj.land or "DE"))
		for x in neu.get("vertraege") or []:
			if x.get("dokumentId") and x["dokumentId"] not in docs:
				x["dokumentId"] = None
		for x in (neu.get("dd") or {}).values():
			if x.get("dokumentId") and x["dokumentId"] not in docs:
				x["dokumentId"] = None
		a["bestand"] = {**neu, "geaendertAm": jetzt_iso()}
		protokoll(n, "bestand", "projekt", pj.name, f"Ertragshistorie importiert ({zusatz.get('importiert')} Monate)" if akt == "ertrag_import" else "Bestandsdaten gespeichert", ip)

	_speichern(doc, a)
	pj.reload()
	return {**_ausgabe(n, pj, "anbieter", a), **zusatz}


# ================================================================ Backoffice-Aktionen

ADMIN_AKTIONEN = ["pruefpunkt_anlegen", "pruefpunkt", "mandat_bestaetigen", "vorkenntnis_entscheiden"]


def _bo_schreiben(n):
	if not n:
		nicht_angemeldet()
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	if stufe(n, BEREICH) < 2:
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Schreiben.")


@frappe.whitelist(methods=["POST"])
def admin_aktion(projektId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_bo_schreiben(n)
	d = daten if isinstance(daten, dict) else frappe.parse_json(daten or "{}") or {}
	akt = v.auswahl(d.get("aktion"), ADMIN_AKTIONEN, "")
	if not akt:
		ungueltig("Unbekannte Aktion.")
	ip = v.text(ip, 64)
	pj = _projekt(projektId)
	doc = _akte_doc(pj.name, anlegen=True)
	a = _akte(doc)
	h = K.heute_wien()
	name = name_von(n.id)

	if akt == "pruefpunkt_anlegen":
		if pj.status == "verkauft":
			konflikt("Das Projekt ist verkauft.")
		if len(a["pruefpunkte"]) >= K.PRUEFPUNKTE_MAX:
			konflikt(f"Höchstens {K.PRUEFPUNKTE_MAX} Prüfpunkte je Projekt.")
		e = _fach(lambda: K.pruefpunkt_eingabe(d, h))
		pp = {"id": _neue_id("PP"), **e, "status": "offen", "erstelltAm": jetzt_iso(), "erstelltVon": name, "antwort": "", "kommentar": "", "verlauf": [{"am": jetzt_iso(), "text": "Rückfrage angelegt", "status": "offen"}]}
		a["pruefpunkte"].append(pp)
		protokoll(n, "pruefpunkt", "projekt", pj.name, f"Rückfrage {pp['id']} angelegt ({e['bereich']}{', Pflicht' if e['pflicht'] else ''})", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, von_admin=True, text=f"Rückfrage des Backoffice (Antwort bis {_tag_de(e['fristAm'])}): {e['text']}")
	elif akt == "pruefpunkt":
		pp = next((x for x in a["pruefpunkte"] if x.get("id") == v.kennung(d.get("id"))), None)
		if not pp:
			nicht_gefunden("Prüfpunkt nicht gefunden.")
		schritt = v.auswahl(d.get("schritt"), ["erledigt", "erneut", "verwerfen"], "")
		r = _fach(lambda: K.pruefpunkt_aktion(pp, schritt, "backoffice", kommentar=d.get("kommentar")))
		pp["status"] = r["status"]
		pp["kommentar"] = r.get("kommentar") or ""
		if schritt == "erneut":
			pp["fristAm"] = K.tage_plus(h, 5)
		pp.setdefault("verlauf", []).append({"am": jetzt_iso(), "text": {"erledigt": "Erledigt", "erneut": "Erneut geöffnet"}.get(schritt, "Entfällt"), "status": r["status"], "kommentar": r.get("kommentar") or ""})
		protokoll(n, "pruefpunkt", "projekt", pj.name, f"Rückfrage {pp['id']}: {K.PRUEFPUNKT_STATUS[r['status']]['labelBo']}", ip)
		if schritt == "erneut":
			nachricht_anlegen("projekt", pj.name, von_id=n.id, von_admin=True, text=f"Rückfrage erneut offen (Antwort bis {_tag_de(pp['fristAm'])}): {r['kommentar']}")
		else:
			nachricht_anlegen("projekt", pj.name, von_id=n.id, von_admin=True, mail=False, text=f"Rückfrage „{pp['text'][:80]}{' …' if len(pp['text']) > 80 else ''}“: {'erledigt' if schritt == 'erledigt' else 'entfällt'}." + (f" {r['kommentar']}" if r.get("kommentar") else ""))
	elif akt == "mandat_bestaetigen":
		m = a["mandat"]
		if not m or m.get("gekuendigtAm"):
			konflikt("Es liegt kein wirksamer Vermittlungsauftrag vor.")
		if m.get("art") != "exklusiv":
			konflikt("Nur eine Exklusivität bedarf der Gegenbestätigung.")
		if m.get("bestaetigtAm"):
			konflikt("Die Exklusivität ist bereits bestätigt.")
		m.update({"bestaetigtAm": jetzt_iso(), "bestaetigtVon": name, "mindestBis": K.monate_plus(h, int(m.get("dauerMonate") or 6))})
		protokoll(n, "vermittlungsauftrag", "projekt", pj.name, f"Exklusivität gegenbestätigt (Mindestlaufzeit bis {_tag_de(m['mindestBis'])})", ip)
		nachricht_anlegen("projekt", pj.name, von_id=n.id, von_admin=True, text=f"ÖkoInvest hat die Exklusivität bestätigt. Mindestlaufzeit bis {_tag_de(m['mindestBis'])}; danach kündbar zum Monatsende. Wir sprechen passende Investoren aktiv an und berichten regelmäßig.")
	elif akt == "vorkenntnis_entscheiden":
		vk = next((x for x in a["vorkenntnis"] if x.get("id") == v.kennung(d.get("id"))), None)
		if not vk:
			nicht_gefunden("Meldung nicht gefunden.")
		if vk.get("status") != "gemeldet":
			konflikt("Die Meldung ist bereits entschieden.")
		ent = v.auswahl(d.get("entscheidung"), ["anerkannt", "abgelehnt"], "")
		if not ent:
			ungueltig("Bitte wählen Sie die Entscheidung.")
		grund = v.mehrzeilig(d.get("grund"), 1000)
		if ent == "abgelehnt" and len(grund) < 10:
			ungueltig("Bitte begründen Sie die Ablehnung (mind. 10 Zeichen).")
		vk.update({"status": ent, "entschiedenAm": jetzt_iso(), "entschiedenVon": name, "grund": grund})
		protokoll(n, "vorkenntnis", "interesse", vk["interesseId"], "Vorkenntnis " + ("anerkannt" if ent == "anerkannt" else "nicht anerkannt"), ip)
		ergebnis = "anerkannt – für diesen Interessenten entsteht keine Provision aus diesem Projekt" if ent == "anerkannt" else f"nicht anerkannt: {grund}"
		nachricht_anlegen("projekt", pj.name, von_id=n.id, von_admin=True, text=f"Ihre Vorkenntnis-Meldung zu {vk.get('pseudonym')} wurde {ergebnis}.")
		# Anerkennung nach dem Verkauf: noch nicht abgerechnete Provision zum Käufer stornieren (in Rechnung → Storno über die Buchhaltung)
		if ent == "anerkannt":
			from oekoinvest_app.plattform.kern import verlauf

			for pv_name in frappe.get_all("Plattform Provision", filters={"projekt_id": pj.name, "interesse_id": vk.get("interesseId"), "status": "offen"}, pluck="name"):
				pv = frappe.get_doc("Plattform Provision", pv_name)
				pv.status = "storniert"
				pv.ablehn_grund = K.VORKENNTNIS_VERMERK
				verlauf(pv, "storniert", n, "admin", K.VORKENNTNIS_VERMERK)
				pv.save(ignore_permissions=True)
				protokoll(n, "provision", "provision", pv.name, f"Provision storniert: {K.VORKENNTNIS_VERMERK}", ip)

	_speichern(doc, a)
	return _ausgabe(n, pj, "admin", a)


# ================================================================ Cockpit


def _aufgabe(art, t, link, frist="", ton="warn"):
	return {"art": art, "text": t, "link": link, "frist": frist, "ton": ton, "ueberfaellig": bool(frist) and frist < K.heute_wien()}


@frappe.whitelist(methods=["POST"])
def cockpit(als_benutzer=None):
	n = nutzer(als_benutzer)
	h = K.heute_wien()
	if ist_admin(n):
		if not darf_lesen(n, BEREICH):
			verboten("Ihre Backoffice-Rolle erlaubt den Bereich „Projekte“ nicht.")
		liste = []
		for z in frappe.get_all(DT, fields=["name", "mandat", "pruefpunkte", "voten", "vorkenntnis"], order_by="modified desc", limit_page_length=500):
			if not frappe.db.exists("Plattform Projekt", z.name):
				continue
			pj = frappe.db.get_value("Plattform Projekt", z.name, ["name", "titel", "status"], as_dict=True)
			link = f"/portal/projekte/{pj.name}#anbieter"
			auf = [_aufgabe("pruefpunkt", f"Antwort prüfen: {pp['text'][:70]}", link, ton="info") for pp in aus_json(z.pruefpunkte, []) or [] if pp.get("status") == "beantwortet"]
			auf += [_aufgabe("vorkenntnis", f"Vorkenntnis-Meldung zu {vk.get('pseudonym')} entscheiden", link) for vk in aus_json(z.vorkenntnis, []) or [] if vk.get("status") == "gemeldet"]
			m = aus_json(z.mandat, None) or {}
			if m.get("art") == "exklusiv" and not m.get("bestaetigtAm") and not m.get("gekuendigtAm"):
				auf.append(_aufgabe("mandat", "Exklusivität gegenbestätigen", link))
			voten = aus_json(z.voten, []) or []
			for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": pj.name, "status": "loi_abgegeben"}, fields=["name", "loi"]):
				vt = K.aktuelles_votum(voten, i.name, (aus_json(i.loi, {}) or {}).get("am"))
				if vt:
					auf.append(_aufgabe("votum", f"Verkäufer-Stellungnahme zur LOI: {K.VOTUM_ARTEN[vt['art']]}", link, ton="neutral" if vt["art"] == "ablehnung" else "ok"))
			if auf:
				liste.append({"projekt": {"id": pj.name, "titel": pj.titel, "status": pj.status}, "aufgaben": auf})
		return {"rolle": "admin", "projekte": liste, "summe": sum(len(x["aufgaben"]) for x in liste)}

	if "anbieter" not in (n.get("rollen") or []):
		verboten("Nur für Projektanbieter.")
	liste = []
	for name in frappe.get_all("Plattform Projekt", filters=listen_filter(n, "anbieter_id"), pluck="name", order_by="modified desc", limit_page_length=500):
		pj = frappe.get_doc("Plattform Projekt", name)
		a = _akte(_akte_doc(name))
		link = f"/portal/projekte/{name}"
		auf = []
		st = K.mandat_stand(a["mandat"], h)
		pa = aus_json(pj.provision_akzeptiert, None) or {}
		if pj.status == "entwurf":
			auf.append(_aufgabe("mandat", "Vermittlungsauftrag erteilen (Voraussetzung für das Einreichen)", f"{link}#anbieter") if not pa.get("am") else _aufgabe("einreichen", "Entwurf vervollständigen und zur Prüfung einreichen", link, ton="info"))
		if st["status"] == "wartet":
			auf.append(_aufgabe("mandat", "Exklusivität wartet auf Gegenbestätigung durch ÖkoInvest", f"{link}#anbieter", ton="info"))
		if st["exklusivAktiv"] and st["mindestBis"] and h <= st["mindestBis"] <= K.tage_plus(h, 30):
			auf.append(_aufgabe("mandat", f"Mindestlaufzeit der Exklusivität endet am {_tag_de(st['mindestBis'])}", f"{link}#anbieter", ton="info"))
		for pp in K.pruefpunkte_offen(a["pruefpunkte"]):
			auf.append(_aufgabe("pruefpunkt", f"Rückfrage beantworten: {pp['text'][:70]}{' …' if len(pp['text']) > 70 else ''}", f"{link}#anbieter", frist=pp.get("fristAm") or ""))
		if pj.status in ("entwurf", "pruefung"):
			an = K.anonymitaet_pruefen(_projekt_dict(pj), anbieter=kurz(pj.anbieter_id) or {})
			if not an["ok"]:
				auf.append(_aufgabe("anonymitaet", f"Teaser enthält {an['kritisch']} identifizierende Angabe(n) – vor der Veröffentlichung entfernen", f"{link}#anbieter"))
		for i in _interessen(name):
			if i["status"] == "loi_abgegeben" and i["loi"] and not K.aktuelles_votum(a["voten"], i["id"], i["loi"].get("am")):
				auf.append(_aufgabe("votum", f"LOI von {i['pseudonym']}: Stellungnahme abgeben", f"{link}#anbieter"))
			frist = K.vorkenntnis_frist(i["nda"].get("am") or i["erstelltAm"])
			if frist and h <= frist and not any(x.get("interesseId") == i["id"] for x in a["vorkenntnis"]):
				auf.append(_aufgabe("vorkenntnis", f"{i['pseudonym']} neu angezeigt – Vorkenntnis ggf. melden", f"{link}#anbieter", frist=frist, ton="info"))
		fragen = frappe.get_all("Plattform Frage", filters={"projekt_id": name, "status": "freigegeben"}, fields=["frist_am"])
		if fragen:
			fr = sorted(K.tag_von(f.frist_am) for f in fragen if f.frist_am)
			auf.append(_aufgabe("qa", f"{len(fragen)} Frage(n) im Deal-Room beantworten", f"/portal/dealroom/{name}?tab=qa", frist=fr[0] if fr else ""))
		for c in frappe.get_all("Plattform Closing", filters={"projekt_id": name, "status": ["in", ["vorbereitung", "signing"]]}, pluck="name"):
			offen = frappe.db.count("Plattform Closing Bedingung", {"parent": c, "parenttype": "Plattform Closing", "verantwortlich": "verkaeufer", "status": "offen"})
			if offen:
				auf.append(_aufgabe("closing", f"{offen} Vollzugsbedingung(en) im Closing melden", f"/portal/closing/{c}"))
		if frappe.db.exists("Plattform Provision", {"projekt_id": name, "status": "in_rechnung"}):
			auf.append(_aufgabe("provision", "Provisionsrechnung offen – bitte begleichen", "/portal/abrechnungen"))
		if pj.phase == "cod" and pj.status != "verkauft":
			aw = K.bestand_auswertung(a["bestand"], _projekt_dict(pj), h)
			if ((aw["ertrag"]["gesamt"] or {}).get("monate") or 0) < 12:
				auf.append(_aufgabe("bestand", "Ertragshistorie (mind. 12 Monate) hochladen", f"{link}#bestand", ton="info"))
			if aw["dd"]["offenPflicht"]:
				auf.append(_aufgabe("bestand", f"Technische DD: {len(aw['dd']['offenPflicht'])} Pflichtunterlage(n) offen", f"{link}#bestand", ton="info"))
		liste.append({"projekt": {"id": name, "titel": pj.titel, "status": pj.status, "phase": pj.phase}, "aufgaben": auf})
	summe = sum(len(x["aufgaben"]) for x in liste)
	return {"rolle": "anbieter", "projekte": liste, "summe": summe, "ueberfaellig": sum(1 for x in liste for y in x["aufgaben"] if y["ueberfaellig"])}


# ================================================================ Frist-Lauf


def _erinnern(von_id=None):
	h = K.heute_wien()
	anzahl = 0
	for z in frappe.get_all(DT, fields=["name"], limit_page_length=5000):
		doc = frappe.get_doc(DT, z.name)
		a = _akte(doc)
		geaendert = False
		for pp in a["pruefpunkte"]:
			if pp.get("status") != "offen" or not pp.get("fristAm") or pp["fristAm"] >= h or pp.get("erinnertAm") == h:
				continue
			pp["erinnertAm"] = h
			geaendert = True
			nachricht_anlegen("projekt", z.name, von_id=von_id, von_admin=True, text=f"Erinnerung: Die Rückfrage „{pp['text'][:80]}“ ist seit {_tag_de(pp['fristAm'])} überfällig.")
			anzahl += 1
		if geaendert:
			_speichern(doc, a)
	return anzahl


@frappe.whitelist(methods=["POST"])
def frist_lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	_bo_schreiben(n)
	return {"erinnert": _erinnern(n.id)}


def frist_lauf_taeglich():
	"""Scheduler (hooks.py → scheduler_events.daily): Erinnerung an überfällige Rückfragen."""
	_erinnern()
	frappe.db.commit()


# ================================================================ Sperren für Statusübergänge (aufgerufen in plattform/ablauf.py)


def zuschlag_pruefen(gebot):
	"""Bieterverfahren: Zuschlag auf ein vom Verkäufer abgelehntes Gebot → 409 „votum“ (= demo/anbieterRegeln.anbieterZuschlagPruefen)."""
	if not gebot:
		return True
	doc = _akte_doc(gebot.projekt_id)
	if not doc:
		return True
	try:
		return K.zuschlag_sperre(akte=_akte(doc), gebot_id=gebot.name, version=cint(gebot.version) or 1)
	except K.AnbieterFehler as e:
		konflikt(str(e))


def vorkenntnis_fuer_kaeufer(projekt_id, interesse_id):
	"""Verkauf/Closing: anerkannte Vorkenntnis zum Käufer → keine Provision (= demo/anbieterRegeln.anbieterVorkenntnisAnerkannt)."""
	if not projekt_id or not interesse_id:
		return None
	doc = _akte_doc(projekt_id)
	return K.vorkenntnis_anerkannt(_akte(doc), interesse_id) if doc else None


def uebergang_pruefen(art, o, nach):
	"""Offene Rückfragen (422), Pflicht-Prüfpunkte/Anonymisierung (409), LOI vom Verkäufer abgelehnt (409) – wie demo/anbieterRegeln.js."""
	if art not in ("projekt", "interesse") or not o:
		return True
	projekt_id = o.name if art == "projekt" else o.get("projekt_id")
	if not projekt_id:
		return True
	doc = _akte_doc(projekt_id)
	if not doc and not (art == "projekt" and nach == "veroeffentlicht"):
		return True
	a = _akte(doc)
	pj = o if art == "projekt" else frappe.get_doc("Plattform Projekt", projekt_id)
	loi_am = (aus_json(o.get("loi"), {}) or {}).get("am") if art == "interesse" else None
	try:
		return K.uebergang_sperre(art, nach, o.status, akte=a, projekt=_projekt_dict(pj), anbieter=kurz(pj.anbieter_id) or {}, interesse_id=o.name if art == "interesse" else None, loi_am=loi_am)
	except K.AnbieterFehler as e:
		if e.status == 409:
			konflikt(str(e))
		ungueltig(str(e))
