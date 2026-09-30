# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Pacht Anliegen – Anliegen eines Eigentümers zum Pachtvertrag (Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung, Verlängerung) mit Zustandsautomat, Verlauf und Ergebnis. Nur über die API (plattform/api/pachtakte.py).
# Pachtakte (Team 1). Rechte (Rolle UND Eigentum) und Zustandsautomaten prüft die API (plattform/api/pachtakte.py, pachtakte_kern.py).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Pacht Anliegen": "PAN", "Plattform Agri Nachweis": "AGN", "Plattform Pachtakte": "PAK"})


class PlattformPachtAnliegen(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Pacht Anliegen", ["vertrag_id"])
