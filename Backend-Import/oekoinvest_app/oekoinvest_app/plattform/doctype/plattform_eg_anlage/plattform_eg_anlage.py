# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Anlage – Erzeugungs-, Speicher- oder Verbrauchsanlage einer Gemeinschaft (Leistung für § 69 ElWG, Simulation).
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Anlage": "EAN"})


class PlattformEGAnlage(PlattformDokument):
	pass
