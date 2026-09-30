# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Zugriff – Zugriffsprotokoll des Datenraums (append-only): Datenraum geöffnet, Dokument angesehen/heruntergeladen.
# Deal-Room (plattform/api/qa.py, bieter.py, dealroom.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


MELDUNG = "Das Zugriffsprotokoll kann nicht verändert werden."


class PlattformZugriff(PlattformDokument):
	"""Append-only (wie Plattform Aktivitaet): Ändern, Umbenennen und Löschen sind verboten."""

	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Einträge des Zugriffsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Zugriff", ["projekt_id", "nutzer_id"])
