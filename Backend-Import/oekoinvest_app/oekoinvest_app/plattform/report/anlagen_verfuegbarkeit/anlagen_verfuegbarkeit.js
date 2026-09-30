// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Anlagen Verfuegbarkeit“ (Logik serverseitig in anlagen_verfuegbarkeit.py)

frappe.query_reports["Anlagen Verfuegbarkeit"] = {
	filters: [
		{fieldname: "von", label: __("Von"), fieldtype: "Date", default: frappe.datetime.add_days(frappe.datetime.get_today(), -30)},
		{fieldname: "bis", label: __("Bis"), fieldtype: "Date", default: frappe.datetime.get_today()},
		{fieldname: "anlage_id", label: __("Anlage"), fieldtype: "Link", options: "Plattform Anlage"},
		{fieldname: "alle_status", label: __("Auch Anlagen außer Betrieb"), fieldtype: "Check"},
	],
};
