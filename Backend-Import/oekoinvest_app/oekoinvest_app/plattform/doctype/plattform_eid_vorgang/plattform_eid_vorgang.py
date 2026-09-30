# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform eID Vorgang – Anmeldung mit staatlicher eID (ID Austria, Online-Ausweis). state/nonce/Browser-Bindung nur als
# SHA-256, PKCE-Verifier verschlüsselt (Password) und nach dem Abschluss gelöscht, bPK nur als HMAC. Ergebnisse sind Hinweise
# für den KYC-Fall – die Entscheidung trifft die Compliance.
# Kennung EI-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eid.py; im Desk nur lesen.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformeIDVorgang(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform eID Vorgang", "EI")

	def on_trash(self):
		if not frappe.flags.dienste_aufbewahrung:
			frappe.throw("Nachweise der Dienste werden nur über das Löschkonzept (Aufbewahrungsfrist) entfernt.", frappe.PermissionError)
