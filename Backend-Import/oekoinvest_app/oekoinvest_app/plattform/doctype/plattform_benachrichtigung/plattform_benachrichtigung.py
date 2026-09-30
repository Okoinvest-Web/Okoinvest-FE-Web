# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Benachrichtigung – Ereignis für die Glocke im Portal. Entsteht nur über
# plattform/benachrichtigung.py; nach dem Anlegen ist nur „gelesen“ änderbar.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument

UNVERAENDERLICH = ("nutzer_id", "art", "titel", "text", "link", "objekt_art", "objekt_id", "am")


class PlattformBenachrichtigung(PlattformDokument):
	def validate(self):
		if self.link and not str(self.link).startswith("/portal"):
			self.link = "/portal"
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and any(alt.get(f) != self.get(f) for f in UNVERAENDERLICH):
				frappe.throw("Benachrichtigungen können nicht verändert werden.", frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Benachrichtigung", ["nutzer_id", "gelesen"])
