# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Notiz – Private Notiz, Tags und eigene Pipeline-Spalte eines Investors je Projekt (nur für den Investor sichtbar).
# Deal-Room (plattform/api/qa.py, bieter.py, dealroom.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformNotiz(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Notiz", ["nutzer_id", "projekt_id"])
