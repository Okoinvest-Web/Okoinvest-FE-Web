# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Simulation – Simulation einer Energiegemeinschaft vor der Gründung (Fachkonzept 4.7): Eingabe, Kennzahlen, Ergebnis.
# Energiegemeinschaften WP3 (plattform/api/eg_energie.py, Rechenkern eg_energie_kern.py). Kennung ESI-JJ-XXXXXX.
# Anlage und Änderung ausschließlich über die API (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Simulation": "ESI"})


class PlattformEGSimulation(PlattformDokument):
	pass
