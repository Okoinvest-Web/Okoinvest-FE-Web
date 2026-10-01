# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Interesse – Interesse an einer Energiegemeinschaft (WP6, Fachkonzept 2.1): schmale Kontaktdaten, PLZ, Rolle,
# optional Zählpunkt und Jahresverbrauch; Cluster nach Netzbetreiber und PLZ; Einwilligungsnachweis.
# Kennung EIN-JJ-XXXXXX (per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_portal.py; im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Interesse": "EIN"})


class PlattformEGInteresse(PlattformDokument):
	pass
