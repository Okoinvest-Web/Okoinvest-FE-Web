# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kampagnenziel – Zielfläche einer Akquise-Kampagne mit Empfängern (Kindtabelle Plattform Kampagnenempfaenger).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.doctype.plattform_akquise_ziel.plattform_akquise_ziel import geometrie_pruefen
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Kampagne": "AQ", "Plattform Kampagnenziel": "AQZ", "Plattform Sperrliste": "SL", "Plattform Gemeinde Potenzial": "GP"})


class PlattformKampagnenziel(PlattformDokument):
	def validate(self):
		fehler = geometrie_pruefen(self.geometrie)
		if fehler:
			frappe.throw(fehler)
		codes = [e.code for e in self.empfaenger if e.code]
		if len(codes) != len(set(codes)):
			frappe.throw("Einmalcodes müssen eindeutig sein.")

	def on_trash(self):
		if not frappe.flags.get("akquise_kampagne_loeschen"):
			frappe.throw("Zielflächen werden mit ihrer Kampagne gelöscht.")
