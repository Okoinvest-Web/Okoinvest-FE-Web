# Copyright (c) 2026, ÖkoInvest GmbH
#
# Energiebeschaffung & Versorger-Ausschreibung (docs/API.md, Abschnitt „Energiebeschaffung“) – Referenz:
# src/lib/plattform/backend/demo/energie.js. Rechenregeln: plattform/energie_kern.py (= src/lib/plattform/energie/*.js).
#
# Rechte (jede Methode prüft Rolle UND Eigentum selbst):
#  - Backoffice: Rolle admin + Bereich „energie“ (rechte.py: lesen ≥ 1, schreiben = 2)
#  - Lieferant: Website-Rolle „lieferant“, Konto im Lieferantenstamm (Feld konten) – NUR eingeladene Ausschreibungen,
#    NUR eigene Angebote, anonymisiertes Los (keine Kundennamen, Anschriften, Lokations-IDs), Angebote nur in offener Runde
#  - Kunde: Rolle „unternehmen“ – eigene Verträge, Vollmacht, eigene Ausschreibungen, Freigabe des Zuschlags
#  - Zuschlag nur nach Freigabe ALLER Kunden des Loses; KYC/KYB-Gating über kyc_kern.kyc_sperre („gebot“, „zuschlag“)
#
# Scheduler (hooks.py): fristen_taeglich (Kündigungsfristen-Alarm, Erinnerung 48 h vor Angebotsfrist), lauf_woechentlich
# (Wechselanalyse aller Verträge). Spotpreise: plattform/energie_quellen.py.

import secrets
from datetime import datetime, timedelta, timezone

import frappe
from frappe.utils import add_days, cint, flt, get_datetime, now_datetime, nowdate

from oekoinvest_app.plattform import energie_kern as ek
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import aktive_admins
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import als_json, aus_json, ist_admin, iso, jetzt, konflikt, kurz, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, sha256, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe

A = "Plattform Ausschreibung"
G = "Plattform Lieferantenangebot"
L = "Plattform Lieferant"
EV = "Plattform Energie Vertrag"
VM = "Plattform Beschaffungsvollmacht"
TR = "Plattform Beschaffungstranche"
TP = "Plattform Marktpreis Termin"
WN = "Plattform Wechselanalyse"
LE = "Plattform Lieferant Einladung"
ES = "Plattform Energie Einstellungen"
MAIL = "Zu Ihrer Energiebeschaffung gibt es Neuigkeiten. Details finden Sie im Portal."
MAIL_LF = "Zu einer Angebotsanfrage gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest."
VOLLMACHT_VERSION = "2026-09"


# ================================================================ Rechte & Grundlagen


def _bo_lesen(n):
	return ist_admin(n) and stufe(n, "energie") >= 1


def _bo_schreiben(n):
	return ist_admin(n) and stufe(n, "energie") >= 2


def _lese(n):
	if not n:
		nicht_angemeldet()
	if not _bo_lesen(n):
		verboten("Nur für das Backoffice (Energiebeschaffung).")


def _schreib(n):
	if not n:
		nicht_angemeldet()
	if not _bo_schreiben(n):
		verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Energiebeschaffung“ kein Schreiben." if ist_admin(n) else "Nur für das Backoffice (Energiebeschaffung).")


def _fach(fn, *a, **kw):
	try:
		return fn(*a, **kw)
	except ValueError as e:
		ungueltig(str(e))


def _daten(d):
	return aus_json(d, {}) if isinstance(d, str) else (d or {})


def _heute():
	return nowdate()


def _einstellungen_werte():
	w = aus_json(frappe.db.get_single_value(ES, "werte"), {}) or {}
	return {**ek.ANNAHMEN_STANDARD, **w}


def _termin_alle():
	rows = frappe.get_all(TP, fields=["name", "handelstag", "zone", "produkt", "typ", "preis_eur_mwh", "quelle", "demo", "modified"], order_by="handelstag asc", limit_page_length=0)
	return [{"id": r.name, "handelstag": str(r.handelstag), "zone": r.zone, "produkt": r.produkt, "typ": r.typ, "preisEurMwh": flt(r.preis_eur_mwh), "quelle": r.quelle, "demo": bool(r.demo), "am": iso(r.modified)} for r in rows]


def _kurve():
	return ek.aktuelle_kurve(_termin_alle())


def _lieferant_von(n):
	if not n or "lieferant" not in (n.get("rollen") or []):
		return None
	rows = frappe.get_all(L, filters={"status": "aktiv", "konten": ["like", f'%"{n.id}"%']}, pluck="name", limit_page_length=1)
	return frappe.get_doc(L, rows[0]) if rows else None


def _runden(a):
	return list(a.runden or [])


def _runde(a):
	r = _runden(a)
	return r[-1] if r else None


def _offen(r):
	return bool(r) and not r.beendet_am and get_datetime(r.frist) > now_datetime()


def _eingeladen(r):
	return aus_json(r.eingeladen, []) or []


def _status(a):
	if a.status == "laufend" and not _offen(_runde(a)):
		return "auswertung"
	return a.status


def _ist_eingeladen(a, lid):
	return a.status != "entwurf" and any(lid in _eingeladen(r) for r in _runden(a))


def _log(a, n, text):
	e = aus_json(a.verlauf, []) or []
	e.append({"am": iso(jetzt()), "vonId": n.id if n else None, "text": text})
	a.verlauf = als_json(e)


def _fmt(dt):
	return get_datetime(dt).strftime("%d.%m.%Y %H:%M") if dt else ""


def _konten(l):
	return aus_json(l.konten, []) or []


def _lf_name(lid):
	return frappe.db.get_value(L, lid, "lieferant_name") or lid


def _energie_admins():
	return [k for k in aktive_admins() if stufe(frappe._dict({"rollen": ["admin"], "backofficeRollen": [r for r in str(frappe.db.get_value("Plattform Konto", k, "backoffice_rollen") or "").split(",") if r] or None}), "energie") >= 1]


def _melde_lieferant(lid, titel, text, link, mail=True, betreff="Angebotsanfrage Strom – ÖkoInvest"):
	for k in _konten(frappe.get_doc(L, lid)):
		benachrichtigen(k, "energie", titel, text, link, "ausschreibung", None, mail=mail, mail_text=MAIL_LF, mail_betreff=betreff)


# ================================================================ Kunden: Stammdaten (Fachprüfung) + Verträge


def _vollmacht(kid):
	rows = frappe.get_all(VM, filters={"kunde_id": kid}, fields=["*"], order_by="creation desc", limit_page_length=1)
	if not rows:
		return None
	r = rows[0]
	return {"id": r.name, "kundeId": r.kunde_id, "version": r.version, "textHash": r.text_hash, "am": iso(r.am), "ip": r.ip, "status": r.status, "widerrufenAm": iso(r.widerrufen_am), "signaturId": r.signatur_id}


def _vollmacht_aktiv(kid):
	vm = _vollmacht(kid)
	return bool(vm and vm["status"] == "erteilt")


def _vertrag_json(x):
	st = ek.kuendigungs_stichtag(str(x.vertrag_ende) if x.vertrag_ende else None, cint(x.kuendigungsfrist_monate) if x.kuendigungsfrist_monate is not None else None, cint(x.kuendigungsfrist_wochen) or None)
	preis = flt(x.preis_ct) if x.preis_ct else None
	return {
		"id": x.name, "kundeId": x.kunde_id, "lieferant": x.lieferant, "lieferantId": x.lieferant_id, "lieferantName": _lf_name(x.lieferant_id) if x.lieferant_id else x.lieferant,
		"zone": x.zone, "struktur": x.struktur, "preisCt": preis, "preisArt": x.preis_art, "aufschlagCt": flt(x.aufschlag_ct) if x.aufschlag_ct else None,
		"energiepreisCt": ek.energiepreis_ct(preis, x.preis_art), "beginn": str(x.beginn) if x.beginn else "", "vertragEnde": str(x.vertrag_ende) if x.vertrag_ende else "",
		"kuendigungsfristMonate": cint(x.kuendigungsfrist_monate), "kuendigungsfristWochen": cint(x.kuendigungsfrist_wochen) or None, "verlaengerungMonate": cint(x.verlaengerung_monate),
		"verlaengerungPreisCt": flt(x.verlaengerung_preis_ct) or None, "jahresKwh": flt(x.jahres_kwh) or None, "lastprofil": x.lastprofil, "pvKwpGeplant": flt(x.pv_kwp_geplant), "speicherKwhGeplant": flt(x.speicher_kwh_geplant),
		"status": x.status, "pool": bool(x.pool), "quelle": x.quelle, "ausschreibungId": x.ausschreibung_id, "vorvertragId": x.vorvertrag_id,
		"kuendigungsStichtag": st, "tageBisStichtag": ek.tage_zwischen(_heute(), st) if st else None, "strukturLabel": {"fix": "Festpreis", "tranchen": "Tranchen", "spot": "Spot-Index"}.get(x.struktur, x.struktur),
	}


def _aktiver_vertrag(kid):
	rows = frappe.get_all(EV, filters={"kunde_id": kid, "status": ["in", ["aktiv", "gekuendigt"]], "quelle": ["!=", "zuschlag"]}, fields=["*"], order_by="vertrag_ende asc", limit_page_length=1)
	return rows[0] if rows else None


def _los_eintrag(kid):
	stellen = [aus_json(s.daten, {}) or {} for s in frappe.get_all("Plattform Abnahmestelle", filters={"konto_id": kid}, fields=["daten"], limit_page_length=0)] if frappe.db.exists("DocType", "Plattform Abnahmestelle") else []
	lg = frappe.get_all("Plattform Lastgang", filters={"konto_id": kid}, fields=["analyse"], order_by="creation desc", limit_page_length=1) if frappe.db.exists("DocType", "Plattform Lastgang") else []
	an = aus_json(lg[0].analyse, None) if lg else None
	vt = _aktiver_vertrag(kid)
	jahres = (an or {}).get("jahresverbrauchKwh") or sum(flt(s.get("jahresverbrauchKwh")) for s in stellen) or (flt(vt.jahres_kwh) if vt else 0)
	return {
		"kundeId": kid, "jahresKwh": jahres, "profilId": ((an or {}).get("lastprofil") or {}).get("id") or (vt.lastprofil if vt else "einschicht"),
		"analyse": {"wochenprofil": an["wochenprofil"], "monate": an["monate"], "jahresverbrauchKwh": an.get("jahresverbrauchKwh")} if an and an.get("wochenprofil") else None,
		"land": (stellen[0].get("land") if stellen else None) or (vt.zone if vt else "DE"), "spannungsebene": stellen[0].get("spannungsebene") if stellen else "", "messart": stellen[0].get("messart") if stellen else "",
		"abnahmestellen": max(1, len(stellen)),
	}


