// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Offene Grundbuch Eintragungen“ (Logik serverseitig in offene_grundbuch_eintragungen.py)

frappe.query_reports["Offene Grundbuch Eintragungen"] = {
	filters: [
		{fieldname: "land", label: __("Land"), fieldtype: "Select", options: "\nDE\nAT\nCH"},
		{fieldname: "nur_ueberfaellig", label: __("Nur überfällige"), fieldtype: "Check"},
	],
};
