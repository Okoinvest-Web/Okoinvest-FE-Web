# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Gemeinde Potenzial – gepflegte Angaben des Gemeinde-Screenings (Stand Bauleitplanung, Kriterienkatalog,
# Konkurrenzhinweise mit Quelle, Übergabe an die Kommune-Ansprache). Ranking berechnet plattform/akquise_kampagne_kern.py.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Kampagne": "AQ", "Plattform Kampagnenziel": "AQZ", "Plattform Sperrliste": "SL", "Plattform Gemeinde Potenzial": "GP"})


class PlattformGemeindePotenzial(PlattformDokument):
	def validate(self):
		for x in frappe.parse_json(self.konkurrenz or "[]") or []:
			if len(str(x.get("quelle") or "").strip()) < 3:
				frappe.throw("Konkurrenzhinweise nur mit Quelle.")
