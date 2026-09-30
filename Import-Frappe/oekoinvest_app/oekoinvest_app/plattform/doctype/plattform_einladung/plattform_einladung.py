# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Einladung – Einladung in eine Organisation. Gespeichert wird nur der SHA-256-Hash des Tokens.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import EINLADUNG_ROLLEN


class PlattformEinladung(PlattformDokument):
	def validate(self):
		if not self.hash or len(self.hash) != 64:
			frappe.throw("Ungültiger Token-Hash.")
		if self.rolle not in EINLADUNG_ROLLEN:
			frappe.throw("Unbekannte Teamrolle.")
		self.email = (self.email or "").strip().lower()


def on_doctype_update():
	frappe.db.add_index("Plattform Einladung", ["organisation_id", "status"])
