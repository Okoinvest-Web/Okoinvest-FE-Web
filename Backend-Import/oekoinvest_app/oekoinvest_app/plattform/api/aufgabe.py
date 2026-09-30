# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice-Aufgaben & Wiedervorlagen (nur Rolle admin): Liste, anlegen, ändern (erledigen, verschieben, zuweisen).
# Ausgabe wie aufgabeAusgabe im Demo-Backend (src/lib/plattform/backend/demo.js).

import re

import frappe
from frappe.utils import getdate, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import thread_info
from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import admin_noetig, iso, jetzt, kurz, name_von, nicht_gefunden, nutzer, objekt_laden, protokoll
from oekoinvest_app.plattform.konstanten import AUFGABE_BEZUG_ARTEN, AUFGABE_STATUS

DATUM = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")
FELDER = ["name", "titel", "beschreibung", "faellig_am", "zustaendig_id", "status", "bezug_art", "bezug_id", "erstellt_von", "creation", "erledigt_am", "erledigt_von", "erinnert_am"]


def _tag(wert):
	s = v.text(wert, 10)
	if not DATUM.match(s):
		return ""
	try:
		getdate(s)
	except Exception:
		return ""
	return s


def _tag_de(s):
	return "-".join(reversed(str(s).split("-"))).replace("-", ".") if s else "–"


def aufgabe_json(a, n):
	heute = nowdate()
	faellig = str(a.faellig_am) if a.faellig_am else ""
	info = thread_info(a.bezug_art, a.bezug_id, n) if a.bezug_art and a.bezug_id else None
	return {
		"id": a.name,
		"titel": a.titel,
		"beschreibung": a.beschreibung or "",
		"faelligAm": faellig,
		"zustaendigId": a.zustaendig_id,
		"bezugArt": a.bezug_art or None,
		"bezugId": a.bezug_id or None,
		"status": a.status,
		"erstelltVon": a.erstellt_von or None,
		"erstelltAm": iso(a.creation),
		"erledigtAm": iso(a.erledigt_am),
		"erledigtVon": a.erledigt_von or None,
		"erinnertAm": iso(a.erinnert_am),
		"zustaendig": kurz(a.zustaendig_id),
		"erstelltVonName": name_von(a.erstellt_von),
		"bezugTitel": (info or {}).get("titel", ""),
		"bezugLink": (info or {}).get("link"),
		"ueberfaellig": a.status == "offen" and bool(faellig) and faellig < heute,
		"heuteFaellig": a.status == "offen" and faellig == heute,
	}


def kennzahlen(n):
	"""Für admin.uebersicht (Cockpit)."""
	heute = nowdate()
	offen = frappe.get_all("Plattform Aufgabe", filters={"status": "offen"}, fields=FELDER, order_by="faellig_am asc", limit_page_length=0)
	meine = [a for a in offen if a.zustaendig_id == n.id]
	return {
		"offen": len(offen),
		"ueberfaellig": sum(1 for a in offen if a.faellig_am and str(a.faellig_am) < heute),
		"heute": sum(1 for a in offen if str(a.faellig_am) == heute),
		"meineOffen": len(meine),
		"meineUeberfaellig": sum(1 for a in meine if a.faellig_am and str(a.faellig_am) < heute),
		"meine": [aufgabe_json(a, n) for a in meine[:6]],
	}


