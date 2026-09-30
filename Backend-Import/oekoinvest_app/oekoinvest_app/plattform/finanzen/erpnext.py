# Copyright (c) 2026, ÖkoInvest GmbH
#
# ERPNext-Adapter „Finanzen & Abrechnung“ – OPTIONAL. Aktiv nur, wenn ERPNext installiert ist UND in site_config
# `oekoinvest_erpnext: 1` gesetzt ist (Konvention aller optionalen Apps); `oekoinvest_erpnext_finanzen: 0` schaltet nur die
# Finanzen ab. Ohne ERPNext bleibt die Plattform-Abrechnung maßgeblich.
#
# Genutzte Standard-DocTypes/Felder (ERPNext v15): Supplier, Customer, Purchase Invoice, Sales Invoice (+ Items, Taxes),
# Payment Entry (Referenzen), Subscription/Subscription Plan, Asset (+ Finance Book), Project, Cost Center, Company,
# Journal Entry Account, Timesheet Detail. Eigene Verknüpfungen über Custom Fields (einrichtung.py):
# Supplier/Customer.oekoinvest_konto, Purchase/Sales Invoice.oekoinvest_abrechnung, Asset.oekoinvest_anlage, Project.oekoinvest_entwicklungsprojekt
# (definiert in plattform/einrichtung.py → OPTIONALE_FELDER["erpnext"], angelegt beim Migrate bzw. durch finanzen/einrichtung.py).
# VOR EINSATZ GEGEN DIE INSTALLIERTE ERPNext-VERSION PRÜFEN (Pflichtfelder von Asset/Subscription ändern sich zwischen
# Minor-Versionen; Kontenzuordnung hängt vom gewählten Kontenplan ab).

import frappe
from frappe.utils import add_days, cint, flt, getdate, nowdate

from oekoinvest_app.plattform.finanzen import logik as L

SCHALTER = "oekoinvest_erpnext"
SCHALTER_FINANZEN = "oekoinvest_erpnext_finanzen"


def installiert():
	return "erpnext" in frappe.get_installed_apps()


def aktiv():
	return installiert() and bool(cint(frappe.conf.get(SCHALTER))) and cint(frappe.conf.get(SCHALTER_FINANZEN, 1)) != 0


def _einstellungen():
	from oekoinvest_app.plattform.finanzen.abrechnung import einstellungen

	return einstellungen()


def company_fuer(gesellschaft):
	"""Company der Gesellschaft (je SPV eigene Company). Fehlt sie, klare Meldung statt stiller Buchung in der falschen Company."""
	name = (gesellschaft or {}).get("erpnextCompany") or _einstellungen()["erpnextCompany"]
	if not frappe.db.exists("Company", name):
		frappe.throw(f"ERPNext: Company „{name}“ fehlt – bitte zuerst anlegen (Setup-Assistent bzw. Gesellschaftsverzeichnis).", frappe.ValidationError)
	return name


def _kostenstelle(company, bereich):
	kst = (_einstellungen().get("kostenstellen") or {}).get(bereich) or L.KOSTENSTELLEN.get(bereich)
	abk = frappe.db.get_value("Company", company, "abbr")
	name = f"{kst} - {abk}" if kst and abk else None
	return name if name and frappe.db.exists("Cost Center", name) else frappe.db.get_value("Company", company, "cost_center")


def _steuer_template(doctype, vorlage, company):
	"""Steuervorlage der Plattform → ERPNext Taxes and Charges Template (Zuordnung in den Einstellungen bzw. gleicher Titel)."""
	zuordnung = (_einstellungen().get("steuerzuordnung") or {}).get(vorlage)
	abk = frappe.db.get_value("Company", company, "abbr")
	for kandidat in (zuordnung, f"{vorlage} - {abk}" if abk else None, vorlage):
		if kandidat and frappe.db.exists(doctype, kandidat):
			return kandidat
	return None


