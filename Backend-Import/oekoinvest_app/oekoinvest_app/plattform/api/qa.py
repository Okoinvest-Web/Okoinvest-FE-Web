# Copyright (c) 2026, ÖkoInvest GmbH
#
# Q&A im Deal-Room (docs/API.md, Abschnitt 7) – Referenz: qaListe/qaFrageStellen/qaAktion in
# src/lib/plattform/backend/demo/dealroom.js.
#
# Ablauf: Investor fragt (Kategorie) → Backoffice moderiert (anonymisiert, Frist) → Anbieter antwortet →
# Backoffice gibt die Antwort frei (nur für den Fragenden oder für alle Investoren mit Datenraum).
# Anbieter sehen Investoren nur als Pseudonym, Investoren sehen fremde Fragen nur als freigegebene
# Antworten „für alle“ und nie die Identität des Fragenden.

import frappe
from frappe.utils import add_days, get_datetime, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen as benachrichtigen
from oekoinvest_app.plattform.dealroom_kern import (
	FRAGE_STATUS,
	MAIL_DEAL,
	QA_FRIST_MAX,
	QA_FRIST_MIN,
	QA_FRIST_STANDARD,
	QA_KATEGORIEN,
	anonymisieren,
	deal_link,
	investor_anzeige,
	projekt_laden,
	pseudonyme,
	rolle_im,
)
from oekoinvest_app.plattform.kern import als_json, aus_json, hat_rolle, ist_admin, iso, jetzt, konflikt, nicht_gefunden, nutzer, protokoll, verboten
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS

OFFEN = ("eingereicht", "freigegeben", "beantwortet")


def _oeffentlicher_status(s):
	return "beantwortet" if s == "veroeffentlicht" else "abgelehnt" if s == "abgelehnt" else "offen"


def frage_json(f, rolle, n, pseudo):
	sichtbar = f.status == "veroeffentlicht" or rolle != "investor"
	basis = {
		"id": f.name,
		"projektId": f.projekt_id,
		"kategorie": f.kategorie,
		"kategorieLabel": QA_KATEGORIEN.get(f.kategorie, f.kategorie),
		"text": f.text,
		"erstelltAm": iso(f.creation),
		"antwort": (f.antwort or "") if sichtbar else "",
		"antwortAm": iso(f.antwort_am) if sichtbar else None,
		"oeffentlich": bool(f.oeffentlich),
	}
	if rolle == "investor":
		eigen = f.investor_id == n.id
		out = {**basis, "eigen": eigen, "status": _oeffentlicher_status(f.status), "von": "Sie" if eigen else "Anderer Interessent", "antwortVon": "Anbieter (über ÖkoInvest)"}
		if eigen:
			out["statusIntern"] = f.status
			if f.status == "abgelehnt":
				out["ablehnGrund"] = f.ablehn_grund or ""
		return out
	ueberfaellig = f.status == "freigegeben" and bool(f.frist_am) and get_datetime(f.frist_am) < now_datetime()
	out = {
		**basis,
		"status": f.status,
		"statusLabel": FRAGE_STATUS.get(f.status, f.status),
		"fristAm": iso(f.frist_am),
		"ueberfaellig": ueberfaellig,
		"rueckfrage": f.rueckfrage or "",
		"von": investor_anzeige(rolle, f.projekt_id, f.interesse_id, pseudo),
	}
	if rolle == "admin":
		out.update(
			{
				"textOriginal": f.text_original or "",
				"bereinigt": bool(f.bereinigt),
				"antwortOriginal": f.antwort_original or "",
				"oeffentlichVorschlag": bool(f.oeffentlich_vorschlag),
				"ablehnGrund": f.ablehn_grund or "",
				"verlauf": aus_json(f.verlauf, []) or [],
			}
		)
	return out


FELDER = ["*"]
REIHENFOLGE = {"eingereicht": 0, "beantwortet": 1, "freigegeben": 2, "veroeffentlicht": 3, "abgelehnt": 4}


def liste_fuer(n, projekt_id):
	p = projekt_laden(projekt_id)
	rolle, _ = rolle_im(n, p)
	pseudo = pseudonyme(p.name)
	zeilen = frappe.get_all("Plattform Frage", filters={"projekt_id": p.name}, fields=FELDER, order_by="creation desc", limit_page_length=1000)
	if rolle == "anbieter":
		zeilen = [f for f in zeilen if f.status in ("freigegeben", "beantwortet", "veroeffentlicht")]
	if rolle == "investor":
		zeilen = [f for f in zeilen if f.investor_id == n.id or (f.status == "veroeffentlicht" and f.oeffentlich)]
	zeilen.sort(key=lambda f: REIHENFOLGE.get(f.status, 9))
	fragen = [frage_json(f, rolle, n, pseudo) for f in zeilen]
	offen = [f for f in fragen if (f["status"] == "offen" if rolle == "investor" else f["status"] in OFFEN)]
	return {
		"rolle": rolle,
		"fragen": fragen,
		"zaehler": {
			"gesamt": len(fragen),
			"offen": len(offen),
			"ueberfaellig": sum(1 for f in fragen if f.get("ueberfaellig")),
			"moderation": sum(1 for f in fragen if f["status"] in ("eingereicht", "beantwortet")) if rolle == "admin" else None,
		},
	}


