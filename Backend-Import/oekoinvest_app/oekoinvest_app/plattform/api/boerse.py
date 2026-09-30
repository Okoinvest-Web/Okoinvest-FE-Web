# Copyright (c) 2026, ÖkoInvest GmbH
#
# Projektbörse. Ohne `als_benutzer` nur die öffentliche Projektion (Positivliste, plattform/oeffentlich.py).
# Vertrauliche Felder und Datenraum nur für Anbieter, Backoffice und Investoren mit freigegebenem NDA.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import datenraum_qualitaet, dokument_meta, interesse_json, projekt_json
from oekoinvest_app.plattform.kern import hat_rolle, ist_admin, jetzt_iso, name_von, nicht_gefunden, nutzer, protokoll, verboten
from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN_IDS, PROJEKT_TYPEN
from oekoinvest_app.plattform.matching import matching
from oekoinvest_app.plattform.oeffentlich import projekt_oeffentlich, projekt_vertraulich
from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, datenraum_ueber_interesse, interesse_fuer, suchprofil_fuer
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, DATENRAUM_STATUS


def _suchprofil(n):
	if not n:
		return None
	return suchprofil_fuer(n)  # Konto- bzw. Team-Suchprofil der aktiven Organisation


def boerse_eintrag(p, n, profil=None):
	pj = projekt_json(p)
	o = projekt_oeffentlich(pj)
	o["datenraumQualitaet"] = datenraum_qualitaet(pj)  # nur die Kennzahl, keine Dokumentnamen
	if n and hat_rolle(n, ["investor"]):
		i = interesse_fuer(n, p.name)  # eigenes bzw. Interesse der aktiven Organisation
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


def _checkliste_fuer(p, pj):
	"""Checkliste des Projekts (für den DD-Index) aus den Dokument-Metadaten."""
	from oekoinvest_app.plattform.checkliste import checkliste_projekt

	doks = frappe.get_all("Plattform Dokument", filters={"bezug_art": "projekt", "bezug_id": p.name}, fields=["name as id", "dateiname as name", "am", "checkliste"], limit_page_length=0)
	return checkliste_projekt(pj, doks)


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
	eigentuemer = bool(n) and (p.anbieter_id == n.id or darf_team_lesen_objekt(n, p))  # auch Team des Anbieters
	admin = ist_admin(n)
	if p.status not in BOERSE_STATUS and not eigentuemer and not admin:
		nicht_gefunden("Projekt nicht gefunden.")

	if v.wahr(zaehlen) and not eigentuemer and not admin:
		frappe.db.sql("update `tabPlattform Projekt` set aufrufe = aufrufe + 1 where name = %s", (p.name,))
		p.aufrufe = cint(p.aufrufe) + 1
		from oekoinvest_app.plattform.dealroom_kern import aufruf_zaehlen  # Deal-Room-Cockpit: Aufrufe je Tag

		aufruf_zaehlen(p.name)

	interesse = None
	if n:
		interesse = interesse_fuer(n, p.name)  # eigenes bzw. Interesse der aktiven Organisation
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
		# Fachprüfung Kapitalseite: Datenblatt und Due-Diligence-Index nur mit Datenraum-Zugriff
		from oekoinvest_app.plattform.fach.datenblatt import dd_index

		pj = projekt_json(p)
		out["datenblatt"] = pj.get("datenblatt") or {}
		out["ddIndex"] = dd_index(pj, _checkliste_fuer(p, pj))
		filters = {"bezug_art": "projekt", "bezug_id": p.name}
		if zugriff == "nda":
			filters["kategorie"] = "datenraum"
		out["dokumente"] = [dokument_meta(d) for d in frappe.get_all("Plattform Dokument", filters=filters, fields=["*"], order_by="am desc")]
		if zugriff == "nda":  # Deal-Room: Stufe-2-Unterlagen erst nach LOI
			from oekoinvest_app.plattform.dealroom_kern import stufe_ok

			out["dokumente"] = [m for m in out["dokumente"] if stufe_ok(p.name, m["id"], interesse.investor_id)]  # ggf. Team-Interesse
	return out


@frappe.whitelist(methods=["POST"])
def expose(id=None, ip=None, als_benutzer=None):  # noqa: A002
	"""Daten für das vertrauliche Exposé-PDF (das PDF erzeugt die Website, src/lib/plattform/server/expose.js).

	Berechtigt: Backoffice, Anbieter des Projekts, Investoren mit freigegebenem Datenraum (DATENRAUM_STATUS).
	Jeder Abruf wird protokolliert (Aktion „expose“).
	"""
	n = nutzer(als_benutzer)
	s = v.slug(id) or v.kennung(id)
	name = None
	if s:
		name = frappe.db.get_value("Plattform Projekt", {"slug": s}, "name") or (s if frappe.db.exists("Plattform Projekt", s) else None)
	if not name:
		nicht_gefunden("Projekt nicht gefunden.")
	p = frappe.get_doc("Plattform Projekt", name)
	zugriff = "admin" if ist_admin(n) else "eigentuemer" if (p.anbieter_id == n.id or darf_team_lesen_objekt(n, p)) else None  # auch Team des Anbieters
	if not zugriff:
		if p.status not in (*BOERSE_STATUS, "verkauft"):
			nicht_gefunden("Projekt nicht gefunden.")
		if not datenraum_ueber_interesse(n, p.name, DATENRAUM_STATUS):  # eigenes oder Team-Interesse
			verboten("Das vollständige Exposé steht nach Freigabe Ihrer NDA-Anfrage zur Verfügung.")
		zugriff = "nda"
	pj = projekt_json(p)
	filters = {"bezug_art": "projekt", "bezug_id": p.name}
	if zugriff == "nda":
		filters["kategorie"] = "datenraum"
	dokumente = [dokument_meta(d) for d in frappe.get_all("Plattform Dokument", filters=filters, fields=["*"], order_by="am desc")]
	konto = frappe.db.get_value("Plattform Konto", n.id, ["email", "firma"], as_dict=True) or {}
	protokoll(n, "expose", "projekt", p.name, f"Exposé-PDF abgerufen ({zugriff})", v.text(ip, 64))
	return {
		"projekt": {**projekt_oeffentlich(pj), "datenraumQualitaet": datenraum_qualitaet(pj)},
		"vertraulich": projekt_vertraulich(pj),
		"dokumente": dokumente,
		"zugriff": zugriff,
		"empfaenger": {"name": name_von(n.id), "firma": konto.get("firma") or "", "email": konto.get("email") or "", "rolle": "investor" if zugriff == "nda" else zugriff},
		"erstelltAm": jetzt_iso(),
	}
