# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Agri Nachweis – Agri-PV-Bewirtschaftungsnachweis je Pachtvertrag und Wirtschaftsjahr (Referenz- oder Betriebsjahr) nach DIN SPEC 91434. Nur über die API (plattform/api/pachtakte.py).
# Pachtakte (Team 1). Rechte (Rolle UND Eigentum) und Zustandsautomaten prüft die API (plattform/api/pachtakte.py, pachtakte_kern.py).

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.konstanten import PRAEFIX

PRAEFIX.update({"Plattform Pacht Anliegen": "PAN", "Plattform Agri Nachweis": "AGN", "Plattform Pachtakte": "PAK"})


class PlattformAgriNachweis(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Agri Nachweis", ["vertrag_id"])
