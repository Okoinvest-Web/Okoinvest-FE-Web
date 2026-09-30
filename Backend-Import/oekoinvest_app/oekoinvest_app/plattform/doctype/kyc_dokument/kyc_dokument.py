# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC Dokument – Metadaten einer verschlüsselten, privaten Unterlage. Datei nur privat, Typ/Größe begrenzt,
# Löschen nur über api/kyc.py (eigene, ungeprüfte Unterlage) bzw. den Fristen-Job (Flag `kyc_loeschen`).

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kyc_kern import DOKUMENTE, UPLOAD_MAX_BYTES, UPLOAD_TYPEN


class KYCDokument(PlattformDokument):
	def validate(self):
		if self.art not in DOKUMENTE:
			frappe.throw("Unbekannte Dokumentart.")
		if cint(self.geloescht):
			return
		if self.mime not in UPLOAD_TYPEN:
			frappe.throw("Erlaubt sind PDF, JPG und PNG.")
		if cint(self.groesse) <= 0 or cint(self.groesse) > UPLOAD_MAX_BYTES:
			frappe.throw("Die Datei ist leer oder größer als 10 MB.")
		if self.datei_id and cint(frappe.db.get_value("File", self.datei_id, "is_private")) != 1:
			frappe.throw("KYC-Unterlagen werden ausschließlich privat gespeichert.")

	def on_trash(self):
		if not self.flags.kyc_loeschen:
			frappe.throw("KYC-Unterlagen werden nur über das Portal bzw. nach Ablauf der Aufbewahrungsfrist gelöscht.")
