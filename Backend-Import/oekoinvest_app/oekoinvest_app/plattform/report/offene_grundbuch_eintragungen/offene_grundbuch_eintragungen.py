# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Offene Grundbuch-Eintragungen“ – alle nicht abgeschlossenen Grundbuch-Akten mit nächstem Schritt, Frist und
# Überfälligkeit (Regeln: plattform/closing_kern.py, wie der Bericht im Backoffice-Portal /portal/admin/grundbuch).

import frappe

from oekoinvest_app.plattform import closing_kern as K


def execute(filters=None):
	from oekoinvest_app.plattform.api.closing import _akte_dict

	filters = frappe._dict(filters or {})
	f = {"abgebrochen": 0, "status": ["in", list(K.GB_OFFEN)]}
	if filters.get("land"):
		f["land"] = filters.land
	daten = []
	for name in frappe.get_all("Plattform Grundbuch Vorgang", filters=f, pluck="name", limit_page_length=0):
		doc = frappe.get_doc("Plattform Grundbuch Vorgang", name)
		a = _akte_dict(doc)
		fr = K.fristen_berechnen(a)
		n = K.naechster_schritt(a)
		offen = [s for s in fr if s.get("status") not in K.FERTIG and s.get("fristBerechnet")]
		frist = min((s["fristBerechnet"] for s in offen), default=None)
		ueber = len([s for s in fr if s.get("ueberfaellig")])
		if filters.get("nur_ueberfaellig") and not ueber:
			continue
		daten.append({
			"akte": doc.name, "titel": doc.titel, "land": doc.land, "status": K.GB_STATUS.get(K.akte_status(a), {}).get("label"), "eigentuemer": doc.eigentuemer_name,
			"naechster": (n or {}).get("label", ""), "frist": frist, "ueberfaellig": ueber, "fortschritt": "{erledigt}/{gesamt}".format(**K.fortschritt(a)),
			"bezug": doc.flaeche_id or doc.anlage_id or "",
		})
	daten.sort(key=lambda r: r["frist"] or "9999")
	spalten = [
		{"fieldname": "akte", "label": "Akte", "fieldtype": "Link", "options": "Plattform Grundbuch Vorgang", "width": 130},
		{"fieldname": "titel", "label": "Titel", "fieldtype": "Data", "width": 240},
		{"fieldname": "land", "label": "Land", "fieldtype": "Data", "width": 60},
		{"fieldname": "status", "label": "Status", "fieldtype": "Data", "width": 170},
		{"fieldname": "naechster", "label": "Nächster Schritt", "fieldtype": "Data", "width": 240},
		{"fieldname": "frist", "label": "Frist", "fieldtype": "Date", "width": 100},
		{"fieldname": "ueberfaellig", "label": "Überfällige Schritte", "fieldtype": "Int", "width": 90},
		{"fieldname": "fortschritt", "label": "Fortschritt", "fieldtype": "Data", "width": 90},
		{"fieldname": "eigentuemer", "label": "Eigentümer/in", "fieldtype": "Data", "width": 180},
		{"fieldname": "bezug", "label": "Fläche/Anlage", "fieldtype": "Data", "width": 120},
	]
	return spalten, daten
