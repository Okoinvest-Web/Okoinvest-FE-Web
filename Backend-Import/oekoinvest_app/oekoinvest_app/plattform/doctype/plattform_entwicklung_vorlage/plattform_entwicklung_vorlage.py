# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Entwicklung Vorlage – Entscheidungsvorlage für die Geschäftsführung (Steuerung der Projektentwicklung).

# Zustandsautomat, Vier-Augen-Prinzip und Momentaufnahme laufen ausschließlich über plattform/api/entwicklung_steuerung.py
# (Flag plattform_vorlage). Eingereichte und entschiedene Vorlagen sind unveränderlich; Löschen nur System Manager.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformEntwicklungVorlage(PlattformDokument):
	def validate(self):
		if self.is_new() or self.flags.get("plattform_vorlage"):
			return
		alt = self.get_doc_before_save()
		if alt and alt.status not in ("entwurf", "zurueckgestellt"):
			frappe.throw("Eingereichte oder entschiedene Entscheidungsvorlagen sind unveränderlich.", frappe.PermissionError)
		if alt and alt.status != self.status:
			frappe.throw("Statuswechsel von Entscheidungsvorlagen nur über das Portal (Vier-Augen-Prinzip).", frappe.PermissionError)
