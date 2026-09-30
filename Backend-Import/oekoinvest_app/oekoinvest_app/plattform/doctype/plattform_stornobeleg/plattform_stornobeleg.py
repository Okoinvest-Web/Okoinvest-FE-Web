# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Stornobeleg – Storno-/Korrekturbeleg mit eigener fortlaufender Nummer (ST-JJJJ-NNNNN) und Verweis auf den Ursprungsbeleg – unveränderlich, nicht löschbar.
# Backoffice-Werkzeuge (plattform/api/{buchhaltung,datenschutz,transaktion}.py). Daten über die API; Rechte prüft die API.

from oekoinvest_app.plattform.werkzeuge_basis import NachweisDokument


class PlattformStornobeleg(NachweisDokument):
	pass
