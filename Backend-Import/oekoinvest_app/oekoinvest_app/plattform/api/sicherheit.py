# Copyright (c) 2026, ÖkoInvest GmbH
#
# Login, Sicherheit & Konto – Port von src/lib/plattform/backend/demo/sicherheit.js (Vertrag: docs/API.md, Abschnitt 8,
# Methodennamen: src/lib/plattform/backend/frappe/sicherheit.js).
#
#  - Sitzungen (Plattform Sitzung): Kennung im signierten Cookie der Website; gültig nur, solange der Eintrag besteht,
#    nicht widerrufen/abgelaufen ist und seine Version der Sitzungsversion des Kontos entspricht (auth.nutzer_fuer_sitzung)
#  - Geräte (nur SHA-256 des Geräte-Cookies), Anmeldehistorie inkl. Fehlversuchen
#  - Zwei-Faktor (TOTP, RFC 6238) mit Replay-Schutz und 10 Wiederherstellungscodes (nur SHA-256)
#  - E-Mail-Link-Anmeldung (Token-Art „magic“, 15 min), E-Mail ändern (Token-Art „email_neu“, 24 h)
#  - Pflicht-2FA je Rolle, Konto-Komfort, Datenexport (Art. 15/20 DSGVO), Konto löschen (Art. 17 DSGVO)
#
# „Öffentlich“ (ohne als_benutzer, nur API-Nutzer): zwei_faktor_pruefen, magic_link_anfordern, magic_link_einloesen,
# email_aendern_bestaetigen, geraet_vertraut. Geheimnisse (TOTP-Schlüssel, Token, Hashes) verlassen Frappe nie –
# einzige Ausnahme: der neue Schlüssel einmalig bei zwei_faktor_starten.

import re
import secrets

import frappe
from frappe.utils import add_days, add_to_date, cint, get_datetime, now_datetime
from frappe.utils.password import check_password, delete_all_passwords_for

from oekoinvest_app.plattform import sicherheit as s
from oekoinvest_app.plattform import totp
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import verknuepfen
from oekoinvest_app.plattform.geraet import geraet_aus_user_agent, ip_grob, ort_grob
from oekoinvest_app.plattform.kern import (
	admin_noetig,
	als_json,
	api_pruefen,
	aus_json,
	iso,
	jetzt,
	jetzt_iso,
	konflikt,
	konto_json,
	konto_rollen,
	konto_suchen,
	nicht_angemeldet,
	nicht_gefunden,
	nutzer,
	protokoll,
	sha256,
	token_einloesen,
	ungueltig,
	verlauf_json,
)
from oekoinvest_app.plattform.konstanten import (
	ALLE_ROLLEN_IDS,
	EINRICHTUNG_2FA_MINUTEN,
	GERAET_MERKEN_TAGE,
	MAGIC_LINK_MINUTEN,
	MAX_SITZUNGEN_JE_KONTO,
	SITZUNG_DAUER_S,
)
from oekoinvest_app.plattform.organisation import komfort_bereinigen, team_rolle_label

GERAET_TOKEN = re.compile(r"^[A-Za-z0-9_-]{30,100}$")


def _konto(n):
	return frappe.get_doc("Plattform Konto", n.id)


def _passwort_ok(konto, passwort):
	pw = passwort if isinstance(passwort, str) else ""
	if not pw or len(pw) > 200:
		return False
	try:
		check_password(konto.user, pw)
		return True
	except frappe.AuthenticationError:
		return False


def _passwort_noetig(konto, passwort):
	"""Passwort für eine sensible Aktion in der Sitzung prüfen (Pen-Test-Befund S1, Paket SECURITY):
	Kontosperre gilt auch hier, jeder Fehlversuch zählt zum Backoff – sonst ließe sich das Passwort
	aus einer gekaperten Sitzung heraus im Takt des IP-Rate-Limits raten."""
	s.sperre_pruefen(konto.email, konto)
	if not _passwort_ok(konto, passwort):
		s.fehlversuch_buchen(konto.email, konto, grund="passwort")
		s.festschreiben()  # Zähler bleibt trotz Fehler (Rollback) erhalten
		ungueltig("Das Passwort stimmt nicht.")


def _code_noetig(konto, z, code, wiederherstellung=True, fehlertext="Der Code ist ungültig."):
	"""2FA-Code für eine sensible Aktion in der Sitzung prüfen – Fehlversuche zählen zur Kontosperre (wie zwei_faktor_pruefen)."""
	r = _code_einloesen(z, code, wiederherstellung=wiederherstellung)
	if not r:
		s.fehlversuch_buchen(konto.email, konto, grund="2fa")
		s.festschreiben()
		ungueltig(fehlertext)
	return r


# ================================================================ Sitzungen & Geräte


