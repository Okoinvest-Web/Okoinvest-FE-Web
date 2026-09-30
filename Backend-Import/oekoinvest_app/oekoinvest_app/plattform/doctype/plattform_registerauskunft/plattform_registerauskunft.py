# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Registerauskunft – Abruf aus Firmenbuch (AT), Handelsregister (DE) oder Zefix (CH) mit Abrufdatum, Quelle und Zweck; optional als Hinweis im KYC-Fall hinterlegt.
# Kennung RA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/dienste.py
# (Rechte je Bereich, siehe plattform/rechte.py); im Desk nur lesen.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.dienste_kern import neue_kennung


class PlattformRegisterauskunft(Document):
	def autoname(self):
		if not self.name or self.name.startswith("new-"):
			self.name = neue_kennung("Plattform Registerauskunft", "RA")

	def on_trash(self):
		if not frappe.flags.dienste_aufbewahrung:
			frappe.throw("Nachweise der Dienste werden nur über das Löschkonzept (Aufbewahrungsfrist) entfernt.", frappe.PermissionError)
