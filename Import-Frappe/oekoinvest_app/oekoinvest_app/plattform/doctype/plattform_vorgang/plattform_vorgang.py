# Copyright (c) 2026, ÖkoInvest GmbH
# Plattform Vorgang – Anfrage aus einem Website-Formular (Automat „vorgang“).

from oekoinvest_app.plattform.basis import StatusDokument


class PlattformVorgang(StatusDokument):
	prozess_art = "vorgang"

	def validate(self):
		self.email = (self.email or "").strip().lower()
		self.status_pruefen()
