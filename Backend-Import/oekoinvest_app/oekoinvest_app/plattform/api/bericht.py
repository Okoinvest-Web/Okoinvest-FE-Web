# Copyright (c) 2026, ÖkoInvest GmbH
#
# Bericht-Baustein (Welle 2, Paket B4) – Frappe-Spiegel von src/lib/plattform/backend/demo/bericht.js.
# Aufruf nur über den technischen API-Benutzer (api_pruefen); die Website (src/lib/bericht/dienst.js) orchestriert:
#   anfordern   → Plattform Bericht (NUR token_hash, nie der Klartext) + Plattform Lead Person „ausstehend“ (B3) +
#                 Bestätigungs-Mail (nur mit Testversand-Freigabe, siehe _versand_erlaubt)
#   bestaetigen → phase "beginnen" (atomar offen → in_bestaetigung, liefert Kontakt), "abschliessen" (Vorgang
#                 verknüpfen, Berichtsfrist), "zuruecksetzen" (Fehler unterwegs)
#   lesen       → Bericht ohne Personendaten; Zustände wie src/lib/bericht/token.js
#   aufraeumen  → abgelaufene Berichte zu Grabsteinen verkürzen (Personenzeile „ausstehend“ löschen)
#
# Personendaten stehen ausschließlich in Plattform Lead Person (löschbar nach Art. 17, B3) – Plattform Bericht hält nur
# den Verweis lead_person. Keine Personendaten in Logs oder Fehlermeldungen.
# TODO Betrieb: hooks.py (nicht Teil von Paket B4) – täglichen Scheduler „bericht.aufraeumen_taeglich“ eintragen.
# TODO Inhaber/B0: Absender/Versanddomain; vor dem Livegang kein Versand unter dem Namen (Inhaber-Entscheidung).

import re
from datetime import datetime
from zoneinfo import ZoneInfo

import frappe
from frappe.utils import get_datetime, get_system_timezone

from oekoinvest_app.plattform.kern import als_json, api_pruefen, aus_json, iso, jetzt, ungueltig
from oekoinvest_app.plattform.api.einwilligung import pseudonym

DT = "Plattform Bericht"
PERSON = "Plattform Lead Person"
RECHNER = ["pacht", "pachtangebot", "flaechencheck", "kommune"]
LAENDER = ["DE", "AT", "CH"]
HASH = re.compile(r"^[0-9a-f]{64}$")
SPERRE_SEKUNDEN = 120
GRABSTEIN_TAGE = 90


def _dt(wert):
	"""ISO (UTC, …Z) → naive Systemzeit für Datetime-Felder"""
	if not wert:
		return None
	d = datetime.fromisoformat(str(wert).replace("Z", "+00:00")) if isinstance(wert, str) else get_datetime(wert)
	if d.tzinfo is None:
		return d
	return d.astimezone(ZoneInfo(get_system_timezone() or "UTC")).replace(tzinfo=None)


def _jetzt(wert=None):
	return _dt(wert) if wert else jetzt()


def _zustand(doc, now):
	if doc.status == "abgelaufen" or not doc.ablauf or now > get_datetime(doc.ablauf):
		return "abgelaufen"
	if doc.bestaetigt_am:
		return "bestaetigt"
	if doc.status == "in_bestaetigung":
		return "in_bestaetigung"
	return "offen"


def _hash(token_hash):
	h = str(token_hash or "")
	if not HASH.match(h):
		ungueltig("Ungültiger Link.")
	return h


def _laden(token_hash, sperren=False):
	name = frappe.db.get_value(DT, {"token_hash": token_hash}, "name", for_update=sperren)
	return frappe.get_doc(DT, name) if name else None


def _versand_erlaubt():
	"""Zweite Sperre zu src/lib/bericht/versand.js: nur Testsystem mit ausdrücklicher Freigabe, nie Produktion."""
	if str(frappe.conf.get("site_env") or "").strip().lower() == "production":
		return False
	return str(frappe.conf.get("bericht_testversand") or "") == "1"


def _person_weg(name):
	if name and frappe.db.exists(PERSON, name) and not frappe.db.get_value(PERSON, name, "vorgang_id"):
		frappe.delete_doc(PERSON, name, ignore_permissions=True, force=True)


@frappe.whitelist(methods=["POST"])
def anfordern(daten=None):
	api_pruefen()
	d = aus_json(daten, {}) or {}
	if not _versand_erlaubt():
		frappe.throw("Berichtsversand startet mit dem Livegang.", frappe.PermissionError)
	h = _hash(d.get("tokenHash"))
	rechner = d.get("rechner")
	land = d.get("land")
	if rechner not in RECHNER or land not in LAENDER:
		ungueltig("Für diesen Rechner gibt es keinen Bericht.")
	k = d.get("kontakt") or {}
	email = str(k.get("email") or "").strip().lower()
	if not email or "@" not in email:
		ungueltig("Bitte geben Sie eine gültige E-Mail-Adresse an.")
	_aufraeumen()
	person = frappe.get_doc({
		"doctype": PERSON,
		"pseudonym": pseudonym(email),
		"land": land,
		"vorname": str(k.get("vorname") or "")[:80],
		"nachname": str(k.get("nachname") or "")[:80],
		"email": email,
		"telefon": str(k.get("telefon") or "")[:40],
	}).insert(ignore_permissions=True)
	doc = frappe.get_doc({
		"doctype": DT,
		"token_hash": h,
		"rechner": rechner,
		"land": land,
		"status": "offen",
		"eingaben_json": als_json(d.get("eingaben") or {}),
		"ergebnis_json": als_json(d.get("ergebnis") or {}),
		"pruef_id": str(d.get("pruefId") or "")[:24],
		"stand_rechenlogik": str(d.get("stand") or "")[:10],
		"ablauf": _dt(d.get("ablauf")),
		"lead_person": person.name,
		"einwilligungen_json": als_json(d.get("einwilligungen") or []),
		"kanal": str(d.get("kanal") or "")[:40],
	}).insert(ignore_permissions=True)
	m = d.get("mail") or {}
	frappe.sendmail(
		recipients=[email],
		subject=str(m.get("betreff") or "Bitte bestätigen Sie Ihren Bericht")[:200],
		message=f"<p>{frappe.utils.escape_html(str(m.get('text') or ''))}</p><p><a href=\"{frappe.utils.escape_html(str(m.get('link') or ''))}\">{frappe.utils.escape_html(str(m.get('linkText') or 'Bestätigen'))}</a></p>",
		now=True,
		add_unsubscribe_link=0,
	)
	return {"id": doc.name}


