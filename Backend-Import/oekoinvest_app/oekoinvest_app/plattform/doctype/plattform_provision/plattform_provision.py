# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Provision – entsteht automatisch beim Verkauf eines Projekts (Automat „provision“).

import math

import frappe
from frappe.utils import flt

from oekoinvest_app.plattform.basis import StatusDokument
from oekoinvest_app.plattform.konstanten import PROVISION_MAX, PROVISION_MIN


class PlattformProvision(StatusDokument):
	prozess_art = "provision"

	def validate(self):
		self.status_pruefen()
		satz = flt(self.satz)
		if not (PROVISION_MIN - 1e-9 <= satz <= PROVISION_MAX + 1e-9):
			frappe.throw("Provisionssatz muss zwischen 1,5 und 3 % liegen.")
		if flt(self.kaufpreis) <= 0:
			frappe.throw("Kaufpreis fehlt.")
		# betrag = round(kaufpreis × satz) – immer aus den Grundlagen berechnet
		self.betrag = math.floor(flt(self.kaufpreis) * satz + 0.5)
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and (flt(alt.kaufpreis) != flt(self.kaufpreis) or flt(alt.satz) != satz or alt.projekt_id != self.projekt_id):
				frappe.throw("Kaufpreis, Satz und Projekt einer Provision sind unveränderlich – bitte stornieren und neu erfassen.")
