# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform CRM Kontakt – CRM-Kontakt
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformCRMKontakt(PlattformDokument):
	def validate(self):
		from oekoinvest_app.plattform.konstanten import DOCTYPE

		self.email = (self.email or "").strip().lower() or None
		for b in self.bezuege or []:
			b.bezug_doctype = DOCTYPE.get(b.art)

