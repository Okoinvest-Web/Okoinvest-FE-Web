# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Geraetezugang – MQTT-Zugang je Datenlogger. Gespeichert wird nur der scrypt-Hash des Passworts (nicht umkehrbar); das Passwort sieht das Backoffice genau einmal beim Erzeugen.
# Anlagen & Monitoring (plattform/api/anlagen.py). Daten nur über die API; Rechte prüft die API.

from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformGeraetezugang(PlattformDokument):
	pass
