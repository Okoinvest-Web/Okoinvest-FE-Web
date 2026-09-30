# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Sperrliste – Sperrvermerke der Flächenakquise (Widerspruch → nie wieder anschreiben). Nur Hashwerte und
# maskierte Anzeige. Aufheben (aktiv = 0) nur über die API durch die Leitung mit Begründung; Löschen nur beim Entfernen
# einer Testkampagne (Flag) – sonst bleibt der Vermerk dauerhaft.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Kampagne": "AQ", "Plattform Kampagnenziel": "AQZ", "Plattform Sperrliste": "SL", "Plattform Gemeinde Potenzial": "GP"})


class PlattformSperrliste(PlattformDokument):
	def validate(self):
		alt = self.get_doc_before_save() if not self.is_new() else None
		if alt and alt.aktiv and not self.aktiv and len((self.aufhebungsgrund or "").strip()) < 10:
			frappe.throw("Aufheben nur mit Begründung (mind. 10 Zeichen).")
		if alt and not alt.aktiv and self.aktiv:
			frappe.throw("Ein aufgehobener Sperrvermerk wird nicht reaktiviert – bitte neu erfassen.")

	def on_trash(self):
		if not frappe.flags.get("akquise_kampagne_loeschen"):
			frappe.throw("Sperrvermerke werden nicht gelöscht (nur aufgehoben, mit Begründung).")
