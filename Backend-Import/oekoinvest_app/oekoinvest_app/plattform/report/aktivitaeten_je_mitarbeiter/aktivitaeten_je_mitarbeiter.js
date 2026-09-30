// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Aktivitaeten je Mitarbeiter“ (Logik serverseitig in aktivitaeten_je_mitarbeiter.py)

frappe.query_reports["Aktivitaeten je Mitarbeiter"] = {
	filters: [
		{fieldname: "von", label: __("Von"), fieldtype: "Date", default: frappe.datetime.add_days(frappe.datetime.get_today(), -30)},
		{fieldname: "bis", label: __("Bis"), fieldtype: "Date", default: frappe.datetime.get_today()},
	],
};
