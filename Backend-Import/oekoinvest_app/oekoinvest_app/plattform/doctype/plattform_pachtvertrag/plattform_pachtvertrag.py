# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Pachtvertrag – Pachtvertrag Fläche/Dach: Eigentümer (Konto, KYC), Modell fest/indexiert/Umsatzbeteiligung, Reservierungsprämie, Laufzeit, Fälligkeit. Gutschriften entstehen je Fälligkeit im Abrechnungslauf.
# ERPNext-Finanzen & Abrechnung (plattform/api/finanzen.py). Daten nur über die API bzw. den Abrechnungslauf; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformPachtvertrag(PlattformDokument):
	pass
