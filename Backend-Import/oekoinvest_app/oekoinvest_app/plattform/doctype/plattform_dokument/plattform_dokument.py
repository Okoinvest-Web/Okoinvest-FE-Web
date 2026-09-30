# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Dokument – Metadaten zu einem privaten File (PDF/JPG/PNG ≤ 10 MB).
# Die Datei selbst wird in api/dokument.py geprüft (Magic Bytes) und als privates File gespeichert.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.basis import PlattformDokument as Basis
from oekoinvest_app.plattform.konstanten import DOCTYPE, DOKUMENT_KATEGORIEN, UPLOAD_MAX_BYTES, UPLOAD_TYPEN


class PlattformDokument(Basis):
	def validate(self):
		self.bezug_doctype = DOCTYPE.get(self.bezug_art)
		if not self.bezug_doctype or self.bezug_art == "provision":
			frappe.throw("Unbekannter Bezug.")
		if self.mime not in UPLOAD_TYPEN:
			frappe.throw("Erlaubt sind PDF, JPG und PNG.")
		if cint(self.groesse) <= 0 or cint(self.groesse) > UPLOAD_MAX_BYTES:
			frappe.throw("Die Datei ist leer oder größer als 10 MB.")
		if self.kategorie not in DOKUMENT_KATEGORIEN:
			self.kategorie = "allgemein"
		if self.kategorie == "datenraum" and self.bezug_art != "projekt":
			frappe.throw("Datenraum-Dokumente gehören zu einem Projekt.")
		if self.datei_id and cint(frappe.db.get_value("File", self.datei_id, "is_private")) != 1:
			frappe.throw("Dokumente werden ausschließlich privat gespeichert.")


def on_doctype_update():
	frappe.db.add_index("Plattform Dokument", ["bezug_art", "bezug_id"])
