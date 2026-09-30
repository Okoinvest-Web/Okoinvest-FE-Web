# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Offene Störungen“: offene und in Arbeit befindliche Störungsfälle, nach Schwere und Alter.

import frappe
from frappe.utils import get_datetime, now_datetime

from oekoinvest_app.plattform.druck import oekoinvest_label

SCHWERE_RANG = {"info": 0, "niedrig": 1, "mittel": 2, "hoch": 3, "kritisch": 4}


def execute(filters=None):
	filters = frappe._dict(filters or {})
	f = {"status": ("in", ["offen", "in_arbeit"])}
	if filters.get("anlage_id"):
		f["anlage_id"] = filters.anlage_id
	if filters.get("nur_unquittiert"):
		f["quittiert_am"] = ("is", "not set")
	mindest = SCHWERE_RANG.get(filters.get("schwere_ab") or "info", 0)
	zeilen = frappe.get_all(
		"Plattform Stoerungsfall",
		filters=f,
		fields=["name", "anlage_id", "titel", "regel", "schwere", "status", "erkannt_am", "zuletzt_am", "anzahl", "quittiert_am", "zustaendig_id"],
		limit_page_length=0,
	)
	jetzt = now_datetime()
	daten = []
	titel = {}
	for z in zeilen:
		if SCHWERE_RANG.get(z.schwere, 0) < mindest:
			continue
		titel.setdefault(z.anlage_id, frappe.db.get_value("Plattform Anlage", z.anlage_id, "titel"))
		daten.append(
			{
				**z,
				"anlage_titel": titel[z.anlage_id],
				"regel_label": oekoinvest_label("regel", z.regel),
				"schwere_label": oekoinvest_label("schwere", z.schwere),
				"status_label": oekoinvest_label("stoerung_status", z.status),
				"alter_h": (jetzt - get_datetime(z.erkannt_am)).total_seconds() / 3600 if z.erkannt_am else None,
				"rang": SCHWERE_RANG.get(z.schwere, 0),
			}
		)
	daten.sort(key=lambda d: (-d["rang"], -(d["alter_h"] or 0)))
	columns = [
		{"fieldname": "name", "label": "Störung", "fieldtype": "Link", "options": "Plattform Stoerungsfall", "width": 120},
		{"fieldname": "anlage_id", "label": "Anlage", "fieldtype": "Link", "options": "Plattform Anlage", "width": 110},
		{"fieldname": "anlage_titel", "label": "Anlagentitel", "fieldtype": "Data", "width": 180},
		{"fieldname": "titel", "label": "Titel", "fieldtype": "Data", "width": 220},
		{"fieldname": "regel_label", "label": "Regel", "fieldtype": "Data", "width": 170},
		{"fieldname": "schwere_label", "label": "Schwere", "fieldtype": "Data", "width": 90},
		{"fieldname": "status_label", "label": "Status", "fieldtype": "Data", "width": 90},
		{"fieldname": "erkannt_am", "label": "Erkannt", "fieldtype": "Datetime", "width": 150},
		{"fieldname": "alter_h", "label": "Alter (h)", "fieldtype": "Float", "precision": 1, "width": 90},
		{"fieldname": "anzahl", "label": "Meldungen", "fieldtype": "Int", "width": 90},
		{"fieldname": "quittiert_am", "label": "Quittiert", "fieldtype": "Datetime", "width": 150},
		{"fieldname": "zustaendig_id", "label": "Zuständig", "fieldtype": "Link", "options": "Plattform Konto", "width": 120},
	]
	summary = [
		{"label": "Offen gesamt", "value": len(daten), "indicator": "Red" if daten else "Green", "datatype": "Int"},
		{"label": "Kritisch/Hoch", "value": sum(1 for d in daten if d["rang"] >= 3), "indicator": "Red", "datatype": "Int"},
		{"label": "Nicht quittiert", "value": sum(1 for d in daten if not d["quittiert_am"]), "indicator": "Orange", "datatype": "Int"},
	]
	return columns, daten, None, None, summary
