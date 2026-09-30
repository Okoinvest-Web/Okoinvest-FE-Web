# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dienste „Firmen, Bonität, Identität + SPV-Gründung“ (docs/API.md, Abschnitt „Dienste“) – Referenz:
# src/lib/plattform/backend/demo/dienste.js. Regeln: plattform/dienste_kern.py. Anbieter/Recht: docs/DIENSTE-EXTERN.md.
#
# Rechte (Rolle UND Bereich, jede Methode selbst; plattform/rechte.py):
#   Identität      – Person selbst (eigene Sitzungen, eigene MRZ-Vorprüfung). webhook_identitaet ist die EINZIGE
#                    allow_guest-Methode der App: nur POST, HMAC-Signatur über den Roh-Body, Rate-Limit je IP, idempotent.
#   Register       – Bereich „register“: lesen = Suche, schreiben = Abruf; Ablage im KYC-Fall zusätzlich Compliance schreiben
#   Bonität        – Bereich „bonitaet“ (Leitung, Transaktion, Compliance); Betroffene werden ohne Ergebnis informiert
#   Gesellschaften – Bereich „gesellschaften“: lesen = Verzeichnis, schreiben = Gründung/Checkliste
#
# site_config (alle optional; ohne Anbieter-Zugang im developer_mode bzw. mit oekoinvest_dienste_demo = 1 Demo-Simulator):
#   oekoinvest_ident_anbieter / _api_url / _api_key / _api_secret / _webhook_secret / _stufe
#   oekoinvest_zefix_benutzer / _passwort / _url · oekoinvest_firmenbuch_api_url / _key · oekoinvest_handelsregister_api_url / _key
#   oekoinvest_bonitaet_anbieter / _api_url / _api_key / _produkt · oekoinvest_bonitaet_vor_loi (alle|firmen|pilot|aus)
#   oekoinvest_erpnext_gesellschaften (1 = Company je Projektgesellschaft anlegen, nur wenn ERPNext installiert)
# Schlüssel erscheinen nie in Antworten, Protokollen oder Fehlermeldungen.

import hashlib
import hmac
import json
from datetime import timedelta

import frappe
from frappe.rate_limiter import rate_limit
from frappe.utils import add_days, cint, get_datetime, getdate, now_datetime, nowdate

from oekoinvest_app.plattform import dienste_kern as dk
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import aus_json, ist_admin, iso, konflikt, name_von, nicht_angemeldet, nicht_gefunden, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import recht_noetig, stufe

DT_IDENT = "Plattform Identitaetspruefung"
DT_REG = "Plattform Registerauskunft"
DT_BON = "Plattform Bonitaetsauskunft"
DT_GES = "Plattform Projektgesellschaft"
TIMEOUT = 15


def _conf(k, standard=None):
	return frappe.conf.get(k) or standard


def _demo_erlaubt():
	return bool(frappe.conf.get("developer_mode") or cint(frappe.conf.get("oekoinvest_dienste_demo")))


def _json(x, standard=None):
	return aus_json(x, standard)


def _dump(x):
	return json.dumps(x, ensure_ascii=False)


# ====================================================================== KYC-Anbindung (Team KYC: kyc_kern.ergebnis_anhaengen)


def _kyc_anhaengen(eintrag, fall_id=None, konto_id=None, organisation_id=None):
	"""Ergebnis als Hinweis an den KYC-Fall hängen. Fehlt der Fall, wird nichts angehängt (kein Fehler)."""
	try:
		from oekoinvest_app.plattform.kyc_kern import ergebnis_anhaengen
	except ImportError:
		return None
	try:
		return ergebnis_anhaengen(fall_id=fall_id, eintrag=eintrag, konto_id=konto_id, organisation_id=organisation_id)
	except frappe.DoesNotExistError:
		return None


# ====================================================================== Identität


def _ident_konfig():
	anbieter = str(_conf("oekoinvest_ident_anbieter", "") or "").lower()
	if anbieter not in dk.IDENT_ANBIETER:
		anbieter = "demo" if _demo_erlaubt() else ""
	geheimnis = _conf("oekoinvest_ident_webhook_secret", "") or ("oekoinvest-demo-ident-webhook-nur-entwicklung" if anbieter == "demo" and _demo_erlaubt() else "")
	aktiv = bool(anbieter) and (anbieter == "demo" or bool(_conf("oekoinvest_ident_api_key") and len(geheimnis) >= 16))
	return frappe._dict(anbieter=anbieter, label=dk.IDENT_ANBIETER.get(anbieter, {}).get("label", "nicht konfiguriert"), url=str(_conf("oekoinvest_ident_api_url", "")).rstrip("/"),
		key=_conf("oekoinvest_ident_api_key", ""), secret=_conf("oekoinvest_ident_api_secret", ""), geheimnis=geheimnis, stufe=_conf("oekoinvest_ident_stufe", ""), aktiv=aktiv, demo=anbieter == "demo")


def _sitzung_json(d):
	return {"id": d.name, "anbieter": d.anbieter, "anbieterLabel": dk.IDENT_ANBIETER.get(d.anbieter, {}).get("label", d.anbieter), "status": d.status,
		"statusLabel": dk.IDENT_ERGEBNIS_LABEL.get(d.status, d.status), "verfahren": d.verfahren or "", "erstelltAm": iso(d.erstellt_am), "abgeschlossenAm": iso(d.abgeschlossen_am),
		"kycVerknuepft": bool(d.kyc_eintrag_id), "url": d.url if d.status == "ausstehend" else None}


@frappe.whitelist(methods=["POST"])
def ident_status(als_benutzer=None):
	n = nutzer(als_benutzer)
	k = _ident_konfig()
	sitzungen = [frappe.get_doc(DT_IDENT, x) for x in frappe.get_all(DT_IDENT, filters={"konto_id": n.id, "art": "online"}, pluck="name", order_by="erstellt_am desc", limit_page_length=5)]
	mrz = frappe.get_all(DT_IDENT, filters={"konto_id": n.id, "art": "mrz"}, fields=["erstellt_am", "status", "dokumentart", "gueltig_bis", "nummer_maskiert"], order_by="erstellt_am desc", limit_page_length=1)
	return {
		"konfig": {"anbieter": k.anbieter, "label": k.label, "aktiv": k.aktiv, "demo": k.demo, "verfahren": []},
		"sitzungen": [_sitzung_json(s) for s in sitzungen],
		"mrz": {"am": iso(mrz[0].erstellt_am), "ergebnis": mrz[0].status, "dokumentart": mrz[0].dokumentart, "gueltigBis": str(mrz[0].gueltig_bis or ""), "nummer": mrz[0].nummer_maskiert} if mrz else None,
	}


def _anbieter_start(k, sitzung_id, n, rueck_url):
	import requests

	if k.demo:
		return f"/portal/verifizierung/identitaet?sitzung={sitzung_id}", f"DEMO-{sitzung_id}"
	if not k.aktiv or not k.url:
		frappe.throw("Die Online-Identifizierung ist derzeit nicht verfügbar.", frappe.ValidationError)
	try:
		if k.anbieter == "veriff":
			r = requests.post(f"{k.url}/v1/sessions", json={"verification": {"callback": rueck_url, "vendorData": sitzung_id, "person": {"firstName": n.vorname, "lastName": n.nachname}}}, headers={"X-AUTH-CLIENT": k.key}, timeout=TIMEOUT)
			r.raise_for_status()
			j = r.json().get("verification") or {}
			return j.get("url"), j.get("id")
		if k.anbieter == "sumsub":
			pfad = f"/resources/sdkIntegrations/levels/-/websdkLink?ttlInSecs=1800&externalUserId={sitzung_id}&levelName={k.stufe or 'basic-kyc-level'}&lang=de"
			ts = str(int(now_datetime().timestamp()))
			sig = hmac.new(str(k.secret).encode(), f"{ts}POST{pfad}".encode(), hashlib.sha256).hexdigest()
			r = requests.post(f"{k.url}{pfad}", headers={"X-App-Token": k.key, "X-App-Access-Ts": ts, "X-App-Access-Sig": sig, "Accept": "application/json"}, timeout=TIMEOUT)
			r.raise_for_status()
			return r.json().get("url"), None
		if k.anbieter == "onfido":
			kopf = {"Authorization": f"Token token={k.key}"}
			a = requests.post(f"{k.url}/v3.6/applicants", json={"first_name": n.vorname, "last_name": n.nachname}, headers=kopf, timeout=TIMEOUT)
			a.raise_for_status()
			w = requests.post(f"{k.url}/v3.6/workflow_runs", json={"workflow_id": k.stufe, "applicant_id": a.json().get("id"), "tags": [sitzung_id], "link": {"completed_redirect_url": rueck_url}}, headers=kopf, timeout=TIMEOUT)
			w.raise_for_status()
			return (w.json().get("link") or {}).get("url"), w.json().get("id")
	except requests.RequestException:
		frappe.log_error(title="Identitätsanbieter: Start fehlgeschlagen", message=f"Anbieter {k.anbieter}, Sitzung {sitzung_id}")
		frappe.throw("Der Identitätsanbieter ist derzeit nicht erreichbar. Bitte später erneut versuchen.", frappe.ValidationError)
	frappe.throw("Die Anbindung an diesen Identitätsanbieter ist vorbereitet, aber noch nicht freigeschaltet.", frappe.ValidationError)


