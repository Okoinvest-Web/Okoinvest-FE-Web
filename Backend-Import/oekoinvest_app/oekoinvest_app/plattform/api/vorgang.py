# Copyright (c) 2026, ÖkoInvest GmbH
# Vorgänge (Anfragen): eigene bzw. alle (Backoffice).

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import vorgang_ausgabe
from oekoinvest_app.plattform.kern import admin_noetig, aus_json, ist_admin, iso, kurz, nicht_gefunden, nutzer, verboten
from oekoinvest_app.plattform.konstanten import VORGANG_TYPEN
from oekoinvest_app.plattform.prozesse import PROZESSE

MAX_LISTE = 2000


@frappe.whitelist(methods=["POST"])
def liste(alle=None, status=None, typ=None, q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	alle = v.wahr(alle)
	if alle:
		admin_noetig(n)
	filters = {} if alle else {"nutzer_id": n.id}
	st = v.auswahl(status, PROZESSE["vorgang"]["status"])
	if st:
		filters["status"] = st
	tp = v.auswahl(typ, VORGANG_TYPEN)
	if tp:
		filters["typ"] = tp
	zeilen = frappe.get_all(
		"Plattform Vorgang",
		filters=filters,
		fields=["name", "typ", "status", "creation", "modified", "email", "kontakt", "nutzer_id", "zustaendig_id", "flaeche_id"],
		order_by="modified desc",
		limit_page_length=MAX_LISTE,
	)
	suche = v.text(q, 120).lower()
	letzte = _letzte_kommentare([z.name for z in zeilen])
	ergebnis = []
	for z in zeilen:
		k = aus_json(z.kontakt, {}) or {}
		if suche and suche not in " ".join(str(x or "") for x in (z.name, z.email, k.get("vorname"), k.get("nachname"), k.get("firma"))).lower():
			continue
		eintrag = {
			"id": z.name,
			"typ": z.typ,
			"status": z.status,
			"erstelltAm": iso(z.creation),
			"geaendertAm": iso(z.modified),
			"kontakt": {"vorname": k.get("vorname", ""), "nachname": k.get("nachname", ""), "firma": k.get("firma", ""), "email": z.email},
			"zustaendig": kurz(z.zustaendig_id),
			"flaecheId": z.flaeche_id or None,
			"letzterKommentar": letzte.get(z.name, ""),
		}
		if alle:
			eintrag["nutzerId"] = z.nutzer_id or None
		ergebnis.append(eintrag)
	return ergebnis


def _letzte_kommentare(namen):
	"""Kommentar des jeweils letzten Statusverlauf-Eintrags je Vorgang (eine Abfrage)."""
	if not namen:
		return {}
	ergebnis = {}
	for e in frappe.get_all(
		"Plattform Statusverlauf",
		filters={"parenttype": "Plattform Vorgang", "parentfield": "status_verlauf", "parent": ("in", namen)},
		fields=["parent", "idx", "kommentar"],
		order_by="parent asc, idx asc",
		limit_page_length=0,
	):
		ergebnis[e.parent] = e.kommentar or ""
	return ergebnis


@frappe.whitelist(methods=["POST"])
def holen(id=None, als_benutzer=None):  # noqa: A002 – Parametername laut Vertrag
	n = nutzer(als_benutzer)
	kennung = v.kennung(id)
	if not kennung or not frappe.db.exists("Plattform Vorgang", kennung):
		nicht_gefunden("Anfrage nicht gefunden.")
	vg = frappe.get_doc("Plattform Vorgang", kennung)
	if not ist_admin(n) and vg.nutzer_id != n.id:
		verboten()
	return vorgang_ausgabe(vg, n)
