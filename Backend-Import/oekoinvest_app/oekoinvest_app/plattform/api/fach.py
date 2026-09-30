# Copyright (c) 2026, ÖkoInvest GmbH
#
# Fachprüfung Kapitalseite (docs/API.md, Abschnitt 11) – Referenz: src/lib/plattform/backend/demo/fach.js.
#  - Unternehmen: Abnahmestellen (MaLo/MeLo bzw. Zählpunkt), Lastgänge (Reihe als private Datei + Analyse),
#    Angebotsanfrage (Vorgang „reststrom“)
#  - Mitglied: Vormerkung Genossenschaft (im Aufbau), Teilnahmedaten Energiegemeinschaft
#  - Investor/Anbieter/Backoffice: Bewertungsszenarien je Projekt (nur mit Datenraum-Zugriff)
#
# Parsen/Analysieren der Lastgang-CSV und die Renditerechnung laufen als reine Logik auf dem Website-Server
# (fach/lastgang.js, fach/bewertung.js); Frappe prüft Rolle UND Eigentum, Grenzen und Plausibilität und speichert.
# Rechte: Rollen wie im Demo-Backend; fremde Objekte → PermissionError, Backoffice liest.

import json
import math
import secrets

import frappe

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.fach.energie import EnergieFehler, abnahmestelle_bereinigen, eg_teilnahme_bereinigen
from oekoinvest_app.plattform.fach.mitglied import MitgliedFehler, geno_interesse_bereinigen
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt, nicht_gefunden, nutzer, protokoll, ungueltig, verboten

MAX_ABNAHMESTELLEN = 50
MAX_LASTGAENGE = 12
MAX_SZENARIEN = 20
MAX_SLOTS = 3 * 366 * 96 + 96
MAX_ANALYSE_BYTES = 300 * 1024


def _rolle(n, rollen, text):
	if not n:
		frappe.throw("Bitte melden Sie sich an.", frappe.AuthenticationError)
	if not ist_admin(n) and not any(r in n.rollen for r in rollen):
		verboten(text)


def _fach(fn, *a):
	try:
		return fn(*a)
	except (EnergieFehler, MitgliedFehler) as e:
		ungueltig(str(e))


def _laden(doctype, kennung, n, schreiben=False):
	k = v.kennung(kennung)
	if not k or not frappe.db.exists(doctype, k):
		nicht_gefunden("Nicht gefunden.")
	d = frappe.get_doc(doctype, k)
	if d.konto_id != n.id and not (ist_admin(n) and not schreiben):
		verboten()
	return d


def _stelle_json(s):
	d = aus_json(s.daten, {}) or {}
	return {"id": s.name, "nutzerId": s.konto_id, **d, "erstelltAm": iso(s.creation), "geaendertAm": iso(s.modified)}


def _lastgang_json(l):
	meta = aus_json(l.meta, {}) or {}
	return {
		"id": l.name, "nutzerId": l.konto_id, "abnahmestelleId": l.abnahmestelle_id or None, "name": l.titel or "", "am": iso(l.creation),
		"einheit": meta.get("einheit"), "einheitQuelle": meta.get("einheitQuelle"), "zeitbasis": meta.get("zeitbasis"), "hinweise": meta.get("hinweise") or [],
		"statistik": meta.get("statistik") or {}, "parameter": aus_json(l.parameter, {}) or {}, "analyse": aus_json(l.analyse, {}) or {}, "vorgangId": l.vorgang_id or None,
	}


def _verschachtelt(api_user, fn, **kw):
	"""Andere Plattform-Methode im Namen desselben Kontos aufrufen: zuerst zurück zum API-Benutzer (api_pruefen),
	die Methode wechselt dann selbst wieder in das Konto (als_benutzer)."""
	frappe.set_user(api_user)
	return fn(**kw)


def _konto_id(n, nutzerId=None):
	k = v.kennung(nutzerId)
	return k if (ist_admin(n) and k) else n.id


