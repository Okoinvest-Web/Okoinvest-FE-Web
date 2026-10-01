# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Abrechnung Einstellung – je Gemeinschaft ein Datensatz (Name = Gemeinschafts-ID). Pflege nur über plattform/api/eg_abrechnung.py (WP4).

import frappe
from frappe.model.document import Document


class PlattformEGAbrechnungEinstellung(Document):
	def autoname(self):
		self.name = self.gemeinschaft

	def on_trash(self):
		frappe.throw("Abrechnungseinstellungen enthalten Nummernkreise und Prüfvermerke und können nicht gelöscht werden.", frappe.PermissionError)
