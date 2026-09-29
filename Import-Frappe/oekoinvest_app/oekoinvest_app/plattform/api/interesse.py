# Copyright (c) 2026, ÖkoInvest GmbH
# Interessen der Investoren: Merkliste, Klick-NDA, Liste (eigene / alle).

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import uebergang_anwenden
from oekoinvest_app.plattform.ausgabe import interesse_ausgabe, interesse_json
from oekoinvest_app.plattform.kern import (
	admin_noetig,
	als_json,
	jetzt_iso,
	konflikt,
	nicht_gefunden,
	nutzer,
	protokoll,
	rolle_noetig,
	verlauf,
)
from oekoinvest_app.plattform.konstanten import NDA_VERSION
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, PROZESSE, pruefe_uebergang

MAX_LISTE = 2000


def _projekt_sichtbar(projekt_id):
	k = v.kennung(projekt_id)
	p = frappe.db.get_value("Plattform Projekt", k, ["name", "status", "anbieter_id"], as_dict=True) if k else None
	if not p or p.status not in BOERSE_STATUS:
		nicht_gefunden("Projekt nicht gefunden.")
	return p


def _interesse(p, n, anlegen=True):
	name = frappe.db.get_value("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}, "name")
	if name:
		return frappe.get_doc("Plattform Interesse", name)
	if not anlegen:
		return None
	i = frappe.get_doc({"doctype": "Plattform Interesse", "projekt_id": p.name, "investor_id": n.id, "status": "gemerkt", "gemerkt": 0})
	verlauf(i, "gemerkt", n, "eigentuemer", "")
	i.insert(ignore_permissions=True)
	return i


@frappe.whitelist(methods=["POST"])
def merken(projektId=None, an=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	rolle_noetig(n, ["investor"], "Die Merkliste steht Investoren zur Verfügung.")
	an = True if an is None else (an if isinstance(an, bool) else v.wahr(an))
	p = _projekt_sichtbar(projektId)
	i = _interesse(p, n, anlegen=an)
	if not i:
		return None
	i.gemerkt = 1 if an else 0
	i.save(ignore_permissions=True)
	protokoll(n, "merken" if an else "entmerken", "projekt", p.name, "Projekt gemerkt" if an else "Von Merkliste entfernt")
	return interesse_json(i, n)


@frappe.whitelist(methods=["POST"])
def nda_anfragen(projektId=None, akzeptiert=None, ip=None, userAgent=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	rolle_noetig(n, ["investor"], "NDA-Anfragen sind Investoren vorbehalten.")
	p = _projekt_sichtbar(projektId)
	if p.anbieter_id == n.id:
		konflikt("Für eigene Projekte ist keine NDA nötig.")
	i = _interesse(p, n)
	if i.status != "gemerkt":
		return interesse_json(i, n)  # bereits angefragt – idempotent
	extra = {"ndaAkzeptiert": v.wahr(akzeptiert)}
	pruefe_uebergang("interesse", i.status, "nda_angefragt", "eigentuemer", extra, objekt=i)
	ip_ = v.text(ip, 64)
	i.nda = als_json({"version": NDA_VERSION, "am": jetzt_iso(), "ip": ip_, "userAgent": v.text(userAgent, 300)})
	uebergang_anwenden(n, "interesse", i, "nda_angefragt", "eigentuemer", extra, ip_)
	protokoll(n, "nda", "interesse", i.name, f"NDA {NDA_VERSION} akzeptiert für {p.name}", ip_)
	return interesse_json(i, n)


@frappe.whitelist(methods=["POST"])
def liste(alle=None, status=None, projektId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	alle = v.wahr(alle)
	if alle:
		admin_noetig(n)
	filters = {} if alle else {"investor_id": n.id}
	erlaubt = PROZESSE["interesse"]["status"]
	if status:
		st = [s for s in (status if isinstance(status, list) else [status]) if isinstance(s, str) and s in erlaubt]
		if not st:
			return []
		filters["status"] = ("in", st)
	if projektId:
		k = v.kennung(projektId)
		if not k:
			return []
		filters["projekt_id"] = k
	namen = frappe.get_all("Plattform Interesse", filters=filters, pluck="name", order_by="modified desc", limit_page_length=MAX_LISTE)
	return [interesse_ausgabe(frappe.get_doc("Plattform Interesse", x), n) for x in namen]
