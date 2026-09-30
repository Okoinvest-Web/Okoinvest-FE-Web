# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Sitzung – Website-Sitzung; Kennung S-JJ-XXXXXXXXXX (10 zufällige Zeichen) steht im signierten Cookie.
# Entsteht nur über api/sicherheit.sitzung_anlegen; widerrufen = widerrufen_am gesetzt (nie reaktivierbar).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import neue_id


class PlattformSitzung(PlattformDokument):
	def autoname(self):
		self.name = neue_id(self.doctype, 10)

	def validate(self):
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and alt.widerrufen_am and not self.widerrufen_am:
				frappe.throw("Eine widerrufene Sitzung kann nicht reaktiviert werden.", frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Sitzung", ["nutzer_id", "widerrufen_am"])
