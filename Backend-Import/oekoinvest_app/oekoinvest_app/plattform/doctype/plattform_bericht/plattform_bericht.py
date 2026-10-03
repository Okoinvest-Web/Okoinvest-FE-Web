# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Bericht – Bericht-Baustein (Welle 2, Paket B4).
#  - Gespeichert wird nur der SHA-256 des Tokens (token_hash), nie der Klartext.
#  - Keine Personendaten: nur der Verweis lead_person auf Plattform Lead Person (B3, löschbar nach Art. 17).
#  - Pflege nur über plattform/api/bericht.py; abgelaufene Berichte werden zu Grabsteinen verkürzt.

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


class PlattformBericht(Document):
	def autoname(self):
		jahr = now_datetime().strftime("%y")
		for _ in range(25):
			name = f"BR-{jahr}-" + "".join(secrets.choice(ALPHABET) for _ in range(8))
			if not frappe.db.exists("Plattform Bericht", name):
				self.name = name
				return
		frappe.throw("Kennung konnte nicht erzeugt werden.")


def on_doctype_update():
	frappe.db.add_index("Plattform Bericht", ["ablauf"])
