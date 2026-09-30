# Copyright (c) 2026, ÖkoInvest GmbH
#
# Adapter HRMS (optional, App `hrms` installiert + Schalter `oekoinvest_hrms` in site_config). Nur dokumentierte
# Standard-DocTypes/Felder von HRMS/ERPNext v15:
#   Employee (user_id, employee_name, status, holiday_list, company)
#   Leave Application (employee, from_date, to_date, status, docstatus, leave_type)
#   Holiday List (holidays → Holiday.holiday_date), Company.default_holiday_list
#   Timesheet (employee, time_logs → Timesheet Detail: activity_type, from_time, to_time, hours, project, description)
# Ohne HRMS: Abwesenheiten/Zeiten/Feiertage liegen in den Plattform-DocTypes (Plattform Abwesenheit, Plattform Zeiteintrag,
# Feiertage in „Plattform Service Einstellungen“). Fehler im Abgleich brechen nie den fachlichen Vorgang ab.

from datetime import datetime, timedelta

import frappe
from frappe.utils import add_days, getdate, nowdate

from oekoinvest_app.plattform.service.integration import aktiv


def employee_fuer_konto(konto_id):
	"""Employee-Name zum Plattform-Konto: gepflegt am Mitarbeiter, sonst über Employee.user_id = User des Kontos."""
	if not aktiv("hrms"):
		return None
	gepflegt = frappe.db.get_value("Plattform Mitarbeiter", {"konto_id": konto_id}, "employee")
	if gepflegt and frappe.db.exists("Employee", gepflegt):
		return gepflegt
	user = frappe.db.get_value("Plattform Konto", konto_id, "user")
	return frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name") if user else None


def feiertage(konto_id=None, von=None, bis=None):
	"""Feiertage als Liste „YYYY-MM-DD“: HRMS Holiday List (Mitarbeiter bzw. Firma) oder Plattform-Einstellung."""
	von = von or nowdate()
	bis = bis or add_days(von, 60)
	if aktiv("hrms"):
		try:
			liste = None
			emp = employee_fuer_konto(konto_id) if konto_id else None
			if emp:
				liste = frappe.db.get_value("Employee", emp, "holiday_list")
				if not liste:
					firma = frappe.db.get_value("Employee", emp, "company")
					liste = frappe.db.get_value("Company", firma, "default_holiday_list") if firma else None
			if not liste:
				firma = frappe.defaults.get_global_default("company")
				liste = frappe.db.get_value("Company", firma, "default_holiday_list") if firma else None
			if liste:
				tage = frappe.get_all("Holiday", filters={"parent": liste, "parenttype": "Holiday List", "holiday_date": ["between", [von, bis]]}, pluck="holiday_date")
				# Wochenenden stehen in HRMS oft ebenfalls in der Holiday List – sie sind durch die Arbeitszeiten ohnehin frei
				return sorted({str(t) for t in tage})
		except Exception:
			frappe.log_error(title="ÖkoInvest: Holiday List nicht lesbar")
	from oekoinvest_app.plattform.api.hr import einstellungen

	return [t for t in (einstellungen().get("feiertage") or []) if von <= t <= bis]


def abwesenheiten_abgleichen():
	"""Täglich: genehmigte Leave Applications → Plattform Abwesenheit (quelle „hrms“) inkl. automatischer Vertretung."""
	if not aktiv("hrms"):
		return 0
	from oekoinvest_app.plattform.api.hr import abwesenheit_uebernehmen

	anzahl = 0
	ab = add_days(nowdate(), -1)
	for m in frappe.get_all("Plattform Mitarbeiter", filters={"aktiv": 1}, fields=["konto_id", "employee"]):
		emp = m.employee or employee_fuer_konto(m.konto_id)
		if not emp:
			continue
		for la in frappe.get_all("Leave Application", filters={"employee": emp, "status": "Approved", "docstatus": 1, "to_date": [">=", ab]}, fields=["name", "from_date", "to_date", "leave_type"]):
			if frappe.db.exists("Plattform Abwesenheit", {"leave_application": la.name}):
				continue
			try:
				abwesenheit_uebernehmen(m.konto_id, str(la.from_date), str(la.to_date), "urlaub", quelle="hrms", leave_application=la.name, bemerkung=la.leave_type or "")
				anzahl += 1
			except Exception:
				frappe.log_error(title="ÖkoInvest: Leave Application nicht übernommen", message=la.name)
	return anzahl


def timesheet_anlegen(zeit):
	"""Zeiteintrag → Timesheet-Entwurf (docstatus 0) des Employees; Projekt nur, wenn ERPNext-Projekt existiert."""
	if not aktiv("hrms"):
		return None
	emp = employee_fuer_konto(zeit.konto_id)
	if not emp:
		return None
	try:
		start = datetime.combine(getdate(zeit.datum), datetime.min.time()).replace(hour=8)
		log = {"from_time": start, "to_time": start + timedelta(hours=float(zeit.stunden)), "hours": float(zeit.stunden), "description": f"{zeit.taetigkeit}: {zeit.text or ''} ({zeit.projekt_id or ''})".strip()}
		aktivitaet = frappe.conf.get("oekoinvest_timesheet_aktivitaet")
		if aktivitaet and frappe.db.exists("Activity Type", aktivitaet):
			log["activity_type"] = aktivitaet
		if zeit.erp_projekt and frappe.db.exists("Project", zeit.erp_projekt):
			log["project"] = zeit.erp_projekt
		ts = frappe.get_doc({"doctype": "Timesheet", "employee": emp, "time_logs": [log]})
		ts.flags.ignore_permissions = True
		ts.insert(ignore_permissions=True)
		return ts.name
	except Exception:
		frappe.log_error(title="ÖkoInvest: Timesheet nicht angelegt", message=zeit.name)
		return None
