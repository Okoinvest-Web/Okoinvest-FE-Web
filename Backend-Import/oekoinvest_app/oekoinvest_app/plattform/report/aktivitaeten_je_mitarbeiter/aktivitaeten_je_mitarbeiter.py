# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „Aktivitäten je Mitarbeiter“ (nur Leitung): CRM-Aktivitäten nach Typ, erledigte/offene Aufgaben und
# Statuswechsel je Backoffice-Konto im Zeitraum. Hinweis Datenschutz/Arbeitsrecht: Auswertung dient der
# Arbeitsverteilung, nicht der Leistungskontrolle einzelner Personen – Einsatz ggf. mit dem Betriebsrat abstimmen.

import frappe
from frappe.utils import add_days, get_datetime, getdate, nowdate

TYPEN = ["anruf", "termin", "email", "notiz"]


def execute(filters=None):
	filters = frappe._dict(filters or {})
	von = getdate(filters.get("von") or add_days(nowdate(), -30))
	bis = getdate(filters.get("bis") or nowdate())
	zeitraum = ("between", [get_datetime(f"{von} 00:00:00"), get_datetime(f"{bis} 23:59:59")])
	admins = sorted(set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent")))
	konten = frappe.get_all("Plattform Konto", filters={"name": ("in", admins or ["-"])}, fields=["name", "vorname", "nachname", "aktiv"], limit_page_length=0)

	def zaehlen(doctype, feld, filters_):
		ergebnis = {}
		for z in frappe.get_all(doctype, filters=filters_, fields=[feld, "count(name) as anzahl"], group_by=feld):
			ergebnis[z.get(feld)] = z.anzahl
		return ergebnis

	crm = {}
	for z in frappe.get_all("Plattform CRM Aktivitaet", filters={"am": zeitraum, "system": 0}, fields=["von_id", "typ", "count(name) as anzahl"], group_by="von_id, typ"):
		crm.setdefault(z.von_id, {})[z.typ or "notiz"] = z.anzahl
	erledigt = zaehlen("Plattform Aufgabe", "erledigt_von", {"erledigt_am": zeitraum})
	offen = zaehlen("Plattform Aufgabe", "zustaendig_id", {"status": "offen"})
	status = zaehlen("Plattform Aktivitaet", "nutzer_id", {"am": zeitraum, "aktion": "status"})

	daten = []
	for k in konten:
		z = {"konto": k.name, "name": " ".join(x for x in (k.vorname, k.nachname) if x), "aktiv": k.aktiv}
		for t in TYPEN:
			z[t] = crm.get(k.name, {}).get(t, 0)
		z["aufgaben_erledigt"] = erledigt.get(k.name, 0)
		z["aufgaben_offen"] = offen.get(k.name, 0)
		z["statuswechsel"] = status.get(k.name, 0)
		z["summe"] = sum(z[t] for t in TYPEN) + z["aufgaben_erledigt"] + z["statuswechsel"]
		daten.append(z)
	daten.sort(key=lambda d: -d["summe"])
	columns = [
		{"fieldname": "konto", "label": "Konto", "fieldtype": "Link", "options": "Plattform Konto", "width": 130},
		{"fieldname": "name", "label": "Name", "fieldtype": "Data", "width": 180},
		{"fieldname": "anruf", "label": "Anrufe", "fieldtype": "Int", "width": 80},
		{"fieldname": "termin", "label": "Termine", "fieldtype": "Int", "width": 80},
		{"fieldname": "email", "label": "E-Mails", "fieldtype": "Int", "width": 80},
		{"fieldname": "notiz", "label": "Notizen", "fieldtype": "Int", "width": 80},
		{"fieldname": "aufgaben_erledigt", "label": "Aufgaben erledigt", "fieldtype": "Int", "width": 130},
		{"fieldname": "aufgaben_offen", "label": "Aufgaben offen (aktuell)", "fieldtype": "Int", "width": 150},
		{"fieldname": "statuswechsel", "label": "Statuswechsel", "fieldtype": "Int", "width": 110},
		{"fieldname": "summe", "label": "Summe", "fieldtype": "Int", "width": 90},
	]
	chart = {
		"data": {"labels": [d["name"] or d["konto"] for d in daten[:15]], "datasets": [{"name": "Aktivitäten", "values": [d["summe"] for d in daten[:15]]}]},
		"type": "bar",
		"colors": ["#003473"],
	}
	return columns, daten, None, chart
