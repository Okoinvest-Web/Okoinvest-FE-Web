# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiegemeinschaften WP1 „Kern-Stammdaten, Rechte, Integration“ – Frappe-API (Vertrag: docs/EG-SCHNITTSTELLEN.md,
# Abschnitt 4; Referenz: src/lib/plattform/backend/demo/eg-stamm.js). Regeln: plattform/eg_stamm_kern.py (= src/lib/plattform/eg/*.js).
#
# Rechte: jede Methode prüft den Aufrufer (kern.nutzer: nur API-Benutzer, Konto aktiv) UND die Kontext-Rolle je Gemeinschaft
# (eg_stamm_kern.eg_rollen: Organe, Mitglieder mit Konto, Backoffice-Bereich „eg“). Ohne Rolle → 404, ohne Recht → 403.
# Ausgabe immer camelCase wie das Demo-Backend. DocTypes „Plattform EG …“ (WP1) werden nur hier geschrieben.
#
# Für andere Pakete (Python): zugriff(n, gemeinschaft_id, recht, stufe) → (g, k), teilnahme_uebergang_intern(n, teilnahme_id, daten),
# system_nutzer(), gemeinschaft_daten(gid) (alle Entitäten als dicts), eg_stamm_kern.rollen_von/stufe_von.

import csv
import io
import json
import re

import frappe
from frappe.utils import nowdate

from oekoinvest_app.plattform import eg_modell as M
from oekoinvest_app.plattform import eg_stamm_kern as K
from oekoinvest_app.plattform.kern import aus_json, ist_admin, jetzt_iso, konflikt, neue_id, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.mitglied_kern import MitgliedFehler, iban_maskiert
from oekoinvest_app.plattform.rechte import stufe as bo_stufe

DT = {
	"gemeinschaft": "Plattform EG Gemeinschaft", "organ": "Plattform EG Organ", "mitglied": "Plattform EG Mitglied", "zaehlpunkt": "Plattform EG Zaehlpunkt",
	"teilnahme": "Plattform EG ZP Teilnahme", "anlage": "Plattform EG Anlage", "tarif": "Plattform EG Tarif", "verteilschluessel": "Plattform EG Verteilschluessel",
	"netzbetreiber": "Plattform EG Netzbetreiber", "regel": "Plattform EG Netzentgelt Regel",
}
from oekoinvest_app.plattform.kern import PRAEFIX  # noqa: E402

PRAEFIX.update({"Plattform EG Gemeinschaft": "EGG", "Plattform EG Organ": "EGO", "Plattform EG Mitglied": "EMG", "Plattform EG Zaehlpunkt": "EZP", "Plattform EG ZP Teilnahme": "ETN", "Plattform EG Anlage": "EAN", "Plattform EG Tarif": "ETF", "Plattform EG Verteilschluessel": "EVS"})
PRAEFIX_DT = {"EGG": DT["gemeinschaft"], "EGO": DT["organ"], "EMG": DT["mitglied"], "EZP": DT["zaehlpunkt"], "ETN": DT["teilnahme"], "EAN": DT["anlage"], "ETF": DT["tarif"], "EVS": DT["verteilschluessel"]}


def _fach(fn, *a, **k):
	try:
		return fn(*a, **k)
	except MitgliedFehler as e:
		(konflikt if e.status == 409 else ungueltig)(str(e))


def _heute():
	return nowdate()


def system_nutzer():
	return frappe._dict({"id": "system-eg", "rollen": ["admin"], "backofficeRollen": ["leitung"], "system": True})


# ================================================================ Abbildung camelCase ↔ Felder

def _snake(s):
	return re.sub(r"([A-Z])", lambda m: "_" + m.group(1).lower(), s)


# camelCase-Pfad → Frappe-Feld (nur Abweichungen von _snake; verschachtelte Pfade mit Punkt)
_FELD = {
	"name": "titel", "kontoId": "konto", "gemeinschaftId": "gemeinschaft", "zaehlpunktId": "zaehlpunkt", "mitgliedId": "mitglied", "anlageId": "anlage",
	"netzbetreiberId": "netzbetreiber", "inhaberKontoId": "inhaber_konto", "eigentuemerMitgliedId": "eigentuemer_mitglied", "vorgaengerId": "vorgaenger", "nachfolgerId": "nachfolger",
	"organisatorOrgId": "organisator_organisation", "dienstleistung.avvAm": "avv_am", "sitzAdresse.strasse": "sitz_strasse", "sitzAdresse.plz": "sitz_plz", "sitzAdresse.ort": "sitz_ort",
	"sepaMandat.referenz": "sepa_referenz", "sepaMandat.datum": "sepa_datum", "sepaMandat.status": "sepa_status", "unternehmensgroesse.mitarbeiter": "mitarbeiter",
	"unternehmensgroesse.umsatzMioEur": "umsatz_mio_eur", "unternehmensgroesse.bilanzMioEur": "bilanz_mio_eur", "unternehmensgroesse.nachweis": "groesse_nachweis",
	"sozialtarif.bezugspreisCt": "sozial_bezugspreis_ct", "sozialtarif.kontingentPct": "sozial_kontingent_pct", "standort.lat": "lat", "standort.lon": "lon", "standort.adresse": "adresse",
	"edaProzessId": "eda_prozess",
}
_SPEZ = {
	"gemeinschaft": ["name", "kurzname", "modell", "zonelevel", "nahebereichRef", "rechtsform", "zvrZahl", "firmenbuchnummer", "sitzAdresse.strasse", "sitzAdresse.plz", "sitzAdresse.ort", "email", "telefon", "uid", "steuernummer", "finanzamt", "ustStatus", "ustOptionSeit", "iban", "bic", "creditorId", "marktpartnerId", "gemeinschaftsId", "verteilmodell", "vorgaengerId", "nachfolgerId", "edaAnbindung", "organisatorOrgId", "organisatorAngezeigtAm", "dienstleistung.aktiv", "dienstleistung.paket", "dienstleistung.seit", "dienstleistung.avvAm", "abrechnungsrhythmus", "statutenVersion", "betreibervertragDatum", "beschreibung", "status", "migriertAus", "seedSchluessel", "gruendungsauftragId"],
	"organ": ["gemeinschaftId", "kontoId", "name", "email", "funktion", "von", "bis", "gewaehltIn", "zeichnungsberechtigt", "status"],
	"mitglied": ["gemeinschaftId", "kontoId", "mitgliedsnummer", "art", "person.vorname", "person.nachname", "person.firma", "person.strasse", "person.plz", "person.ort", "person.email", "person.telefon", "unternehmensgroesse.mitarbeiter", "unternehmensgroesse.umsatzMioEur", "unternehmensgroesse.bilanzMioEur", "unternehmensgroesse.nachweis", "steuerstatusErzeuger", "uid", "schutzbeduerftig", "iban", "sepaMandat.referenz", "sepaMandat.datum", "sepaMandat.status", "rechnungsweg", "abrechnungsrhythmus", "vertraege", "beitrittAm", "austrittZum", "status", "migriertAus"],
	"zaehlpunkt": ["zaehlpunktnummer", "netzbetreiberId", "nbNummer", "plz", "richtung", "anlageId", "inhaberKontoId", "inhaberName", "bezeichnung", "smartMeter", "qhAktiv", "nahebereichRef", "auskunftAm", "netzebene", "lieferant", "energieabnehmer", "migriertAus"],
	"teilnahme": ["zaehlpunktId", "gemeinschaftId", "mitgliedId", "teilnahmefaktor", "aufteilungsschluesselPct", "consentId", "gueltigAb", "gueltigBis", "status", "beendetGrund", "responsecode", "fristBis", "anmeldungVorgemerkt", "verlauf", "migriertAus"],
	"anlage": ["gemeinschaftId", "bezeichnung", "art", "engpassleistungKw", "kwp", "ausrichtung", "neigung", "standort.lat", "standort.lon", "standort.adresse", "eigentuemerMitgliedId", "betreiber", "betriebsfuehrung", "nutzungsmodell", "foerderung", "inbetriebnahme", "hknRegistriert", "speicherKwh", "speicherLadequelle", "iotQuelle", "haushalt", "status"],
	"tarif": ["gemeinschaftId", "bezeichnung", "gueltigAb", "gueltigBis", "beschluss.art", "beschluss.datum", "beschluss.referenz", "bezugspreisCt", "einspeisepreisCt", "grundgebuehrMonat", "zaehlpunktgebuehrMonat", "einmalgebuehrBeitritt", "mitgliedsbeitragJahr", "sozialtarif.bezugspreisCt", "sozialtarif.kontingentPct", "individuell", "status"],
	"verteilschluessel": ["gemeinschaftId", "gueltigAb", "summePct", "edaProzessId", "status"],
}
_CHECK = {"dienstleistung.aktiv", "zeichnungsberechtigt", "schutzbeduerftig", "qhAktiv", "anmeldungVorgemerkt", "hknRegistriert", "haushalt"}
_JSON = {"vertraege", "verlauf", "individuell"}
_DATUM = {"ustOptionSeit", "organisatorAngezeigtAm", "dienstleistung.seit", "dienstleistung.avvAm", "betreibervertragDatum", "von", "bis", "sepaMandat.datum", "beitrittAm", "austrittZum", "auskunftAm", "gueltigAb", "gueltigBis", "fristBis", "inbetriebnahme", "beschluss.datum"}


