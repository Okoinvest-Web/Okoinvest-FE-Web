# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kostenstand – Festgeschriebener Kostenstand (Schätzung, Kostenrahmen, Kostenberechnung, Angebote, Vergabe, Abrechnung) – append-only, Historie der Kalkulation.
# Planungsdateien & Projektkosten (plattform/api/planung.py). Daten über die API; Rechte (Rolle UND Eigentum) prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformKostenstand(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw("Ein festgeschriebener Kostenstand ist unveränderlich – bitte einen neuen Stand festschreiben.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Kostenstände können nicht gelöscht werden.", frappe.PermissionError)
