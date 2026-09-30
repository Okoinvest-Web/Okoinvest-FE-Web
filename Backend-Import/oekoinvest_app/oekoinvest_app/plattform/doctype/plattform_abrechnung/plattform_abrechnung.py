# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Abrechnung – Beleg der Plattform: Pacht-Gutschrift, Contracting- oder Provisionsrechnung. Mit ERPNext verknüpft mit Purchase/Sales Invoice; ohne ERPNext maßgeblicher Beleg. Positionen und Snapshots als JSON.
# ERPNext-Finanzen & Abrechnung (plattform/api/finanzen.py). Daten nur über die API bzw. den Abrechnungslauf; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAbrechnung(PlattformDokument):
	def on_trash(self):
		# Belege werden nie gelöscht (Aufbewahrungspflicht) – stornieren statt löschen
		import frappe

		frappe.throw("Belege können nicht gelöscht werden – bitte stornieren.", frappe.PermissionError)
