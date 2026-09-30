# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform KI Nutzung – Nutzungsprotokoll des KI-Assistenten, append-only.
# Einträge entstehen nur über api/ki.nutzung_protokollieren; Ändern, Umbenennen und Löschen verbietet
# der Controller. Gespeichert werden ausdrücklich KEINE Inhalte (Fragen, Prompts, Antworten).
# Aufbewahrung: siehe ANLEITUNG.md, Abschnitt „KI-Assistent“ (Vorschlag 12 Monate).

import frappe
from frappe.model.document import Document

MELDUNG = "Das KI-Nutzungsprotokoll kann nicht verändert werden."


class PlattformKINutzung(Document):
	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)

	def on_trash(self):
		if not frappe.flags.ki_protokoll_bereinigen:
			frappe.throw("Einträge des KI-Nutzungsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform KI Nutzung", ["nutzer_id", "tag"])
