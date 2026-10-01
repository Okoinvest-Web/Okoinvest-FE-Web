# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Versammlung Stimme – WP5 Stimmzettel eines Mitglieds (eine Stimme je Mitglied und Versammlung) – nur für die Auszählung; im Desk nur System Manager (Wahlgeheimnis).
# Kennung EGS-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Versammlung Stimme": "EGS"})


class PlattformEGVersammlungStimme(PlattformDokument):
	pass
