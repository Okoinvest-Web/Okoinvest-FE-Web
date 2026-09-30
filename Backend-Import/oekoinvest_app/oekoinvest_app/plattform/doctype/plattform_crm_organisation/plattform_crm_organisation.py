# Copyright (c) 2026, ÖkoInvest GmbH
#
# Plattform CRM Organisation – CRM-Organisation
# Kennung per Controller (PRÄFIX-JJ-XXXXXX, Präfixe: plattform/backoffice.py).

import frappe  # noqa: F401

from oekoinvest_app.plattform import backoffice  # noqa: F401 – registriert die Präfixe
from oekoinvest_app.plattform.basis import PlattformDokument


class PlattformCRMOrganisation(PlattformDokument):
	pass
