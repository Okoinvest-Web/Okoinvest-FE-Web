# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Anbieter Akte – je Projekt (Name = Projekt-ID): Vermittlungsauftrag, Prüfpunkte (Rückfragen/Nachbesserung),
# Stellungnahmen des Verkäufers zu LOIs, Vorkenntnis-Meldungen, Bestandsanlage (Ertragshistorie, Verträge, Förderung, DD).
# Geschrieben ausschließlich über plattform/api/anbieter.py (Regeln: plattform/anbieter_kern.py).

import frappe  # noqa: F401
from frappe.model.document import Document


class PlattformAnbieterAkte(Document):
	def autoname(self):
		self.name = self.projekt_id
