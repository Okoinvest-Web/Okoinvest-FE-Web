# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Aufgabe – Backoffice-Aufgaben und Wiedervorlagen (api/aufgabe.py).
#  - Zuständig nur aktive Backoffice-Konten
#  - Bezug optional (Vorgang, Fläche, Projekt, Interesse) als Dynamic Link
#  - Erledigt → erledigt_am/-von; Verschieben oder Neuzuweisung setzt die Erinnerung zurück

import frappe
from frappe.utils import now_datetime

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import AUFGABE_BEZUG_ARTEN, DOCTYPE


class PlattformAufgabe(PlattformDokument):
	def validate(self):
		if self.bezug_art:
			if self.bezug_art not in AUFGABE_BEZUG_ARTEN:
				frappe.throw("Unbekannter Bezug.")
			self.bezug_doctype = DOCTYPE[self.bezug_art]
		else:
			self.bezug_doctype = None
			self.bezug_id = None
		admins = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"))
		if self.zustaendig_id not in admins or not frappe.db.get_value("Plattform Konto", self.zustaendig_id, "aktiv"):
			frappe.throw("Zuständig kann nur ein aktives Backoffice-Konto sein.")
		if self.status == "erledigt" and not self.erledigt_am:
			self.erledigt_am = now_datetime()
		if self.status == "offen":
			self.erledigt_am = None
			self.erledigt_von = None
		if not self.is_new():
			alt = self.get_doc_before_save()
			if alt and (str(alt.faellig_am) != str(self.faellig_am) or alt.zustaendig_id != self.zustaendig_id):
				self.erinnert_am = None
