# Copyright (c) 2026, ÖkoInvest GmbH
#
# Login, Sicherheit & Konto – Helfer (Port von src/lib/plattform/backend/demo/sicherheit.js):
#  - Kontosperre mit exponentiellem Backoff (Felder fehlversuche/gesperrt_bis am Konto; unbekannte Adressen im Cache,
#    damit das Sperrverhalten keine Konten verrät)
#  - Anmeldehistorie (Plattform Anmeldung, append-only), Sitzungsprüfung, Anreicherung des Nutzers
#  - Pflicht-2FA je Rolle (Default „oekoinvest_2fa_pflicht“ ∪ site_config „plattform_2fa_pflicht“)
#  - Sicherheitsmeldungen: Glocke + E-Mail IMMER (unabhängig von Benachrichtigungs-Einstellungen und Komfort)
#  - Aufräumjob (hooks.scheduler_events.daily)
#
# Die Methoden selbst: plattform/api/sicherheit.py.

import math
import secrets

import frappe
from frappe.utils import add_days, add_to_date, cint, get_datetime, now_datetime

from oekoinvest_app.plattform import mail as plattform_mail
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.geraet import geraet_aus_user_agent, ip_grob, ort_grob
from oekoinvest_app.plattform.kern import aus_json, iso, jetzt, konto_json, konto_rollen, sha256
from oekoinvest_app.plattform.konstanten import ALLE_ROLLEN_IDS, SPERRE

HINWEIS_SICHERHEIT = "Das waren nicht Sie? Ändern Sie sofort Ihr Passwort und beenden Sie unter „Sicherheit“ alle Sitzungen."
AKTIVITAET_S = 60
PFLICHT_DEFAULT = "oekoinvest_2fa_pflicht"
SPERRE_CACHE = "oekoinvest_anmeldesperre:"

# ================================================================ Pflicht-2FA


def pflicht_gespeichert():
	return v.mehrfach(aus_json(frappe.db.get_default(PFLICHT_DEFAULT), []) or [], ALLE_ROLLEN_IDS)


def pflicht_umgebung():
	wert = frappe.conf.get("plattform_2fa_pflicht") or ""
	teile = wert if isinstance(wert, list) else str(wert).split(",")
	return [r for r in dict.fromkeys(str(x).strip() for x in teile) if r in ALLE_ROLLEN_IDS]


def pflicht_rollen():
	"""Rollen mit Pflicht zur Zwei-Faktor-Anmeldung (Einstellung im Backoffice ∪ site_config)."""
	return list(dict.fromkeys([*pflicht_gespeichert(), *pflicht_umgebung()]))


def pflicht_fuer(rollen):
	p = pflicht_rollen()
	return any(r in (rollen or []) for r in p)


# ================================================================ Zwei Faktor – Datensatz


def zf(nutzer_id):
	"""Plattform Zwei Faktor des Kontos (Dokument) oder None."""
	if not nutzer_id:
		return None
	name = frappe.db.get_value("Plattform Zwei Faktor", {"nutzer_id": nutzer_id}, "name")
	return frappe.get_doc("Plattform Zwei Faktor", name) if name else None


def zf_aktiv(nutzer_id):
	return bool(nutzer_id) and bool(cint(frappe.db.get_value("Plattform Zwei Faktor", {"nutzer_id": nutzer_id}, "aktiv")))


def mit_zwei_faktor(konto):
	"""Konto-JSON + zweiFaktorAktiv (steuert den zweiten Schritt der Anmeldung)."""
	out = konto_json(konto)
	out["zweiFaktorAktiv"] = zf_aktiv(konto.name)
	return out


# ================================================================ Sicherheitsmeldungen & E-Mails


