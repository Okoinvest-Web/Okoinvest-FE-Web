# Copyright (c) 2026, ÖkoInvest GmbH
# Statuswechsel aller Objektarten – ausschließlich über die Zustandsautomaten (plattform/prozesse.py).

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import uebergang_anwenden
from oekoinvest_app.plattform.ausgabe import objekt_json
from oekoinvest_app.plattform.kern import admin_noetig, besitzer, nicht_gefunden, nutzer, objekt_laden, ungueltig, verboten
from oekoinvest_app.plattform.prozesse import PROZESSE, pruefe_uebergang


@frappe.whitelist(methods=["POST"])
def status_wechsel(art=None, id=None, nach=None, als=None, extra=None, ip=None, als_benutzer=None):  # noqa: A002
	"""`als = admin` → Rolle Backoffice nötig; `als = eigentuemer` → Eigentum nötig. Prüfung laut Automat."""
	n = nutzer(als_benutzer)
	if art not in PROZESSE:
		ungueltig("Unbekannte Objektart.")
	if als not in ("admin", "eigentuemer"):
		ungueltig("Ungültige Rolle.")
	if als == "admin":
		admin_noetig(n)
	o = objekt_laden(art, id)
	if not o:
		nicht_gefunden()
	if als == "eigentuemer" and besitzer(art, o) != n.id:
		verboten()
	if art == "interesse" and nach == "nda_angefragt":
		ungueltig("Bitte nutzen Sie die NDA-Anfrage im Projekt.")
	extra = extra if isinstance(extra, dict) else {}
	nach = v.text(nach, 40)
	pruefe_uebergang(art, o.status, nach, als, extra, objekt=o)
	uebergang_anwenden(n, art, o, nach, als, extra, v.text(ip, 64))
	o.reload()
	return objekt_json(art, o, n)
