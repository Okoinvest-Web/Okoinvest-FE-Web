# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Gebot – Verdecktes Gebot eines Investors in einer Runde des Bieterverfahrens.
# Deal-Room (plattform/api/qa.py, bieter.py, dealroom.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformGebot(PlattformDokument):
	def validate(self):
		if self.preis_modus == "gesamt" and not (self.preis and self.preis > 0):
			frappe.throw("Bitte geben Sie einen Gesamtpreis an.")
		if self.preis_modus == "proKwp" and not (self.preis_pro_kwp and self.preis_pro_kwp > 0):
			frappe.throw("Bitte geben Sie einen Preis je kWp an.")


def on_doctype_update():
	frappe.db.add_index("Plattform Gebot", ["verfahren_id", "runde", "interesse_id"])
