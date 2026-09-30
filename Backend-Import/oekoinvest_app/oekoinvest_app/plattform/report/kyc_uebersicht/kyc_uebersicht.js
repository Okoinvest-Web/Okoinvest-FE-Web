// Copyright (c) 2026, ÖkoInvest GmbH
// Filter des Berichts „KYC Uebersicht“ (Logik serverseitig in kyc_uebersicht.py)

frappe.query_reports["KYC Uebersicht"] = {
	filters: [
		{fieldname: "rolle", label: __("Rolle"), fieldtype: "Select", options: "\ninvestor\nanbieter\nunternehmen\nflaeche\nlandwirt"},
		{fieldname: "status", label: __("KYC-Status"), fieldtype: "Data"},
	],
};
