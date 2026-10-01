# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Zaehlpunkt – Zählpunkt (AT, 33 Zeichen) – global eindeutig, bis zu 5 Teilnahmen (Mehrfachteilnahme).
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Zaehlpunkt": "EZP"})


class PlattformEGZaehlpunkt(PlattformDokument):
	pass