@frappe.whitelist(methods=["POST"])
def ident_starten(basisUrl=None, als_benutzer=None):  # noqa: N803 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	k = _ident_konfig()
	if not k.aktiv:
		frappe.throw("Die Online-Identifizierung ist derzeit nicht verfügbar. Bitte laden Sie Ihre Ausweiskopie hoch – unser Team prüft manuell.", frappe.ValidationError)
	heute = frappe.db.count(DT_IDENT, {"konto_id": n.id, "art": "online", "erstellt_am": (">=", nowdate())})
	if heute >= 5:
		frappe.throw("Heute wurden bereits mehrere Identifizierungen gestartet. Bitte versuchen Sie es morgen erneut.", frappe.ValidationError)
	d = frappe.get_doc({"doctype": DT_IDENT, "konto_id": n.id, "art": "online", "anbieter": k.anbieter, "status": "ausstehend", "erstellt_am": now_datetime()})
	d.insert(ignore_permissions=True)
	basis = (frappe.conf.get("plattform_basis_url") or str(basisUrl or "")).rstrip("/")
	url, extern = _anbieter_start(k, d.name, n, f"{basis}/portal/verifizierung?ident={d.name}")
	d.db_set({"url": url, "externe_id": extern})
	protokoll(n, "ident_start", "ident", d.name, f"Online-Identifizierung gestartet ({k.label})")
	return {"sitzung": _sitzung_json(d), "url": url}


def _webhook_verarbeiten(anbieter, kopf, roh):
	"""Gemeinsamer Pfad für echte Webhooks und den Demo-Simulator. Liefert (status, antwort)."""
	k = _ident_konfig()
	if not k.anbieter or anbieter != k.anbieter:
		return 404, {"ok": False}
	ok, _grund = dk.webhook_signatur_pruefen(anbieter, kopf, roh, k.geheimnis)
	if not ok:
		return 401, {"ok": False, "error": "Signatur ungültig."}
	try:
		p = json.loads(roh)
	except ValueError:
		return 400, {"ok": False}
	e = dk.webhook_normalisieren(anbieter, p)
	if not e:
		return 200, {"ok": True, "verarbeitet": False}
	name = v.kennung(e["sitzungId"])
	if not name or not frappe.db.exists(DT_IDENT, name):
		return 200, {"ok": True, "verarbeitet": False}
	d = frappe.get_doc(DT_IDENT, name)
	if d.anbieter != anbieter:
		return 200, {"ok": True, "verarbeitet": False}
	ereignis_id = e.get("ereignisId") or hashlib.sha256(roh if isinstance(roh, bytes) else roh.encode()).hexdigest()[:24]
	bisher = _json(d.ereignisse, []) or []
	if any(x.get("id") == ereignis_id for x in bisher):
		return 200, {"ok": True, "verarbeitet": False, "doppelt": True}
	d.status = e["ergebnis"]
	d.verfahren = e.get("verfahren") or ""
	d.grund = e.get("grund") or ""
	d.externe_id = e.get("externeId") or d.externe_id
	d.abgeschlossen_am = now_datetime()
	d.url = None
	d.ereignisse = _dump((bisher + [{"id": ereignis_id, "am": iso(now_datetime()), "ergebnis": e["ergebnis"]}])[-20:])
	d.save(ignore_permissions=True)
	protokoll(None, "ident_ergebnis", "ident", d.name, f"Identitätsanbieter {dk.IDENT_ANBIETER[anbieter]['label']}: {dk.IDENT_ERGEBNIS_LABEL.get(e['ergebnis'])}")
	benachrichtigen(d.konto_id, "status", "Online-Identifizierung abgeschlossen", "Das Ergebnis liegt unserem Team vor. Die abschließende Prüfung erfolgt durch die Compliance.", link="/portal/verifizierung", objekt_art="kyc", objekt_id=d.name, mail=False)
	eintrag = _kyc_anhaengen({
		"quelle": f"Identitätsanbieter {dk.IDENT_ANBIETER[anbieter]['label']}", "art": "identitaet", "ergebnis": dk.IDENT_KYC_ERGEBNIS.get(e["ergebnis"], "hinweis"),
		"zusammenfassung": " · ".join(x for x in (dk.IDENT_ERGEBNIS_LABEL.get(e["ergebnis"]), e.get("verfahren"), e.get("grund")) if x),
		"externeId": e.get("externeId") or d.name, "rohdatenRef": f"Sitzung {d.name}", "daten": {"sitzung": d.name},
	}, konto_id=d.konto_id)
	if eintrag and eintrag.get("id"):
		d.db_set("kyc_eintrag_id", eintrag.get("id"))
	return 200, {"ok": True, "verarbeitet": True}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=120, seconds=60, ip_based=True)
def webhook_identitaet(anbieter=None, **_):
	"""EINZIGER Gast-Endpunkt der App: Ergebnis-Webhook des Identitätsanbieters. Prüft die HMAC-Signatur über den Roh-Body
	(zeitkonstant), antwortet ohne Details (401) bei falscher Signatur, ist idempotent (Ereignis-ID) und ändert nie den
	KYC-Status – das Ergebnis wird nur als Hinweis angehängt."""
	roh = frappe.request.get_data() if frappe.request else b""
	if len(roh or b"") > 256 * 1024:
		frappe.local.response.http_status_code = 413
		return {"ok": False}
	status, antwort = _webhook_verarbeiten(str(anbieter or "").lower(), lambda h: frappe.get_request_header(h), roh)
	if status != 200:
		frappe.local.response.http_status_code = status
	else:
		frappe.db.commit()  # Gast-Anfrage: Ergebnis sofort festschreiben
	return antwort


