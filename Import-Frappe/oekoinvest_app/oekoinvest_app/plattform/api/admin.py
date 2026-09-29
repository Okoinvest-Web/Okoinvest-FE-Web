# Copyright (c) 2026, ÖkoInvest GmbH
# Backoffice (Rolle „admin“ = Frappe-Rolle „Plattform Backoffice“): Zuweisung, Nutzer, Provisionen, Protokoll, Kennzahlen.

from collections import Counter, defaultdict

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import projekt_oeffentlich_aus_doc, provision_json
from oekoinvest_app.plattform.kern import (
	admin_noetig,
	iso,
	konflikt,
	konto_json,
	kurz,
	name_von,
	nicht_gefunden,
	nutzer,
	objekt_laden,
	protokoll,
	ungueltig,
)
from oekoinvest_app.plattform.konstanten import ALLE_ROLLEN_IDS
from oekoinvest_app.plattform.prozesse import BOERSE_STATUS, OFFENE_STATUS, PROZESSE

ZUWEISBAR = ("vorgang", "flaeche", "projekt", "interesse", "provision")


def _admin_konten_namen():
	return set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": "admin", "parenttype": "Plattform Konto"}, pluck="parent"))


@frappe.whitelist(methods=["POST"])
def zuweisen(art=None, id=None, zustaendigId=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	admin_noetig(n)
	if art not in ZUWEISBAR:
		ungueltig("Unbekannte Objektart.")
	o = objekt_laden(art, id)
	if not o:
		nicht_gefunden()
	z = v.kennung(zustaendigId) if zustaendigId else None
	if zustaendigId:
		aktiv = frappe.db.get_value("Plattform Konto", z, "aktiv") if z else None
		v.pflicht(z and cint(aktiv) and z in _admin_konten_namen(), "Zuständig kann nur ein aktives Backoffice-Konto sein.")
	o.zustaendig_id = z or None
	o.save(ignore_permissions=True)
	protokoll(n, "zuweisen", art, o.name, f"Zuständig: {name_von(z) if z else '–'}")
	return {"id": o.name, "zustaendigId": o.zustaendig_id or None}


def _zaehler(doctype, feld):
	return {
		r[feld]: cint(r.anzahl)
		for r in frappe.get_all(doctype, fields=[feld, "count(name) as anzahl"], group_by=feld, limit_page_length=0)
		if r[feld]
	}


@frappe.whitelist(methods=["POST"])
def nutzer_liste(q=None, rolle=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	namen = frappe.get_all("Plattform Konto", pluck="name", order_by="creation desc", limit_page_length=0)
	r = v.auswahl(rolle, ALLE_ROLLEN_IDS)
	if r:
		mit_rolle = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": r, "parenttype": "Plattform Konto"}, pluck="parent"))
		namen = [x for x in namen if x in mit_rolle]
	vorgaenge = _zaehler("Plattform Vorgang", "nutzer_id")
	flaechen = _zaehler("Plattform Flaeche", "nutzer_id")
	projekte = _zaehler("Plattform Projekt", "anbieter_id")
	interessen = _zaehler("Plattform Interesse", "investor_id")
	suche = v.text(q, 120).lower()
	ergebnis = []
	for name in namen:
		k = frappe.get_doc("Plattform Konto", name)
		if suche and suche not in " ".join(x or "" for x in (k.email, k.vorname, k.nachname, k.firma)).lower():
			continue
		ergebnis.append(
			{
				**konto_json(k),
				"zaehler": {
					"vorgaenge": vorgaenge.get(name, 0),
					"flaechen": flaechen.get(name, 0),
					"projekte": projekte.get(name, 0),
					"interessen": interessen.get(name, 0),
				},
			}
		)
	return ergebnis


@frappe.whitelist(methods=["POST"])
def nutzer_aendern(id=None, rollen=None, aktiv=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	admin_noetig(n)
	k = v.kennung(id)
	if not k or not frappe.db.exists("Plattform Konto", k):
		nicht_gefunden("Konto nicht gefunden.")
	konto = frappe.get_doc("Plattform Konto", k)
	if isinstance(rollen, list):
		r = v.mehrfach(rollen, ALLE_ROLLEN_IDS)
		v.pflicht(len(r) > 0, "Mindestens eine Rolle.")
		if konto.name == n.id and "admin" not in r:
			konflikt("Die eigene Admin-Rolle kann nicht entfernt werden.")
		konto.set("rollen", [{"rolle": x} for x in r])
	if isinstance(aktiv, bool):
		if konto.name == n.id and not aktiv:
			konflikt("Das eigene Konto kann nicht gesperrt werden.")
		konto.aktiv = 1 if aktiv else 0  # Sperren erhöht die Sitzungsversion (Controller)
	konto.save(ignore_permissions=True)
	protokoll(n, "nutzer", "nutzer", konto.name, f"Rollen: {', '.join(r.rolle for r in konto.rollen)}, aktiv: {'true' if cint(konto.aktiv) else 'false'}")
	return konto_json(konto)


@frappe.whitelist(methods=["POST"])
def provisionen(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	ergebnis = []
	for name in frappe.get_all("Plattform Provision", pluck="name", order_by="creation desc", limit_page_length=0):
		pv = frappe.get_doc("Plattform Provision", name)
		p = objekt_laden("projekt", pv.projekt_id)
		ergebnis.append(
			{
				**provision_json(pv),
				"projekt": projekt_oeffentlich_aus_doc(p) if p else None,
				"anbieter": kurz(pv.anbieter_id),
				"investor": kurz(pv.investor_id),
			}
		)
	return ergebnis


@frappe.whitelist(methods=["POST"])
def aktivitaeten(limit=None, objektId=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	anzahl = v.zahl(limit, min=1, max=100000)
	anzahl = min(500, int(anzahl)) if anzahl else 100
	filters = {}
	if objektId:
		filters["objekt_id"] = v.text(objektId, 60)
	zeilen = frappe.get_all(
		"Plattform Aktivitaet",
		filters=filters,
		fields=["name", "am", "nutzer_id", "aktion", "objekt_art", "objekt_id", "text", "ip"],
		order_by="am desc, creation desc",
		limit_page_length=anzahl,
	)
	namen = {}
	ergebnis = []
	for a in zeilen:
		if a.nutzer_id and a.nutzer_id not in namen:
			namen[a.nutzer_id] = name_von(a.nutzer_id)
		ergebnis.append(
			{
				"id": a.name,
				"am": iso(a.am),
				"nutzerId": a.nutzer_id or None,
				"aktion": a.aktion,
				"objektArt": a.objekt_art,
				"objektId": a.objekt_id,
				"text": a.text or "",
				"ip": a.ip or "",
				"nutzer": (namen.get(a.nutzer_id) or a.nutzer_id) if a.nutzer_id else "Gast/System",
			}
		)
	return ergebnis


@frappe.whitelist(methods=["POST"])
def admin_konten(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	admins = _admin_konten_namen()
	namen = frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name", order_by="nachname asc", limit_page_length=0)
	return [kurz(x) for x in namen if x in admins]


# ================================================================ Kennzahlen (Cockpit)


def _status_zaehlen(doctype, feld="status"):
	return {
		r[feld]: cint(r.anzahl)
		for r in frappe.get_all(doctype, fields=[feld, "count(name) as anzahl"], group_by=feld, limit_page_length=0)
		if r[feld]
	}


def _trichter(art, doctype):
	"""Anzahl Objekte, die mindestens die jeweilige Pipeline-Stufe erreicht haben (laut Statusverlauf)."""
	pipe = PROZESSE[art]["pipeline"]
	hoechste = defaultdict(lambda: -1)
	for e in frappe.get_all(
		"Plattform Statusverlauf",
		filters={"parenttype": doctype, "parentfield": "status_verlauf"},
		fields=["parent", "status"],
		limit_page_length=0,
	):
		if e.status in pipe:
			hoechste[e.parent] = max(hoechste[e.parent], pipe.index(e.status))
	return [{"status": s, "anzahl": sum(1 for x in hoechste.values() if x >= i)} for i, s in enumerate(pipe)]


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	vor7 = add_days(now_datetime(), -7)

	vorgaenge = frappe.get_all("Plattform Vorgang", fields=["status", "zustaendig_id", "creation"], limit_page_length=0)
	flaechen = frappe.get_all("Plattform Flaeche", fields=["status", "ha"], limit_page_length=0)
	projekte = frappe.get_all("Plattform Projekt", fields=["status", "mwp"], limit_page_length=0)
	interessen = frappe.get_all("Plattform Interesse", fields=["status", "nda", "loi"], limit_page_length=0)
	provisionen_ = frappe.get_all("Plattform Provision", fields=["status", "betrag"], limit_page_length=0)

	offen_v = OFFENE_STATUS["vorgang"]
	rollen = Counter(r.rolle for r in frappe.get_all("Plattform Konto Rolle", filters={"parenttype": "Plattform Konto"}, fields=["rolle"], limit_page_length=0))

	return {
		"vorgaenge": {
			"gesamt": len(vorgaenge),
			"neu7": sum(1 for x in vorgaenge if get_datetime(x.creation) >= vor7),
			"offen": sum(1 for x in vorgaenge if x.status in offen_v),
			"ohneZustaendig": sum(1 for x in vorgaenge if x.status in offen_v and not x.zustaendig_id),
			"status": _status_zaehlen("Plattform Vorgang"),
			"typ": _status_zaehlen("Plattform Vorgang", "typ"),
			"trichter": _trichter("vorgang", "Plattform Vorgang"),
		},
		"flaechen": {
			"gesamt": len(flaechen),
			"ha": int(round(sum(flt(f.ha) for f in flaechen if f.status != "abgelehnt"))),
			"status": _status_zaehlen("Plattform Flaeche"),
			"trichter": _trichter("flaeche", "Plattform Flaeche"),
		},
		"projekte": {
			"gesamt": len(projekte),
			"inPruefung": sum(1 for p in projekte if p.status == "pruefung"),
			"mwpBoerse": round(sum(flt(p.mwp) for p in projekte if p.status in BOERSE_STATUS) * 10) / 10,
			"status": _status_zaehlen("Plattform Projekt"),
		},
		"interessen": {
			"status": _status_zaehlen("Plattform Interesse"),
			"ndaOffen": sum(1 for i in interessen if i.status == "nda_angefragt"),
			"loiOffen": sum(1 for i in interessen if i.status == "loi_abgegeben"),
			"trichter": [
				{"status": "veroeffentlicht", "label": "Projekte in der Börse", "anzahl": sum(1 for p in projekte if p.status in ("veroeffentlicht", "reserviert", "verkauft"))},
				{"status": "nda", "label": "NDA angefragt", "anzahl": sum(1 for i in interessen if i.nda)},
				{"status": "loi", "label": "LOI abgegeben", "anzahl": sum(1 for i in interessen if i.loi)},
				{"status": "verkauft", "label": "Verkauft", "anzahl": sum(1 for p in projekte if p.status == "verkauft")},
			],
		},
		"provisionen": {
			"anzahl": len(provisionen_),
			"offen": sum(flt(p.betrag) for p in provisionen_ if p.status in ("offen", "in_rechnung")),
			"bezahlt": sum(flt(p.betrag) for p in provisionen_ if p.status == "bezahlt"),
		},
		"nutzer": {"gesamt": frappe.db.count("Plattform Konto"), "rollen": dict(rollen)},
		"nachrichten": {"ungelesen": frappe.db.count("Plattform Nachricht", {"gelesen_admin": 0})},
	}
