# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Foerdercheck – WP5 Förder-Check (Bund, Klima- und Energiefonds, Länder) mit Eingaben und Ergebnis, Quellen und Stand.
# Kennung EFC-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Foerdercheck": "EFC"})


class PlattformEGFoerdercheck(PlattformDokument):
	pass
