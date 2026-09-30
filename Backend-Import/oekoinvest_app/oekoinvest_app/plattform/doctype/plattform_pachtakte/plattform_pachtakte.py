# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Pachtakte – Pachtakte je Pachtvertrag: Rückbau (Zustandsautomat bis zur Abnahme), Rückbausicherheit, Kündigungsdatum, Eigentümerhistorie, Zahlungsaufteilung. Nur über die API (plattform/api/pachtakte.py).
# Pachtakte (Team 1). Rechte (Rolle UND Eigentum) und Zustandsautomaten prüft die API (plattform/api/pachtakte.py, pachtakte_kern.py).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Pacht Anliegen": "PAN", "Plattform Agri Nachweis": "AGN", "Plattform Pachtakte": "PAK"})


class PlattformPachtakte(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Pachtakte", ["vertrag_id"])
