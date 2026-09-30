# Copyright (c) 2026, ÖkoInvest GmbH
# Fachprüfung Kommunen – Gemeinde-Sicht (wie kommuneUebersicht im Demo-Backend, backend/demo/flaecheFach.js).
#
# Rechte: Nicht-Admins sehen nur eigene kommunale Anliegen (Plattform Vorgang, typ „kommune“, nutzer_id).
# Projekte im Gemeindegebiet erst, wenn das Backoffice ein Anliegen geprüft hat (Status qualifiziert/angebot/
# abgeschlossen), nur ab Planungsphase und nur vereinfacht – keine Eigentümer, Flurstücke, Pachtdaten, Kennungen.
# Backoffice: ohne vorgangId die Liste aller kommunalen Anliegen, mit vorgangId die Sicht dieses Anliegens.

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import flaeche_json
from oekoinvest_app.plattform.flaeche_fach import KOMMUNE_GEPRUEFT, KOMMUNE_SICHTBAR, flaeche_im_gebiet, projekt_fuer_gemeinde
from oekoinvest_app.plattform.kern import aus_json, ist_admin, iso, nicht_gefunden, nutzer, verboten
from oekoinvest_app.plattform.konstanten import VORGANG_TYPEN

FELDER = ["name", "typ", "status", "creation", "kontakt", "daten", "nutzer_id", "zustaendig_id"]


def _anliegen_ausgabe(z):
	d = aus_json(z.daten, {}) or {}
	k = aus_json(z.kontakt, {}) or {}
	return {
		"id": z.name,
		"status": z.status,
		"typ": VORGANG_TYPEN.get(z.typ, z.typ) if isinstance(VORGANG_TYPEN, dict) else z.typ,
		"gemeinde": d.get("gemeinde") or k.get("firma") or "",
		"land": k.get("land") or d.get("land") or "DE",
		"daten": {
			"absender": d.get("absender") or "",
			"rolle": d.get("rolle") or "",
			"bauleitplanung": d.get("bauleitplanung") or "",
			"kriterienkatalog": d.get("kriterienkatalog") or "",
			"interesse6": d.get("interesse6") or "",
			"buergerbeteiligung": d.get("buergerbeteiligung") if isinstance(d.get("buergerbeteiligung"), list) else [],
			"gemeindeFlaechenHa": d.get("gemeindeFlaechenHa"),
			"themen": d.get("themen") if isinstance(d.get("themen"), list) else [],
		},
		"erstelltAm": iso(z.creation),
	}


def _ansprechpartner(konto_id):
	if not konto_id:
		return None
	w = frappe.db.get_value("Plattform Konto", konto_id, ["vorname", "nachname"], as_dict=True)
	return {"vorname": w.vorname, "nachname": w.nachname} if w else None


@frappe.whitelist(methods=["POST"])
def uebersicht(vorgangId=None, als_benutzer=None):  # noqa: N803 – Name wie im API-Vertrag
	n = nutzer(als_benutzer)
	admin = ist_admin(n)
	if admin:
		k = v.kennung(vorgangId)
		if not k:
			zeilen = frappe.get_all("Plattform Vorgang", filters={"typ": "kommune"}, fields=FELDER, order_by="modified desc", limit_page_length=2000)
			return {"admin": True, "anliegen": [_anliegen_ausgabe(z) for z in zeilen], "gemeinden": [], "geprueft": False}
		if not frappe.db.exists("Plattform Vorgang", k):
			nicht_gefunden("Anliegen nicht gefunden.")
		zeilen = frappe.get_all("Plattform Vorgang", filters={"name": k}, fields=FELDER)
		if zeilen[0].typ != "kommune":
			verboten("Kein kommunales Anliegen.")
	else:
		zeilen = frappe.get_all("Plattform Vorgang", filters={"typ": "kommune", "nutzer_id": n.id}, fields=FELDER, order_by="modified desc", limit_page_length=200)

	geprueft = [z for z in zeilen if z.status in KOMMUNE_GEPRUEFT]
	gemeinden = []
	flaechen = None
	for z in geprueft:
		d = aus_json(z.daten, {}) or {}
		kt = aus_json(z.kontakt, {}) or {}
		g = {"name": d.get("gemeinde") or kt.get("firma") or "", "land": kt.get("land") or d.get("land") or "DE", "schluessel": d.get("gemeindeSchluessel") or ""}
		if not g["name"] and not g["schluessel"]:
			continue
		if any(x["name"] == g["name"] and x["land"] == g["land"] for x in gemeinden):
			continue
		if flaechen is None:
			namen = frappe.get_all("Plattform Flaeche", filters={"status": ["in", KOMMUNE_SICHTBAR]}, pluck="name", limit_page_length=5000)
			flaechen = [flaeche_json(frappe.get_doc("Plattform Flaeche", x)) for x in namen]
		projekte = [projekt_fuer_gemeinde(f, i) for i, f in enumerate([f for f in flaechen if flaeche_im_gebiet(f, g)])]
		par6 = sum((p.get("par6") or {}).get("euroProJahr", 0) for p in projekte)
		gemeinden.append(
			{
				**g,
				"vorgangId": z.name,
				"projekte": projekte,
				"summe": {"anzahl": len(projekte), "ha": sum(p["ha"] for p in projekte), "par6EuroProJahr": par6 if g["land"] == "DE" else None},
				"ansprechpartner": _ansprechpartner(z.zustaendig_id),
			}
		)
	return {"admin": admin, "anliegen": [_anliegen_ausgabe(z) for z in zeilen], "gemeinden": gemeinden, "geprueft": bool(geprueft)}