def _partei(doctype, konto_id, partei, gruppe):
	"""Supplier bzw. Customer zum Plattform-Konto/Organisation (Custom Field oekoinvest_konto) – legt bei Bedarf an."""
	schluessel = konto_id or partei.get("organisationId") or partei.get("name")
	name = frappe.db.get_value(doctype, {"oekoinvest_konto": schluessel}, "name")
	if name:
		return name
	feld = "supplier_name" if doctype == "Supplier" else "customer_name"
	doc = frappe.get_doc({
		"doctype": doctype,
		feld: partei.get("name") or schluessel,
		("supplier_group" if doctype == "Supplier" else "customer_group"): gruppe if frappe.db.exists(f"{doctype} Group", gruppe) else frappe.db.get_value(f"{doctype} Group", {"is_group": 0}, "name"),
		("supplier_type" if doctype == "Supplier" else "customer_type"): "Company" if partei.get("zuHaenden") or partei.get("uid") else "Individual",
		"tax_id": partei.get("uid") or None,
		"oekoinvest_konto": schluessel,
	})
	if doctype == "Customer" and frappe.db.exists("Territory", "All Territories"):
		doc.territory = "All Territories"
	doc.insert(ignore_permissions=True)
	return doc.name


def _items(beleg, company, bereich, aufwand):
	aus = []
	for p in beleg["positionen"]:
		menge = flt(p.get("menge")) or 1
		betrag = flt(p.get("betrag"))
		rate = betrag / menge if menge else betrag
		zeile = {"item_code": p.get("artikel"), "qty": menge, "rate": rate, "description": p.get("text"), "cost_center": _kostenstelle(company, bereich)}
		if p.get("einheit") == "kWh" and frappe.db.exists("UOM", "kWh"):
			zeile["uom"] = "kWh"
		aus.append(zeile)
	return aus


def rechnung_anlegen(beleg):
	"""Beleg der Plattform → Purchase Invoice (Pacht-Gutschrift) bzw. Sales Invoice (Contracting/Provision). Liefert (doctype, name)."""
	from oekoinvest_app.plattform.finanzen.abrechnung import gesellschaft

	art = beleg["art"]
	ges = gesellschaft(beleg.get("gesellschaftId"))
	company = company_fuer(ges)
	e = _einstellungen()
	if art == "pacht":
		doctype = "Purchase Invoice"
		partei = _partei("Supplier", beleg.get("empfaengerId"), beleg["partei"], "Flächeneigentümer")
		doc = frappe.get_doc({
			"doctype": doctype, "company": company, "supplier": partei, "posting_date": beleg["rechnungsdatum"], "set_posting_time": 1,
			"bill_no": beleg["nummer"], "bill_date": beleg["rechnungsdatum"], "due_date": beleg["faelligAm"],
			"items": _items(beleg, company, "pacht", True), "remarks": f"Gutschrift {beleg['nummer']} – {beleg.get('bezugText', '')}", "oekoinvest_abrechnung": beleg["id"],
		})
		tpl = _steuer_template("Purchase Taxes and Charges Template", beleg["steuer"]["vorlage"], company)
	else:
		doctype = "Sales Invoice"
		partei = _partei("Customer", beleg.get("empfaengerId") or beleg.get("organisationId"), {**beleg["partei"], "organisationId": beleg.get("organisationId")}, "Contracting-Kunden" if art == "contracting" else "Projektanbieter")
		doc = frappe.get_doc({
			"doctype": doctype, "company": company, "customer": partei, "posting_date": beleg["rechnungsdatum"], "set_posting_time": 1, "due_date": beleg["faelligAm"],
			"items": _items(beleg, company, art, False), "remarks": f"{beleg['titel']} {beleg['nummer']} – {beleg.get('bezugText', '')}", "oekoinvest_abrechnung": beleg["id"],
		})
		tpl = _steuer_template("Sales Taxes and Charges Template", beleg["steuer"]["vorlage"], company)
	if tpl:
		# Steuerzeilen aus dem Template übernehmen (erpnext.controllers.accounts_controller.get_taxes_and_charges, v15)
		from erpnext.controllers.accounts_controller import get_taxes_and_charges

		doc.taxes_and_charges = tpl
		doc.set("taxes", get_taxes_and_charges(("Purchase" if art == "pacht" else "Sales") + " Taxes and Charges Template", tpl))
	doc.insert(ignore_permissions=True)
	if cint(e.get("erpnextAutobuchen")):
		doc.submit()
	return doctype, doc.name


