# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektbörse. Ohne `als_benutzer` nur die öffentliche Projektion (Positivliste, plattform/oeffentlich.py).
# Vertrauliche Felder und Datenraum nur für Anbieter, Backoffice und Investoren mit freigegebenem NDA.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import dokument_meta, interesse_json, projekt_json
from oekoinvest_app.plattform.kern import aus_json, hat_rolle, ist_admin, nicht_gefunden, nutzer
from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN_IDS, PROJEKT_TYPEN
from oekoinvest_app.plattform.matching import matching
from oekoinvest_app.plattform.oeffentlich import projekt_oeffentlich, projekt_vertraulich
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS


def _suchprofil(n):
	if not n:
		return None
	return aus_json(frappe.db.get_value("Plattform Konto", n.id, "suchprofil"))


def boerse_eintrag(p, n, profil=None):
	pj = projekt_json(p)
	o = projekt_oeffentlich(pj)
	if n and hat_rolle(n, ["investor"]):
		i = frappe.db.get_value("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}, ["name", "status", "gemerkt"], as_dict=True)
		o["meinInteresse"] = {"id": i.name, "status": i.status, "gemerkt": bool(cint(i.gemerkt))} if i else None
		if profil:
			o["matching"] = matching(pj, profil)
	return o


@frappe.whitelist(methods=["POST"])
def liste(typ=None, land=None, phase=None, mwpMin=None, mwpMax=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	filters = {"status": ("in", BOERSE_STATUS)}
	t = v.auswahl(typ, PROJEKT_TYPEN)
	if t:
		filters["typ"] = t
	la = v.auswahl(land, LAENDER)
	if la:
		filters["land"] = la
	ph = v.auswahl(phase, PHASEN_IDS)
	if ph:
		filters["phase"] = ph
	mn = v.zahl(mwpMin, min=0)
	mx = v.zahl(mwpMax, min=0)
	if mn is not None and mx is not None:
		filters["mwp"] = ("between", [mn, mx])
	elif mn is not None:
		filters["mwp"] = (">=", mn)
	elif mx is not None:
		filters["mwp"] = ("<=", mx)
	namen = frappe.get_all("Plattform Projekt", filters=filters, pluck="name", order_by="veroeffentlicht_am desc", limit_page_length=500)
	profil = _suchprofil(n) if n and hat_rolle(n, ["investor"]) else None
	projekte = [boerse_eintrag(frappe.get_doc("Plattform Projekt", x), n, profil) for x in namen]

	sichtbar = frappe.get_all("Plattform Projekt", filters={"status": ("in", BOERSE_STATUS)}, fields=["mwp", "land", "demo"], limit_page_length=0)
	return {
		"projekte": projekte,
		"kennzahlen": {
			"anzahl": len(sichtbar),
			"mwp": round(sum(float(x.mwp or 0) for x in sichtbar) * 10) / 10,
			"laender": len({x.land for x in sichtbar if x.land}),
			"verkauft": frappe.db.count("Plattform Projekt", {"status": "verkauft"}),
		},
		# Hinweis „Vorführdaten“ nur, wenn Demo-Projekte in der Börse stehen
		"demo": any(cint(x.demo) for x in sichtbar),
	}


@frappe.whitelist(methods=["POST"])
def detail(schluessel=None, zaehlen=None, als_benutzer=None):
	n = nutzer(als_benutzer, pflicht=False)
	s = v.slug(schluessel) or v.kennung(schluessel)
	name = None
	if s:
		name = frappe.db.get_value("Plattform Projekt", {"slug": s}, "name") or (s if frappe.db.exists("Plattform Projekt", s) else None)
	if not name:
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", name)
	eigentuemer = bool(n) and p.anbieter_id == n.id
	admin = ist_admin(n)
	if p.status not in BOERSE_STATUS and not eigentuemer and not admin:
		nicht_gefunden("Projekt nicht gefunden.")

	if v.wahr(zaehlen) and not eigentuemer and not admin:
		frappe.db.sql("update `tabPlattform Projekt` set aufrufe = aufrufe + 1 where name = %s", (p.name,))
		p.aufrufe = cint(p.aufrufe) + 1

	interesse = None
	if n:
		iname = frappe.db.get_value("Plattform Interesse", {"projekt_id": p.name, "investor_id": n.id}, "name")
		interesse = frappe.get_doc("Plattform Interesse", iname) if iname else None
	nda_frei = bool(interesse) and interesse.status in DATENRAUM_STATUS
	zugriff = "admin" if admin else "eigentuemer" if eigentuemer else "nda" if nda_frei else "oeffentlich"

	profil = _suchprofil(n) if n and hat_rolle(n, ["investor"]) else None
	out = {
		"projekt": boerse_eintrag(p, n, profil),
		"zugriff": zugriff,
		"interesse": interesse_json(interesse, n) if interesse else None,
		"vertraulich": None,
		"dokumente": [],
	}
	if zugriff != "oeffentlich":
		out["vertraulich"] = projekt_vertraulich(projekt_json(p))
		filters = {"bezug_art": "projekt", "bezug_id": p.name}
		if zugriff == "nda":
			filters["kategorie"] = "datenraum"
		out["dokumente"] = [dokument_meta(d) for d in frappe.get_all("Plattform Dokument", filters=filters, fields=["*"], order_by="am desc")]
	return out
