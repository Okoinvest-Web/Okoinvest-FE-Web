# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Monatsbericht – Single für das Druckformat „Monatsbericht Backoffice“ (Kennzahlen je Monat).

import re

import frappe
from frappe.model.document import Document


class PlattformMonatsbericht(Document):
	def validate(self):
		self.monat = (self.monat or "").strip()
		if self.monat and not re.match(r"^20\d\d-(0[1-9]|1[0-2])$", self.monat):
			frappe.throw("Bitte den Monat im Format JJJJ-MM angeben, z. B. 2026-09.")
