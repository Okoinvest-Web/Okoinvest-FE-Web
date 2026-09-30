# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Anlage – Contracting-Anlage (PV, Speicher) mit Kunde/Organisation, Standort grob und Technik-Eckdaten. Messdaten liegen im Ingest-Dienst (TimescaleDB), nicht hier.
# Anlagen & Monitoring (plattform/api/anlagen.py). Daten nur über die API; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformAnlage(PlattformDokument):
	pass
