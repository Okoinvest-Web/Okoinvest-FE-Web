# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Gemeinde Akte – Gemeindecockpit: Verfahrensstand je Projekt, Termine (Gemeinderat, Bürgerinfo, Fristen), Einnahmen (§ 6 EEG, Gemeindebeitrag), Stellungnahmen.
# Kennung GA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/gemeinde.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Gemeinde Akte": "GA"})


class PlattformGemeindeAkte(PlattformDokument):
	pass
