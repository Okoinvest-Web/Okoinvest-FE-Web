# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Anlagen-Verfügbarkeit“ (Schätzung aus Störungsfällen):
#   Ausfallzeit = Überlappung [erkannt_am, behoben_am bzw. jetzt] mit dem Zeitraum, nur Störungen, die die Erzeugung
#   betreffen (Regel offline/fehlercode oder Schwere hoch/kritisch). Überlappende Störungen einer Anlage werden
#   zusammengefasst. Maßgeblich bleiben die Messdaten des Ingest-Dienstes (docs/ANLAGEN-IOT.md).

import frappe
from frappe.utils import add_days, get_datetime, getdate, now_datetime, nowdate

AUSFALL_REGELN = ("offline", "fehlercode")
AUSFALL_SCHWERE = ("hoch", "kritisch")


def _zeitraum(filters):
	von = getdate(filters.get("von") or add_days(nowdate(), -30))
	bis = getdate(filters.get("bis") or nowdate())
	start = get_datetime(f"{von} 00:00:00")
	ende = min(get_datetime(f"{bis} 23:59:59"), now_datetime())
	return start, ende


def _zusammenfassen(intervalle):
	intervalle = sorted(intervalle)
	ergebnis = []
	for a, b in intervalle:
		if ergebnis and a <= ergebnis[-1][1]:
			ergebnis[-1][1] = max(ergebnis[-1][1], b)
		else:
			ergebnis.append([a, b])
	return ergebnis


def execute(filters=None):
	filters = frappe._dict(filters or {})
	start, ende = _zeitraum(filters)
	stunden_gesamt = max((ende - start).total_seconds() / 3600, 1)
	af = {"status": "betrieb"} if not filters.get("alle_status") else {}
	if filters.get("anlage_id"):
		af["name"] = filters.anlage_id
	anlagen = frappe.get_all("Plattform Anlage", filters=af, fields=["name", "titel", "typ", "kwp", "ort", "inbetriebnahme"], order_by="titel asc", limit_page_length=0)
	stoerungen = frappe.get_all(
		"Plattform Stoerungsfall",
		filters={"anlage_id": ("in", [a.name for a in anlagen] or ["-"]), "erkannt_am": ("<=", ende)},
		fields=["anlage_id", "regel", "schwere", "status", "erkannt_am", "behoben_am"],
		limit_page_length=0,
	)
	je_anlage = {}
	for s in stoerungen:
		b = get_datetime(s.behoben_am) if s.behoben_am else ende
		if b < start:
			continue
		eintrag = je_anlage.setdefault(s.anlage_id, {"anzahl": 0, "offen": 0, "intervalle": []})
		eintrag["anzahl"] += 1
		if s.status in ("offen", "in_arbeit"):
			eintrag["offen"] += 1
		if s.regel in AUSFALL_REGELN or s.schwere in AUSFALL_SCHWERE:
			eintrag["intervalle"].append((max(get_datetime(s.erkannt_am), start), min(b, ende)))
	columns = [
		{"fieldname": "anlage", "label": "Anlage", "fieldtype": "Link", "options": "Plattform Anlage", "width": 120},
		{"fieldname": "titel", "label": "Titel", "fieldtype": "Data", "width": 220},
		{"fieldname": "kwp", "label": "kWp", "fieldtype": "Float", "precision": 1, "width": 90},
		{"fieldname": "stoerungen", "label": "Störungen", "fieldtype": "Int", "width": 100},
		{"fieldname": "offen", "label": "davon offen", "fieldtype": "Int", "width": 100},
		{"fieldname": "ausfall_h", "label": "Ausfall (h)", "fieldtype": "Float", "precision": 1, "width": 110},
		{"fieldname": "verfuegbarkeit", "label": "Verfügbarkeit (Schätzung)", "fieldtype": "Percent", "width": 170},
	]
	daten = []
	for a in anlagen:
		e = je_anlage.get(a.name, {"anzahl": 0, "offen": 0, "intervalle": []})
		ausfall = sum((b - x).total_seconds() for x, b in _zusammenfassen(e["intervalle"]) if b > x) / 3600
		daten.append({"anlage": a.name, "titel": a.titel, "kwp": a.kwp, "stoerungen": e["anzahl"], "offen": e["offen"], "ausfall_h": ausfall, "verfuegbarkeit": max(0.0, 100 - ausfall / stunden_gesamt * 100)})
	gesamt_kwp = sum((d["kwp"] or 0) for d in daten) or 1
	mittel = sum(d["verfuegbarkeit"] * (d["kwp"] or 0) for d in daten) / gesamt_kwp if daten else 100
	summary = [
		{"label": "Anlagen", "value": len(daten), "indicator": "Blue", "datatype": "Int"},
		{"label": "Verfügbarkeit (leistungsgewichtet)", "value": round(mittel, 2), "indicator": "Green" if mittel >= 98 else "Orange", "datatype": "Percent"},
		{"label": "Offene Störungen", "value": sum(d["offen"] for d in daten), "indicator": "Red" if any(d["offen"] for d in daten) else "Green", "datatype": "Int"},
	]
	return columns, daten, "Schätzung aus Störungsfällen – maßgeblich sind die Messdaten des Monitorings.", None, summary
