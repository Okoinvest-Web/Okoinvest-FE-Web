# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gemeindecockpit (Team 5, Rolle kommune) – Vertrag: docs/API.md, Abschnitt „Gemeindecockpit“.
# Referenz: src/lib/plattform/backend/demo/gemeinde.js. Regeln: plattform/gemeinde_kern.py (1:1 wie gemeinde/cockpit.js).
#
# Rechte: Gemeinde nur mit eigenem, vom Backoffice geprüftem kommunalem Anliegen (Plattform Vorgang typ „kommune“,
# Status qualifiziert/angebot/abgeschlossen); Backoffice Bereich „kommunen“ (lesen ≥ 1, schreiben = 2).
# Verfahren und Einnahmen pflegt nur das Backoffice; Termine und Stellungnahmen beide Seiten (Gemeinde nur eigene Termine).
# Projekte nur vereinfacht (projekt_fuer_gemeinde) mit nicht aufzählbarer Referenz statt Flächen-Kennung.

import hashlib
import re

import frappe
from frappe.utils import flt, now_datetime

from oekoinvest_app.plattform import gemeinde_kern as C
from oekoinvest_app.plattform import mitglied_kern as MK
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ausgabe import flaeche_json
from oekoinvest_app.plattform.flaeche_fach import KOMMUNE_GEPRUEFT, KOMMUNE_SICHTBAR, flaeche_im_gebiet, projekt_fuer_gemeinde
from oekoinvest_app.plattform.kern import PRAEFIX, ALPHABET, als_json, aus_json, ist_admin, jetzt_iso, konflikt, konto_json, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

PRAEFIX.update({"Plattform Gemeinde Akte": "GA"})
DT = "Plattform Gemeinde Akte"
BEREICH = "kommunen"


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except MK.MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _kennung(praefix):
	import secrets

	return f"{praefix}-{now_datetime().strftime('%y')}-" + "".join(secrets.choice(ALPHABET) for _ in range(6))


def _norm_name(s):
	s = re.sub(r"\((demo|fiktiv)\)", "", str(s or "").lower())
	s = re.sub(r"^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde)\s+", "", s)
	return re.sub(r"[^a-z0-9äöüß]+", " ", s).strip()


def akte_schluessel(g):
	return f"{g['land']}:{g.get('schluessel') or _norm_name(g.get('name'))}"


def _projekt_ref(flaeche_id):
	return hashlib.sha256(f"gemeinde-projekt:{flaeche_id}".encode()).hexdigest()[:10]


def _gemeinde_von(vg):
	d = aus_json(vg.daten, {}) or {}
	k = aus_json(vg.kontakt, {}) or {}
	return {"name": d.get("gemeinde") or k.get("firma") or "", "land": k.get("land") or d.get("land") or "DE", "schluessel": d.get("gemeindeSchluessel") or ""}


def _zugriff(n, vorgang_id, schreiben=False):
	if not n:
		nicht_angemeldet()
	k = v.kennung(vorgang_id)
	vg = frappe.get_doc("Plattform Vorgang", k) if k and frappe.db.exists("Plattform Vorgang", k) else None
	if vg and vg.typ != "kommune":
		vg = None
	if ist_admin(n):
		if stufe(n, BEREICH) < 1:
			verboten("Ihre Backoffice-Rolle erlaubt keinen Zugriff auf Kommunen.")
		if schreiben and stufe(n, BEREICH) < 2:
			verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Kommunen & Gemeinden“ kein Schreiben.")
		if not vg:
			nicht_gefunden("Anliegen nicht gefunden.")
		return vg, _gemeinde_von(vg), "backoffice"
	if "kommune" not in (n.get("rollen") or []):
		verboten("Das Gemeindecockpit steht Kommunen zur Verfügung.")
	if not vg or vg.nutzer_id != n.id:
		nicht_gefunden("Anliegen nicht gefunden.")
	if vg.status not in KOMMUNE_GEPRUEFT:
		verboten("Das Gemeindecockpit wird nach der Prüfung Ihres Anliegens freigeschaltet.")
	return vg, _gemeinde_von(vg), "gemeinde"


def _akte(g, erzeugen=False):
	k = akte_schluessel(g)
	name = frappe.db.get_value(DT, {"schluessel": k}, "name")
	if name:
		doc = frappe.get_doc(DT, name, for_update=erzeugen)
	elif erzeugen:
		doc = frappe.get_doc({"doctype": DT, "schluessel": k, "gemeinde": g["name"], "land": g["land"], "daten": als_json({"verfahren": {}, "termine": [], "zahlungen": [], "stellungnahmen": [], "verlauf": []})})
		doc.insert(ignore_permissions=True)
	else:
		return None, {"id": None, "verfahren": {}, "termine": [], "zahlungen": [], "stellungnahmen": [], "verlauf": []}
	d = aus_json(doc.daten, {}) or {}
	for x in ("termine", "zahlungen", "stellungnahmen", "verlauf"):
		d.setdefault(x, [])
	d.setdefault("verfahren", {})
	d["id"] = doc.name
	return doc, d


