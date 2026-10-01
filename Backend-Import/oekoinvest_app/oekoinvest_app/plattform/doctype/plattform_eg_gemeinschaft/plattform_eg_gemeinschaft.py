# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Gemeinschaft – Energiegemeinschaft (EEG, BEG, GEA, P2P, Eigenversorgung) nach ElWG §§ 65–72 – Stammdaten, Nahebereich, Kennungen, Organisator.
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Gemeinschaft": "EGG"})


class PlattformEGGemeinschaft(PlattformDokument):
	pass
