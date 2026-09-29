# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Nachricht – Thread je (bezug_art, bezug_id); Text, Bezug und Absender nach dem Anlegen unveränderlich.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import DOCTYPE


class PlattformNachricht(PlattformDokument):
	def validate(self):
		self.bezug_doctype = DOCTYPE.get(self.bezug_art)
		if not self.bezug_doctype or self.bezug_art == "provision":
			frappe.throw("Unbekannter Bezug.")
		if not self.text or len(self.text) > 5000:
			frappe.throw("Die Nachricht muss 1 bis 5000 Zeichen lang sein.")
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and (alt.text != self.text or alt.bezug_id != self.bezug_id or alt.von_id != self.von_id):
				frappe.throw("Nachrichten können nicht verändert werden.", frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Nachricht", ["bezug_art", "bezug_id"])
