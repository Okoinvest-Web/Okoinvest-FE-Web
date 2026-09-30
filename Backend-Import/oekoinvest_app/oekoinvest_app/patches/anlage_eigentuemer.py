# Copyright (c) 2026, ÖkoInvest GmbH
# Fachprüfung Kapitalseite: Pflichtfeld „Eigentümergesellschaft“ an Plattform Anlage (Contracting-Anlagen im Eigentum
# von ÖkoInvest bzw. einer Projektgesellschaft). Bestandsanlagen ohne Angabe erhalten „ÖkoInvest GmbH“ und den
# Betriebsführer „ÖkoInvest GmbH“ – bitte danach im Desk prüfen und ggf. auf die Projektgesellschaft ändern.

import frappe


def execute():
	if not frappe.db.table_exists("Plattform Anlage"):
		return
	spalten = frappe.db.get_table_columns("Plattform Anlage")
	if "eigentuemer" in spalten:
		frappe.db.sql("update `tabPlattform Anlage` set eigentuemer = %s where ifnull(eigentuemer, '') = ''", ("ÖkoInvest GmbH",))
	if "betriebsfuehrer" in spalten:
		frappe.db.sql("update `tabPlattform Anlage` set betriebsfuehrer = %s where ifnull(betriebsfuehrer, '') = ''", ("ÖkoInvest GmbH",))
	if "index_basis" in (frappe.db.get_table_columns("Plattform Contracting Vertrag") if frappe.db.table_exists("Plattform Contracting Vertrag") else []):
		frappe.db.sql("update `tabPlattform Contracting Vertrag` set index_basis = if(ifnull(indexierung_pct, 0) > 0, 'prozent', 'fest') where ifnull(index_basis, '') = ''")
