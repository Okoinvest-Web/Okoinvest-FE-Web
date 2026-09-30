# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Entwicklung Risiko – Risiko eines Entwicklungsprojekts (Eintritt × Auswirkung 1–5), Maßnahme, optional für Co-Investoren sichtbar.
# Projektentwicklung (plattform/api/entwicklung.py). Score = Eintritt × Auswirkung (auch bei Pflege im Desk).

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.entwicklung_kern import risiko_score


class PlattformEntwicklungRisiko(PlattformDokument):
	def validate(self):
		self.eintritt = min(5, max(1, int(self.eintritt or 3)))
		self.auswirkung = min(5, max(1, int(self.auswirkung or 3)))
		self.score = risiko_score(self.eintritt, self.auswirkung)
