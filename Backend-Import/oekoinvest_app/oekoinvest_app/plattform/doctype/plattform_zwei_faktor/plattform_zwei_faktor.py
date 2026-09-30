# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Zwei Faktor – TOTP-Zwei-Faktor je Konto (genau einer; Kennung = Konto-ID).
# geheimnis/ausstehend sind Password-Felder (verschlüsselt mit dem encryption_key der Site), gelesen nur mit
# doc.get_password(); Wiederherstellungscodes nur als SHA-256. Pflege ausschließlich über api/sicherheit.py.

import frappe
from frappe.model.document import Document


class PlattformZweiFaktor(Document):
	def autoname(self):
		self.name = self.nutzer_id

	def validate(self):
		if not self.nutzer_id:
			frappe.throw("Konto fehlt.")
		if not self.is_new() and self.has_value_changed("nutzer_id"):
			frappe.throw("Das Konto kann nicht geändert werden.", frappe.PermissionError)
