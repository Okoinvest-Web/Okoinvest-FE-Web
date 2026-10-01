# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG EDA Prozess – EDA-Prozess einer Energiegemeinschaft (WP2, Fachkonzept 3.14). Zustandsautomat in
# plattform/eg_eda_kern.py (= src/lib/plattform/eg/eda/automat.js); geschrieben wird nur über plattform/api/eg_eda.py.
# Teilnahme-Status ändert dieser Prozess nie selbst, sondern über eg_stamm.teilnahme_uebergang_intern (WP1).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform EG EDA Prozess": "EDP", "Plattform EG EDA Nachricht": "EDN"})


class PlattformEGEDAProzess(PlattformDokument):
	def validate(self):
		if self.is_new() or frappe.flags.get("eg_eda_api"):
			return
		alt = self.get_doc_before_save()
		if alt and (alt.status != self.status or alt.freigabe_status != self.freigabe_status):
			frappe.throw("Status und Freigabe eines EDA-Prozesses ändern sich nur über die Plattform (Zustandsautomat, Vier-Augen-Prinzip).")

	def on_trash(self):
		if not frappe.flags.get("eg_eda_api"):
			frappe.throw("EDA-Prozesse werden nicht gelöscht (Nachweis gegenüber Netzbetreiber und Mitgliedern).")