@frappe.whitelist(methods=["POST"])
def sitzung_anlegen(ip=None, userAgent=None, land=None, methode=None, zweiFaktor=None, geraetToken=None, geraetMerken=None, ersetzt=None, als_benutzer=None):
	"""Neue Sitzung nach vollständiger Anmeldung (Passwort/E-Mail-Link + ggf. 2FA). Setzt die Sperre zurück,
	schreibt die Historie, erkennt neue Geräte (Benachrichtigung + E-Mail) und merkt das Gerät optional 30 Tage.
	Liefert {sitzung: {id}, geraetToken (nur wenn neu erzeugt, sonst None), neuesGeraet}."""
	n = nutzer(als_benutzer)
	konto = _konto(n)
	ip_ = v.text(ip, 64)
	ua = v.text(userAgent, 400)
	land_ = v.text(land, 2)
	methode_ = v.text(methode, 40) or "passwort"
	zwei = v.wahr(zweiFaktor)
	s.sperre_zuruecksetzen(konto.email, konto)

	g = geraet_aus_user_agent(ua)
	grob = ip_grob(ip_)
	ort = ort_grob(ip_, land_)
	token_ok = isinstance(geraetToken, str) and bool(GERAET_TOKEN.match(geraetToken))
	geraet_name = frappe.db.get_value("Plattform Geraet", {"nutzer_id": konto.name, "hash": sha256(geraetToken)}, "name") if token_ok else None
	bekannt = bool(geraet_name) or bool(frappe.db.exists("Plattform Anmeldung", {"nutzer_id": konto.name, "ok": 1, "geraet": g["label"], "ip_grob": grob}))
	neues_token = None
	if geraet_name:
		geraet = frappe.get_doc("Plattform Geraet", geraet_name)
	else:
		token = geraetToken if token_ok else secrets.token_urlsafe(32)
		if not token_ok:
			neues_token = token
		geraet = frappe.get_doc(
			{
				"doctype": "Plattform Geraet",
				"nutzer_id": konto.name,
				"hash": sha256(token),
				"label": g["label"],
				"mobil": 1 if g["mobil"] else 0,
				"erste_anmeldung": jetzt(),
				"letzte_anmeldung": jetzt(),
				"zwei_faktor_version": 0,
			}
		).insert(ignore_permissions=True)
	geraet.letzte_anmeldung = jetzt()
	geraet.label = g["label"]
	z = s.zf(konto.name)
	if v.wahr(geraetMerken) and zwei and z and cint(z.aktiv):
		geraet.vertraut_bis = add_days(now_datetime(), GERAET_MERKEN_TAGE)
		geraet.zwei_faktor_version = cint(z.version)
	geraet.save(ignore_permissions=True)

	# Sitzungsrotation: eine ersetzte Sitzung (z. B. nach 2FA-Einrichtung) wird beendet, Kontext bleibt
	alt = None
	alt_id = v.kennung(ersetzt)
	if alt_id:
		alt = frappe.db.get_value("Plattform Sitzung", {"name": alt_id, "nutzer_id": konto.name}, ["name", "widerrufen_am", "organisation_id"], as_dict=True)
		if alt and not alt.widerrufen_am:
			s.widerrufen(alt.name, "rotation")
	sitzung = frappe.get_doc(
		{
			"doctype": "Plattform Sitzung",
			"nutzer_id": konto.name,
			"version": cint(konto.sitzung_version),
			"ablauf": add_to_date(now_datetime(), seconds=SITZUNG_DAUER_S),
			"letzte_aktivitaet": jetzt(),
			"ip_grob": grob,
			"ort": ort,
			"user_agent": v.text(ua, 300),
			"geraet": g["label"],
			"mobil": 1 if g["mobil"] else 0,
			"geraet_id": geraet.name,
			"methode": methode_,
			"zwei_faktor": 1 if zwei else 0,
			"organisation_id": (alt.organisation_id if alt else None) or None,
		}
	).insert(ignore_permissions=True)
	# höchstens 30 aktive Sitzungen je Konto (älteste zuerst beenden); abgelaufene räumt der tägliche Job auf
	aktive = s.aktive_sitzungen(konto)
	for x in sorted(aktive, key=lambda y: str(y.letzte_aktivitaet or ""))[: max(0, len(aktive) - MAX_SITZUNGEN_JE_KONTO)]:
		if x.name != sitzung.name:
			s.widerrufen(x.name, "grenze")

	frappe.db.set_value("Plattform Konto", konto.name, "letzter_login", jetzt(), update_modified=False)
	s.historie(konto, konto.email, True, f"{methode_}{' + 2FA' if zwei else ''}", "", ip_, ua, land_)
	if not bekannt and methode_ != "registrierung":
		s.melden(
			konto,
			"Anmeldung von einem neuen Gerät",
			f"{g['label']} · {ort or 'Ort unbekannt'}",
			"Neue Anmeldung bei Ihrem Konto – ÖkoInvest",
			f"Ihr Konto im Portal von ÖkoInvest wurde soeben von einem neuen Gerät verwendet: {g['label']}, {ort or 'Ort unbekannt'}. Wenn Sie das waren, ist nichts zu tun.",
		)
	if methode_ != "passwort" or zwei:
		protokoll(n, "login", "nutzer", konto.name, f"Anmeldung ({methode_}{', 2FA' if zwei else ''}) · {g['label']}", ip_)
	return {"sitzung": {"id": sitzung.name}, "geraetToken": neues_token, "neuesGeraet": not bekannt}


@frappe.whitelist(methods=["POST"])
def sitzungen(sitzungId=None, als_benutzer=None):
	"""Aktive Sitzungen des Kontos (aktuelle markiert), neueste Aktivität zuerst."""
	n = nutzer(als_benutzer)
	konto = _konto(n)
	aktuell = v.kennung(sitzungId)
	orgs = {}

	def org_name(org_id):
		if org_id not in orgs:
			orgs[org_id] = frappe.db.get_value("Plattform Organisation", org_id, "titel")
		return orgs[org_id]

	return [
		{
			"id": x.name,
			"geraet": x.geraet or "",
			"mobil": bool(cint(x.mobil)),
			"ort": x.ort or "",
			"erstelltAm": iso(x.creation),
			"letzteAktivitaet": iso(x.letzte_aktivitaet),
			"methode": x.methode or "",
			"zweiFaktor": bool(cint(x.zwei_faktor)),
			"aktuell": bool(aktuell) and x.name == aktuell,
			"organisation": org_name(x.organisation_id) if x.organisation_id else None,
		}
		for x in s.aktive_sitzungen(konto)
	]


@frappe.whitelist(methods=["POST"])
def sitzung_beenden(id=None, alleAnderen=None, sitzungId=None, als_benutzer=None):  # noqa: A002
	"""Eine eigene Sitzung beenden (auch die aktuelle = Abmelden) oder alle anderen (+ Sitzungsversion + 1;
	die aktuelle Sitzung übernimmt die neue Version, die Website setzt dafür ein neues Cookie)."""
	n = nutzer(als_benutzer)
	konto = _konto(n)
	aktuell = v.kennung(sitzungId)
	beendet = 0
	if v.wahr(alleAnderen):
		for x in frappe.get_all("Plattform Sitzung", filters={"nutzer_id": konto.name, "widerrufen_am": ("is", "not set")}, pluck="name", limit_page_length=0):
			if x == aktuell:
				continue
			s.widerrufen(x, "abgemeldet")
			beendet += 1
		konto.sitzung_version = cint(konto.sitzung_version) + 1
		konto.save(ignore_permissions=True)
		if aktuell and frappe.db.exists("Plattform Sitzung", {"name": aktuell, "nutzer_id": konto.name}):
			frappe.db.set_value("Plattform Sitzung", aktuell, "version", cint(konto.sitzung_version), update_modified=False)
		protokoll(n, "sitzung", "nutzer", konto.name, f"Alle anderen Sitzungen beendet ({beendet})")
		return {"beendet": beendet, "sitzungVersion": cint(konto.sitzung_version), "nutzer": konto_json(konto)}
	k = v.kennung(id)
	x = frappe.db.get_value("Plattform Sitzung", k, ["name", "nutzer_id", "widerrufen_am", "geraet"], as_dict=True) if k else None
	if not x or x.nutzer_id != konto.name:
		nicht_gefunden("Sitzung nicht gefunden.")
	if not x.widerrufen_am:
		s.widerrufen(x.name, "abmeldung" if x.name == aktuell else "abgemeldet")
		beendet = 1
		if x.name != aktuell:
			protokoll(n, "sitzung", "nutzer", konto.name, f"Sitzung beendet: {x.geraet}")
	return {"beendet": beendet, "sitzungVersion": cint(konto.sitzung_version)}


