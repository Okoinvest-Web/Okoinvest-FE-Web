// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Entwicklungspipeline“ (Logik serverseitig in entwicklungspipeline.py)

frappe.query_reports["Entwicklungspipeline"] = {
	filters: [
		{fieldname: "ansicht", label: __("Ansicht"), fieldtype: "Select", options: "Je Phase\nJe Land\nJe COD-Jahr\nListe", default: "Je Phase"},
		{fieldname: "land", label: __("Land"), fieldtype: "Select", options: "\nDE\nAT\nCH"},
		{fieldname: "typ", label: __("Typ"), fieldtype: "Select", options: "\nfreiflaeche\nagri\ncarport\ndach\nspeicher\nhybrid"},
		{fieldname: "projektleiter_id", label: __("Projektleitung"), fieldtype: "Link", options: "Plattform Konto"},
		{fieldname: "mit_abgeschlossen", label: __("Übergebene/abgebrochene einbeziehen"), fieldtype: "Check"},
	],
};