def _feld(pfad):
	if pfad in _FELD:
		return _FELD[pfad]
	if "." in pfad:
		a, b = pfad.split(".", 1)
		return _snake(a) + "_" + _snake(b)
	return _snake(pfad)


def _setze(d, pfad, wert):
	teile = pfad.split(".")
	for t in teile[:-1]:
		d = d.setdefault(t, {})
	d[teile[-1]] = wert


def _hole(d, pfad):
	for t in pfad.split("."):
		d = d.get(t) if isinstance(d, dict) else None
	return d


def aus_doc(art, doc):
	"""Frappe-Dokument → camelCase-dict (wie Demo-Backend)."""
	d = {"id": doc.name, "erstelltAm": str(doc.creation or ""), "erstelltVon": None, "geaendertAm": str(doc.modified or ""), "geaendertVon": None}
	for p in _SPEZ[art]:
		w = doc.get(_feld(p))
		if p in _CHECK:
			w = bool(w)
		elif p in _JSON:
			w = aus_json(w, []) or []
		elif p in _DATUM:
			w = str(w) if w else ""
		elif w is None and p not in ("vorgaengerId", "nachfolgerId", "organisatorOrgId", "kontoId", "anlageId", "inhaberKontoId", "eigentuemerMitgliedId", "aufteilungsschluesselPct", "netzebene", "engpassleistungKw", "kwp", "ausrichtung", "neigung", "standort.lat", "standort.lon", "speicherKwh", "sozialtarif.bezugspreisCt", "sozialtarif.kontingentPct", "unternehmensgroesse.mitarbeiter", "unternehmensgroesse.umsatzMioEur", "unternehmensgroesse.bilanzMioEur"):
			w = ""
		_setze(d, p, w)
	if art == "gemeinschaft":
		d["netzbetreiber"] = [r.netzbetreiber for r in doc.get("netzbetreiber") or []]
	if art == "teilnahme":
		d["tfHistorie"] = [{"gueltigAb": str(r.gueltig_ab or ""), "tf": r.tf, "prozessId": r.prozess_id or ""} for r in doc.get("tf_historie") or []]
	if art == "tarif":
		d["zeitfenster"] = [{"id": r.zf_id or "", "label": r.label, "tage": [x for x in (r.tage or "").split(",") if x], "von": r.von or "", "bis": r.bis or "", "monate": [int(x) for x in (r.monate or "").split(",") if x.strip().isdigit()], "bezugspreisCt": r.bezugspreis_ct, "einspeisepreisCt": r.einspeisepreis_ct} for r in doc.get("zeitfenster") or []]
	if art == "verteilschluessel":
		d["positionen"] = [{"teilnahmeId": r.teilnahme, "pct": r.pct} for r in doc.get("positionen") or []]
	if art == "zaehlpunkt" and d.get("netzebene") == 0:
		d["netzebene"] = None
	return d


def in_doc(art, daten, doc=None):
	"""camelCase-dict → neues bzw. vorhandenes Frappe-Dokument (nur bekannte Felder)."""
	if doc is None:
		doc = frappe.new_doc(DT[art])
	for p in _SPEZ[art]:
		w = _hole(daten, p)
		if w is None and _hole(daten, p.split(".")[0]) is None and p.split(".")[0] not in daten:
			continue
		if p in _JSON:
			w = json.dumps(w or [], ensure_ascii=False)
		elif p in _CHECK:
			w = 1 if w else 0
		elif p in _DATUM:
			w = w or None
		doc.set(_feld(p), w)
	if art == "gemeinschaft" and "netzbetreiber" in daten:
		doc.set("netzbetreiber", [{"netzbetreiber": x} for x in daten["netzbetreiber"]])
	if art == "teilnahme" and "tfHistorie" in daten:
		doc.set("tf_historie", [{"gueltig_ab": h.get("gueltigAb") or None, "tf": h.get("tf"), "prozess_id": h.get("prozessId") or ""} for h in daten["tfHistorie"]])
	if art == "tarif" and "zeitfenster" in daten:
		doc.set("zeitfenster", [{"zf_id": z.get("id"), "label": z.get("label"), "tage": ",".join(z.get("tage") or []), "von": z.get("von"), "bis": z.get("bis"), "monate": ",".join(str(x) for x in z.get("monate") or []), "bezugspreis_ct": z.get("bezugspreisCt"), "einspeisepreis_ct": z.get("einspeisepreisCt")} for z in daten["zeitfenster"]])
	if art == "verteilschluessel" and "positionen" in daten:
		doc.set("positionen", [{"teilnahme": p["teilnahmeId"], "pct": p["pct"]} for p in daten["positionen"]])
	return doc


def _speichern(doc):
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	return doc


def _alle(art, filters=None):
	return [aus_doc(art, frappe.get_doc(DT[art], x)) for x in frappe.get_all(DT[art], filters=filters or {}, pluck="name", order_by="creation asc")]


# ================================================================ Stammdaten Netzbetreiber und Netzentgelt-Regeln

def _stammdaten_sicherstellen():
	for nb in K.NETZBETREIBER:
		if not frappe.db.exists(DT["netzbetreiber"], nb["id"]):
			frappe.get_doc({"doctype": DT["netzbetreiber"], "kennung": nb["id"], "nb_nummer": nb["nbNummer"], "nb_nummer_status": nb["nbNummerStatus"], "titel": nb["name"], "kurzname": nb["kurzname"], "bundesland": ",".join(nb["bundesland"]), "marktpartner_id": nb["marktpartnerId"], "vertragsweg": nb["vertragsweg"], "kontakt_email": nb["kontaktEmail"], "portal_url": nb["portalUrl"], "formular_url": nb["formularUrl"], "besonderheiten": nb["besonderheiten"], "quelle": nb["quelle"]}).insert(ignore_permissions=True)
	for r in K.NETZENTGELT_REGELN:
		if not frappe.db.exists(DT["regel"], r["id"]):
			frappe.get_doc({"doctype": DT["regel"], "kennung": r["id"], "gueltig_ab": r["gueltigAb"] or None, "gueltig_bis": r["gueltigBis"] or None, "bezug": r["bezug"], "modelle": ",".join(r["modelle"]), "zonelevel": ",".join(str(x) for x in r["zonelevel"]), "netzebenen": ",".join(str(x) for x in r["netzebenen"]), "reduktion_pct": r["reduktionPct"], "abgaben_befreit_modelle": ",".join(r["abgabenBefreitModelle"]), "quelle": r["quelle"], "quelle_url": r["quelleUrl"], "status": r["status"]}).insert(ignore_permissions=True)


def _netzbetreiber_liste():
	_stammdaten_sicherstellen()
	aus = []
	for name in frappe.get_all(DT["netzbetreiber"], pluck="name", order_by="kennung asc"):
		d = frappe.get_doc(DT["netzbetreiber"], name)
		aus.append({"id": d.kennung, "nbNummer": d.nb_nummer or "", "nbNummerStatus": d.nb_nummer_status, "name": d.titel, "kurzname": d.kurzname or "", "bundesland": [x for x in (d.bundesland or "").split(",") if x], "marktpartnerId": d.marktpartner_id or "", "vertragsweg": d.vertragsweg or "", "kontaktEmail": d.kontakt_email or "", "portalUrl": d.portal_url or "", "formularUrl": d.formular_url or "", "plzListe": [r.plz for r in d.plz_liste or []], "netzentgeltAp": [{"gueltigAb": str(r.gueltig_ab), "netzebene": r.netzebene, "ctKwh": r.ct_kwh} for r in d.netzentgelt_ap or []], "besonderheiten": d.besonderheiten or "", "quelle": d.quelle or ""})
	return aus


def _regeln_liste():
	_stammdaten_sicherstellen()
	liste = lambda s, f=str: [f(x) for x in (s or "").split(",") if x]  # noqa: E731
	aus = []
	for name in frappe.get_all(DT["regel"], pluck="name", order_by="kennung asc"):
		d = frappe.get_doc(DT["regel"], name)
		aus.append({"id": d.kennung, "gueltigAb": str(d.gueltig_ab or ""), "gueltigBis": str(d.gueltig_bis or ""), "bezug": d.bezug, "modelle": liste(d.modelle), "zonelevel": liste(d.zonelevel, int), "netzebenen": liste(d.netzebenen, int), "reduktionPct": d.reduktion_pct, "abgabenBefreitModelle": liste(d.abgaben_befreit_modelle), "quelle": d.quelle or "", "quelleUrl": d.quelle_url or "", "status": d.status})
	return aus


# ================================================================ Kontext und Zugriff

def gemeinschaft_daten(gid):
	"""Alle WP1-Entitäten einer Gemeinschaft (dicts, camelCase)."""
	teilnahmen = _alle("teilnahme", {"gemeinschaft": gid})
	zp_ids = sorted({t["zaehlpunktId"] for t in teilnahmen})
	return {
		"organe": _alle("organ", {"gemeinschaft": gid}), "mitglieder": _alle("mitglied", {"gemeinschaft": gid}), "teilnahmen": teilnahmen,
		"zaehlpunkte": [aus_doc("zaehlpunkt", frappe.get_doc(DT["zaehlpunkt"], z)) for z in zp_ids if frappe.db.exists(DT["zaehlpunkt"], z)],
		"anlagen": _alle("anlage", {"gemeinschaft": gid}), "tarife": _alle("tarif", {"gemeinschaft": gid}), "verteilschluessel": _alle("verteilschluessel", {"gemeinschaft": gid}),
	}