def rechnung_stornieren(doctype, name):
	doc = frappe.get_doc(doctype, name)
	if doc.docstatus == 1:
		doc.cancel()
	elif doc.docstatus == 0:
		frappe.delete_doc(doctype, name, ignore_permissions=True)


def offener_betrag(doctype, name):
	"""(status, outstanding) des ERPNext-Belegs – Grundlage für den Zahlungsstatus der Plattform."""
	w = frappe.db.get_value(doctype, name, ["docstatus", "status", "outstanding_amount"], as_dict=True)
	if not w:
		return None, None
	return w.status, flt(w.outstanding_amount)


def zahlung_abgleichen(doc, method=None):
	"""Hook Payment Entry on_submit/on_cancel: Zahlungsstatus der verknüpften Plattform-Abrechnungen nachziehen."""
	if not aktiv():
		return
	from oekoinvest_app.plattform.finanzen.abrechnung import zahlungsstatus_abgleichen

	for ref in doc.get("references") or []:
		if ref.reference_doctype in ("Sales Invoice", "Purchase Invoice"):
			ab = frappe.db.get_value("Plattform Abrechnung", {"erpnext_doctype": ref.reference_doctype, "erpnext_name": ref.reference_name}, "name")
			if ab:
				zahlungsstatus_abgleichen(ab)


def subscription_anlegen(beleg_vorlage, anlage_id, grundgebuehr, start):
	"""Optional (Einstellung „Grundgebühr über Subscription“): monatliche Grundgebühr als ERPNext Subscription.
	Dann enthält die Contracting-Rechnung der Plattform nur den Arbeitspreis. Vor Einsatz prüfen."""
	from oekoinvest_app.plattform.finanzen.abrechnung import gesellschaft

	ges = gesellschaft(beleg_vorlage.get("gesellschaftId"))
	company = company_fuer(ges)
	plan_name = f"Grundgebühr {anlage_id}"
	if not frappe.db.exists("Subscription Plan", plan_name):
		frappe.get_doc({"doctype": "Subscription Plan", "plan_name": plan_name, "item": "CONTRACTING-GRUND", "price_determination": "Fixed Rate", "cost": flt(grundgebuehr), "billing_interval": "Month", "billing_interval_count": 1, "currency": "EUR"}).insert(ignore_permissions=True)
	kunde = _partei("Customer", beleg_vorlage.get("empfaengerId") or beleg_vorlage.get("organisationId"), beleg_vorlage["partei"], "Contracting-Kunden")
	vorhanden = frappe.db.get_value("Subscription", {"party_type": "Customer", "party": kunde, "status": ["!=", "Cancelled"]}, "name")
	if vorhanden:
		return vorhanden
	s = frappe.get_doc({"doctype": "Subscription", "party_type": "Customer", "party": kunde, "company": company, "start_date": start, "generate_invoice_at": "End of the current subscription period", "plans": [{"plan": plan_name, "qty": 1}]})
	s.insert(ignore_permissions=True)
	return s.name


