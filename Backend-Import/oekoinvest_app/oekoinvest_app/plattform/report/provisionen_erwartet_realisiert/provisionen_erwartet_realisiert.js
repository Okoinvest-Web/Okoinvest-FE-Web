// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Provisionen Erwartet Realisiert“ (Logik serverseitig in provisionen_erwartet_realisiert.py)

frappe.query_reports["Provisionen Erwartet Realisiert"] = {
	filters: [
		{fieldname: "art", label: __("Art"), fieldtype: "Select", options: "Alle\nRealisiert\nErwartet", default: "Alle"},
	],
};
