# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Automation Lauf – Ausführungsprotokoll (append-only)
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAutomationLauf(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw("Das Ausführungsprotokoll kann nicht verändert werden.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Einträge des Ausführungsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

