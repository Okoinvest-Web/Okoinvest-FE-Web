# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Vereinsakte – WP5 Vereinsakte je Gemeinschaft: Statuten-Eingaben (Generator, Versammlungskonfiguration) und Stand der Auflösungs-Checkliste.
# Kennung EVA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Vereinsakte": "EVA"})


class PlattformEGVereinsakte(PlattformDokument):
	pass