@frappe.whitelist(methods=["POST"])
def anmeldungen(limit=None, als_benutzer=None):
	"""Anmeldehistorie inkl. Fehlversuchen (neueste zuerst)."""
	n = nutzer(als_benutzer)
	anzahl = int(v.zahl(limit, min=1, max=200) or 50)
	return [
		{"id": a.name, "am": iso(a.am), "ok": bool(cint(a.ok)), "methode": a.methode or "", "grund": a.grund or "", "ort": a.ort or "", "geraet": a.geraet or ""}
		for a in frappe.get_all(
			"Plattform Anmeldung",
			filters={"nutzer_id": n.id},
			fields=["name", "am", "ok", "methode", "grund", "ort", "geraet"],
			order_by="am desc, creation desc",
			limit_page_length=anzahl,
		)
	]


@frappe.whitelist(methods=["POST"])
def geraete(geraetToken=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	z = s.zf(n.id)
	z_aktiv = bool(z and cint(z.aktiv))
	h = sha256(geraetToken) if isinstance(geraetToken, str) and geraetToken else ""
	out = []
	for g in frappe.get_all(
		"Plattform Geraet",
		filters={"nutzer_id": n.id},
		fields=["name", "label", "mobil", "hash", "erste_anmeldung", "letzte_anmeldung", "vertraut_bis", "zwei_faktor_version"],
		order_by="letzte_anmeldung desc",
		limit_page_length=0,
	):
		vertraut = z_aktiv and bool(g.vertraut_bis) and get_datetime(g.vertraut_bis) > now_datetime() and cint(g.zwei_faktor_version) == cint(z.version)
		out.append(
			{
				"id": g.name,
				"label": g.label or "",
				"mobil": bool(cint(g.mobil)),
				"ersteAnmeldung": iso(g.erste_anmeldung),
				"letzteAnmeldung": iso(g.letzte_anmeldung),
				"vertraut": bool(vertraut),
				"vertrautBis": iso(g.vertraut_bis),
				"aktuell": bool(h) and g.hash == h,
			}
		)
	return out


@frappe.whitelist(methods=["POST"])
def geraet_vergessen(id=None, als_benutzer=None):  # noqa: A002
	"""Gerät vergessen: Eintrag löschen (2FA wird dort wieder abgefragt, neue Anmeldung gilt als neues Gerät)."""
	n = nutzer(als_benutzer)
	k = v.kennung(id)
	g = frappe.db.get_value("Plattform Geraet", {"name": k, "nutzer_id": n.id}, ["name", "label"], as_dict=True) if k else None
	if not g:
		nicht_gefunden("Gerät nicht gefunden.")
	frappe.delete_doc("Plattform Geraet", g.name, ignore_permissions=True, force=True)
	protokoll(n, "geraet", "nutzer", n.id, f"Gerät vergessen: {g.label}")
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def geraet_vertraut(nutzerId=None, geraetToken=None):
	"""Ist das Gerät (Cookie) für die Zwei-Faktor-Anmeldung dieses Kontos gemerkt? (öffentlich, nur API-Nutzer)"""
	api_pruefen()
	k = v.kennung(nutzerId)
	if not k or not isinstance(geraetToken, str) or not GERAET_TOKEN.match(geraetToken):
		return False
	return s.geraet_vertraut_pruefen(k, sha256(geraetToken))


# ================================================================ Zwei-Faktor (TOTP)


def _code_einloesen(z, code, wiederherstellung=True):
	"""Code prüfen (TOTP mit Replay-Schutz oder Wiederherstellungscode). Ändert `z` (Aufrufer speichert)."""
	if not z or not cint(z.aktiv):
		return None
	codes = aus_json(z.codes, []) or []
	if wiederherstellung and totp.ist_wiederherstellungscode(code):
		h = totp.code_hash(code)
		if h not in codes:
			return None
		codes.remove(h)
		z.codes = als_json(codes)
		return {"methode": "wiederherstellung", "codesUebrig": len(codes)}
	schritt = totp.totp_pruefen(z.get_password("geheimnis", raise_exception=False), code, letzter_schritt=cint(z.letzter_schritt))
	if schritt is None:
		return None
	z.letzter_schritt = schritt
	return {"methode": "totp", "codesUebrig": len(codes)}


def _neue_codes(z):
	codes = totp.codes_erzeugen()
	z.codes = als_json([totp.code_hash(c) for c in codes])
	return codes


@frappe.whitelist(methods=["POST"])
def zwei_faktor_status(als_benutzer=None):
	n = nutzer(als_benutzer)
	return s.status_von(n.id, n.rollen)


@frappe.whitelist(methods=["POST"])
def zwei_faktor_starten(als_benutzer=None):
	"""Einrichtung starten: neuer Schlüssel (noch nicht aktiv) → {geheimnis, uri} für QR-Code / manuelle Eingabe.
	Der Schlüssel wird hier einmalig ausgegeben und sonst nur verschlüsselt gespeichert."""
	n = nutzer(als_benutzer)
	z = s.zf(n.id)
	if z and cint(z.aktiv):
		konflikt("Die Zwei-Faktor-Anmeldung ist bereits aktiv.")
	if not z:
		z = frappe.get_doc({"doctype": "Plattform Zwei Faktor", "nutzer_id": n.id, "aktiv": 0, "letzter_schritt": -1, "codes": als_json([]), "version": 0})
	geheimnis = totp.geheimnis_erzeugen()
	z.ausstehend = geheimnis
	z.ausstehend_am = jetzt()
	if z.is_new():
		z.insert(ignore_permissions=True)
	else:
		z.save(ignore_permissions=True)
	return {"geheimnis": geheimnis, "uri": totp.otpauth_uri(geheimnis, n.email)}


@frappe.whitelist(methods=["POST"])
def zwei_faktor_bestaetigen(code=None, als_benutzer=None):
	"""Einrichtung bestätigen: erster Code aus der App → aktiv + 10 Wiederherstellungscodes (einmalig angezeigt)."""
	n = nutzer(als_benutzer)
	konto = _konto(n)
	z = s.zf(n.id)
	if z and cint(z.aktiv):
		konflikt("Die Zwei-Faktor-Anmeldung ist bereits aktiv.")
	if not z or not z.ausstehend_am or (now_datetime() - get_datetime(z.ausstehend_am)).total_seconds() > EINRICHTUNG_2FA_MINUTEN * 60:
		ungueltig("Die Einrichtung ist abgelaufen. Bitte starten Sie sie erneut.")
	geheimnis = z.get_password("ausstehend", raise_exception=False)
	schritt = totp.totp_pruefen(geheimnis, code)
	if schritt is None:
		ungueltig("Der Code stimmt nicht. Prüfen Sie die Uhrzeit Ihres Telefons und geben Sie den aktuellen 6-stelligen Code ein.")
	z.aktiv = 1
	z.geheimnis = geheimnis
	z.ausstehend = ""
	z.ausstehend_am = None
	z.letzter_schritt = schritt
	z.aktiviert_am = jetzt()
	z.version = cint(z.version) + 1
	codes = _neue_codes(z)
	z.save(ignore_permissions=True)
	s.melden(
		konto,
		"Zwei-Faktor-Anmeldung aktiviert",
		"Ab sofort fragen wir bei der Anmeldung zusätzlich einen Code aus Ihrer Authenticator-App ab.",
		"Zwei-Faktor-Anmeldung aktiviert – ÖkoInvest",
	)
	protokoll(n, "zwei_faktor", "nutzer", n.id, "Zwei-Faktor-Anmeldung aktiviert")
	return {"codes": codes, "status": s.status_von(n.id, n.rollen)}


@frappe.whitelist(methods=["POST"])
def zwei_faktor_deaktivieren(passwort=None, code=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	konto = _konto(n)
	if s.pflicht_fuer(n.rollen):
		konflikt("Für Ihre Rolle ist die Zwei-Faktor-Anmeldung Pflicht und kann nicht abgeschaltet werden.")
	_passwort_noetig(konto, passwort)
	z = s.zf(n.id)
	if not z or not cint(z.aktiv):
		konflikt("Die Zwei-Faktor-Anmeldung ist nicht aktiv.")
	_code_noetig(konto, z, code)
	z.aktiv = 0
	z.geheimnis = ""
	z.codes = als_json([])
	z.aktiviert_am = None
	z.version = cint(z.version) + 1  # gemerkte Geräte verlieren ihre Gültigkeit
	z.save(ignore_permissions=True)
	s.melden(
		konto,
		"Zwei-Faktor-Anmeldung abgeschaltet",
		"Die Anmeldung erfolgt wieder nur mit Passwort bzw. E-Mail-Link.",
		"Zwei-Faktor-Anmeldung abgeschaltet – ÖkoInvest",
	)
	protokoll(n, "zwei_faktor", "nutzer", n.id, "Zwei-Faktor-Anmeldung abgeschaltet")
	return s.status_von(n.id, n.rollen)


@frappe.whitelist(methods=["POST"])
def wiederherstellungscodes_neu(code=None, als_benutzer=None):
	"""Neue Wiederherstellungscodes (alte werden ungültig) – nur mit aktuellem App-Code."""
	n = nutzer(als_benutzer)
	konto = _konto(n)
	s.sperre_pruefen(konto.email, konto)
	z = s.zf(n.id)
	if not z or not cint(z.aktiv):
		konflikt("Die Zwei-Faktor-Anmeldung ist nicht aktiv.")
	_code_noetig(konto, z, code, wiederherstellung=False, fehlertext="Bitte geben Sie den aktuellen Code aus Ihrer Authenticator-App ein.")
	codes = _neue_codes(z)
	z.save(ignore_permissions=True)
	protokoll(n, "zwei_faktor", "nutzer", n.id, "Neue Wiederherstellungscodes erzeugt")
	return {"codes": codes, "status": s.status_von(n.id, n.rollen)}


@frappe.whitelist(methods=["POST"])
def zwei_faktor_pruefen(nutzerId=None, code=None, ip=None, userAgent=None, land=None):
	"""Zweiter Schritt der Anmeldung (öffentlich, nur API-Nutzer). Fehlversuche zählen zur Kontosperre.
	Liefert das Konto (+ zweiFaktorAktiv, zweiFaktorMethode, codesUebrig) oder 401 bzw. 429 (gesperrt)."""
	api_pruefen()
	k = v.kennung(nutzerId)
	konto = frappe.get_doc("Plattform Konto", k) if k and frappe.db.exists("Plattform Konto", k) else None
	if not konto or not cint(konto.aktiv):
		nicht_angemeldet()
	s.sperre_pruefen(konto.email, konto)
	z = s.zf(konto.name)
	r = _code_einloesen(z, code)
	if not r:
		s.fehlversuch_buchen(konto.email, konto, v.text(ip, 64), v.text(userAgent, 400), v.text(land, 2), grund="2fa")
		s.festschreiben()  # Zähler und Historie bleiben trotz Fehler (Rollback) erhalten
		frappe.throw("Der Code ist ungültig oder wurde bereits verwendet.", frappe.AuthenticationError)
	z.save(ignore_permissions=True)
	if r["methode"] == "wiederherstellung":
		s.melden(
			konto,
			"Wiederherstellungscode verwendet",
			f"Noch {r['codesUebrig']} Wiederherstellungscode(s) übrig.",
			"Wiederherstellungscode verwendet – ÖkoInvest",
			f"Für die Anmeldung wurde einer Ihrer Wiederherstellungscodes verwendet. Es sind noch {r['codesUebrig']} Code(s) übrig. Erzeugen Sie bei Bedarf unter „Sicherheit“ neue Codes.",
		)
	return {**s.mit_zwei_faktor(konto), "zweiFaktorMethode": r["methode"], "codesUebrig": r["codesUebrig"]}


# ================================================================ E-Mail-Link (passwortlos)


@frappe.whitelist(methods=["POST"])
def magic_link_anfordern(email=None, basisUrl=None, ip=None):
	"""Immer {ok: True} (keine Enumeration). Aktive Konten erhalten einen Link (15 min, einmalig, nur Hash gespeichert)."""
	api_pruefen()
	e = v.email(email)
	if not e:
		return {"ok": True}
	konto = konto_suchen(e)
	if not konto or not cint(konto.aktiv) or konto.email != e:
		return {"ok": True}
	token = s.token_anlegen("magic", konto.name, MAGIC_LINK_MINUTEN)
	s.mail_senden(
		e,
		konto.vorname,
		"Ihr Anmelde-Link – ÖkoInvest",
		f"Mit dem folgenden Link melden Sie sich ohne Passwort im Portal von ÖkoInvest an. Er ist {MAGIC_LINK_MINUTEN} Minuten gültig und funktioniert nur einmal. "
		"Ist die Zwei-Faktor-Anmeldung aktiv, fragen wir danach zusätzlich Ihren Code ab.",
		f"/login/link?token={token}",
		"Jetzt anmelden",
		"Sie haben keinen Link angefordert? Dann ignorieren Sie diese E-Mail – ohne den Link ist keine Anmeldung möglich.",
		fallback=basisUrl,
		sicherheit=False,
	)
	protokoll(frappe._dict(id=konto.name), "magic_link", "nutzer", konto.name, "Anmelde-Link angefordert", v.text(ip, 64))
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def magic_link_einloesen(token=None):
	"""Link einlösen → Konto (E-Mail gilt als bestätigt). Die 2FA prüft danach die Website."""
	api_pruefen()
	konto = token_einloesen("magic", token)
	if not cint(konto.email_bestaetigt):
		konto.email_bestaetigt = 1
		konto.save(ignore_permissions=True)
		verknuepfen(konto)
		konto.reload()
	return s.mit_zwei_faktor(konto)


# ================================================================ Pflicht-2FA (Backoffice)


@frappe.whitelist(methods=["POST"])
def pflicht_lesen(als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	wirksam = s.pflicht_rollen()
	ohne = 0
	if wirksam:
		betroffen = set(frappe.get_all("Plattform Konto Rolle", filters={"rolle": ("in", wirksam), "parenttype": "Plattform Konto"}, pluck="parent", limit_page_length=0))
		aktiv_2fa = set(frappe.get_all("Plattform Zwei Faktor", filters={"aktiv": 1}, pluck="nutzer_id", limit_page_length=0))
		for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name", limit_page_length=0):
			if k in betroffen and k not in aktiv_2fa:
				ohne += 1
	return {"rollen": s.pflicht_gespeichert(), "umgebung": s.pflicht_umgebung(), "wirksam": wirksam, "kontenOhne2fa": ohne}


@frappe.whitelist(methods=["POST"])
def pflicht_speichern(rollen=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	admin_noetig(n)
	r = v.mehrfach(rollen, ALLE_ROLLEN_IDS)
	frappe.db.set_default(s.PFLICHT_DEFAULT, als_json(r))
	protokoll(n, "einstellung", "nutzer", n.id, f"Pflicht-2FA für: {', '.join(r) or 'niemand'}")
	return {"rollen": r, "wirksam": s.pflicht_rollen()}


# ================================================================ Konto-Komfort, E-Mail ändern


@frappe.whitelist(methods=["POST"])
def komfort_speichern(komfort=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	konto = _konto(n)
	konto.komfort = als_json(komfort_bereinigen(komfort if isinstance(komfort, dict) else {}, komfort_bereinigen(aus_json(konto.get("komfort")) or {})))
	konto.save(ignore_permissions=True)
	protokoll(n, "profil", "nutzer", konto.name, "Konto-Einstellungen gespeichert")
	return konto_json(konto)


def _email_vergeben(e, ausser=None):
	k = frappe.db.get_value("Plattform Konto", {"email": e}, "name")
	return bool((k and k != ausser) or frappe.db.exists("User", e))


@frappe.whitelist(methods=["POST"])
def email_aendern_anfordern(neu=None, passwort=None, basisUrl=None, als_benutzer=None):
	"""Neue Anmeldeadresse anfordern: Bestätigungslink an die NEUE Adresse (24 h), Hinweis an die alte."""
	n = nutzer(als_benutzer)
	e = v.email(neu)
	v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	konto = _konto(n)
	v.pflicht(e != konto.email, "Das ist bereits Ihre Anmeldeadresse.")
	_passwort_noetig(konto, passwort)
	if _email_vergeben(e):
		konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto.")
	token = s.token_anlegen("email_neu", konto.name, 24 * 60, neue_email=e)
	s.mail_senden(
		e,
		konto.vorname,
		"Neue E-Mail-Adresse bestätigen – ÖkoInvest",
		"Sie möchten diese Adresse künftig für die Anmeldung im Portal von ÖkoInvest verwenden. Bitte bestätigen Sie sie über den folgenden Link (24 Stunden gültig).",
		f"/api/auth/email-aendern?token={token}",
		"Neue Adresse bestätigen",
		"Sie haben keine Änderung angefordert? Dann ignorieren Sie diese E-Mail.",
		fallback=basisUrl,
	)
	s.melden(
		konto,
		"Änderung der E-Mail-Adresse angefordert",
		f"Neue Adresse: {e} – wirksam nach Bestätigung.",
		"Änderung Ihrer E-Mail-Adresse angefordert – ÖkoInvest",
		f"Für Ihr Konto wurde die Änderung der Anmeldeadresse auf {e} angefordert. Sie wird erst wirksam, wenn die neue Adresse bestätigt ist.",
	)
	protokoll(n, "email_aendern", "nutzer", konto.name, f"Neue Adresse angefordert: {e}")
	return {"ok": True, "an": e}


def _user_umbenennen(alt, neu):
	"""Frappe-User umbenennen (User.name = E-Mail). Links (Plattform Konto.user) und Passwort ziehen mit."""
	frappe.rename_doc("User", alt, neu, force=True, ignore_permissions=True, show_alert=False)
	frappe.db.set_value("User", neu, "email", neu, update_modified=False)


@frappe.whitelist(methods=["POST"])
def email_aendern_bestaetigen(token=None):
	"""Link aus der E-Mail an die neue Adresse einlösen → Anmeldeadresse wechselt (öffentlich, nur API-Nutzer)."""
	api_pruefen()
	t = v.text(token, 200)
	neu = frappe.db.get_value("Plattform Token", {"hash": sha256(t), "art": "email_neu"}, "neue_email") if len(t) >= 20 else None
	konto = token_einloesen("email_neu", token)
	neu = v.email(neu)
	if not neu:
		ungueltig("Der Link ist ungültig oder abgelaufen.")
	if _email_vergeben(neu, ausser=konto.name):
		konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto.")
	alt = konto.email
	_user_umbenennen(konto.user, neu)
	konto.reload()
	konto.email = neu
	konto.user = neu
	konto.email_bestaetigt = 1
	konto.save(ignore_permissions=True)
	s.mail_senden(
		alt,
		konto.vorname,
		"Ihre Anmeldeadresse wurde geändert – ÖkoInvest",
		f"Die Anmeldeadresse Ihres Kontos wurde auf {neu} geändert. An diese Adresse senden wir keine Nachrichten mehr.",
		"/login",
		"Zur Anmeldung",
		"Das waren nicht Sie? Bitte wenden Sie sich umgehend über das Kontaktformular an uns.",
	)
	verknuepfen(konto)
	konto.reload()
	protokoll(frappe._dict(id=konto.name), "email_aendern", "nutzer", konto.name, f"Anmeldeadresse geändert: {alt} → {neu}")
	return konto_json(konto)


# ================================================================ DSGVO: Datenexport (Art. 15/20), Konto löschen (Art. 17)

INTERN = ("zustaendigId", "description", "kaeuferInteresseId", "kaufpreis")


def _ohne(o, felder):
	return {k: w for k, w in (o or {}).items() if k not in felder}


def _verlauf(doc, konto_id):
	return [
		{"status": e["status"], "am": e["am"], "von": "Sie" if e["vonId"] == konto_id else "ÖkoInvest" if e["vonRolle"] == "admin" else "System", "kommentar": e["kommentar"]}
		for e in verlauf_json(doc)
	]


@frappe.whitelist(methods=["POST"])
def daten_export(als_benutzer=None):
	"""Datenexport: ausschließlich Daten, die das Konto selbst betreffen – eigene Stammdaten, eigene Objekte, eigene
	Nachrichten-Threads, eigene Aktivitäten. Keine Geheimnisse (Passwort-Hash, 2FA-Schlüssel, Token, Hashes),
	keine internen Notizen, keine personenbezogenen Daten Dritter."""
	from oekoinvest_app.plattform.ausgabe import flaeche_json, interesse_json, projekt_json, vorgang_json

	n = nutzer(als_benutzer)
	konto = _konto(n)
	kid = konto.name

	def docs(dt, feld):
		return [frappe.get_doc(dt, x) for x in frappe.get_all(dt, filters={feld: kid}, pluck="name", order_by="creation asc", limit_page_length=0)]

	vorgaenge = docs("Plattform Vorgang", "nutzer_id")
	flaechen = docs("Plattform Flaeche", "nutzer_id")
	projekte = docs("Plattform Projekt", "anbieter_id")
	interessen = docs("Plattform Interesse", "investor_id")
	bezuege = {f"nutzer:{kid}"}
	for art, liste in (("vorgang", vorgaenge), ("flaeche", flaechen), ("projekt", projekte), ("interesse", interessen)):
		bezuege |= {f"{art}:{x.name}" for x in liste}

	def objekt(json_, doc):
		return {**_ohne(json_, INTERN), "statusVerlauf": _verlauf(doc, kid)}

	def interesse_eigen(i):
		out = interesse_json(i, None)
		out["nda"] = aus_json(i.nda)  # eigener Nachweis (inkl. eigener IP/Browser)
		return out

	z = s.zf(kid)
	z_aktiv = bool(z and cint(z.aktiv))
	nachrichten = []
	dokumente = []
	for art_id in sorted(bezuege):
		art, bid = art_id.split(":", 1)
		for m in frappe.get_all(
			"Plattform Nachricht",
			filters={"bezug_art": art, "bezug_id": bid},
			fields=["name", "am", "von_id", "von_admin", "system", "text"],
			order_by="am asc, creation asc",
			limit_page_length=0,
		):
			von = "Sie" if m.von_id == kid and not cint(m.system) else "System" if cint(m.system) else "ÖkoInvest" if cint(m.von_admin) else "Teammitglied"
			nachrichten.append({"id": m.name, "bezug": art_id, "am": iso(m.am), "von": von, "text": m.text or ""})
	gesehen = set()
	for d in frappe.get_all(
		"Plattform Dokument",
		fields=["name", "bezug_art", "bezug_id", "dateiname", "mime", "groesse", "kategorie", "am", "hochgeladen_von"],
		or_filters=[["hochgeladen_von", "=", kid], ["bezug_id", "in", [b.split(":", 1)[1] for b in bezuege]]],
		order_by="am asc",
		limit_page_length=0,
	):
		b = f"{d.bezug_art}:{d.bezug_id}"
		if d.name in gesehen or (d.hochgeladen_von != kid and b not in bezuege):
			continue
		gesehen.add(d.name)
		dokumente.append({"id": d.name, "bezug": b, "name": d.dateiname, "mime": d.mime, "groesse": cint(d.groesse), "kategorie": d.kategorie, "am": iso(d.am), "vonIhnen": d.hochgeladen_von == kid})

	konto_daten = _ohne(konto_json(konto), ("sitzungVersion",))
	konto_daten["komfort"] = komfort_bereinigen(aus_json(konto.get("komfort")) or {})
	daten = {
		"export": {
			"format": "oekoinvest-datenexport-1",
			"erstelltAm": jetzt_iso(),
			"hinweis": "Auskunft über Ihre personenbezogenen Daten (Art. 15 DSGVO) in einem maschinenlesbaren Format (Art. 20 DSGVO). Dateien des Datenraums sind als Metadaten enthalten und im Portal abrufbar.",
		},
		"konto": konto_daten,
		"sicherheit": {
			"zweiFaktor": {
				"aktiv": z_aktiv,
				"aktiviertAm": iso(z.aktiviert_am) if z else None,
				"wiederherstellungscodesUebrig": len(aus_json(z.codes, []) or []) if z_aktiv else 0,
			},
			"sitzungen": [
				{
					"id": x.name,
					"erstelltAm": iso(x.creation),
					"ablauf": iso(x.ablauf),
					"letzteAktivitaet": iso(x.letzte_aktivitaet),
					"ipGrob": x.ip_grob or "",
					"ort": x.ort or "",
					"userAgent": x.user_agent or "",
					"geraet": x.geraet or "",
					"mobil": bool(cint(x.mobil)),
					"methode": x.methode or "",
					"zweiFaktor": bool(cint(x.zwei_faktor)),
					"organisationId": x.organisation_id or None,
					"widerrufenAm": iso(x.widerrufen_am),
					"widerrufenGrund": x.widerrufen_grund or None,
				}
				for x in frappe.get_all("Plattform Sitzung", filters={"nutzer_id": kid}, fields=["*"], order_by="creation asc", limit_page_length=0)
			],
			"geraete": [
				{
					"id": g.name,
					"label": g.label or "",
					"mobil": bool(cint(g.mobil)),
					"ersteAnmeldung": iso(g.erste_anmeldung),
					"letzteAnmeldung": iso(g.letzte_anmeldung),
					"vertrautBis": iso(g.vertraut_bis),
				}
				for g in frappe.get_all("Plattform Geraet", filters={"nutzer_id": kid}, fields=["name", "label", "mobil", "erste_anmeldung", "letzte_anmeldung", "vertraut_bis"], limit_page_length=0)
			],
			"anmeldungen": [
				{"id": a.name, "email": a.email or "", "am": iso(a.am), "ok": bool(cint(a.ok)), "methode": a.methode or "", "grund": a.grund or "", "ipGrob": a.ip_grob or "", "ort": a.ort or "", "geraet": a.geraet or ""}
				for a in frappe.get_all(
					"Plattform Anmeldung",
					filters={"nutzer_id": kid},
					fields=["name", "email", "am", "ok", "methode", "grund", "ip_grob", "ort", "geraet"],
					order_by="am asc",
					limit_page_length=0,
				)
			],
		},
		"organisationen": [
			{
				"organisation": frappe.db.get_value("Plattform Organisation", m.organisation_id, "titel") or m.organisation_id,
				"art": frappe.db.get_value("Plattform Organisation", m.organisation_id, "art") or "",
				"rolle": team_rolle_label(m.rolle),
				"seit": iso(m.seit),
			}
			for m in frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": kid}, fields=["organisation_id", "rolle", "seit"], limit_page_length=0)
		],
		"vorgaenge": [objekt(vorgang_json(x), x) for x in vorgaenge],
		"flaechen": [objekt(flaeche_json(x), x) for x in flaechen],
		"projekte": [objekt(projekt_json(x), x) for x in projekte],
		"interessen": [objekt(interesse_eigen(x), x) for x in interessen],
		"provisionen": [
			{"id": p.name, "projektId": p.projekt_id, "satz": p.satz, "betrag": p.betrag, "status": p.status, "erstelltAm": iso(p.creation)}
			for p in frappe.get_all("Plattform Provision", filters={"anbieter_id": kid}, fields=["name", "projekt_id", "satz", "betrag", "status", "creation"], limit_page_length=0)
		],
		"nachrichten": nachrichten,
		"dokumente": dokumente,
		"benachrichtigungen": [
			{
				"id": b.name,
				"art": b.art,
				"titel": b.titel or "",
				"text": b.text or "",
				"link": b.link or "",
				"objektArt": b.objekt_art or None,
				"objektId": b.objekt_id or None,
				"am": iso(b.am),
				"gelesen": bool(cint(b.gelesen)),
				"mail": bool(cint(b.mail)),
			}
			for b in frappe.get_all(
				"Plattform Benachrichtigung",
				filters={"nutzer_id": kid},
				fields=["name", "art", "titel", "text", "link", "objekt_art", "objekt_id", "am", "gelesen", "mail"],
				order_by="am asc",
				limit_page_length=0,
			)
		],
		"einladungen": [
			{
				"organisation": frappe.db.get_value("Plattform Organisation", e.organisation_id, "titel") or "",
				"rolle": team_rolle_label(e.rolle),
				"status": e.status,
				"erstelltAm": iso(e.creation),
			}
			for e in frappe.get_all("Plattform Einladung", filters={"email": konto.email}, fields=["organisation_id", "rolle", "status", "creation"], limit_page_length=0)
		],
		"aktivitaeten": [
			{"id": a.name, "am": iso(a.am), "aktion": a.aktion, "objektArt": a.objekt_art, "objektId": a.objekt_id, "text": a.text or "", "ip": a.ip or ""}
			for a in frappe.get_all(
				"Plattform Aktivitaet",
				filters={"nutzer_id": kid},
				fields=["name", "am", "aktion", "objekt_art", "objekt_id", "text", "ip"],
				order_by="am asc",
				limit_page_length=0,
			)
		],
	}
	protokoll(n, "datenexport", "nutzer", kid, "Datenexport (Art. 15/20 DSGVO) heruntergeladen")
	return daten


def _entwurf_loeschen(dt, art, name):
	"""Entwurf samt Nachrichten und Dokumenten (Dateien) löschen; Verweise aus Vorgängen lösen."""
	for d in frappe.get_all("Plattform Dokument", filters={"bezug_art": art, "bezug_id": name}, fields=["name", "datei_id"], limit_page_length=0):
		if d.datei_id and frappe.db.exists("File", d.datei_id):
			frappe.delete_doc("File", d.datei_id, ignore_permissions=True, force=True)
		frappe.delete_doc("Plattform Dokument", d.name, ignore_permissions=True, force=True)
	frappe.db.delete("Plattform Nachricht", {"bezug_art": art, "bezug_id": name})
	if art == "flaeche":
		for vg in frappe.get_all("Plattform Vorgang", filters={"flaeche_id": name}, pluck="name", limit_page_length=0):
			frappe.db.set_value("Plattform Vorgang", vg, "flaeche_id", None, update_modified=False)
	frappe.delete_doc(dt, name, ignore_permissions=True, force=True)


def _organisation_aufloesen(org_id):
	"""Organisation entfällt: Objekte werden wieder persönlich, Einladungen/Mitgliedschaften/Sitzungskontext entfallen."""
	for dt in ("Plattform Flaeche", "Plattform Projekt", "Plattform Interesse"):
		frappe.db.sql(f"update `tab{dt}` set organisation_id = null where organisation_id = %s", (org_id,))
	frappe.db.sql("update `tabPlattform Sitzung` set organisation_id = null where organisation_id = %s", (org_id,))
	frappe.db.delete("Plattform Einladung", {"organisation_id": org_id})
	frappe.db.delete("Plattform Mitgliedschaft", {"organisation_id": org_id})
	frappe.delete_doc("Plattform Organisation", org_id, ignore_permissions=True, force=True)


@frappe.whitelist(methods=["POST"])
def konto_loeschen(passwort=None, bestaetigung=None, als_benutzer=None):
	"""Konto löschen: Passwort + Bestätigung „LÖSCHEN“. Das Konto wird anonymisiert und gesperrt, Sitzungen, Geräte,
	2FA, Token, Benachrichtigungen und Mitgliedschaften entfallen, Entwürfe ohne Organisation werden gelöscht.
	Unterlagen mit Aufbewahrungspflicht (Provisionen, NDA-/Einwilligungsnachweise, Vorgänge) bleiben – ohne Zugang –
	bis zum Fristablauf erhalten; das Backoffice wird informiert."""
	from oekoinvest_app.plattform import benachrichtigung
	from oekoinvest_app.plattform.benachrichtigung import aktive_admins

	n = nutzer(als_benutzer)
	v.pflicht(str(bestaetigung or "").strip().upper() in ("LÖSCHEN", "LOESCHEN"), "Bitte bestätigen Sie mit dem Wort LÖSCHEN.")
	konto = _konto(n)
	_passwort_noetig(konto, passwort)
	kid = konto.name
	admins = aktive_admins()
	if "admin" in konto_rollen(konto) and len(admins) <= 1:
		konflikt("Das letzte Backoffice-Konto kann nicht gelöscht werden.")
	eigene = frappe.get_all("Plattform Mitgliedschaft", filters={"nutzer_id": kid}, fields=["name", "organisation_id", "rolle"], limit_page_length=0)
	inhaber = [m for m in eigene if m.rolle == "inhaber"]
	for m in inhaber:
		if frappe.db.count("Plattform Mitgliedschaft", {"organisation_id": m.organisation_id, "nutzer_id": ("!=", kid)}):
			konflikt("Sie sind Inhaber einer Organisation mit weiteren Mitgliedern. Bitte übertragen Sie zuerst die Inhaberschaft.")
	# Organisationen, in denen das Konto allein ist, entfallen (Objekte werden wieder persönlich)
	for m in inhaber:
		_organisation_aufloesen(m.organisation_id)
	frappe.db.delete("Plattform Mitgliedschaft", {"nutzer_id": kid})

	entwuerfe_f = frappe.get_all("Plattform Flaeche", filters={"nutzer_id": kid, "status": "entwurf", "organisation_id": ("is", "not set")}, pluck="name", limit_page_length=0)
	entwuerfe_p = frappe.get_all("Plattform Projekt", filters={"anbieter_id": kid, "status": "entwurf", "organisation_id": ("is", "not set")}, pluck="name", limit_page_length=0)
	for f in entwuerfe_f:
		_entwurf_loeschen("Plattform Flaeche", "flaeche", f)
	for p in entwuerfe_p:
		_entwurf_loeschen("Plattform Projekt", "projekt", p)

	alte_email = konto.email
	frappe.db.delete("Plattform Einladung", {"email": alte_email})
	frappe.db.delete("Plattform Zwei Faktor", {"nutzer_id": kid})
	delete_all_passwords_for("Plattform Zwei Faktor", kid)
	frappe.db.delete("Plattform Sitzung", {"nutzer_id": kid})
	frappe.db.delete("Plattform Geraet", {"nutzer_id": kid})
	frappe.db.delete("Plattform Anmeldung", {"nutzer_id": kid})
	frappe.db.delete("Plattform Token", {"nutzer_id": kid})
	frappe.db.delete("Plattform Benachrichtigung", {"nutzer_id": kid})

	# Anonymisieren: Frappe-User umbenennen (E-Mail = User.name), Passwort entfernen, deaktivieren
	neu = f"geloescht-{kid.lower()}@geloescht.invalid"
	alter_user = konto.user
	_user_umbenennen(alter_user, neu)
	delete_all_passwords_for("User", neu)  # Anmeldung mit Passwort unmöglich
	konto.reload()
	konto.update(
		{
			"email": neu,
			"user": neu,
			"vorname": "Gelöschtes",
			"nachname": "Konto",
			"firma": "",
			"telefon": "",
			"aktiv": 0,
			"email_bestaetigt": 0,
			"suchprofil": None,
			"komfort": None,
			"mail_einstellungen": None,
			"fehlversuche": 0,
			"gesperrt_bis": None,
			"geloescht_am": jetzt(),
		}
	)
	konto.save(ignore_permissions=True)  # aktiv 1 → 0 erhöht die Sitzungsversion, User wird deaktiviert (Controller)
	if frappe.db.get_value("User", neu, "enabled"):
		frappe.db.set_value("User", neu, "enabled", 0, update_modified=False)
	if frappe.session.user == alter_user:
		frappe.set_user(neu)  # der bisherige User-Name existiert nicht mehr

	anzahl = len(entwuerfe_f) + len(entwuerfe_p)
	for a in admins:
		if a == kid:
			continue
		benachrichtigung.anlegen(
			a,
			"status",
			"Konto gelöscht",
			f"Konto {kid} wurde auf eigenen Wunsch gelöscht ({anzahl} Entwürfe entfernt). Offene Vorgänge bitte prüfen.",
			"/portal/admin/nutzer",
			"nutzer",
			kid,
			mail=False,
		)
	protokoll(frappe._dict(id=kid), "konto_geloescht", "nutzer", kid, f"Konto gelöscht (anonymisiert), {len(entwuerfe_f)} Flächen- und {len(entwuerfe_p)} Projekt-Entwürfe entfernt")
	return {"ok": True}
