# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Messreihe – Tagesblock 15-Minuten-Werte je Zählpunkt, Gemeinschaft, Lokaltag und Größe (96 bzw. 92/100 Werte, kWh, Qualität L1–L3; Fachkonzept 3.12).
# Energiegemeinschaften WP3 (plattform/api/eg_energie.py, Rechenkern eg_energie_kern.py). Kennung EMR-JJ-XXXXXX.
# Anlage und Änderung ausschließlich über die API (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Messreihe": "EMR"})


class PlattformEGMessreihe(PlattformDokument):
	pass