def _kontext(n, g, daten=None):
	if n and n.get("system"):
		return {"rollen": ["organisator", "gruendung"], "backofficeStufe": 2, "selbstverwaltung": not (g.get("dienstleistung") or {}).get("aktiv")}
	if daten is None:
		daten = {"organe": _alle("organ", {"gemeinschaft": g["id"], "konto": n.get("id")}), "mitglieder": _alle("mitglied", {"gemeinschaft": g["id"], "konto": n.get("id")})}
	return K.eg_rollen(n, g, daten["organe"], daten["mitglieder"], _heute())


def zugriff(n, gemeinschaft_id, recht, stufe=1):
	"""(gemeinschaft, kontext) oder 401/404/403 – wie egIntern.zugriff im Demo-Backend."""
	if not n:
		nicht_angemeldet()
	gid = str(gemeinschaft_id or "")
	if not gid or not frappe.db.exists(DT["gemeinschaft"], gid):
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	g = aus_doc("gemeinschaft", frappe.get_doc(DT["gemeinschaft"], gid))
	k = _kontext(n, g)
	if not k["rollen"] and not k["backofficeStufe"]:
		nicht_gefunden("Gemeinschaft nicht gefunden.")
	if K.eg_stufe(k, recht) < stufe:
		verboten("Ihre Rolle in dieser Gemeinschaft erlaubt diese Änderung nicht." if stufe > 1 else "Ihre Rolle in dieser Gemeinschaft erlaubt diese Ansicht nicht.")
	return g, k


def _proto(n, aktion, gid, text):
	protokoll(None if (n or {}).get("system") else n, aktion, "eg_gemeinschaft", gid, text)


def _ausgabe_gemeinschaft(g, daten, k=None):
	z = K.kennzahlen(g, daten)
	aus = dict(g)
	if k is not None and K.eg_stufe(k, "sepa") < 1 and K.eg_stufe(k, "organe_statuten") < 1:
		aus["iban"] = iban_maskiert(g.get("iban") or "")
	aus.update({
		"modellLabel": M.EG_MODELLE[g["modell"]]["label"], "modellKurz": M.EG_MODELLE[g["modell"]]["kurz"], "zonelevelLabel": (M.ZONELEVEL.get(str(g["zonelevel"])) or {}).get("label", ""),
		"statusLabel": (M.GEMEINSCHAFT_STATUS.get(g["status"]) or {}).get("label", g["status"]), "kennzahlen": z,
		"netzentgelt": K.netzentgelt_regel(_heute(), g["modell"], g["zonelevel"], 7), "tarifAktuell": K.tarif_am(daten.get("tarife") or [], _heute()),
	})
	return aus


def _mitglied_ausgabe(m, k):
	voll = K.eg_stufe(k, "stammdaten") >= 1 or K.eg_stufe(k, "sepa") >= 1
	basis = {"id": m["id"], "gemeinschaftId": m["gemeinschaftId"], "kontoId": m.get("kontoId"), "mitgliedsnummer": m.get("mitgliedsnummer"), "art": m["art"], "artLabel": (M.MITGLIED_ARTEN.get(m["art"]) or {}).get("label", m["art"]), "name": K.mitglied_name(m), "status": m["status"], "statusLabel": (M.MITGLIED_STATUS.get(m["status"]) or {}).get("label", m["status"]), "beitrittAm": m.get("beitrittAm"), "austrittZum": m.get("austrittZum"), "portalkonto": bool(m.get("kontoId"))}
	if not voll:
		return basis
	aus = {**m, **basis}
	if not (K.eg_stufe(k, "sepa") >= 2 or K.eg_stufe(k, "stammdaten") >= 2):
		aus["iban"] = iban_maskiert(m.get("iban") or "")
	return aus


def _teilnahme_ausgabe(t):
	s = M.TEILNAHME_STATUS.get(t["status"]) or {}
	return {**t, "statusLabel": s.get("label", t["status"]), "ton": s.get("ton", "neutral")}


# ================================================================ Lesen

