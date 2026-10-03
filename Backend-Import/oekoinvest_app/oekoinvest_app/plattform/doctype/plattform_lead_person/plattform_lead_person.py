# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Lead Person – Personendaten einer Anfrage, GETRENNT vom Einwilligungsprotokoll (Welle 2, Paket B3).
#  - Anlage nur über plattform/api/einwilligung.py (lead_anlegen), Löschung nach Art. 17 über person_loeschen.
#  - Gekürzte IP (IPv4 /24, IPv6 /48): täglicher Scheduler einwilligung.ip_aufraeumen_taeglich löscht sie nach 30 Tagen.
#  - Keine Versionshistorie (track_changes aus), damit eine Löschung keine Kopie in „Version“ hinterlässt.

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


class PlattformLeadPerson(Document):
	def autoname(self):
		jahr = now_datetime().strftime("%y")
		for _ in range(25):
			name = f"LP-{jahr}-" + "".join(secrets.choice(ALPHABET) for _ in range(8))
			if not frappe.db.exists("Plattform Lead Person", name):
				self.name = name
				return
		frappe.throw("Kennung konnte nicht erzeugt werden.")


def on_doctype_update():
	frappe.db.add_index("Plattform Lead Person", ["pseudonym"])
	frappe.db.add_index("Plattform Lead Person", ["ip_loeschen_ab"])
