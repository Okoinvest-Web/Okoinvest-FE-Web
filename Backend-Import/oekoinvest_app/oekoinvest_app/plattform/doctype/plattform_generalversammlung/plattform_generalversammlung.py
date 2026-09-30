# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Generalversammlung – Generalversammlung: Tagesordnung, Unterlagen, Einladung, Online-Abstimmung, Ergebnis und Protokoll (Prüfsumme der Stimmzettel).
# Kennung GV-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Generalversammlung": "GV"})


class PlattformGeneralversammlung(PlattformDokument):
	pass