@frappe.whitelist(methods=["POST"])
def bestaetigen(token_hash=None, phase=None, vorgang_id=None, ablauf=None, jetzt=None):  # noqa: A002 – Vertrag
	api_pruefen()
	h = _hash(token_hash)
	now = _jetzt(jetzt)
	doc = _laden(h, sperren=True)
	if phase == "beginnen":
		if not doc:
			return {"zustand": None}
		z = _zustand(doc, now)
		if z == "in_bestaetigung" and (not doc.beginn_am or (now - get_datetime(doc.beginn_am)).total_seconds() > SPERRE_SEKUNDEN):
			z = "offen"
		if z != "offen":
			return {"zustand": z}
		p = frappe.db.get_value(PERSON, doc.lead_person, ["vorname", "nachname", "email", "telefon"], as_dict=True) if doc.lead_person else None
		if not p:
			return {"zustand": "abgelaufen"}
		doc.db_set({"status": "in_bestaetigung", "beginn_am": now}, update_modified=False)
		return {
			"zustand": "offen",
			"eintrag": {
				"rechner": doc.rechner,
				"land": doc.land,
				"eingaben": aus_json(doc.eingaben_json, {}),
				"ergebnis": aus_json(doc.ergebnis_json, {}),
				"pruefId": doc.pruef_id,
				"stand": doc.stand_rechenlogik,
				"einwilligungen": aus_json(doc.einwilligungen_json, []),
				"kanal": doc.kanal,
				"kontakt": {"vorname": p.vorname, "nachname": p.nachname, "email": p.email, "telefon": p.telefon or ""},
			},
		}
	if phase == "abschliessen":
		if not doc or doc.status != "in_bestaetigung":
			return {"ok": False}
		_person_weg(doc.lead_person)
		neu = frappe.db.get_value(PERSON, {"vorgang_id": vorgang_id}, "name") if vorgang_id else None
		doc.db_set({"status": "bestaetigt", "bestaetigt_am": now, "ablauf": _dt(ablauf), "vorgang": vorgang_id or None, "lead_person": neu, "beginn_am": None}, update_modified=True)
		return {"ok": True}
	if phase == "zuruecksetzen":
		if doc and doc.status == "in_bestaetigung":
			doc.db_set({"status": "offen", "beginn_am": None}, update_modified=False)
		return {"ok": True}
	ungueltig("Unbekannte Phase.")


@frappe.whitelist(methods=["POST"])
def lesen(token_hash=None, jetzt=None):  # noqa: A002 – Vertrag
	api_pruefen()
	h = _hash(token_hash)
	doc = _laden(h)
	if not doc:
		return {"zustand": None}
	z = _zustand(doc, _jetzt(jetzt))
	if z != "bestaetigt":
		return {"zustand": z, "bericht": None if z == "abgelaufen" else {"rechner": doc.rechner, "land": doc.land, "ablauf": iso(doc.ablauf)}}
	return {
		"zustand": z,
		"bericht": {
			"id": doc.name,
			"rechner": doc.rechner,
			"land": doc.land,
			"eingaben": aus_json(doc.eingaben_json, {}),
			"ergebnis": aus_json(doc.ergebnis_json, {}),
			"pruefId": doc.pruef_id,
			"stand": doc.stand_rechenlogik,
			"erstelltAm": iso(doc.creation),
			"bestaetigtAm": iso(doc.bestaetigt_am),
			"ablauf": iso(doc.ablauf),
		},
	}


def _aufraeumen(grenze=500):
	now = jetzt()
	n = 0
	for r in frappe.get_all(DT, filters={"status": ["!=", "abgelaufen"], "ablauf": ["<", now]}, fields=["name", "lead_person", "bestaetigt_am"], limit=grenze):
		if not r.bestaetigt_am:
			_person_weg(r.lead_person)
		frappe.db.set_value(DT, r.name, {"status": "abgelaufen", "eingaben_json": None, "ergebnis_json": None, "einwilligungen_json": None, "pruef_id": None, "lead_person": None, "kanal": None}, update_modified=False)
		n += 1
	alt = frappe.utils.add_days(now, -GRABSTEIN_TAGE)
	for r in frappe.get_all(DT, filters={"status": "abgelaufen", "ablauf": ["<", alt]}, pluck="name", limit=grenze):
		frappe.delete_doc(DT, r, ignore_permissions=True, force=True)
		n += 1
	return n


@frappe.whitelist(methods=["POST"])
def aufraeumen():
	api_pruefen()
	return {"geaendert": _aufraeumen()}


def aufraeumen_taeglich():
	"""Für den Scheduler (hooks.py, TODO Betrieb)."""
	_aufraeumen(grenze=5000)
	frappe.db.commit()
