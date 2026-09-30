// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Boerse Trichter“ (Logik serverseitig in boerse_trichter.py)

frappe.query_reports["Boerse Trichter"] = {
	filters: [
		{fieldname: "von", label: __("Veröffentlicht ab"), fieldtype: "Date"},
		{fieldname: "bis", label: __("Veröffentlicht bis"), fieldtype: "Date"},
		{fieldname: "typ", label: __("Projektart"), fieldtype: "Select", options: "\nfreiflaeche\nagri\ncarport\nspeicher\nhybrid\ndach"},
		{fieldname: "land", label: __("Land"), fieldtype: "Select", options: "\nDE\nAT\nCH"},
	],
};
