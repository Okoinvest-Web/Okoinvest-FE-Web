# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Anmeldung – Anmeldehistorie (auch Fehlversuche), append-only wie Plattform Aktivitaet.
# Einträge entstehen nur über plattform/sicherheit.historie(); Ändern, Umbenennen und Löschen verbietet der
# Controller. Aufbewahrung 180 Tage: täglicher Aufräumjob (sicherheit.aufraeumen, direkt per SQL).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument

MELDUNG = "Die Anmeldehistorie kann nicht verändert werden."


class PlattformAnmeldung(PlattformDokument):
	def validate(self):
		if not self.is_new():
			frappe.throw(MELDUNG, frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Einträge der Anmeldehistorie können nicht gelöscht werden.", frappe.PermissionError)

	def before_rename(self, alt, neu, merge=False):
		frappe.throw(MELDUNG, frappe.PermissionError)


def on_doctype_update():
	frappe.db.add_index("Plattform Anmeldung", ["nutzer_id", "am"])
