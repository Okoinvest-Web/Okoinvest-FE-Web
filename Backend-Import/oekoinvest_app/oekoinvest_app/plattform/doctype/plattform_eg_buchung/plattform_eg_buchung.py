# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Buchung – Buchung der Vereinsbuchhaltung – nicht löschbar (Aufbewahrung 7 Jahre).
# Kennung: Präfix EBU (Präfix-JJ-XXXXXX, kern.neue_id). Daten nur über plattform/api/eg_abrechnung.py (Rechte prüft die API).

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.kern import PRAEFIX, neue_id

PRAEFIX.setdefault("Plattform EG Buchung", "EBU")


class PlattformEGBuchung(Document):
	def autoname(self):
		self.name = neue_id(self.doctype)

	def on_trash(self):
		frappe.throw("Nachweise der Abrechnung können nicht gelöscht werden (Aufbewahrungspflicht 7 Jahre, § 132 BAO).", frappe.PermissionError)
