# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Marktpreis Spot – Day-Ahead-Preis je Stunde bzw. Viertelstunde (DE-LU, AT) – Quelle Energy-Charts (Fraunhofer ISE), Daten Bundesnetzagentur | SMARD.de, CC BY 4.0. Täglich per Scheduler.
# Energiebeschaffung (plattform/api/energie.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformMarktpreisSpot(PlattformDokument):
	def validate(self):
		# ein Wert je Zone und Zeitpunkt
		if frappe.db.exists(self.doctype, {'zone': self.zone, 'beginn': self.beginn, 'name': ['!=', self.name]}):
			frappe.throw('Für diese Zone und diesen Zeitpunkt gibt es bereits einen Preis.')
