# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Dokument – WP5 Dokument aus dem Generator (Musterstatuten, Verträge, Vollmacht, Anzeigen) – versioniert mit SHA-256; MUSTER zur rechtlichen Prüfung.
# Kennung EGD-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Dokument": "EGD"})


class PlattformEGDokument(PlattformDokument):
	pass
