# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Term Sheet – Indikatives Finanzierungsangebot (Term Sheet) einer Bank – von der Bank im Portal abgegeben oder im Backoffice erfasst.
# Finanzierung (plattform/api/finanzierung.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import aus_json


class PlattformTermSheet(PlattformDokument):
	def validate(self):
		from oekoinvest_app.plattform.finanzierung_kern import FinanzierungFehler, termsheet_bereinigen

		try:
			termsheet_bereinigen(aus_json(self.termsheet, {}) or {})
		except FinanzierungFehler as e:
			frappe.throw(str(e))
