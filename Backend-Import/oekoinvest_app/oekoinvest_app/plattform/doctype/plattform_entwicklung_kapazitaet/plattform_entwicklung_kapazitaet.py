# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Entwicklung Kapazitaet – Kapazität je Projektleitung (Steuerung der Projektentwicklung).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.entwicklung_steuerung_kern import KAPAZITAET


class PlattformEntwicklungKapazitaet(PlattformDokument):
	def validate(self):
		if not KAPAZITAET["min"] <= int(self.stunden_monat or 0) <= KAPAZITAET["max"]:
			frappe.throw(f"Bitte Stunden je Monat zwischen {KAPAZITAET['min']} und {KAPAZITAET['max']} angeben.")
