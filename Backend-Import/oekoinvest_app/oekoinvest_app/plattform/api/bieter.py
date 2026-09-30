# Copyright (c) 2026, ÖkoInvest GmbH
#
# Strukturiertes Bieterverfahren (docs/API.md, Abschnitt 7) – Referenz: bieterverfahren/bieterStarten/
# bieterAktion/gebotAbgeben in src/lib/plattform/backend/demo/dealroom.js.
#
#  - Runden (indikativ → verbindlich) mit Frist; nach Fristablauf/Ende keine Gebote mehr (409)
#  - Gebote verdeckt: Investoren sehen nur eigene; Anbieter erst nach Freigabe und nur anonymisiert
#  - Zuschlag: Gebot → zuschlag, übrige → unterlegen; Interesse → loi_angenommen (system, Automat gezielt
#    erweitert), Projekt veroeffentlicht → reserviert (system). Verkauf/Provision danach über den
#    bestehenden Übergang Projekt → verkauft (prozess.status_wechsel).
#  - Erinnerung 48 h vor Fristende (Scheduler stündlich: erinnerungen_senden; beim Abruf ebenfalls)

import frappe
from frappe.utils import cint, flt, get_datetime, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import system_wechsel
from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen as benachrichtigen
from oekoinvest_app.plattform.dealroom_kern import (
	ERINNERUNG_STUNDEN,
	GEBOT_PFLICHT,
	MAIL_DEAL,
	RUNDEN_ARTEN,
	aus_iso,
	anonymisieren,
	deal_link,
	frist_pruefen,
	gebot_gesamt,
	gebot_pro_kwp,
	investor_anzeige,
	projekt_laden,
	pseudonyme,
	rolle_im,
)
from oekoinvest_app.plattform.kern import als_json, aus_json, hat_rolle, ist_admin, iso, jetzt, konflikt, nicht_gefunden, nutzer, protokoll, verboten
from oekoinvest_app.plattform.prozesse import DATENRAUM_STATUS

AKTIV = ("laufend", "auswertung", "zuschlag")


def _fmt(dt):
	return get_datetime(dt).strftime("%d.%m.%Y %H:%M")


def _runde(vf):
	return vf.runden[-1]


def _offen(r):
	return bool(r) and not r.beendet_am and get_datetime(r.frist) > now_datetime()


def _teilnehmer(r):
	return aus_json(r.teilnehmer, []) or []


def verfahren_status(vf):
	p_status = frappe.db.get_value("Plattform Projekt", vf.projekt_id, "status")
	if vf.status == "zuschlag" and p_status == "verkauft":
		return "abgeschlossen"
	if vf.status == "laufend" and not _offen(_runde(vf)):
		return "auswertung"
	return vf.status


def _log(vf, n, text):
	eintraege = aus_json(vf.verlauf, []) or []
	eintraege.append({"am": iso(jetzt()), "vonId": n.id if n else None, "text": text})
	vf.verlauf = als_json(eintraege)


def gebot_json(g, rolle, pseudo, mwp):
	out = {
		"id": g.name,
		"runde": cint(g.runde),
		"rundeArt": g.runde_art,
		"preisModus": g.preis_modus,
		"preis": flt(g.preis) or None,
		"preisProKwp": flt(g.preis_pro_kwp) or None,
		"preisGesamt": gebot_gesamt(g.preis_modus, g.preis, g.preis_pro_kwp, mwp),
		"proKwp": gebot_pro_kwp(g.preis_modus, g.preis, g.preis_pro_kwp, mwp),
		"bedingungen": g.bedingungen or "",
		"finanzierung": g.finanzierung or "",
		"finanzierungDokumentId": g.finanzierung_dokument_id or None,
		"zeitplan": g.zeitplan or "",
		"gueltigBis": str(g.gueltig_bis) if g.gueltig_bis else "",
		"status": g.status,
		"am": iso(g.am),
		"version": cint(g.version) or 1,
	}
	if rolle == "investor":
		return out
	out["von"] = investor_anzeige(rolle, g.projekt_id, g.interesse_id, pseudo)
	if rolle == "admin":
		out["interesseId"] = g.interesse_id
		out["historie"] = aus_json(g.historie, []) or []
	return out


def _gebote(vf_name, **filters):
	return frappe.get_all("Plattform Gebot", filters={"verfahren_id": vf_name, **filters}, fields=["*"], order_by="am desc", limit_page_length=1000)


