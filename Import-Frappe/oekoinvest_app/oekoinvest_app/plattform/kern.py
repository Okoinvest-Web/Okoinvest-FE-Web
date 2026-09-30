# Copyright (c) 2026, ÖkoInvest GmbH
#
# Kern der Plattform-API: Aufrufer prüfen, im Namen eines Nutzers handeln, Rechte, Zeit/Kennungen,
# Protokoll (Aktivität), System-Nachrichten und Statusverlauf.
#
# Sicherheitsmodell (docs/API.md, Abschnitt 1):
#  1. Jede Methode verlangt zuerst die Rolle „ÖkoInvest API“ beim Aufrufer (technischer API-Benutzer der Website).
#  2. `als_benutzer` (Konto-ID `U-…` oder E-Mail) wird nur dann ausgewertet; die Methode wechselt per
#     frappe.set_user() in den Frappe-User des Kontos und prüft danach Rolle UND Eigentum selbst.
#  3. Die fachlichen Rollen/API-Rolle haben KEINE DocType-Rechte – Daten werden ausschließlich hier
#     (mit ignore_permissions nach eigener Prüfung) gelesen und geschrieben. /api/resource liefert nichts.

import hashlib
import json
import secrets
from datetime import timezone
from zoneinfo import ZoneInfo

import frappe
from frappe.utils import add_to_date, cint, get_datetime, get_system_timezone, now_datetime

from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.konstanten import BEZUG_ARTEN, DOCTYPE, PRAEFIX, ROLLE_API

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # ohne 0/O/1/I

# ================================================================ Fehler (deutsch, für Endnutzer)


def nicht_angemeldet():
	frappe.throw("Bitte melden Sie sich an.", frappe.AuthenticationError)


def verboten(text="Dafür fehlt Ihnen die Berechtigung."):
	frappe.throw(text, frappe.PermissionError)


def nicht_gefunden(text="Nicht gefunden."):
	frappe.throw(text, frappe.DoesNotExistError)


def ungueltig(text):
	frappe.throw(text, frappe.ValidationError)


def konflikt(text):
	frappe.throw(text, frappe.DuplicateEntryError)


# ================================================================ Zeit, Kennungen, JSON


def jetzt():
	return now_datetime()


def iso(wert):
	"""Datetime (Systemzeitzone, naiv) → ISO 8601 in UTC mit Millisekunden, z. B. 2026-09-29T05:57:00.000Z."""
	if not wert:
		return None
	dt = get_datetime(wert)
	if dt.tzinfo is None:
		dt = dt.replace(tzinfo=ZoneInfo(get_system_timezone() or "UTC"))
	dt = dt.astimezone(timezone.utc)
	return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def jetzt_iso():
	return iso(jetzt())


def neue_id(doctype, laenge=6):
	"""Kennung wie V-26-7KQ2XM (Präfix, Jahr, 6 zufällige Zeichen ≈ 30 Bit) – nicht erratbar/aufzählbar."""
	praefix = PRAEFIX[doctype]
	jahr = now_datetime().strftime("%y")
	for _ in range(25):
		name = f"{praefix}-{jahr}-" + "".join(secrets.choice(ALPHABET) for _ in range(laenge))
		if not frappe.db.exists(doctype, name):
			return name
	frappe.throw("Kennung konnte nicht erzeugt werden.")


def als_json(wert):
	return None if wert is None else json.dumps(wert, ensure_ascii=False, separators=(",", ":"))


def aus_json(wert, standard=None):
	if wert is None or wert == "":
		return standard
	if isinstance(wert, (dict, list)):
		return wert
	try:
		return json.loads(wert)
	except (TypeError, ValueError):
		return standard


def sha256(daten):
	if isinstance(daten, str):
		daten = daten.encode("utf-8")
	return hashlib.sha256(daten).hexdigest()


def zahl_oder_null(wert):
	"""Float/Currency-Spalten sind in MariaDB NOT NULL DEFAULT 0 – 0 bedeutet hier „nicht angegeben“."""
	if wert in (None, ""):
		return None
	n = float(wert)
	if n == 0:
		return None
	return int(n) if n.is_integer() else n


def in_stunden(stunden):
	return add_to_date(now_datetime(), hours=stunden)


# ================================================================ Aufrufer & Nutzer


def api_pruefen():
	"""Nur der technische API-Benutzer (Rolle „ÖkoInvest API“) darf die Plattform-Methoden aufrufen."""
	if frappe.session.user == "Guest" or ROLLE_API not in frappe.get_roles(frappe.session.user):
		frappe.throw("Nicht berechtigt.", frappe.PermissionError)


def konto_suchen(kennung_oder_email):
	"""Plattform Konto per Kennung (U-…) oder E-Mail – oder None."""
	k = v.text(kennung_oder_email, 190)
	if not k:
		return None
	name = v.kennung(k)
	if name and frappe.db.exists("Plattform Konto", name):
		return frappe.get_doc("Plattform Konto", name)
	e = v.email(k)
	if e:
		name = frappe.db.get_value("Plattform Konto", {"email": e}, "name")
		if name:
			return frappe.get_doc("Plattform Konto", name)
	return None


