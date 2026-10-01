# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG EDA Nachricht – ein- bzw. ausgehende EDA-Nachricht mit Rohinhalt und SHA-256 (Beweissicherung, Fachkonzept
# 3.12/3.14). Append-only: Rohinhalt, Prüfsumme, Richtung und Message-ID sind nach dem Anlegen unveränderlich; nur Status der
# Übermittlung/Verarbeitung (versand_status, verarbeitet, fehler, prozess-Zuordnung) wird fortgeschrieben (plattform/api/eg_eda.py).

import hashlib

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform EG EDA Prozess": "EDP", "Plattform EG EDA Nachricht": "EDN"})

UNVERAENDERLICH = ("richtung", "nachrichtencode", "message_id", "absender", "empfaenger", "rohinhalt", "sha256", "schluessel")


class PlattformEGEDANachricht(PlattformDokument):
	def validate(self):
		roh = self.rohinhalt or ""
		pruef = hashlib.sha256(roh.encode("utf-8")).hexdigest()
		if self.is_new():
			self.sha256 = pruef
			self.groesse = len(roh)
			self.schluessel = f"{self.absender or ''}|{self.message_id}"
			return
		alt = self.get_doc_before_save()
		if alt and any((alt.get(f) or "") != (self.get(f) or "") for f in UNVERAENDERLICH):
			frappe.throw("EDA-Nachrichten sind unveränderlich (Beweissicherung) – nur der Verarbeitungsstatus wird fortgeschrieben.")
		if self.sha256 != pruef:
			frappe.throw("Prüfsumme des Rohinhalts stimmt nicht.")

	def on_trash(self):
		if not frappe.flags.get("eg_eda_aufbewahrung"):
			frappe.throw("EDA-Nachrichten werden nicht gelöscht (Aufbewahrung 7 Jahre, BAO § 132).")
