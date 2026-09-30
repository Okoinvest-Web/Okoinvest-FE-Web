# Copyright (c) 2026, ÖkoInvest GmbH
#
# Bankverbindung eines KYC-Falls (IBAN-Prüfziffer und Inhaber-Abgleich setzt api/kyc.py).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kyc_kern import iban_pruefen


class KYCBankverbindung(PlattformDokument):
	def validate(self):
		if self.iban and not iban_pruefen(self.iban)["ok"]:
			frappe.throw(iban_pruefen(self.iban)["fehler"])

	def on_trash(self):
		if not self.flags.kyc_loeschen:
			frappe.throw("Bankverbindungen werden nur mit dem KYC-Fall gelöscht.")
