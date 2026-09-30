# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Genossenschaft Ausschuettung – Dividende bzw. Rückvergütung eines Geschäftsjahres: Positionen je Mitglied mit Steuerabzug, Beschluss der Generalversammlung, Auszahlung.
# Kennung GAU-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Genossenschaft Ausschuettung": "GAU"})


class PlattformGenossenschaftAusschuettung(PlattformDokument):
	pass
