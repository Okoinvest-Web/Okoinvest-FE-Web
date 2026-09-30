# Copyright (c) 2026, ÖkoInvest GmbH
#
# Jinja-Hilfen der Finanz-Druckformate (hooks.jinja „methods“):
#   oekoinvest_abrechnung(name)     – Plattform-Beleg (Gutschrift/Rechnung) als dict für templates/finanzen/beleg.html
#   oekoinvest_beleg_erpnext(doc)   – Purchase/Sales Invoice: verknüpfter Plattform-Beleg (oekoinvest_abrechnung) oder – für
#                                     manuell in ERPNext erfasste Rechnungen – ein Beleg aus den ERPNext-Feldern
# Beide prüfen selbst frappe.has_permission (Druck prüft nur das Hauptdokument).

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.finanzen import logik as L


def oekoinvest_abrechnung(name):
	if not name or not frappe.db.exists("Plattform Abrechnung", name):
		return None
	if not frappe.has_permission("Plattform Abrechnung", "read", name):
		return None
	from oekoinvest_app.plattform.api.finanzen import beleg_ausgabe
	from oekoinvest_app.plattform.finanzen.abrechnung import beleg_dict

	return beleg_ausgabe(beleg_dict(frappe.get_doc("Plattform Abrechnung", name)), backoffice=False, detail=True)


def oekoinvest_beleg_erpnext(doc):
	"""Beleg für Purchase/Sales Invoice – bevorzugt der verknüpfte Plattform-Beleg (identische Positionen, Zählerstände)."""
	b = oekoinvest_abrechnung(doc.get("oekoinvest_abrechnung")) if doc.get("oekoinvest_abrechnung") else None
	if b:
		b["nummer"] = doc.get("bill_no") or b["nummer"]
		return b
	einkauf = doc.doctype == "Purchase Invoice"
	firma = frappe.get_cached_doc("Company", doc.company) if doc.get("company") else frappe._dict()
	steuer = sum(flt(t.tax_amount) for t in doc.get("taxes") or [])
	return {
		"beleg": "gutschrift" if einkauf else "rechnung", "titel": "Gutschrift" if einkauf else "Rechnung", "nummer": doc.get("bill_no") or doc.name,
		"rechnungsdatum": str(doc.posting_date), "faelligAm": str(doc.due_date or doc.posting_date), "zeitraum": {"von": str(doc.posting_date), "bis": str(doc.posting_date)},
		"partei": {"name": doc.get("supplier_name") if einkauf else doc.get("customer_name"), "anschrift": (doc.get("address_display") or "").replace("<br>", ", ").strip(", "), "uid": doc.get("tax_id") or ""},
		"aussteller": {"name": firma.get("company_name") or doc.get("company"), "anschrift": "", "uid": firma.get("tax_id") or "", "firmenbuch": ""},
		"positionen": [{"text": i.description or i.item_name, "menge": flt(i.qty), "einheit": i.uom or "", "preis": flt(i.rate), "betrag": flt(i.amount)} for i in doc.get("items") or []],
		"netto": flt(doc.net_total), "steuer": {"satz": None, "betrag": steuer, "text": doc.get("oekoinvest_steuerhinweis") or ""}, "brutto": flt(doc.grand_total),
		"erklaerung": [], "zaehlerstaende": [], "bankverbindung": None, "status": "storniert" if doc.docstatus == 2 else "offen",
	}


def oekoinvest_steuerlabel(vorlage):
	from oekoinvest_app.plattform.finanzen.steuer import STEUERVORLAGEN

	return (STEUERVORLAGEN.get(vorlage) or ("", 0, "", vorlage or ""))[3]


def oekoinvest_euro(wert):
	return L.euro(flt(wert))
