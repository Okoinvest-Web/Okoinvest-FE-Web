# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Anteilsuebertragung – Übertragung von Geschäftsguthaben zwischen Mitgliedern (DE § 76 GenG): Anfrage, Annahme durch den Empfänger, Zustimmung des Vorstands.
# Kennung GU-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Anteilsuebertragung": "GU"})


class PlattformAnteilsuebertragung(PlattformDokument):
	pass
