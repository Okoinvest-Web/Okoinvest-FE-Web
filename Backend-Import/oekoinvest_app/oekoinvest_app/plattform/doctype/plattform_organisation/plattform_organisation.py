# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Organisation – Firmenkonto/Team. Anlage und Pflege nur über plattform/api/organisation.py.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import ORGANISATION_ARTEN


class PlattformOrganisation(PlattformDokument):
	def validate(self):
		self.titel = (self.titel or "").strip()[:120]
		if len(self.titel) < 2:
			frappe.throw("Bitte geben Sie den Namen der Organisation an.")
		if self.art not in ORGANISATION_ARTEN:
			frappe.throw("Unbekannte Art.")
