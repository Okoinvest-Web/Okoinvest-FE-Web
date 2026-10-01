# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Messmonat – Monatsaggregat je Zählpunkt, Gemeinschaft, Größe und Monat (schnelle Listen, Grundlage der Periodenwerte für die Abrechnung).
# Energiegemeinschaften WP3 (plattform/api/eg_energie.py, Rechenkern eg_energie_kern.py). Kennung EMM-JJ-XXXXXX.
# Anlage und Änderung ausschließlich über die API (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Messmonat": "EMM"})


class PlattformEGMessmonat(PlattformDokument):
	pass