def _analyse(vt, kurve=None, e=None):
	kurve = kurve if kurve is not None else _kurve()
	e = e or _einstellungen_werte()
	zone = vt.zone or "DE"
	ende = str(vt.vertrag_ende) if vt.vertrag_ende else None
	von = ek.naechster_monat(ende[:7]) if ende else f"{now_datetime().year + 1}-01"
	bis = ek.zwoelf_monate(von)
	fwd = ek.termin_preis_zeitraum(kurve, zone, von, bis, "base")
	peak = ek.termin_preis_zeitraum(kurve, zone, von, bis, "peak")
	los = _los_eintrag(vt.kunde_id)
	pf = None
	if fwd and peak:
		start, werte = ek.kunden_reihe(von, flt(vt.jahres_kwh) or los["jahresKwh"], los["profilId"] if los["analyse"] else vt.lastprofil, los["analyse"])
		s = sum(werte)
		p = sum(w for i, w in enumerate(werte) if ek.ist_peak(start + i * 3600))
		anteil = p / s if s else None
		ps = 3120 / 8760
		off = (fwd - peak * ps) / (1 - ps)
		pf = round((anteil * peak + (1 - anteil) * off) / fwd, 3) if anteil is not None else None
	w = ek.wechselanalyse(
		{"preisCt": flt(vt.preis_ct) if vt.preis_ct else None, "preisArt": vt.preis_art, "vertragEnde": ende, "kuendigungsfristMonate": cint(vt.kuendigungsfrist_monate), "kuendigungsfristWochen": cint(vt.kuendigungsfrist_wochen) or None, "verlaengerungPreisCt": flt(vt.verlaengerung_preis_ct) or None, "jahresKwh": flt(vt.jahres_kwh) or los["jahresKwh"]},
		{"forwardEurMwh": fwd, "profilfaktor": pf},
		e,
		_heute(),
	)
	return {**w, "folgezeitraum": {"von": von, "bis": bis}, "forwardEurMwh": fwd, "profilfaktor": pf, "zone": zone}


# ================================================================ Markt (Backoffice)


