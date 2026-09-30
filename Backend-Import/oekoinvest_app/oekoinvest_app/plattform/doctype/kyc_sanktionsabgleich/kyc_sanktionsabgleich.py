# Copyright (c) 2026, ÖkoInvest GmbH
#
# Protokoll eines Sanktionsabgleichs – append-only (keine Änderung, kein Löschen außer Fristen-Job).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class KYCSanktionsabgleich(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw("Abgleich-Protokolle können nicht geändert werden.")

	def on_trash(self):
		if not self.flags.kyc_loeschen:
			frappe.throw("Abgleich-Protokolle können nicht gelöscht werden.")
