# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Tarif – Tarif bzw. Preisblatt einer Gemeinschaft (versioniert, TOU-Zeitfenster, Gebühren, Sozialtarif, individuelle Preise).
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Tarif": "ETF"})


class PlattformEGTarif(PlattformDokument):
	pass