@frappe.whitelist(methods=["POST"])
def kontext(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	bo = ist_admin(n) and bo_stufe(n, "eg") >= 1
	if bo:
		ids = frappe.get_all(DT["gemeinschaft"], pluck="name")
	else:
		ids = set(frappe.get_all(DT["organ"], filters={"konto": n.id}, pluck="gemeinschaft")) | set(frappe.get_all(DT["mitglied"], filters={"konto": n.id}, pluck="gemeinschaft"))
	if gemeinschaftId:
		ids = [x for x in ids if x == gemeinschaftId]
	aus = []
	for gid in ids:
		g = aus_doc("gemeinschaft", frappe.get_doc(DT["gemeinschaft"], gid))
		k = _kontext(n, g)
		if k["rollen"] or k["backofficeStufe"]:
			aus.append({"id": g["id"], "name": g["name"], "modell": g["modell"], "status": g["status"], "rollen": k["rollen"], "rollenLabels": [M.EG_TEAMROLLEN[r]["label"] for r in k["rollen"]], "backofficeStufe": k["backofficeStufe"], "organ": K.ist_organ(k), "rechte": K.eg_rechte_von(k)})
	return {"gemeinschaften": aus}


@frappe.whitelist(methods=["POST"])
def gemeinschaften(filter=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not ist_admin(n) or bo_stufe(n, "eg") < 1:
		verboten("Nur für das Backoffice (Bereich „Energiegemeinschaften“).")
	f = filter if isinstance(filter, dict) else (aus_json(filter, {}) or {})
	q = str(f.get("q") or "").lower().strip()
	liste = []
	for gid in frappe.get_all(DT["gemeinschaft"], pluck="name"):
		g = aus_doc("gemeinschaft", frappe.get_doc(DT["gemeinschaft"], gid))
		if (f.get("status") and g["status"] != f["status"]) or (f.get("modell") and g["modell"] != f["modell"]):
			continue
		if q and q not in f"{g['name']} {g['kurzname']} {g['gemeinschaftsId']} {g['marktpartnerId']}".lower():
			continue
		daten = gemeinschaft_daten(gid)
		a = _ausgabe_gemeinschaft(g, daten, _kontext(n, g))
		a["hinweise"] = K.gemeinschaft_hinweise(g, daten, _heute())
		liste.append(a)
	liste.sort(key=lambda x: x["name"].lower())
	s = lambda feld: sum(x["kennzahlen"][feld] or 0 for x in liste)  # noqa: E731
	return {
		"gemeinschaften": liste, "heute": _heute(), "darfSchreiben": bo_stufe(n, "eg") >= 2,
		"kennzahlen": {"anzahl": len(liste), "aktiv": len([x for x in liste if x["status"] == "aktiv"]), "inGruendung": len([x for x in liste if x["status"] not in ("aktiv", "aufnahmestopp", "aufgeloest", "umgewandelt", "in_aufloesung")]), "mitgliederAktiv": s("mitgliederAktiv"), "zaehlpunkteAktiv": s("zaehlpunkteAktiv"), "teilnahmenOffen": s("teilnahmenOffen"), "erzeugungsleistungKw": round(s("erzeugungsleistungKw"), 1), "mitHinweisen": len([x for x in liste if any(h["stufe"] != "info" for h in x["hinweise"])])},
	}


@frappe.whitelist(methods=["POST"])
def gemeinschaft(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	g, k = zugriff(n, id, "mitgliederliste", 1)
	daten = gemeinschaft_daten(g["id"])
	sicht = K.eg_stufe(k, "stammdaten") >= 1
	konten = {o["kontoId"] for o in daten["organe"] if o.get("kontoId")}
	namen = {x.name: f"{x.vorname or ''} {x.nachname or ''}".strip() for x in frappe.get_all("Plattform Konto", filters={"name": ["in", list(konten) or ["-"]]}, fields=["name", "vorname", "nachname"])}
	return {
		"gemeinschaft": _ausgabe_gemeinschaft(g, daten, k),
		"organe": [{**o, "funktionLabel": (M.ORGAN_FUNKTIONEN.get(o["funktion"]) or {}).get("label", o["funktion"]), "personName": namen.get(o.get("kontoId")) or o.get("name"), "wirksam": K.organ_wirksam(o, _heute())} for o in daten["organe"]],
		"mitglieder": [_mitglied_ausgabe(m, k) for m in sorted(daten["mitglieder"], key=lambda m: m.get("mitgliedsnummer") or 0)],
		"zaehlpunkte": daten["zaehlpunkte"] if sicht else [], "teilnahmen": [_teilnahme_ausgabe(t) for t in daten["teilnahmen"]] if sicht else [], "anlagen": daten["anlagen"] if sicht else [],
		"tarife": sorted(daten["tarife"], key=lambda t: t["gueltigAb"], reverse=True), "verteilschluessel": daten["verteilschluessel"], "netzbetreiber": _netzbetreiber_liste(),
		"rollen": k["rollen"], "rechte": K.eg_rechte_von(k), "backofficeStufe": k["backofficeStufe"],
		"hinweise": K.gemeinschaft_hinweise(g, daten, _heute()) + K.organ_hinweise(g, daten["organe"], _heute()), "heute": _heute(),
	}


@frappe.whitelist(methods=["POST"])
def netzbetreiber(als_benutzer=None):
	n = nutzer(als_benutzer)
	return {"netzbetreiber": _netzbetreiber_liste(), "darfSchreiben": ist_admin(n) and bo_stufe(n, "eg") >= 2}


@frappe.whitelist(methods=["POST"])
def netzentgelt_regeln(stichtag=None, als_benutzer=None):
	nutzer(als_benutzer)
	r = _regeln_liste()
	return {"regeln": K.regeln_am(stichtag, r) if stichtag else r, "stichtag": stichtag or ""}


@frappe.whitelist(methods=["POST"])
def verwaltung(gemeinschaftId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	g, k = zugriff(n, gemeinschaftId, "mitgliederliste", 1)
	if not K.ist_organ(k) and not k["backofficeStufe"]:
		verboten("Die Verwaltung steht den Organen der Gemeinschaft zur Verfügung.")
	d = gemeinschaft(id=g["id"], als_benutzer=als_benutzer)
	tn, mg = gemeinschaft_daten(g["id"])["teilnahmen"], {m["id"]: m for m in d["mitglieder"]}
	aufgaben = [{"art": "aufnahme", "text": f"Aufnahme entscheiden: {m['name']}", "mitgliedId": m["id"], "recht": "mitglied_aufnehmen"} for m in d["mitglieder"] if m["status"] in ("antrag", "geprueft")]
	aufgaben += [{"art": "zustimmung", "text": f"Zustimmung im Netzbetreiber-Portal offen: {(mg.get(t['mitgliedId']) or {}).get('name', '')}", "teilnahmeId": t["id"], "frist": t.get("fristBis"), "recht": "mitgliederliste"} for t in tn if t["status"] == "zustimmung_offen"]
	aufgaben += [{"art": "technik", "text": f"Wartet auf Smart Meter: {(mg.get(t['mitgliedId']) or {}).get('name', '')}", "teilnahmeId": t["id"], "recht": "mitgliederliste"} for t in tn if t["status"] == "wartet_technik"]
	status = {}
	for t in tn:
		status[t["status"]] = status.get(t["status"], 0) + 1
	from oekoinvest_app.plattform.eg_modell import EG_TEAMROLLEN

	reiter = [{"id": "verwaltung", "label": "Verwaltung", "pfad": "/verwaltung", "recht": "mitgliederliste"}, {"id": "abrechnung", "label": "Abrechnung & Freigaben", "pfad": "/abrechnung", "recht": "abrechnung_vorschau"}, {"id": "kasse", "label": "Kassa & Buchhaltung", "pfad": "/kasse", "recht": "buchhaltung"}, {"id": "versammlungen", "label": "Versammlungen", "pfad": "/versammlungen", "recht": "gv"}, {"id": "energie", "label": "Energiedaten", "pfad": "/energie", "recht": "qh_aggregiert"}]
	return {
		"gemeinschaft": d["gemeinschaft"], "organe": d["organe"], "mitglieder": d["mitglieder"], "zaehlpunkte": d["zaehlpunkte"], "teilnahmen": d["teilnahmen"], "teilnahmenStatus": status, "tarife": d["tarife"],
		"aufgaben": [a for a in aufgaben if K.eg_stufe(k, a["recht"]) >= 1], "hinweise": d["hinweise"], "rollen": k["rollen"], "rollenLabels": [EG_TEAMROLLEN[r]["label"] for r in k["rollen"]],
		"rechte": K.eg_rechte_von(k), "reiter": [r for r in reiter if K.eg_stufe(k, r["recht"]) >= 1], "heute": _heute(),
	}


# ================================================================ Schreiben

def _daten(x):
	return x if isinstance(x, dict) else (aus_json(x, {}) or {})


@frappe.whitelist(methods=["POST"])
def gemeinschaft_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	daten = _daten(daten)
	if not id and (not ist_admin(n) or bo_stufe(n, "eg") < 2):
		verboten("Neue Gemeinschaften legt das Backoffice an (Bereich „Energiegemeinschaften“ schreiben).")
	alt = zugriff(n, id, "organe_statuten", 2)[0] if id else None
	g = _fach(K.gemeinschaft_bereinigen, daten, alt, [x["id"] for x in _netzbetreiber_liste()])
	if g["gemeinschaftsId"] and frappe.db.exists(DT["gemeinschaft"], {"gemeinschafts_id": g["gemeinschaftsId"], "name": ["!=", id or "-"]}):
		konflikt("Diese Gemeinschafts-ID ist bereits einer anderen Gemeinschaft zugeordnet.")
	doc = frappe.get_doc(DT["gemeinschaft"], id) if id else None
	if not doc:
		g["status"] = "interesse"
	doc = _speichern(in_doc("gemeinschaft", g, doc))
	_proto(n, "eg_aendern" if id else "eg_anlegen", doc.name, f"Gemeinschaft {g['name']} {'geändert' if id else 'angelegt'}")
	neu = aus_doc("gemeinschaft", doc)
	return _ausgabe_gemeinschaft(neu, gemeinschaft_daten(doc.name), _kontext(n, neu))


@frappe.whitelist(methods=["POST"])
def gemeinschaft_status(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	d = _daten(daten)
	g, k = zugriff(n, id, "organe_statuten", 2)
	nach = d.get("nach") or ""
	if nach in ("aktiv", "aufnahmestopp", "eda_bereit") and not k["backofficeStufe"] and "vorstand" not in k["rollen"]:
		verboten("Diesen Statuswechsel führt der Vorstand bzw. das Backoffice aus.")
	r = _fach(K.gemeinschaft_uebergang, g, nach, d.get("grund") or "")
	doc = frappe.get_doc(DT["gemeinschaft"], g["id"])
	if nach == "umgewandelt":
		nf = str(d.get("nachfolgerId") or "")
		if not nf or nf == g["id"] or not frappe.db.exists(DT["gemeinschaft"], nf):
			ungueltig("Bitte die Nachfolger-Gemeinschaft angeben (Umwandlung = neue Gemeinschafts-ID).")
		doc.nachfolger = nf
		frappe.db.set_value(DT["gemeinschaft"], nf, "vorgaenger", g["id"])
	doc.status = r["status"]
	_speichern(doc)
	_proto(n, "eg_status", g["id"], f"Status {g['status']} → {r['status']}")
	neu = aus_doc("gemeinschaft", doc)
	return _ausgabe_gemeinschaft(neu, gemeinschaft_daten(doc.name), k)


@frappe.whitelist(methods=["POST"])
def organ_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None):  # noqa: N803, A002
	n = nutzer(als_benutzer)
	doc = frappe.get_doc(DT["organ"], id) if id and frappe.db.exists(DT["organ"], id) else None
	if id and not doc:
		nicht_gefunden("Organ nicht gefunden.")
	g, _k = zugriff(n, doc.gemeinschaft if doc else gemeinschaftId, "organe_statuten", 2)
	o = _fach(K.organ_bereinigen, _daten(daten))
	if o["kontoId"] and not frappe.db.exists("Plattform Konto", o["kontoId"]):
		ungueltig("Konto nicht gefunden.")
	if not o["kontoId"] and o["email"]:
		o["kontoId"] = frappe.db.get_value("Plattform Konto", {"email": o["email"]}, "name")
	if not o["kontoId"] and not o["name"]:
		ungueltig("Zu dieser E-Mail gibt es kein Portalkonto – bitte den Namen angeben.")
	o["gemeinschaftId"] = g["id"]
	if not doc:
		o["status"] = "aktiv"
	doc = _speichern(in_doc("organ", o, doc))
	if not id and o["kontoId"]:
		from oekoinvest_app.plattform.benachrichtigung import anlegen

		anlegen(o["kontoId"], "system", f"Funktion in „{g['name']}“", f"Sie sind als {M.ORGAN_FUNKTIONEN[o['funktion']]['label']} eingetragen. Die Verwaltung finden Sie im Portal.", f"/portal/eg/{g['id']}/verwaltung", "eg_gemeinschaft", g["id"], mail=False)
	_proto(n, "eg_organ", g["id"], f"Organ {'geändert' if id else 'eingetragen'}: {M.ORGAN_FUNKTIONEN[o['funktion']]['label']}")
	return aus_doc("organ", doc)


@frappe.whitelist(methods=["POST"])
def organ_beenden(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not id or not frappe.db.exists(DT["organ"], id):
		nicht_gefunden("Organ nicht gefunden.")
	doc = frappe.get_doc(DT["organ"], id)
	zugriff(n, doc.gemeinschaft, "organe_statuten", 2)
	bis = str(_daten(daten).get("bis") or "")[:10] or _heute()
	if doc.von and bis < str(doc.von):
		ungueltig("Das Ende liegt vor dem Beginn der Funktionsperiode.")
	doc.bis = bis
	doc.status = "beendet" if bis <= _heute() else "aktiv"
	_speichern(doc)
	_proto(n, "eg_organ", doc.gemeinschaft, f"Funktion beendet zum {bis}")
	return aus_doc("organ", doc)


def _mitglied_anlegen(n, g, daten, status="antrag"):
	m = _fach(K.mitglied_bereinigen, daten, g)
	if m["kontoId"] and not frappe.db.exists("Plattform Konto", m["kontoId"]):
		ungueltig("Konto nicht gefunden.")
	if not m["kontoId"] and m["person"]["email"]:
		m["kontoId"] = frappe.db.get_value("Plattform Konto", {"email": m["person"]["email"]}, "name")
	if m["kontoId"] and frappe.db.exists(DT["mitglied"], {"gemeinschaft": g["id"], "konto": m["kontoId"], "status": ["not in", ["ausgeschieden", "abgelehnt"]]}):
		konflikt("Dieses Konto ist bereits Mitglied der Gemeinschaft.")
	nummern = frappe.get_all(DT["mitglied"], filters={"gemeinschaft": g["id"]}, fields=["gemeinschaft as gemeinschaftId", "mitgliedsnummer"])
	vertraege = [{"art": str(v.get("art") or "")[:40], "dokumentId": str(v.get("dokumentId") or "")[:60], "version": str(v.get("version") or "")[:40], "am": str(v.get("am") or "")[:10]} for v in (daten.get("vertraege") or [])[:30] if isinstance(v, dict) and v.get("art")]
	st = daten.get("status") if daten.get("status") in ("antrag", "aufgenommen", "aktiv", "interessent") else status
	wunsch = str(daten.get("mitgliedsnummer") or "").strip()
	frei = wunsch.isdigit() and 0 < int(wunsch) < 10_000_000 and not any(int(x.mitgliedsnummer or 0) == int(wunsch) for x in nummern)  # Wechsel: alte Nummer behalten
	neu = {**m, "gemeinschaftId": g["id"], "mitgliedsnummer": int(wunsch) if frei else K.naechste_mitgliedsnummer(nummern, g["id"]), "vertraege": vertraege, "austrittZum": "", "status": st}
	return _speichern(in_doc("mitglied", neu))


@frappe.whitelist(methods=["POST"])
def mitglied_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None, _n=None):  # noqa: N803, A002
	n = _n or nutzer(als_benutzer)
	daten = _daten(daten)
	doc = frappe.get_doc(DT["mitglied"], id) if id and frappe.db.exists(DT["mitglied"], id) else None
	if id and not doc:
		nicht_gefunden("Mitglied nicht gefunden.")
	g, k = zugriff(n, doc.gemeinschaft if doc else gemeinschaftId, "stammdaten", 2)
	if doc:
		alt = aus_doc("mitglied", doc)
		m = _fach(K.mitglied_bereinigen, {**alt, **daten, "person": {**alt["person"], **(daten.get("person") or {})}}, g)
		doc = _speichern(in_doc("mitglied", m, doc))
	else:
		doc = _mitglied_anlegen(n, g, daten)
	_proto(n, "eg_mitglied", g["id"], f"Mitglied {doc.mitgliedsnummer} {'geändert' if id else 'angelegt'}")
	return _mitglied_ausgabe(aus_doc("mitglied", doc), k)


@frappe.whitelist(methods=["POST"])
def mitglied_status(id=None, daten=None, als_benutzer=None, _n=None):  # noqa: A002
	n = _n or nutzer(als_benutzer)
	d = _daten(daten)
	if not id or not frappe.db.exists(DT["mitglied"], id):
		nicht_gefunden("Mitglied nicht gefunden.")
	doc = frappe.get_doc(DT["mitglied"], id)
	nach = d.get("nach") or ""
	g, k = zugriff(n, doc.gemeinschaft, "mitglied_aufnehmen" if nach in ("aufgenommen", "abgelehnt", "ausgeschlossen", "geprueft") else "stammdaten", 2)
	m = aus_doc("mitglied", doc)
	r = _fach(K.mitglied_uebergang, m, nach, d.get("grund") or "", d.get("zum") or "")
	m.update(r)
	if nach == "aufgenommen" and not m.get("beitrittAm"):
		m["beitrittAm"] = _heute()
	doc = _speichern(in_doc("mitglied", m, doc))
	if doc.konto:
		from oekoinvest_app.plattform.benachrichtigung import anlegen

		anlegen(doc.konto, "system", f"Energiegemeinschaft „{g['name']}“", f"Ihr Mitgliedsstatus: {M.MITGLIED_STATUS[m['status']]['label']}.", "/portal/eg", "eg_gemeinschaft", g["id"], mail=False)
	_proto(n, "eg_mitglied_status", g["id"], f"Mitglied {doc.mitgliedsnummer}: → {m['status']}")
	return _mitglied_ausgabe(aus_doc("mitglied", doc), k)


def _zaehlpunkt_intern(g, daten, id=None):
	nb = _netzbetreiber_liste()
	r = _fach(K.zaehlpunkt_bereinigen, daten, nb)
	z, hinweise = r["zaehlpunkt"], list(r["hinweise"])
	vorh = frappe.db.get_value(DT["zaehlpunkt"], {"zaehlpunktnummer": z["zaehlpunktnummer"]}, "name")
	if vorh and vorh != id:
		if id:
			konflikt("Diese Zählpunktnummer ist bereits erfasst.")
		d = frappe.get_doc(DT["zaehlpunkt"], vorh)
		if d.richtung != z["richtung"]:
			konflikt(f"Der Zählpunkt ist bereits als {M.ZP_RICHTUNGEN[d.richtung]['label']} erfasst.")
		return d, hinweise + ["Zählpunkt war bereits erfasst (Mehrfachteilnahme) – vorhandene Stammdaten übernommen."]
	if z["netzbetreiberId"] and g.get("netzbetreiber") and z["netzbetreiberId"] not in g["netzbetreiber"]:
		hinweise.append("Der Zählpunkt liegt im Netz eines Netzbetreibers, der für diese Gemeinschaft nicht hinterlegt ist.")
	doc = frappe.get_doc(DT["zaehlpunkt"], id) if id else None
	z["bezeichnung"] = str(daten.get("bezeichnung") or "")[:80]
	return _speichern(in_doc("zaehlpunkt", z, doc)), hinweise


@frappe.whitelist(methods=["POST"])
def zaehlpunkt_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None, _n=None):  # noqa: N803, A002
	n = _n or nutzer(als_benutzer)
	gid = gemeinschaftId
	if id:
		filt = {"zaehlpunkt": id, **({"gemeinschaft": gemeinschaftId} if gemeinschaftId else {})}
		gid = frappe.db.get_value(DT["teilnahme"], filt, "gemeinschaft")
		if not gid:
			nicht_gefunden("Zählpunkt nicht gefunden.")
	g, _k = zugriff(n, gid, "stammdaten", 2)
	doc, hinweise = _zaehlpunkt_intern(g, _daten(daten), id)
	_proto(n, "eg_zaehlpunkt", g["id"], f"Zählpunkt {doc.zaehlpunktnummer} {'geändert' if id else 'erfasst'}")
	return {"zaehlpunkt": aus_doc("zaehlpunkt", doc), "hinweise": hinweise}


def _teilnahmen_zp(zp):
	return _alle("teilnahme", {"zaehlpunkt": zp})


def _teilnahme_intern(n, g, daten, id=None):
	t = _fach(K.teilnahme_bereinigen, daten, g)
	if not frappe.db.exists(DT["zaehlpunkt"], t["zaehlpunktId"]):
		ungueltig("Zählpunkt nicht gefunden.")
	m = frappe.db.get_value(DT["mitglied"], {"name": t["mitgliedId"], "gemeinschaft": g["id"]}, ["name", "status"], as_dict=True)
	if not m:
		ungueltig("Mitglied gehört nicht zu dieser Gemeinschaft.")
	if m.status in ("ausgeschieden", "abgelehnt", "ausgeschlossen"):
		konflikt("Für dieses Mitglied sind keine neuen Teilnahmen möglich.")
	doc = frappe.get_doc(DT["teilnahme"], id) if id else None
	if doc and doc.status != "entwurf":
		konflikt("Nur Entwürfe sind änderbar – Teilnahmefaktor und Abmeldung laufen über die EDA-Prozesse.")
	regel = K.teilnahme_regeln(_teilnahmen_zp(t["zaehlpunktId"]), {"id": id, "gemeinschaftId": g["id"], "teilnahmefaktor": t["teilnahmefaktor"]}, daten.get("fremdTf") or 0, daten.get("fremdAnzahl") or 0)
	if not regel["ok"]:
		konflikt(regel["fehler"])
	t["gemeinschaftId"] = g["id"]
	if not doc:
		t.update({"gueltigAb": "", "gueltigBis": "", "tfHistorie": [], "status": "entwurf", "beendetGrund": "", "responsecode": "", "fristBis": "", "verlauf": [{"am": jetzt_iso(), "von": "", "nach": "entwurf", "ereignis": "anlegen", "prozessId": "", "text": "", "vonKonto": None if n.get("system") else n.get("id")}]})
	return _speichern(in_doc("teilnahme", t, doc))


@frappe.whitelist(methods=["POST"])
def teilnahme_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None, _n=None):  # noqa: N803, A002
	n = _n or nutzer(als_benutzer)
	gid = frappe.db.get_value(DT["teilnahme"], id, "gemeinschaft") if id else gemeinschaftId
	g, _k = zugriff(n, gid, "stammdaten", 2)
	doc = _teilnahme_intern(n, g, _daten(daten), id)
	_proto(n, "eg_teilnahme", g["id"], f"Teilnahme {doc.name} {'geändert' if id else 'angelegt'} (TF {doc.teilnahmefaktor} %)")
	return _teilnahme_ausgabe(aus_doc("teilnahme", doc))


def teilnahme_uebergang_intern(n, teilnahme_id, daten):
	"""Zustandsautomat 3.8 (für WP2: EDA-Ereignisse; für Korrekturen des Organisators mit Begründung)."""
	daten = _daten(daten)
	if not teilnahme_id or not frappe.db.exists(DT["teilnahme"], teilnahme_id):
		nicht_gefunden("Teilnahme nicht gefunden.")
	doc = frappe.get_doc(DT["teilnahme"], teilnahme_id)
	ereignis = daten.get("ereignis") or ""
	g, _k = zugriff(n, doc.gemeinschaft, "stammdaten" if ereignis in ("senden", "verwerfen") else "eda_ausloesen", 2)
	if not n.get("system") and not daten.get("prozessId") and ereignis not in ("senden", "verwerfen", "erneut") and not str(daten.get("grund") or "").strip():
		ungueltig("Manuelle Korrekturen ohne EDA-Prozess brauchen eine Begründung.")
	t = aus_doc("teilnahme", doc)
	if ereignis == "tf_geaendert":
		regel = K.teilnahme_regeln(_teilnahmen_zp(t["zaehlpunktId"]), {"id": t["id"], "gemeinschaftId": g["id"], "teilnahmefaktor": daten.get("teilnahmefaktor")})
		if not regel["ok"]:
			konflikt(regel["fehler"])
	neu = _fach(K.teilnahme_uebergang, t, ereignis, _heute(), daten.get("datum") or "", daten.get("consentId"), daten.get("teilnahmefaktor"), daten.get("responsecode"), daten.get("prozessId") or "", daten.get("grund") or "", None if n.get("system") else n.get("id"), jetzt_iso())
	doc = _speichern(in_doc("teilnahme", neu, doc))
	konto = frappe.db.get_value(DT["mitglied"], doc.mitglied, "konto")
	if konto and doc.status in ("zustimmung_offen", "aktiv", "beendet", "abgelehnt", "abgelaufen"):
		from oekoinvest_app.plattform.benachrichtigung import anlegen

		texte = {"zustimmung_offen": "Bitte stimmen Sie der Teilnahme im Portal Ihres Netzbetreibers zu.", "aktiv": "Ihre Teilnahme ist aktiv.", "beendet": "Ihre Teilnahme ist beendet.", "abgelehnt": "Der Netzbetreiber hat die Anmeldung abgelehnt – wir melden uns bei Ihnen.", "abgelaufen": "Die Zustimmungsfrist ist abgelaufen – die Anmeldung kann erneut gestartet werden."}
		anlegen(konto, "system", f"Energiegemeinschaft „{g['name']}“", texte[doc.status], "/portal/eg", "eg_gemeinschaft", g["id"], mail=doc.status == "zustimmung_offen")
	_proto(n, "eg_teilnahme_status", g["id"], f"Teilnahme {doc.name}: {t['status']} → {doc.status} ({ereignis})")
	return _teilnahme_ausgabe(aus_doc("teilnahme", doc))


@frappe.whitelist(methods=["POST"])
def teilnahme_uebergang(teilnahmeId=None, daten=None, als_benutzer=None):  # noqa: N803
	return teilnahme_uebergang_intern(nutzer(als_benutzer), teilnahmeId, daten)


@frappe.whitelist(methods=["POST"])
def anlage_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None, _n=None):  # noqa: N803, A002
	n = _n or nutzer(als_benutzer)
	daten = _daten(daten)
	doc = frappe.get_doc(DT["anlage"], id) if id and frappe.db.exists(DT["anlage"], id) else None
	if id and not doc:
		nicht_gefunden("Anlage nicht gefunden.")
	g, _k = zugriff(n, doc.gemeinschaft if doc else gemeinschaftId, "stammdaten", 2)
	a = _fach(K.anlage_bereinigen, daten)
	if a["eigentuemerMitgliedId"] and not frappe.db.exists(DT["mitglied"], {"name": a["eigentuemerMitgliedId"], "gemeinschaft": g["id"]}):
		ungueltig("Eigentümer muss Mitglied der Gemeinschaft sein.")
	a["gemeinschaftId"] = g["id"]
	doc = _speichern(in_doc("anlage", a, doc))
	zp = daten.get("zaehlpunktId")
	if zp and frappe.db.exists(DT["teilnahme"], {"zaehlpunkt": zp, "gemeinschaft": g["id"]}):
		frappe.db.set_value(DT["zaehlpunkt"], zp, "anlage", doc.name)
	_proto(n, "eg_anlage", g["id"], f"Anlage {a['bezeichnung']} {'geändert' if id else 'angelegt'}")
	return aus_doc("anlage", doc)


@frappe.whitelist(methods=["POST"])
def tarif_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None):  # noqa: N803, A002
	n = nutzer(als_benutzer)
	doc = frappe.get_doc(DT["tarif"], id) if id and frappe.db.exists(DT["tarif"], id) else None
	if id and not doc:
		nicht_gefunden("Tarif nicht gefunden.")
	gid = doc.gemeinschaft if doc else gemeinschaftId
	t = _fach(K.tarif_bereinigen, _daten(daten))
	beschlossen = t["status"] in ("beschlossen", "aktiv")
	g, k = zugriff(n, gid, "tarife", 2 if beschlossen else 1)
	if beschlossen and not k["backofficeStufe"] and "vorstand" not in k["rollen"]:
		verboten("Tarife beschließt der Vorstand bzw. die Generalversammlung.")
	ids = set(frappe.get_all(DT["mitglied"], filters={"gemeinschaft": gid}, pluck="name"))
	if any(i["mitgliedId"] not in ids for i in t["individuell"]):
		ungueltig("Individuelle Preise nur für Mitglieder der Gemeinschaft.")
	if doc and doc.status == "abgeloest":
		konflikt("Abgelöste Tarife sind unveränderlich – bitte einen neuen Tarif anlegen.")
	t["gemeinschaftId"] = gid
	doc = _speichern(in_doc("tarif", t, doc))
	if beschlossen:
		alle = _alle("tarif", {"gemeinschaft": gid})
		neu = next(x for x in alle if x["id"] == doc.name)
		for x in K.tarif_versionieren(alle, neu):
			alt = next(y for y in alle if y["id"] == x["id"])
			if (x["status"], x["gueltigBis"]) != (alt["status"], alt["gueltigBis"]):
				frappe.db.set_value(DT["tarif"], x["id"], {"status": x["status"], "gueltig_bis": x["gueltigBis"] or None})
	_proto(n, "eg_tarif", g["id"], f"Tarif {t['bezeichnung']} ({t['bezugspreisCt']}/{t['einspeisepreisCt']} ct, ab {t['gueltigAb']})")
	return aus_doc("tarif", frappe.get_doc(DT["tarif"], doc.name))


