# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kreditvertrag – Kreditvertrag nach der Bankentscheidung – Grundlage für Tilgungsplan, Covenant-Monitoring und Bank-Reporting.
# Finanzierung (plattform/api/finanzierung.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformKreditvertrag(PlattformDokument):
	def validate(self):
		if (self.dscr_lockup or 0) and (self.dscr_covenant or 0) and self.dscr_lockup < self.dscr_covenant:
			frappe.throw("Der Lock-up-DSCR muss mindestens so hoch sein wie der Covenant-DSCR.")
		if (self.betrag or 0) <= 0:
			frappe.throw("Bitte den Kreditbetrag angeben.")
