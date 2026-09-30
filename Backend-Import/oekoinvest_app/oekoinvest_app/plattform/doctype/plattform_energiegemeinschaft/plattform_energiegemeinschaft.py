# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Energiegemeinschaft – Energiegemeinschaft (AT EEG/BEG, DE Energy Sharing § 42c EnWG, CH LEG/ZEV): Netzbetreiber, Gebiet, Preise, Verteilschlüssel, Monatsläufe.
# Kennung EGM-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/mitglied.py
# (Rolle UND Eigentum bzw. Bereich der Rechte-Matrix); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform Energiegemeinschaft": "EGM"})


class PlattformEnergiegemeinschaft(PlattformDokument):
	pass