@frappe.whitelist(methods=["POST"])
def verteilschluessel_speichern(gemeinschaftId=None, id=None, daten=None, als_benutzer=None):  # noqa: N803, A002
	n = nutzer(als_benutzer)
	doc = frappe.get_doc(DT["verteilschluessel"], id) if id and frappe.db.exists(DT["verteilschluessel"], id) else None
	if id and not doc:
		nicht_gefunden("Verteilschlüssel nicht gefunden.")
	g, _k = zugriff(n, doc.gemeinschaft if doc else gemeinschaftId, "stammdaten", 2)
	if g["verteilmodell"] != "statisch":
		konflikt("Verteilschlüssel gibt es nur im statischen Modell.")
	v = _fach(K.verteilschluessel_bereinigen, _daten(daten))
	ids = set(frappe.get_all(DT["teilnahme"], filters={"gemeinschaft": g["id"]}, pluck="name"))
	if any(p["teilnahmeId"] not in ids for p in v["positionen"]):
		ungueltig("Positionen nur für Teilnahmen dieser Gemeinschaft.")
	if doc and doc.status != "entwurf":
		konflikt("Gesendete Verteilschlüssel sind unveränderlich – bitte einen neuen anlegen.")
	v.update({"gemeinschaftId": g["id"], **({} if doc else {"status": "entwurf", "edaProzessId": ""})})
	doc = _speichern(in_doc("verteilschluessel", v, doc))
	_proto(n, "eg_verteilschluessel", g["id"], f"Verteilschlüssel ab {v['gueltigAb']} (Σ {v['summePct']} %)")
	return aus_doc("verteilschluessel", doc)


