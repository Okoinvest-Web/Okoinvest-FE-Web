# Copyright (c) 2026, ÖkoInvest GmbH
#
# Geodaten & Akquise-Engine (docs/AKQUISE-GEODATEN.md, docs/API.md Abschnitt „Geodaten“) – Referenz:
# src/lib/plattform/backend/demo/geodaten.js. Die Geodaten selbst (Parzellen, Netzknoten, Scoring) liegen im
# Geodaten-Dienst (Backend-Import/dienste/geodaten, PostGIS); Frappe hält nur die übernommenen Akquise-Ziele und die
# gepflegten Netzkapazitäten.
#
# Rechte (jede Methode selbst, zusätzlich zur Website): Backoffice-Bereich „geodaten“ (Unterrollen Leitung, Akquise);
# Übernahme zusätzlich „akquise“ schreiben. Der Kandidat wird von der Website serverseitig aus dem Dienst geladen und
# hier erneut plausibilisiert (Größe, Score, Geometrie) – Browserdaten gelangen nie ungeprüft hierher.

import json

import frappe
from frappe.utils import add_days, flt, getdate, nowdate

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import flurstueck_zeile
from oekoinvest_app.plattform.backoffice import info, tag_setzen
from oekoinvest_app.plattform.doctype.plattform_akquise_ziel.plattform_akquise_ziel import geometrie_pruefen
from oekoinvest_app.plattform.flaeche_fach import flurstuecke_pruefen
from oekoinvest_app.plattform.kern import als_json, aus_json, iso, konflikt, nicht_gefunden, nutzer, protokoll, ungueltig, verlauf
from oekoinvest_app.plattform.konstanten import BUNDESLAENDER, PRAEFIX
from oekoinvest_app.plattform.rechte import recht_noetig

PRAEFIX.update({"Plattform Akquise Ziel": "AZ", "Plattform Netzkapazitaet": "NK"})

DT_ZIEL = "Plattform Akquise Ziel"
DT_KAP = "Plattform Netzkapazitaet"
KNOTEN_ARTEN = ("uew", "uw110", "ms", "trafo")


def _netz_kategorie(trasse_km):
	if trasse_km is None:
		return "unbekannt"
	if trasse_km < 1:
		return "lt1"
	if trasse_km <= 3:
		return "1-3"
	if trasse_km <= 5:
		return "3-5"
	if trasse_km <= 10:
		return "5-10"
	return "gt10"


def ziel_json(z):
	f = frappe.db.get_value("Plattform Flaeche", z.flaeche_id, ["name", "bezeichnung", "status"], as_dict=True) if z.flaeche_id else None
	return {
		"id": z.name,
		"kandidatId": z.kandidat_id,
		"flaecheId": z.flaeche_id,
		"aufgabeId": z.aufgabe_id,
		"status": z.status,
		"score": z.score,
		"ha": z.flaeche_ha,
		"mwp": z.mwp,
		"bundesland": z.bundesland,
		"bezirk": z.bezirk,
		"gemeinde": z.gemeinde,
		"parzellen": aus_json(z.parzellen) or [],
		"umspannwerk": {"id": z.umspannwerk_id, "name": z.umspannwerk_name, "art": z.umspannwerk_art, "trasseM": z.trasse_m, "kostenMin": z.netzkosten_min, "kostenMax": z.netzkosten_max} if z.umspannwerk_id else None,
		"demo": bool(z.demo),
		"von": z.uebernommen_von,
		"am": iso(z.creation),
		"flaeche": {"id": f.name, "bezeichnung": f.bezeichnung, "status": f.status} if f else None,
	}


