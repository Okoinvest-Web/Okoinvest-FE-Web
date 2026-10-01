# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Verteilschluessel – Statischer Verteilschlüssel einer Gemeinschaft (versioniert; EC_PRT_CHANGE über WP2).
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Verteilschluessel": "EVS"})


class PlattformEGVerteilschluessel(PlattformDokument):
	pass
