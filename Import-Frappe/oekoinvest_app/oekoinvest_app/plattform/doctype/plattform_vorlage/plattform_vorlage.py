# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Vorlage – Vorlage
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformVorlage(PlattformDokument):
	def validate(self):
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and len(self.versionen or []) < len(alt.versionen or []):
				frappe.throw("Versionen einer Vorlage können nicht gelöscht werden.", frappe.PermissionError)

