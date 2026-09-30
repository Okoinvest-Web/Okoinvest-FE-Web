# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Projektkosten – Ist-Kosten eines Entwicklungsprojekts ohne ERPNext (manuell gebucht). Mit ERPNext kommen die Ist-Kosten aus Purchase Invoices, Journal Entries und Timesheets mit Projektbezug.
# ERPNext-Finanzen & Abrechnung (plattform/api/finanzen.py). Daten nur über die API bzw. den Abrechnungslauf; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformProjektkosten(PlattformDokument):
	pass