def verteilschluessel_status_intern(n, id, daten):
	"""WP2: Status eines Verteilschlüssels (entwurf → gesendet → gueltig, gesendet → entwurf bei Ablehnung)."""
	d = _daten(daten)
	if not id or not frappe.db.exists(DT["verteilschluessel"], id):
		nicht_gefunden("Verteilschlüssel nicht gefunden.")
	doc = frappe.get_doc(DT["verteilschluessel"], id)
	g, _k = zugriff(n, doc.gemeinschaft, "eda_ausloesen", 2)
	status = d.get("status") or ""
	if status not in {"entwurf": ["gesendet"], "gesendet": ["gueltig", "entwurf"], "gueltig": []}.get(doc.status, []):
		konflikt(f"Wechsel von „{doc.status}“ nach „{status}“ ist nicht vorgesehen.")
	doc.status = status
	if d.get("edaProzessId"):
		doc.eda_prozess = str(d["edaProzessId"])[:40]
	_speichern(doc)
	_proto(n, "eg_verteilschluessel", g["id"], f"Verteilschlüssel ab {doc.gueltig_ab}: {status}")
	return aus_doc("verteilschluessel", doc)


@frappe.whitelist(methods=["POST"])
def verteilschluessel_status(id=None, daten=None, als_benutzer=None):  # noqa: A002
	return verteilschluessel_status_intern(nutzer(als_benutzer), id, daten)