@frappe.whitelist(methods=["POST"])
def ident_demo_abschluss(sitzungId=None, ergebnis=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	k = _ident_konfig()
	if not k.demo:
		verboten("Nur im Demo-Betrieb verfügbar.")
	name = v.kennung(sitzungId)
	if not name or not frappe.db.exists(DT_IDENT, name) or frappe.db.get_value(DT_IDENT, name, "konto_id") != n.id:
		nicht_gefunden("Sitzung nicht gefunden.")
	if frappe.db.get_value(DT_IDENT, name, "status") != "ausstehend":
		konflikt("Diese Sitzung ist bereits abgeschlossen.")
	e = v.auswahl(ergebnis, ["bestanden", "pruefen", "abgelehnt", "abgebrochen"], "")
	if not e:
		ungueltig("Bitte ein Ergebnis wählen.")
	roh = _dump({"sitzungId": name, "externeId": f"DEMO-{name}", "ergebnis": e, "verfahren": "Simulation (Demo)", "ereignisId": f"demo-{name}-{e}"})
	kopfwerte = dk.webhook_signieren("demo", roh, k.geheimnis)
	status, antwort = _webhook_verarbeiten("demo", lambda h: kopfwerte.get(h.lower()), roh.encode())
	return {"ok": status == 200, **antwort}


@frappe.whitelist(methods=["POST"])
def mrz_pruefen(zeilen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	text = str(zeilen or "")[:400]
	if len("".join(text.split())) < 60:
		ungueltig("Bitte geben Sie alle Zeilen der maschinenlesbaren Zone ein.")
	if frappe.db.count(DT_IDENT, {"konto_id": n.id, "art": "mrz", "erstellt_am": (">=", now_datetime() - timedelta(hours=1))}) >= 20:
		frappe.throw("Zu viele Vorprüfungen – bitte später erneut versuchen.", frappe.ValidationError)
	fall = None
	try:
		from oekoinvest_app.plattform.kyc_kern import fall_suchen

		fall = fall_suchen(n.id, None)
	except ImportError:
		fall = None
	soll = {"vorname": n.vorname, "nachname": n.nachname}
	if fall:
		p = frappe.db.get_value("KYC Fall", fall, ["vorname", "nachname", "geburtsdatum", "person_json"], as_dict=True)
		if p:
			ausweis = ((_json(p.person_json, {}) or {}).get("ausweis") or {}).get("nummer") or ""
			soll = {"vorname": p.vorname or n.vorname, "nachname": p.nachname or n.nachname, "geburtsdatum": str(p.geburtsdatum or ""), "ausweisNummer": ausweis}
	r = dk.mrz_vorpruefung(text, soll)
	f = r["mrz"].get("felder") or {}
	d = frappe.get_doc({
		"doctype": DT_IDENT, "konto_id": n.id, "art": "mrz", "anbieter": "plattform", "status": r["ergebnis"], "erstellt_am": now_datetime(), "abgeschlossen_am": now_datetime(),
		"format": r["mrz"].get("format"), "dokumentart": f.get("dokumentart"), "ausstellerstaat": f.get("ausstellerstaat"), "gueltig_bis": f.get("gueltigBis"),
		"nummer_maskiert": dk.nummer_maskiert(f.get("dokumentnummer")), "pruefziffern": f"{sum(1 for x in r['mrz']['pruefungen'] if x['ok'])}/{len(r['mrz']['pruefungen'])}", "abgleich": _dump(r["abgleich"]),
	}).insert(ignore_permissions=True)
	protokoll(n, "mrz_vorpruefung", "ident", d.name, f"MRZ-Vorprüfung: {r['ergebnis']} ({d.pruefziffern} Prüfziffern)")
	eintrag = None
	if fall:
		eintrag = _kyc_anhaengen({
			"quelle": "MRZ-Vorprüfung (automatisch)", "art": "mrz", "ergebnis": {"plausibel": "ok", "ungueltig": "fehler"}.get(r["ergebnis"], "auffaellig"),
			"zusammenfassung": f"{r['ergebnis']} – {f.get('dokumentart') or 'Dokument'} {f.get('ausstellerstaat') or ''}, Nr. {d.nummer_maskiert}, gültig bis {f.get('gueltigBis') or '–'}. {' '.join(r['hinweise'])}".strip(),
			"externeId": d.name, "daten": {"format": d.format or "", "pruefziffern": d.pruefziffern, "gueltigBis": str(f.get("gueltigBis") or "")},
		}, fall_id=fall)
	return {**r, "kycVerknuepft": bool(eintrag), "hinweisKyc": "" if fall else "Sie haben noch keine Verifizierung begonnen."}


# ====================================================================== Register


def _register_demo(land):
	"""Demo-Register: ÖkoInvest GmbH (öffentliche Registerdaten) und fiktive Firmen mit Kennzeichen „(Demo)“."""
	daten = [
		{"land": "AT", "name": "ÖkoInvest GmbH", "nummer": "FN 541505g", "gericht": "Landesgericht Ried im Innkreis", "sitz": "Ostermiething", "rechtsform": "Gesellschaft mit beschränkter Haftung", "status": "aktiv"},
		{"land": "AT", "name": "Sonnenfeld Innviertel PV GmbH (Demo)", "nummer": "FN 999101x", "sitz": "Braunau am Inn", "rechtsform": "Gesellschaft mit beschränkter Haftung", "status": "aktiv"},
		{"land": "DE", "name": "Demo Capital GmbH (Demo)", "nummer": "HRB 999001", "gericht": "Amtsgericht München", "sitz": "München", "rechtsform": "Gesellschaft mit beschränkter Haftung", "status": "aktiv"},
		{"land": "DE", "name": "Insolvente Sonnen GmbH (Demo)", "nummer": "HRB 999666", "gericht": "Amtsgericht Leipzig", "sitz": "Leipzig", "rechtsform": "Gesellschaft mit beschränkter Haftung", "status": "in_liquidation"},
		{"land": "CH", "name": "Helvetia Solar Beteiligungen GmbH (Demo)", "nummer": "CHE-999.000.001", "sitz": "Zürich", "rechtsform": "Gesellschaft mit beschränkter Haftung", "status": "aktiv"},
	]
	return [x for x in daten if x["land"] == land]


def _zefix(pfad, body=None):
	import requests

	url = str(_conf("oekoinvest_zefix_url", "https://www.zefix.admin.ch/ZefixPublicREST/api/v1")).rstrip("/")
	auth = (_conf("oekoinvest_zefix_benutzer"), _conf("oekoinvest_zefix_passwort"))
	try:
		r = requests.post(url + pfad, json=body, auth=auth, timeout=TIMEOUT) if body is not None else requests.get(url + pfad, auth=auth, timeout=TIMEOUT)
		if r.status_code == 404:
			return None
		r.raise_for_status()
		return r.json()
	except requests.RequestException:
		frappe.log_error(title="Zefix: Abfrage fehlgeschlagen", message=pfad.split("?")[0])
		frappe.throw("Das Register ist derzeit nicht erreichbar. Bitte später erneut versuchen.", frappe.ValidationError)


def _zefix_firma(f):
	uid = str(f.get("uid") or "")
	if len(uid) == 12 and uid.startswith("CHE"):
		uid = f"CHE-{uid[3:6]}.{uid[6:9]}.{uid[9:12]}"
	a = f.get("address") or {}
	return {"name": f.get("name"), "nummer": uid, "sitz": f.get("legalSeat") or "", "rechtsform": ((f.get("legalForm") or {}).get("name") or {}).get("de", ""),
		"status": {"ACTIVE": "aktiv", "CANCELLED": "geloescht", "BEING_CANCELLED": "in_loeschung"}.get(f.get("status"), str(f.get("status") or "").lower()),
		"gegenstand": f.get("purpose") or "", "anschrift": " ".join(x for x in (a.get("street"), a.get("houseNumber"), a.get("swissZipCode"), a.get("city")) if x), "stand": f.get("sogcDate") or "",
		"stammkapital": f.get("capitalNominal"), "waehrung": f.get("capitalCurrency") or "CHF"}


def _vertrag(land, pfad):
	import requests

	schluessel = "firmenbuch" if land == "AT" else "handelsregister"
	url, key = _conf(f"oekoinvest_{schluessel}_api_url"), _conf(f"oekoinvest_{schluessel}_api_key")
	try:
		r = requests.get(str(url).rstrip("/") + pfad, headers={"Authorization": f"Bearer {key}"}, timeout=TIMEOUT)
		if r.status_code == 404:
			return None
		r.raise_for_status()
		return r.json()
	except requests.RequestException:
		frappe.log_error(title=f"Register {land}: Abfrage fehlgeschlagen", message=pfad.split("?")[0])
		frappe.throw("Das Register ist derzeit nicht erreichbar. Bitte später erneut versuchen.", frappe.ValidationError)


def _register_suchen(land, q):
	if land == "CH" and _conf("oekoinvest_zefix_benutzer") and _conf("oekoinvest_zefix_passwort"):
		j = _zefix("/company/search", {"name": q, "activeOnly": False}) or []
		return "zefix", [_zefix_firma(x) for x in j[:25]]
	if land in ("AT", "DE") and _conf(f"oekoinvest_{'firmenbuch' if land == 'AT' else 'handelsregister'}_api_url"):
		from urllib.parse import quote

		j = _vertrag(land, f"/suche?q={quote(q)}") or {}
		return ("firmenbuch" if land == "AT" else "handelsregister"), (j.get("treffer") or [])[:25]
	if not _demo_erlaubt():
		frappe.throw("Die Anbindung an dieses Register ist nicht konfiguriert.", frappe.ValidationError)
	treffer = [x for x in _register_demo(land) if dk.firma_normalisieren(q) in dk.firma_normalisieren(x["name"]) or dk.namens_aehnlichkeit(q, x["name"]) >= 0.45]
	return "demo", treffer


@frappe.whitelist(methods=["POST"])
def register_suche(land=None, q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "register", 1)
	land = v.auswahl(land, ["AT", "DE", "CH"], "")
	text = v.text(q, 120)
	if not land or len(text) < 2:
		ungueltig("Bitte Land und mindestens 2 Zeichen angeben.")
	quelle, treffer = _register_suchen(land, text)
	return {"land": land, "quelle": quelle, "treffer": treffer, "hinweis": "Demo-Daten – keine Live-Abfrage." if quelle == "demo" else ""}


def _auskunft_json(d):
	return {"id": d.name, "land": d.land, "nummer": d.nummer, "name": d.firma or "", "status": d.register_status or "nicht_gefunden", "quelle": d.quelle, "abrufAm": iso(d.abruf_am),
		"zweck": d.zweck or "", "kycFallId": d.kyc_fall_id or None, "von": name_von(d.von_id), "firma": _json(d.daten, None)}


@frappe.whitelist(methods=["POST"])
def register_abruf(land=None, nummer=None, kycFallId=None, zweck=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	recht_noetig(n, "register", 2)
	land = v.auswahl(land, ["AT", "DE", "CH"], "")
	ok, norm, fehler = dk.registernummer_pruefen(land, nummer)
	if not ok:
		ungueltig(fehler)
	fall_id = v.kennung(kycFallId) if kycFallId else None
	if kycFallId and not fall_id:
		ungueltig("Ungültige Kennung des KYC-Falls.")
	if fall_id and stufe(n, "compliance") < 2:
		verboten("Registerauszüge im KYC-Fall hinterlegt nur die Compliance.")
	if land == "CH" and _conf("oekoinvest_zefix_benutzer"):
		j = _zefix(f"/company/uid/{norm.replace('-', '').replace('.', '')}")
		firma, quelle = (_zefix_firma(j[0] if isinstance(j, list) and j else j) if j else None), "zefix"
	elif land in ("AT", "DE") and _conf(f"oekoinvest_{'firmenbuch' if land == 'AT' else 'handelsregister'}_api_url"):
		from urllib.parse import quote

		firma, quelle = _vertrag(land, f"/firma?nummer={quote(norm)}"), ("firmenbuch" if land == "AT" else "handelsregister")
	else:
		if not _demo_erlaubt():
			frappe.throw("Die Anbindung an dieses Register ist nicht konfiguriert.", frappe.ValidationError)
		firma, quelle = next((x for x in _register_demo(land) if x["nummer"].lower() == norm.lower()), None), "demo"
	d = frappe.get_doc({"doctype": DT_REG, "firma": (firma or {}).get("name") or "", "land": land, "nummer": norm, "register_status": (firma or {}).get("status") or "nicht_gefunden",
		"quelle": quelle, "abruf_am": now_datetime(), "von_id": n.id, "zweck": v.text(zweck, 160), "kyc_fall_id": fall_id, "daten": _dump(firma) if firma else None}).insert(ignore_permissions=True)
	protokoll(n, "register_abruf", "register", d.name, f"Registerabruf {dk.REGISTER_LAENDER[land]['register']} {norm} ({quelle})")
	if fall_id:
		kritisch = not firma or firma.get("status") in ("geloescht", "in_loeschung", "in_liquidation")
		e = _kyc_anhaengen({"quelle": dk.REGISTER_LAENDER[land]["register"] + (" (Demo)" if quelle == "demo" else ""), "art": "register", "ergebnis": "auffaellig" if kritisch else "ok",
			"zusammenfassung": f"{(firma or {}).get('name') or 'Keine Firma gefunden'} · {norm} · Status {(firma or {}).get('status') or '–'} · abgerufen {nowdate()}",
			"externeId": d.name, "rohdatenRef": f"/api/admin/register/{d.name}/pdf", "daten": {"nummer": norm, "quelle": quelle}}, fall_id=fall_id)
		if not e:
			nicht_gefunden("KYC-Fall nicht gefunden – der Abruf wurde gespeichert, aber nicht hinterlegt.")
	return {"auskunft": _auskunft_json(d)}


@frappe.whitelist(methods=["POST"])
def register_auskuenfte(q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "register", 1)
	such = v.text(q, 80).lower()
	liste = [frappe.get_doc(DT_REG, x) for x in frappe.get_all(DT_REG, pluck="name", order_by="abruf_am desc", limit_page_length=200)]
	return {"auskuenfte": [_auskunft_json(d) for d in liste if not such or such in f"{d.nummer} {d.firma}".lower()], "konfig": {"CH": "zefix" if _conf("oekoinvest_zefix_benutzer") else "demo", "AT": "firmenbuch" if _conf("oekoinvest_firmenbuch_api_url") else "demo", "DE": "handelsregister" if _conf("oekoinvest_handelsregister_api_url") else "demo"}}


@frappe.whitelist(methods=["POST"])
def register_auskunft(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "register", 1)
	name = v.kennung(id)
	if not name or not frappe.db.exists(DT_REG, name):
		nicht_gefunden("Registerauskunft nicht gefunden.")
	return _auskunft_json(frappe.get_doc(DT_REG, name))


# ====================================================================== Bonität


def _bonitaet_abrufen(name, land, registernummer):
	anbieter = str(_conf("oekoinvest_bonitaet_anbieter", "") or "").lower()
	if anbieter not in dk.BONITAET_ANBIETER:
		anbieter = "demo" if _demo_erlaubt() else ""
	if not anbieter:
		frappe.throw("Die Bonitätsauskunft ist nicht konfiguriert (Vertrag mit einer Auskunftei erforderlich).", frappe.ValidationError)
	if anbieter == "demo":
		r = dk.demo_auskunft(name, land)
	else:
		import requests

		try:
			resp = requests.post(str(_conf("oekoinvest_bonitaet_api_url")).rstrip("/") + "/auskunft", json={"land": land, "name": name, "registernummer": registernummer, "produkt": _conf("oekoinvest_bonitaet_produkt")},
				headers={"Authorization": f"Bearer {_conf('oekoinvest_bonitaet_api_key')}"}, timeout=20)
			resp.raise_for_status()
			r = resp.json()
		except requests.RequestException:
			frappe.log_error(title="Bonität: Abfrage fehlgeschlagen", message=f"Anbieter {anbieter}")
			frappe.throw("Die Auskunftei ist derzeit nicht erreichbar.", frappe.ValidationError)
	status = "keine_daten" if r.get("status") == "keine_daten" else "abgeschlossen"
	return anbieter, status, r


def _bon_json(d, voll=True):
	e = dk.bonitaet_einstellungen()
	ok, grund = dk.bonitaet_gueltig({"status": d.status, "auskunftAm": get_datetime(d.auskunft_am) if d.auskunft_am else None, "ampel": d.ampel, "freigabe": bool(d.freigabe_am)}, e)
	out = {"id": d.name, "subjekt": {"art": d.subjekt_art, "kontoId": d.subjekt_konto, "organisationId": d.subjekt_organisation, "name": d.subjekt_name, "land": d.land, "registernummer": d.registernummer},
		"anlass": d.anlass, "anlassLabel": dk.BONITAET_ANLAESSE.get(d.anlass, d.anlass), "status": d.status, "anbieter": d.anbieter, "anbieterLabel": dk.BONITAET_ANBIETER.get(d.anbieter, d.anbieter),
		"am": iso(d.creation), "auskunftAm": iso(d.auskunft_am), "von": name_von(d.von_id), "gueltig": ok, "gueltigGrund": grund, "informiertAm": iso(d.informiert_am), "demo": d.anbieter == "demo"}
	if voll:
		out.update({"ampel": d.ampel, "score": d.score, "skala": d.skala, "kreditlimit": d.kreditlimit, "waehrung": d.waehrung, "ausfallwahrscheinlichkeit": d.ausfallwahrscheinlichkeit,
			"zahlungsweise": d.zahlungsweise, "negativmerkmale": _json(d.negativmerkmale, []) or [], "referenz": d.referenz, "rechtsgrundlage": d.rechtsgrundlage,
			"freigabe": {"von": name_von(d.freigabe_von), "am": iso(d.freigabe_am), "begruendung": d.freigabe_begruendung} if d.freigabe_am else None})
	return out


@frappe.whitelist(methods=["POST"])
def bonitaet_uebersicht(q=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "bonitaet", 1)
	such = v.text(q, 80).lower()
	liste = [frappe.get_doc(DT_BON, x) for x in frappe.get_all(DT_BON, pluck="name", order_by="auskunft_am desc", limit_page_length=200)]
	offen, gesehen = [], set()
	for i in frappe.get_all("Plattform Interesse", filters={"status": ("in", ["nda_freigegeben", "loi_abgegeben"])}, fields=["name", "projekt_id", "investor_id", "organisation_id"], limit_page_length=500):
		schl = i.organisation_id or i.investor_id
		if schl in gesehen:
			continue
		f = dk.bonitaet_freigabe("loi", i.investor_id, i.organisation_id or None)
		if not f["aktiv"] or f["ok"]:
			continue
		gesehen.add(schl)
		nm = frappe.db.get_value("Plattform Organisation", i.organisation_id, "titel") if i.organisation_id else None
		offen.append({"interesseId": i.name, "projektId": i.projekt_id, "subjekt": {"art": "organisation" if i.organisation_id else "konto", "id": schl, "name": nm or (frappe.db.get_value("Plattform Konto", i.investor_id, "firma") or name_von(i.investor_id))}, "grund": f["grund"]})
	e = dk.bonitaet_einstellungen()
	kandidaten = [{"art": "organisation", "id": o.name, "name": o.titel or o.name} for o in frappe.get_all("Plattform Organisation", fields=["name", "titel"], limit_page_length=200)]
	kandidaten += [{"art": "konto", "id": k.name, "name": k.firma or name_von(k.name)} for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1, "firma": ("is", "set")}, fields=["name", "firma"], limit_page_length=200)]
	return {
		"auskuenfte": [_bon_json(d) for d in liste if not such or such in f"{d.subjekt_name} {d.name}".lower()], "offen": offen, "kandidaten": kandidaten,
		"einstellungen": {**e, "geltungWirksam": dk.bonitaet_geltung(e, _conf("oekoinvest_bonitaet_vor_loi"), not frappe.conf.get("developer_mode")), "pilotKonten": [{"id": x, "name": name_von(x) or x} for x in e.get("pilotKonten") or []]},
		"konfig": {"anbieter": _conf("oekoinvest_bonitaet_anbieter") or ("demo" if _demo_erlaubt() else ""), "label": dk.BONITAET_ANBIETER.get(_conf("oekoinvest_bonitaet_anbieter") or "demo", ""), "aktiv": bool(_conf("oekoinvest_bonitaet_api_url")) or _demo_erlaubt(), "demo": not _conf("oekoinvest_bonitaet_anbieter")},
		"rechtsgrundlagen": dk.BONITAET_RECHTSGRUNDLAGEN, "anlaesse": dk.BONITAET_ANLAESSE, "schreiben": stufe(n, "bonitaet") >= 2,
	}


@frappe.whitelist(methods=["POST"])
def bonitaet_beauftragen(subjekt=None, land=None, registernummer=None, name=None, anlass=None, rechtsgrundlage=None, interesseId=None, informieren=True, als_benutzer=None, **_):  # noqa: N803
	n = nutzer(als_benutzer)
	recht_noetig(n, "bonitaet", 2)
	subjekt = subjekt if isinstance(subjekt, dict) else (_json(subjekt, {}) or {})
	art = v.auswahl(subjekt.get("art"), ["organisation", "konto"], "")
	sid = v.kennung(subjekt.get("id"))
	if not art or not sid:
		ungueltig("Bitte wählen Sie Organisation oder Konto.")
	if art == "organisation":
		if not frappe.db.exists("Plattform Organisation", sid):
			nicht_gefunden("Organisation nicht gefunden.")
		sname = frappe.db.get_value("Plattform Organisation", sid, "titel") or sid
		informieren_an = frappe.get_all("Plattform Mitgliedschaft", filters={"organisation_id": sid, "rolle": ("in", ["inhaber", "admin"])}, pluck="nutzer_id")
	else:
		if not frappe.db.exists("Plattform Konto", sid):
			nicht_gefunden("Konto nicht gefunden.")
		sname = frappe.db.get_value("Plattform Konto", sid, "firma") or name_von(sid)
		informieren_an = [sid]
	sname = v.text(name, 160) or sname
	land = v.auswahl(land, ["AT", "DE", "CH"], "AT")
	anbieter, status, r = _bonitaet_abrufen(sname, land, v.text(registernummer, 40))
	rg = v.auswahl(rechtsgrundlage, list(dk.BONITAET_RECHTSGRUNDLAGEN), "berechtigtes_interesse")
	d = frappe.get_doc({
		"doctype": DT_BON, "subjekt_art": art, "subjekt_konto": sid if art == "konto" else None, "subjekt_organisation": sid if art == "organisation" else None, "subjekt_name": sname,
		"land": land, "registernummer": v.text(registernummer, 40), "anlass": v.auswahl(anlass, list(dk.BONITAET_ANLAESSE), "loi"), "rechtsgrundlage": rg,
		"interesse_id": v.kennung(interesseId) or None, "status": status, "anbieter": anbieter, "score": r.get("score"), "skala": r.get("skala"), "ampel": "unbekannt" if status == "keine_daten" else dk.bonitaet_ampel(anbieter, r.get("score")),
		"kreditlimit": r.get("kreditlimit"), "waehrung": r.get("waehrung") or "EUR", "ausfallwahrscheinlichkeit": r.get("ausfallwahrscheinlichkeit"), "zahlungsweise": v.text(r.get("zahlungsweise"), 160),
		"negativmerkmale": _dump((r.get("negativmerkmale") or [])[:10]), "referenz": v.text(r.get("referenz"), 80), "auskunft_am": now_datetime(), "von_id": n.id,
	}).insert(ignore_permissions=True)
	protokoll(n, "bonitaet_auskunft", "bonitaet", d.name, f"Bonitätsauskunft {dk.BONITAET_ANBIETER[anbieter]} zu {sname} eingeholt ({dk.BONITAET_ANLAESSE.get(d.anlass)})")
	if informieren not in (False, 0, "0", "false"):
		text = dk.bonitaet_information(dk.BONITAET_ANBIETER[anbieter], sname, rg)
		for k in informieren_an:
			benachrichtigen(k, "status", "Information: Bonitätsauskunft eingeholt", text[:300], link="/portal/profil", objekt_art="bonitaet", objekt_id=d.name, mail_text=text, mail_betreff="Information zur Bonitätsauskunft – ÖkoInvest")
		d.db_set("informiert_am", now_datetime())
	return {"auskunft": _bon_json(d)}


@frappe.whitelist(methods=["POST"])
def bonitaet_detail(id=None, ip=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "bonitaet", 1)
	name = v.kennung(id)
	if not name or not frappe.db.exists(DT_BON, name):
		nicht_gefunden("Bonitätsauskunft nicht gefunden.")
	protokoll(n, "bonitaet_einsicht", "bonitaet", name, "Bonitätsauskunft eingesehen", ip or "")
	zugriffe = frappe.get_all("Plattform Aktivitaet", filters={"objekt_art": "bonitaet", "objekt_id": name}, fields=["am", "aktion", "text", "nutzer_id"], order_by="am desc", limit_page_length=30)
	return {"auskunft": _bon_json(frappe.get_doc(DT_BON, name)), "zugriffe": [{"am": iso(z.am), "aktion": z.aktion, "text": z.text, "nutzer": name_von(z.nutzer_id) or "System"} for z in zugriffe]}


@frappe.whitelist(methods=["POST"])
def bonitaet_freigeben(id=None, begruendung=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "bonitaet", 2)
	b = v.mehrzeilig(begruendung, 1000)
	v.pflicht(len(b) >= 10, "Bitte begründen Sie die Freigabe (mindestens 10 Zeichen).")
	name = v.kennung(id)
	if not name or not frappe.db.exists(DT_BON, name):
		nicht_gefunden("Bonitätsauskunft nicht gefunden.")
	d = frappe.get_doc(DT_BON, name)
	if d.freigabe_am:
		konflikt("Die Auskunft ist bereits freigegeben.")
	d.db_set({"freigabe_am": now_datetime(), "freigabe_von": n.id, "freigabe_begruendung": b})
	protokoll(n, "bonitaet_freigabe", "bonitaet", name, "Bonitätsauskunft manuell freigegeben (Begründung dokumentiert)")
	return {"auskunft": _bon_json(frappe.get_doc(DT_BON, name))}


@frappe.whitelist(methods=["POST"])
def bonitaet_einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "bonitaet", 2)
	daten = daten if isinstance(daten, dict) else (_json(daten, {}) or {})
	e = dk.bonitaet_einstellungen()
	if "geltung" in daten:
		e["geltung"] = None if not daten.get("geltung") else v.auswahl(daten.get("geltung"), ["alle", "firmen", "pilot", "aus"], e.get("geltung"))
	if "gueltigTage" in daten:
		e["gueltigTage"] = v.zahl(daten.get("gueltigTage"), min=7, max=730) or e["gueltigTage"]
	if "rotSperrt" in daten:
		e["rotSperrt"] = v.wahr(daten.get("rotSperrt"))
	if isinstance(daten.get("pilotKonto"), dict):
		k = v.kennung(daten["pilotKonto"].get("id"))
		if not k or not frappe.db.exists("Plattform Konto", k):
			nicht_gefunden("Konto nicht gefunden.")
		s = set(e.get("pilotKonten") or [])
		(s.add if daten["pilotKonto"].get("an") else s.discard)(k)
		e["pilotKonten"] = sorted(s)
	frappe.db.set_default("oekoinvest_bonitaet_einstellungen", _dump(e))
	protokoll(n, "bonitaet_einstellungen", "bonitaet", "einstellungen", f"Bonität vor LOI: Geltung {e.get('geltung') or 'Standard'}, gültig {e['gueltigTage']} Tage")
	return {"einstellungen": {**e, "geltungWirksam": dk.bonitaet_geltung(e, _conf("oekoinvest_bonitaet_vor_loi"), not frappe.conf.get("developer_mode"))}}


