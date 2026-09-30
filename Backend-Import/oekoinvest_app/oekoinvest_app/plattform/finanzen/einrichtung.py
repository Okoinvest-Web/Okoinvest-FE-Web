# Copyright (c) 2026, ÖkoInvest GmbH
#
# Setup-Assistent „Finanzen & Abrechnung“ – idempotent (mehrfach ausführbar, legt nur Fehlendes an):
#
#   bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.einrichten
#   bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.einrichten --kwargs "{'kontenplan': 'Standard with Numbers'}"
#   bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.spv_company --kwargs "{'name': 'Solarpark Beispiel GmbH', 'abkuerzung': 'SPB', 'land': 'Germany'}"
#
# Immer: VPI-Startwerte (Beispielwerte – mit amtlicher Veröffentlichung abgleichen), Finanzeinstellungen.
# Nur mit ERPNext (installiert): Company „ÖkoInvest GmbH“, Kostenstellen, Artikel (Pacht, Provision, Contracting-Strom,
# Grundgebühr, Anlagen), Lieferanten-/Kundengruppen, Steuerkonten und Steuervorlagen AT/DE/CH (VORSCHLAG), Zahlungs-
# bedingungen, Lagerort und Anlagenkategorie, Custom Fields (oi_*), Druckformate Pachtgutschrift/Contracting-Rechnung/
# Provisionsrechnung. Danach site_config `oekoinvest_erpnext: 1` setzen, um ERPNext zu nutzen.
#
# VOR EINSATZ GEGEN DIE INSTALLIERTE ERPNext-VERSION PRÜFEN. Kontenplan, Steuerkonten und -vorlagen mit der
# Steuerberatung abstimmen (AT: EKR, DE: SKR03/SKR04, CH: KMU-Kontenrahmen).

import os

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.finanzen import logik as L
from oekoinvest_app.plattform.finanzen import steuer as T

FIRMA = "ÖkoInvest GmbH"
HIER = os.path.dirname(os.path.abspath(__file__))


def _bericht():
	return {"angelegt": [], "vorhanden": [], "hinweise": [], "fehler": []}


def _anlegen(bericht, doctype, name, werte, filters=None):
	"""Datensatz nur anlegen, wenn er fehlt (Name oder Filter). Fehler werden gesammelt, nicht geworfen."""
	try:
		vorhanden = frappe.db.exists(doctype, filters or name)
		if vorhanden:
			bericht["vorhanden"].append(f"{doctype}: {name}")
			return vorhanden if isinstance(vorhanden, str) else name
		doc = frappe.get_doc({"doctype": doctype, **werte})
		doc.insert(ignore_permissions=True)
		bericht["angelegt"].append(f"{doctype}: {doc.name}")
		return doc.name
	except Exception as e:  # noqa: BLE001 – Assistent läuft weiter, meldet am Ende
		bericht["fehler"].append(f"{doctype} {name}: {str(e)[:240]}")
		return None


def vpi_startwerte(bericht=None):
	bericht = bericht or _bericht()
	for reihe, jahr, wert in L.INDEX_STARTWERTE:
		_anlegen(bericht, "Plattform VPI Wert", f"{reihe}-{jahr}", {"reihe": reihe, "jahr": jahr, "wert": wert, "quelle": "Beispielwert (Setup) – mit amtlicher Veröffentlichung abgleichen"})
	bericht["hinweise"].append("VPI-Startwerte sind gerundete Beispielwerte – vor der ersten indexierten Abrechnung mit Statistik Austria / Destatis / BFS abgleichen (Backoffice → Finanzen → Index).")
	return bericht


def _company(bericht, name, abkuerzung, land, kontenplan):
	if frappe.db.exists("Company", name):
		bericht["vorhanden"].append(f"Company: {name}")
		return name
	return _anlegen(bericht, "Company", name, {"company_name": name, "abbr": abkuerzung, "default_currency": "EUR" if land != "Switzerland" else "CHF", "country": land, "chart_of_accounts": kontenplan})


def _root(doctype, company):
	return frappe.db.get_value(doctype, {"company": company, "is_group": 1, "parent_" + frappe.scrub(doctype): ["in", ["", None]]}, "name")


def _konto(bericht, company, titel, typ, satz):
	abk = frappe.db.get_value("Company", company, "abbr")
	name = f"{titel} - {abk}"
	if frappe.db.exists("Account", name):
		return name
	eltern = frappe.db.get_value("Account", {"company": company, "account_name": ["like", "Duties and Taxes%"], "is_group": 1}, "name") or frappe.db.get_value("Account", {"company": company, "root_type": "Liability", "is_group": 1}, "name")
	return _anlegen(bericht, "Account", name, {"account_name": titel, "company": company, "parent_account": eltern, "account_type": typ, "tax_rate": satz * 100, "is_group": 0})


