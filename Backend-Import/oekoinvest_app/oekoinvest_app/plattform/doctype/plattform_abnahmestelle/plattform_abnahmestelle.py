# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Abnahmestelle – Abnahmestelle eines Unternehmens (Reststrom-Pool, Contracting): MaLo/MeLo bzw. Zählpunkt, Messart, Netz, Liefervertrag, Entlastungen.
# Fachprüfung Kapitalseite (plattform/api/fach.py). Daten nur über die API; Rechte (Rolle UND Eigentum) prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAbnahmestelle(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_index("Plattform Abnahmestelle", ["konto_id", "kennung"])
