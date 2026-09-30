# Copyright (c) 2026, ÖkoInvest GmbH

import json

import frappe
from frappe.model.document import Document


class KYCEinstellungen(Document):
	def validate(self):
		if self.einstellungen_json:
			try:
				json.loads(self.einstellungen_json)
			except ValueError:
				frappe.throw("Einstellungen: ungültiges JSON.")
