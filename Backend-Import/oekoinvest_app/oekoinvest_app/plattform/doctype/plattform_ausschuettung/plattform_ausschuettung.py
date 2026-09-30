# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Ausschuettung – Ausschüttung an den Investor (Gewinn, Entnahme, Zinsen/Tilgung Gesellschafterdarlehen, Kapitalrückzahlung, Exit) – Sperre bei DSCR unter Lock-up.
# Portfolio (plattform/api/portfolio.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAusschuettung(PlattformDokument):
	"""Gebuchte Ausschüttungen sind unveränderlich; nur Storno (Status, Datum, Grund). Nie löschen."""

	ERLAUBT = {"status", "storniert_am", "grund", "modified", "modified_by"}

	def validate(self):
		if self.is_new():
			if self.status != "gebucht":
				frappe.throw("Neue Ausschüttungen beginnen im Status „gebucht“.", frappe.ValidationError)
			return
		alt = self.get_doc_before_save()
		if not alt:
			return
		if alt.status == "storniert":
			frappe.throw("Stornierte Ausschüttungen sind unveränderlich.", frappe.ValidationError)
		for feld in ("position_id", "art", "periode", "betrag", "datum", "bank_zustimmung"):
			if str(alt.get(feld) or "") != str(self.get(feld) or ""):
				frappe.throw("Gebuchte Ausschüttungen sind unveränderlich – bitte stornieren und neu buchen.", frappe.ValidationError)

	def on_trash(self):
		frappe.throw("Ausschüttungen können nicht gelöscht werden (Nachweis) – bitte stornieren.", frappe.PermissionError)
