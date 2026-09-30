# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Geraet – bekanntes Gerät eines Kontos (nur SHA-256 des Geräte-Cookies).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformGeraet(PlattformDokument):
	def validate(self):
		if self.hash and len(self.hash) != 64:
			frappe.throw("Ungültiger Geräte-Hash.")


def on_doctype_update():
	frappe.db.add_index("Plattform Geraet", ["nutzer_id", "hash"])