def mail_senden(empfaenger, vorname, betreff, text, pfad, link_text, hinweis="", fallback=None, sicherheit=True):
	"""E-Mail der Vorlage oekoinvest_sicherheit (Link = plattform_basis_url + pfad; developer_mode: fallback).

	Wird unabhängig von Benachrichtigungs-Einstellungen und Konto-Komfort versendet. Ohne Basis-URL keine Mail.
	"""
	basis = plattform_mail.basis_url(fallback)
	if not basis:
		frappe.log_error(title="ÖkoInvest: plattform_basis_url fehlt", message="Sicherheits-E-Mail nicht versendet.")
		return False
	return plattform_mail._senden(
		empfaenger,
		betreff,
		"oekoinvest_sicherheit",
		{
			"vorname": vorname or "",
			"text": text,
			"link": f"{basis}{pfad or '/portal'}",
			"link_text": link_text or "Zum Portal",
			"hinweis": hinweis or "",
			"sicherheit": 1 if sicherheit else 0,
			"basis": basis,
		},
	)


def melden(konto, titel, text, betreff, mail_text=None, glocke=True):
	"""Sicherheitsmeldung: Glocke (Art „sicherheit“, ohne Benachrichtigungs-Mail) + Sicherheits-E-Mail (immer)."""
	if not konto:
		return
	if glocke:
		from oekoinvest_app.plattform import benachrichtigung

		benachrichtigung.anlegen(konto.name, "sicherheit", titel, text, "/portal/sicherheit", "nutzer", konto.name, mail=False)
	mail_senden(konto.email, konto.vorname, betreff, mail_text or text, "/portal/sicherheit", "Sicherheit prüfen", HINWEIS_SICHERHEIT)


# ================================================================ Anmeldehistorie


def historie(konto=None, email="", ok=False, methode="passwort", grund="", ip="", user_agent="", land=""):
	g = geraet_aus_user_agent(user_agent)
	frappe.get_doc(
		{
			"doctype": "Plattform Anmeldung",
			"nutzer_id": konto.name if konto else None,
			"email": v.text(email or (konto.email if konto else ""), 190),
			"am": jetzt(),
			"ok": 1 if ok else 0,
			"methode": v.text(methode, 60),
			"grund": v.text(grund, 60),
			"ip_grob": ip_grob(v.text(ip, 64)),
			"ort": ort_grob(v.text(ip, 64), v.text(land, 2)),
			"geraet": g["label"],
		}
	).insert(ignore_permissions=True)


# ================================================================ Kontosperre (exponentieller Backoff)


def sperr_dauer(fehl):
	"""Wartezeit in Sekunden nach `fehl` Fehlversuchen (0 = keine Sperre)."""
	if fehl < SPERRE["schwelle"]:
		return 0
	return min(SPERRE["maxSekunden"], SPERRE["basisSekunden"] * 2 ** (fehl - SPERRE["schwelle"]))


def sperr_text(sek):
	minuten = math.ceil(sek / 60)
	dauer = f"{sek} Sekunden" if sek < 60 else f"{minuten} Minute{'' if minuten == 1 else 'n'}"
	return (
		"Zu viele fehlgeschlagene Anmeldeversuche. Das Konto ist vorübergehend gesperrt – "
		f"bitte versuchen Sie es in {dauer} erneut oder melden Sie sich per E-Mail-Link an."
	)


def _cache():
	return frappe.cache()


def _sperre_lesen(email, konto):
	if konto:
		werte = frappe.db.get_value("Plattform Konto", konto.name, ["fehlversuche", "gesperrt_bis"], as_dict=True) or {}
		return cint(werte.get("fehlversuche")), (get_datetime(werte.get("gesperrt_bis")) if werte.get("gesperrt_bis") else None)
	if not email:
		return 0, None
	s = _cache().get_value(SPERRE_CACHE + sha256(email)) or {}
	return cint(s.get("fehl")), (get_datetime(s.get("bis")) if s.get("bis") else None)


def _sperre_schreiben(email, konto, fehl, bis):
	if konto:
		frappe.db.set_value("Plattform Konto", konto.name, {"fehlversuche": fehl, "gesperrt_bis": bis}, update_modified=False)
	elif email:
		_cache().set_value(SPERRE_CACHE + sha256(email), {"fehl": fehl, "bis": str(bis) if bis else None}, expires_in_sec=86400)


