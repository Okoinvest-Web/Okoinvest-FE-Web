# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform EG Gruendungsauftrag – WP5 Gründungs- bzw. Wechselauftrag an ÖkoInvest (Fachkonzept 3.15): Paket, Angebot, Signatur, Schritte mit Fristen und Nachweisen, verknüpfte Gemeinschaft. Pflege nur über plattform/api/eg_gruendung.py.
# Kennung EGA-JJ-XXXXXX (zufällig, per Controller). Anlage und Änderung ausschließlich über plattform/api/eg_gruendung.py
# (Rolle UND Kontext je Gemeinschaft); im Desk lesen.

from oekoinvest_app.plattform.basis import PlattformDokument
from oekoinvest_app.plattform.kern import PRAEFIX

PRAEFIX.update({"Plattform EG Gruendungsauftrag": "EGA"})


class PlattformEGGruendungsauftrag(PlattformDokument):
	pass
