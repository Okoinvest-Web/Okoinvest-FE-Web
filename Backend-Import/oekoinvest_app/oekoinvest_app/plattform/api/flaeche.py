# Copyright (c) 2026, ÖkoInvest GmbH
# Flächen: eigene bzw. alle (Backoffice), anlegen, ändern (Eigentümer nur in entwurf/eingegangen).

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import uebergang_anwenden
from oekoinvest_app.plattform.ausgabe import FELD_NAMEN_FLAECHE, flaeche_ausgabe, flaeche_json, flurstueck_json, flurstueck_zeile, geaenderte_felder
from oekoinvest_app.plattform.flaeche_fach import Fehler, flaeche_fach_daten  # Fachprüfung Flächen
from oekoinvest_app.plattform.kern import (
	als_json,
	aus_json,
	admin_noetig,
	ist_admin,
	konflikt,
	nicht_gefunden,
	nutzer,
	protokoll,
	rolle_noetig,
	verboten,
	verlauf,
)
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, EIGENTUM, FLAECHE_NUTZUNG, LAENDER
from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, darf_team_schreiben_objekt, listen_filter, organisation_fuer_neu
from oekoinvest_app.plattform.prozesse import PROZESSE, pruefe_uebergang

MAX_LISTE = 1000


def flaeche_daten(daten, basis=None):
	"""Positivliste der änderbaren Felder (snake_case) – wie flaecheDaten im Demo-Backend."""
	d = daten if isinstance(daten, dict) else {}
	basis = basis or {}
	land = v.auswahl(d.get("land"), LAENDER, basis.get("land") or "DE")
	# Fachprüfung Flächen: Flurstücke je Land mit Formatprüfung, strukturierte Fachangaben (Positivliste)
	try:
		flurstuecke, fach = flaeche_fach_daten(d, basis, land)
	except Fehler as e:
		v.pflicht(False, str(e))
	ha = v.zahl(d.get("ha"), min=0.01, max=100000, stellen=2)
	return {
		"bezeichnung": v.text(d.get("bezeichnung"), 120),
		"land": land,
		"bundesland": v.auswahl(d.get("bundesland"), BUNDESLAENDER[land], ""),
		"plz": v.plz(d.get("plz")),
		"ort": v.text(d.get("ort"), 80),
		"gemarkung": v.text(d.get("gemarkung"), 80),
		"flurstuecke": flurstuecke,
		"ha": ha or 0,
		"nutzung": v.auswahl(d.get("nutzung"), FLAECHE_NUTZUNG, "acker"),
		"agri": 1 if v.wahr(d.get("agri")) else 0,
		"eigentum": v.auswahl(d.get("eigentum"), EIGENTUM, "eigentum"),
		"fach": fach,
		"hinweise": v.mehrzeilig(d.get("hinweise"), 3000),
	}


def _anwenden(f, werte):
	for feld, wert in werte.items():
		if feld == "flurstuecke":
			f.set("flurstuecke", [flurstueck_zeile(x) for x in wert])
		elif feld == "fach":
			f.set("fach", als_json(wert or {}))
		else:
			f.set(feld, wert)


@frappe.whitelist(methods=["POST"])
def liste(alle=None, status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	alle = v.wahr(alle)
	if alle:
		admin_noetig(n)
	filters = {} if alle else listen_filter(n, "nutzer_id")  # eigene bzw. der aktiven Organisation
	st = v.auswahl(status, PROZESSE["flaeche"]["status"])
	if st:
		filters["status"] = st
	namen = frappe.get_all("Plattform Flaeche", filters=filters, pluck="name", order_by="modified desc", limit_page_length=MAX_LISTE)
	return [flaeche_ausgabe(frappe.get_doc("Plattform Flaeche", x), n) for x in namen]


def _laden(n, kennung, schreiben=False):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists("Plattform Flaeche", k):
		nicht_gefunden("Fläche nicht gefunden.")
	f = frappe.get_doc("Plattform Flaeche", k)
	# Organisation: lesen mit jeder Teamrolle, schreiben ab „Mitglied“
	if not ist_admin(n) and f.nutzer_id != n.id and not (darf_team_schreiben_objekt(n, f) if schreiben else darf_team_lesen_objekt(n, f)):
		verboten()
	return f


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	return flaeche_ausgabe(_laden(n, id), n)


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	rolle_noetig(n, ["flaeche", "landwirt"], "Flächen können Flächeneigentümer und Landwirte anlegen.")
	werte = flaeche_daten(daten)
	v.pflicht(werte["bezeichnung"], "Bitte geben Sie eine Bezeichnung an.")
	f = frappe.get_doc({"doctype": "Plattform Flaeche", "nutzer_id": n.id, "organisation_id": organisation_fuer_neu(n), "status": "entwurf"})
	_anwenden(f, werte)
	verlauf(f, "entwurf", n, "eigentuemer", "")
	f.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "flaeche", f.name, f"Fläche „{f.bezeichnung}“ angelegt", ip)
	if v.wahr((daten or {}).get("einreichen") if isinstance(daten, dict) else None):
		pruefe_uebergang("flaeche", f.status, "eingegangen", "eigentuemer", {}, objekt=f)
		uebergang_anwenden(n, "flaeche", f, "eingegangen", "eigentuemer", {}, ip)
	return flaeche_ausgabe(f, n)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	f = _laden(n, id, schreiben=True)
	admin = ist_admin(n)
	if not admin and f.status not in ("entwurf", "eingegangen"):
		konflikt("Die Fläche ist bereits in Bearbeitung – Änderungen bitte per Nachricht mitteilen.")
	basis = {"land": f.land, "flurstuecke": [flurstueck_json(x) for x in f.get("flurstuecke") or []], "fach": aus_json(f.get("fach")) or {}}
	werte = flaeche_daten(daten, basis)
	v.pflicht(werte["bezeichnung"], "Bitte geben Sie eine Bezeichnung an.")
	alt = {**flaeche_json(f)}
	_anwenden(f, werte)
	f.save(ignore_permissions=True)
	felder = geaenderte_felder(alt, flaeche_json(f), FELD_NAMEN_FLAECHE)
	protokoll(n, "aendern", "flaeche", f.name, f"Fläche bearbeitet: {', '.join(felder)}" if felder else "Fläche gespeichert (ohne Änderung)")
	return flaeche_ausgabe(f, n)
