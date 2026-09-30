# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Lastgang – Importierter Lastgang eines Unternehmens: Metadaten, Analyse und Parameter; die Viertelstundenreihe liegt als private Datei (reihe_datei).
# Fachprüfung Kapitalseite (plattform/api/fach.py). Daten nur über die API; Rechte (Rolle UND Eigentum) prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformLastgang(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Lastgang", ["konto_id"])