def konto_rollen(konto):
	return [r.rolle for r in (konto.get("rollen") or []) if r.rolle]


def konto_json(konto):
	"""Konto ohne Geheimnisse – Form wie das Nutzer-Objekt des Demo-Backends."""
	if not konto:
		return None
	return {
		"id": konto.name,
		"email": konto.email,
		"vorname": konto.vorname or "",
		"nachname": konto.nachname or "",
		"firma": konto.firma or "",
		"telefon": konto.telefon or "",
		"rollen": konto_rollen(konto),
		"sitzungVersion": cint(konto.sitzung_version),
		"aktiv": bool(cint(konto.aktiv)),
		"emailBestaetigt": bool(cint(konto.email_bestaetigt)),
		"erstelltAm": iso(konto.creation),
		"letzterLogin": iso(konto.letzter_login),
		"suchprofil": aus_json(konto.suchprofil),
		"mailEinstellungen": aus_json(konto.get("mail_einstellungen")),
		"backofficeRollen": [r for r in str(konto.get("backoffice_rollen") or "").split(",") if r] or None,  # Backoffice-Unterrollen (plattform/rechte.py)
		"komfort": aus_json(konto.get("komfort")),
	}


def nutzer(als_benutzer, pflicht=True, als_organisation=None):
	"""API-Aufrufer prüfen und in den genannten Nutzer wechseln.

	Liefert den Nutzer (frappe._dict im camelCase-Format, `n` in allen Methoden) oder None,
	wenn `pflicht=False` und kein Nutzer genannt ist. Unbekannte/gesperrte Konten → 401.
	`n.organisation` = aktive Organisation {id, name, art, rolle} aus `als_organisation` (sendet die Website bei
	jedem Aufruf mit Nutzer; Methoden müssen es nicht deklarieren – gelesen aus frappe.form_dict) bzw. None,
	wenn keine Mitgliedschaft besteht (still, kein Fehler).
	"""
	api_pruefen()
	if not als_benutzer:
		if pflicht:
			nicht_angemeldet()
		return None
	konto = konto_suchen(als_benutzer)
	if not konto or not cint(konto.aktiv) or konto.user in ("Administrator", "Guest"):
		nicht_angemeldet()
	if ROLLE_API in frappe.get_roles(konto.user) or "System Manager" in frappe.get_roles(konto.user):
		# Konten mit technischen/administrativen Frappe-Rollen werden nie über die Website gesteuert.
		verboten("Dieses Konto kann nicht über die Website verwendet werden.")
	frappe.set_user(konto.user)
	n = frappe._dict(konto_json(konto))
	if als_organisation is None:
		als_organisation = (getattr(frappe.local, "form_dict", None) or {}).get("als_organisation")
	from oekoinvest_app.plattform.organisation import kontext

	n.organisation = kontext(konto.name, als_organisation) if als_organisation else None
	return n


def ist_admin(n):
	return bool(n) and "admin" in (n.get("rollen") or [])


def hat_rolle(n, rollen):
	return ist_admin(n) or (bool(n) and any(r in (n.get("rollen") or []) for r in rollen))


def rolle_noetig(n, rollen, text):
	if not n:
		nicht_angemeldet()
	if not hat_rolle(n, rollen):
		verboten(text)


def admin_noetig(n):
	if not n:
		nicht_angemeldet()
	if not ist_admin(n):
		verboten("Nur für das Backoffice.")


def kurz(konto_id):
	if not konto_id:
		return None
	k = frappe.db.get_value("Plattform Konto", konto_id, ["name", "vorname", "nachname", "email", "firma"], as_dict=True)
	if not k:
		return None
	return {"id": k.name, "vorname": k.vorname or "", "nachname": k.nachname or "", "email": k.email, "firma": k.firma or ""}


def name_von(konto_id):
	k = kurz(konto_id)
	return " ".join(x for x in (k["vorname"], k["nachname"]) if x) if k else ""


# ================================================================ Objekte & Eigentum


def objekt_laden(art, kennung_):
	"""Dokument zu Objektart + Kennung oder None (unbekannte Art → ValidationError)."""
	dt = DOCTYPE.get(art)
	if not dt:
		ungueltig("Unbekannte Objektart.")
	k = v.kennung(kennung_)
	if not k or not frappe.db.exists(dt, k):
		return None
	return frappe.get_doc(dt, k)


def besitzer(art, o):
	"""Konto-ID des Eigentümers eines Objekts."""
	if not o:
		return None
	if art in ("vorgang", "flaeche"):
		return o.get("nutzer_id") or None
	if art in ("projekt", "provision"):
		return o.get("anbieter_id")
	if art == "interesse":
		return o.get("investor_id")
	if art == "nutzer":
		return o.name
	return None


