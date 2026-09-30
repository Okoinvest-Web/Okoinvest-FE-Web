# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Börse-Trichter“: veröffentlichte Projekte → Interessenten → NDA → Datenraum → LOI → Abschluss.
# Gezählt wird, welche Stufe ein Interesse laut Statusverlauf (oder aktuellem Status) je erreicht hat.

import frappe
from frappe.utils import getdate

STUFEN = [
	("gemerkt", "Interessenten (gemerkt oder weiter)"),
	("nda_angefragt", "NDA akzeptiert"),
	("nda_freigegeben", "Datenraum freigegeben"),
	("loi_abgegeben", "LOI abgegeben"),
	("loi_angenommen", "LOI angenommen / Zuschlag"),
	("abgeschlossen", "Kauf abgeschlossen"),
]
RANG = {s: i for i, (s, _l) in enumerate(STUFEN)}


def execute(filters=None):
	filters = frappe._dict(filters or {})
	pf = {}
	if filters.get("typ"):
		pf["typ"] = filters.typ
	if filters.get("land"):
		pf["land"] = filters.land
	projekte = frappe.get_all("Plattform Projekt", filters=pf, fields=["name", "status", "veroeffentlicht_am"], limit_page_length=0)
	von, bis = filters.get("von"), filters.get("bis")
	if von or bis:
		projekte = [
			p for p in projekte if p.veroeffentlicht_am and (not von or getdate(p.veroeffentlicht_am) >= getdate(von)) and (not bis or getdate(p.veroeffentlicht_am) <= getdate(bis))
		]
	ids = {p.name for p in projekte if p.veroeffentlicht_am or p.status in ("veroeffentlicht", "reserviert", "verkauft")}
	interessen = frappe.get_all("Plattform Interesse", filters={"projekt_id": ("in", list(ids) or ["-"])}, fields=["name", "status"], limit_page_length=0)
	verlauf = {}
	if interessen:
		for z in frappe.get_all(
			"Plattform Statusverlauf",
			filters={"parenttype": "Plattform Interesse", "parent": ("in", [i.name for i in interessen])},
			fields=["parent", "status"],
			limit_page_length=0,
		):
			verlauf.setdefault(z.parent, set()).add(z.status)
	erreicht = [0] * len(STUFEN)
	for i in interessen:
		stati = verlauf.get(i.name, set()) | {i.status}
		hoechste = max((RANG[s] for s in stati if s in RANG), default=0)
		for r in range(hoechste + 1):
			erreicht[r] += 1

	columns = [
		{"fieldname": "stufe", "label": "Stufe", "fieldtype": "Data", "width": 260},
		{"fieldname": "anzahl", "label": "Anzahl", "fieldtype": "Int", "width": 100},
		{"fieldname": "quote_vorstufe", "label": "Quote zur Vorstufe", "fieldtype": "Percent", "width": 150},
		{"fieldname": "quote_start", "label": "Quote gesamt", "fieldtype": "Percent", "width": 130},
	]
	daten = [{"stufe": "Veröffentlichte Projekte", "anzahl": len(ids), "quote_vorstufe": None, "quote_start": None}]
	for idx, (_s, label) in enumerate(STUFEN):
		vor = erreicht[idx - 1] if idx else None
		daten.append(
			{
				"stufe": label,
				"anzahl": erreicht[idx],
				"quote_vorstufe": (erreicht[idx] / vor * 100) if vor else None,
				"quote_start": (erreicht[idx] / erreicht[0] * 100) if erreicht[0] and idx else None,
			}
		)
	chart = {
		"data": {"labels": [d["stufe"] for d in daten], "datasets": [{"name": "Anzahl", "values": [d["anzahl"] for d in daten]}]},
		"type": "bar",
		"colors": ["#003473"],
		"barOptions": {"spaceRatio": 0.3},
	}
	verkauft = sum(1 for p in projekte if p.name in ids and p.status == "verkauft")
	summary = [
		{"label": "Projekte veröffentlicht", "value": len(ids), "indicator": "Blue", "datatype": "Int"},
		{"label": "Interessen", "value": erreicht[0], "indicator": "Blue", "datatype": "Int"},
		{"label": "Verkaufte Projekte", "value": verkauft, "indicator": "Green", "datatype": "Int"},
	]
	return columns, daten, None, chart, summary