# ================================================================ Übersicht


@frappe.whitelist(methods=["POST"])
def energie_daten(nutzerId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	kid = _konto_id(n, nutzerId)
	stellen = [frappe.get_doc("Plattform Abnahmestelle", x) for x in frappe.get_all("Plattform Abnahmestelle", filters={"konto_id": kid}, pluck="name", order_by="creation asc", limit_page_length=MAX_ABNAHMESTELLEN)]
	lg = [frappe.get_doc("Plattform Lastgang", x) for x in frappe.get_all("Plattform Lastgang", filters={"konto_id": kid}, pluck="name", order_by="creation desc", limit_page_length=MAX_LASTGAENGE)]
	eg = frappe.get_all("Plattform Beteiligung Interesse", filters={"konto_id": kid, "art": "eg"}, fields=["name", "status", "daten", "creation", "modified"], limit_page_length=1)
	geno = frappe.get_all("Plattform Beteiligung Interesse", filters={"konto_id": kid, "art": "geno"}, fields=["name", "status", "daten", "creation", "modified"], limit_page_length=1)
	# Hinweise (Kündigungsfristen, § 19, Stromsteuer, Voraussetzungen AT) erzeugt die Website mit fach/energie.js
	return {
		"abnahmestellen": [_stelle_json(s) for s in stellen],
		"lastgaenge": [_lastgang_json(x) for x in lg],
		"eg": {"id": eg[0].name, "status": eg[0].status, **(aus_json(eg[0].daten, {}) or {}), "erstelltAm": iso(eg[0].creation), "geaendertAm": iso(eg[0].modified)} if eg else None,
		"geno": {"id": geno[0].name, "status": geno[0].status, **(aus_json(geno[0].daten, {}) or {}), "erstelltAm": iso(geno[0].creation), "geaendertAm": iso(geno[0].modified)} if geno else None,
	}


# ================================================================ Abnahmestellen


@frappe.whitelist(methods=["POST"])
def abnahmestelle_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_rolle(n, ["unternehmen"], "Abnahmestellen pflegen Unternehmen.")
	s = _fach(abnahmestelle_bereinigen, daten or {})
	kennung = s["maloId"] or s["zaehlpunkt"]
	if id:
		d = _laden("Plattform Abnahmestelle", id, n, schreiben=True)
	else:
		v.pflicht(frappe.db.count("Plattform Abnahmestelle", {"konto_id": n.id}) < MAX_ABNAHMESTELLEN, f"Höchstens {MAX_ABNAHMESTELLEN} Abnahmestellen je Konto.")
		v.pflicht(not frappe.db.exists("Plattform Abnahmestelle", {"konto_id": n.id, "kennung": kennung}), "Diese Mess- bzw. Marktlokation ist bereits erfasst.")
		d = frappe.get_doc({"doctype": "Plattform Abnahmestelle", "konto_id": n.id})
	d.bezeichnung = s["bezeichnung"]
	d.land = s["land"]
	d.kennung = kennung
	d.daten = als_json(s)
	d.save(ignore_permissions=True) if not d.is_new() else d.insert(ignore_permissions=True)
	protokoll(n, "aendern" if id else "anlegen", "abnahmestelle", d.name, f"Abnahmestelle „{s['bezeichnung']}“ gespeichert")
	return _stelle_json(d)


@frappe.whitelist(methods=["POST"])
def abnahmestelle_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_rolle(n, ["unternehmen"], "Abnahmestellen pflegen Unternehmen.")
	d = _laden("Plattform Abnahmestelle", id, n, schreiben=True)
	for lg in frappe.get_all("Plattform Lastgang", filters={"abnahmestelle_id": d.name}, pluck="name"):
		frappe.db.set_value("Plattform Lastgang", lg, "abnahmestelle_id", None, update_modified=False)
	protokoll(n, "loeschen", "abnahmestelle", d.name, f"Abnahmestelle „{d.bezeichnung}“ gelöscht")
	frappe.delete_doc("Plattform Abnahmestelle", d.name, ignore_permissions=True)
	return {"ok": True}


# ================================================================ Lastgang


def _reihe_pruefen(reihe):
	r = reihe if isinstance(reihe, dict) else {}
	n = r.get("n")
	kw = r.get("kw")
	v.pflicht(isinstance(n, int) and 96 <= n <= MAX_SLOTS and isinstance(kw, list) and len(kw) == n, "Ungültige Zeitreihe.")
	v.pflicht(isinstance(r.get("startMs"), (int, float)) and 1.2e12 < r["startMs"] < 4.2e12, "Ungültiger Zeitbezug der Zeitreihe.")
	for x in kw:
		if x is not None and not (isinstance(x, (int, float)) and math.isfinite(x) and -1e7 <= x <= 1e7):
			ungueltig("Ungültiger Messwert in der Zeitreihe.")
	return {"startMs": int(r["startMs"]), "n": n, "kw": kw}


def _analyse_pruefen(a):
	v.pflicht(isinstance(a, dict) and isinstance(a.get("jahresverbrauchKwh"), (int, float)) and isinstance(a.get("pv"), dict) and isinstance(a.get("pool"), dict), "Analyse unvollständig.")
	v.pflicht(len(json.dumps(a)) <= MAX_ANALYSE_BYTES, "Analyse zu groß.")
	v.pflicht(0 <= a["jahresverbrauchKwh"] <= 5e10, "Jahresverbrauch unplausibel.")
	return a


def _parameter(p):
	p = p if isinstance(p, dict) else {}
	return {
		"pvKwp": v.zahl(p.get("pvKwp"), min=0, max=100000, stellen=0),
		"preisCt": v.zahl(p.get("preisCt"), min=5, max=80, stellen=2) or 20,
		"produzierend": v.wahr(p.get("produzierend")),
		"regionId": v.auswahl(p.get("regionId"), ["de-nord", "de-ost", "de-west", "de-sued", "at", "ch"], "de-sued"),
	}


@frappe.whitelist(methods=["POST"])
def lastgang_speichern(name=None, abnahmestelleId=None, reihe=None, meta=None, parameter=None, analyse=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	_rolle(n, ["unternehmen"], "Lastgänge laden Unternehmen hoch.")
	v.pflicht(frappe.db.count("Plattform Lastgang", {"konto_id": n.id}) < MAX_LASTGAENGE, f"Höchstens {MAX_LASTGAENGE} Lastgänge je Konto – bitte ältere löschen.")
	stelle = None
	if abnahmestelleId:
		stelle = _laden("Plattform Abnahmestelle", abnahmestelleId, n, schreiben=True)
	r = _reihe_pruefen(reihe)
	a = _analyse_pruefen(analyse)
	m = meta if isinstance(meta, dict) else {}
	lg = frappe.get_doc({
		"doctype": "Plattform Lastgang", "konto_id": n.id, "abnahmestelle_id": stelle.name if stelle else None, "titel": v.text(name, 120) or "Lastgang.csv",
		"meta": als_json({"einheit": v.auswahl(m.get("einheit"), ["W", "kW", "MW", "Wh", "kWh", "MWh"], "kW"), "einheitQuelle": v.auswahl(m.get("einheitQuelle"), ["datei", "vorgabe", "annahme"], "annahme"),
			"zeitbasis": v.auswahl(m.get("zeitbasis"), ["mez_mesz", "mez", "offset"], "mez_mesz"), "hinweise": [{"stufe": v.auswahl(h.get("stufe"), ["info", "warnung"], "info"), "text": v.text(h.get("text"), 400)} for h in (m.get("hinweise") or [])[:20] if isinstance(h, dict)],
			"statistik": {k: v.zahl(x, min=0, max=1e7) for k, x in (m.get("statistik") or {}).items() if isinstance(k, str)}}),
		"parameter": als_json(_parameter(parameter)), "analyse": als_json(a),
	}).insert(ignore_permissions=True)
	datei = frappe.get_doc({
		"doctype": "File", "file_name": f"{lg.name}-{secrets.token_hex(8)}.json", "is_private": 1, "content": json.dumps(r, separators=(",", ":")),
		"attached_to_doctype": "Plattform Lastgang", "attached_to_name": lg.name,
	})
	datei.flags.ignore_permissions = True
	datei.insert(ignore_permissions=True)
	frappe.db.set_value("Plattform Lastgang", lg.name, "reihe_datei", datei.file_url, update_modified=False)
	protokoll(n, "upload", "lastgang", lg.name, f"Lastgang „{lg.titel}“ importiert")
	return _lastgang_json(frappe.get_doc("Plattform Lastgang", lg.name))


@frappe.whitelist(methods=["POST"])
def lastgang_reihe(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	lg = _laden("Plattform Lastgang", id, n)
	f = frappe.get_all("File", filters={"attached_to_doctype": "Plattform Lastgang", "attached_to_name": lg.name}, pluck="name", limit_page_length=1)
	if not f:
		nicht_gefunden("Zeitreihe nicht gefunden.")
	reihe = json.loads(frappe.get_doc("File", f[0]).get_content())
	stelle = frappe.get_doc("Plattform Abnahmestelle", lg.abnahmestelle_id) if lg.abnahmestelle_id and frappe.db.exists("Plattform Abnahmestelle", lg.abnahmestelle_id) else None
	return {"reihe": reihe, "abnahmestelle": _stelle_json(stelle) if stelle else None}


@frappe.whitelist(methods=["POST"])
def lastgang_analyse_speichern(id=None, parameter=None, analyse=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	lg = _laden("Plattform Lastgang", id, n)
	a = _analyse_pruefen(analyse)
	if lg.konto_id != n.id:  # Backoffice rechnet nur, speichert nicht
		out = _lastgang_json(lg)
		out.update({"analyse": a, "parameter": _parameter(parameter)})
		return out
	lg.parameter = als_json(_parameter(parameter))
	lg.analyse = als_json(a)
	lg.save(ignore_permissions=True)
	return _lastgang_json(lg)


@frappe.whitelist(methods=["POST"])
def lastgang_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_rolle(n, ["unternehmen"], "Lastgänge verwalten Unternehmen.")
	lg = _laden("Plattform Lastgang", id, n, schreiben=True)
	for f in frappe.get_all("File", filters={"attached_to_doctype": "Plattform Lastgang", "attached_to_name": lg.name}, pluck="name"):
		frappe.delete_doc("File", f, ignore_permissions=True)
	protokoll(n, "loeschen", "lastgang", lg.name, f"Lastgang „{lg.titel}“ gelöscht")
	frappe.delete_doc("Plattform Lastgang", lg.name, ignore_permissions=True)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def lastgang_anfrage(id=None, nachricht=None, ip=None, als_benutzer=None):  # noqa: A002
	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	_rolle(n, ["unternehmen"], "Angebotsanfragen stellen Unternehmen.")
	lg = _laden("Plattform Lastgang", id, n, schreiben=True)
	if lg.vorgang_id:
		return {"vorgangId": lg.vorgang_id, "bereits": True}
	a = aus_json(lg.analyse, {}) or {}
	par = aus_json(lg.parameter, {}) or {}
	stelle = aus_json(frappe.db.get_value("Plattform Abnahmestelle", lg.abnahmestelle_id, "daten"), {}) if lg.abnahmestelle_id else {}
	konto = frappe.get_doc("Plattform Konto", n.id)
	daten = {
		"quelle": "Lastgang-Analyse im Portal", "lastgangId": lg.name, "jahresverbrauchKwh": a.get("jahresverbrauchKwh"), "spitzeKw": a.get("spitzeKw"),
		"benutzungsstunden": a.get("benutzungsstunden"), "grundlastKw": a.get("grundlastKw"), "mittagslastKw": a.get("mittagslastKw"),
		"lastprofil": (a.get("lastprofil") or {}).get("label"), "pvEmpfehlungKwp": (a.get("pv") or {}).get("empfehlungKwp"), "reststromKwh": (a.get("pool") or {}).get("reststromKwh"),
		"poolErsparnisEur": f"{(a.get('pool') or {}).get('ersparnisEurMin')}–{(a.get('pool') or {}).get('ersparnisEurMax')}", "pvKwpGeprueft": par.get("pvKwp"), "arbeitspreisCt": par.get("preisCt"),
		"abnahmestelle": stelle.get("bezeichnung"), "messart": stelle.get("messart"), "lieferant": stelle.get("lieferant"), "vertragEnde": stelle.get("vertragEnde"),
		"nachricht": v.mehrzeilig(nachricht, 1500),
	}
	from oekoinvest_app.plattform.api.anfrage import anlegen

	r = _verschachtelt(
		api_user,
		anlegen,
		typ="reststrom", kontakt={"vorname": konto.vorname, "nachname": konto.nachname, "firma": konto.firma, "email": konto.email, "telefon": konto.telefon, "land": stelle.get("land") or ""},
		daten={k: x for k, x in daten.items() if x not in (None, "")}, herkunft={"quelle": "portal", "kampagne": "lastgang"}, ip=ip,
		einwilligungText="Angebotsanfrage aus dem Portal (angemeldetes Konto) – Kennzahlen der Lastgang-Analyse werden übermittelt.", als_benutzer=als_benutzer,
	)
	vid = r["id"]
	if not frappe.db.get_value("Plattform Vorgang", vid, "nutzer_id"):
		frappe.db.set_value("Plattform Vorgang", vid, "nutzer_id", n.id, update_modified=False)  # Portal-Anfrage gehört dem Konto
	frappe.db.set_value("Plattform Lastgang", lg.name, "vorgang_id", vid, update_modified=False)
	return {"vorgangId": vid, "bereits": False}


# ================================================================ Mitglied


def _beteiligung(n, art):
	x = frappe.get_all("Plattform Beteiligung Interesse", filters={"konto_id": n.id, "art": art}, pluck="name", limit_page_length=1)
	return frappe.get_doc("Plattform Beteiligung Interesse", x[0]) if x else frappe.get_doc({"doctype": "Plattform Beteiligung Interesse", "konto_id": n.id, "art": art, "status": "vorgemerkt"})


@frappe.whitelist(methods=["POST"])
def eg_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_rolle(n, ["mitglied"], "Energiegemeinschaften sind für Mitglieder.")
	t = _fach(eg_teilnahme_bereinigen, daten or {})
	d = _beteiligung(n, "eg")
	d.daten = als_json(t)
	d.save(ignore_permissions=True) if not d.is_new() else d.insert(ignore_permissions=True)
	protokoll(n, "aendern", "energiegemeinschaft", d.name, "Teilnahmedaten Energiegemeinschaft gespeichert")
	return {"id": d.name, "status": d.status, **t}


@frappe.whitelist(methods=["POST"])
def geno_speichern(daten=None, ip=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_rolle(n, ["mitglied"], "Die Genossenschaft richtet sich an Mitglieder.")
	g = _fach(geno_interesse_bereinigen, daten or {})
	d = _beteiligung(n, "geno")
	d.daten = als_json(g)
	d.bestaetigt_am = jetzt()
	d.bestaetigt_ip = v.text(ip, 64)
	d.save(ignore_permissions=True) if not d.is_new() else d.insert(ignore_permissions=True)
	protokoll(n, "aendern", "genossenschaft", d.name, f"Interesse Genossenschaft vorgemerkt ({g['anteile']} Anteile)", v.text(ip, 64))
	return {"id": d.name, "status": d.status, **g, "geaendertAm": iso(d.modified)}


# ================================================================ Bewertung


def _bewertung_zugriff(n, projektId, api_user):  # noqa: N803
	if not ist_admin(n) and not any(r in n.rollen for r in ("investor", "anbieter")):
		verboten("Das Bewertungswerkzeug steht Investoren und Anbietern zur Verfügung.")
	from oekoinvest_app.plattform.api.boerse import detail

	d = _verschachtelt(api_user, detail, schluessel=projektId, zaehlen=False, als_benutzer=n.id)
	if d["zugriff"] == "oeffentlich":
		verboten("Die Bewertung mit Projektdaten ist nach Freigabe des Datenraums (NDA) möglich.")
	return d


@frappe.whitelist(methods=["POST"])
def bewertung(projektId=None, als_benutzer=None):  # noqa: N803
	"""Daten für das Bewertungswerkzeug; Vorbelegung und Rechnung erzeugt die Website (fach/bewertung.js)."""
	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	d = _bewertung_zugriff(n, projektId, api_user)
	pid = d["projekt"]["id"]
	sp = aus_json(frappe.db.get_value("Plattform Konto", n.id, "suchprofil"), {}) or {}
	szen = frappe.get_all("Plattform Bewertung Szenario", filters={"konto_id": n.id, "projekt_id": pid}, fields=["name", "titel", "modus", "eingaben", "ergebnis", "creation"], order_by="creation desc", limit_page_length=MAX_SZENARIEN)
	return {
		"projekt": d["projekt"], "zugriff": d["zugriff"], "vertraulich": d.get("vertraulich") or {}, "datenblatt": d.get("datenblatt") or {},
		"renditeZielPct": sp.get("renditeZielPct"),
		"szenarien": [{"id": s.name, "projektId": pid, "name": s.titel, "modus": s.modus, "eingaben": aus_json(s.eingaben, {}), "ergebnis": aus_json(s.ergebnis, {}), "am": iso(s.creation)} for s in szen],
	}


@frappe.whitelist(methods=["POST"])
def szenario_speichern(projektId=None, name=None, modus=None, eingaben=None, ergebnis=None, als_benutzer=None):  # noqa: N803
	api_user = frappe.session.user
	n = nutzer(als_benutzer)
	d = _bewertung_zugriff(n, projektId, api_user)
	pid = d["projekt"]["id"]
	titel = v.text(name, 80)
	v.pflicht(len(titel) >= 2, "Bitte geben Sie dem Szenario einen Namen.")
	v.pflicht(frappe.db.count("Plattform Bewertung Szenario", {"konto_id": n.id, "projekt_id": pid}) < MAX_SZENARIEN, f"Höchstens {MAX_SZENARIEN} Szenarien je Projekt.")
	e = eingaben if isinstance(eingaben, dict) else {}
	er = ergebnis if isinstance(ergebnis, dict) else {}
	v.pflicht(len(json.dumps(e)) <= 20000 and len(json.dumps(er)) <= 20000, "Szenario zu groß.")
	s = frappe.get_doc({"doctype": "Plattform Bewertung Szenario", "konto_id": n.id, "projekt_id": pid, "titel": titel, "modus": v.auswahl(modus, ["entwicklung", "bestand"], "entwicklung"), "eingaben": als_json(e), "ergebnis": als_json(er)}).insert(ignore_permissions=True)
	protokoll(n, "szenario", "projekt", pid, f"Bewertungsszenario „{titel}“ gespeichert")
	return {"id": s.name, "projektId": pid, "name": titel, "modus": s.modus, "eingaben": e, "ergebnis": er, "am": iso(s.creation)}


@frappe.whitelist(methods=["POST"])
def szenario_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	s = _laden("Plattform Bewertung Szenario", id, n, schreiben=True)
	frappe.delete_doc("Plattform Bewertung Szenario", s.name, ignore_permissions=True)
	return {"ok": True}
