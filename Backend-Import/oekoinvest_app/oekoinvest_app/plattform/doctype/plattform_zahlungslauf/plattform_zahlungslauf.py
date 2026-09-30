# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Zahlungslauf – SEPA-Überweisungsdatei (pain.001.001.09) für Pacht-Gutschriften: nur verifizierte Eigentümer (KYC). Gespeichert wird der SHA-256 der Datei, nicht die Datei.
# ERPNext-Finanzen & Abrechnung (plattform/api/finanzen.py). Daten nur über die API bzw. den Abrechnungslauf; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformZahlungslauf(PlattformDokument):
	def on_trash(self):
		import frappe

		frappe.throw("Zahlungsläufe werden nicht gelöscht (Nachweis).", frappe.PermissionError)
