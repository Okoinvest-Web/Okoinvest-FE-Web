# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Teilnahme – Teilnahme eines Mitglieds an einer Energiegemeinschaft: Zählpunkt (Stand beim Beitritt), Anmeldung beim Netzbetreiber, aktiv ab/bis.
# Kennung ET-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Teilnahme": "ET"})


class PlattformEGTeilnahme(PlattformDokument):
	pass
