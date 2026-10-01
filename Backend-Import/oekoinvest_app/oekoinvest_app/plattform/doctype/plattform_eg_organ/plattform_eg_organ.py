# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Organ – Organ bzw. Funktion in einer Energiegemeinschaft (Obmann, Kassier, Schriftführung, Rechnungsprüfung …) – Teamrolle je Gemeinschaft.
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Organ": "EGO"})


class PlattformEGOrgan(PlattformDokument):
	pass
