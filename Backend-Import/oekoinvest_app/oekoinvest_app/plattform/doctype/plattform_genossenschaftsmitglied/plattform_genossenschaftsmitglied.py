# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Genossenschaftsmitglied – Mitgliedschaft in einer Genossenschaft (Mitgliederliste): Beitrittserklärung, Zulassung, Einzahlungen, weitere Anteile, Kündigungen, Verlauf.
# Kennung GM-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Genossenschaftsmitglied": "GM"})


class PlattformGenossenschaftsmitglied(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Genossenschaftsmitglied", ["genossenschaft", "konto_id"])
