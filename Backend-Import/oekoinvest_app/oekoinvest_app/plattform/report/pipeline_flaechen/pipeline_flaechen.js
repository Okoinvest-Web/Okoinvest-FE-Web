// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „Pipeline Flaechen“ (Logik serverseitig in pipeline_flaechen.py)

frappe.query_reports["Pipeline Flaechen"] = {
	filters: [
		{fieldname: "ansicht", label: __("Ansicht"), fieldtype: "Select", options: "Zusammenfassung\nListe", default: "Zusammenfassung"},
		{fieldname: "land", label: __("Land"), fieldtype: "Select", options: "\nDE\nAT\nCH"},
		{fieldname: "zustaendig_id", label: __("Zuständig"), fieldtype: "Link", options: "Plattform Konto"},
		{fieldname: "nur_agri", label: __("Nur Agri-PV"), fieldtype: "Check"},
		{fieldname: "mit_abgelehnt", label: __("Abgelehnte einbeziehen"), fieldtype: "Check"},
	],
};
