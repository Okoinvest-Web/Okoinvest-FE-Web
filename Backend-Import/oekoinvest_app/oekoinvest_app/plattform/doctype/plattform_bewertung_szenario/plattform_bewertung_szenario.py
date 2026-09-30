# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Bewertung Szenario – Gespeichertes Bewertungsszenario eines Investors/Anbieters zu einem Börsenprojekt (Eingaben und Ergebnis).
# Fachprüfung Kapitalseite (plattform/api/fach.py). Daten nur über die API; Rechte (Rolle UND Eigentum) prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformBewertungSzenario(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Bewertung Szenario", ["konto_id", "projekt_id"])
