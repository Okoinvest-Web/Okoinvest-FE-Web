# Copyright (c) 2026, ÖkoInvest GmbH
#
# Basis der DocTypes „Backoffice-Werkzeuge“ (Buchhaltung, Datenschutz & GwG, Deal-Pipeline): zufällige, nicht
# aufzählbare Kennung PRÄFIX-JJ-XXXXXX mit eigener Präfix-Tabelle (konstanten.PRAEFIX bleibt unverändert).
# Daten entstehen ausschließlich über plattform/api/{buchhaltung,datenschutz,transaktion}.py (Rechte prüft die API).

import secrets

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

PRAEFIX = {
	"Plattform Stornobeleg": "SB",
	"Plattform Zahlungseingang": "ZE",
	"Plattform Kontoauszug Import": "ZI",
	"Plattform Buchungsexport": "EX",
	"Plattform Monatsabschluss": "MS",
	"Plattform Datenschutzanfrage": "DS",
	"Plattform Verdachtsfall": "GW",
	"Plattform Deal Prognose": "DP",
}


def neue_kennung(doctype, laenge=6):
	praefix = PRAEFIX[doctype]
	jahr = now_datetime().strftime("%y")
	for _ in range(25):
		name = f"{praefix}-{jahr}-" + "".join(secrets.choice(ALPHABET) for _ in range(laenge))
		if not frappe.db.exists(doctype, name):
			return name
	frappe.throw("Kennung konnte nicht erzeugt werden.")


class WerkzeugDokument(Document):
	def autoname(self):
		self.name = neue_kennung(self.doctype)


class NachweisDokument(WerkzeugDokument):
	"""Nachweis (Beleg, Import, Export): nach dem Anlegen unveränderlich bis auf die API-Felder, nie löschbar."""

	def on_trash(self):
		frappe.throw("Nachweise der Buchhaltung und Compliance können nicht gelöscht werden (Aufbewahrungspflicht).", frappe.PermissionError)
