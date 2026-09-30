# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Lieferantenwechsel – Lieferantenwechsel nach Zuschlag einer Energie-Ausschreibung: Schritte (Liefervertrag, Kündigung Altvertrag, Anmeldung Netzbetreiber, Lieferbeginn) mit Rolle und Frist.
# Kundenseite Energie (plattform/api/kundenenergie.py). Status nur über die API (Zustandsautomat in plattform/kundenenergie_kern.py);
# Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Kundenanliegen": "KN", "Plattform Lieferantenwechsel": "LW"})


class PlattformLieferantenwechsel(PlattformDokument):
	def validate(self):
		if self.is_new() or frappe.flags.get("kundenenergie_api"):
			return
		alt = self.get_doc_before_save()
		if alt and alt.status != self.status:
			frappe.throw("Der Status ändert sich nur über das Portal (Zustandsautomat mit Benachrichtigung und Folgeaktionen).")

	def on_trash(self):
		if not frappe.flags.get("kundenenergie_api"):
			frappe.throw("Einträge der Kundenseite Energie werden nicht gelöscht (Nachweis).")
