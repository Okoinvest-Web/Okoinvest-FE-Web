// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Offene Stoerungen“ (Logik serverseitig in offene_stoerungen.py)

frappe.query_reports["Offene Stoerungen"] = {
	filters: [
		{fieldname: "anlage_id", label: __("Anlage"), fieldtype: "Link", options: "Plattform Anlage"},
		{fieldname: "schwere_ab", label: __("Schwere ab"), fieldtype: "Select", options: "info\nniedrig\nmittel\nhoch\nkritisch", default: "info"},
		{fieldname: "nur_unquittiert", label: __("Nur nicht quittierte"), fieldtype: "Check"},
	],
};