def verfahren_json(vf, rolle, n, p):
	r = _runde(vf)
	status = verfahren_status(vf)
	out = {
		"id": vf.name,
		"projektId": vf.projekt_id,
		"status": status,
		"pflicht": aus_json(vf.pflicht, []) or [],
		"hinweis": vf.hinweis or "",
		"erstelltAm": iso(vf.creation),
		"runde": {"nr": cint(r.nr), "art": r.art, "label": RUNDEN_ARTEN.get(r.art), "start": iso(r.start), "frist": iso(r.frist), "offen": _offen(r), "beendetAm": iso(r.beendet_am)},
		"runden": [
			{"nr": cint(x.nr), "art": x.art, "label": RUNDEN_ARTEN.get(x.art), "start": iso(x.start), "frist": iso(x.frist), "beendetAm": iso(x.beendet_am), **({} if rolle == "investor" else {"teilnehmerAnzahl": len(_teilnehmer(x))})}
			for x in vf.runden
		],
		"anbieterFreigabe": bool(vf.anbieter_freigabe),
		"zuschlag": None,
	}
	pseudo = pseudonyme(p.name)
	mwp = flt(p.mwp)
	if rolle == "investor":
		i = frappe.db.get_value("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}, "name")
		out["zugelassen"] = bool(i) and i in _teilnehmer(r) and status == "laufend"
		out["eigeneGebote"] = [gebot_json(g, rolle, pseudo, mwp) for g in _gebote(vf.name, investor_id=n.id)]
		out["zuschlagEigen"] = (vf.zuschlag_interesse_id == i) if vf.zuschlag_interesse_id else None
		return out
	gebote = [g for g in _gebote(vf.name) if g.status != "zurueckgezogen"]
	if vf.zuschlag_gebot_id:
		out["zuschlag"] = {"am": iso(vf.zuschlag_am), "preisGesamt": flt(vf.zuschlag_preis) or None, "von": investor_anzeige(rolle, p.name, vf.zuschlag_interesse_id, pseudo)}
		if rolle == "admin":
			out["zuschlag"].update({"gebotId": vf.zuschlag_gebot_id, "interesseId": vf.zuschlag_interesse_id})
	zeigen = rolle == "admin" or bool(vf.anbieter_freigabe)
	if zeigen:
		matrix = [gebot_json(g, rolle, pseudo, mwp) for g in gebote]
		matrix.sort(key=lambda g: (-g["runde"], -(g["preisGesamt"] or 0)))
		out["matrix"] = matrix
		out["geboteAnzahl"] = sum(1 for g in gebote if cint(g.runde) == cint(r.nr))
	else:
		out["matrix"] = None
	if rolle == "admin":
		teilnehmer = []
		for iid in _teilnehmer(r):
			g = next((x for x in gebote if x.interesse_id == iid and cint(x.runde) == cint(r.nr)), None)
			teilnehmer.append({**investor_anzeige("admin", p.name, iid, pseudo), "interesseId": iid, "geboten": bool(g), "gebotAm": iso(g.am) if g else None})
		out["teilnehmer"] = teilnehmer
		out["erinnertAm"] = iso(r.erinnert_am)
		out["verlauf"] = aus_json(vf.verlauf, []) or []
	return out


def _erinnern(vf, p, sofort=False):
	r = _runde(vf)
	if not _offen(r):
		return 0
	rest = (get_datetime(r.frist) - now_datetime()).total_seconds()
	if not sofort and (r.erinnert_am or rest > ERINNERUNG_STUNDEN * 3600):
		return 0
	anzahl = 0
	for iid in _teilnehmer(r):
		if frappe.db.exists("Plattform Gebot", {"verfahren_id": vf.name, "runde": r.nr, "interesse_id": iid, "status": "abgegeben"}):
			continue
		investor_id = frappe.db.get_value("Plattform Interesse", iid, "investor_id")
		if not investor_id:
			continue
		benachrichtigen(investor_id, "nda", f"Erinnerung Angebotsfrist: {p.titel}", f"{RUNDEN_ARTEN[r.art]} bis {_fmt(r.frist)}", deal_link(p.name, "bieter"), "interesse", iid, mail_text="Eine Angebotsfrist im Deal-Room eines Projekts läuft bald ab. Details finden Sie im Portal.")
		anzahl += 1
	r.erinnert_am = jetzt()
	return anzahl


def _aktuellstes(projekt_id):
	name = frappe.db.get_value("Plattform Bieterverfahren", {"projekt_id": projekt_id}, "name", order_by="creation desc")
	return frappe.get_doc("Plattform Bieterverfahren", name) if name else None


def verfahren_fuer(n, projekt_id):
	p = projekt_laden(projekt_id)
	rolle, _ = rolle_im(n, p)
	vf = _aktuellstes(p.name)
	if vf and vf.status == "laufend" and _erinnern(vf, p):
		vf.save(ignore_permissions=True)
	return {"rolle": rolle, "verfahren": verfahren_json(vf, rolle, n, p) if vf else None, "projekt": {"id": p.name, "mwp": flt(p.mwp), "status": p.status, "titel": p.titel}}


@frappe.whitelist(methods=["POST"])
def verfahren(projektId=None, als_benutzer=None):
	return verfahren_fuer(nutzer(als_benutzer), projektId)


def liste_fuer(n):
	out = []
	for name in frappe.get_all("Plattform Bieterverfahren", order_by="creation desc", pluck="name", limit_page_length=500):
		vf = frappe.get_doc("Plattform Bieterverfahren", name)
		p = frappe.db.get_value("Plattform Projekt", vf.projekt_id, ["titel", "mwp"], as_dict=True) or frappe._dict()
		r = _runde(vf)
		gebote = [g for g in _gebote(vf.name, runde=r.nr) if g.status != "zurueckgezogen"]
		preise = sorted([x for x in (gebot_gesamt(g.preis_modus, g.preis, g.preis_pro_kwp, p.mwp) for g in gebote) if x], reverse=True)
		out.append(
			{
				"id": vf.name,
				"projektId": vf.projekt_id,
				"projektTitel": p.titel or vf.projekt_id,
				"status": verfahren_status(vf),
				"runde": {"nr": cint(r.nr), "art": r.art, "frist": iso(r.frist), "offen": _offen(r)},
				"teilnehmer": len(_teilnehmer(r)),
				"gebote": len(gebote),
				"bester": preise[0] if preise else None,
			}
		)
	return out


@frappe.whitelist(methods=["POST"])
def liste(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	return liste_fuer(n)


@frappe.whitelist(methods=["POST"])
def starten(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	d = daten if isinstance(daten, dict) else {}
	frist = frist_pruefen(d.get("frist"))
	art = v.auswahl(d.get("art"), list(RUNDEN_ARTEN), "indikativ")
	pflicht = v.mehrfach(d.get("pflicht"), list(GEBOT_PFLICHT))
	p = projekt_laden(d.get("projektId"))
	if p.status != "veroeffentlicht":
		konflikt("Ein Bieterverfahren ist nur für veröffentlichte (nicht reservierte) Projekte möglich.")
	if frappe.db.exists("Plattform Bieterverfahren", {"projekt_id": p.name, "status": ("in", AKTIV)}):
		konflikt("Für dieses Projekt läuft bereits ein Bieterverfahren.")
	berechtigt = frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name, "status": ("in", ["nda_freigegeben", "loi_abgegeben"])}, fields=["name", "investor_id"])
	teilnehmer = [i.name for i in berechtigt]
	wunsch = d.get("teilnehmer")
	if isinstance(wunsch, list) and wunsch:
		teilnehmer = [t for t in teilnehmer if t in wunsch]
	v.pflicht(teilnehmer, "Es gibt noch keine Interessenten mit freigegebenem Datenraum.")
	vf = frappe.get_doc(
		{
			"doctype": "Plattform Bieterverfahren",
			"projekt_id": p.name,
			"status": "laufend",
			"pflicht": als_json(pflicht),
			"hinweis": v.mehrzeilig(d.get("hinweis"), 1500),
			"anbieter_freigabe": 0,
			"erstellt_von": n.id,
			"runden": [{"nr": 1, "art": art, "start": jetzt(), "frist": frist, "teilnehmer": als_json(teilnehmer)}],
			"verlauf": als_json([{"am": iso(jetzt()), "vonId": n.id, "text": f"Verfahren gestartet: {RUNDEN_ARTEN[art]}, {len(teilnehmer)} Teilnehmer"}]),
		}
	).insert(ignore_permissions=True)
	for i in berechtigt:
		if i.name in teilnehmer:
			benachrichtigen(i.investor_id, "nda", f"Bieterverfahren gestartet: {p.titel}", f"{RUNDEN_ARTEN[art]} bis {_fmt(frist)}", deal_link(p.name, "bieter"), "interesse", i.name, mail_text=MAIL_DEAL)
	benachrichtigen(p.anbieter_id, "nachricht", f"Bieterverfahren gestartet: {p.titel}", f"{len(teilnehmer)} Interessenten eingeladen, {RUNDEN_ARTEN[art]}.", deal_link(p.name, "bieter"), "projekt", p.name, mail_text=MAIL_DEAL)
	protokoll(n, "bieter", "projekt", p.name, f"Bieterverfahren {vf.name} gestartet ({len(teilnehmer)} Teilnehmer)")
	return verfahren_json(vf, "admin", n, p)


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002, C901
	n = nutzer(als_benutzer)
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")
	d = daten if isinstance(daten, dict) else {}
	art = v.auswahl(d.get("aktion"), ["frist", "beenden", "naechsteRunde", "anbieterFreigabe", "erinnern", "zuschlag", "abbrechen"], "")
	v.pflicht(art, "Unbekannte Aktion.")
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Bieterverfahren", k):
		nicht_gefunden("Bieterverfahren nicht gefunden.")
	vf = frappe.get_doc("Plattform Bieterverfahren", k)
	p = projekt_laden(vf.projekt_id)
	status = verfahren_status(vf)
	r = _runde(vf)
	ende = status in ("zuschlag", "abgeschlossen", "abgebrochen")
	hinweis = ""

	if art == "frist":
		if ende:
			konflikt("Das Verfahren ist beendet.")
		r.frist = frist_pruefen(d.get("frist"))
		r.beendet_am = None
		r.erinnert_am = None
		vf.status = "laufend"
		_log(vf, n, f"Frist Runde {r.nr} geändert")
		for iid in _teilnehmer(r):
			investor_id = frappe.db.get_value("Plattform Interesse", iid, "investor_id")
			benachrichtigen(investor_id, "nda", f"Neue Angebotsfrist: {p.titel}", f"{RUNDEN_ARTEN[r.art]} bis {_fmt(r.frist)}", deal_link(p.name, "bieter"), "interesse", iid, mail_text=MAIL_DEAL)
	elif art == "beenden":
		if not _offen(r) or ende:
			konflikt("Die Runde ist bereits beendet.")
		r.beendet_am = jetzt()
		_log(vf, n, f"Runde {r.nr} vorzeitig beendet")
	elif art == "naechsteRunde":
		if ende:
			konflikt("Das Verfahren ist beendet.")
		if _offen(r):
			konflikt("Die laufende Runde ist noch offen – bitte zuerst beenden oder Frist abwarten.")
		frist = frist_pruefen(d.get("frist"))
		neue_art = v.auswahl(d.get("art"), list(RUNDEN_ARTEN), "verbindlich")
		erlaubt = set(frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name, "status": ("in", [s for s in DATENRAUM_STATUS if s != "abgeschlossen"])}, pluck="name"))
		shortlist = [x for x in (v.kennung(t) for t in (d.get("teilnehmer") or [])) if x in erlaubt]
		shortlist = list(dict.fromkeys(shortlist))
		v.pflicht(shortlist, "Bitte wählen Sie mindestens einen Bieter für die nächste Runde (Shortlist).")
		if not r.beendet_am:
			r.beendet_am = r.frist
		alte = _teilnehmer(r)
		vf.append("runden", {"nr": cint(r.nr) + 1, "art": neue_art, "start": jetzt(), "frist": frist, "teilnehmer": als_json(shortlist)})
		vf.status = "laufend"
		_log(vf, n, f"Runde {cint(r.nr) + 1} gestartet: {RUNDEN_ARTEN[neue_art]}, Shortlist {len(shortlist)}")
		for iid in erlaubt:
			if iid not in shortlist and iid not in alte:
				continue
			investor_id = frappe.db.get_value("Plattform Interesse", iid, "investor_id")
			if iid in shortlist:
				benachrichtigen(investor_id, "nda", f"Sie sind in der nächsten Runde: {p.titel}", f"{RUNDEN_ARTEN[neue_art]} bis {_fmt(frist)}", deal_link(p.name, "bieter"), "interesse", iid, mail_text=MAIL_DEAL)
			else:
				benachrichtigen(investor_id, "nda", "Bieterverfahren: nächste Runde ohne Ihr Angebot", "Ihr Angebot wurde für die nächste Runde nicht berücksichtigt.", deal_link(p.name, "bieter"), "interesse", iid, mail_text=MAIL_DEAL)
	elif art == "anbieterFreigabe":
		vf.anbieter_freigabe = 1 if v.wahr(d.get("an")) else 0
		_log(vf, n, "Bieterstand für den Anbieter freigegeben (anonymisiert)" if vf.anbieter_freigabe else "Bieterstand für den Anbieter gesperrt")
		if vf.anbieter_freigabe:
			benachrichtigen(p.anbieter_id, "nachricht", f"Bieterstand freigegeben: {p.titel}", "Sie können die Angebote (anonymisiert) im Deal-Room vergleichen.", deal_link(p.name, "bieter"), "projekt", p.name, mail_text=MAIL_DEAL)
	elif art == "erinnern":
		if not _offen(r):
			konflikt("Die Runde ist nicht offen.")
		hinweis = f"{_erinnern(vf, p, sofort=True)} Erinnerung(en) gesendet."
		_log(vf, n, hinweis)
	elif art == "zuschlag":
		if ende:
			konflikt("Das Verfahren ist bereits beendet.")
		if _offen(r):
			konflikt("Ein Zuschlag ist erst nach Ablauf bzw. Ende der Runde möglich (Gleichbehandlung).")
		gid = v.kennung(d.get("gebotId"))
		g = frappe.get_doc("Plattform Gebot", gid) if gid and frappe.db.exists("Plattform Gebot", gid) else None
		v.pflicht(g and g.verfahren_id == vf.name and cint(g.runde) == cint(r.nr) and g.status == "abgegeben", "Bitte wählen Sie ein gültiges Gebot.")  # nur Gebote der letzten Runde
		from oekoinvest_app.plattform.api.anbieter import zuschlag_pruefen  # Anbieter: kein Zuschlag auf ein vom Verkäufer abgelehntes Gebot (409 „votum“)

		zuschlag_pruefen(g)
		i = frappe.get_doc("Plattform Interesse", g.interesse_id)
		v.pflicht(i.status in ("nda_freigegeben", "loi_abgegeben", "loi_angenommen"), "Der Bieter hat keinen gültigen Datenraum-Status mehr.")
		from oekoinvest_app.plattform.kyc_kern import kyc_sperre  # KYC/KYB

		kyc_sperre("zuschlag", konto_id=i.investor_id, organisation_id=i.get("organisation_id"), text="Zuschlag nicht möglich: Der Bieter ist noch nicht verifiziert (KYC/KYB).")
		if p.status not in ("veroeffentlicht", "reserviert"):
			konflikt("Das Projekt ist nicht mehr in der Börse.")
		gesamt = gebot_gesamt(g.preis_modus, g.preis, g.preis_pro_kwp, p.mwp)
		for x in _gebote(vf.name, status="abgegeben"):
			frappe.db.set_value("Plattform Gebot", x.name, "status", "zuschlag" if x.name == g.name else "unterlegen")
		vf.status = "zuschlag"
		vf.zuschlag_gebot_id = g.name
		vf.zuschlag_interesse_id = i.name
		vf.zuschlag_am = jetzt()
		vf.zuschlag_preis = gesamt or 0
		kommentar = v.mehrzeilig(d.get("kommentar"), 500)
		_log(vf, n, f"Zuschlag an {g.name}" + (f" – {kommentar}" if kommentar else ""))
		vf.save(ignore_permissions=True)
		if not aus_json(i.loi):
			i.loi = als_json({"betrag": gesamt, "text": f"Angebot im Bieterverfahren {vf.name}, Runde {g.runde} ({RUNDEN_ARTEN.get(g.runde_art, '')}).", "bedingungen": g.bedingungen or "", "gueltigBis": str(g.gueltig_bis or ""), "am": iso(g.am)})
		if i.status != "loi_angenommen":
			system_wechsel("interesse", i, "loi_angenommen", "Zuschlag im Bieterverfahren." + (f" {kommentar}" if kommentar else ""))
		p.reload()
		if p.status == "veroeffentlicht":
			system_wechsel("projekt", p, "reserviert", "Zuschlag im Bieterverfahren erteilt.")
		for x in _gebote(vf.name, status="unterlegen"):
			if x.interesse_id != i.name:
				benachrichtigen(x.investor_id, "nda", f"Bieterverfahren entschieden: {p.titel}", "Der Zuschlag ging an einen anderen Bieter. Vielen Dank für Ihr Angebot.", deal_link(p.name, "bieter"), "interesse", x.interesse_id, mail_text=MAIL_DEAL)
		protokoll(n, "bieter", "projekt", p.name, f"Zuschlag im Bieterverfahren {vf.name}: {g.name} ({gesamt or '–'} €)")
	elif art == "abbrechen":
		if ende:
			konflikt("Das Verfahren ist bereits beendet.")
		grund = v.mehrzeilig(d.get("grund"), 500)
		v.pflicht(len(grund) >= 3, "Bitte geben Sie eine Begründung an.")
		vf.status = "abgebrochen"
		if not r.beendet_am:
			r.beendet_am = jetzt()
		for x in _gebote(vf.name, status="abgegeben"):
			frappe.db.set_value("Plattform Gebot", x.name, "status", "unterlegen")
		_log(vf, n, f"Abgebrochen: {grund}")
		for iid in {t for x in vf.runden for t in _teilnehmer(x)}:
			investor_id = frappe.db.get_value("Plattform Interesse", iid, "investor_id")
			benachrichtigen(investor_id, "nda", f"Bieterverfahren beendet: {p.titel}", "Das Verfahren wurde ohne Zuschlag beendet.", deal_link(p.name, "bieter"), "interesse", iid, mail_text=MAIL_DEAL)

	vf.save(ignore_permissions=True)
	if art != "erinnern":
		protokoll(n, "bieter", "projekt", p.name, f"Bieterverfahren {vf.name}: {art}")
	p.reload()
	return {**verfahren_json(vf, "admin", n, p), "hinweis": hinweis}


