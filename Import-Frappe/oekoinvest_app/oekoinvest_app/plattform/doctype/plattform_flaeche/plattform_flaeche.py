# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Flaeche – Fläche eines Eigentümers/Landwirts (Automat „flaeche“).

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.basis import StatusDokument
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER


class PlattformFlaeche(StatusDokument):
	prozess_art = "flaeche"

	def validate(self):
		self.status_pruefen()
		if flt(self.ha) < 0 or flt(self.ha) > 100000:
			frappe.throw("Größe in Hektar ist ungültig.")
		if self.bundesland and self.bundesland not in BUNDESLAENDER.get(self.land or "DE", []):
			frappe.throw("Bundesland / Kanton passt nicht zum Land.")
		if len(self.get("flurstuecke") or []) > 50:
			frappe.throw("Höchstens 50 Flurstücke je Fläche.")
		if self.status == "pachtangebot" and not self.pachtangebot:
			frappe.throw("Für den Status „Pachtangebot“ muss ein Pachtangebot vorliegen.")
