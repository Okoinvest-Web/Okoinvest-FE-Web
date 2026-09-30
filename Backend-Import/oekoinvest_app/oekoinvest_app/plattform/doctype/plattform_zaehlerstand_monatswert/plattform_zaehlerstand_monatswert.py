# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Zaehlerstand Monatswert – Zählerstand am Monatsende je abrechnungsrelevantem Messpunkt und Register (OBIS) – Grundlage der Contracting-Abrechnung. Stände müssen steigen.
# Anlagen & Monitoring (plattform/api/anlagen.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformZaehlerstandMonatswert(PlattformDokument):
	def validate(self):
		vorher = frappe.get_all(
			"Plattform Zaehlerstand Monatswert",
			filters={"messpunkt_id": self.messpunkt_id, "register": self.register, "monat": ["<", self.monat], "name": ["!=", self.name or ""]},
			fields=["monat", "stand"],
			order_by="monat desc",
			limit=1,
		)
		if vorher and float(self.stand) < float(vorher[0].stand):
			frappe.throw(f"Zählerstand kleiner als im Vormonat ({vorher[0].monat}).", frappe.ValidationError)
		self.menge = (float(self.stand) - float(vorher[0].stand)) if vorher else None
