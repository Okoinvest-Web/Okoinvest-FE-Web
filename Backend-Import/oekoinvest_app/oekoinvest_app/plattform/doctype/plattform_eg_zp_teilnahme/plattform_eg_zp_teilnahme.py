# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG ZP Teilnahme – Teilnahme eines Zählpunkts an einer Gemeinschaft (Teilnahmefaktor, Consent, EDA-Zustandsautomat). Status nur über egTeilnahmeUebergang.
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG ZP Teilnahme": "ETN"})


class PlattformEGZPTeilnahme(PlattformDokument):
	pass