def _zustaendig(konto_id):
	k = v.kennung(konto_id)
	v.pflicht(k and k in aktive_admins(), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
	return k


def _melden(n, a):
	if a.zustaendig_id == n.id:
		return
	benachrichtigen(
		a.zustaendig_id,
		"aufgabe",
		f"Neue Aufgabe: {a.titel}",
		f"Von {name_von(n.id)} · fällig am {_tag_de(a.faellig_am)}",
		"/portal/admin/aufgaben?ansicht=meine",
		a.bezug_art or "aufgabe",
		a.bezug_id or a.name,
		mail_text=f"Ihnen wurde im Backoffice eine Aufgabe zugewiesen (fällig am {_tag_de(a.faellig_am)}). Details finden Sie im Portal.",
	)


@frappe.whitelist(methods=["POST"])
def liste(zustaendigId=None, status=None, bezugArt=None, bezugId=None, nurUeberfaellig=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	filters = {}
	if zustaendigId:
		filters["zustaendig_id"] = v.kennung(zustaendigId)
	if status in AUFGABE_STATUS:
		filters["status"] = status
	if bezugArt:
		filters["bezug_art"] = v.auswahl(bezugArt, AUFGABE_BEZUG_ARTEN, "-")
		filters["bezug_id"] = v.kennung(bezugId)
	if v.wahr(nurUeberfaellig):
		filters["status"] = "offen"
		filters["faellig_am"] = ("<", nowdate())
	zeilen = frappe.get_all("Plattform Aufgabe", filters=filters, fields=FELDER, limit_page_length=500)
	offen = sorted([a for a in zeilen if a.status == "offen"], key=lambda a: str(a.faellig_am or "9999"))
	erledigt = sorted([a for a in zeilen if a.status != "offen"], key=lambda a: str(a.erledigt_am or ""), reverse=True)
	return [aufgabe_json(a, n) for a in offen + erledigt]


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	d = daten if isinstance(daten, dict) else {}
	titel = v.text(d.get("titel"), 160)
	v.pflicht(len(titel) >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).")
	faellig = _tag(d.get("faelligAm"))
	v.pflicht(faellig, "Bitte geben Sie ein gültiges Fälligkeitsdatum an.")
	bezug_art = v.auswahl(d.get("bezugArt"), AUFGABE_BEZUG_ARTEN, "") if d.get("bezugArt") else ""
	if d.get("bezugArt"):
		v.pflicht(bezug_art, "Unbekannter Bezug.")
	z = _zustaendig(d.get("zustaendigId") or n.id)
	bezug_id = None
	if bezug_art:
		o = objekt_laden(bezug_art, d.get("bezugId"))
		if not o:
			nicht_gefunden("Bezug nicht gefunden.")
		bezug_id = o.name
	a = frappe.get_doc(
		{
			"doctype": "Plattform Aufgabe",
			"titel": titel,
			"beschreibung": v.mehrzeilig(d.get("beschreibung"), 2000),
			"faellig_am": faellig,
			"zustaendig_id": z,
			"status": "offen",
			"bezug_art": bezug_art or None,
			"bezug_id": bezug_id,
			"erstellt_von": n.id,
		}
	).insert(ignore_permissions=True)
	protokoll(n, "aufgabe", bezug_art or "aufgabe", bezug_id or a.name, f"Aufgabe „{titel}“ angelegt (fällig {_tag_de(faellig)}, zuständig {name_von(z)})")
	_melden(n, a)
	return aufgabe_json(frappe._dict(a.as_dict()), n)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	admin_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Aufgabe", k):
		nicht_gefunden("Aufgabe nicht gefunden.")
	a = frappe.get_doc("Plattform Aufgabe", k)
	d = daten if isinstance(daten, dict) else {}
	aenderungen = []
	if "titel" in d:
		t = v.text(d.get("titel"), 160)
		v.pflicht(len(t) >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).")
		if t != a.titel:
			aenderungen.append("Titel")
		a.titel = t
	if "beschreibung" in d:
		b = v.mehrzeilig(d.get("beschreibung"), 2000)
		if b != (a.beschreibung or ""):
			aenderungen.append("Beschreibung")
		a.beschreibung = b
	if "faelligAm" in d:
		f = _tag(d.get("faelligAm"))
		v.pflicht(f, "Bitte geben Sie ein gültiges Fälligkeitsdatum an.")
		if f != str(a.faellig_am):
			a.faellig_am = f
			aenderungen.append(f"fällig {_tag_de(f)}")
	neu_zustaendig = False
	if "zustaendigId" in d and d.get("zustaendigId") != a.zustaendig_id:
		a.zustaendig_id = _zustaendig(d.get("zustaendigId"))
		neu_zustaendig = True
		aenderungen.append(f"zuständig {name_von(a.zustaendig_id)}")
	if "status" in d:
		st = v.auswahl(d.get("status"), AUFGABE_STATUS, "")
		v.pflicht(st, "Unbekannter Status.")
		if st != a.status:
			a.status = st
			a.erledigt_am = jetzt() if st == "erledigt" else None
			a.erledigt_von = n.id if st == "erledigt" else None
			aenderungen.append("erledigt" if st == "erledigt" else "wieder geöffnet")
	a.save(ignore_permissions=True)  # Controller setzt die Erinnerung bei Verschieben/Neuzuweisung zurück
	if aenderungen:
		protokoll(n, "aufgabe", a.bezug_art or "aufgabe", a.bezug_id or a.name, f"Aufgabe „{a.titel}“: {', '.join(aenderungen)}")
	if neu_zustaendig:
		_melden(n, a)
	return aufgabe_json(frappe._dict(a.as_dict()), n)
