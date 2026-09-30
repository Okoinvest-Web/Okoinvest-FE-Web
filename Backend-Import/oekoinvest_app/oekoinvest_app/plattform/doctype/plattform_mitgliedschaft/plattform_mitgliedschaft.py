# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Mitgliedschaft – genau eine je (Organisation, Konto); genau ein Inhaber je Organisation (API).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import TEAM_ROLLEN


class PlattformMitgliedschaft(PlattformDokument):
	def validate(self):
		if self.rolle not in TEAM_ROLLEN:
			frappe.throw("Unbekannte Teamrolle.")
		doppelt = frappe.db.exists(
			"Plattform Mitgliedschaft",
			{"organisation_id": self.organisation_id, "nutzer_id": self.nutzer_id, "name": ("!=", self.name or "")},
		)
		if doppelt:
			frappe.throw("Diese Person ist bereits Mitglied.", frappe.DuplicateEntryError)


def on_doctype_update():
	frappe.db.add_unique("Plattform Mitgliedschaft", ["organisation_id", "nutzer_id"], constraint_name="organisation_nutzer_eindeutig")