def _text(wert, pflichtig, label, maximal=2000):
	t = anonymisieren(v.mehrzeilig(wert, maximal))[0]
	if pflichtig:
		v.pflicht(len(t) >= 3, f"Pflichtangabe fehlt: {label}")
	return t


@frappe.whitelist(methods=["POST"])
def gebot_abgeben(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not hat_rolle(n, ["investor"]) or ist_admin(n):
		verboten("Gebote geben Investoren ab.")
	d = daten if isinstance(daten, dict) else {}
	k = v.kennung(d.get("verfahrenId"))
	if not k or not frappe.db.exists("Plattform Bieterverfahren", k):
		nicht_gefunden("Bieterverfahren nicht gefunden.")
	vf = frappe.get_doc("Plattform Bieterverfahren", k)
	p = projekt_laden(vf.projekt_id)
	rolle, interesse = rolle_im(n, p)
	if rolle != "investor":
		verboten()
	r = _runde(vf)
	if interesse.name not in _teilnehmer(r):
		verboten("Sie sind für diese Runde nicht zugelassen.")
	from oekoinvest_app.plattform.kyc_kern import kyc_sperre  # KYC/KYB: Gebot nur verifiziert

	kyc_sperre("gebot", konto_id=interesse.investor_id, organisation_id=interesse.get("organisation_id"))
	from oekoinvest_app.plattform.dienste_kern import bonitaet_sperre  # Dienste: Gebot nur mit gültiger Bonitätsauskunft

	bonitaet_sperre("gebot", konto_id=interesse.investor_id, organisation_id=interesse.get("organisation_id"))
	if verfahren_status(vf) != "laufend" or not _offen(r):
		konflikt("Die Angebotsfrist ist abgelaufen – Gebote sind nicht mehr möglich.")
	modus = v.auswahl(d.get("preisModus"), ["gesamt", "proKwp"], "gesamt")
	preis = v.zahl(d.get("preis"), min=1000, max=1e11) if modus == "gesamt" else None
	pro_kwp = v.zahl(d.get("preisProKwp"), min=1, max=20000, stellen=2) if modus == "proKwp" else None
	v.pflicht(preis or pro_kwp, "Bitte geben Sie einen Gesamtpreis in Euro an." if modus == "gesamt" else "Bitte geben Sie einen Preis je kWp an.")
	pf = set(aus_json(vf.pflicht, []) or [])
	verbindlich = r.art == "verbindlich"
	eintrag = {
		"preis_modus": modus,
		"preis": preis or 0,
		"preis_pro_kwp": pro_kwp or 0,
		"bedingungen": _text(d.get("bedingungen"), "bedingungen" in pf, GEBOT_PFLICHT["bedingungen"]),
		"finanzierung": _text(d.get("finanzierung"), "finanzierung" in pf or verbindlich, GEBOT_PFLICHT["finanzierung"]),
		"zeitplan": _text(d.get("zeitplan"), "zeitplan" in pf or verbindlich, GEBOT_PFLICHT["zeitplan"], 1000),
		"gueltig_bis": d.get("gueltigBis") if aus_iso(d.get("gueltigBis")) and len(str(d.get("gueltigBis"))) == 10 else None,
		"finanzierung_dokument_id": None,
	}
	if d.get("finanzierungDokumentId"):
		dok = v.kennung(d.get("finanzierungDokumentId"))
		v.pflicht(dok and frappe.db.get_value("Plattform Dokument", dok, "hochgeladen_von") == n.id, "Finanzierungsnachweis: Dokument nicht gefunden.")
		eintrag["finanzierung_dokument_id"] = dok
	vorhanden = frappe.db.get_value("Plattform Gebot", {"verfahren_id": vf.name, "runde": r.nr, "interesse_id": interesse.name, "status": "abgegeben"}, "name")
	if vorhanden:
		g = frappe.get_doc("Plattform Gebot", vorhanden)
		historie = aus_json(g.historie, []) or []
		historie.append({"am": iso(g.am), "preisGesamt": gebot_gesamt(g.preis_modus, g.preis, g.preis_pro_kwp, p.mwp), "version": cint(g.version)})
		g.update({**eintrag, "am": jetzt(), "version": cint(g.version) + 1, "historie": als_json(historie[-20:])})
		g.save(ignore_permissions=True)
	else:
		g = frappe.get_doc(
			{"doctype": "Plattform Gebot", "verfahren_id": vf.name, "projekt_id": p.name, "runde": r.nr, "runde_art": r.art, "interesse_id": interesse.name, "investor_id": n.id, **eintrag, "status": "abgegeben", "am": jetzt(), "version": 1, "historie": "[]"}
		).insert(ignore_permissions=True)
	for admin_id in aktive_admins():
		benachrichtigen(admin_id, "nachricht", f"Gebot eingegangen: {p.titel}", f"{RUNDEN_ARTEN[r.art]} · Runde {r.nr}" + (f" · Version {g.version}" if cint(g.version) > 1 else ""), deal_link(p.name, "bieter"), "projekt", p.name, mail=False)
	protokoll(n, "gebot", "interesse", interesse.name, f"Gebot {g.name} (Runde {r.nr}, Version {g.version}) abgegeben")
	return gebot_json(g, "investor", {}, flt(p.mwp))


@frappe.whitelist(methods=["POST"])
def gebot_zurueckziehen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	g = frappe.get_doc("Plattform Gebot", k) if k and frappe.db.exists("Plattform Gebot", k) else None
	if not g or g.investor_id != n.id:
		nicht_gefunden("Gebot nicht gefunden.")
	vf = frappe.get_doc("Plattform Bieterverfahren", g.verfahren_id)
	r = _runde(vf)
	if g.status != "abgegeben" or cint(g.runde) != cint(r.nr) or not _offen(r):
		konflikt("Das Gebot kann nicht mehr zurückgezogen werden.")
	g.status = "zurueckgezogen"
	g.save(ignore_permissions=True)
	protokoll(n, "gebot", "interesse", g.interesse_id, f"Gebot {g.name} zurückgezogen")
	return {"ok": True}


def erinnerungen_senden():
	"""Scheduler (stündlich): Erinnerung an Teilnehmer ohne Gebot 48 h vor Fristende."""
	for name in frappe.get_all("Plattform Bieterverfahren", filters={"status": "laufend"}, pluck="name"):
		vf = frappe.get_doc("Plattform Bieterverfahren", name)
		p = frappe.get_doc("Plattform Projekt", vf.projekt_id)
		if _erinnern(vf, p):
			vf.save(ignore_permissions=True)
	frappe.db.commit()
