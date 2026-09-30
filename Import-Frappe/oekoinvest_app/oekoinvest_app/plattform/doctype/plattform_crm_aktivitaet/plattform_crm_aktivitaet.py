# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform CRM Aktivitaet – CRM-Aktivität
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformCRMAktivitaet(PlattformDokument):
	def validate(self):
		from oekoinvest_app.plattform.konstanten import DOCTYPE

		self.bezug_doctype = DOCTYPE.get(self.bezug_art) if self.bezug_art else None
		if not self.bezug_art:
			self.bezug_id = None

