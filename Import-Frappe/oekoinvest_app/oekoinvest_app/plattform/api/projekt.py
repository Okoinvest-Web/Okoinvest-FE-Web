# Copyright (c) 2026, ÖkoInvest GmbH
# Projekte der Anbieter: Liste (eigene / alle), anlegen, ändern (nur Entwurf), Provisionsvereinbarung akzeptieren.

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import projekt_ausgabe
from oekoinvest_app.plattform.kern import (
	admin_noetig,
	als_json,
	ist_admin,
	jetzt_iso,
	konflikt,
	nicht_gefunden,
	nutzer,
	protokoll,
	rolle_noetig,
	verboten,
	verlauf,
)
from oekoinvest_app.plattform.konstanten import (
	BUNDESLAENDER,
	LAENDER,
	NETZANSCHLUSS,
	PHASEN_IDS,
	PREIS_MODUS,
	PROJEKT_TYPEN,
	PROVISION_TEXT,
	PROVISION_VERSION,
)
from oekoinvest_app.plattform.prozesse import PROZESSE

MAX_LISTE = 1000


def projekt_daten(daten, basis=None):
	"""Positivliste der änderbaren Felder (snake_case) – wie projektDaten im Demo-Backend."""
	d = daten if isinstance(daten, dict) else {}
	basis = basis or {}
	land = v.auswahl(d.get("land"), LAENDER, basis.get("land") or "DE")
	preis_modus = v.auswahl(d.get("preisModus"), PREIS_MODUS, "anfrage")
	vt = d.get("vertraulich") if isinstance(d.get("vertraulich"), dict) else {}
	return {
		"titel": v.text(d.get("titel"), 120),
		"typ": v.auswahl(d.get("typ"), PROJEKT_TYPEN, ""),
		"land": land,
		"bundesland": v.auswahl(d.get("bundesland"), BUNDESLAENDER[land], ""),
		"region": v.text(d.get("region"), 80),
		"mwp": v.zahl(d.get("mwp"), min=0.05, max=5000, stellen=2) or 0,
		"mwh_speicher": v.zahl(d.get("mwhSpeicher"), min=0, max=20000, stellen=1) or 0,
		"flaeche_ha": v.zahl(d.get("flaecheHa"), min=0, max=100000, stellen=1) or 0,
		"phase": v.auswahl(d.get("phase"), PHASEN_IDS, ""),
		"netzanschluss": v.auswahl(d.get("netzanschluss"), NETZANSCHLUSS, "offen"),
		"cod_geplant": v.monat(d.get("codGeplant")),
		"preis_modus": preis_modus,
		"preis": (v.zahl(d.get("preis"), min=0, max=1e10) or 0) if preis_modus == "gesamt" else 0,
		"preis_pro_kwp": (v.zahl(d.get("preisProKwp"), min=0, max=10000) or 0) if preis_modus == "proKwp" else 0,
		"beschreibung": v.mehrzeilig(d.get("beschreibung"), 4000),
		"highlights": als_json(v.text_liste(d.get("highlights"), maximal=6, laenge=90)),
		"vertraulich": als_json(
			{
				"gemeinde": v.text(vt.get("gemeinde"), 120),
				"gemarkung": v.text(vt.get("gemarkung"), 120),
				"flurstuecke": v.text(vt.get("flurstuecke"), 300),
				"netzbetreiber": v.text(vt.get("netzbetreiber"), 120),
				"einspeisepunkt": v.text(vt.get("einspeisepunkt"), 160),
				"entfernungNetzKm": v.zahl(vt.get("entfernungNetzKm"), min=0, max=500, stellen=1),
				"sicherung": v.text(vt.get("sicherung"), 200),
				"planungsrecht": v.text(vt.get("planungsrecht"), 200),
				"ertragKwhKwp": v.zahl(vt.get("ertragKwhKwp"), min=0, max=3000),
				"verguetung": v.text(vt.get("verguetung"), 200),
				"details": v.mehrzeilig(vt.get("details"), 3000),
			}
		),
	}


def _laden(n, kennung):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists("Plattform Projekt", k):
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", k)
	if not ist_admin(n) and p.anbieter_id != n.id:
		verboten()
	return p


@frappe.whitelist(methods=["POST"])
def liste(alle=None, status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	alle = v.wahr(alle)
	if alle:
		admin_noetig(n)
	else:
		rolle_noetig(n, ["anbieter"], "Nur für Projektanbieter.")
	filters = {} if alle else {"anbieter_id": n.id}
	st = v.auswahl(status, PROZESSE["projekt"]["status"])
	if st:
		filters["status"] = st
	namen = frappe.get_all("Plattform Projekt", filters=filters, pluck="name", order_by="modified desc", limit_page_length=MAX_LISTE)
	return [projekt_ausgabe(frappe.get_doc("Plattform Projekt", x), n) for x in namen]


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	return projekt_ausgabe(_laden(n, id), n)


@frappe.whitelist(methods=["POST"])
def anlegen(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	rolle_noetig(n, ["anbieter"], "Projekte können Projektanbieter anlegen.")
	werte = projekt_daten(daten)
	v.pflicht(werte["titel"], "Bitte geben Sie einen Projekttitel an.")
	p = frappe.get_doc({"doctype": "Plattform Projekt", "anbieter_id": n.id, "status": "entwurf", "aufrufe": 0, **werte})
	verlauf(p, "entwurf", n, "eigentuemer", "")
	p.insert(ignore_permissions=True)
	protokoll(n, "anlegen", "projekt", p.name, f"Projekt „{p.titel}“ angelegt", ip)
	return projekt_ausgabe(p, n)


@frappe.whitelist(methods=["POST"])
def aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	p = _laden(n, id)
	if not ist_admin(n) and p.status != "entwurf":
		konflikt("Nur Entwürfe können bearbeitet werden. Nehmen Sie das Projekt ggf. zuerst von der Börse bzw. ziehen Sie die Einreichung zurück.")
	werte = projekt_daten(daten, {"land": p.land})
	v.pflicht(werte["titel"], "Bitte geben Sie einen Projekttitel an.")
	p.update(werte)
	p.save(ignore_permissions=True)  # Slug folgt dem Titel, solange nicht veröffentlicht (Controller)
	protokoll(n, "aendern", "projekt", p.name, "Projekt bearbeitet")
	return projekt_ausgabe(p, n)


@frappe.whitelist(methods=["POST"])
def provision_akzeptieren(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Projekt", k):
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", k)
	if p.anbieter_id != n.id:
		verboten("Nur der Anbieter kann die Provisionsvereinbarung akzeptieren.")
	ip_ = v.text(ip, 64)
	p.provision_akzeptiert = als_json({"am": jetzt_iso(), "ip": ip_, "version": PROVISION_VERSION, "text": PROVISION_TEXT})
	p.save(ignore_permissions=True)
	protokoll(n, "provision_akzeptiert", "projekt", p.name, "Provisionsvereinbarung akzeptiert", ip_)
	return projekt_ausgabe(p, n)