@frappe.whitelist(methods=["POST"])
def liste(projektId=None, als_benutzer=None):
	return liste_fuer(nutzer(als_benutzer), projektId)


def _verlauf(f, status, n, kommentar=""):
	eintraege = aus_json(f.verlauf, []) or []
	eintraege.append({"status": status, "am": iso(jetzt()), "vonId": n.id, "kommentar": v.mehrzeilig(kommentar, 500)})
	f.verlauf = als_json(eintraege)
	f.status = status


@frappe.whitelist(methods=["POST"])
def frage_stellen(projektId=None, kategorie=None, text=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not hat_rolle(n, ["investor"]) or ist_admin(n):
		verboten("Fragen stellen Investoren mit freigegebenem Datenraum.")
	roh = v.mehrzeilig(text, 3000)
	v.pflicht(len(roh) >= 10, "Bitte formulieren Sie Ihre Frage (mind. 10 Zeichen).")
	kat = v.auswahl(kategorie, list(QA_KATEGORIEN), "")
	v.pflicht(kat, "Bitte wählen Sie eine Kategorie.")
	p = projekt_laden(projektId)
	rolle, interesse = rolle_im(n, p)
	if rolle != "investor":
		verboten("Fragen stellen Investoren mit freigegebenem Datenraum.")
	if p.status not in BOERSE_STATUS:
		konflikt("Für dieses Projekt sind keine Fragen mehr möglich.")
	if frappe.db.count("Plattform Frage", {"investor_id": n.id, "projekt_id": p.name, "status": ("in", OFFEN)}) >= 25:
		konflikt("Sie haben bereits 25 offene Fragen zu diesem Projekt.")
	sauber, bereinigt = anonymisieren(roh)
	f = frappe.get_doc(
		{
			"doctype": "Plattform Frage",
			"projekt_id": p.name,
			"interesse_id": interesse.name,
			"investor_id": n.id,
			"kategorie": kat,
			"text": sauber,
			"text_original": roh if bereinigt else "",
			"bereinigt": 1 if bereinigt else 0,
			"status": "eingereicht",
			"verlauf": als_json([{"status": "eingereicht", "am": iso(jetzt()), "vonId": n.id, "kommentar": "Kontaktangaben automatisch entfernt." if bereinigt else ""}]),
		}
	).insert(ignore_permissions=True)
	for admin_id in aktive_admins():
		benachrichtigen(admin_id, "nachricht", f"Neue Frage zur Moderation: {p.titel}", f"{QA_KATEGORIEN[kat]} · {sauber[:140]}", deal_link(p.name, "qa"), "projekt", p.name, mail_text=MAIL_DEAL)
	protokoll(n, "qa_frage", "projekt", p.name, f"Frage gestellt ({QA_KATEGORIEN[kat]})" + (", Kontaktangaben entfernt" if bereinigt else ""))
	return frage_json(f, "investor", n, pseudonyme(p.name))


@frappe.whitelist(methods=["POST"])
def aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else {}
	art = v.auswahl(d.get("aktion"), ["antworten", "freigeben", "ablehnen", "antwortFreigeben", "zurueckgeben", "frist"], "")
	v.pflicht(art, "Unbekannte Aktion.")
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Frage", k):
		nicht_gefunden("Frage nicht gefunden.")
	f = frappe.get_doc("Plattform Frage", k)
	p = projekt_laden(f.projekt_id)
	rolle, _ = rolle_im(n, p)
	admin = rolle == "admin"
	if art != "antworten" and not admin:
		verboten("Nur für das Backoffice.")
	if art == "antworten" and rolle not in ("admin", "anbieter"):
		verboten("Antworten gibt der Anbieter des Projekts.")
	frist_tage = v.zahl(d.get("fristTage"), min=QA_FRIST_MIN, max=QA_FRIST_MAX) or QA_FRIST_STANDARD
	frist_tage = int(frist_tage)

	if art == "freigeben":
		if f.status != "eingereicht":
			konflikt("Die Frage wurde bereits moderiert.")
		if d.get("text") is not None:
			t = v.mehrzeilig(d.get("text"), 3000)
			v.pflicht(len(t) >= 10, "Der Fragetext ist zu kurz.")
			f.text = anonymisieren(t)[0]
		f.frist_am = add_days(now_datetime(), frist_tage)
		f.freigegeben_am = jetzt()
		_verlauf(f, "freigegeben", n, f"Anonymisiert an den Anbieter weitergegeben, Antwortfrist {frist_tage} Tage.")
		benachrichtigen(p.anbieter_id, "nachricht", f"Neue Frage eines Interessenten: {p.titel}", f"{QA_KATEGORIEN.get(f.kategorie)} · Antwort bis {get_datetime(f.frist_am).strftime('%d.%m.%Y')}", deal_link(p.name, "qa"), "projekt", p.name, mail_text=MAIL_DEAL)
	elif art == "ablehnen":
		if f.status not in OFFEN:
			konflikt("Die Frage ist bereits abgeschlossen.")
		grund = v.mehrzeilig(d.get("grund"), 500)
		v.pflicht(len(grund) >= 3, "Bitte geben Sie eine Begründung an.")
		f.ablehn_grund = grund
		_verlauf(f, "abgelehnt", n, grund)
		benachrichtigen(f.investor_id, "nda", f"Frage nicht zugelassen: {p.titel}", grund, deal_link(p.name, "qa"), "interesse", f.interesse_id, mail_text=MAIL_DEAL)
	elif art == "antworten":
		if f.status not in ("freigegeben", "beantwortet"):
			konflikt("Die Frage ist noch in der Moderation." if f.status == "eingereicht" else "Die Frage ist bereits abgeschlossen.")
		roh = v.mehrzeilig(d.get("antwort"), 5000)
		v.pflicht(len(roh) >= 5, "Bitte geben Sie eine Antwort ein (mind. 5 Zeichen).")
		sauber, bereinigt = anonymisieren(roh)
		f.antwort = sauber
		f.antwort_original = roh if bereinigt else ""
		f.antwort_am = jetzt()
		f.antwort_von = n.id
		f.oeffentlich_vorschlag = 1 if v.wahr(d.get("oeffentlich")) else 0
		f.rueckfrage = ""
		_verlauf(f, "beantwortet", n, "Kontaktangaben automatisch entfernt." if bereinigt else "")
		if not admin:
			for admin_id in aktive_admins():
				benachrichtigen(admin_id, "nachricht", f"Antwort zur Freigabe: {p.titel}", f"{QA_KATEGORIEN.get(f.kategorie)} · {sauber[:140]}", deal_link(p.name, "qa"), "projekt", p.name, mail_text=MAIL_DEAL)
	elif art == "antwortFreigeben":
		if f.status != "beantwortet":
			konflikt("Es liegt keine Antwort zur Freigabe vor.")
		if d.get("antwort") is not None:
			t = v.mehrzeilig(d.get("antwort"), 5000)
			v.pflicht(len(t) >= 5, "Die Antwort ist zu kurz.")
			f.antwort = anonymisieren(t)[0]
		f.oeffentlich = (1 if f.oeffentlich_vorschlag else 0) if d.get("oeffentlich") is None else (1 if v.wahr(d.get("oeffentlich")) else 0)
		f.veroeffentlicht_am = jetzt()
		_verlauf(f, "veroeffentlicht", n, "Antwort für alle Interessenten mit NDA sichtbar." if f.oeffentlich else "Antwort nur für den Fragenden sichtbar.")
		benachrichtigen(f.investor_id, "nda", f"Antwort auf Ihre Frage: {p.titel}", f"{QA_KATEGORIEN.get(f.kategorie)} · beantwortet", deal_link(p.name, "qa"), "interesse", f.interesse_id, mail_text=MAIL_DEAL)
		if f.oeffentlich:
			for i in frappe.get_all("Plattform Interesse", filters={"projekt_id": p.name, "investor_id": ("!=", f.investor_id), "status": ("in", DATENRAUM_STATUS)}, fields=["name", "investor_id"]):
				benachrichtigen(i.investor_id, "nda", f"Neue Antwort im Q&A: {p.titel}", f"{QA_KATEGORIEN.get(f.kategorie)} · für alle Interessenten freigegeben", deal_link(p.name, "qa"), "interesse", i.name, mail=False)
	elif art == "zurueckgeben":
		if f.status != "beantwortet":
			konflikt("Es liegt keine Antwort vor.")
		kommentar = v.mehrzeilig(d.get("kommentar"), 500)
		v.pflicht(len(kommentar) >= 3, "Bitte begründen Sie die Rückgabe.")
		f.rueckfrage = kommentar
		f.frist_am = add_days(now_datetime(), frist_tage)
		_verlauf(f, "freigegeben", n, f"Antwort zurückgegeben: {kommentar}")
		benachrichtigen(p.anbieter_id, "nachricht", f"Rückfrage zu Ihrer Antwort: {p.titel}", kommentar[:200], deal_link(p.name, "qa"), "projekt", p.name, mail_text=MAIL_DEAL)
	elif art == "frist":
		if f.status != "freigegeben":
			konflikt("Eine Frist gibt es nur für offene Fragen beim Anbieter.")
		f.frist_am = add_days(now_datetime(), frist_tage)
		_verlauf(f, "freigegeben", n, f"Antwortfrist neu: {frist_tage} Tage.")

	f.save(ignore_permissions=True)
	protokoll(n, "qa", "projekt", p.name, f"Frage {f.name}: {art}")
	return frage_json(f, rolle, n, pseudonyme(p.name))