def _projekte(g):
	namen = frappe.get_all("Plattform Flaeche", filters={"status": ["in", KOMMUNE_SICHTBAR]}, pluck="name", limit_page_length=5000)
	fl = [f for f in (flaeche_json(frappe.get_doc("Plattform Flaeche", x)) for x in namen) if flaeche_im_gebiet(f, g)]
	return [{**projekt_fuer_gemeinde(f, i), "ref": _projekt_ref(f["id"])} for i, f in enumerate(fl)]


def _angebote(g):
	out = []
	for x in frappe.get_all("Plattform Genossenschaft", filters={"land": g["land"]}, fields=["titel", "register_status"], limit_page_length=50):
		out.append({"art": "genossenschaft", "titel": x.titel, "status": MK.GENO_REGISTER.get(x.register_status, x.register_status), "link": "/genossenschaft", "text": "Beitritt und Zeichnung von Geschäftsanteilen über das Portal." if x.register_status == "eingetragen" else "Unverbindliche Vormerkung möglich."})
	for x in frappe.get_all("Plattform Energiegemeinschaft", filters={"land": g["land"], "status": ["!=", "geschlossen"]}, fields=["titel", "status", "daten"], limit_page_length=50):
		d = aus_json(x.daten, {}) or {}
		out.append({"art": "energiegemeinschaft", "titel": x.titel, "status": "aktiv" if x.status == "aktiv" else "in Gründung", "link": "/energiegemeinschaften", "text": f"{d.get('gebiet') or d.get('netzbetreiber') or ''} – Strom aus der Region teilen."})
	if g["land"] == "DE":
		out.append({"art": "par6", "titel": "Kommunalbeteiligung nach § 6 EEG", "status": "gesetzlich möglich", "link": "/kommunen", "text": "Bis 0,2 ct/kWh an die Gemeinde – vertraglich, ab Inbetriebnahme."})
	return out


def _jetzt_lokal():
	return now_datetime().strftime("%Y-%m-%dT%H:%M")


def _ausgabe(n, vg, g, rolle):
	_, a = _akte(g)
	projekte = [{**p, "verfahren": C.verfahren_stand(g["land"], (a.get("verfahren") or {}).get(p["ref"]) or {}), "gewerbesteuerPrognose": None} for p in _projekte(g)]
	return {
		"rolle": rolle, "darfSchreiben": rolle == "gemeinde" or stufe(n, BEREICH) >= 2, "backofficeSchreiben": rolle == "backoffice" and stufe(n, BEREICH) >= 2,
		"vorgangId": vg.name, "gemeinde": g, "akteId": a.get("id"), "projekte": projekte, "termine": C.termine_sortiert(a["termine"], _jetzt_lokal()),
		"zahlungen": sorted(a["zahlungen"], key=lambda z: z.get("jahr") or 0, reverse=True), "einnahmen": C.einnahmen_summe(a["zahlungen"]),
		"par6Prognose": sum(((p.get("par6") or {}).get("euroProJahr") or 0) for p in projekte) if g["land"] == "DE" else None,
		"stellungnahmen": sorted(a["stellungnahmen"], key=lambda s: s.get("am") or "", reverse=True), "angebote": _angebote(g),
		"vorlagen": [{"id": k, "label": x} for k, x in C.MATERIAL_VORLAGEN.items()], "verlauf": a["verlauf"][-30:] if rolle == "backoffice" else [],
	}


@frappe.whitelist(methods=["POST"])
def cockpit(vorgangId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	k = vorgangId
	if not k and not ist_admin(n):
		x = frappe.get_all("Plattform Vorgang", filters={"typ": "kommune", "nutzer_id": n.id, "status": ["in", KOMMUNE_GEPRUEFT]}, pluck="name", order_by="modified desc", limit_page_length=1)
		k = x[0] if x else None
	if not k:
		return None
	vg, g, rolle = _zugriff(n, k)
	if not g["name"] and not g["schluessel"]:
		return None
	return _ausgabe(n, vg, g, rolle)


def _melden(n, rolle, vg, titel, text):
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins, anlegen

	if rolle == "backoffice":
		if vg.nutzer_id:
			anlegen(vg.nutzer_id, "status", titel, text, "/portal/kommune", "vorgang", vg.name, mail=True, mail_text=f"{text} Details finden Sie im Gemeindecockpit.", mail_betreff=f"{titel} – ÖkoInvest")
		return
	ziel = [k for k in aktive_admins()[:50] if stufe(frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k))), BEREICH) >= 2]
	if vg.zustaendig_id in ziel:
		ziel = [vg.zustaendig_id]
	for k in ziel[:5]:
		anlegen(k, "anfrage", titel, text, f"/portal/kommune?vorgang={vg.name}", "vorgang", vg.name)


