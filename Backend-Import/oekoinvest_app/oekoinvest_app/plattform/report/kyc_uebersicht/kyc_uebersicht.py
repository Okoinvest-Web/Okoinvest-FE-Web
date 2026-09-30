# Copyright (c) 2026, ÖkoInvest GmbH
# Bericht „KYC-Übersicht“ – Status je Konto über die Querschnittsfunktion kyc_status (KYC-Team, plattform/kyc_kern.py).
# Nutzt die Querschnittsfunktion kyc_status(konto) des KYC-Teams, sobald sie existiert (Suche in KANDIDATEN);
# bis dahin zeigt der Bericht die betroffenen Konten mit „noch nicht verfügbar“.
# Rückgabe von kyc_status (plattform/kyc_kern.py): dict mit {"status", "verifiziert", "risiko", "kontotyp",
# "verifiziertAm", "naechstePruefung", "ausweisGueltigBis", "bank": {…}} – andere Formen werden als Text angezeigt.

import importlib

import frappe

KANDIDATEN = [
	"oekoinvest_app.plattform.kyc.kyc_status",
	"oekoinvest_app.plattform.kyc_kern.kyc_status",
	"oekoinvest_app.plattform.api.kyc.kyc_status",
]
PFLICHT_ROLLEN = ["investor", "anbieter", "unternehmen", "flaeche", "landwirt"]


def kyc_funktion():
	for pfad in KANDIDATEN:
		modul, _, name = pfad.rpartition(".")
		try:
			return getattr(importlib.import_module(modul), name)
		except (ImportError, AttributeError):
			continue
	return None


def execute(filters=None):
	filters = frappe._dict(filters or {})
	rollen = [filters.rolle] if filters.get("rolle") else PFLICHT_ROLLEN
	konto_ids = sorted(set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": ("in", rollen), "parenttype": "Plattform Konto"}, pluck="parent")))
	konten = frappe.get_all(
		"Plattform Konto",
		filters={"name": ("in", konto_ids or ["-"]), "aktiv": 1},
		fields=["name", "vorname", "nachname", "firma", "email", "creation"],
		order_by="creation desc",
		limit_page_length=0,
	)
	rollen_je = {}
	for r in frappe.get_all("Plattform Konto Rolle", filters={"parent": ("in", konto_ids or ["-"]), "parenttype": "Plattform Konto"}, fields=["parent", "rolle"]):
		rollen_je.setdefault(r.parent, []).append(r.rolle)
	fn = kyc_funktion()
	daten = []
	for k in konten:
		status, label, extra, e = "–", "noch nicht verfügbar (KYC-Modul fehlt)", "", {}
		if fn:
			try:
				ergebnis = fn(k.name)
				if isinstance(ergebnis, dict):
					e = ergebnis
					status = ergebnis.get("status") or "–"
					label = ergebnis.get("label") or status
					extra = ", ".join(ergebnis.get("fehlt") or [])
					if isinstance(ergebnis.get("bank"), dict) and not ergebnis["bank"].get("geprueft"):
						extra = ", ".join(x for x in (extra, "Bankverbindung ungeprüft") if x)
				else:
					status = label = str(ergebnis)
			except Exception:
				label = "Fehler bei der Abfrage (siehe Error Log)"
				frappe.log_error(title="ÖkoInvest: KYC-Übersicht")
		if filters.get("status") and status != filters.status:
			continue
		daten.append(
			{
				"konto": k.name,
				"name": " ".join(x for x in (k.vorname, k.nachname) if x),
				"firma": k.firma,
				"rollen": ", ".join(rollen_je.get(k.name, [])),
				"status": status,
				"label": label,
				"fehlt": extra,
				"verifiziert": 1 if e.get("verifiziert") else 0,
				"risiko": e.get("risiko"),
				"naechste_pruefung": e.get("naechstePruefung"),
				"ausweis_bis": e.get("ausweisGueltigBis"),
				"seit": k.creation,
			}
		)
	columns = [
		{"fieldname": "konto", "label": "Konto", "fieldtype": "Link", "options": "Plattform Konto", "width": 130},
		{"fieldname": "name", "label": "Name", "fieldtype": "Data", "width": 170},
		{"fieldname": "firma", "label": "Firma", "fieldtype": "Data", "width": 170},
		{"fieldname": "rollen", "label": "Rollen", "fieldtype": "Data", "width": 160},
		{"fieldname": "label", "label": "KYC-Status", "fieldtype": "Data", "width": 220},
		{"fieldname": "verifiziert", "label": "Verifiziert", "fieldtype": "Check", "width": 90},
		{"fieldname": "risiko", "label": "Risiko", "fieldtype": "Data", "width": 90},
		{"fieldname": "naechste_pruefung", "label": "Nächste Prüfung", "fieldtype": "Date", "width": 120},
		{"fieldname": "ausweis_bis", "label": "Ausweis gültig bis", "fieldtype": "Date", "width": 130},
		{"fieldname": "fehlt", "label": "Hinweise", "fieldtype": "Data", "width": 200},
		{"fieldname": "seit", "label": "Konto seit", "fieldtype": "Datetime", "width": 150},
	]
	hinweis = None if fn else "Platzhalter: Das KYC-Modul (kyc_status) ist noch nicht installiert – Status folgt, sobald es geliefert ist."
	return columns, daten, hinweis
