# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC Fall – Status nur entlang des KYC-Automaten (kyc_kern.UEBERGAENGE):
#  - Über die Plattform-Methoden (api/kyc.py) ist der Übergang geprüft und per Flag `kyc_uebergang` angekündigt.
#  - Im Desk (Workflow „KYC Prüfung“) nur Compliance-Übergänge; „verifiziert“ nur mit geprüften Unterlagen, ohne offenen
#    Sanktionstreffer und – bei hohem Risiko – mit Zweitfreigabe durch eine andere Person (gleiche Regeln wie die API).
#  - Löschen nur durch den Fristen-Job (Flag `kyc_loeschen`).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kyc_kern import uebergang_erlaubt


class KYCFall(PlattformDokument):
	def validate(self):
		if self.is_new():
			if self.status not in ("offen",) and not self.flags.kyc_uebergang:
				frappe.throw("Ein KYC-Fall beginnt im Status „offen“.")
			return
		alt = self.get_doc_before_save()
		if not alt or alt.status == self.status or self.flags.kyc_uebergang:
			return
		if not uebergang_erlaubt(alt.status, self.status, "compliance"):
			frappe.throw(f"Statuswechsel {alt.status} → {self.status} ist im Desk nicht möglich.")
		from oekoinvest_app.plattform.api.kyc import desk_entscheidung_pruefen

		desk_entscheidung_pruefen(self, alt.status)

	def on_trash(self):
		if not self.flags.kyc_loeschen:
			frappe.throw("KYC-Fälle werden nur nach Ablauf der Aufbewahrungsfrist automatisch gelöscht.")
