# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Automation Regel – Automationsregel
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAutomationRegel(PlattformDokument):
	def validate(self):
		from oekoinvest_app.plattform.backoffice import regel_bereinigen

		r = regel_bereinigen({"name": self.bezeichnung, "aktiv": bool(self.aktiv), "beschreibung": self.beschreibung, "ausloeser": frappe.parse_json(self.ausloeser or "{}"), "bedingungen": frappe.parse_json(self.bedingungen or "[]"), "aktionen": frappe.parse_json(self.aktionen or "[]")})
		if r.get("fehler"):
			frappe.throw(r["fehler"])

