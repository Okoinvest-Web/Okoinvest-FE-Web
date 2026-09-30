# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Messpunkt – Messpunkt/Zähler einer Anlage. Abrechnungsrelevant NUR mit geeichter Messstelle bzw. Smart-Meter-Gateway – MQTT-Werte sind Monitoring (Controller erzwingt das).
# Anlagen & Monitoring (plattform/api/anlagen.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformMesspunkt(PlattformDokument):
	def validate(self):
		# Abrechnung nur mit geeichter Messstelle / Smart-Meter-Gateway – MQTT-Werte sind reines Monitoring
		if self.abrechnungsrelevant and self.messstelle != "geeicht":
			frappe.throw("Abrechnungsrelevant sind nur geeichte Messstellen bzw. Smart-Meter-Gateways.", frappe.ValidationError)
