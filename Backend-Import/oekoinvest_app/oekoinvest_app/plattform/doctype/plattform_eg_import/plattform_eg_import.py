# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Import – WP5 Wechsel-Import (CSV bzw. Excel) mit Spaltenzuordnung, Plausibilitätsprüfung und Ergebnis; Übernahme über die WP1-Operationen.
# Kennung EIM-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Import": "EIM"})


class PlattformEGImport(PlattformDokument):
	pass
