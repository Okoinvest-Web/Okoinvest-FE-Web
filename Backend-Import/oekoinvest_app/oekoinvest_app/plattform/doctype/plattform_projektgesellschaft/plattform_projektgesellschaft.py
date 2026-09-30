# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Projektgesellschaft – Projektgesellschaft (SPV) bzw. Gruppengesellschaft: Gründung aus einem Entwicklungsprojekt mit Checkliste (Notar, Bank, Register, Steuern, Transparenzregister/WiEReG, Projektrechte), Dokumentenpaket (Muster) und Fristen.
# Kennung PG-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/dienste.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk nur lesen.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformProjektgesellschaft(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Projektgesellschaft", "PG")
