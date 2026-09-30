# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Token – Einmal-Token (nur SHA-256-Hash gespeichert). Erzeugung/Einlösung: kern.token_anlegen/-einloesen.

import frappe
from frappe.model.document import Document


class PlattformToken(Document):
	def validate(self):
		if not self.hash or len(self.hash) != 64:
			frappe.throw("Ungültiger Token-Hash.")
