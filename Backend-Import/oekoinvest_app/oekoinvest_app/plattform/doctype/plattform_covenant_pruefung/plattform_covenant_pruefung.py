# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Covenant Pruefung – Ergebnis der Covenant-Prüfung (DSCR rollierend 12 Monate, LLCR, Ampel) aus Zählerwerten der Anlage – append-only, täglich per Scheduler.
# Finanzierung (plattform/api/finanzierung.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformCovenantPruefung(PlattformDokument):
	"""Append-only: Prüfergebnisse werden nie geändert oder gelöscht (Nachweis gegenüber der Bank)."""

	def validate(self):
		if not self.is_new():
			frappe.throw("Covenant-Prüfungen sind unveränderlich.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Covenant-Prüfungen können nicht gelöscht werden.", frappe.PermissionError)
