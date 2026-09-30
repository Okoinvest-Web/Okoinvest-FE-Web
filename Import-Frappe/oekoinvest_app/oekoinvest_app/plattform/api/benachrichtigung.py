# Copyright (c) 2026, ÖkoInvest GmbH
# Benachrichtigungszentrale (Glocke): eigene Benachrichtigungen, als gelesen markieren, E-Mail-Einstellungen.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.aufgaben import wiedervorlagen_fuer
from oekoinvest_app.plattform.benachrichtigung import einstellungen as mail_einstellungen
from oekoinvest_app.plattform.kern import als_json, ist_admin, iso, nutzer, protokoll
from oekoinvest_app.plattform.konstanten import BENACHRICHTIGUNG_ART_IDS

FELDER = ["name", "nutzer_id", "art", "titel", "text", "link", "objekt_art", "objekt_id", "am", "gelesen", "mail"]


def _json(b):
	return {
		"id": b.name,
		"nutzerId": b.nutzer_id,
		"art": b.art,
		"titel": b.titel or "",
		"text": b.text or "",
		"link": b.link or "/portal",
		"objektArt": b.objekt_art or None,
		"objektId": b.objekt_id or None,
		"am": iso(b.am),
		"gelesen": bool(cint(b.gelesen)),
		"mail": bool(cint(b.mail)),
	}


def _ungelesen(konto_id):
	return frappe.db.count("Plattform Benachrichtigung", {"nutzer_id": konto_id, "gelesen": 0})


@frappe.whitelist(methods=["POST"])
def liste(nurUngelesen=None, limit=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if ist_admin(n):
		wiedervorlagen_fuer(n.id)  # fällige Wiedervorlagen sofort melden (zusätzlich täglicher Scheduler)
	anzahl = v.zahl(limit, min=1, max=200)
	filters = {"nutzer_id": n.id}
	if v.wahr(nurUngelesen):
		filters["gelesen"] = 0
	zeilen = frappe.get_all("Plattform Benachrichtigung", filters=filters, fields=FELDER, order_by="am desc, creation desc", limit_page_length=int(anzahl) if anzahl else 50)
	konto = frappe.db.get_value("Plattform Konto", n.id, ["name", "mail_einstellungen"], as_dict=True)
	return {
		"eintraege": [_json(b) for b in zeilen],
		"ungelesen": _ungelesen(n.id),
		"gesamt": frappe.db.count("Plattform Benachrichtigung", {"nutzer_id": n.id}),
		"einstellungen": mail_einstellungen(konto),
	}


@frappe.whitelist(methods=["POST"])
def gelesen(ids=None, alle=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	auswahl = [x for x in (v.kennung(i) for i in (ids if isinstance(ids, list) else [])[:200]) if x]
	v.pflicht(alle is True or auswahl, "Keine Benachrichtigung ausgewählt.")
	filters = {"nutzer_id": n.id, "gelesen": 0}  # nur eigene – fremde Kennungen bleiben unberührt
	if alle is not True:
		filters["name"] = ("in", auswahl)
	namen = frappe.get_all("Plattform Benachrichtigung", filters=filters, pluck="name", limit_page_length=0)
	for name in namen:
		frappe.db.set_value("Plattform Benachrichtigung", name, "gelesen", 1, update_modified=False)
	return {"geaendert": len(namen), "ungelesen": _ungelesen(n.id)}


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(einstellungen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	konto = frappe.get_doc("Plattform Konto", n.id)
	neu = mail_einstellungen(konto)
	eingabe = einstellungen if isinstance(einstellungen, dict) else {}
	for k in BENACHRICHTIGUNG_ART_IDS:
		if isinstance(eingabe.get(k), bool):
			neu[k] = eingabe[k]
	konto.mail_einstellungen = als_json(neu)
	konto.save(ignore_permissions=True)
	protokoll(n, "einstellungen", "nutzer", konto.name, "E-Mail-Benachrichtigungen: " + (", ".join(k for k, w in neu.items() if w) or "keine"))
	return neu
