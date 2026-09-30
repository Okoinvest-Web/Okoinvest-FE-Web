# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform GV Stimme – Stimmzettel eines Mitglieds (eine Stimme je Mitglied und Versammlung). Nur für die Auszählung – im Desk nur System Manager (Wahlgeheimnis).
# Kennung GS-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform GV Stimme": "GS"})


class PlattformGVStimme(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_unique("Plattform GV Stimme", ["versammlung", "mitglied"], constraint_name="unique_gv_stimme")
