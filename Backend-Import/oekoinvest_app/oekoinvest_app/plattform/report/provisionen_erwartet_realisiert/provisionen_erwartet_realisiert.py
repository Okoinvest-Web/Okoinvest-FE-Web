# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Provisionen erwartet/realisiert“:
#  - realisiert: Plattform Provision (offen / in Rechnung / bezahlt, ohne storniert)
#  - erwartet:   Projekte in der Börse (veröffentlicht/reserviert) mit Preisvorstellung × Provisionssatz,
#                gewichtet mit einer Abschlusswahrscheinlichkeit je Stand (Schätzung, konfigurierbar per site_config
#                „oekoinvest_provision_gewichte“ = {"veroeffentlicht": 0.15, "reserviert": 0.6}).

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.konstanten import PROVISION_MIN
from oekoinvest_app.plattform.prozesse import status_label

GEWICHTE = {"veroeffentlicht": 0.15, "reserviert": 0.6}


def _preis(p):
	if p.preis_modus == "gesamt" and flt(p.preis):
		return flt(p.preis)
	if p.preis_modus == "proKwp" and flt(p.preis_pro_kwp) and flt(p.mwp):
		return flt(p.preis_pro_kwp) * flt(p.mwp) * 1000
	return 0.0


def execute(filters=None):
	filters = frappe._dict(filters or {})
	gewichte = {**GEWICHTE, **(frappe.conf.get("oekoinvest_provision_gewichte") or {})}
	columns = [
		{"fieldname": "art", "label": "Art", "fieldtype": "Data", "width": 110},
		{"fieldname": "projekt_id", "label": "Projekt", "fieldtype": "Link", "options": "Plattform Projekt", "width": 130},
		{"fieldname": "titel", "label": "Titel", "fieldtype": "Data", "width": 220},
		{"fieldname": "stand", "label": "Stand", "fieldtype": "Data", "width": 130},
		{"fieldname": "basis", "label": "Kaufpreis / Preisvorstellung", "fieldtype": "Currency", "options": "EUR", "width": 170},
		{"fieldname": "satz", "label": "Satz", "fieldtype": "Percent", "width": 80},
		{"fieldname": "betrag", "label": "Provision", "fieldtype": "Currency", "options": "EUR", "width": 130},
		{"fieldname": "gewichtet", "label": "gewichtet", "fieldtype": "Currency", "options": "EUR", "width": 130},
		{"fieldname": "provision_id", "label": "Provision", "fieldtype": "Link", "options": "Plattform Provision", "width": 130},
	]
	daten = []
	summen = {"erwartet": 0.0, "gewichtet": 0.0, "offen": 0.0, "in_rechnung": 0.0, "bezahlt": 0.0}
	titel = {}
	if filters.get("art") in (None, "", "Alle", "Realisiert"):
		for pv in frappe.get_all(
			"Plattform Provision", filters={"status": ("!=", "storniert")}, fields=["name", "projekt_id", "status", "kaufpreis", "satz", "betrag"], order_by="creation desc", limit_page_length=0
		):
			titel.setdefault(pv.projekt_id, frappe.db.get_value("Plattform Projekt", pv.projekt_id, "titel"))
			summen[pv.status] = summen.get(pv.status, 0) + flt(pv.betrag)
			daten.append(
				{"art": "realisiert", "projekt_id": pv.projekt_id, "titel": titel[pv.projekt_id], "stand": status_label("provision", pv.status), "basis": pv.kaufpreis, "satz": flt(pv.satz) * 100, "betrag": pv.betrag, "gewichtet": pv.betrag, "provision_id": pv.name}
			)
	if filters.get("art") in (None, "", "Alle", "Erwartet"):
		for p in frappe.get_all(
			"Plattform Projekt",
			filters={"status": ("in", list(GEWICHTE))},
			fields=["name", "titel", "status", "preis_modus", "preis", "preis_pro_kwp", "mwp", "provision_satz"],
			limit_page_length=0,
		):
			basis = _preis(p)
			satz = flt(p.provision_satz) or PROVISION_MIN
			betrag = basis * satz
			g = betrag * flt(gewichte.get(p.status, 0))
			summen["erwartet"] += betrag
			summen["gewichtet"] += g
			daten.append({"art": "erwartet", "projekt_id": p.name, "titel": p.titel, "stand": status_label("projekt", p.status), "basis": basis or None, "satz": satz * 100, "betrag": betrag or None, "gewichtet": g or None, "provision_id": None})
	summary = [
		{"label": "Bezahlt", "value": summen["bezahlt"], "indicator": "Green", "datatype": "Currency", "currency": "EUR"},
		{"label": "In Rechnung", "value": summen["in_rechnung"], "indicator": "Blue", "datatype": "Currency", "currency": "EUR"},
		{"label": "Offen (fällig nach Verkauf)", "value": summen["offen"], "indicator": "Orange", "datatype": "Currency", "currency": "EUR"},
		{"label": "Erwartet (gewichtet)", "value": summen["gewichtet"], "indicator": "Grey", "datatype": "Currency", "currency": "EUR"},
	]
	chart = {
		"data": {"labels": ["Bezahlt", "In Rechnung", "Offen", "Erwartet (gewichtet)"], "datasets": [{"name": "EUR", "values": [summen["bezahlt"], summen["in_rechnung"], summen["offen"], summen["gewichtet"]]}]},
		"type": "bar",
		"colors": ["#669933"],
	}
	return columns, daten, "Erwartete Werte sind Schätzungen aus Preisvorstellung × Satz × Gewicht je Stand.", chart, summary
