# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Portfolio Position – Position im Investor-Portfolio nach dem Kauf (Bestandsanlage, Projektkauf, Co-Development) – Ertrag Soll/Ist, Covenants, Wiederverkauf.
# Portfolio (plattform/api/portfolio.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformPortfolioPosition(PlattformDokument):
	"""Status nur entlang des Automaten (portfolio_kern.UEBERGAENGE); Pflege über plattform/api/portfolio.py."""

	def validate(self):
		from oekoinvest_app.plattform.portfolio_kern import STATUS, UEBERGAENGE

		if self.status not in STATUS:
			frappe.throw("Unbekannter Status.", frappe.ValidationError)
		if self.is_new():
			return
		alt = self.get_doc_before_save()
		if alt and alt.status != self.status and self.status not in UEBERGAENGE.get(alt.status, []):
			frappe.throw(f"Statuswechsel von „{STATUS[alt.status][0]}“ nach „{STATUS[self.status][0]}“ ist nicht vorgesehen.", frappe.ValidationError)

	def on_trash(self):
		if frappe.db.exists("Plattform Ausschuettung", {"position_id": self.name}) or frappe.db.exists("Plattform Kapitalabruf", {"position_id": self.name}):
			frappe.throw("Positionen mit Ausschüttungen oder Kapitalabrufen können nicht gelöscht werden (Nachweis).", frappe.PermissionError)
