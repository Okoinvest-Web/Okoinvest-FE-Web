# Copyright (c) 2026, ÖkoInvest GmbH
# Rolle der Plattform: Website-Kennung ↔ Frappe-Rolle (Stammdaten, gepflegt durch installation.stammdaten_anlegen).

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.konstanten import ALLE_ROLLEN_IDS


class PlattformRolle(Document):
	def validate(self):
		if self.rolle_id not in ALLE_ROLLEN_IDS:
			frappe.throw("Unbekannte Rollen-ID – Rollen werden im Code gepflegt (plattform/konstanten.py).")
		if self.rolle_id == "admin":
			self.selbst_waehlbar = 0
