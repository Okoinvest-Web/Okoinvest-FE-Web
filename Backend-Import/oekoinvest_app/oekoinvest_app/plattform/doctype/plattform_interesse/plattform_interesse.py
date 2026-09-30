# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Interesse – genau ein Interesse je (Projekt, Investor) (Automat „interesse“).

import frappe

from oekoinvest_app.plattform.basis import StatusDokument


class PlattformInteresse(StatusDokument):
	prozess_art = "interesse"

	def validate(self):
		self.status_pruefen()
		if self.is_new() and frappe.db.exists("Plattform Interesse", {"projekt_id": self.projekt_id, "investor_id": self.investor_id}):
			frappe.throw("Für dieses Projekt besteht bereits ein Interesse.", frappe.DuplicateEntryError)


def on_doctype_update():
	frappe.db.add_unique("Plattform Interesse", ["projekt_id", "investor_id"], constraint_name="projekt_investor_eindeutig")
