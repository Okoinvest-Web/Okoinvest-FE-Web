# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform Kontoauszug Import – Eingelesener Kontoauszug (CAMT.053/.054 oder CSV) mit SHA-256 – jede Datei nur einmal.
# Backoffice-Werkzeuge (plattform/api/{buchhaltung,datenschutz,transaktion}.py). Daten über die API; Rechte prüft die API.

from oekoinvest_app.plattform.werkzeuge_basis import NachweisDokument


class PlattformKontoauszugImport(NachweisDokument):
	pass