def sperre_pruefen(email, konto=None):
	"""Wirft TooManyRequestsError (HTTP 429), solange die Adresse bzw. das Konto gesperrt ist."""
	_, bis = _sperre_lesen(email, konto)
	if not bis:
		return
	rest = math.ceil((bis - now_datetime()).total_seconds())
	if rest > 0:
		frappe.throw(sperr_text(rest), frappe.TooManyRequestsError)


def sperre_zuruecksetzen(email, konto=None):
	_sperre_schreiben(email, konto, 0, None)


def fehlversuch_buchen(email, konto=None, ip="", user_agent="", land="", grund="passwort"):
	"""Fehlversuch zählen (Passwort oder 2FA-Code) – ab der Schwelle wächst die Sperre exponentiell."""
	if email:
		fehl, _ = _sperre_lesen(email, konto)
		fehl += 1
		dauer = sperr_dauer(fehl)
		bis = add_to_date(now_datetime(), seconds=dauer) if dauer else None
		_sperre_schreiben(email, konto, fehl, bis)
		if konto and dauer and fehl == SPERRE["schwelle"]:
			melden(
				konto,
				"Konto vorübergehend gesperrt",
				f"{SPERRE['schwelle']} fehlgeschlagene Anmeldeversuche – die Anmeldung ist kurz gesperrt.",
				"Mehrere fehlgeschlagene Anmeldeversuche – ÖkoInvest",
				f"Für Ihr Konto gab es {SPERRE['schwelle']} fehlgeschlagene Anmeldeversuche. Die Anmeldung ist deshalb vorübergehend gesperrt; "
				"jede weitere Fehleingabe verlängert die Sperre. Über den E-Mail-Link auf der Anmeldeseite kommen Sie jederzeit in Ihr Konto.",
			)
	if konto:
		historie(konto, email, False, "zwei-faktor" if grund == "2fa" else "passwort", grund, ip, user_agent, land)


def festschreiben():
	"""Vor einem Fehler (Rollback der Anfrage) Zähler/Historie dauerhaft speichern – nicht in Tests."""
	if not frappe.flags.in_test:
		frappe.db.commit()


# ================================================================ Sitzungen


def sitzung_gueltig(s, konto):
	return (
		bool(s)
		and s.nutzer_id == konto.name
		and not s.widerrufen_am
		and bool(s.ablauf)
		and get_datetime(s.ablauf) > now_datetime()
		and cint(s.version) == cint(konto.sitzung_version)
	)


def aktive_sitzungen(konto):
	"""Gültige Sitzungen eines Kontos (nicht widerrufen, nicht abgelaufen, aktuelle Version)."""
	return frappe.get_all(
		"Plattform Sitzung",
		filters={"nutzer_id": konto.name, "widerrufen_am": ("is", "not set"), "ablauf": (">", now_datetime()), "version": cint(konto.sitzung_version)},
		fields=["*"],
		order_by="letzte_aktivitaet desc",
		limit_page_length=0,
	)


def widerrufen(sitzung_name, grund):
	frappe.db.set_value("Plattform Sitzung", sitzung_name, {"widerrufen_am": jetzt(), "widerrufen_grund": grund}, update_modified=False)


def aktivitaet_merken(s):
	"""Letzte Aktivität höchstens einmal pro Minute schreiben."""
	if not s.letzte_aktivitaet or (now_datetime() - get_datetime(s.letzte_aktivitaet)).total_seconds() > AKTIVITAET_S:
		frappe.db.set_value("Plattform Sitzung", s.name, "letzte_aktivitaet", jetzt(), update_modified=False)


