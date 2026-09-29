# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gemeinsame Basis der DocTypes mit Zustandsautomat (Vorgang, Fläche, Projekt, Interesse, Provision).
#
# Controller-Regel: Der Status darf sich NUR entlang des Automaten ändern.
#  - Über die API (ablauf.uebergang_anwenden/system_wechsel) ist der Übergang bereits vollständig geprüft
#    (Rolle, Eigentum, Pflichtangaben, Bedingungen) und wird per Flag angekündigt.
#  - Jede andere Änderung (z. B. Pflege im Desk) muss ein admin-/system-Übergang der Tabelle sein;
#    Eigentümer-Schritte (Pachtangebot annehmen, Projekt einreichen …) sind im Desk nicht möglich.
#  - Neue Dokumente beginnen im Startstatus.

import frappe
from frappe.model.document import Document

from oekoinvest_app.plattform.kern import neue_id
from oekoinvest_app.plattform.prozesse import STARTSTATUS, status_label, uebergang_vorhanden


class PlattformDokument(Document):
	"""Basis mit zufälliger, nicht aufzählbarer Kennung (PRÄFIX-JJ-XXXXXX, siehe konstanten.PRAEFIX)."""

	def autoname(self):
		self.name = neue_id(self.doctype)


class StatusDokument(PlattformDokument):
	prozess_art = None

	def status_pruefen(self):
		art = self.prozess_art
		if self.is_new():
			if self.status not in STARTSTATUS[art]:
				frappe.throw(
					f"Neue Datensätze beginnen im Status „{status_label(art, STARTSTATUS[art][0])}“.",
					frappe.ValidationError,
				)
			return
		alt = self.get_doc_before_save()
		if not alt or alt.status == self.status:
			return
		angekuendigt = self.flags.get("plattform_uebergang")
		if angekuendigt and tuple(angekuendigt) == (alt.status, self.status):
			return
		if not uebergang_vorhanden(art, alt.status, self.status, ("admin", "eigentuemer", "system")):
			frappe.throw(
				f"Wechsel von „{status_label(art, alt.status)}“ nach „{status_label(art, self.status)}“ ist nicht vorgesehen.",
				frappe.DuplicateEntryError,
			)
		if not uebergang_vorhanden(art, alt.status, self.status, ("admin",), ohne_pflicht=True):
			# Eigentümer-/System-Schritte sowie Schritte mit Pflichtangaben (Ablehnung mit Begründung, Pachtangebot,
			# Veröffentlichung mit Provisionssatz, Verkauf mit Käufer und Kaufpreis) nur über das Portal.
			frappe.throw(
				"Dieser Schritt ist nur im Portal möglich (Pflichtangaben, Nachricht an den Nutzer, ggf. Provision).",
				frappe.ValidationError,
			)
