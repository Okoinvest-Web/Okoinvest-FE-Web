# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Aktivitaet – Aktivitätsprotokoll, append-only.
# Einträge entstehen nur über kern.protokoll(); Ändern, Umbenennen und Löschen verbietet der Controller
# (auch für Administratoren). Aufbewahrung/Löschkonzept: siehe ANLEITUNG.md (offener Punkt).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument

MELDUNG = "Das Aktivitätsprotokoll kann nicht verändert werden."


class PlattformAktivitaet(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Einträge des Aktivitätsprotokolls können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Aktivitaet", ["objekt_id"])
