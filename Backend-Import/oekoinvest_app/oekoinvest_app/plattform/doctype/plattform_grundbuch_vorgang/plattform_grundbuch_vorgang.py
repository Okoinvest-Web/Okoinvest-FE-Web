# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Grundbuch Vorgang – Grundbuch-Akte je Grundstück/Dach: Dienstbarkeit bzw. Servitut von Vertrag bis Eintragung (DE/AT/CH), verknüpft mit Fläche (Pacht) oder Anlage (Contracting).
# Kennung GR-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/closing.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk lesen bzw. Stammdaten pflegen.

from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformGrundbuchVorgang(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Grundbuch Vorgang", "GR")
