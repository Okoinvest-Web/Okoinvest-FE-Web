# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Signaturvorgang – elektronische Unterschrift (EES): PDF, Unterzeichner in Reihenfolge, Protokoll, SHA-256.
# Daten nur über plattform/api/signatur.py (Rechte prüft die API). Der Controller schützt die Nachweise:
#   - Prüfsumme und Datei des Originals sind nach dem Anlegen unveränderlich,
#   - das Protokoll ist append-only (neue Fassung muss mit der alten beginnen),
#   - abgeschlossene Vorgänge (signiertes PDF) bleiben unverändert; Löschen nur System Manager.

import json

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformSignaturvorgang(PlattformDokument):
	def validate(self):
		if self.is_new():
			return
		alt = self.get_doc_before_save()
		if not alt:
			return
		for feld in ("sha256_original", "datei_id", "dokument_name"):
			if alt.get(feld) and alt.get(feld) != self.get(feld):
				frappe.throw("Das Original eines Signaturvorgangs ist unveränderlich.", frappe.ValidationError)
		if alt.status == "abgeschlossen":
			for feld in ("sha256_signiert", "datei_signiert_id", "status"):
				if alt.get(feld) != self.get(feld):
					frappe.throw("Abgeschlossene Signaturvorgänge sind unveränderlich.", frappe.ValidationError)
		try:
			alt_p = json.loads(alt.protokoll_json or "[]")
			neu_p = json.loads(self.protokoll_json or "[]")
		except ValueError:
			frappe.throw("Protokoll beschädigt.", frappe.ValidationError)
		if neu_p[: len(alt_p)] != alt_p:
			frappe.throw("Das Signaturprotokoll ist nur fortschreibbar (append-only).", frappe.ValidationError)

	def on_trash(self):
		if "System Manager" not in frappe.get_roles():
			frappe.throw("Signaturvorgänge werden nicht gelöscht (Nachweis).", frappe.PermissionError)
