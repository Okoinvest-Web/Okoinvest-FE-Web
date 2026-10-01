# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Beschluss – WP5 Beschlussregister (Versammlung, Vorstand, Umlauf) mit Stimmenverhältnis und Mehrheit.
# Kennung EBS-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Beschluss": "EBS"})


class PlattformEGBeschluss(PlattformDokument):
	pass
