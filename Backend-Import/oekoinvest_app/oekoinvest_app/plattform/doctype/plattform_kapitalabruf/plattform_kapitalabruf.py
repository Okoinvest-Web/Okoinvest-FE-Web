# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kapitalabruf – Kapitalabruf (Capital Call) einer Co-Development- bzw. Projektbeteiligung – Frist ≥ 10 Tage, ≤ offene Zusage.
# Portfolio (plattform/api/portfolio.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformKapitalabruf(PlattformDokument):
	"""Status nur angekündigt → gemeldet → bezahlt bzw. → storniert; Betrag nach dem Anlegen unveränderlich; nie löschen."""

	UEBERGAENGE = {"angekuendigt": ["gemeldet", "bezahlt", "storniert"], "gemeldet": ["bezahlt", "storniert"], "bezahlt": [], "storniert": []}

	def validate(self):
		if self.is_new():
			if self.status != "angekuendigt":
				frappe.throw("Neue Kapitalabrufe beginnen im Status „angekündigt“.", frappe.ValidationError)
			return
		alt = self.get_doc_before_save()
		if not alt:
			return
		if float(alt.betrag or 0) != float(self.betrag or 0):
			frappe.throw("Der Betrag eines Kapitalabrufs ist unveränderlich – bitte stornieren und neu anlegen.", frappe.ValidationError)
		if alt.status != self.status and self.status not in self.UEBERGAENGE.get(alt.status, []):
			frappe.throw("Dieser Statuswechsel ist nicht vorgesehen.", frappe.ValidationError)

	def on_trash(self):
		frappe.throw("Kapitalabrufe können nicht gelöscht werden (Nachweis) – bitte stornieren.", frappe.PermissionError)
