# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Genossenschaft – Genossenschaft (Team 5): Stammdaten laut Satzung – Registerstatus, Geschäftsanteil, Fristen, Konto. Beitritt nur bei Status „eingetragen“.
# Kennung GE-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Genossenschaft": "GE"})


class PlattformGenossenschaft(PlattformDokument):
	pass
