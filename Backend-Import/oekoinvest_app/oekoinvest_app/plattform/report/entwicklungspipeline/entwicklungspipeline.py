# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Entwicklungspipeline“ für die Geschäftsführung: MWp, gewichtete MWp und Pipeline-Wert (Phase × Wahrscheinlichkeit
# × MWp × €/kWp aus PHASEN) je Phase, Land oder COD-Jahr – mit Ziellinie 50 MWp/Jahr – oder als Projektliste mit Verzug.
# Kennzahlen wie im Portal (plattform/api/entwicklung.kennzahlen, Regeln in entwicklung_kern.py).

import frappe
from frappe.utils import cint, flt

from oekoinvest_app.plattform import entwicklung_kern as K
from oekoinvest_app.plattform.api.entwicklung import DT, _ms_liste, kennzahlen
from oekoinvest_app.plattform.konstanten import LAENDER


def _zeilen(filters):
	f = {}
	for feld in ("land", "typ", "projektleiter_id"):
		if filters.get(feld):
			f[feld] = filters.get(feld)
	if not filters.get("mit_abgeschlossen"):
		f["status"] = ["in", list(K.ENTWICKLUNG_OFFEN)]
	erg = []
	for name in frappe.get_all(DT, filters=f, pluck="name", order_by="titel asc", limit_page_length=0):
		p = frappe.get_doc(DT, name)
		erg.append((p, kennzahlen(p, _ms_liste(name))))
	return erg


def _cod_jahr(p, k):
	return str(k["prognoseCod"] or p.ziel_cod or "")[:4]


def execute(filters=None):
	filters = frappe._dict(filters or {})
	zeilen = _zeilen(filters)
	ansicht = filters.get("ansicht") or "Je Phase"
	if ansicht == "Liste":
		return _liste(zeilen)
	if ansicht == "Je Land":
		gruppen = list(LAENDER.items())
		schluessel = lambda p, k: p.land  # noqa: E731
	elif ansicht == "Je COD-Jahr":
		gruppen = [(j, j) for j in sorted({_cod_jahr(p, k) for p, k in zeilen if _cod_jahr(p, k)})]
		schluessel = _cod_jahr
	else:
		gruppen = [(None, "Akquise"), *[(x, K.phase_label(x)) for x in K.PHASEN_IDS]]
		schluessel = lambda p, k: k["phase"]  # noqa: E731
	columns = [
		{"fieldname": "gruppe", "label": ansicht.replace("Je ", ""), "fieldtype": "Data", "width": 180},
		{"fieldname": "anzahl", "label": "Projekte", "fieldtype": "Int", "width": 90},
		{"fieldname": "mwp", "label": "MWp", "fieldtype": "Float", "precision": 1, "width": 100},
		{"fieldname": "mwp_gewichtet", "label": "MWp gewichtet", "fieldtype": "Float", "precision": 1, "width": 130},
		{"fieldname": "volumen", "label": "Volumen (ungewichtet)", "fieldtype": "Currency", "width": 170},
		{"fieldname": "wert", "label": "Pipeline-Wert", "fieldtype": "Currency", "width": 150},
		{"fieldname": "verzug", "label": "Überfällige Meilensteine", "fieldtype": "Int", "width": 170},
	]
	daten = []
	for g, label in gruppen:
		t = [(p, k) for p, k in zeilen if schluessel(p, k) == g]
		if not t and ansicht != "Je Phase":
			continue
		daten.append({
			"gruppe": label, "anzahl": len(t), "mwp": sum(flt(p.mwp) for p, _k in t), "mwp_gewichtet": sum(k["pipeline"]["gewichtetMwp"] for _p, k in t),
			"volumen": sum(k["pipeline"]["volumen"] for _p, k in t), "wert": sum(k["pipeline"]["wert"] for _p, k in t), "verzug": sum(k["meilensteine"]["ueberfaellig"] for _p, k in t),
		})
	datasets = [{"name": "MWp", "values": [round(d["mwp"], 1) for d in daten]}, {"name": "MWp gewichtet", "values": [round(d["mwp_gewichtet"], 1) for d in daten]}]
	if ansicht == "Je COD-Jahr":
		datasets.append({"name": f"Ziel {K.ZIEL_MWP_JAHR} MWp", "values": [K.ZIEL_MWP_JAHR for _d in daten], "chartType": "line"})
	chart = {"data": {"labels": [d["gruppe"] for d in daten], "datasets": datasets}, "type": "axis-mixed" if ansicht == "Je COD-Jahr" else "bar", "colors": ["#669933", "#003473", "#f5a70f"]}
	summary = [
		{"label": "Projekte", "value": len(zeilen), "indicator": "Blue", "datatype": "Int"},
		{"label": "MWp gesamt", "value": round(sum(flt(p.mwp) for p, _k in zeilen), 1), "indicator": "Green", "datatype": "Float"},
		{"label": "MWp gewichtet", "value": round(sum(k["pipeline"]["gewichtetMwp"] for _p, k in zeilen), 1), "indicator": "Green", "datatype": "Float"},
		{"label": "Pipeline-Wert", "value": sum(k["pipeline"]["wert"] for _p, k in zeilen), "indicator": "Blue", "datatype": "Currency"},
		{"label": "Ziel MWp je Jahr", "value": K.ZIEL_MWP_JAHR, "indicator": "Orange", "datatype": "Int"},
	]
	return columns, daten, None, chart, summary