# ================================================================ Massenbearbeitung, CSV

_MASSEN = {"mitglied_status": "mitglied_aufnehmen", "rechnungsweg": "stammdaten", "abrechnungsrhythmus": "stammdaten", "schutzbeduerftig": "stammdaten", "zp_smartmeter": "stammdaten", "zp_netzebene": "stammdaten", "tf_entwurf": "stammdaten", "anmeldung_vormerken": "stammdaten"}


@frappe.whitelist(methods=["POST"])
def massenaktion(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	d = _daten(daten)
	aktion = d.get("aktion") or ""
	if aktion not in _MASSEN:
		ungueltig("Unbekannte Massenaktion.")
	ids = list(dict.fromkeys(str(x) for x in (d.get("ids") or [])))[:2000]
	if not ids:
		ungueltig("Bitte mindestens einen Eintrag auswählen.")
	g, _k = zugriff(n, gemeinschaftId, _MASSEN[aktion], 2)
	w = d.get("werte") or {}
	fehler, anzahl = [], 0
	for i in ids:
		try:
			if aktion in ("mitglied_status", "rechnungsweg", "abrechnungsrhythmus", "schutzbeduerftig"):
				if not frappe.db.exists(DT["mitglied"], {"name": i, "gemeinschaft": g["id"]}):
					raise MitgliedFehler("nicht gefunden")
				doc = frappe.get_doc(DT["mitglied"], i)
				if aktion == "mitglied_status":
					r = K.mitglied_uebergang(aus_doc("mitglied", doc), w.get("nach"), w.get("grund") or "", w.get("zum") or "")
					doc.status = r["status"]
					if r.get("austrittZum"):
						doc.austritt_zum = r["austrittZum"]
				elif aktion == "rechnungsweg":
					if w.get("wert") not in M.RECHNUNGSWEGE:
						raise MitgliedFehler("Rechnungsweg ungültig")
					doc.rechnungsweg = w["wert"]
				elif aktion == "abrechnungsrhythmus":
					if w.get("wert") and w["wert"] not in M.ABRECHNUNGSRHYTHMEN:
						raise MitgliedFehler("Rhythmus ungültig")
					doc.abrechnungsrhythmus = w.get("wert") or ""
				else:
					doc.schutzbeduerftig = 1 if w.get("wert") is True else 0
				_speichern(doc)
			elif aktion in ("zp_smartmeter", "zp_netzebene"):
				if not frappe.db.exists(DT["teilnahme"], {"zaehlpunkt": i, "gemeinschaft": g["id"]}):
					raise MitgliedFehler("nicht gefunden")
				if aktion == "zp_smartmeter":
					if w.get("wert") not in M.SMART_METER:
						raise MitgliedFehler("Wert ungültig")
					frappe.db.set_value(DT["zaehlpunkt"], i, "smart_meter", w["wert"])
				else:
					if str(w.get("wert")) not in M.NETZEBENEN:
						raise MitgliedFehler("Netzebene ungültig")
					frappe.db.set_value(DT["zaehlpunkt"], i, "netzebene", int(w["wert"]))
			else:
				if not frappe.db.exists(DT["teilnahme"], {"name": i, "gemeinschaft": g["id"]}):
					raise MitgliedFehler("nicht gefunden")
				doc = frappe.get_doc(DT["teilnahme"], i)
				if doc.status != "entwurf":
					raise MitgliedFehler("nur Entwürfe", 409)
				if aktion == "tf_entwurf":
					tf = w.get("teilnahmefaktor")
					if not isinstance(tf, int) or not 1 <= tf <= 100:
						raise MitgliedFehler("TF 1–100")
					r = K.teilnahme_regeln(_teilnahmen_zp(doc.zaehlpunkt), {"id": i, "gemeinschaftId": g["id"], "teilnahmefaktor": tf})
					if not r["ok"]:
						raise MitgliedFehler(r["fehler"], 409)
					doc.teilnahmefaktor = tf
				else:
					doc.anmeldung_vorgemerkt = 0 if w.get("wert") is False else 1
				_speichern(doc)
			anzahl += 1
		except MitgliedFehler as e:
			fehler.append({"id": i, "fehler": str(e)})
	_proto(n, "eg_massenaktion", g["id"], f"Massenaktion {aktion}: {anzahl} geändert, {len(fehler)} Fehler")
	return {"geaendert": anzahl, "fehler": fehler}


EG_CSV_SPALTEN = ["mitgliedsnummer", "art", "vorname", "nachname", "firma", "strasse", "plz", "ort", "email", "iban", "sepa_referenz", "sepa_datum", "steuerstatus", "uid", "zaehlpunkt", "richtung", "teilnahmefaktor", "kwp"]
_ART = {"privat": "privat", "landwirt": "landwirt", "kmu": "kmu", "unternehmen": "kmu", "gemeinde": "gemeinde", "verein": "verein", "oeffentlich": "oeffentlich", "grossunternehmen": "grossunternehmen"}
_RICHTUNG = {"verbrauch": "verbrauch", "bezug": "verbrauch", "erzeugung": "erzeugung", "einspeisung": "erzeugung"}


def _csv_lesen(roh):
	s = str(roh or "").lstrip("﻿")
	erste = s.split("\n", 1)[0]
	trenner = ";" if erste.count(";") >= erste.count(",") else ","
	zeilen = [z for z in csv.reader(io.StringIO(s), delimiter=trenner) if any(x.strip() for x in z)]
	if not zeilen:
		return [], []

	def norm(k):
		k = k.strip().lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
		return re.sub(r"\W+", "", k)

	kopf = [norm(k) for k in zeilen[0]]
	return kopf, [{k: (z[i].strip() if i < len(z) else "") for i, k in enumerate(kopf)} for z in zeilen[1:5001]]


@frappe.whitelist(methods=["POST"])
def csv_import(gemeinschaftId=None, daten=None, als_benutzer=None):  # noqa: N803, C901
	n = nutzer(als_benutzer)
	d = _daten(daten)
	if (d.get("art") or "mitglieder") != "mitglieder":
		ungueltig("Import-Art: mitglieder (Mitglieder mit Zählpunkten).")
	roh = str(d.get("csv") or "")
	if len(roh) > 2_000_000:
		ungueltig("Die Datei ist zu groß (max. 2 MB).")
	ausfuehren = bool(d.get("ausfuehren"))
	g, _k = zugriff(n, gemeinschaftId, "stammdaten", 2 if ausfuehren else 1)
	kopf, zeilen = _csv_lesen(roh)
	if not kopf:
		ungueltig("Die Datei ist leer.")
	if not ("art" in kopf and ("nachname" in kopf or "firma" in kopf)):
		ungueltig(f"Pflichtspalten fehlen (Vorlage: {';'.join(EG_CSV_SPALTEN)}).")
	nb = _netzbetreiber_liste()
	daten_alt = gemeinschaft_daten(g["id"])
	vorschau = []
	for i, r in enumerate(zeilen):
		zeile = i + 2
		try:
			sd = r.get("sepa_datum") or ""
			if re.match(r"^\d{2}\.\d{2}\.\d{4}$", sd):
				sd = "-".join(reversed(sd.split(".")))
			dm = {"art": _ART.get((r.get("art") or "").lower(), ""), "person": {k: r.get(k, "") for k in ("vorname", "nachname", "firma", "strasse", "plz", "ort", "email")}, "iban": r.get("iban") or "", "uid": r.get("uid") or ""}
			if r.get("steuerstatus"):
				dm["steuerstatusErzeuger"] = r["steuerstatus"]
			if r.get("sepa_referenz"):
				dm["sepaMandat"] = {"referenz": r["sepa_referenz"], "datum": sd, "status": "aktiv"}
			vorh = next((m for m in daten_alt["mitglieder"] if (r.get("mitgliedsnummer") and str(m.get("mitgliedsnummer")) == r["mitgliedsnummer"]) or (r.get("email") and (m["person"].get("email") or "") == r["email"].lower())), None)
			basis = {**vorh, **{k: v for k, v in dm.items() if v not in ("", None)}, "person": {**vorh["person"], **{k: v for k, v in dm["person"].items() if v}}} if vorh else dm
			m = K.mitglied_bereinigen(basis, g)
			zp = K.zaehlpunkt_bereinigen({"zaehlpunktnummer": r["zaehlpunkt"], "richtung": _RICHTUNG.get((r.get("richtung") or "verbrauch").lower(), "")}, nb) if r.get("zaehlpunkt") else None
			vorschau.append({"zeile": zeile, "aktion": "aktualisieren" if vorh else "neu", "name": K.mitglied_name(m), "zaehlpunkt": zp["zaehlpunkt"]["zaehlpunktnummer"] if zp else "", "hinweise": zp["hinweise"] if zp else [], "fehler": "", "_m": m, "_vorh": vorh, "_dm": dm, "_zp": zp, "_r": r})
		except MitgliedFehler as e:
			vorschau.append({"zeile": zeile, "aktion": "fehler", "name": " ".join(x for x in (r.get("vorname"), r.get("nachname"), r.get("firma")) if x), "zaehlpunkt": r.get("zaehlpunkt") or "", "hinweise": [], "fehler": str(e)})
	fehler = [v for v in vorschau if v["aktion"] == "fehler"]
	angelegt = geaendert = 0
	if ausfuehren:
		if fehler:
			konflikt(f"Import abgebrochen: {len(fehler)} fehlerhafte Zeile(n) – bitte zuerst die Vorschau prüfen.")
		for v in vorschau:
			if v["_vorh"]:
				doc = _speichern(in_doc("mitglied", v["_m"], frappe.get_doc(DT["mitglied"], v["_vorh"]["id"])))
				geaendert += 1
			else:
				doc = _mitglied_anlegen(n, g, {**v["_dm"], "mitgliedsnummer": v["_r"].get("mitgliedsnummer"), "status": "aufgenommen"}, "aufgenommen")
				angelegt += 1
			if v["_zp"]:
				zdoc, _h = _zaehlpunkt_intern(g, v["_zp"]["zaehlpunkt"])
				kwp = v["_r"].get("kwp")
				if kwp and zdoc.richtung == "erzeugung" and not zdoc.anlage:
					a = K.anlage_bereinigen({"bezeichnung": f"PV {doc.person_firma or doc.person_nachname}", "art": "pv", "kwp": kwp, "eigentuemerMitgliedId": doc.name, "haushalt": doc.art == "privat"})
					a["gemeinschaftId"] = g["id"]
					adoc = _speichern(in_doc("anlage", a))
					frappe.db.set_value(DT["zaehlpunkt"], zdoc.name, "anlage", adoc.name)
				if not frappe.db.exists(DT["teilnahme"], {"zaehlpunkt": zdoc.name, "gemeinschaft": g["id"], "status": ["not in", ["beendet", "abgelehnt", "abgelaufen", "verworfen"]]}):
					_teilnahme_intern(n, g, {"zaehlpunktId": zdoc.name, "mitgliedId": doc.name, "teilnahmefaktor": v["_r"].get("teilnahmefaktor") or 100})
		_proto(n, "eg_import", g["id"], f"CSV-Import: {angelegt} neu, {geaendert} aktualisiert")
	aus = [{k: x for k, x in v.items() if not k.startswith("_")} for v in vorschau]
	return {"vorschau": aus, "fehler": [v for v in aus if v["aktion"] == "fehler"], "angelegt": angelegt, "geaendert": geaendert, "spalten": EG_CSV_SPALTEN, "ausgefuehrt": ausfuehren}


def _csv_wert(v):
	if v is None:
		return ""
	if isinstance(v, bool):
		s = "ja" if v else "nein"
	elif isinstance(v, (int, float)):
		s = str(round(v, 4)).replace(".", ",")
	else:
		s = str(v)
	if re.match(r"^[=+\-@\t\r]", s) and not isinstance(v, (int, float)):
		s = "'" + s
	if re.search(r'[;"\r\n]', s):
		s = '"' + s.replace('"', '""') + '"'
	return s


@frappe.whitelist(methods=["POST"])
def csv_export(gemeinschaftId=None, art=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	g, k = zugriff(n, gemeinschaftId, "mitgliederliste", 1)
	art = art or "mitglieder"
	daten = gemeinschaft_daten(g["id"])
	voll = K.eg_stufe(k, "stammdaten") >= 1
	zps = {z["id"]: z for z in daten["zaehlpunkte"]}
	anl = {a["id"]: a for a in daten["anlagen"]}
	zeilen = []
	for m in sorted(daten["mitglieder"], key=lambda x: x.get("mitgliedsnummer") or 0):
		p = m["person"]
		basis = [m["mitgliedsnummer"], m["art"], p["vorname"], p["nachname"], p["firma"]] + ([p["strasse"], p["plz"], p["ort"], p["email"], iban_maskiert(m.get("iban") or ""), m["sepaMandat"]["referenz"], m["sepaMandat"]["datum"]] if voll else ["", "", "", "", "", "", ""]) + [m["steuerstatusErzeuger"], m["uid"] if voll else ""]
		tn = [t for t in daten["teilnahmen"] if t["mitgliedId"] == m["id"]]
		if art == "mitglieder" or not tn or not voll:
			zeilen.append(basis + ["", "", "", "", M.MITGLIED_STATUS[m["status"]]["label"]])
		if art != "mitglieder" and voll:
			for t in tn:
				z = zps.get(t["zaehlpunktId"]) or {}
				a = anl.get(z.get("anlageId")) or {}
				zeilen.append(basis + [z.get("zaehlpunktnummer", ""), z.get("richtung", ""), t["teilnahmefaktor"], a.get("kwp"), M.TEILNAHME_STATUS[t["status"]]["label"]])
	text = "﻿" + "\r\n".join(";".join(_csv_wert(x) for x in z) for z in [EG_CSV_SPALTEN + ["status"]] + zeilen) + "\r\n"
	_proto(n, "export", g["id"], f"CSV-Export {art}")
	name = re.sub(r"\W+", "-", (g.get("kurzname") or g["name"])).lower()
	return {"dateiname": f"{name}-{art}-{_heute()}.csv", "csv": text}


# ================================================================ Migration aus dem Prototyp

def _prototyp():
	gem, tn = [], []
	if frappe.db.exists("DocType", "Plattform Energiegemeinschaft"):
		for x in frappe.get_all("Plattform Energiegemeinschaft", fields=["name", "titel", "land", "form", "status", "daten"]):
			gem.append({**(aus_json(x.daten, {}) or {}), "id": x.name, "name": x.titel, "land": x.land, "form": x.form, "status": x.status})
	if frappe.db.exists("DocType", "Plattform EG Teilnahme"):
		for x in frappe.get_all("Plattform EG Teilnahme", fields=["name", "gemeinschaft", "konto_id", "status", "daten"]):
			tn.append({**(aus_json(x.daten, {}) or {}), "id": x.name, "egId": x.gemeinschaft, "nutzerId": x.konto_id, "status": x.status})
	return {"gemeinschaften": gem, "teilnahmen": tn}


def _migration_lauf():
	vorhanden = {"gemeinschaften": [{"migriertAus": x} for x in frappe.get_all(DT["gemeinschaft"], filters={"migriert_aus": ["is", "set"]}, pluck="migriert_aus")]}

	def namen(i):
		k = frappe.db.get_value("Plattform Konto", i, ["vorname", "nachname", "email"], as_dict=True)
		return {"vorname": k.vorname or "", "nachname": k.nachname or "", "email": k.email or ""} if k else None

	return K.migration_aus_prototyp(_prototyp(), lambda p: neue_id(PRAEFIX_DT[p]), _heute(), vorhanden, _netzbetreiber_liste(), namen)


def migration_schreiben(r):
	"""Ergebnis von migration_aus_prototyp anlegen (Reihenfolge wegen Links). Vorhandene Zählpunktnummern werden wiederverwendet."""
	zp_map = {}
	for g in r["gemeinschaften"]:
		in_doc("gemeinschaft", g).insert(ignore_permissions=True, set_name=g["id"])
	for art in ("mitglieder", "anlagen", "tarife"):
		key = {"mitglieder": "mitglied", "anlagen": "anlage", "tarife": "tarif"}[art]
		for x in r[art]:
			in_doc(key, x).insert(ignore_permissions=True, set_name=x["id"])
	for z in r["zaehlpunkte"]:
		vorh = frappe.db.get_value(DT["zaehlpunkt"], {"zaehlpunktnummer": z["zaehlpunktnummer"]}, "name")
		if vorh:
			zp_map[z["id"]] = vorh
		else:
			in_doc("zaehlpunkt", z).insert(ignore_permissions=True, set_name=z["id"])
	for t in r["teilnahmen"]:
		t = {**t, "zaehlpunktId": zp_map.get(t["zaehlpunktId"], t["zaehlpunktId"])}
		in_doc("teilnahme", t).insert(ignore_permissions=True, set_name=t["id"])


@frappe.whitelist(methods=["POST"])
def migration_vorschau(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n) or bo_stufe(n, "eg") < 2:
		verboten("Die Migration startet das Backoffice (Bereich „Energiegemeinschaften“ schreiben).")
	r = _migration_lauf()  # neue_id prüft nur die Existenz – es wird nichts geschrieben
	return {"anzahl": {k: len(r[k]) for k in ("gemeinschaften", "mitglieder", "zaehlpunkte", "teilnahmen", "anlagen", "tarife")}, "gemeinschaften": [{"name": g["name"], "modell": g["modell"], "zonelevel": g["zonelevel"], "status": g["status"], "migriertAus": g["migriertAus"]} for g in r["gemeinschaften"]], "warnungen": r["warnungen"], "uebersprungen": r["uebersprungen"], "letzteMigration": None}


@frappe.whitelist(methods=["POST"])
def migration_ausfuehren(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not ist_admin(n) or bo_stufe(n, "eg") < 2:
		verboten("Die Migration startet das Backoffice (Bereich „Energiegemeinschaften“ schreiben).")
	r = _migration_lauf()
	migration_schreiben(r)
	_proto(n, "eg_migration", (r["gemeinschaften"] or [{}])[0].get("id", ""), f"Migration Prototyp: {len(r['gemeinschaften'])} Gemeinschaft(en), {len(r['mitglieder'])} Mitglieder, {len(r['teilnahmen'])} Teilnahmen")
	return {"anzahl": {k: len(r[k]) for k in ("gemeinschaften", "mitglieder", "zaehlpunkte", "teilnahmen")}, "warnungen": r["warnungen"], "uebersprungen": r["uebersprungen"]}
