# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Datenraum Eintrag – Einordnung eines Projekt-Dokuments im Datenraum: Ordner (Standard-Index), Freigabestufe, Vorversion.
# Deal-Room (plattform/api/qa.py, bieter.py, dealroom.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformDatenraumEintrag(PlattformDokument):
	def validate(self):
		if str(self.stufe) not in ("1", "2"):
			frappe.throw("Freigabestufe 1 oder 2.")
		if self.version_von and self.version_von == self.dokument_id:
			frappe.throw("Ein Dokument kann nicht seine eigene Vorversion sein.")