def _liste(zeilen):
	columns = [
		{"fieldname": "name", "label": "Projekt", "fieldtype": "Link", "options": DT, "width": 130},
		{"fieldname": "titel", "label": "Titel", "fieldtype": "Data", "width": 220},
		{"fieldname": "typ", "label": "Typ", "fieldtype": "Data", "width": 130},
		{"fieldname": "land", "label": "Land", "fieldtype": "Data", "width": 60},
		{"fieldname": "phase", "label": "Phase", "fieldtype": "Data", "width": 150},
		{"fieldname": "mwp", "label": "MWp", "fieldtype": "Float", "precision": 1, "width": 80},
		{"fieldname": "wahrscheinlichkeit", "label": "Wahrscheinlichkeit", "fieldtype": "Percent", "width": 130},
		{"fieldname": "wert", "label": "Pipeline-Wert", "fieldtype": "Currency", "width": 130},
		{"fieldname": "fortschritt", "label": "Fortschritt", "fieldtype": "Percent", "width": 100},
		{"fieldname": "ziel_cod", "label": "Ziel-COD", "fieldtype": "Data", "width": 90},
		{"fieldname": "prognose_cod", "label": "COD Prognose", "fieldtype": "Date", "width": 110},
		{"fieldname": "verzug", "label": "Überfällig", "fieldtype": "Int", "width": 90},
		{"fieldname": "kritisch", "label": "davon kritisch", "fieldtype": "Int", "width": 110},
		{"fieldname": "projektleiter_id", "label": "Projektleitung", "fieldtype": "Link", "options": "Plattform Konto", "width": 130},
	]
	daten = [{
		"name": p.name, "titel": p.titel, "typ": K.ENTWICKLUNG_TYPEN.get(p.typ, p.typ), "land": p.land, "phase": k["phaseLabel"], "mwp": flt(p.mwp),
		"wahrscheinlichkeit": k["pipeline"]["wahrscheinlichkeit"] * 100, "wert": k["pipeline"]["wert"], "fortschritt": k["fortschritt"], "ziel_cod": p.ziel_cod or "",
		"prognose_cod": k["prognoseCod"], "verzug": k["meilensteine"]["ueberfaellig"], "kritisch": k["meilensteine"]["kritischUeberfaellig"], "projektleiter_id": p.projektleiter_id,
	} for p, k in zeilen]
	return columns, sorted(daten, key=lambda d: -cint(d["wert"]))