def _vermerk(a, n, text):
	a["verlauf"].append({"am": jetzt_iso(), "vonId": n.id, "text": v.text(text, 300)})
	a["verlauf"] = a["verlauf"][-300:]


def _datum_de(s):
	return ".".join(reversed(str(s)[:10].split("-"))) if s else ""


@frappe.whitelist(methods=["POST"])
def aktion(vorgangId=None, daten=None, ip=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	vg, g, rolle = _zugriff(n, vorgangId, schreiben=True)
	doc, a = _akte(g, erzeugen=True)
	bo = rolle == "backoffice"
	d = daten if isinstance(daten, dict) else {}
	akt = str(d.get("aktion") or "")
	refs = [p["ref"] for p in _projekte(g)]

	def ref_pruefen(r):
		if r and r not in refs:
			ungueltig("Projekt nicht gefunden.")

	name = " ".join(x for x in (n.vorname, n.nachname) if x)
	if akt == "schritt":
		if not bo:
			verboten("Den Verfahrensstand pflegt ÖkoInvest nach Abstimmung mit der Verwaltung.")
		if not d.get("projektRef"):
			ungueltig("Bitte wählen Sie das Projekt.")
		ref_pruefen(d.get("projektRef"))
		s = _fach(C.schritt_bereinigen, d, g["land"])
		a["verfahren"].setdefault(d["projektRef"], {})[s["schritt"]] = {"status": s["status"], "datum": s["datum"], "notiz": s["notiz"], "am": jetzt_iso(), "vonId": n.id}
		label = next((x[1] for x in C.VERFAHREN.get(g["land"], C.VERFAHREN["DE"]) if x[0] == s["schritt"]), s["schritt"])
		_vermerk(a, n, f"Verfahren: {label} → {C.SCHRITT_STATUS[s['status']]}")
		wann = f" ({_datum_de(s['datum'])})" if s["datum"] else ""
		_melden(n, rolle, vg, "Verfahrensstand aktualisiert", f"{label}: {C.SCHRITT_STATUS[s['status']]}{wann}.")
	elif akt == "termin":
		t = _fach(C.termin_bereinigen, d)
		ref_pruefen(t["projektRef"])
		if d.get("id"):
			alt = next((x for x in a["termine"] if x["id"] == d["id"]), None)
			if not alt:
				nicht_gefunden("Termin nicht gefunden.")
			if not bo and alt.get("von") != "gemeinde":
				verboten("Diesen Termin pflegt ÖkoInvest.")
			alt.update(t)
			alt["geaendertAm"] = jetzt_iso()
			_vermerk(a, n, f"Termin geändert: {t['titel']}")
		else:
			a["termine"].append({"id": _kennung("GT"), **t, "von": "oekoinvest" if bo else "gemeinde", "vonId": n.id, "am": jetzt_iso()})
			_vermerk(a, n, f"Termin angelegt: {t['titel']}")
		_melden(n, rolle, vg, f"Termin: {t['titel']}", f"{C.TERMIN_ARTEN[t['art']]} am {_datum_de(t['beginn'])} um {t['beginn'][11:16]} Uhr{' – abgesagt' if t['status'] == 'abgesagt' else ''}.")
	elif akt == "terminLoeschen":
		alt = next((x for x in a["termine"] if x["id"] == d.get("id")), None)
		if not alt:
			nicht_gefunden("Termin nicht gefunden.")
		if not bo and alt.get("von") != "gemeinde":
			verboten("Diesen Termin pflegt ÖkoInvest.")
		a["termine"] = [x for x in a["termine"] if x["id"] != alt["id"]]
		_vermerk(a, n, f"Termin entfernt: {alt['titel']}")
	elif akt == "zahlung":
		if not bo:
			verboten("Zahlungen pflegt ÖkoInvest.")
		z = _fach(C.zahlung_bereinigen, d, g["land"])
		ref_pruefen(z["projektRef"])
		if d.get("id"):
			alt = next((x for x in a["zahlungen"] if x["id"] == d["id"]), None)
			if not alt:
				nicht_gefunden("Zahlung nicht gefunden.")
			alt.update(z)
			alt["geaendertAm"] = jetzt_iso()
		else:
			a["zahlungen"].append({"id": _kennung("GZ"), **z, "am": jetzt_iso(), "vonId": n.id})
		label = C.ZAHLUNG_ARTEN[z["art"]][0]
		_vermerk(a, n, f"Einnahme {label} {z['jahr']}: {z['betragEur']} € ({C.ZAHLUNG_STATUS[z['status']]})")
		_melden(n, rolle, vg, "Einnahmen aktualisiert", f"{label} {z['jahr']}: {flt(z['betragEur']):,.2f} € ({C.ZAHLUNG_STATUS[z['status']]}).".replace(",", "X").replace(".", ",").replace("X", "."))
	elif akt == "zahlungLoeschen":
		if not bo:
			verboten("Zahlungen pflegt ÖkoInvest.")
		alt = next((x for x in a["zahlungen"] if x["id"] == d.get("id")), None)
		if not alt:
			nicht_gefunden("Zahlung nicht gefunden.")
		if alt.get("status") == "gezahlt":
			konflikt("Gezahlte Beträge bleiben als Nachweis erhalten.")
		a["zahlungen"] = [x for x in a["zahlungen"] if x["id"] != alt["id"]]
		_vermerk(a, n, f"Einnahme entfernt ({C.ZAHLUNG_ARTEN[alt['art']][0]} {alt.get('jahr')})")
	elif akt == "stellungnahme":
		s = _fach(C.stellungnahme_bereinigen, d)
		ref_pruefen(s["projektRef"])
		a["stellungnahmen"].append({"id": _kennung("GS"), **s, "von": "oekoinvest" if bo else "gemeinde", "vonId": n.id, "vonName": name, "am": jetzt_iso(), "status": "offen", "antworten": []})
		_vermerk(a, n, f"Stellungnahme: {s['betreff']}")
		frist = f" – Frist {_datum_de(s['frist'])}" if s["frist"] else ""
		_melden(n, rolle, vg, "Bitte um Stellungnahme" if bo else "Neue Stellungnahme der Gemeinde", f"{s['betreff']}{frist}.")
	elif akt in ("antwort", "erledigt"):
		s = next((x for x in a["stellungnahmen"] if x["id"] == d.get("id")), None)
		if not s:
			nicht_gefunden("Stellungnahme nicht gefunden.")
		if s["status"] == "erledigt":
			konflikt("Diese Stellungnahme ist bereits erledigt.")
		if akt == "antwort":
			x = _fach(C.antwort_bereinigen, d)
			s["antworten"].append({"id": _kennung("GR"), "text": x["text"], "von": "oekoinvest" if bo else "gemeinde", "vonName": name, "am": jetzt_iso()})
			s["status"] = "erledigt" if x["erledigt"] else "beantwortet"
			_melden(n, rolle, vg, "Antwort auf Stellungnahme", f"{s['betreff']}: {x['text'][:140]}")
		else:
			s["status"] = "erledigt"
		_vermerk(a, n, f"Stellungnahme „{s['betreff']}“: {C.STELLUNGNAHME_STATUS[s['status']]}")
	else:
		ungueltig("Unbekannte Aktion.")
	doc.daten = als_json({k: x for k, x in a.items() if k != "id"})
	doc.save(ignore_permissions=True)
	protokoll(n, "aendern", "gemeinde_akte", doc.name, f"Gemeindecockpit {g['name']}: {akt}", v.text(ip, 64))
	return _ausgabe(n, vg, g, rolle)


@frappe.whitelist(methods=["POST"])
def material(vorgangId=None, art=None, projektRef=None, ip=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	vg, g, rolle = _zugriff(n, vorgangId)
	projekte = _projekte(g)
	ref = v.text(projektRef, 20)
	projekt = next((p for p in projekte if p["ref"] == ref), None) if ref else (projekte[0] if projekte else None)
	if ref and not projekt:
		nicht_gefunden("Projekt nicht gefunden.")
	_, a = _akte(g)
	termin = next((t for t in C.termine_sortiert(a["termine"], _jetzt_lokal())["kommend"] if t.get("art") == "buerger"), None)
	m = _fach(C.material_entwurf, art, g, projekt, [x for x in _angebote(g) if x["art"] != "par6"], termin)
	protokoll(n, "abruf", "gemeinde_material", vg.name, f"Material {art} ({g['name']})", v.text(ip, 64))
	return {**m, "gemeinde": g, "rolle": rolle, "erstelltAm": jetzt_iso()}