@frappe.whitelist(methods=["POST"])
def bonitaet_status(kontoId=None, organisationId=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	recht_noetig(n, "interessen", 1)
	f = dk.bonitaet_freigabe("loi", v.kennung(kontoId) or None, v.kennung(organisationId) or None)
	return {"pflicht": f["aktiv"], "ok": f["ok"], "grund": f.get("grund", ""), "firma": dk.ist_firma(v.kennung(kontoId) or None, v.kennung(organisationId) or None), "auskunftId": f.get("auskunftId") if stufe(n, "bonitaet") >= 1 else None}


# ====================================================================== Gesellschaften


def _schritte_json(g):
	return [{"schluessel": s.schluessel, "reihenfolge": s.reihenfolge, "gruppe": s.gruppe, "label": s.label, "pflicht": bool(s.pflicht), "feld": s.feld or None,
		"frist": {"nach": s.frist_nach, "tage": s.frist_tage} if s.frist_nach else None, "status": s.status, "datum": str(s.datum) if s.datum else None, "notiz": s.notiz or "", "wert": s.wert or ""} for s in g.schritte]


def _ges_json(g, detail=False):
	rf = dk.RECHTSFORMEN.get(g.rechtsform, {})
	schritte = _schritte_json(g)
	status = dk.status_aus_schritten(g.status, schritte)
	pflicht = [s for s in schritte if s["pflicht"]]
	erledigt = sum(1 for s in pflicht if s["status"] in ("erledigt", "entfaellt"))
	out = {"id": g.name, "name": g.firma, "rechtsform": g.rechtsform, "rechtsformLabel": rf.get("label", g.rechtsform), "land": g.land, "sitz": g.sitz or "", "status": status,
		"statusLabel": {"entwurf": "Entwurf", "in_gruendung": "In Gründung", "eingetragen": "Eingetragen", "aktiv": "Aktiv", "bestand": "Bestand", "aufgeloest": "Aufgelöst"}.get(status, status),
		"registernummer": g.registernummer or "", "fortschritt": {"erledigt": erledigt, "gesamt": len(pflicht), "quote": round(erledigt / len(pflicht) * 100) if pflicht else 0},
		"fristen": dk.fristen_fuer(g.land, status, schritte, g.bilanzstichtag or "12-31", getdate(), g.gegruendet_am), "herkunft": g.herkunft or "assistent", "demo": bool(g.demo),
		"gesellschafter": _json(g.gesellschafter, []) or [], "projekt": _json(g.projekt_json, None), "erstelltAm": iso(g.creation), "geaendertAm": iso(g.modified)}
	if not detail:
		return out
	out.update({"anschrift": g.anschrift or "", "bundesland": g.bundesland or "", "stammkapital": g.stammkapital, "einzahlung": g.einzahlung, "waehrung": g.waehrung or rf.get("waehrung", "EUR"),
		"geschaeftsfuehrung": _json(g.geschaeftsfuehrung, []) or [], "komplementaer": _json(g.komplementaer, None), "gegenstand": g.gegenstand or "", "bilanzstichtag": g.bilanzstichtag or "12-31",
		"uid": g.uid or "", "steuernummer": g.steuernummer or "", "gericht": g.gericht or "", "musterprotokoll": bool(g.musterprotokoll), "namenspruefung": _json(g.namenspruefung, None),
		"schritte": schritte, "gegruendetAm": str(g.gegruendet_am or "") or None, "eingetragenAm": str(g.eingetragen_am or "") or None, "rechtsformInfo": rf,
		"erpnext": {"installiert": "erpnext" in frappe.get_installed_apps(), "company": g.erp_company or None, "hinweis": "" if g.erp_company else "Company in ERPNext anlegen (nur wenn installiert und oekoinvest_erpnext_gesellschaften aktiv)."},
		"verlauf": list(reversed((_json(g.verlauf, []) or [])[-40:])), "dokumente": []})
	return out


def _verlauf(g, n, text):
	vl = (_json(g.verlauf, []) or []) + [{"am": iso(now_datetime()), "vonId": n.id if n else None, "von": name_von(n.id) if n else "System", "text": v.text(text, 300)}]
	g.verlauf = _dump(vl[-200:])


@frappe.whitelist(methods=["POST"])
def gesellschaften_liste(q=None, status=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 1)
	alle = [_ges_json(frappe.get_doc(DT_GES, x)) for x in frappe.get_all(DT_GES, pluck="name", order_by="modified desc", limit_page_length=500)]
	such = v.text(q, 80).lower()
	liste = [g for g in alle if (not such or such in f"{g['name']} {g['registernummer']} {g['sitz']}".lower()) and (not status or g["status"] == status)]
	heute, in60 = nowdate(), str(add_days(nowdate(), 60))
	fristen = sorted([{**f, "gesellschaftId": g["id"], "gesellschaft": g["name"], "ueberfaellig": f["faellig"] < heute} for g in alle for f in g["fristen"] if not f["erledigt"] and f["faellig"] <= in60], key=lambda x: x["faellig"])
	knoten = [{"id": g["id"], "name": g["name"], "status": g["status"], "land": g["land"], "registernummer": g["registernummer"]} for g in alle if g["status"] != "aufgeloest"]
	ids = {k["id"] for k in knoten}
	kanten = [{"von": x.get("gesellschaftId"), "nach": g["id"], "anteil": x.get("anteil") or 0} for g in alle for x in g["gesellschafter"] if x.get("gesellschaftId") in ids]
	extern = [{"nach": g["id"], "name": x.get("name"), "anteil": x.get("anteil") or 0} for g in alle for x in g["gesellschafter"] if not x.get("gesellschaftId")]
	return {"gesellschaften": liste, "organigramm": {"gruppe": "ÖKOVOLT Gruppe", "knoten": knoten, "kanten": kanten, "extern": extern}, "fristen": fristen,
		"kennzahlen": {"gesamt": len(alle), "inGruendung": sum(1 for g in alle if g["status"] in ("entwurf", "in_gruendung", "eingetragen")), "aktiv": sum(1 for g in alle if g["status"] in ("aktiv", "bestand")), "fristen": len(fristen), "ueberfaellig": sum(1 for f in fristen if f["ueberfaellig"])},
		"schreiben": stufe(n, "gesellschaften") >= 2}


@frappe.whitelist(methods=["POST"])
def gesellschaft_auswahl(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 1)
	projekte = []
	if frappe.db.exists("DocType", "Plattform Entwicklungsprojekt"):
		verkn = dict(frappe.get_all(DT_GES, filters={"entwicklungsprojekt": ("is", "set"), "status": ("!=", "aufgeloest")}, fields=["entwicklungsprojekt", "name"], as_list=True))
		for p in frappe.get_all("Plattform Entwicklungsprojekt", filters={"status": ("!=", "abgebrochen")}, fields=["name", "titel", "typ", "land", "bundesland", "gemeinde", "mwp", "status"], limit_page_length=500):
			projekte.append({"id": p.name, "titel": p.titel, "typ": p.typ, "land": p.land, "bundesland": p.bundesland, "gemeinde": p.gemeinde, "mwp": p.mwp, "statusLabel": p.status, "gesellschaftId": verkn.get(p.name)})
	gruppe = [{"id": g.name, "name": g.firma, "registernummer": g.registernummer or "", "sitz": g.sitz or "", "land": g.land} for g in frappe.get_all(DT_GES, filters={"status": ("in", ["bestand", "aktiv", "eingetragen"])}, fields=["name", "firma", "registernummer", "sitz", "land"])]
	return {"projekte": projekte, "gruppe": gruppe, "rechtsformen": dk.RECHTSFORMEN, "geschaeftsfuehrung": [x.strip() for x in str(frappe.conf.get("oekoinvest_geschaeftsfuehrung") or "Andreas Wegscheider, Manuel Thaler").split(",")]}


@frappe.whitelist(methods=["POST"])
def gesellschaft_namen_pruefen(rechtsform=None, name=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 1)
	rf = dk.RECHTSFORMEN.get(rechtsform)
	if not rf:
		ungueltig("Bitte wählen Sie eine Rechtsform.")
	text = v.text(name, 160)
	import re

	kern_ = re.sub(r"\b(GmbH\s?&\s?Co\.?\s?KG|GmbH|UG \(haftungsbeschränkt\)|Sàrl|Sagl)\b", "", text, flags=re.I).strip()
	quelle, treffer, hinweis = "demo", [], ""
	if len(kern_) >= 2:
		try:
			quelle, treffer = _register_suchen(rf["land"], kern_)
		except frappe.ValidationError as e:
			quelle, hinweis = "fehler", str(e)
	eigene = [{"name": g.firma, "nummer": g.registernummer or g.name, "status": g.status} for g in frappe.get_all(DT_GES, filters={"land": rf["land"], "status": ("!=", "aufgeloest")}, fields=["name", "firma", "registernummer", "status"])]
	return {**dk.firmenname_pruefen(text, rechtsform, list(treffer) + eigene), "quelle": quelle, "hinweisQuelle": hinweis, "am": iso(now_datetime())}


def _ges_bereinigen(liste):
	aus = []
	for x in (liste if isinstance(liste, list) else [])[:20]:
		art = v.auswahl(x.get("art"), ["gruppe", "person", "extern"], "extern")
		gid = v.kennung(x.get("gesellschaftId")) if art == "gruppe" else None
		if art == "gruppe" and (not gid or not frappe.db.exists(DT_GES, gid)):
			ungueltig("Gruppengesellschaft nicht gefunden.")
		grp = frappe.db.get_value(DT_GES, gid, ["firma", "registernummer", "sitz"], as_dict=True) if gid else None
		aus.append({"art": art, "gesellschaftId": gid, "name": (grp.firma if grp else v.text(x.get("name"), 160)), "register": (grp.registernummer if grp else v.text(x.get("register"), 60)),
			"sitz": (grp.sitz if grp else v.text(x.get("sitz"), 80)), "anteil": v.zahl(x.get("anteil"), min=0, max=100) or 0, "einlage": v.zahl(x.get("einlage"), min=0, max=1e10) or 0,
			"geburtsdatum": str(x.get("geburtsdatum") or "")[:10] if art == "person" else "", "wohnsitzLand": v.text(x.get("wohnsitzLand"), 2).upper() if art == "person" else ""})
	return aus


def _gf_bereinigen(liste):
	return [{"name": v.text(x.get("name"), 160), "geburtsdatum": str(x.get("geburtsdatum") or "")[:10], "anschrift": v.text(x.get("anschrift"), 200), "wohnsitzLand": v.text(x.get("wohnsitzLand"), 2).upper()}
		for x in (liste if isinstance(liste, list) else [])[:6] if v.text(x.get("name"), 160)]


@frappe.whitelist(methods=["POST"])
def gesellschaft_anlegen(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 2)
	d = daten if isinstance(daten, dict) else (_json(daten, {}) or {})
	rechtsform = v.auswahl(d.get("rechtsform"), list(dk.RECHTSFORMEN), "")
	rf = dk.RECHTSFORMEN.get(rechtsform)
	if not rf:
		ungueltig("Bitte wählen Sie Land und Rechtsform.")
	projekt = None
	if d.get("entwicklungProjektId"):
		pid = v.kennung(d.get("entwicklungProjektId"))
		if not pid or not frappe.db.exists("Plattform Entwicklungsprojekt", pid):
			nicht_gefunden("Entwicklungsprojekt nicht gefunden.")
		if frappe.db.exists(DT_GES, {"entwicklungsprojekt": pid, "status": ("!=", "aufgeloest")}):
			konflikt("Für dieses Entwicklungsprojekt gibt es bereits eine Projektgesellschaft.")
		p = frappe.db.get_value("Plattform Entwicklungsprojekt", pid, ["name", "titel", "typ", "land", "gemeinde", "mwp"], as_dict=True)
		projekt = {"id": p.name, "titel": p.titel, "typ": p.typ, "land": p.land, "gemeinde": p.gemeinde or "", "mwp": p.mwp}
	g = {
		"rechtsform": rechtsform, "name": v.text(d.get("name"), 160), "sitz": v.text(d.get("sitz"), 80), "stammkapital": v.zahl(d.get("stammkapital"), min=0, max=1e10) or rf["kapital"],
		"einzahlung": v.zahl(d.get("einzahlung"), min=0, max=1e10) if d.get("einzahlung") is not None else rf["einzahlung"], "gesellschafter": _ges_bereinigen(d.get("gesellschafter")),
		"geschaeftsfuehrung": _gf_bereinigen(d.get("geschaeftsfuehrung")), "komplementaer": {"name": v.text((d.get("komplementaer") or {}).get("name"), 160), "register": v.text((d.get("komplementaer") or {}).get("register"), 60)} if rf.get("komplementaer") else None,
	}
	if not rf["kapital"]:
		g["stammkapital"] = sum(x["einlage"] for x in g["gesellschafter"])
	fehler = dk.gruendung_pruefen(g)
	if fehler:
		ungueltig(" ".join(fehler))
	np = None
	if d.get("namenspruefung") is not None:
		np = gesellschaft_namen_pruefen(rechtsform=rechtsform, name=g["name"], als_benutzer=als_benutzer)
		if np["ergebnis"] == "belegt":
			konflikt("Der Firmenname ist bereits vergeben – bitte einen anderen Namen wählen.")
	schritte = dk.schritte_fuer(rechtsform)
	if np and np["ergebnis"] in ("frei", "aehnlich"):
		schritte[0].update(status="erledigt", datum=nowdate(), notiz=f"Registersuche: {np['ergebnis']}")
	doc = frappe.get_doc({
		"doctype": DT_GES, "firma": g["name"], "rechtsform": rechtsform, "land": rf["land"], "status": "entwurf", "herkunft": "assistent", "sitz": g["sitz"], "bundesland": v.text(d.get("bundesland"), 60),
		"anschrift": v.text(d.get("anschrift"), 200), "stammkapital": g["stammkapital"], "einzahlung": g["einzahlung"], "waehrung": rf["waehrung"],
		"bilanzstichtag": d.get("bilanzstichtag") if v.text(d.get("bilanzstichtag"), 5) and len(str(d.get("bilanzstichtag"))) == 5 else "12-31",
		"musterprotokoll": 1 if v.wahr(d.get("musterprotokoll")) and dk.musterprotokoll_moeglich(g) else 0, "gesellschafter": _dump(g["gesellschafter"]), "geschaeftsfuehrung": _dump(g["geschaeftsfuehrung"]),
		"komplementaer": _dump(g["komplementaer"]) if g["komplementaer"] else None, "gegenstand": v.mehrzeilig(d.get("gegenstand"), 3000) or dk.gegenstand_vorlage(rf["land"], (projekt or {}).get("typ"), (projekt or {}).get("gemeinde")),
		"entwicklungsprojekt": (projekt or {}).get("id"), "projekt_json": _dump(projekt) if projekt else None, "namenspruefung": _dump({k: np[k] for k in ("ergebnis", "am", "quelle", "aehnlich", "hinweise")}) if np else None, "erstellt_von": n.id,
		"schritte": [{"schluessel": s["schluessel"], "reihenfolge": s["reihenfolge"], "gruppe": s["gruppe"], "label": s["label"], "pflicht": 1 if s["pflicht"] else 0, "feld": s["feld"], "frist_nach": (s["frist"] or {}).get("nach"), "frist_tage": (s["frist"] or {}).get("tage"), "status": s["status"], "datum": s["datum"], "notiz": s["notiz"]} for s in schritte],
	})
	_verlauf(doc, n, f"Gründung angelegt ({rf['label']})" + (f" aus Entwicklungsprojekt {projekt['id']}" if projekt else ""))
	doc.insert(ignore_permissions=True)
	protokoll(n, "gesellschaft_anlegen", "gesellschaft", doc.name, f"Projektgesellschaft {doc.firma} angelegt")
	return {"gesellschaft": _ges_json(doc, detail=True)}


def _ges_laden(id_):
	name = v.kennung(id_)
	if not name or not frappe.db.exists(DT_GES, name):
		nicht_gefunden("Gesellschaft nicht gefunden.")
	return frappe.get_doc(DT_GES, name)


@frappe.whitelist(methods=["POST"])
def gesellschaft_holen(id=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 1)
	return {"gesellschaft": _ges_json(_ges_laden(id), detail=True), "schreiben": stufe(n, "gesellschaften") >= 2}


@frappe.whitelist(methods=["POST"])
def gesellschaft_aendern(id=None, daten=None, als_benutzer=None):  # noqa: A002
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 2)
	g = _ges_laden(id)
	d = daten if isinstance(daten, dict) else (_json(daten, {}) or {})
	if g.herkunft == "stammdaten":
		konflikt("Bestandsgesellschaften werden in den Stammdaten gepflegt.")
	entwurf = dk.status_aus_schritten(g.status, _schritte_json(g)) == "entwurf"
	if not entwurf and any(k in d for k in ("name", "stammkapital", "gesellschafter", "geschaeftsfuehrung", "gegenstand")):
		konflikt("Nach der Beurkundung sind Änderungen an Firma, Kapital, Gesellschaftern oder Gegenstand nur über das Notariat möglich.")
	if entwurf:
		for k, f in (("name", "firma"), ("sitz", "sitz"), ("anschrift", "anschrift")):
			if k in d:
				g.set(f, v.text(d.get(k), 200))
		if "gesellschafter" in d:
			g.gesellschafter = _dump(_ges_bereinigen(d.get("gesellschafter")))
		if "geschaeftsfuehrung" in d:
			g.geschaeftsfuehrung = _dump(_gf_bereinigen(d.get("geschaeftsfuehrung")))
		if "gegenstand" in d:
			g.gegenstand = v.mehrzeilig(d.get("gegenstand"), 3000)
	if "bilanzstichtag" in d and len(str(d.get("bilanzstichtag") or "")) == 5:
		g.bilanzstichtag = str(d.get("bilanzstichtag"))
	if "steuernummer" in d:
		g.steuernummer = v.text(d.get("steuernummer"), 40)
	if d.get("status") == "aufgeloest":
		g.status = "aufgeloest"
	_verlauf(g, n, "Stammdaten geändert")
	g.save(ignore_permissions=True)
	protokoll(n, "gesellschaft_aendern", "gesellschaft", g.name, "Stammdaten geändert")
	return {"gesellschaft": _ges_json(g, detail=True)}


