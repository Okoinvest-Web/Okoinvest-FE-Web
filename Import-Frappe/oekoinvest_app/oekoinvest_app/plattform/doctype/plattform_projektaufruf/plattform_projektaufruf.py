# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Projektaufruf – Aufrufe eines Exposés je Tag (Anbieter-Cockpit „Aufrufe über Zeit“).
# Deal-Room (plattform/api/qa.py, bieter.py, dealroom.py). Daten nur über die API; Rechte prüft die API.

import frappe

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformProjektaufruf(PlattformDokument):
	pass


def on_doctype_update():
	frappe.db.add_unique("Plattform Projektaufruf", ["projekt_id", "tag"], constraint_name="projekt_tag")