def _steuervorlagen(bericht, company):
	zuordnung = {}
	for vid, (land, satz, art, label, text, grundlage) in T.STEUERVORLAGEN.items():
		einkauf = "Pacht" in vid or "Kleinunternehmer" in vid
		dt = "Purchase Taxes and Charges Template" if einkauf else "Sales Taxes and Charges Template"
		konto = _konto(bericht, company, f"{'Vorsteuer' if einkauf else 'Umsatzsteuer'} {land} {L.zahl_de(satz * 100, 1)} %", "Tax", satz)
		if not konto:
			continue
		beschreibung = f"{label}. {text} ({grundlage}) – mit Steuerberatung abstimmen"[:140]
		zeile = {"charge_type": "On Net Total", "account_head": konto, "description": beschreibung, "rate": satz * 100}
		if einkauf:
			zeile["category"] = "Total"
			zeile["add_deduct_tax"] = "Add"
		abk = frappe.db.get_value("Company", company, "abbr")
		name = _anlegen(bericht, dt, f"{vid} - {abk}", {"title": vid, "company": company, "taxes": [zeile]}, {"title": vid, "company": company})
		if name:
			zuordnung[vid] = name
	return zuordnung


def _custom_fields(bericht):
	"""Felder aus plattform/einrichtung.py → OPTIONALE_FELDER["erpnext"] (dort gepflegt; beim Migrate nur mit Schalter)."""
	from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

	from oekoinvest_app.plattform.einrichtung import OPTIONALE_FELDER

	felder = OPTIONALE_FELDER.get("erpnext") or {}
	try:
		create_custom_fields({dt: f for dt, f in felder.items() if frappe.db.exists("DocType", dt)}, ignore_validate=True, update=True)
		bericht["angelegt"].append("Custom Fields oekoinvest_* (Purchase/Sales Invoice, Supplier, Customer, Asset, Project)")
	except Exception as e:  # noqa: BLE001
		bericht["fehler"].append(f"Custom Fields: {str(e)[:240]}")


def _druckformate(bericht):
	css_pfad = os.path.normpath(os.path.join(HIER, "..", "print_format", "oekoinvest_druck.css"))
	css = open(css_pfad, encoding="utf-8").read() if os.path.exists(css_pfad) else ""
	for datei, name, dt in (("pachtgutschrift", "ÖkoInvest Pachtgutschrift", "Purchase Invoice"), ("contracting_rechnung", "ÖkoInvest Contracting-Rechnung", "Sales Invoice"), ("provisionsrechnung", "ÖkoInvest Provisionsrechnung", "Sales Invoice")):
		html = open(os.path.join(HIER, "druckformate", f"{datei}.html"), encoding="utf-8").read()
		if frappe.db.exists("Print Format", name):
			frappe.db.set_value("Print Format", name, {"html": html, "css": css})
			bericht["vorhanden"].append(f"Print Format: {name} (aktualisiert)")
			continue
		_anlegen(bericht, "Print Format", name, {"name": name, "doc_type": dt, "custom_format": 1, "print_format_type": "Jinja", "standard": "No", "html": html, "css": css, "default_print_language": "de", "disabled": 0})


