# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Beitrag – WP5 Vorschreibung eines Mitgliedsbeitrags bzw. einer Beitrittsgebühr (Einhebung gesondert oder mit der Energieabrechnung).
# Kennung EBT-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Beitrag": "EBT"})


class PlattformEGBeitrag(PlattformDokument):
	pass
