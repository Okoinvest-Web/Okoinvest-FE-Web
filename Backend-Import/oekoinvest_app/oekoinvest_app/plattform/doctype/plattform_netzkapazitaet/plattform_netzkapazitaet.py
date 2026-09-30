# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Netzkapazitaet – Kapazitätsangabe je Netzknoten (Veröffentlichung oder Auskunft des Netzbetreibers).
# Getrennt von den OSM-Netzknoten (ODbL) gehalten; Pflege über plattform/api/geodaten.py.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Akquise Ziel": "AZ", "Plattform Netzkapazitaet": "NK"})


class PlattformNetzkapazitaet(PlattformDokument):
	def validate(self):
		if not (self.quelle or "").strip():
			frappe.throw("Bitte die Quelle der Kapazitätsangabe angeben.")
		if self.frei_mw is not None and self.frei_mw < 0:
			frappe.throw("Freie Kapazität kann nicht negativ sein.")
