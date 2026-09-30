# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Pipeline Flächen“: Flächen je Status (Anzahl, Hektar, Agri-PV) oder als Liste.

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.prozesse import PROZESSE, status_label

REIHENFOLGE = ["entwurf", *PROZESSE["flaeche"]["pipeline"], "abgelehnt"]


def _filter(filters):
	f = {}
	if filters.get("land"):
		f["land"] = filters.land
	if filters.get("zustaendig_id"):
		f["zustaendig_id"] = filters.zustaendig_id
	if filters.get("nur_agri"):
		f["agri"] = 1
	if not filters.get("mit_abgelehnt"):
		f["status"] = ("!=", "abgelehnt")
	return f


def execute(filters=None):
	filters = frappe._dict(filters or {})
	zeilen = frappe.get_all(
		"Plattform Flaeche",
		filters=_filter(filters),
		fields=["name", "bezeichnung", "status", "land", "bundesland", "ort", "ha", "agri", "nutzung", "zustaendig_id", "modified"],
		order_by="modified desc",
		limit_page_length=0,
	)
	if filters.get("ansicht") == "Liste":
		return _liste(zeilen)
	return _zusammenfassung(zeilen)


def _zusammenfassung(zeilen):
	columns = [
		{"fieldname": "status", "label": "Status", "fieldtype": "Data", "width": 200},
		{"fieldname": "anzahl", "label": "Flächen", "fieldtype": "Int", "width": 100},
		{"fieldname": "ha", "label": "Hektar", "fieldtype": "Float", "precision": 1, "width": 110},
		{"fieldname": "agri", "label": "davon Agri-PV", "fieldtype": "Int", "width": 120},
		{"fieldname": "anteil", "label": "Anteil Hektar", "fieldtype": "Percent", "width": 120},
	]
	gesamt_ha = sum(flt(z.ha) for z in zeilen) or 1
	daten = []
	for st in REIHENFOLGE:
		teil = [z for z in zeilen if z.status == st]
		if not teil:
			continue
		ha = sum(flt(z.ha) for z in teil)
		daten.append({"status": status_label("flaeche", st), "anzahl": len(teil), "ha": ha, "agri": sum(1 for z in teil if z.agri), "anteil": ha / gesamt_ha * 100})
	chart = {
		"data": {"labels": [d["status"] for d in daten], "datasets": [{"name": "Hektar", "values": [round(d["ha"], 1) for d in daten]}]},
		"type": "bar",
		"colors": ["#669933"],
	}
	offen = [z for z in zeilen if z.status not in ("abgelehnt", "betrieb")]
	summary = [
		{"label": "Flächen in der Pipeline", "value": len(offen), "indicator": "Blue", "datatype": "Int"},
		{"label": "Hektar in der Pipeline", "value": round(sum(flt(z.ha) for z in offen), 1), "indicator": "Green", "datatype": "Float"},
		{"label": "Verträge (ab Status Vertrag)", "value": sum(1 for z in zeilen if z.status in ("vertrag", "planung", "bau", "betrieb")), "indicator": "Green", "datatype": "Int"},
	]
	return columns, daten, None, chart, summary


def _liste(zeilen):
	columns = [
		{"fieldname": "name", "label": "Fläche", "fieldtype": "Link", "options": "Plattform Flaeche", "width": 130},
		{"fieldname": "bezeichnung", "label": "Bezeichnung", "fieldtype": "Data", "width": 200},
		{"fieldname": "status_label", "label": "Status", "fieldtype": "Data", "width": 150},
		{"fieldname": "land", "label": "Land", "fieldtype": "Data", "width": 60},
		{"fieldname": "bundesland", "label": "Bundesland", "fieldtype": "Data", "width": 140},
		{"fieldname": "ort", "label": "Ort", "fieldtype": "Data", "width": 140},
		{"fieldname": "ha", "label": "Hektar", "fieldtype": "Float", "precision": 1, "width": 90},
		{"fieldname": "agri", "label": "Agri-PV", "fieldtype": "Check", "width": 80},
		{"fieldname": "zustaendig_id", "label": "Zuständig", "fieldtype": "Link", "options": "Plattform Konto", "width": 130},
		{"fieldname": "modified", "label": "Geändert", "fieldtype": "Datetime", "width": 150},
	]
	for z in zeilen:
		z["status_label"] = status_label("flaeche", z.status)
	return columns, zeilen