@frappe.whitelist(methods=["POST"])
def spot(zone="DE", tage=400, als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	from oekoinvest_app.plattform.energie_quellen import stunden

	return stunden("AT" if zone == "AT" else "DE", min(800, max(2, cint(tage) or 400)))


@frappe.whitelist(methods=["POST"])
def termin(zone="DE", produkt="", als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	alle = _termin_alle()
	kurve = ek.aktuelle_kurve(alle)
	z = "AT" if zone == "AT" else "DE"
	tabelle = {}
	for e in kurve.values():
		if e["zone"] != z:
			continue
		p = ek.produkt_zeitraum(e["produkt"])
		r = tabelle.setdefault(e["produkt"], {"produkt": e["produkt"], "art": p["art"], "von": p["von"], "bis": p["bis"], "base": None, "peak": None, "handelstag": e["handelstag"], "quelle": e["quelle"], "demo": e["demo"]})
		r[e["typ"]] = e["preisEurMwh"]
	rang = {"monat": 0, "quartal": 1, "cal": 2}
	tab = sorted(tabelle.values(), key=lambda r: (rang[r["art"]], r["von"]))
	prod = produkt if ek.produkt_zeitraum(produkt) else next((r["produkt"] for r in tab if r["art"] == "cal"), "")
	verlauf = lambda typ: [{"handelstag": e["handelstag"], "preis": e["preisEurMwh"]} for e in alle if e["zone"] == z and e["produkt"] == prod and e["typ"] == typ]  # noqa: E731
	return {"zone": z, "tabelle": tab, "demoKurve": False, "enthaeltDemo": any(r["demo"] for r in tab), "produkt": prod, "verlauf": {"base": verlauf("base"), "peak": verlauf("peak")} if prod else None, "kurve": list(kurve.values()), "eintraege": sorted(alle, key=lambda e: e["handelstag"], reverse=True)[:200]}


@frappe.whitelist(methods=["POST"])
def termin_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	if d.get("csv"):
		v.pflicht(len(str(d["csv"])) <= 400000, "Die CSV-Datei ist zu groß (höchstens 400 KB).")
		liste, fehler = ek.termin_csv_parsen(d["csv"], v.text(d.get("quelleStandard"), 160))
	else:
		e, f = ek.termin_eintrag_pruefen(d.get("eintrag") or {})
		if f:
			ungueltig(f)
		liste, fehler = [e], []
	if not liste:
		ungueltig(f"Zeile {fehler[0]['zeile']}: {fehler[0]['text']}" if fehler else "Keine gültigen Einträge.")
	neu = ersetzt = 0
	for e in liste:
		name = frappe.db.get_value(TP, {"handelstag": e["handelstag"], "zone": e["zone"], "produkt": e["produkt"], "typ": e["typ"]}, "name")
		if name:
			frappe.db.set_value(TP, name, {"preis_eur_mwh": e["preisEurMwh"], "quelle": e["quelle"], "erfasst_von": n.id})
			ersetzt += 1
		else:
			frappe.get_doc({"doctype": TP, "handelstag": e["handelstag"], "zone": e["zone"], "produkt": e["produkt"], "typ": e["typ"], "preis_eur_mwh": e["preisEurMwh"], "quelle": e["quelle"], "demo": 0, "erfasst_von": n.id}).insert(ignore_permissions=True)
			neu += 1
	protokoll(n, "termin_import", "energie", "termin", f"Terminpreise eingespielt: {neu} neu, {ersetzt} ersetzt")
	return {"neu": neu, "ersetzt": ersetzt, "fehler": fehler[:50]}


@frappe.whitelist(methods=["POST"])
def termin_loeschen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	if not id or not frappe.db.exists(TP, id):
		nicht_gefunden("Eintrag nicht gefunden.")
	frappe.delete_doc(TP, id, ignore_permissions=True)
	protokoll(n, "termin_loeschen", "energie", id, "Terminpreis gelöscht")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def einstellungen(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	return {"einstellungen": _einstellungen_werte(), "modelle": {"fee": "Servicefee je MWh", "erfolg": "Erfolgshonorar", "kombi": "Servicefee + Erfolgshonorar"}}


@frappe.whitelist(methods=["POST"])
def einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	alt = _einstellungen_werte()
	z = lambda k, lo, hi, s=2: v.zahl(d.get(k), min=lo, max=hi, stellen=s) if d.get(k) not in (None, "") else alt[k]  # noqa: E731
	neu = {
		**alt,
		"lieferantAufschlagCt": z("lieferantAufschlagCt", 0, 10, 3), "profilAufschlagCt": z("profilAufschlagCt", 0, 10, 3), "hknCt": z("hknCt", 0, 5, 3),
		"schwelleProzent": z("schwelleProzent", 0, 50, 1), "vorlaufTage": z("vorlaufTage", 14, 365, 0), "beobachtenTage": z("beobachtenTage", 30, 730, 0),
		"verguetungModell": v.auswahl(d.get("verguetungModell"), ["fee", "erfolg", "kombi"], alt["verguetungModell"]), "serviceFeeEurMwh": z("serviceFeeEurMwh", 0, 50, 2),
		"erfolgsAnteil": z("erfolgsAnteil", 0, 1, 3), "risikoSchockProzent": z("risikoSchockProzent", 1, 100, 0),
		"bestpreisRegelStandard": v.auswahl(d.get("bestpreisRegelStandard"), list(ek.BESTPREIS_REGELN), alt["bestpreisRegelStandard"]), "demoKurve": False,
	}
	frappe.db.set_single_value(ES, "werte", als_json(neu))
	protokoll(n, "einstellungen", "energie", "einstellungen", "Einstellungen Energiebeschaffung geändert")
	return {"einstellungen": neu}


@frappe.whitelist(methods=["POST"])
def uebersicht(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	kurve = _kurve()
	e = _einstellungen_werte()
	vts = frappe.get_all(EV, filters={"status": ["in", ["aktiv", "gekuendigt"]], "quelle": ["!=", "zuschlag"]}, fields=["*"], limit_page_length=0)
	an = [_analyse(x, kurve, e) for x in vts]
	offen = frappe.get_all(A, filters={"status": ["in", ["laufend", "auswertung", "freigabe"]]}, fields=["name", "status"], limit_page_length=0)
	return {
		"ausschreibungenOffen": len(offen), "freigabeOffen": sum(1 for a in offen if a.status == "freigabe"), "lieferanten": frappe.db.count(L, {"status": "aktiv"}),
		"kunden": len({x.kunde_id for x in frappe.get_all(EV, fields=["kunde_id"], limit_page_length=0)}),
		"empfehlungen": {k: sum(1 for w in an if w["empfehlung"] == k) for k in ek.EMPFEHLUNGEN}, "fristen": sum(1 for w in an if w["tageBisStichtag"] is not None and w["tageBisStichtag"] <= 90),
		"laufAm": iso(frappe.db.get_single_value(ES, "lauf_am")), "kurveDemo": any(x.get("demo") for x in kurve.values()), "einstellungen": e,
	}


# ================================================================ Kunden & Verträge


@frappe.whitelist(methods=["POST"])
def kunden(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	kurve = _kurve()
	e = _einstellungen_werte()
	ids = {x.kunde_id for x in frappe.get_all(EV, fields=["kunde_id"], limit_page_length=0)} | {x.kunde_id for x in frappe.get_all(VM, fields=["kunde_id"], limit_page_length=0)}
	out = []
	for kid in ids:
		vt = _aktiver_vertrag(kid)
		w = _analyse(vt, kurve, e) if vt else None
		k = kurz(kid) or {"id": kid}
		out.append({
			"kunde": {"id": kid, "name": name_von(kid), "firma": k.get("firma", ""), "email": k.get("email", "")}, "vertrag": _vertrag_json(vt) if vt else None, "jahresKwh": flt(vt.jahres_kwh) if vt else _los_eintrag(kid)["jahresKwh"],
			"lastgang": bool(_los_eintrag(kid)["analyse"]), "vollmacht": (_vollmacht(kid) or {}).get("status", "keine"),
			"analyse": {x: w[x] for x in ("empfehlung", "label", "vertragCt", "marktCt", "deltaEurJahr", "stichtag", "tageBisStichtag", "alarm")} if w else None,
			"ausschreibungen": [{"id": a.name, "titel": a.titel, "status": _status(frappe.get_doc(A, a.name))} for a in frappe.get_all(A, filters={"kunden": ["like", f'%"{kid}"%']}, fields=["name", "titel"], limit_page_length=0)],
			"poolVertraege": frappe.db.count(EV, {"kunde_id": kid, "pool": 1}),
		})
	return sorted(out, key=lambda x: (x["analyse"] or {}).get("tageBisStichtag") if (x["analyse"] or {}).get("tageBisStichtag") is not None else 99999)


@frappe.whitelist(methods=["POST"])
def kunde(kunde_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _bo_lesen(n) and kunde_id != n.id:
		verboten()
	if not kunde_id or not frappe.db.exists("Plattform Konto", kunde_id):
		nicht_gefunden("Kunde nicht gefunden.")
	vts = frappe.get_all(EV, filters={"kunde_id": kunde_id}, fields=["*"], order_by="beginn desc", limit_page_length=0)
	vt = _aktiver_vertrag(kunde_id)
	k = kurz(kunde_id)
	stellen = frappe.get_all("Plattform Abnahmestelle", filters={"konto_id": kunde_id}, fields=["name", "bezeichnung", "land", "kennung", "daten"], limit_page_length=0) if frappe.db.exists("DocType", "Plattform Abnahmestelle") else []
	return {
		"kunde": {"id": kunde_id, "name": name_von(kunde_id), "firma": k.get("firma", ""), "email": k.get("email", "")},
		"abnahmestellen": [{"id": s.name, "bezeichnung": s.bezeichnung, "land": s.land, **{x: (aus_json(s.daten, {}) or {}).get(x) for x in ("messart", "jahresverbrauchKwh", "spitzeKw", "lieferant", "vertragEnde", "spannungsebene")}} for s in stellen],
		"lastgaenge": [], "los": _los_eintrag(kunde_id), "vertraege": [_vertrag_json(x) for x in vts], "analyse": _analyse(vt) if vt else None,
		"analyseVerlauf": [{"am": iso(x.am), "empfehlung": x.empfehlung} for x in frappe.get_all(WN, filters={"kunde_id": kunde_id}, fields=["am", "empfehlung"], order_by="am desc", limit_page_length=12)],
		"vollmacht": _vollmacht(kunde_id), "ausschreibungen": [{"id": a.name, "titel": a.titel, "status": a.status, "lieferbeginn": a.lieferbeginn} for a in frappe.get_all(A, filters={"kunden": ["like", f'%"{kunde_id}"%']}, fields=["name", "titel", "status", "lieferbeginn"], limit_page_length=0)],
		"einstellungen": _einstellungen_werte(), "kurveDemo": False,
	}


@frappe.whitelist(methods=["POST"])
def vertrag_speichern(id=None, kunde_id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	bo = _bo_schreiben(n)
	if not bo and "unternehmen" not in (n.get("rollen") or []):
		verboten("Stromverträge pflegen Unternehmen bzw. das Backoffice.")
	d = _daten(daten)
	s = {
		"lieferant": v.text(d.get("lieferant"), 120), "zone": v.auswahl(d.get("zone"), ["DE", "AT"], "DE"), "preis_ct": v.zahl(d.get("preisCt"), min=0, max=200, stellen=3),
		"preis_art": v.auswahl(d.get("preisArt"), ["energie", "gesamt"], "energie"), "struktur": v.auswahl(d.get("struktur"), ["fix", "tranchen", "spot"], "fix"),
		"beginn": d.get("beginn") or None, "vertrag_ende": d.get("vertragEnde") or None, "kuendigungsfrist_monate": v.zahl(d.get("kuendigungsfristMonate"), min=0, max=36, stellen=0),
		"kuendigungsfrist_wochen": v.zahl(d.get("kuendigungsfristWochen"), min=0, max=52, stellen=0), "verlaengerung_monate": v.zahl(d.get("verlaengerungMonate"), min=0, max=60, stellen=0),
		"verlaengerung_preis_ct": v.zahl(d.get("verlaengerungPreisCt"), min=0, max=200, stellen=3), "jahres_kwh": v.zahl(d.get("jahresKwh"), min=0, max=5e9, stellen=0),
		"lastprofil": v.auswahl(d.get("lastprofil"), ["einschicht", "zweischicht", "dreischicht", "handel"], "einschicht"), "pv_kwp_geplant": v.zahl(d.get("pvKwpGeplant"), min=0, max=100000, stellen=0) or 0,
		"speicher_kwh_geplant": v.zahl(d.get("speicherKwhGeplant"), min=0, max=100000, stellen=0) or 0, "status": v.auswahl(d.get("status"), ["aktiv", "gekuendigt", "beendet", "neu"], "aktiv"), "bemerkung": v.mehrzeilig(d.get("bemerkung"), 500),
	}
	v.pflicht(s["lieferant"], "Bitte den bisherigen Lieferanten angeben.")
	v.pflicht(s["vertrag_ende"], "Bitte das Vertragsende angeben.")
	v.pflicht(s["preis_ct"] is not None, "Bitte den Arbeitspreis in ct/kWh angeben.")
	v.pflicht(s["jahres_kwh"], "Bitte die Jahresmenge in kWh angeben.")
	kid = kunde_id if bo and kunde_id else n.id
	if id:
		doc = frappe.get_doc(EV, id)
		if not bo and doc.kunde_id != n.id:
			verboten()
		if not bo and doc.quelle == "zuschlag":
			konflikt("Verträge aus einem Zuschlag pflegt das Backoffice.")
		doc.update(s)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": EV, "kunde_id": kid, "quelle": "backoffice" if bo else "kunde", **s}).insert(ignore_permissions=True)
	protokoll(n, "anlegen" if not id else "aendern", "energievertrag", doc.name, f"Stromvertrag {doc.name} gespeichert")
	return _vertrag_json(doc)


@frappe.whitelist(methods=["POST"])
def vollmacht_erteilen(zustimmung=None, ip="", user_agent="", als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []):
		verboten("Die Beschaffungsvollmacht erteilen Unternehmen.")
	v.pflicht(zustimmung in (True, 1, "1", "true"), "Bitte bestätigen Sie den Text der Vollmacht.")
	if _vollmacht_aktiv(n.id):
		konflikt("Die Vollmacht ist bereits erteilt.")
	from oekoinvest_app.plattform.energie_texte import VOLLMACHT_TEXT

	doc = frappe.get_doc({"doctype": VM, "kunde_id": n.id, "version": VOLLMACHT_VERSION, "text_hash": sha256(VOLLMACHT_TEXT), "am": jetzt(), "ip": v.text(ip, 64), "user_agent": v.text(user_agent, 300), "status": "erteilt"}).insert(ignore_permissions=True)
	protokoll(n, "vollmacht", "energievollmacht", doc.name, f"Beschaffungsvollmacht erteilt (Version {VOLLMACHT_VERSION})", ip)
	return _vollmacht(n.id)


@frappe.whitelist(methods=["POST"])
def vollmacht_widerrufen(ip="", als_benutzer=None):
	n = nutzer(als_benutzer)
	vm = _vollmacht(n.id)
	if not vm or vm["status"] != "erteilt":
		konflikt("Es gibt keine aktive Vollmacht.")
	frappe.db.set_value(VM, vm["id"], {"status": "widerrufen", "widerrufen_am": jetzt()})
	protokoll(n, "vollmacht_widerruf", "energievollmacht", vm["id"], "Beschaffungsvollmacht widerrufen", ip)
	return _vollmacht(n.id)


@frappe.whitelist(methods=["POST"])
def vollmacht_signatur(kunde_id=None, signatur_id=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	vm = _vollmacht(kunde_id)
	if not vm:
		nicht_gefunden("Keine Vollmacht vorhanden.")
	frappe.db.set_value(VM, vm["id"], "signatur_id", v.kennung(signatur_id) or None)
	return _vollmacht(kunde_id)


# ================================================================ Lieferantenstamm & Einladung


def _lieferant_json(l, detail=False):
	a_ids = [a.name for a in frappe.get_all(A, fields=["name", "status"], limit_page_length=0) if _ist_eingeladen(frappe.get_doc(A, a.name), l.name)]
	ang = frappe.get_all(G, filters={"lieferant_id": l.name, "status": ["!=", "zurueckgezogen"]}, fields=["ausschreibung_id", "status", "runde"], limit_page_length=0)
	bw = aus_json(l.bewertungen, []) or []
	from oekoinvest_app.plattform.kyc_kern import kyc_status

	kyb = next((kyc_status(k) for k in _konten(l)), None)
	out = {
		"id": l.name, "name": l.lieferant_name, "land": l.land, "gebiete": aus_json(l.gebiete, []) or [], "status": l.status, "marktpartnerId": l.marktpartner_id or "", "website": l.website or "", "notiz": l.notiz or "", "demo": bool(l.demo),
		"ansprechpartner": aus_json(l.ansprechpartner, []) or [], "konten": [kurz(k) for k in _konten(l)], "sterne": round(sum(b["sterne"] for b in bw) / len(bw), 1) if bw else None, "bewertungenAnzahl": len(bw),
		"teilnahme": {"eingeladen": len(a_ids), "angebote": len({x.ausschreibung_id for x in ang}), "zuschlaege": sum(1 for x in ang if x.status == "zuschlag"), "quote": round(len({x.ausschreibung_id for x in ang}) / len(a_ids) * 100) if a_ids else None},
		"kyb": {"status": (kyb or {}).get("status", "kein Konto"), "verifiziert": bool((kyb or {}).get("verifiziert"))},
		"offeneEinladungen": [{"id": e.name, "email": e.email, "ablauf": iso(e.ablauf)} for e in frappe.get_all(LE, filters={"lieferant_id": l.name, "status": "offen", "ablauf": [">", now_datetime()]}, fields=["name", "email", "ablauf"])],
	}
	if detail:
		out["bewertungen"] = [{**b, "von": name_von(b.get("vonId"))} for b in bw]
		out["historie"] = [{"ausschreibungId": aid, "titel": frappe.db.get_value(A, aid, "titel"), "status": _status(frappe.get_doc(A, aid)), "runden": sorted({x.runde for x in ang if x.ausschreibung_id == aid}), "zuschlag": any(x.status == "zuschlag" and x.ausschreibung_id == aid for x in ang)} for aid in a_ids]
	return out


@frappe.whitelist(methods=["POST"])
def lieferanten(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	return sorted((_lieferant_json(frappe.get_doc(L, x)) for x in frappe.get_all(L, pluck="name", limit_page_length=0)), key=lambda x: x["name"])


@frappe.whitelist(methods=["POST"])
def lieferant(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_lese(n)
	if not id or not frappe.db.exists(L, id):
		nicht_gefunden("Lieferant nicht gefunden.")
	return _lieferant_json(frappe.get_doc(L, id), detail=True)


@frappe.whitelist(methods=["POST"])
def lieferant_speichern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	name = v.text(d.get("name"), 140)
	v.pflicht(len(name) >= 3, "Bitte den Namen des Versorgers angeben.")
	ap = [{"name": v.text(a.get("name"), 120), "email": v.email(a.get("email")), "telefon": v.text(a.get("telefon"), 40), "funktion": v.text(a.get("funktion"), 80)} for a in (d.get("ansprechpartner") or [])[:10] if isinstance(a, dict)]
	werte = {"lieferant_name": name, "land": v.auswahl(d.get("land"), ["DE", "AT", "CH"], "DE"), "gebiete": als_json(v.mehrfach(d.get("gebiete"), ["DE", "AT"]) or ["DE"]), "status": v.auswahl(d.get("status"), ["aktiv", "gesperrt"], "aktiv"), "marktpartner_id": v.text(d.get("marktpartnerId"), 20), "notiz": v.mehrzeilig(d.get("notiz"), 1000), "ansprechpartner": als_json([a for a in ap if a["name"] or a["email"]])}
	if id:
		doc = frappe.get_doc(L, id)
		doc.update(werte)
		doc.save(ignore_permissions=True)
	else:
		if frappe.db.exists(L, {"lieferant_name": name}):
			konflikt("Ein Versorger mit diesem Namen existiert bereits.")
		doc = frappe.get_doc({"doctype": L, **werte, "konten": "[]", "bewertungen": "[]"}).insert(ignore_permissions=True)
	protokoll(n, "aendern" if id else "anlegen", "lieferant", doc.name, f"Lieferant „{name}“ gespeichert")
	return _lieferant_json(doc)


@frappe.whitelist(methods=["POST"])
def lieferant_bewerten(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	s = v.zahl(d.get("sterne"), min=1, max=5, stellen=0)
	v.pflicht(s, "Bitte 1 bis 5 Sterne vergeben.")
	doc = frappe.get_doc(L, id)
	bw = aus_json(doc.bewertungen, []) or []
	bw.append({"id": secrets.token_hex(4), "am": iso(jetzt()), "vonId": n.id, "sterne": int(s), "text": v.mehrzeilig(d.get("text"), 500)})
	doc.bewertungen = als_json(bw[-50:])
	doc.save(ignore_permissions=True)
	return _lieferant_json(doc, detail=True)


def _einladung_anlegen(n, l, email, basis_url="", ausschreibung=None):
	for x in frappe.get_all(LE, filters={"lieferant_id": l.name, "email": email, "status": "offen"}, pluck="name"):
		frappe.db.set_value(LE, x, "status", "ersetzt")
	token = secrets.token_urlsafe(32)
	e = frappe.get_doc({"doctype": LE, "lieferant_id": l.name, "email": email, "token_hash": sha256(token), "ablauf": add_days(now_datetime(), 21), "status": "offen", "ausschreibung_id": ausschreibung.name if ausschreibung else None, "eingeladen_von": n.id}).insert(ignore_permissions=True)
	from oekoinvest_app.plattform import mail as plattform_mail

	link = f"{plattform_mail.basis_url(basis_url)}/einladung/lieferant/{token}"
	text = (f"ÖkoInvest lädt {l.lieferant_name} ein, ein Angebot für die Stromlieferung ab {ausschreibung.lieferbeginn} abzugeben ({ek.los_kennzeichen(ausschreibung.name)})." if ausschreibung else f"ÖkoInvest lädt {l.lieferant_name} in das Versorger-Portal ein.") + " Über den Link legen Sie ein Portal-Konto mit dieser E-Mail-Adresse an oder melden sich an. Der Link ist 21 Tage gültig."
	plattform_mail.hinweis(email, "", "Angebotsanfrage Strom – ÖkoInvest" if ausschreibung else "Einladung ins Versorger-Portal – ÖkoInvest", text, link)
	return e, link


@frappe.whitelist(methods=["POST"])
def lieferant_einladen(id=None, email=None, basis_url="", ausschreibung_id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	e = v.email(email)
	v.pflicht(e, "Bitte eine gültige E-Mail-Adresse angeben.")
	l = frappe.get_doc(L, id)
	a = frappe.get_doc(A, ausschreibung_id) if ausschreibung_id and frappe.db.exists(A, ausschreibung_id) else None
	einl, _link = _einladung_anlegen(n, l, e, basis_url, a)
	protokoll(n, "lieferant_einladung", "lieferant", l.name, f"Einladung an {e}")
	return {"einladung": {"id": einl.name, "email": e, "ablauf": iso(einl.ablauf), "status": "offen"}}


def _konto_anlegen(email, passwort, vorname, nachname, firma):
	"""Konto für einen eingeladenen Versorger (wie auth.registrieren, Rolle „lieferant“, E-Mail durch den Link bestätigt)."""
	from frappe.utils.password import update_password

	fehler = v.passwort_fehler(passwort)
	v.pflicht(not fehler, fehler)
	vn, nn = v.text(vorname, 80), v.text(nachname, 80)
	v.pflicht(vn and nn, "Bitte geben Sie Vor- und Nachnamen an.")
	if frappe.db.exists("User", email):
		konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto.")
	user = frappe.get_doc({"doctype": "User", "email": email, "first_name": vn, "last_name": nn, "user_type": "Website User", "send_welcome_email": 0, "enabled": 1})
	user.flags.ignore_permissions = True
	user.flags.no_welcome_mail = True
	user.insert()
	update_password(email, passwort)
	konto = frappe.get_doc({"doctype": "Plattform Konto", "user": email, "email": email, "vorname": vn, "nachname": nn, "firma": v.text(firma, 120), "rollen": [{"rolle": "lieferant"}], "sitzung_version": 0, "aktiv": 1, "email_bestaetigt": 1, "letzter_login": jetzt()}).insert(ignore_permissions=True)
	return konto.name


def _rolle_hinzufuegen(konto_id, rolle):
	konto = frappe.get_doc("Plattform Konto", konto_id)
	if rolle not in [r.rolle for r in konto.rollen]:
		konto.append("rollen", {"rolle": rolle})
	konto.email_bestaetigt = 1
	konto.save(ignore_permissions=True)


def _einladung_suchen(token):
	import re

	if not re.match(r"^[A-Za-z0-9_-]{20,200}$", str(token or "")):
		return None
	name = frappe.db.get_value(LE, {"token_hash": sha256(token)}, "name")
	return frappe.get_doc(LE, name) if name else None


@frappe.whitelist(methods=["POST"])
def einladung_info(token=None):
	from oekoinvest_app.plattform.kern import api_pruefen

	api_pruefen()
	e = _einladung_suchen(token)
	if not e or e.status != "offen" or get_datetime(e.ablauf) < now_datetime():
		return {"gueltig": False}
	lokal, _, domain = e.email.partition("@")
	return {"gueltig": True, "lieferant": _lf_name(e.lieferant_id), "email": f"{lokal[:1]}{'•' * max(2, min(6, len(lokal) - 1))}@{domain}", "kontoVorhanden": bool(frappe.db.exists("Plattform Konto", {"email": e.email})), "ablauf": iso(e.ablauf), "mitAusschreibung": bool(e.ausschreibung_id)}


@frappe.whitelist(methods=["POST"])
def einladung_annehmen(token=None, daten=None, als_benutzer=None):
	"""Angemeldet: Rolle „lieferant“ + Zuordnung. Ohne Konto: Konto anlegen (auth.registrieren-Logik mit Rolle lieferant)."""
	n = nutzer(als_benutzer, pflicht=False)
	d = _daten(daten)
	e = _einladung_suchen(token)
	if not e or e.status != "offen" or get_datetime(e.ablauf) < now_datetime():
		ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.")
	l = frappe.get_doc(L, e.lieferant_id)
	from oekoinvest_app.plattform.kern import konto_suchen

	if n:
		if n.email != e.email:
			verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.")
		if ist_admin(n):
			konflikt("Backoffice-Konten können keine Lieferanten-Einladung annehmen.")
		konto_id = n.id
	else:
		if konto_suchen(e.email):
			konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto – bitte zuerst anmelden und den Link erneut öffnen.")
		konto_id = _konto_anlegen(e.email, d.get("passwort"), d.get("vorname"), d.get("nachname"), l.lieferant_name)
	_rolle_hinzufuegen(konto_id, "lieferant")
	for x in frappe.get_all(L, filters={"konten": ["like", f'%"{konto_id}"%']}, pluck="name"):
		if x != l.name:
			doc = frappe.get_doc(L, x)
			doc.konten = als_json([k for k in _konten(doc) if k != konto_id])
			doc.save(ignore_permissions=True)
	konten = _konten(l)
	if konto_id not in konten:
		l.konten = als_json(konten + [konto_id])
		l.save(ignore_permissions=True)
	e.status = "angenommen"
	e.angenommen_am = jetzt()
	e.konto_id = konto_id
	e.save(ignore_permissions=True)
	return {"ok": True, "neuesKonto": not n, "lieferant": l.lieferant_name, "ausschreibungId": e.ausschreibung_id, "weiter": f"/portal/ausschreibungen/{e.ausschreibung_id}" if e.ausschreibung_id else "/portal/ausschreibungen"}


# ================================================================ Ausschreibungen: Normierung & Ausgaben


def _los(a):
	return aus_json(a.lose, []) or []


def _kontext(a, kurve):
	lose = _los(a)
	reihen = [ek.kunden_reihe(a.lieferbeginn, flt(e.get("jahresKwh")), e.get("profilId") or "einschicht", e.get("analyse")) for e in lose]
	start = reihen[0][0] if reihen else ek.monats_beginn(a.lieferbeginn)
	werte = [sum(r[1][i] for r in reihen) for i in range(len(reihen[0][1]))] if reihen else []
	hp = ek.stundenpreiskurve(kurve, a.zone or "DE", a.lieferbeginn, ek.zwoelf_monate(a.lieferbeginn))
	return (start, werte), hp, ek.normierung_kontext((start, werte), hp[:2])


def _angebote(a, runde=None, status=("abgegeben", "zuschlag", "unterlegen")):
	f = {"ausschreibung_id": a.name, "status": ["in", list(status)]}
	if runde is not None:
		f["runde"] = runde
	return [{"id": g.name, "lieferantId": g.lieferant_id, "runde": cint(g.runde), "positionen": aus_json(g.positionen, []) or []} for g in frappe.get_all(G, filters=f, fields=["name", "lieferant_id", "runde", "positionen"], limit_page_length=0)]


def _vergleich(a, kurve, runde=None):
	_reihe, _hp, ctx = _kontext(a, kurve)
	vg = ek.angebote_vergleichen(_angebote(a, runde), aus_json(a.produkte, []) or [], ctx)
	vg["ctx"] = {"kwh": round(ctx["kwh"]), "lastgewichtetEurMwh": round(ctx["lastgewichtetEurMwh"] or 0, 2), "baseEurMwh": round(ctx["baseEurMwh"] or 0, 2)}
	return vg


def _angebot_json(g):
	return {"id": g.name, "ausschreibungId": g.ausschreibung_id, "runde": cint(g.runde), "positionen": aus_json(g.positionen, []) or [], "bindefristBis": iso(g.bindefrist_bis), "zahlungszielTage": cint(g.zahlungsziel_tage), "sicherheit": g.sicherheit, "bemerkung": g.bemerkung or "", "status": g.status, "am": iso(g.am), "version": cint(g.version) or 1}


def _runden_json(a, intern=False):
	return [{"nr": cint(r.nr), "start": iso(r.start), "frist": iso(r.frist), "beendetAm": iso(r.beendet_am), "offen": _offen(r), "bestpreisRegel": r.bestpreis_regel, **({"eingeladen": _eingeladen(r), "erinnertAm": iso(r.erinnert_am)} if intern else {})} for r in _runden(a)]


def _admin_json(a, kurve):
	r = _runde(a)
	vg = _vergleich(a, kurve)
	lf = lambda z: {**z, "lieferant": _lf_name(z["lieferantId"])}  # noqa: E731
	zs = aus_json(a.zuschlag, None)
	return {
		"id": a.name, "titel": a.titel, "los": ek.los_kennzeichen(a.name), "status": _status(a), "zone": a.zone, "lieferbeginn": a.lieferbeginn, "produkte": aus_json(a.produkte, []) or [],
		"kunden": [{"id": k, "name": name_von(k), "firma": (kurz(k) or {}).get("firma", ""), "vollmacht": (_vollmacht(k) or {}).get("status", "keine"), "freigabe": ((zs or {}).get("kundenFreigaben") or {}).get(k)} for k in aus_json(a.kunden, []) or []],
		"anonym": aus_json(a.anonym, {}), "regeln": aus_json(a.regeln, {}), "kommune": bool(a.kommune), "runden": _runden_json(a, True), "runde": {"nr": cint(r.nr), "frist": iso(r.frist), "offen": _offen(r)} if r else None,
		"teilnehmer": [{"lieferantId": lid, "name": _lf_name(lid), "geboten": bool(frappe.db.exists(G, {"ausschreibung_id": a.name, "runde": r.nr, "lieferant_id": lid, "status": ["!=", "zurueckgezogen"]}))} for lid in _eingeladen(r)] if r else [],
		"angebote": [{**_angebot_json(g), "lieferantId": g.lieferant_id, "lieferant": _lf_name(g.lieferant_id)} for g in frappe.get_all(G, filters={"ausschreibung_id": a.name}, fields=["*"], limit_page_length=0)],
		"vergleich": {**vg, "zeilen": [lf(z) for z in vg["zeilen"]], "bester": lf(vg["bester"]) if vg["bester"] else None},
		"fragen": [{**f, "lieferant": _lf_name(f.get("lieferantId"))} for f in aus_json(a.fragen, []) or []], "zuschlag": zs, "verlauf": aus_json(a.verlauf, []) or [], "erstelltAm": iso(a.creation), "kurveDemo": False,
	}


def _lieferant_ausgabe(a, l, kurve):
	r = _runde(a)
	status = _status(a)
	eigene = frappe.get_all(G, filters={"ausschreibung_id": a.name, "lieferant_id": l.name}, fields=["*"], order_by="am desc", limit_page_length=0)
	zugelassen = bool(r) and l.name in _eingeladen(r)
	hinweis = ek.bestpreis_hinweis(r.bestpreis_regel, l.name, _vergleich(a, kurve, cint(r.nr) - 1)) if r and cint(r.nr) > 1 and zugelassen else None
	zs = aus_json(a.zuschlag, None) or {}
	sieger = frappe.db.get_value(G, zs.get("angebotId"), "lieferant_id") if zs.get("am") else None
	return {
		"id": a.name, "los": ek.los_kennzeichen(a.name), "titel": f"Stromlieferung {'Österreich (AT)' if a.zone == 'AT' else 'Deutschland (DE-LU)'} ab {a.lieferbeginn}", "status": status, "zone": a.zone, "lieferbeginn": a.lieferbeginn,
		"produkte": aus_json(a.produkte, []) or [], "profil": aus_json(a.anonym, {}), "runden": [{k: x[k] for k in ("nr", "start", "frist", "beendetAm", "offen", "bestpreisRegel")} for x in _runden_json(a)],
		"runde": {"nr": cint(r.nr), "frist": iso(r.frist), "offen": _offen(r), "zugelassen": zugelassen} if r else None, "darfBieten": zugelassen and status == "laufend" and _offen(r), "hinweis": hinweis,
		"eigeneAngebote": [_angebot_json(g) for g in eigene],
		"fragen": [{"id": f["id"], "text": f["text"], "antwort": f.get("antwort") or "", "am": f.get("am"), "beantwortetAm": f.get("beantwortetAm"), "eigene": f.get("lieferantId") == l.name} for f in aus_json(a.fragen, []) or [] if f.get("lieferantId") == l.name or (f.get("oeffentlich") and f.get("antwort"))],
		"ergebnis": ("zuschlag" if sieger == l.name else ("absage" if eigene else "ohne_angebot")) if a.status == "zuschlag" else ("abgebrochen" if a.status == "abgebrochen" else None),
	}


def _kunde_ausgabe(a, n, kurve):
	status = _status(a)
	zs = aus_json(a.zuschlag, None) or {}
	out = {"id": a.name, "titel": a.titel, "status": status, "lieferbeginn": a.lieferbeginn, "zone": a.zone, "pool": len(aus_json(a.kunden, []) or []) > 1, "runden": [{k: x[k] for k in ("nr", "frist", "offen", "beendetAm")} for x in _runden_json(a)], "produkte": aus_json(a.produkte, []) or [], "eigeneFreigabe": (zs.get("kundenFreigaben") or {}).get(n.id), "vorschlag": None, "vergleich": None, "angeboteAnzahl": len({g["lieferantId"] for g in _angebote(a, status=("abgegeben", "zuschlag", "unterlegen"))})}
	if a.status in ("freigabe", "zuschlag") and zs:
		vg = _vergleich(a, kurve)
		lose = _los(a)
		menge = next((flt(x.get("jahresKwh")) for x in lose if x.get("kundeId") == n.id), 0)
		anteil = menge / max(1, sum(flt(x.get("jahresKwh")) for x in lose)) if len(lose) > 1 else 1
		beste = [{"lieferant": _lf_name(z["lieferantId"]), "art": z["art"], "produkt": z["produktId"], "ctKwh": z["ctKwh"], "eurJahr": round(z["eurJahr"] * anteil), "rang": z["rang"], "abstandProzent": z["abstandProzent"], "sensitivitaet": {k: round(x * anteil) for k, x in z["sensitivitaet"].items()}} for z in ek.beste_je_lieferant(vg)[:6]]
		vz = next((z for z in vg["zeilen"] if z["angebotId"] == zs.get("angebotId") and z["produktId"] == zs.get("produktId")), None)
		vt = _aktiver_vertrag(n.id)
		alt_ct = ek.energiepreis_ct(flt(vt.preis_ct) if vt and vt.preis_ct else None, vt.preis_art if vt else "energie")
		g = frappe.get_doc(G, zs["angebotId"]) if zs.get("angebotId") else None
		out["vorschlag"] = {"lieferant": _lf_name(vz["lieferantId"]), "produkt": vz["produktId"], "art": vz["art"], "ctKwh": vz["ctKwh"], "eurJahr": round(vz["eurJahr"] * anteil), "begruendung": zs.get("begruendung") or "", "bindefristBis": iso(g.bindefrist_bis) if g else None, "zahlungszielTage": cint(g.zahlungsziel_tage) if g else None, "sicherheit": g.sicherheit if g else "", "altCt": alt_ct, "ersparnisEurJahr": round((alt_ct - vz["ctKwh"]) / 100 * menge) if alt_ct is not None else None} if vz else None
		out["vergleich"] = {"zeilen": beste, "szenarien": vg["szenarien"]}
	return out


@frappe.whitelist(methods=["POST"])
def ausschreibungen(status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	kurve = _kurve()
	namen = frappe.get_all(A, order_by="creation desc", pluck="name", limit_page_length=0)
	if _bo_lesen(n):
		out = []
		for name in namen:
			a = frappe.get_doc(A, name)
			if status and _status(a) != status:
				continue
			r = _runde(a)
			vg = _vergleich(a, kurve, cint(r.nr) if r else None)
			out.append({"id": a.name, "titel": a.titel, "los": ek.los_kennzeichen(a.name), "status": _status(a), "zone": a.zone, "lieferbeginn": a.lieferbeginn, "kunden": [(kurz(k) or {}).get("firma") or name_von(k) for k in aus_json(a.kunden, []) or []], "mengeMwh": round(vg["ctx"]["kwh"] / 1000), "runde": {"nr": cint(r.nr), "frist": iso(r.frist), "offen": _offen(r), "eingeladen": len(_eingeladen(r))} if r else None, "angebote": len({g["lieferantId"] for g in _angebote(a, cint(r.nr) if r else None, ("abgegeben",))}), "besterCt": (vg["bester"] or {}).get("ctKwh")})
		return out
	l = _lieferant_von(n)
	if l:
		out = []
		for name in namen:
			a = frappe.get_doc(A, name)
			if not _ist_eingeladen(a, l.name):
				continue
			o = _lieferant_ausgabe(a, l, kurve)
			out.append({k: o[k] for k in ("id", "los", "titel", "status", "zone", "lieferbeginn", "runde", "darfBieten", "ergebnis")} | {"eigeneAngebote": len(o["eigeneAngebote"]), "jahresMengeMwh": (o["profil"] or {}).get("jahresMengeMwh")})
		return out
	if "unternehmen" in (n.get("rollen") or []):
		return [_kunde_ausgabe(frappe.get_doc(A, x), n, kurve) for x in namen if n.id in (aus_json(frappe.db.get_value(A, x, "kunden"), []) or []) and frappe.db.get_value(A, x, "status") != "entwurf"]
	verboten()


@frappe.whitelist(methods=["POST"])
def ausschreibung(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if not id or not frappe.db.exists(A, id):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	a = frappe.get_doc(A, id)
	kurve = _kurve()
	if _bo_lesen(n):
		return {"rolle": "admin", "ausschreibung": _admin_json(a, kurve)}
	l = _lieferant_von(n)
	if l:
		if not _ist_eingeladen(a, l.name):
			nicht_gefunden("Ausschreibung nicht gefunden.")
		return {"rolle": "lieferant", "ausschreibung": _lieferant_ausgabe(a, l, kurve)}
	if "unternehmen" in (n.get("rollen") or []) and n.id in (aus_json(a.kunden, []) or []) and a.status != "entwurf":
		return {"rolle": "kunde", "ausschreibung": _kunde_ausgabe(a, n, kurve)}
	nicht_gefunden("Ausschreibung nicht gefunden.")


def _frist(wert):
	try:
		d = get_datetime(datetime.fromisoformat(str(wert).replace("Z", "+00:00")).astimezone().replace(tzinfo=None))
	except Exception:  # noqa: BLE001
		ungueltig("Bitte eine gültige Angebotsfrist angeben.")
	v.pflicht(d > now_datetime() + timedelta(minutes=5), "Die Angebotsfrist muss in der Zukunft liegen.")
	v.pflicht(d < now_datetime() + timedelta(days=120), "Die Angebotsfrist darf höchstens 120 Tage in der Zukunft liegen.")
	return d


def _runde_melden(a, n, basis_url="", nur=None):
	r = _runde(a)
	_log(a, n, f"Runde {r.nr} gestartet, {len(_eingeladen(r))} Versorger eingeladen, Frist {_fmt(r.frist)}")
	for lid in nur or _eingeladen(r):
		l = frappe.get_doc(L, lid)
		if _konten(l):
			_melde_lieferant(lid, f"Neue Angebotsanfrage: {ek.los_kennzeichen(a.name)}" if cint(r.nr) == 1 else f"Runde {r.nr}: {ek.los_kennzeichen(a.name)}", f"Angebotsfrist {_fmt(r.frist)}", f"/portal/ausschreibungen/{a.name}")
		else:
			ap = next((x for x in aus_json(l.ansprechpartner, []) or [] if x.get("email")), None)
			if ap:
				_einladung_anlegen(n, l, ap["email"], basis_url, a)


@frappe.whitelist(methods=["POST"])
def ausschreibung_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	titel = v.text(d.get("titel"), 160)
	v.pflicht(len(titel) >= 5, "Bitte einen Titel angeben (mind. 5 Zeichen).")
	lb = str(d.get("lieferbeginn") or "")
	v.pflicht(len(lb) == 7 and lb > _heute()[:7], "Bitte einen Lieferbeginn in der Zukunft angeben (JJJJ-MM).")
	produkte = _fach(ek.produkte_bereinigen, d.get("produkte"))
	kids = list(dict.fromkeys(v.kennung(x) for x in (d.get("kundenIds") or []) if v.kennung(x)))[:50]
	v.pflicht(kids, "Bitte mindestens einen Kunden wählen (bei mehreren: Pool).")
	for k in kids:
		if not _vollmacht_aktiv(k):
			konflikt(f"Für {(kurz(k) or {}).get('firma') or name_von(k)} liegt keine aktive Beschaffungsvollmacht vor – bitte zuerst im Kundenportal erteilen lassen.")
	lose = [_los_eintrag(k) for k in kids]
	v.pflicht(all(x["jahresKwh"] for x in lose), "Für jeden Kunden wird eine Jahresmenge benötigt (Vertrag, Abnahmestelle oder Lastgang).")
	lf = [x for x in (d.get("lieferantIds") or []) if frappe.db.get_value(L, x, "status") == "aktiv"]
	starten = d.get("starten") in (True, 1, "1", "true")
	if starten:
		v.pflicht(len(lf) >= 2, "Für einen Bieterwettbewerb bitte mindestens zwei Versorger einladen.")
	zone = v.auswahl(d.get("zone"), ["DE", "AT"], "DE")
	reihen = [ek.kunden_reihe(lb, flt(e["jahresKwh"]), e["profilId"], e["analyse"]) for e in lose]
	summe = (reihen[0][0], [sum(r[1][i] for r in reihen) for i in range(len(reihen[0][1]))])
	a = frappe.get_doc({
		"doctype": A, "titel": titel, "status": "laufend" if starten else "entwurf", "zone": zone, "lieferbeginn": lb, "kommune": 1 if d.get("kommune") in (True, 1, "1", "true") else 0,
		"kunden": als_json(kids), "produkte": als_json(produkte), "regeln": als_json({"bestpreis": v.auswahl(d.get("bestpreis"), list(ek.BESTPREIS_REGELN), _einstellungen_werte()["bestpreisRegelStandard"]), "vorgemerkt": [] if starten else lf}),
		"lose": als_json(lose), "anonym": als_json(ek.los_anonym(summe, lose)), "erstellt_von": n.id, "fragen": "[]", "verlauf": "[]",
	})
	if starten:
		a.append("runden", {"nr": 1, "start": jetzt(), "frist": _frist(d.get("frist")), "eingeladen": als_json(lf), "bestpreis_regel": "aus"})
	a.insert(ignore_permissions=True)
	_log(a, n, f"Ausschreibung angelegt ({len(kids)} {'Kunde' if len(kids) == 1 else 'Kunden, Pool'}, {len(produkte)} Produktvarianten)")
	if starten:
		_runde_melden(a, n, d.get("basisUrl") or "")
	a.save(ignore_permissions=True)
	protokoll(n, "ausschreibung", "ausschreibung", a.name, f"Ausschreibung „{titel}“ angelegt")
	return _admin_json(a, _kurve())


def _zuschlag_erteilen(a, n):
	zs = aus_json(a.zuschlag, {})
	g = frappe.get_doc(G, zs["angebotId"])
	if g.status != "abgegeben":
		konflikt("Das Angebot ist nicht mehr gültig.")
	if get_datetime(g.bindefrist_bis) < now_datetime():
		konflikt("Die Bindefrist des Angebots ist abgelaufen.")
	from oekoinvest_app.plattform.kyc_kern import kyc_sperre

	kyc_sperre("zuschlag", konto_id=g.konto_id, text="Zuschlag nicht möglich: Der Versorger ist noch nicht verifiziert (KYB).")
	pos = next(p for p in aus_json(g.positionen, []) if p["produktId"] == zs["produktId"])
	p = next(x for x in aus_json(a.produkte, []) if x["id"] == pos["produktId"])
	for x in frappe.get_all(G, filters={"ausschreibung_id": a.name, "status": "abgegeben"}, pluck="name"):
		frappe.db.set_value(G, x, "status", "zuschlag" if x == g.name else "unterlegen")
	a.status = "zuschlag"
	zs["am"] = iso(jetzt())
	a.zuschlag = als_json(zs)
	j, m = (int(x) for x in a.lieferbeginn.split("-"))
	ende = (datetime(j + p["laufzeitJahre"], m, 1) - timedelta(days=1)).strftime("%Y-%m-%d")
	lose = _los(a)
	for kid in aus_json(a.kunden, []):
		alt = _aktiver_vertrag(kid)
		frappe.get_doc({"doctype": EV, "kunde_id": kid, "lieferant": _lf_name(g.lieferant_id), "lieferant_id": g.lieferant_id, "zone": a.zone, "struktur": p["art"], "preis_ct": pos.get("arbeitspreisCt") if p["art"] == "fix" else None, "aufschlag_ct": pos.get("aufschlagCt"), "grundpreis_eur_monat": pos.get("grundpreisEurMonat"), "hkn_ct": pos.get("hknCt"), "beginn": f"{a.lieferbeginn}-01", "vertrag_ende": ende, "kuendigungsfrist_monate": 3, "jahres_kwh": next((x["jahresKwh"] for x in lose if x["kundeId"] == kid), None), "status": "neu", "pool": 1 if len(lose) > 1 else 0, "quelle": "zuschlag", "ausschreibung_id": a.name, "angebot_id": g.name, "vorvertrag_id": alt.name if alt else None}).insert(ignore_permissions=True)
		if alt and alt.status == "aktiv":
			frappe.db.set_value(EV, alt.name, "status", "gekuendigt")
		benachrichtigen(kid, "energie", f"Zuschlag erteilt: {_lf_name(g.lieferant_id)}", f"{a.titel}: Lieferung ab {a.lieferbeginn}. Kündigung und Lieferantenwechsel werden eingeleitet.", "/portal/energie/beschaffung", "ausschreibung", a.name, mail_text=MAIL, mail_betreff="Zuschlag Ihrer Strombeschaffung – ÖkoInvest")
	_melde_lieferant(g.lieferant_id, f"Zuschlag: {ek.los_kennzeichen(a.name)}", "Ihr Angebot erhält den Zuschlag. Kundendaten folgen gesondert.", f"/portal/ausschreibungen/{a.name}", betreff="Zuschlag Ihrer Angebotsabgabe – ÖkoInvest")
	for lid in {x.lieferant_id for x in frappe.get_all(G, filters={"ausschreibung_id": a.name, "status": ["!=", "zurueckgezogen"]}, fields=["lieferant_id"])} - {g.lieferant_id}:
		_melde_lieferant(lid, f"Angebotsanfrage {ek.los_kennzeichen(a.name)} entschieden", "Der Zuschlag ging an einen anderen Versorger. Vielen Dank für Ihr Angebot.", f"/portal/ausschreibungen/{a.name}", betreff="Ergebnis Ihrer Angebotsabgabe – ÖkoInvest")
	z = next(iter(_energie_admins()), None)
	if z:
		frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(f"Lieferantenwechsel einleiten: {a.titel}", 160), "beschreibung": v.mehrzeilig(f"Zuschlag an {_lf_name(g.lieferant_id)}. Kundendaten übermitteln, Altverträge kündigen, Lieferbeginn {a.lieferbeginn} bestätigen lassen.", 2000), "faellig_am": _heute(), "zustaendig_id": z, "status": "offen"}).insert(ignore_permissions=True)
	_log(a, n, f"Zuschlag erteilt an {_lf_name(g.lieferant_id)} nach Freigabe aller Kunden")


@frappe.whitelist(methods=["POST"])
def ausschreibung_aktion(id=None, daten=None, als_benutzer=None):  # noqa: A002, C901
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	aktion = v.auswahl(d.get("aktion"), ["starten", "einladen", "frist", "beenden", "naechsteRunde", "erinnern", "antworten", "zuschlagVorschlag", "zuschlag", "vorschlagZurueck", "abbrechen"], "")
	v.pflicht(aktion, "Unbekannte Aktion.")
	if not id or not frappe.db.exists(A, id):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	a = frappe.get_doc(A, id)
	status = _status(a)
	r = _runde(a)
	ende = a.status in ("zuschlag", "abgebrochen")
	aktive = lambda ids: [x for x in dict.fromkeys(ids or []) if frappe.db.get_value(L, x, "status") == "aktiv"]  # noqa: E731
	if aktion == "starten":
		if a.status != "entwurf":
			konflikt("Die Ausschreibung läuft bereits.")
		ids = aktive(d.get("lieferantIds") or aus_json(a.regeln, {}).get("vorgemerkt"))
		v.pflicht(len(ids) >= 2, "Für einen Bieterwettbewerb bitte mindestens zwei Versorger einladen.")
		a.append("runden", {"nr": 1, "start": jetzt(), "frist": _frist(d.get("frist")), "eingeladen": als_json(ids), "bestpreis_regel": "aus"})
		a.status = "laufend"
		_runde_melden(a, n, d.get("basisUrl") or "")
	elif aktion == "einladen":
		if status != "laufend":
			konflikt("Nachladen ist nur in einer offenen Runde möglich.")
		neu = [x for x in aktive(d.get("lieferantIds")) if x not in _eingeladen(r)]
		v.pflicht(neu, "Keine neuen Versorger gewählt.")
		r.eingeladen = als_json(_eingeladen(r) + neu)
		_runde_melden(a, n, d.get("basisUrl") or "", neu)
	elif aktion == "frist":
		if ende or a.status in ("entwurf", "freigabe"):
			konflikt("Die Frist kann in diesem Status nicht geändert werden.")
		r.frist = _frist(d.get("frist"))
		r.beendet_am = None
		r.erinnert_am = None
		a.status = "laufend"
		_log(a, n, f"Frist Runde {r.nr} geändert")
	elif aktion == "beenden":
		if status != "laufend":
			konflikt("Die Runde ist nicht offen.")
		r.beendet_am = jetzt()
		_log(a, n, f"Runde {r.nr} vorzeitig beendet – Angebote gesperrt")
	elif aktion == "naechsteRunde":
		if ende or a.status in ("entwurf", "freigabe"):
			konflikt("Eine weitere Runde ist in diesem Status nicht möglich.")
		if _offen(r):
			konflikt("Die laufende Runde ist noch offen – bitte zuerst beenden oder Frist abwarten.")
		geboten = {g["lieferantId"] for g in _angebote(a, cint(r.nr), ("abgegeben",))}
		ids = [x for x in aktive(d.get("lieferantIds")) if x in geboten]
		v.pflicht(ids, "Bitte mindestens einen Versorger mit Angebot aus der Vorrunde wählen (Shortlist).")
		if not r.beendet_am:
			r.beendet_am = r.frist
		a.append("runden", {"nr": cint(r.nr) + 1, "start": jetzt(), "frist": _frist(d.get("frist")), "eingeladen": als_json(ids), "bestpreis_regel": v.auswahl(d.get("bestpreisRegel"), list(ek.BESTPREIS_REGELN), aus_json(a.regeln, {}).get("bestpreis", "aus"))})
		a.status = "laufend"
		_runde_melden(a, n, d.get("basisUrl") or "")
	elif aktion == "erinnern":
		if status != "laufend":
			konflikt("Die Runde ist nicht offen.")
		_erinnern(a, sofort=True)
	elif aktion == "antworten":
		fr = aus_json(a.fragen, []) or []
		f = next((x for x in fr if x["id"] == d.get("frageId")), None)
		v.pflicht(f, "Frage nicht gefunden.")
		f["antwort"] = v.mehrzeilig(d.get("antwort"), 2000)
		v.pflicht(len(f["antwort"]) >= 3, "Bitte eine Antwort eingeben.")
		f["beantwortetAm"] = iso(jetzt())
		f["oeffentlich"] = d.get("oeffentlich") is not False
		a.fragen = als_json(fr)
		for lid in (_eingeladen(r) if f["oeffentlich"] else [f["lieferantId"]]):
			_melde_lieferant(lid, f"Antwort zu {ek.los_kennzeichen(a.name)}", "Eine Frage zur Angebotsanfrage wurde beantwortet.", f"/portal/ausschreibungen/{a.name}", mail=False)
	elif aktion == "zuschlagVorschlag":
		if ende:
			konflikt("Die Ausschreibung ist beendet.")
		if status == "laufend":
			konflikt("Ein Zuschlag ist erst nach Ablauf bzw. Ende der Runde möglich (Gleichbehandlung).")
		g = frappe.get_doc(G, d.get("angebotId")) if d.get("angebotId") and frappe.db.exists(G, d.get("angebotId")) else None
		v.pflicht(g and g.ausschreibung_id == a.name and g.status == "abgegeben", "Bitte ein gültiges Angebot wählen.")
		v.pflicht(any(p["produktId"] == d.get("produktId") for p in aus_json(g.positionen, [])), "Bitte die Produktvariante des Angebots wählen.")
		if get_datetime(g.bindefrist_bis) < now_datetime():
			konflikt("Die Bindefrist des Angebots ist abgelaufen – bitte beim Versorger verlängern lassen.")
		a.zuschlag = als_json({"angebotId": g.name, "produktId": d.get("produktId"), "vorschlagAm": iso(jetzt()), "vorschlagVon": n.id, "begruendung": v.mehrzeilig(d.get("begruendung"), 1000), "kundenFreigaben": {}, "am": None})
		a.status = "freigabe"
		_log(a, n, "Zuschlagsvorschlag an die Kunden gesendet")
		for kid in aus_json(a.kunden, []):
			benachrichtigen(kid, "energie", "Angebotsvergleich zur Freigabe", f"{a.titel}: Bitte prüfen und freigeben.", f"/portal/energie/beschaffung?ausschreibung={a.name}", "ausschreibung", a.name, mail_text="Für Ihre Strombeschaffung liegt ein Angebotsvergleich zur Freigabe bereit. Ohne Ihre Freigabe wird kein Vertrag geschlossen.", mail_betreff="Angebotsvergleich zur Freigabe – ÖkoInvest")
	elif aktion == "vorschlagZurueck":
		if a.status != "freigabe":
			konflikt("Es liegt kein offener Vorschlag vor.")
		a.zuschlag = None
		a.status = "laufend"
		if r and not r.beendet_am:
			r.beendet_am = r.frist
	elif aktion == "zuschlag":
		zs = aus_json(a.zuschlag, None)
		if a.status != "freigabe" or not zs:
			konflikt("Zuerst einen Zuschlagsvorschlag an die Kunden senden.")
		fehlt = [k for k in aus_json(a.kunden, []) if ((zs.get("kundenFreigaben") or {}).get(k) or {}).get("entscheidung") != "freigegeben"]
		if fehlt:
			konflikt(f"Kundenfreigabe erforderlich: {len(fehlt)} von {len(aus_json(a.kunden, []))} Kunden haben noch nicht freigegeben.")
		_zuschlag_erteilen(a, n)
	elif aktion == "abbrechen":
		if ende:
			konflikt("Die Ausschreibung ist bereits beendet.")
		grund = v.mehrzeilig(d.get("grund"), 500)
		v.pflicht(len(grund) >= 3, "Bitte eine Begründung angeben.")
		a.status = "abgebrochen"
		if r and not r.beendet_am:
			r.beendet_am = jetzt()
		for x in frappe.get_all(G, filters={"ausschreibung_id": a.name, "status": "abgegeben"}, pluck="name"):
			frappe.db.set_value(G, x, "status", "unterlegen")
		_log(a, n, f"Abgebrochen: {grund}")
	a.save(ignore_permissions=True)
	protokoll(n, "ausschreibung", "ausschreibung", a.name, f"Ausschreibung {a.name}: {aktion}")
	return _admin_json(a, _kurve())


# ================================================================ Versorger: Angebot, Fragen · Kunde: Freigabe


@frappe.whitelist(methods=["POST"])
def angebot_abgeben(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if "lieferant" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Angebote geben Energieversorger ab.")
	l = _lieferant_von(n)
	if not l:
		verboten("Ihr Konto ist keinem Versorger zugeordnet.")
	if not id or not frappe.db.exists(A, id):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	a = frappe.get_doc(A, id)
	if not _ist_eingeladen(a, l.name):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	r = _runde(a)
	if l.name not in _eingeladen(r):
		verboten("Sie sind für diese Runde nicht zugelassen.")
	if _status(a) != "laufend" or not _offen(r):
		konflikt("Die Angebotsfrist ist abgelaufen – Angebote sind gesperrt.")
	from oekoinvest_app.plattform.kyc_kern import kyc_sperre

	kyc_sperre("gebot", konto_id=n.id, organisation_id=(n.organisation or {}).get("id") if n.organisation else None)
	frist_ts = get_datetime(r.frist).replace(tzinfo=timezone.utc).timestamp()
	pb = _fach(ek.preisblatt_pruefen, _daten(daten), aus_json(a.produkte, []), frist_ts)
	name = frappe.db.get_value(G, {"ausschreibung_id": a.name, "runde": r.nr, "lieferant_id": l.name, "status": "abgegeben"}, "name")
	werte = {"positionen": als_json(pb["positionen"]), "bindefrist_bis": get_datetime(pb["bindefristBis"].replace("T", " ").replace(".000Z", "")), "zahlungsziel_tage": pb["zahlungszielTage"], "sicherheit": pb["sicherheit"], "bemerkung": pb["bemerkung"], "am": jetzt(), "konto_id": n.id}
	if name:
		g = frappe.get_doc(G, name)
		h = aus_json(g.historie, []) or []
		h.append({"am": iso(g.am), "version": cint(g.version), "positionen": aus_json(g.positionen, [])})
		g.update({**werte, "version": cint(g.version) + 1, "historie": als_json(h[-10:])})
		g.flags.ueber_api = True
		g.save(ignore_permissions=True)
	else:
		g = frappe.get_doc({"doctype": G, "ausschreibung_id": a.name, "runde": r.nr, "lieferant_id": l.name, "status": "abgegeben", "version": 1, **werte}).insert(ignore_permissions=True)
	protokoll(n, "angebot", "ausschreibung", a.name, f"Angebot {g.name} (Runde {r.nr}, Version {g.version}) abgegeben")
	return _angebot_json(g)


@frappe.whitelist(methods=["POST"])
def angebot_zurueckziehen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	l = _lieferant_von(n)
	if not l or not id or not frappe.db.exists(G, id) or frappe.db.get_value(G, id, "lieferant_id") != l.name:
		nicht_gefunden("Angebot nicht gefunden.")
	g = frappe.get_doc(G, id)
	a = frappe.get_doc(A, g.ausschreibung_id)
	r = _runde(a)
	if g.status != "abgegeben" or cint(g.runde) != cint(r.nr) or not _offen(r) or _status(a) != "laufend":
		konflikt("Das Angebot kann nicht mehr zurückgezogen werden.")
	frappe.db.set_value(G, g.name, "status", "zurueckgezogen")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def frage_stellen(id=None, text=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	t = v.mehrzeilig(text, 1500)
	v.pflicht(len(t) >= 10, "Bitte formulieren Sie Ihre Frage (mind. 10 Zeichen).")
	l = _lieferant_von(n)
	if not l:
		verboten("Fragen stellen eingeladene Versorger.")
	a = frappe.get_doc(A, id) if id and frappe.db.exists(A, id) else None
	if not a or not _ist_eingeladen(a, l.name):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	if _status(a) != "laufend":
		konflikt("Fragen sind nur während der Angebotsphase möglich.")
	fr = aus_json(a.fragen, []) or []
	v.pflicht(sum(1 for f in fr if f.get("lieferantId") == l.name) < 20, "Höchstens 20 Fragen je Versorger.")
	f = {"id": f"LQ-{secrets.token_hex(4).upper()}", "lieferantId": l.name, "kontoId": n.id, "text": t, "antwort": "", "am": iso(jetzt()), "beantwortetAm": None, "oeffentlich": True}
	fr.append(f)
	a.fragen = als_json(fr)
	a.save(ignore_permissions=True)
	return {"id": f["id"], "text": t, "am": f["am"], "antwort": "", "eigene": True}


@frappe.whitelist(methods=["POST"])
def freigabe(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []) or ist_admin(n):
		verboten("Die Freigabe erteilt der Kunde.")
	d = _daten(daten)
	e = v.auswahl(d.get("entscheidung"), ["freigegeben", "abgelehnt"], "")
	v.pflicht(e, "Bitte „freigeben“ oder „ablehnen“ wählen.")
	a = frappe.get_doc(A, id) if id and frappe.db.exists(A, id) else None
	if not a or n.id not in (aus_json(a.kunden, []) or []):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	zs = aus_json(a.zuschlag, None)
	if a.status != "freigabe" or not zs:
		konflikt("Es liegt kein Vorschlag zur Freigabe vor.")
	if not _vollmacht_aktiv(n.id):
		konflikt("Ihre Beschaffungsvollmacht ist nicht aktiv – bitte zuerst erteilen.")
	zs.setdefault("kundenFreigaben", {})[n.id] = {"am": iso(jetzt()), "ip": v.text(d.get("ip"), 64), "entscheidung": e, "kommentar": v.mehrzeilig(d.get("kommentar"), 500)}
	a.zuschlag = als_json(zs)
	_log(a, n, f"Kunde: {'Zuschlag freigegeben' if e == 'freigegeben' else 'Vorschlag abgelehnt'}")
	zuschlag = False
	if e == "freigegeben" and all((zs["kundenFreigaben"].get(k) or {}).get("entscheidung") == "freigegeben" for k in aus_json(a.kunden, [])):
		_zuschlag_erteilen(a, n)
		zuschlag = True
	a.save(ignore_permissions=True)
	protokoll(n, "freigabe", "ausschreibung", a.name, f"Zuschlagsvorschlag {e}")
	return {"ok": True, "zuschlag": zuschlag, "ausschreibung": _kunde_ausgabe(a, n, _kurve())}


@frappe.whitelist(methods=["POST"])
def meine(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "unternehmen" not in (n.get("rollen") or []):
		verboten()
	from oekoinvest_app.plattform.energie_texte import VOLLMACHT_TEXT

	vts = frappe.get_all(EV, filters={"kunde_id": n.id}, fields=["*"], limit_page_length=0)
	vt = _aktiver_vertrag(n.id)
	kurve = _kurve()
	ers = []
	for x in vts:
		if x.quelle == "zuschlag" and x.vorvertrag_id:
			alt = frappe.get_doc(EV, x.vorvertrag_id)
			alt_ct = ek.energiepreis_ct(flt(alt.preis_ct) or None, alt.preis_art)
			neu_ct = flt(x.preis_ct) or ((ek.termin_preis_zeitraum(kurve, x.zone, str(x.beginn)[:7], ek.zwoelf_monate(str(x.beginn)[:7])) or 0) / 10 + flt(x.aufschlag_ct))
			ers.append({"vertragId": x.name, "altCt": alt_ct, "neuCt": round(neu_ct, 3), "jahresKwh": flt(x.jahres_kwh), "eurJahr": round((alt_ct - neu_ct) / 100 * flt(x.jahres_kwh)) if alt_ct is not None else None, "erwartet": not x.preis_ct})
	return {
		"vertraege": [_vertrag_json(x) for x in vts], "analyse": _analyse(vt, kurve) if vt else None, "vollmacht": _vollmacht(n.id), "vollmachtText": VOLLMACHT_TEXT, "vollmachtVersion": VOLLMACHT_VERSION,
		"ausschreibungen": [_kunde_ausgabe(frappe.get_doc(A, x), n, kurve) for x in frappe.get_all(A, filters={"kunden": ["like", f'%"{n.id}"%'], "status": ["!=", "entwurf"]}, pluck="name")],
		"ersparnis": ers, "fach": {"abnahmestellen": frappe.db.count("Plattform Abnahmestelle", {"konto_id": n.id}) if frappe.db.exists("DocType", "Plattform Abnahmestelle") else 0, "lastgang": bool(_los_eintrag(n.id)["analyse"])},
	}


# ================================================================ Portfolio & Tranchen


@frappe.whitelist(methods=["POST"])
def portfolio(als_benutzer=None):
	n = nutzer(als_benutzer)
	_lese(n)
	kurve = _kurve()
	e = _einstellungen_werte()
	pool = frappe.get_all(EV, filters={"pool": 1, "status": ["in", ["neu", "aktiv"]]}, fields=["*"], limit_page_length=0)
	bedarf = {}
	for vt in pool:
		start = str(vt.beginn)[:7]
		ende = str(vt.vertrag_ende)[:7]
		for _ in range(3):
			if start > ende:
				break
			bis = min(ek.zwoelf_monate(start), ende)
			s, werte = ek.kunden_reihe(start, flt(vt.jahres_kwh), vt.lastprofil, None, bis)
			for i, x in enumerate(werte):
				o = ek.ortszeit(s + i * 3600)
				k = (vt.zone, f"Q{(o.month - 1) // 3 + 1}-{str(o.year)[2:]}")
				bedarf[k] = bedarf.get(k, 0) + x / 1000
			start = f"{int(start[:4]) + 1}{start[4:]}"
	tr = frappe.get_all(TR, fields=["*"], order_by="gekauft_am desc", limit_page_length=0)
	zonen = {}
	for zone in {k[0] for k in bedarf} | {t.zone for t in tr}:
		def mp(periode, zone=zone):
			z = ek.produkt_zeitraum(periode)
			return ek.termin_preis_zeitraum(kurve, zone, z["von"], z["bis"], "base") if z else None

		zonen[zone] = ek.portfolio([{"periode": k[1], "mwh": round(mwh, 1)} for k, mwh in bedarf.items() if k[0] == zone], [{"periode": t.periode, "mwh": flt(t.mwh), "preisEurMwh": flt(t.preis_eur_mwh), "status": t.status} for t in tr if t.zone == zone], mp, e["risikoSchockProzent"])
	return {"zonen": zonen, "kunden": [{"vertragId": x.name, "kunde": {"id": x.kunde_id, "name": name_von(x.kunde_id), "firma": (kurz(x.kunde_id) or {}).get("firma", "")}, "zone": x.zone, "jahresKwh": flt(x.jahres_kwh), "beginn": str(x.beginn), "ende": str(x.vertrag_ende), "lieferant": x.lieferant, "struktur": x.struktur} for x in pool], "tranchen": [{"id": t.name, "periode": t.periode, "zone": t.zone, "mwh": flt(t.mwh), "preisEurMwh": flt(t.preis_eur_mwh), "gekauftAm": str(t.gekauft_am or ""), "lieferant": t.lieferant, "status": t.status} for t in tr], "kurveDemo": False, "schockProzent": e["risikoSchockProzent"]}


@frappe.whitelist(methods=["POST"])
def tranche_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	d = _daten(daten)
	p = ek.produkt_zeitraum(d.get("periode"))
	v.pflicht(p and p["art"] == "quartal", "Periode bitte als Quartal angeben (z. B. Q1-27).")
	mwh = v.zahl(d.get("mwh"), min=0.1, max=1e6, stellen=1)
	preis = v.zahl(d.get("preisEurMwh"), min=-500, max=3000, stellen=2)
	v.pflicht(mwh, "Bitte die Menge in MWh angeben.")
	v.pflicht(preis is not None, "Bitte den Preis in €/MWh angeben.")
	lid = d.get("lieferantId") if d.get("lieferantId") and frappe.db.exists(L, d.get("lieferantId")) else None
	t = frappe.get_doc({"doctype": TR, "periode": p["code"], "zone": v.auswahl(d.get("zone"), ["DE", "AT"], "DE"), "typ": "base", "mwh": mwh, "preis_eur_mwh": preis, "gekauft_am": d.get("gekauftAm") or _heute(), "lieferant": _lf_name(lid) if lid else v.text(d.get("lieferant"), 120), "lieferant_id": lid, "status": "aktiv", "bemerkung": v.text(d.get("bemerkung"), 200), "erfasst_von": n.id}).insert(ignore_permissions=True)
	protokoll(n, "tranche", "energie", t.name, f"Tranche {t.zone} {t.periode}: {mwh} MWh zu {preis} €/MWh")
	return {"id": t.name, "periode": t.periode, "zone": t.zone, "mwh": mwh, "preisEurMwh": preis, "status": "aktiv"}


@frappe.whitelist(methods=["POST"])
def tranche_stornieren(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	_schreib(n)
	if not id or not frappe.db.exists(TR, id):
		nicht_gefunden("Tranche nicht gefunden.")
	if frappe.db.get_value(TR, id, "status") == "storniert":
		konflikt("Die Tranche ist bereits storniert.")
	frappe.db.set_value(TR, id, "status", "storniert")
	protokoll(n, "tranche", "energie", id, f"Tranche {id} storniert")
	return {"id": id, "status": "storniert"}


@frappe.whitelist(methods=["POST"])
def dokument_daten(art=None, id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	from oekoinvest_app.plattform.energie_texte import VOLLMACHT_TEXT

	if art == "vollmacht":
		kid = id if _bo_lesen(n) and id else n.id
		k = kurz(kid) or {}
		return {"art": art, "kunde": {"id": kid, "name": name_von(kid), "firma": k.get("firma", ""), "email": k.get("email", "")}, "vollmacht": _vollmacht(kid), "text": VOLLMACHT_TEXT, "version": VOLLMACHT_VERSION}
	if not id or not frappe.db.exists(A, id):
		nicht_gefunden("Ausschreibung nicht gefunden.")
	a = frappe.get_doc(A, id)
	kurve = _kurve()
	if _bo_lesen(n):
		return {"art": art, "rolle": "admin", "ausschreibung": _admin_json(a, kurve)}
	if "unternehmen" in (n.get("rollen") or []) and n.id in (aus_json(a.kunden, []) or []) and a.status in ("freigabe", "zuschlag"):
		return {"art": art, "rolle": "kunde", "ausschreibung": _kunde_ausgabe(a, n, kurve), "kunde": kurz(n.id)}
	l = _lieferant_von(n)
	zs = aus_json(a.zuschlag, None) or {}
	if l and art == "zuschlag" and a.status == "zuschlag" and frappe.db.get_value(G, zs.get("angebotId"), "lieferant_id") == l.name:
		return {"art": art, "rolle": "lieferant", "ausschreibung": _lieferant_ausgabe(a, l, kurve), "lieferant": l.lieferant_name}
	nicht_gefunden("Dokument nicht gefunden.")


# ================================================================ Läufe (Scheduler)


def _erinnern(a, sofort=False):
	r = _runde(a)
	if a.status != "laufend" or not _offen(r):
		return 0
	if not sofort and (r.erinnert_am or get_datetime(r.frist) - now_datetime() > timedelta(hours=48)):
		return 0
	anzahl = 0
	for lid in _eingeladen(r):
		if frappe.db.exists(G, {"ausschreibung_id": a.name, "runde": r.nr, "lieferant_id": lid, "status": "abgegeben"}):
			continue
		_melde_lieferant(lid, f"Angebotsfrist läuft ab: {ek.los_kennzeichen(a.name)}", f"Runde {r.nr} bis {_fmt(r.frist)}", f"/portal/ausschreibungen/{a.name}", betreff="Erinnerung Angebotsfrist – ÖkoInvest")
		anzahl += 1
	r.erinnert_am = jetzt()
	return anzahl


def _lauf(n=None, nur_fristen=False):
	kurve = _kurve()
	e = _einstellungen_werte()
	alarme = aus_json(frappe.db.get_single_value(ES, "alarme"), {}) or {}
	erg = {"analysen": 0, "alarme": 0, "erinnerungen": 0}
	z = next(iter(_energie_admins()), None)
	for vt in frappe.get_all(EV, filters={"status": ["in", ["aktiv", "gekuendigt"]], "quelle": ["!=", "zuschlag"]}, fields=["*"], limit_page_length=0):
		w = _analyse(vt, kurve, e)
		key = f"{vt.name}|{w['stichtag']}|{w['alarm']}"
		neu = w["alarm"] is not None and w["stichtag"] and vt.status == "aktiv" and key not in alarme
		if nur_fristen and not neu:
			continue
		frappe.get_doc({"doctype": WN, "vertrag_id": vt.name, "kunde_id": vt.kunde_id, "am": jetzt(), "empfehlung": w["empfehlung"], "vertrag_ct": w["vertragCt"], "markt_ct": w["marktCt"], "delta_eur_jahr": w["deltaEurJahr"], "stichtag": w["stichtag"], "tage_bis_stichtag": w["tageBisStichtag"], "alarm": w["alarm"] or 0, "alarm_neu": 1 if neu else 0, "begruendung": "\n".join(w["begruendung"])[:2000]}).insert(ignore_permissions=True)
		erg["analysen"] += 1
		if neu:
			alarme[key] = iso(jetzt())
			erg["alarme"] += 1
			text = "Kündigungsstichtag verstrichen" if w["alarm"] == 0 else f"Kündigung bis {w['stichtag']} ({w['tageBisStichtag']} Tage)"
			if z:
				frappe.get_doc({"doctype": "Plattform Aufgabe", "titel": v.text(f"Energievertrag {(kurz(vt.kunde_id) or {}).get('firma') or name_von(vt.kunde_id)}: {text}", 160), "beschreibung": v.mehrzeilig(f"Empfehlung: {w['label']}.\n" + "\n".join(w["begruendung"]) + f"\nKundenanalyse: /portal/admin/energie/kunden/{vt.kunde_id}", 2000), "faellig_am": _heute() if w["alarm"] == 0 else w["stichtag"], "zustaendig_id": z, "status": "offen"}).insert(ignore_permissions=True)
			benachrichtigen(vt.kunde_id, "energie", f"Stromvertrag: {text}", f"Empfehlung: {w['label']}.", "/portal/energie/beschaffung", "energievertrag", vt.name, mail_text=MAIL, mail_betreff="Frist Ihres Stromvertrags – ÖkoInvest")
	for name in frappe.get_all(A, filters={"status": "laufend"}, pluck="name"):
		a = frappe.get_doc(A, name)
		k = _erinnern(a)
		if k:
			a.save(ignore_permissions=True)
		erg["erinnerungen"] += k
	frappe.db.set_single_value(ES, "alarme", als_json(alarme))
	if not nur_fristen:
		frappe.db.set_single_value(ES, "lauf_am", jetzt())
	return erg


@frappe.whitelist(methods=["POST"])
def lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	_schreib(n)
	erg = _lauf(n)
	protokoll(n, "energie_lauf", "energie", "lauf", f"Wechselanalyse/Fristen: {erg['analysen']} Analysen, {erg['alarme']} Alarme")
	return erg


def lauf_woechentlich():
	"""Scheduler (wöchentlich): Wechselanalyse aller Verträge + Fristen."""
	_lauf()
	frappe.db.commit()


def fristen_taeglich():
	"""Scheduler (täglich): nur neue Fristen-Alarme und Erinnerungen an Angebotsfristen."""
	_lauf(nur_fristen=True)
	frappe.db.commit()
