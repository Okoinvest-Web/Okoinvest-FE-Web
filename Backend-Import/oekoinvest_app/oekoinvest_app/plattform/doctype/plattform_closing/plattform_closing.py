# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Closing – Closing-Raum je Deal nach Zuschlag bzw. angenommener LOI: Struktur (Asset/Share), Signing-Checkliste, Closing Conditions, Notartermin, Kaufpreiszahlung, Übergabe, Provision.
# Kennung CL-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/closing.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk lesen bzw. Stammdaten pflegen.

from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformClosing(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Closing", "CL")