@frappe.whitelist(methods=["POST"])
def gesellschaft_schritt(id=None, daten=None, als_benutzer=None):  # noqa: A002
	import re

	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 2)
	g = _ges_laden(id)
	d = daten if isinstance(daten, dict) else (_json(daten, {}) or {})
	if g.status == "aufgeloest":
		konflikt("Die Gesellschaft ist aufgelöst.")
	s = next((x for x in g.schritte if x.schluessel == d.get("schluessel")), None)
	if not s:
		nicht_gefunden("Schritt nicht gefunden.")
	status = v.auswahl(d.get("status"), ["offen", "in_arbeit", "erledigt", "entfaellt"], "")
	if not status:
		ungueltig("Ungültiger Status.")
	if status == "entfaellt" and s.pflicht:
		ungueltig("Pflichtschritte können nicht entfallen.")
	datum = str(d.get("datum") or "")[:10] if re.match(r"^\d{4}-\d{2}-\d{2}$", str(d.get("datum") or "")[:10]) else nowdate()
	rf = dk.RECHTSFORMEN[g.rechtsform]
	if status == "erledigt":
		fehlt = [k for k in dk.VORAUSSETZUNG.get(s.schluessel, []) if any(x.schluessel == k and x.status not in ("erledigt", "entfaellt") for x in g.schritte)]
		if fehlt:
			konflikt("Vorher erledigen: " + " · ".join(x.label for x in g.schritte if x.schluessel in fehlt))
		if s.feld == "registernummer":
			ok, norm, fehler = dk.registernummer_pruefen(rf["land"], d.get("wert"))
			if not ok:
				ungueltig(f"Registernummer: {fehler}")
			if g.rechtsform == "de_gmbh_co_kg" and not norm.upper().startswith("HRA"):
				ungueltig("Eine KG wird im Handelsregister Abteilung A (HRA) eingetragen.")
			if g.rechtsform in ("de_gmbh", "de_ug") and not norm.upper().startswith("HRB"):
				ungueltig("Eine GmbH wird im Handelsregister Abteilung B (HRB) eingetragen.")
			g.registernummer, g.eingetragen_am, s.wert = norm, datum, norm
		elif s.feld == "betrag":
			b = v.zahl(d.get("wert"), min=0, max=1e10)
			if b is None or b < rf["einzahlung"]:
				ungueltig(f"Eingezahlt werden müssen mindestens {rf['einzahlung']} {rf['waehrung']}.")
			s.wert = str(b)
		elif s.feld == "uid":
			u = re.sub(r"\s", "", v.text(d.get("wert"), 40).upper())
			muster = {"AT": r"^ATU\d{8}$", "DE": r"^DE\d{9}$", "CH": r"^CHE-?\d{3}\.?\d{3}\.?\d{3}(MWST)?$"}[rf["land"]]
			if u and not re.match(muster, u):
				ungueltig("Format der UID/USt-IdNr. nicht erkannt.")
			g.uid, s.wert = u, u
		elif s.feld == "termin":
			t = d.get("wert") if isinstance(d.get("wert"), dict) else {}
			if not re.match(r"^\d{4}-\d{2}-\d{2}", str(t.get("datum") or "")):
				ungueltig("Bitte geben Sie Datum und Notariat des Termins an.")
			s.wert = _dump({"datum": str(t.get("datum"))[:16], "notariat": v.text(t.get("notariat"), 120), "art": v.auswahl(t.get("art"), ["praesenz", "video"], "praesenz"), "ort": v.text(t.get("ort"), 120)})
		if s.schluessel == "beurkundet":
			g.gegruendet_am = datum
	s.status = status
	s.datum = None if status == "offen" else datum
	s.notiz = v.mehrzeilig(d.get("notiz") if d.get("notiz") is not None else s.notiz, 1000)
	s.von_id = n.id
	alt = g.status
	g.status = dk.status_aus_schritten(g.status, _schritte_json(g))
	_verlauf(g, n, f"{s.label}: {status}")
	g.save(ignore_permissions=True)
	protokoll(n, "gesellschaft_schritt", "gesellschaft", g.name, f"{s.label}: {status}")
	if alt != g.status:
		protokoll(n, "gesellschaft_status", "gesellschaft", g.name, f"{alt} → {g.status}")
	return {"gesellschaft": _ges_json(g, detail=True)}


