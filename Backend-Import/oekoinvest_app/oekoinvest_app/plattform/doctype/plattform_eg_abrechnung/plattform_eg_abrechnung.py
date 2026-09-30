# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Abrechnung – Monatsabrechnung bzw. Gutschrift eines Teilnehmers der Energiegemeinschaft (Bezug aus der Gemeinschaft, Einspeisung, Saldo).
# Kennung EA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Abrechnung": "EA"})


class PlattformEGAbrechnung(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform EG Abrechnung", ["gemeinschaft", "monat"])
