# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Einwilligung Protokoll – Einwilligungsprotokoll der Lead-Kette (Welle 2, Paket B3), append-only.
# Einträge entstehen nur über plattform/api/einwilligung.py (anhaengen): dort werden die Felder geprüft (feste Muster,
# keine Personendaten), die Kette serialisiert (GET_LOCK + Sperrlesung) und kette_nr/prev_hash/entry_hash vergeben.
# Ändern, Umbenennen und Löschen verbietet dieser Controller – auch für Administratoren.

import frappe
from frappe.model.document import Document

MELDUNG = "Das Einwilligungsprotokoll kann nicht verändert werden."


class PlattformEinwilligungProtokoll(Document):
	def autoname(self):
		self.name = self.eintrag_id

	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)
		if not self.flags.get("lead_kette"):
			frappe.throw("Einträge entstehen nur über die Lead-Kette (plattform/api/einwilligung.py).", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Einträge des Einwilligungsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Einwilligung Protokoll", ["kette_nr"])
	frappe.db.add_index("Plattform Einwilligung Protokoll", ["pseudonym"])
