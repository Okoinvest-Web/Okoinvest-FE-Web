# Copyright (c) 2026, ÖkoInvest GmbH
#
# Staatliche eID als Identifizierungs-Methoden: „ID Austria“ (AT, OIDC der ID Austria) und „Online-Ausweis“ (DE, eID-Service
# nach BSI TR-03130 mit OIDC-Schnittstelle). Vertrag: docs/EID.md, Referenz: src/lib/plattform/backend/demo/eid.js,
# Regeln: plattform/eid_kern.py. Aufruf ausschließlich über die Website (API-Nutzer + als_benutzer); KEIN Gast-Endpunkt –
# den Rücksprung vom Aussteller nimmt die Website entgegen (Sitzung + Browser-Bindung) und reicht state/code/bindung durch.
#
# Rechte: eigene Vorgänge (Person selbst); Einstellungen lesen = Compliance-Bereich ≥ 1, schreiben = Compliance.
# Das Ergebnis ändert den KYC-Status NIE, sondern hängt einen Hinweis (kyc_kern.ergebnis_anhaengen) an. Compliance-Regel
# „eID mit hohem Vertrauensniveau = Identität bestätigt“ (Standard aus) setzt nur das Kennzeichen identitaet_bestaetigt.
#
# site_config (Platzhalter in site_config.beispiel.json, Geheimnisse nur per bench set-config):
#   oekoinvest_eid_bpk_pepper (≥ 16 Zeichen) · oekoinvest_eid_at_umgebung (produktion|referenz) · oekoinvest_eid_at_client_id /
#   _client_secret / _loa_min / _redirect_uri / _issuer / _auth_url / _token_url / _jwks_url / _jwks / _algs ·
#   oekoinvest_eid_de_* (issuer Pflicht; claim_vorname/_nachname/_geburtsdatum/_pseudonym/_loa, loa_standard) ·
#   oekoinvest_eid_demo = 1 (Simulator auch ohne developer_mode, nur Test-Sites).
# Client-Secret, Pfeffer und Tokens erscheinen nie in Antworten, Protokollen oder Fehlermeldungen.

import json

import frappe
from frappe.utils import add_to_date, cint, get_datetime, now_datetime, nowdate
from frappe.utils.password import remove_encrypted_password, set_encrypted_password

from oekoinvest_app.plattform import eid_kern as ek
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.benachrichtigung import anlegen as benachrichtigen
from oekoinvest_app.plattform.kern import aus_json, ist_admin, iso, konflikt, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import stufe, unterrollen

DT = "Plattform eID Vorgang"
TIMEOUT = 15
EINSTELLUNG_REGEL = "oekoinvest_eid_hoch_bestaetigt"


def _conf(k):
	return frappe.conf.get(k)


def _demo_erlaubt():
	return bool(frappe.conf.get("developer_mode") or cint(frappe.conf.get("oekoinvest_dienste_demo")) or cint(frappe.conf.get("oekoinvest_eid_demo")))


def _konfig(methode):
	return ek.konfig(methode, _conf, demo_erlaubt=_demo_erlaubt(), produktion=not frappe.conf.get("developer_mode"))


def _regel():
	return bool(cint(frappe.db.get_default(EINSTELLUNG_REGEL) or 0))


def _ist_compliance(n):
	return ist_admin(n) and "compliance" in unterrollen(n) and stufe(n, "compliance") >= 2


def _compliance_lesen(n):
	return ist_admin(n) and stufe(n, "compliance") >= 1


def _nachweis(d):
	if d.status != "bestanden":
		return None
	return {"vorname": d.vorname, "nachname": d.nachname, "geburtsdatum": d.geburtsdatum, "vertrauensniveau": d.vertrauensniveau or "",
		"vertrauensniveauLabel": ek.LOA_LABEL.get(d.vertrauensniveau or "", "unbekannt"), "am": iso(d.abgeschlossen_am), "transaktionsId": d.transaktions_id,
		"identitaetBestaetigt": bool(d.identitaet_bestaetigt), "abgleich": aus_json(d.abgleich, None)}


