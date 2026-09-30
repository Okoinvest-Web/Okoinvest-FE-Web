# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Beteiligung Interesse – Mitglied: Vormerkung Genossenschaft (im Aufbau) bzw. Teilnahmedaten Energiegemeinschaft DE/AT/CH.
# Fachprüfung Kapitalseite (plattform/api/fach.py). Daten nur über die API; Rechte (Rolle UND Eigentum) prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformBeteiligungInteresse(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Beteiligung Interesse", ["konto_id", "art"])