@frappe.whitelist(methods=["POST"])
def gesellschaft_paketdaten(id=None, dok=None, als_benutzer=None):  # noqa: A002
	"""Daten für das Dokumentenpaket (die Website setzt das PDF; im Desk: Druckformat „Projektgesellschaft Gründungspaket“)."""
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 1)
	g = _ges_laden(id)
	if g.herkunft == "stammdaten":
		konflikt("Für Bestandsgesellschaften gibt es kein Gründungspaket.")
	protokoll(n, "gesellschaft_dokumente", "gesellschaft", g.name, f"Dokumentenpaket erzeugt{f' ({v.text(dok, 30)})' if dok else ''}")
	return _ges_json(g, detail=True)


@frappe.whitelist(methods=["POST"])
def gesellschaft_erp(id=None, als_benutzer=None):  # noqa: A002
	"""Company in ERPNext anlegen – nur wenn ERPNext installiert UND site_config oekoinvest_erpnext_gesellschaften = 1."""
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 2)
	g = _ges_laden(id)
	if "erpnext" not in frappe.get_installed_apps() or not cint(frappe.conf.get("oekoinvest_erpnext_gesellschaften")):
		frappe.throw("ERPNext ist nicht installiert bzw. die Anlage von Gesellschaften ist nicht aktiviert (site_config oekoinvest_erpnext_gesellschaften).", frappe.ValidationError)
	if g.erp_company:
		konflikt("Die Company ist bereits angelegt.")
	if not frappe.db.exists("Company", g.firma):
		import re

		abbr = "".join(w[0] for w in re.findall(r"[A-Za-zÄÖÜäöü]+", g.firma) if w.lower() not in ("gmbh", "co", "kg", "ug"))[:5].upper() or "SPV"
		frappe.get_doc({"doctype": "Company", "company_name": g.firma, "abbr": abbr, "default_currency": g.waehrung or "EUR", "country": {"AT": "Austria", "DE": "Germany", "CH": "Switzerland"}[g.land]}).insert(ignore_permissions=True)
	g.db_set("erp_company", g.firma)
	for s in g.schritte:
		if s.schluessel == "erp":
			s.db_set({"status": "erledigt", "datum": nowdate(), "von_id": n.id})
	protokoll(n, "gesellschaft_erp", "gesellschaft", g.name, f"ERPNext-Company {g.firma} angelegt")
	return {"company": g.firma}