def _ausgabe(d):
	return {"id": d.name, "methode": d.methode, "methodeLabel": ek.METHODEN.get(d.methode, {}).get("label", d.methode), "demo": bool(d.demo), "status": d.status,
		"erstelltAm": iso(d.erstellt_am), "abgeschlossenAm": iso(d.abgeschlossen_am), "grund": ek.PRUEF_GRUND.get(d.grund or "", d.grund or ""),
		"nachweis": _nachweis(d), "kycVerknuepft": bool(d.kyc_eintrag_id)}


def eid_nachweis(konto_id):
	"""Für andere Module (ohne Rechteprüfung): jüngster gültiger eID-Nachweis eines Kontos oder None."""
	name = frappe.db.get_value(DT, {"konto_id": konto_id, "status": "bestanden"}, "name", order_by="abgeschlossen_am desc")
	if not name:
		return None
	d = frappe.get_doc(DT, name)
	return {"methode": d.methode, "demo": bool(d.demo), **_nachweis(d)}


# ====================================================================== Status / Start


@frappe.whitelist(methods=["POST"])
def eid_status(als_benutzer=None):
	n = nutzer(als_benutzer)
	namen = frappe.get_all(DT, filters={"konto_id": n.id}, pluck="name", order_by="erstellt_am desc", limit_page_length=5)
	return {
		"methoden": ek.verfuegbar(_conf, demo_erlaubt=_demo_erlaubt(), produktion=not frappe.conf.get("developer_mode")),
		"vorgaenge": [_ausgabe(frappe.get_doc(DT, x)) for x in namen],
		"nachweis": eid_nachweis(n.id),
		"regel": {"hochBestaetigt": _regel()},
	}


def _endpunkte(k):
	"""Endpunkte ergänzen (Discovery nur, wenn nicht fest konfiguriert; Issuer muss übereinstimmen). 6 h Cache."""
	import requests

	if k["demo"] or (k["auth_url"] and k["token_url"] and (k["jwks_url"] or k["jwks_fest"])):
		return k
	url = f"{k['issuer'].rstrip('/')}/.well-known/openid-configuration"
	schluessel = f"oekoinvest_eid_discovery:{ek.sha256_hex(url)[:16]}"
	d = frappe.cache().get_value(schluessel)
	if not d:
		try:
			r = requests.get(url, timeout=TIMEOUT, allow_redirects=False)
			d = r.json() if r.status_code == 200 else None
		except (requests.RequestException, ValueError):
			d = None
		if not d or d.get("issuer") != k["issuer"]:
			frappe.throw("Die Metadaten des eID-Dienstes sind nicht abrufbar oder ungültig.", frappe.ValidationError)
		frappe.cache().set_value(schluessel, d, expires_in_sec=6 * 3600)
	return {**k, "auth_url": k["auth_url"] or d.get("authorization_endpoint"), "token_url": k["token_url"] or d.get("token_endpoint"), "jwks_url": k["jwks_url"] or d.get("jwks_uri")}


@frappe.whitelist(methods=["POST"])
def eid_starten(methode=None, basisUrl=None, als_benutzer=None):  # noqa: N803 – Name wie im Vertrag
	n = nutzer(als_benutzer)
	m = v.auswahl(methode, list(ek.METHODEN), "")
	if not m:
		ungueltig("Bitte wählen Sie ein eID-Verfahren.")
	k = _konfig(m)
	if not k or not k.get("aktiv"):
		frappe.throw(f"{ek.METHODEN[m]['label']} ist derzeit nicht verfügbar. Bitte wählen Sie ein anderes Verfahren.", frappe.ValidationError)
	if frappe.db.count(DT, {"konto_id": n.id, "erstellt_am": (">=", nowdate())}) >= 10:
		frappe.throw("Heute wurden bereits mehrere eID-Anmeldungen gestartet. Bitte versuchen Sie es morgen erneut.", frappe.ValidationError)
	k = _endpunkte(k)
	state, nonce, bindung, pkce = ek.zufall(), ek.zufall(), ek.zufall(), ek.pkce_paar()
	basis = (frappe.conf.get("plattform_basis_url") or str(basisUrl or "")).rstrip("/")
	redirect = ek.redirect_uri(k, basis)
	# ältere offene Vorgänge verfallen (nur der jüngste Rücksprung ist gültig)
	for alt in frappe.get_all(DT, filters={"konto_id": n.id, "status": "ausstehend"}, pluck="name"):
		frappe.db.set_value(DT, alt, {"status": "abgebrochen", "grund": "abgelaufen", "demo_daten": None})
		_geheimnisse_loeschen(alt)
	d = frappe.get_doc({
		"doctype": DT, "konto_id": n.id, "methode": m, "demo": 1 if k["demo"] else 0, "status": "ausstehend", "erstellt_am": now_datetime(),
		"ablauf_am": add_to_date(now_datetime(), minutes=ek.VORGANG_MINUTEN), "state_hash": ek.sha256_hex(state), "nonce_hash": ek.sha256_hex(nonce),
		"bindung_hash": ek.sha256_hex(bindung), "verifier": pkce["verifier"], "redirect": redirect,
	})
	d.insert(ignore_permissions=True)
	protokoll(n, "eid_start", "ident", d.name, f"eID-Anmeldung gestartet ({k['label']}{', DEMO' if k['demo'] else ''})")
	return {"vorgang": {"id": d.name, "methode": m, "demo": bool(k["demo"])}, "url": ek.autorisierungs_url(k, state, nonce, pkce["challenge"], redirect), "bindung": bindung}