def einrichten(kontenplan="Standard", land="Austria", abkuerzung="OEI"):
	"""Einrichtung ausführen und Bericht liefern (angelegt / vorhanden / Hinweise / Fehler)."""
	bericht = _bericht()
	vpi_startwerte(bericht)
	e = frappe.get_single("Plattform Finanzen Einstellungen")
	if not e.erpnext_company:
		e.erpnext_company = FIRMA
	if "erpnext" not in frappe.get_installed_apps():
		e.save(ignore_permissions=True)
		bericht["hinweise"].append("ERPNext ist nicht installiert – Finanzen laufen im Eigenbetrieb (Plattform-Abrechnungen). Nach Installation erneut ausführen.")
		frappe.db.commit()
		return bericht

	company = _company(bericht, FIRMA, abkuerzung, land, kontenplan)
	if not company:
		frappe.db.commit()
		return bericht
	abk = frappe.db.get_value("Company", company, "abbr")
	# Kostenstellen
	root = _root("Cost Center", company)
	kst = {}
	for bereich, titel in L.KOSTENSTELLEN.items():
		if _anlegen(bericht, "Cost Center", f"{titel} - {abk}", {"cost_center_name": titel, "parent_cost_center": root, "company": company, "is_group": 0}):
			kst[bereich] = titel
	# Einheiten, Artikel, Gruppen
	_anlegen(bericht, "UOM", "kWh", {"uom_name": "kWh", "must_be_whole_number": 0})
	_anlegen(bericht, "Item Group", "ÖkoInvest Leistungen", {"item_group_name": "ÖkoInvest Leistungen", "parent_item_group": "All Item Groups", "is_group": 0})
	for code, titel in L.ARTIKEL.items():
		einkauf = code.startswith("PACHT")
		_anlegen(bericht, "Item", code, {"item_code": code, "item_name": titel, "item_group": "ÖkoInvest Leistungen", "stock_uom": "kWh" if code == "CONTRACTING-STROM" else "Nos", "is_stock_item": 0, "is_sales_item": 0 if einkauf else 1, "is_purchase_item": 1 if einkauf else 0, "include_item_in_manufacturing": 0})
	_anlegen(bericht, "Supplier Group", "Flächeneigentümer", {"supplier_group_name": "Flächeneigentümer", "parent_supplier_group": "All Supplier Groups"})
	for g in ("Contracting-Kunden", "Projektanbieter"):
		_anlegen(bericht, "Customer Group", g, {"customer_group_name": g, "parent_customer_group": "All Customer Groups"})
	# Steuern (Vorschlag)
	zuordnung = _steuervorlagen(bericht, company)
	bericht["hinweise"].append("Steuerkonten und -vorlagen sind ein VORSCHLAG (Pacht steuerfrei/Option, Kleinunternehmer, Reverse Charge, CH-MWST) – mit der Steuerberatung abstimmen, bevor Belege gebucht werden.")
	# Zahlungsbedingungen
	for tage in (14, 30):
		_anlegen(bericht, "Payment Term", f"{tage} Tage netto", {"payment_term_name": f"{tage} Tage netto", "due_date_based_on": "Day(s) after invoice date", "credit_days": tage, "invoice_portion": 100})
		_anlegen(bericht, "Payment Terms Template", f"{tage} Tage netto", {"template_name": f"{tage} Tage netto", "terms": [{"payment_term": f"{tage} Tage netto", "invoice_portion": 100, "due_date_based_on": "Day(s) after invoice date", "credit_days": tage}]})
	# Anlagen: Lagerort, Kategorie, Artikel
	_anlegen(bericht, "Location", "ÖkoInvest Anlagen", {"location_name": "ÖkoInvest Anlagen"})
	konten = {typ: frappe.db.get_value("Account", {"company": company, "account_type": typ, "is_group": 0}, "name") for typ in ("Fixed Asset", "Accumulated Depreciation", "Depreciation")}
	if all(konten.values()):
		_anlegen(bericht, "Asset Category", "PV-Anlagen", {"asset_category_name": "PV-Anlagen", "accounts": [{"company_name": company, "fixed_asset_account": konten["Fixed Asset"], "accumulated_depreciation_account": konten["Accumulated Depreciation"], "depreciation_expense_account": konten["Depreciation"]}]})
		for code, titel in (("PV-ANLAGE", "PV-Anlage (Contracting)"), ("BATTERIESPEICHER", "Batteriespeicher (Contracting)")):
			_anlegen(bericht, "Item", code, {"item_code": code, "item_name": titel, "item_group": "ÖkoInvest Leistungen", "stock_uom": "Nos", "is_stock_item": 0, "is_fixed_asset": 1, "asset_category": "PV-Anlagen"})
	else:
		bericht["hinweise"].append("Anlagenkategorie nicht angelegt: Konten „Fixed Asset“, „Accumulated Depreciation“, „Depreciation“ im Kontenplan fehlen – bitte anlegen und Assistent erneut ausführen.")
	_custom_fields(bericht)
	_druckformate(bericht)
	# Einstellungen
	e.erpnext_company = company
	if zuordnung:
		e.steuerzuordnung = frappe.as_json(zuordnung)
	if kst:
		e.kostenstellen = frappe.as_json(kst)
	e.save(ignore_permissions=True)
	if not cint(frappe.conf.get("oekoinvest_erpnext")):
		bericht["hinweise"].append("Zum Aktivieren: bench --site <site> set-config oekoinvest_erpnext 1 (sonst bleibt der Eigenbetrieb aktiv).")
	frappe.db.commit()
	return bericht


def spv_company(name, abkuerzung, land="Austria", kontenplan="Standard"):
	"""Company für eine Projektgesellschaft (SPV) inkl. Kostenstellen und Steuervorlagen – für Assets und Contracting-Rechnungen
	der Eigentümergesellschaft. Das Gesellschaftsverzeichnis (Team A2) verweist über erpnext_company auf diese Company."""
	bericht = _bericht()
	if "erpnext" not in frappe.get_installed_apps():
		bericht["hinweise"].append("ERPNext ist nicht installiert.")
		return bericht
	company = _company(bericht, name, abkuerzung, land, kontenplan)
	if company:
		root = _root("Cost Center", company)
		abk = frappe.db.get_value("Company", company, "abbr")
		for bereich in ("contracting", "pacht", "verwaltung"):
			_anlegen(bericht, "Cost Center", f"{L.KOSTENSTELLEN[bereich]} - {abk}", {"cost_center_name": L.KOSTENSTELLEN[bereich], "parent_cost_center": root, "company": company, "is_group": 0})
		_steuervorlagen(bericht, company)
	frappe.db.commit()
	return bericht
