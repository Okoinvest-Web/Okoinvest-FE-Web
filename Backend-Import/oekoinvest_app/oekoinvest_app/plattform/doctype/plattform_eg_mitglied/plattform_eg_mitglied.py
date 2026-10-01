# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Mitglied – Mitglied einer Energiegemeinschaft mit Bezug zum Konto, Mitgliedsart, Steuerstatus, SEPA-Mandat und Status.
# Energiegemeinschaften WP1 (plattform/api/eg_stamm.py, Regeln eg_stamm_kern.py). Pflege nur über die API; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Mitglied": "EMG"})


class PlattformEGMitglied(PlattformDokument):
	pass