# ====================================================================== Demo-Aussteller


def _kyc_person(konto_id, n=None):
	try:
		from oekoinvest_app.plattform.kyc_kern import DT_FALL, fall_suchen

		name = fall_suchen(konto_id, None)
		p = frappe.db.get_value(DT_FALL, name, ["vorname", "nachname", "geburtsdatum"], as_dict=True) if name else None
	except Exception:  # KYC-Modul fehlt/anders aufgebaut → ohne Vergleichsdaten
		p = None
	p = p or {}
	return {"vorname": p.get("vorname") or (n.vorname if n else ""), "nachname": p.get("nachname") or (n.nachname if n else ""), "geburtsdatum": str(p.get("geburtsdatum") or "")}


@frappe.whitelist(methods=["POST"])
def eid_demo_code(state=None, nonce=None, codeChallenge=None, auswahl=None, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	a = v.auswahl(auswahl, ["hoch", "substanziell", "abweichend", "abbrechen"], "")
	if not a:
		ungueltig("Bitte ein Ergebnis wählen.")
	st = str(state or "")[:200]
	name = frappe.db.get_value(DT, {"state_hash": ek.sha256_hex(st)}, "name") if st else None
	d = frappe.get_doc(DT, name) if name else None
	if not d or d.konto_id != n.id or not d.demo:
		verboten("Diese Demo-Anmeldung gehört nicht zu Ihrem Konto.")
	if d.status != "ausstehend":
		konflikt("Diese Anmeldung ist bereits abgeschlossen.")
	k = _konfig(d.methode)
	if not k or not k["demo"]:
		verboten("Nur im Demo-Betrieb verfügbar.")
	from urllib.parse import urlencode, urlsplit

	pfad = urlsplit(d.redirect).path or ek.REDIRECT_PFAD
	if a == "abbrechen":
		return {"url": f"{pfad}?{urlencode({'state': st, 'error': 'access_denied'})}"}
	person = {"vorname": "Erika", "nachname": "Mustermann", "geburtsdatum": "1964-08-12"} if a == "abweichend" else _kyc_person(n.id, n)
	jetzt = int(now_datetime().timestamp())
	niveau = "substantial" if a == "substanziell" else "high"
	claims = {"iss": k["issuer"], "aud": k["client_id"], "sub": ek.zufall(12), "iat": jetzt, "exp": jetzt + 300, "nonce": str(nonce or "")[:200], "jti": f"DEMO-{ek.zufall(9)}",
		"given_name": person["vorname"] or "Demo", "family_name": person["nachname"] or "Person", "birthdate": person["geburtsdatum"] or "1980-01-01"}
	wer = "fremd" if a == "abweichend" else n.id
	if d.methode == "id_austria":
		claims.update({"urn:pvpgvat:oidc.bpk": f"XFN+DEMO:{ek.sha256_hex('demo-bpk:' + wer)[:28]}=", "urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": f"http://eidas.europa.eu/LoA/{niveau}", "urn:pvpgvat:oidc.eid_issuing_nation": "AT"})
	else:
		claims.update({"restricted_id": ek.sha256_hex("demo-rid:" + wer)[:40], "acr": f"http://eidas.europa.eu/LoA/{niveau}", "IssuingState": "D"})
	code = ek.zufall()
	d.db_set("demo_daten", json.dumps({"code_hash": ek.sha256_hex(code), "challenge": str(codeChallenge or "")[:128], "claims": claims}))
	set_encrypted_password(DT, d.name, ek.zufall(), "demo_geheimnis")  # Signaturschlüssel des Simulators, verschlüsselt
	return {"url": f"{pfad}?{urlencode({'state': st, 'code': code})}"}


# ====================================================================== Rücksprung / Abschluss


def _geheimnisse_loeschen(name):
	"""PKCE-Verifier und Simulator-Schlüssel nach Gebrauch entfernen (verschlüsselte Ablage __Auth)."""
	for feld in ("verifier", "demo_geheimnis"):
		remove_encrypted_password(DT, name, feld)


class _Abbruch(Exception):
	def __init__(self, grund):
		super().__init__(grund)
		self.grund = grund


def _token_tauschen(k, code, verifier, redirect):
	import requests

	try:
		r = requests.post(k["token_url"], data={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect, "client_id": k["client_id"],
			"client_secret": k["client_secret"], "code_verifier": verifier}, headers={"Accept": "application/json"}, timeout=TIMEOUT, allow_redirects=False)
		j = r.json() if r.status_code == 200 else {}
	except (requests.RequestException, ValueError):
		j = {}
	if not isinstance(j.get("id_token"), str):
		frappe.log_error(title="eID: Token-Austausch fehlgeschlagen", message=f"Verfahren {k['methode']}")  # ohne Code/Token
		raise _Abbruch("token")
	return j["id_token"]


def _jwks(k, neu=False):
	import requests

	if k["jwks_fest"]:
		return ek.schluessel_laden(k["jwks_fest"])
	if not k["jwks_url"]:
		return []
	schluessel = f"oekoinvest_eid_jwks:{ek.sha256_hex(k['jwks_url'])[:16]}"
	daten = None if neu else frappe.cache().get_value(schluessel)
	if not daten:
		try:
			r = requests.get(k["jwks_url"], timeout=TIMEOUT, allow_redirects=False)
			daten = r.json() if r.status_code == 200 else None
		except (requests.RequestException, ValueError):
			daten = None
		if not daten:
			raise _Abbruch("schluessel")
		frappe.cache().set_value(schluessel, daten, expires_in_sec=3600)
	return ek.schluessel_laden(daten)


@frappe.whitelist(methods=["POST"])
def eid_abschluss(state=None, code=None, fehler=None, bindung=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	st = str(state or "")[:200]
	name = frappe.db.get_value(DT, {"state_hash": ek.sha256_hex(st)}, "name", for_update=True) if st else None
	if not name or frappe.db.get_value(DT, name, "konto_id") != n.id:
		ungueltig("Diese Anmeldung ist unbekannt oder gehört nicht zu Ihrem Konto.")
	d = frappe.get_doc(DT, name)
	if d.status != "ausstehend":
		konflikt("Diese Anmeldung wurde bereits verarbeitet.")
	verifier = d.get_password("verifier", raise_exception=False) or ""
	demo_daten = aus_json(d.demo_daten, None)
	demo_geheimnis = d.get_password("demo_geheimnis", raise_exception=False) if d.demo else ""

	def schluss(grund, status="fehler"):
		d.db_set({"status": status, "grund": grund, "abgeschlossen_am": now_datetime(), "demo_daten": None})
		_geheimnisse_loeschen(d.name)
		protokoll(n, "eid_ergebnis", "ident", d.name, f"eID-Anmeldung {status}: {ek.PRUEF_GRUND.get(grund, grund)}")
		frappe.db.commit()  # Vorgang ist verbraucht – auch wenn danach etwas scheitert
		return {"ok": False, "vorgang": _ausgabe(d)}

	if not bindung or not ek.gleich(ek.sha256_hex(bindung), d.bindung_hash):
		return schluss("bindung")
	if get_datetime(d.ablauf_am) < now_datetime():
		return schluss("abgelaufen", "abgebrochen")
	if fehler:
		return schluss("abbruch", "abgebrochen")
	if not code:
		return schluss("code")
	# Einmaligkeit: vor dem Netzaufruf verbrauchen
	d.db_set({"status": "in_pruefung", "demo_daten": None})
	_geheimnisse_loeschen(d.name)
	frappe.db.commit()

	k = _konfig(d.methode)
	token_hash = ""
	try:
		if d.demo:
			if not k or not k["demo"] or not demo_daten:
				raise _Abbruch("token")
			if not ek.gleich(ek.sha256_hex(str(code)), demo_daten.get("code_hash")):
				raise _Abbruch("code")
			if not ek.gleich(ek.pkce_challenge(verifier), demo_daten.get("challenge")):
				raise _Abbruch("pkce")
			id_token = ek.hs_signieren(demo_daten["claims"], demo_geheimnis)
			schluessel, hmac_geheimnis = [], demo_geheimnis
		else:
			if not k or not k.get("aktiv") or k["demo"]:
				raise _Abbruch("token")
			k = _endpunkte(k)
			id_token = _token_tauschen(k, str(code)[:2000], verifier, d.redirect)
			schluessel, hmac_geheimnis = _jwks(k), ""
		token_hash = ek.sha256_hex(id_token)
		opt = {"issuer": k["issuer"], "client_id": k["client_id"], "nonce_hash": d.nonce_hash, "schluessel": schluessel, "algs": k["algs"], "hmac_geheimnis": hmac_geheimnis,
			"loa_claims": k["loa_claims"], "loa_min": k["loa_min"], "loa_standard": k["loa_standard"]}
		pruefung = ek.id_token_pruefen(id_token, **opt)
		if not pruefung["ok"] and pruefung["grund"] == "schluessel" and not d.demo and not k["jwks_fest"]:
			pruefung = ek.id_token_pruefen(id_token, **{**opt, "schluessel": _jwks(k, neu=True)})  # Schlüsselwechsel
	except _Abbruch as e:
		pruefung = {"ok": False, "grund": e.grund}
	except frappe.ValidationError:
		pruefung = {"ok": False, "grund": "token"}

	if pruefung["ok"] and token_hash and frappe.db.exists(DT, {"token_hash": token_hash}):
		pruefung = {"ok": False, "grund": "replay"}
	d.reload()
	werte = {"abgeschlossen_am": now_datetime(), "token_hash": token_hash or None}
	if not pruefung["ok"]:
		d.db_set({**werte, "status": "abgelehnt" if pruefung["grund"] == "loa" else "fehler", "grund": pruefung["grund"]})
		protokoll(n, "eid_ergebnis", "ident", d.name, f"eID-Anmeldung {d.status}: {ek.PRUEF_GRUND.get(pruefung['grund'], pruefung['grund'])}")
		daten = None
	else:
		daten = ek.minimaldaten(pruefung["claims"], k["claims"], pfeffer=k["pfeffer"], token_hash=token_hash)
		abgleich = ek.eid_abgleich(daten, _kyc_person(n.id, n))
		dublette = frappe.db.get_value(DT, {"bpk_hash": daten["bpkHash"], "konto_id": ["!=", n.id], "status": "bestanden"}, "konto_id") if daten["bpkHash"] else None
		regel = _regel()
		bestaetigt = regel and pruefung["loa"] == "hoch" and abgleich["name"] is not False and abgleich["geburtsdatum"] is not False and not dublette
		d.db_set({**werte, "status": "bestanden", "grund": "", "vorname": daten["vorname"], "nachname": daten["nachname"], "geburtsdatum": daten["geburtsdatum"],
			"vertrauensniveau": pruefung["loa"], "transaktions_id": daten["transaktionsId"], "land": daten["land"], "bpk_hash": daten["bpkHash"],
			"abgleich": json.dumps(abgleich), "dublette": dublette, "identitaet_bestaetigt": 1 if bestaetigt else 0})
		protokoll(n, "eid_ergebnis", "ident", d.name, f"eID-Nachweis {ek.METHODEN[d.methode]['label']}: Vertrauensniveau {ek.LOA_LABEL[pruefung['loa']]}{', Identität bestätigt (Regel)' if bestaetigt else ''}")
		benachrichtigen(n.id, "status", "eID-Anmeldung abgeschlossen", "Ihr eID-Nachweis liegt vor. Die abschließende Prüfung Ihrer Verifizierung erfolgt durch die Compliance.", link="/portal/verifizierung", objekt_art="kyc", objekt_id=d.name, mail=False)

	# Hinweis im KYC-Fall (ändert den Status nie)
	from oekoinvest_app.plattform.api.dienste import _kyc_anhaengen

	quelle = f"eID {ek.METHODEN[d.methode]['label']}{' (DEMO)' if d.demo else ''}"
	if daten:
		auffaellig = abgleich["name"] is False or abgleich["geburtsdatum"] is False or bool(dublette)
		teile = [f"Vertrauensniveau {ek.LOA_LABEL[pruefung['loa']]}", f"{daten['vorname']} {daten['nachname']}, geb. {daten['geburtsdatum'] or '–'}",
			"Name weicht von den Angaben ab" if abgleich["name"] is False else "", "Geburtsdatum weicht ab" if abgleich["geburtsdatum"] is False else "",
			"Gleiche Person bereits mit anderem Konto nachgewiesen" if dublette else "", "Identität bestätigt (Compliance-Regel „eID hoch“)" if bestaetigt else "",
			"DEMO – keine echte Identifizierung" if d.demo else ""]
		eintrag = {"quelle": quelle, "art": "eid", "ergebnis": "auffaellig" if auffaellig else "ok", "zusammenfassung": " · ".join(x for x in teile if x),
			"externeId": daten["transaktionsId"] or d.name, "rohdatenRef": f"eID-Vorgang {d.name}",
			"daten": {"vorgang": d.name, "methode": d.methode, "vertrauensniveau": pruefung["loa"], "zeitpunkt": iso(d.abgeschlossen_am), "transaktionsId": daten["transaktionsId"],
				"nameStimmt": "" if abgleich["name"] is None else abgleich["name"], "geburtsdatumStimmt": "" if abgleich["geburtsdatum"] is None else abgleich["geburtsdatum"],
				"dublette": bool(dublette), "identitaetBestaetigt": bool(bestaetigt), "regelHochBestaetigt": bool(regel), "demo": bool(d.demo)}}
	else:
		eintrag = {"quelle": quelle, "art": "eid", "ergebnis": "hinweis" if pruefung["grund"] == "loa" else "fehler",
			"zusammenfassung": f"eID-Anmeldung nicht verwertbar: {ek.PRUEF_GRUND.get(pruefung['grund'], pruefung['grund'])}{' (DEMO)' if d.demo else ''}",
			"externeId": d.name, "rohdatenRef": f"eID-Vorgang {d.name}", "daten": {"vorgang": d.name, "methode": d.methode, "grund": pruefung["grund"], "demo": bool(d.demo)}}
	e = _kyc_anhaengen(eintrag, konto_id=n.id)
	if e and e.get("id"):
		d.db_set("kyc_eintrag_id", e.get("id"))
	d.reload()
	return {"ok": bool(pruefung["ok"]), "vorgang": _ausgabe(d)}


# ====================================================================== Compliance-Einstellungen


@frappe.whitelist(methods=["POST"])
def eid_einstellungen(als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _compliance_lesen(n):
		verboten("Nur für die Compliance.")
	methoden = []
	for mid, m in ek.METHODEN.items():
		k = _konfig(mid) or {}
		methoden.append({"id": mid, "label": m["label"], "aktiv": bool(k.get("aktiv")), "demo": bool(k.get("demo")), "loaMin": k.get("loa_min", "hoch")})
	return {"einstellungen": {"hochBestaetigt": _regel()}, "methoden": methoden}


@frappe.whitelist(methods=["POST"])
def eid_einstellungen_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	if not _ist_compliance(n):
		verboten("Nur für die Compliance (Backoffice-Rolle „Compliance“).")
	daten = aus_json(daten, {}) or {}
	if "hochBestaetigt" in daten:
		an = v.wahr(daten.get("hochBestaetigt"))
		frappe.defaults.set_global_default(EINSTELLUNG_REGEL, "1" if an else "0")
		protokoll(n, "eid_einstellungen", "kyc", "eid", f"eID-Regel „hohes Vertrauensniveau = Identität bestätigt“ {'aktiviert' if an else 'deaktiviert'}")
	return {"ok": True, "einstellungen": {"hochBestaetigt": _regel()}}
