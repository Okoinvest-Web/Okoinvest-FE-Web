# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Entwicklung Entscheidung – Entscheidungsprotokoll eines Entwicklungsprojekts (append-only: keine Änderung, kein Löschen).
# Projektentwicklung (plattform/api/entwicklung.py). Das Protokoll ist unveränderlich: Korrekturen als neue Entscheidung.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformEntwicklungEntscheidung(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw("Das Entscheidungsprotokoll ist unveränderlich – bitte eine neue Entscheidung erfassen.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Entscheidungen können nicht gelöscht werden.", frappe.PermissionError)
