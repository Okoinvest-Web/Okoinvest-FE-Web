# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Beleg – Beleg – nach der Freigabe unveränderlich (nur Status, Zahlungs- und Mahnvermerke über die API), nicht löschbar.
# Kennung: Präfix EBL (Präfix-JJ-XXXXXX, kern.neue_id). Daten nur über plattform/api/eg_abrechnung.py (Rechte prüft die API).

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.kern import PRAEFIX, neue_id

PRAEFIX.setdefault("Plattform EG Beleg", "EBL")


class PlattformEGBeleg(Document):
	def autoname(self):
		self.name = neue_id(self.doctype)

	def on_trash(self):
		frappe.throw("Nachweise der Abrechnung können nicht gelöscht werden (Aufbewahrungspflicht 7 Jahre, § 132 BAO).", frappe.PermissionError)

	FREI = {"status", "daten", "zahlungslauf", "modified", "modified_by"}

	def validate(self):
		# Nach der Freigabe sind Nummer, Beträge und Positionen unveränderlich (§ 11 UStG, Prüfsumme)
		if self.is_new():
			return
		alt = self.get_doc_before_save()
		if alt and alt.status != "entwurf":
			for feld in ("nummer", "typ", "netto", "ust", "brutto", "rc_steuer", "mitglied", "datum", "hash"):
				if str(alt.get(feld) or "") != str(self.get(feld) or ""):
					frappe.throw(f"Freigegebene Belege sind unveränderlich ({feld}) – bitte stornieren und neu ausstellen.", frappe.ValidationError)