def darf_bezug(n, art, kennung_, schreiben=False):
	"""Bezug eines Threads/Dokuments laden und Eigentum (oder Admin) prüfen.

	Organisation: Mitglieder sehen Objekte ihres Teams (jede Teamrolle), schreiben ab Teamrolle „Mitglied“.
	"""
	if art not in BEZUG_ARTEN:
		ungueltig("Unbekannter Bezug.")
	o = objekt_laden(art, kennung_)
	if not o:
		nicht_gefunden()
	if ist_admin(n):
		return o
	if besitzer(art, o) != n.id:
		from oekoinvest_app.plattform.organisation import darf_team_lesen_objekt, darf_team_schreiben_objekt

		if not (darf_team_schreiben_objekt(n, o) if schreiben else darf_team_lesen_objekt(n, o)):
			verboten()
	return o


# ================================================================ Protokoll, Verlauf, Nachrichten


def protokoll(n, aktion, objekt_art, objekt_id, text, ip=""):
	"""Aktivität anhängen (append-only, siehe Plattform Aktivitaet)."""
	frappe.get_doc(
		{
			"doctype": "Plattform Aktivitaet",
			"am": jetzt(),
			"nutzer_id": (n.get("id") if n else None) or None,
			"aktion": v.text(aktion, 60),
			"objekt_art": v.text(objekt_art, 40),
			"objekt_id": v.text(objekt_id, 60),
			"text": v.text(text, 300),
			"ip": v.text(ip, 64),
		}
	).insert(ignore_permissions=True)


def verlauf(doc, status, n, rolle, kommentar=""):
	doc.append(
		"status_verlauf",
		{
			"status": status,
			"am": jetzt(),
			"von_id": (n.get("id") if n else None) or None,
			"von_rolle": rolle,
			"kommentar": v.mehrzeilig(kommentar, 1000),
		},
	)


def verlauf_json(doc):
	return [
		{"status": e.status, "am": iso(e.am), "vonId": e.von_id or None, "vonRolle": e.von_rolle, "kommentar": e.kommentar or ""}
		for e in (doc.get("status_verlauf") or [])
	]


def nachricht_anlegen(bezug_art, bezug_id, von_id=None, von_admin=False, system=False, text="", gelesen_nutzer=None, gelesen_admin=None, mail=True, melden=True, ereignis=None):
	"""Nachricht im Thread (bezug_art, bezug_id). Standard wie im Demo-Backend:
	gelesen_nutzer = nicht vom Admin und keine Systemnachricht; gelesen_admin = vom Admin.
	`melden`: Benachrichtigungen (Glocke) für die Seite erzeugen, die die Nachricht noch nicht gelesen hat;
	`mail=False` unterdrückt dabei die E-Mail (z. B. Willkommensnachricht). `ereignis` überschreibt die Art."""
	gn = (not von_admin and not system) if gelesen_nutzer is None else gelesen_nutzer
	ga = bool(von_admin) if gelesen_admin is None else gelesen_admin
	doc = frappe.get_doc(
		{
			"doctype": "Plattform Nachricht",
			"bezug_art": bezug_art,
			"bezug_doctype": DOCTYPE.get(bezug_art),  # vor dem Insert nötig: Dynamic Link wird vor validate() geprüft
			"bezug_id": bezug_id,
			"von_id": von_id or None,
			"von_admin": 1 if von_admin else 0,
			"system": 1 if system else 0,
			"text": v.mehrzeilig(text, 5000),
			"am": jetzt(),
			"gelesen_nutzer": 1 if gn else 0,
			"gelesen_admin": 1 if ga else 0,
		}
	).insert(ignore_permissions=True)
	if melden:
		from oekoinvest_app.plattform import benachrichtigung

		benachrichtigung.aus_nachricht(doc, ereignis=ereignis, mail=mail)
	return doc


# ================================================================ Einmal-Token (E-Mail-Bestätigung, Passwort-Reset)


def token_anlegen(art, konto_id, stunden):
	"""Neues Einmal-Token; gespeichert wird nur der SHA-256-Hash. Offene Tokens gleicher Art verfallen."""
	frappe.db.delete("Plattform Token", {"nutzer_id": konto_id, "art": art, "benutzt": 0})
	token = secrets.token_urlsafe(32)
	frappe.get_doc(
		{"doctype": "Plattform Token", "hash": sha256(token), "art": art, "nutzer_id": konto_id, "ablauf": in_stunden(stunden), "benutzt": 0}
	).insert(ignore_permissions=True)
	return token


def token_einloesen(art, token):
	"""Token prüfen und entwerten; liefert das (aktive) Konto."""
	fehler = "Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an."
	t = v.text(token, 200)
	if len(t) < 20:
		ungueltig(fehler)
	eintrag = frappe.db.get_value("Plattform Token", {"hash": sha256(t), "art": art}, ["name", "nutzer_id", "ablauf", "benutzt"], as_dict=True)
	if not eintrag or cint(eintrag.benutzt) or get_datetime(eintrag.ablauf) < now_datetime():
		ungueltig(fehler)
	frappe.db.set_value("Plattform Token", eintrag.name, "benutzt", 1, update_modified=True)
	konto = frappe.get_doc("Plattform Konto", eintrag.nutzer_id)
	if not cint(konto.aktiv):
		ungueltig("Der Link ist ungültig oder abgelaufen.")
	return konto
