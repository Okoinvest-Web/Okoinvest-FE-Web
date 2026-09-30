# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Stoerungsfall – Störung an einer Anlage: vom Ingest-Dienst erkannt (offline, Fehlercode, Minderleistung, Zähler) oder manuell erfasst. Quittierung und Bearbeitung durch den Betrieb.
# Anlagen & Monitoring (plattform/api/anlagen.py). Daten nur über die API; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformStoerungsfall(PlattformDokument):
	pass