@frappe.whitelist(methods=["POST"])
def ziele(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	namen = frappe.get_all(DT_ZIEL, pluck="name", order_by="creation desc", limit_page_length=500)
	return {"ziele": [ziel_json(frappe.get_doc(DT_ZIEL, x)) for x in namen]}


@frappe.whitelist(methods=["POST"])
def ziel_uebernehmen(kandidat=None, notiz=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 2)
	recht_noetig(n, "akquise", 2)
	k = aus_json(kandidat, {}) or {}
	kid = v.text(k.get("id"), 80)
	if not kid:
		nicht_gefunden("Kandidatenfläche nicht gefunden.")
	alt = frappe.db.get_value(DT_ZIEL, {"kandidat_id": kid, "status": ["!=", "verworfen"]}, ["name", "flaeche_id"], as_dict=True)
	if alt:
		konflikt(f"Diese Fläche ist bereits als Akquise-Ziel übernommen ({alt.flaeche_id or alt.name}).")
	ha = v.zahl(k.get("ha"), min=0.01, max=100000, stellen=2)
	score = v.zahl(k.get("score"), min=0, max=100)
	if ha is None or score is None:
		ungueltig("Kandidat unvollständig (Größe/Score).")
	geometrie = json.dumps(k.get("geometrie")) if k.get("geometrie") else None
	fehler = geometrie_pruefen(geometrie)
	if fehler:
		ungueltig(fehler)
	land = v.auswahl(k.get("land"), ["DE", "AT", "CH"], "AT")
	bundesland = v.auswahl(k.get("bundesland"), BUNDESLAENDER.get(land, []), "")
	parzellen = [
		{"id": v.text(p.get("id"), 60), "kg": v.text(p.get("kg"), 80), "kgNr": v.text(p.get("kgNr"), 10), "gstNr": v.text(p.get("gstNr"), 20), "ha": v.zahl(p.get("ha"), min=0, max=100000, stellen=4)}
		for p in (k.get("parzellen") or [])[:50]
		if isinstance(p, dict)
	]
	flurstuecke, _ = flurstuecke_pruefen(
		[{"gemarkung": (p["kg"] or "").replace("DEMO-KG ", ""), "gemarkungNr": p["kgNr"], "nummer": p["gstNr"], "m2": round((p["ha"] or 0) * 10000)} for p in parzellen], land
	)
	netz = k.get("netz") if isinstance(k.get("netz"), dict) else None
	kn = (netz or {}).get("knoten") or {}
	kosten = (netz or {}).get("kosten") or {}
	trasse_m = v.zahl((netz or {}).get("trasseM"), min=0, max=200000)
	trasse_km = round(trasse_m / 100) / 10 if trasse_m is not None else None
	merkmale = k.get("merkmale") if isinstance(k.get("merkmale"), dict) else {}
	widmung = k.get("widmung") if isinstance(k.get("widmung"), dict) else {}
	hinweise = "\n".join(
		x
		for x in (
			f"Aus der Geodaten-Akquise übernommen (Kandidat {kid}, Score {int(score)}{', DEMO-Daten' if k.get('demo') else ''}).",
			f"Netz: {v.text(kn.get('name'), 80) or v.text(kn.get('art'), 10)}, geschätzte Trasse {str(trasse_km).replace('.', ',')} km, Netzanschluss ≈ {round(flt(kosten.get('min')) / 1000)}–{round(flt(kosten.get('max')) / 1000)} T€." if netz else "Netz: kein geeigneter Knoten im Suchradius.",
			f"Widmung: {v.text(widmung.get('text'), 600) or 'unklar'}",
			"Eigentümer unbekannt – Grundbuchabfrage über Verrechnungsstelle (Aufgabe).",
			f"Notiz: {v.mehrzeilig(notiz, 1000)}" if notiz else "",
		)
		if x
	)
	gemeinde = v.text(k.get("gemeinde"), 80)
	f = frappe.get_doc(
		{
			"doctype": "Plattform Flaeche",
			"bezeichnung": v.text(f"Akquise-Ziel {gemeinde} · {str(ha).replace('.', ',')} ha", 120),
			"status": "entwurf",
			"nutzer_id": None,  # Eigentümerkonto entsteht erst nach Grundbuchabfrage und Kontakt (CRM)
			"zustaendig_id": n.id,
			"land": land,
			"bundesland": bundesland,
			"ort": gemeinde,
			"gemarkung": (parzellen[0]["kg"] if parzellen else "").replace("DEMO-KG ", ""),
			"ha": ha,
			"nutzung": "gruenland" if merkmale.get("hauptnutzung") == "gruenland" else "acker",
			"eigentum": "eigentum",
			"hinweise": hinweise,
		}
	)
	f.set("flurstuecke", [flurstueck_zeile(x) for x in flurstuecke])
	verlauf(f, "entwurf", n, "admin", "Aus Geodaten-Akquise übernommen")
	f.insert(ignore_permissions=True)

	i = info("flaeche", f.name, erzeugen=True)
	i.netz = _netz_kategorie(trasse_km)
	besonderheiten = ["schutzgebiet"] if any(flt(s.get("anteil")) > 0.05 or flt(s.get("abstandM"), 9999) <= 200 for s in (merkmale.get("schutz") or []) if isinstance(s, dict)) else []
	if flt(merkmale.get("neigungGrad")) > 7:
		besonderheiten.append("hang")
	i.besonderheiten = als_json(besonderheiten)
	i.prioritaet = v.auswahl(k.get("prioritaet"), ["A", "B", "C"], "") or None
	i.save(ignore_permissions=True)
	tag_setzen("flaeche", f.name, "Geodaten")
	if k.get("demo"):
		tag_setzen("flaeche", f.name, "DEMO")

	a = frappe.get_doc(
		{
			"doctype": "Plattform Aufgabe",
			"titel": "Eigentümer ermitteln (Grundbuchabfrage)",
			"beschreibung": "\n".join(
				[
					"Grundbuchauszug je Grundstück über die Verrechnungsstelle abfragen (Suche nach KG + Grundstücksnummer, nicht nach Person).",
					"Grundstücke: " + (", ".join(f"KG {p['kgNr']} Gst. {p['gstNr']}" for p in parzellen) or "siehe Fläche") + ".",
					"Ergebnis als CRM-Kontakt anlegen (Herkunft „Grundbuch“), Erstkontakt nur per Brief mit Datenschutzinformation (Art. 14 DSGVO) und Widerspruchshinweis.",
				]
			),
			"faellig_am": add_days(nowdate(), 5),
			"zustaendig_id": n.id,
			"status": "offen",
			"bezug_art": "flaeche",
			"bezug_id": f.name,
			"erstellt_von": n.id,
		}
	).insert(ignore_permissions=True)

	z = frappe.get_doc(
		{
			"doctype": DT_ZIEL,
			"titel": v.text(f"{gemeinde} · {ha} ha · Score {int(score)}", 140),
			"status": "offen",
			"kandidat_id": kid,
			"flaeche_id": f.name,
			"aufgabe_id": a.name,
			"uebernommen_von": n.id,
			"demo": 1 if k.get("demo") else 0,
			"score": int(score),
			"flaeche_ha": ha,
			"mwp": v.zahl(k.get("mwp"), min=0, max=100000, stellen=1),
			"bundesland": bundesland,
			"bezirk": v.text(k.get("bezirk"), 80),
			"gemeinde": gemeinde,
			"umspannwerk_id": v.text(kn.get("id"), 80) or None,
			"umspannwerk_name": v.text(kn.get("name"), 140),
			"umspannwerk_art": v.auswahl(kn.get("art"), KNOTEN_ARTEN, ""),
			"trasse_m": int(trasse_m) if trasse_m is not None else None,
			"netzkosten_min": v.zahl(kosten.get("min"), min=0),
			"netzkosten_max": v.zahl(kosten.get("max"), min=0),
			"parzellen": als_json(parzellen),
			"geometrie": geometrie,
			"notiz": v.mehrzeilig(notiz, 1000) if notiz else None,
		}
	).insert(ignore_permissions=True)
	protokoll(n, "anlegen", "flaeche", f.name, f"Akquise-Ziel aus Geodaten übernommen ({kid}, Score {int(score)}, {ha} ha) + Aufgabe „Eigentümer ermitteln“")
	return {"ziel": ziel_json(z), "flaecheId": f.name, "aufgabeId": a.name}


@frappe.whitelist(methods=["POST"])
def kapazitaeten(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 1)
	out = {}
	for x in frappe.get_all(DT_KAP, fields=["knoten_id", "kapazitaet", "frei_mw", "quelle", "stand", "gepflegt_von", "modified"], limit_page_length=0):
		out[x.knoten_id] = {"kapazitaet": x.kapazitaet, "freiMw": x.frei_mw, "quelle": x.quelle, "stand": str(x.stand) if x.stand else None, "von": x.gepflegt_von, "am": iso(x.modified)}
	return out


@frappe.whitelist(methods=["POST"])
def kapazitaet_setzen(knotenId=None, daten=None, als_benutzer=None):  # noqa: N803 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	recht_noetig(n, "geodaten", 2)
	d = aus_json(daten, {}) or {}
	kid = v.text(knotenId, 80)
	v.pflicht(bool(kid) and all(c.isalnum() or c in "._:-" for c in kid) and len(kid) >= 3, "Ungültiger Netzknoten.")
	kap = v.auswahl(d.get("kapazitaet"), ["frei", "knapp", "unbekannt"], "")
	v.pflicht(kap, "Kapazität: frei, knapp oder unbekannt.")
	quelle = v.text(d.get("quelle"), 200)
	v.pflicht(len(quelle) >= 3, "Bitte die Quelle angeben (z. B. Veröffentlichung des Netzbetreibers mit Datum oder Auskunft).")
	frei = None if d.get("freiMw") in (None, "") else v.zahl(d.get("freiMw"), min=0, max=5000, stellen=1)
	stand = d.get("stand") if isinstance(d.get("stand"), str) and len(d.get("stand")) == 10 else nowdate()
	getdate(stand)
	name = frappe.db.get_value(DT_KAP, {"knoten_id": kid}, "name")
	doc = frappe.get_doc(DT_KAP, name) if name else frappe.get_doc({"doctype": DT_KAP, "knoten_id": kid})
	doc.update({"kapazitaet": kap, "frei_mw": frei, "quelle": quelle, "stand": stand, "gepflegt_von": n.id})
	doc.save(ignore_permissions=True) if name else doc.insert(ignore_permissions=True)
	protokoll(n, "aendern", "netzknoten", kid, f"Netzkapazität {kap}{f' ({frei} MW frei)' if frei is not None else ''} – Quelle: {quelle}")
	return {"knotenId": kid, "kapazitaet": kap, "freiMw": frei, "quelle": quelle, "stand": str(stand), "von": n.id}