def asset_anlegen(aktivierung, anlage):
	"""Eigene Contracting-Anlage als ERPNext Asset in der Company der Eigentümergesellschaft (lineare AfA)."""
	from oekoinvest_app.plattform.finanzen.abrechnung import anlage_gesellschaft

	ges = anlage_gesellschaft(anlage)
	company = company_fuer(ges)
	item = "PV-ANLAGE" if anlage.get("typ") != "speicher" else "BATTERIESPEICHER"
	if not frappe.db.exists("Item", item):
		frappe.throw(f"ERPNext: Anlagen-Artikel „{item}“ fehlt – Setup-Assistent ausführen (einrichtung.einrichten).", frappe.ValidationError)
	ort = "ÖkoInvest Anlagen" if frappe.db.exists("Location", "ÖkoInvest Anlagen") else frappe.db.get_value("Location", {}, "name")
	nd = cint(aktivierung["nutzungsdauerJahre"])
	beginn = getdate(aktivierung["inbetriebnahme"])
	vorhanden = frappe.db.get_value("Asset", {"oekoinvest_anlage": anlage["id"], "docstatus": ["<", 2]}, "name")
	if vorhanden:
		return vorhanden
	doc = frappe.get_doc({
		"doctype": "Asset", "company": company, "item_code": item, "asset_name": anlage.get("name") or anlage["id"], "location": ort,
		"is_existing_asset": 1, "purchase_date": beginn, "available_for_use_date": beginn, "gross_purchase_amount": flt(aktivierung["anschaffungswert"]),
		"calculate_depreciation": 1, "oekoinvest_anlage": anlage["id"],
		"finance_books": [{"depreciation_method": "Straight Line", "total_number_of_depreciations": nd, "frequency_of_depreciation": 12, "depreciation_start_date": add_days(beginn.replace(month=12, day=31), 0)}],
	})
	doc.insert(ignore_permissions=True)
	return doc.name


def projekt_ist(entwicklung_id):
	"""Ist-Kosten eines Entwicklungsprojekts aus ERPNext: Eingangsrechnungen (Positionen mit Projekt), Journalbuchungen
	(Aufwandskonten mit Projekt) und Timesheets (Kosten). Liefert Positionen im Format der Plattform."""
	projekt = frappe.db.get_value("Project", {"oekoinvest_entwicklungsprojekt": entwicklung_id}, "name")
	if not projekt:
		return None
	pos = []
	for r in frappe.db.sql(
		"""select pi.name as beleg, pi.posting_date as datum, pii.base_net_amount as betrag, pii.item_name as text
		from `tabPurchase Invoice Item` pii join `tabPurchase Invoice` pi on pi.name = pii.parent
		where pi.docstatus = 1 and pii.project = %s""",
		projekt, as_dict=True,
	):
		pos.append({"kostenart": "planung", "betrag": flt(r.betrag), "datum": str(r.datum), "beleg": r.beleg, "beschreibung": r.text or "", "quelle": "Eingangsrechnung"})
	for r in frappe.db.sql(
		"""select je.name as beleg, je.posting_date as datum, (jea.debit - jea.credit) as betrag, jea.user_remark as text
		from `tabJournal Entry Account` jea join `tabJournal Entry` je on je.name = jea.parent
		join `tabAccount` acc on acc.name = jea.account
		where je.docstatus = 1 and jea.project = %s and acc.root_type = 'Expense'""",
		projekt, as_dict=True,
	):
		pos.append({"kostenart": "sonstiges", "betrag": flt(r.betrag), "datum": str(r.datum), "beleg": r.beleg, "beschreibung": r.text or "Journalbuchung", "quelle": "Journalbuchung"})
	for r in frappe.db.sql(
		"""select ts.name as beleg, ts.start_date as datum, sum(tsd.costing_amount) as betrag, sum(tsd.hours) as stunden
		from `tabTimesheet Detail` tsd join `tabTimesheet` ts on ts.name = tsd.parent
		where ts.docstatus = 1 and tsd.project = %s group by ts.name, ts.start_date""",
		projekt, as_dict=True,
	):
		pos.append({"kostenart": "personal", "betrag": flt(r.betrag), "datum": str(r.datum), "beleg": r.beleg, "beschreibung": f"{flt(r.stunden):.1f} h", "quelle": "Zeiterfassung"})
	return {"projekt": projekt, "positionen": pos}


def heute():
	return nowdate()
