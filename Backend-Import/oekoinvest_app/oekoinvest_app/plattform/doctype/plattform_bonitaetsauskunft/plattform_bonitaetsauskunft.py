# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Bonitaetsauskunft – Bonitätsauskunft einer Auskunftei (KSV1870, Creditreform, CRIF, Dun & Bradstreet) vor LOI/Gebot. Ergebnisse nur für Leitung, Transaktion und Compliance; Betroffene werden ohne Ergebnis informiert. Keine automatisierte Entscheidung.
# Kennung BA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/dienste.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk nur lesen.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformBonitaetsauskunft(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Bonitaetsauskunft", "BA")

	def on_trash(self):
		if not frappe.flags.dienste_aufbewahrung:
			frappe.throw("Nachweise der Dienste werden nur über das Löschkonzept (Aufbewahrungsfrist) entfernt.", frappe.PermissionError)
