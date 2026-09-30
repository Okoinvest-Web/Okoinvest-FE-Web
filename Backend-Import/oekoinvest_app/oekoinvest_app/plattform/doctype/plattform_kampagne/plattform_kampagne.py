# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kampagne – Akquise-Kampagne (plattform/api/akquise_kampagne.py). Anlage und Änderungen nur über die API
# (Rechte: Backoffice-Bereich „geodaten“ + „akquise“). Löschen nur Entwürfe ohne Versand bzw. Testkampagnen (API).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Kampagne": "AQ", "Plattform Kampagnenziel": "AQZ", "Plattform Sperrliste": "SL", "Plattform Gemeinde Potenzial": "GP"})


class PlattformKampagne(PlattformDokument):
	def validate(self):
		if self.land not in ("DE", "AT", "CH"):
			frappe.throw("Land: DE, AT oder CH.")
		alt = self.get_doc_before_save() if not self.is_new() else None
		if alt and alt.status == "abgeschlossen" and self.status != "abgeschlossen":
			frappe.throw("Abgeschlossene Kampagnen lassen sich nicht wieder öffnen.")

	def on_trash(self):
		if not frappe.flags.get("akquise_kampagne_loeschen"):
			frappe.throw("Kampagnen werden über das Backoffice gelöscht (nur Entwürfe ohne Versand bzw. Testkampagnen).")
