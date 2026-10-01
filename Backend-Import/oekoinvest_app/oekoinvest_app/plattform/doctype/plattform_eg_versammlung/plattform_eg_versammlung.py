# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Versammlung – WP5 Mitglieder- bzw. Generalversammlung einer Gemeinschaft (Versammlungsmodul: Einladung mit Frist, Online-Abstimmung, Ergebnis, Protokoll mit Prüfsumme).
# Kennung EGV-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Versammlung": "EGV"})


class PlattformEGVersammlung(PlattformDokument):
	pass
