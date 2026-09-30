# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Identitaetspruefung – Online-Identifizierung über einen Identitätsanbieter (Sitzung, Webhook-Ergebnis) bzw. automatische MRZ-Vorprüfung (ICAO 9303). Ergebnisse sind Hinweise für den KYC-Fall – die Entscheidung trifft die Compliance. Die MRZ selbst wird nicht gespeichert.
# Kennung IP-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/dienste.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk nur lesen.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformIdentitaetspruefung(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Identitaetspruefung", "IP")

	def on_trash(self):
		if not frappe.flags.dienste_aufbewahrung:
			frappe.throw("Nachweise der Dienste werden nur über das Löschkonzept (Aufbewahrungsfrist) entfernt.", frappe.PermissionError)