def _fristen_melden(n=None):
	heute, in14 = nowdate(), str(add_days(nowdate(), 14))
	gemeldet = 0
	roh = frappe.db.get_default("oekoinvest_gesellschaft_fristen_gemeldet")
	bereits = set(_json(roh, []) or [])
	empfaenger = []
	from oekoinvest_app.plattform.kern import konto_json

	for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name", limit_page_length=0):
		kn = frappe._dict(konto_json(frappe.get_doc("Plattform Konto", k)))
		if ist_admin(kn) and stufe(kn, "gesellschaften") >= 2:
			empfaenger.append(k)
	for name in frappe.get_all(DT_GES, filters={"status": ("!=", "aufgeloest")}, pluck="name"):
		g = frappe.get_doc(DT_GES, name)
		for f in _ges_json(g)["fristen"]:
			if f["erledigt"] or f["faellig"] > in14:
				continue
			key = f"{g.name}:{f['art']}:{f.get('schritt') or ''}:{f['faellig']}"
			if key in bereits:
				continue
			bereits.add(key)
			for k in empfaenger:
				benachrichtigen(k, "aufgabe", f"Frist {'überschritten' if f['faellig'] < heute else 'fällig'}: {g.firma}", f"{f['label']} – fällig am {f['faellig']}", link=f"/portal/admin/gesellschaften/{g.name}", objekt_art="gesellschaft", objekt_id=g.name)
			gemeldet += 1
	frappe.db.set_default("oekoinvest_gesellschaft_fristen_gemeldet", _dump(sorted(bereits)[-2000:]))
	return {"gemeldet": gemeldet}


@frappe.whitelist(methods=["POST"])
def gesellschaft_fristen(als_benutzer=None):
	n = nutzer(als_benutzer)
	recht_noetig(n, "gesellschaften", 2)
	return _fristen_melden(n)


def gesellschaft_fristen_taeglich():
	"""Scheduler (hooks.py, täglich): fällige Fristen der Gesellschaften in die Glocke des Backoffice."""
	_fristen_melden(None)


def nicht_gast():
	"""Hilfsprüfung für Tests: alle Methoden außer webhook_identitaet verlangen den API-Nutzer."""
	if frappe.session.user == "Guest":
		nicht_angemeldet()
