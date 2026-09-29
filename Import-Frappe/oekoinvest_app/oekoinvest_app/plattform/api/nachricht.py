# Copyright (c) 2026, ÖkoInvest GmbH
# Nachrichten-Threads je Objekt (Vorgang, Fläche, Projekt, Interesse) bzw. allgemein je Nutzer.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import ist_eigen, thread_info
from oekoinvest_app.plattform.kern import darf_bezug, ist_admin, iso, nachricht_anlegen, name_von, nutzer, objekt_laden, protokoll

MAX_THREADS = 500


def eigene_bezuege(n):
	"""Kennungen aller Objekte, die dem Nutzer gehören – je Bezugsart."""
	return {
		"vorgang": frappe.get_all("Plattform Vorgang", filters={"nutzer_id": n.id}, pluck="name", limit_page_length=0),
		"flaeche": frappe.get_all("Plattform Flaeche", filters={"nutzer_id": n.id}, pluck="name", limit_page_length=0),
		"projekt": frappe.get_all("Plattform Projekt", filters={"anbieter_id": n.id}, pluck="name", limit_page_length=0),
		"interesse": frappe.get_all("Plattform Interesse", filters={"investor_id": n.id}, pluck="name", limit_page_length=0),
		"nutzer": [n.id],
	}


@frappe.whitelist(methods=["POST"])
def threads(nurUngelesen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin = ist_admin(n)
	werte = {}
	bedingung = ""
	if not admin:
		teile = []
		for i, (art, namen) in enumerate(eigene_bezuege(n).items()):
			if namen:
				teile.append(f"(bezug_art = %(art{i})s and bezug_id in %(ids{i})s)")
				werte[f"art{i}"] = art
				werte[f"ids{i}"] = tuple(namen)
		if not teile:
			return []
		bedingung = "where " + " or ".join(teile)
	gruppen = frappe.db.sql(
		f"""
		select bezug_art, bezug_id, count(*) as anzahl,
			sum(case when gelesen_admin = 0 then 1 else 0 end) as offen_admin,
			sum(case when gelesen_nutzer = 0 then 1 else 0 end) as offen_nutzer,
			max(am) as letzte_am
		from `tabPlattform Nachricht`
		{bedingung}
		group by bezug_art, bezug_id
		order by letzte_am desc
		limit {MAX_THREADS}
		""",
		werte,
		as_dict=True,
	)
	ergebnis = []
	for g in gruppen:
		o = objekt_laden(g.bezug_art, g.bezug_id)
		if not o:
			continue
		eigen = ist_eigen(g.bezug_art, o, n)
		if not admin and not eigen:
			continue
		ungelesen = cint(g.offen_admin) if (admin and not eigen) else cint(g.offen_nutzer)
		if v.wahr(nurUngelesen) and not ungelesen:
			continue
		letzte = frappe.get_all(
			"Plattform Nachricht",
			filters={"bezug_art": g.bezug_art, "bezug_id": g.bezug_id},
			fields=["text", "am", "von_admin", "system"],
			order_by="am desc, creation desc",
			limit_page_length=1,
		)[0]
		ergebnis.append(
			{
				"bezugArt": g.bezug_art,
				"bezugId": g.bezug_id,
				**(thread_info(g.bezug_art, g.bezug_id, n, o) or {}),
				"anzahl": cint(g.anzahl),
				"ungelesen": ungelesen,
				"letzte": {"text": (letzte.text or "")[:160], "am": iso(letzte.am), "vonAdmin": bool(cint(letzte.von_admin)), "system": bool(cint(letzte.system))},
			}
		)
	ergebnis.sort(key=lambda t: t["letzte"]["am"] or "", reverse=True)
	return ergebnis


@frappe.whitelist(methods=["POST"])
def liste(bezugArt=None, bezugId=None, markieren=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	o = darf_bezug(n, bezugArt, bezugId)
	eigen = ist_eigen(bezugArt, o, n)
	als_admin = ist_admin(n) and not eigen
	nachrichten = frappe.get_all(
		"Plattform Nachricht",
		filters={"bezug_art": bezugArt, "bezug_id": o.name},
		fields=["name", "text", "am", "system", "von_admin", "von_id", "gelesen_nutzer", "gelesen_admin"],
		order_by="am asc, creation asc",
		limit_page_length=0,
	)
	feld = "gelesen_admin" if als_admin else "gelesen_nutzer"
	offen = [m.name for m in nachrichten if not cint(m[feld])]
	markieren = True if markieren is None else v.wahr(markieren)
	if markieren and offen:
		frappe.db.sql(f"update `tabPlattform Nachricht` set `{feld}` = 1 where name in %(namen)s", {"namen": tuple(offen)})
	namen_cache = {}

	def von_name(m):
		if cint(m.von_admin):
			return "ÖkoInvest Backoffice"
		if m.von_id not in namen_cache:
			namen_cache[m.von_id] = name_von(m.von_id)
		return namen_cache[m.von_id] or "Nutzer"

	return {
		**(thread_info(bezugArt, o.name, n, o) or {}),
		"bezugArt": bezugArt,
		"bezugId": o.name,
		"nachrichten": [
			{
				"id": m.name,
				"text": m.text,
				"am": iso(m.am),
				"system": bool(cint(m.system)),
				"vonAdmin": bool(cint(m.von_admin)),
				"eigene": m.von_id == n.id and not cint(m.system),
				"vonName": von_name(m),
				"neu": not cint(m[feld]),
			}
			for m in nachrichten
		],
	}


@frappe.whitelist(methods=["POST"])
def senden(bezugArt=None, bezugId=None, text=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	t = v.mehrzeilig(text, 5000)
	v.pflicht(len(t) >= 2, "Bitte geben Sie eine Nachricht ein.")
	o = darf_bezug(n, bezugArt, bezugId)
	eigen = ist_eigen(bezugArt, o, n)
	als_admin = ist_admin(n) and not eigen
	m = nachricht_anlegen(
		bezugArt,
		o.name,
		von_id=n.id,
		von_admin=als_admin,
		text=t,
		gelesen_nutzer=not als_admin,
		gelesen_admin=als_admin,
	)
	protokoll(n, "nachricht", bezugArt, o.name, "Nachricht gesendet")
	return {"id": m.name, "am": iso(m.am)}