def nutzer_anreichern(konto, s=None):
	"""Konto um Sitzung, Organisation, 2FA-Status und Komfort ergänzen (wie nutzerAnreichern)."""
	from oekoinvest_app.plattform.organisation import komfort_bereinigen, organisationen_von

	orgs = organisationen_von(konto.name)
	org = None
	if s and s.get("organisation_id"):
		org = next((o for o in orgs if o["id"] == s.organisation_id), None)
	aktiv = zf_aktiv(konto.name)
	pflicht = pflicht_fuer(konto_rollen(konto))
	out = konto_json(konto)
	out.update(
		{
			"sitzung": {"id": s.name, "organisationId": org["id"] if org else None, "zweiFaktor": bool(cint(s.zwei_faktor))} if s else None,
			"organisation": org,
			"organisationen": orgs,
			"zweiFaktorAktiv": aktiv,
			"zweiFaktorPflicht": pflicht,
			"zweiFaktorPflichtOffen": pflicht and not aktiv,
			"komfort": komfort_bereinigen(aus_json(konto.get("komfort")) or {}),
		}
	)
	if org:
		# Im Organisationskontext gilt das Team-Suchprofil
		out["suchprofilPersoenlich"] = out.get("suchprofil")
		out["suchprofil"] = aus_json(frappe.db.get_value("Plattform Organisation", org["id"], "suchprofil"))
	return out


# ================================================================ Einmal-Token mit Minuten / neuer Adresse


def token_anlegen(art, konto_id, minuten, neue_email=None):
	"""Wie kern.token_anlegen, aber Laufzeit in Minuten und optional neue E-Mail-Adresse (Art email_neu)."""
	frappe.db.delete("Plattform Token", {"nutzer_id": konto_id, "art": art, "benutzt": 0})
	token = secrets.token_urlsafe(32)
	frappe.get_doc(
		{
			"doctype": "Plattform Token",
			"hash": sha256(token),
			"art": art,
			"nutzer_id": konto_id,
			"ablauf": add_to_date(now_datetime(), minutes=minuten),
			"benutzt": 0,
			"neue_email": neue_email or None,
		}
	).insert(ignore_permissions=True)
	return token


# ================================================================ Ausgabe-Helfer


def status_von(konto_id, rollen):
	"""2FA-Status für die Sicherheitsseite."""
	z = zf(konto_id)
	aktiv = bool(z and cint(z.aktiv))
	vertraute = 0
	if aktiv:
		vertraute = frappe.db.count(
			"Plattform Geraet",
			{"nutzer_id": konto_id, "vertraut_bis": (">", now_datetime()), "zwei_faktor_version": cint(z.version)},
		)
	return {
		"aktiv": aktiv,
		"aktiviertAm": iso(z.aktiviert_am) if z else None,
		"codesUebrig": len(aus_json(z.codes, []) or []) if aktiv else 0,
		"pflicht": pflicht_fuer(rollen),
		"einrichtungLaeuft": bool(z and z.ausstehend_am and not aktiv),
		"vertrauteGeraete": vertraute,
	}


def geraet_vertraut_pruefen(konto_id, geraet_hash):
	z = zf(konto_id)
	if not z or not cint(z.aktiv):
		return False
	g = frappe.db.get_value("Plattform Geraet", {"nutzer_id": konto_id, "hash": geraet_hash}, ["vertraut_bis", "zwei_faktor_version"], as_dict=True)
	return bool(g and g.vertraut_bis and get_datetime(g.vertraut_bis) > now_datetime() and cint(g.zwei_faktor_version) == cint(z.version))


# ================================================================ Aufräumjob (täglich)


def aufraeumen():
	"""Abgelaufene/widerrufene Sitzungen > 30 Tage, abgelaufene Einladungen > 30 Tage, Anmeldehistorie > 180 Tage löschen."""
	grenze = add_days(now_datetime(), -30)
	frappe.db.delete("Plattform Sitzung", {"widerrufen_am": ("<", grenze)})
	frappe.db.delete("Plattform Sitzung", {"ablauf": ("<", grenze)})
	frappe.db.delete("Plattform Einladung", {"ablauf": ("<", grenze)})
	# offene, aber abgelaufene Einladungen sind im Portal als „abgelaufen“ sichtbar, bis sie hier entfallen
	frappe.db.delete("Plattform Anmeldung", {"am": ("<", add_days(now_datetime(), -180))})
	frappe.db.commit()
