# Copyright (c) 2026, ÖkoInvest GmbH
#
# Anmeldung, Registrierung, E-Mail-Bestätigung, Passwort vergessen/setzen.
# „Öffentlich“ heißt hier: ohne `als_benutzer` – aufrufen darf trotzdem nur der API-Benutzer der Website.
# Passwörter ausschließlich über frappe.utils.password (Hash im Frappe-User, nie im JSON).

import frappe
from frappe.utils import cint
from frappe.utils.password import check_password, passlibctx, update_password

from oekoinvest_app.plattform import mail
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.ablauf import verknuepfen
from oekoinvest_app.plattform.kern import (
	api_pruefen,
	jetzt,
	konflikt,
	konto_json,
	konto_suchen,
	nachricht_anlegen,
	protokoll,
	token_anlegen,
	token_einloesen,
)
from oekoinvest_app.plattform.konstanten import ROLLEN_IDS

WILLKOMMEN = (
	"Willkommen im Portal von ÖkoInvest. Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben – "
	"danach ordnen wir frühere Anfragen mit dieser Adresse automatisch Ihrem Konto zu."
)

_DUMMY_HASH = None


def _gleiche_laufzeit():
	"""Bei unbekannter E-Mail trotzdem einen Hash prüfen (gleiche Antwortzeit, keine Enumeration)."""
	global _DUMMY_HASH
	if _DUMMY_HASH is None:
		_DUMMY_HASH = passlibctx.hash("oekoinvest-dummy-passwort")
	passlibctx.verify("x", _DUMMY_HASH)


def _passwort_ok(user, passwort):
	pw = passwort if isinstance(passwort, str) else ""
	if not user or not pw or len(pw) > 200:
		_gleiche_laufzeit()
		return False
	try:
		check_password(user, pw)
		return True
	except frappe.AuthenticationError:
		return False


def _n(konto):
	return frappe._dict(konto_json(konto))


@frappe.whitelist(methods=["POST"])
def anmelden(email=None, passwort=None):
	"""Konto (ohne Geheimnisse) oder None bei falschen Daten/gesperrtem Konto."""
	api_pruefen()
	e = v.email(email)
	konto = konto_suchen(e) if e else None
	ok = _passwort_ok(konto.user if konto else None, passwort)
	if not konto or not ok or not cint(konto.aktiv):
		return None
	konto.letzter_login = jetzt()
	konto.save(ignore_permissions=True)
	verknuepfen(konto)
	konto.reload()
	protokoll(_n(konto), "login", "nutzer", konto.name, "Anmeldung")
	return konto_json(konto)


@frappe.whitelist(methods=["POST"])
def nutzer_fuer_sitzung(nutzerId=None):
	"""Konto inkl. sitzungVersion/aktiv für die Sitzungsprüfung der Website – oder None."""
	api_pruefen()
	kennung = v.kennung(nutzerId)
	if not kennung or not frappe.db.exists("Plattform Konto", kennung):
		return None
	konto = frappe.get_doc("Plattform Konto", kennung)
	return konto_json(konto) if cint(konto.aktiv) else None


@frappe.whitelist(methods=["POST"])
def registrieren(email=None, passwort=None, vorname=None, nachname=None, firma=None, telefon=None, rollen=None, vorgangId=None, basisUrl=None, ip=None):
	api_pruefen()
	e = v.email(email)
	v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.")
	fehler = v.passwort_fehler(passwort)
	v.pflicht(not fehler, fehler)
	vn = v.text(vorname, 80)
	nn = v.text(nachname, 80)
	v.pflicht(vn and nn, "Bitte geben Sie Vor- und Nachnamen an.")
	r = v.mehrfach(rollen, ROLLEN_IDS)  # „admin“ ist nie wählbar
	v.pflicht(len(r) > 0, "Bitte wählen Sie mindestens eine Rolle.")

	if frappe.db.exists("Plattform Konto", {"email": e}) or frappe.db.exists("User", e):
		konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.")

	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": e,
			"first_name": vn,
			"last_name": nn,
			"user_type": "Website User",
			"send_welcome_email": 0,
			"enabled": 1,
		}
	)
	user.flags.ignore_permissions = True
	user.flags.no_welcome_mail = True
	user.insert()
	update_password(e, passwort)

	konto = frappe.get_doc(
		{
			"doctype": "Plattform Konto",
			"user": e,
			"email": e,
			"vorname": vn,
			"nachname": nn,
			"firma": v.text(firma, 120),
			"telefon": v.text(telefon, 40),
			"rollen": [{"rolle": x} for x in r],
			"sitzung_version": 0,
			"aktiv": 1,
			"email_bestaetigt": 0,
			"letzter_login": jetzt(),
		}
	).insert(ignore_permissions=True)
	n = _n(konto)

	# Anfrage aus demselben Ablauf sofort zuordnen (Kennung + E-Mail müssen passen)
	verknuepft = None
	vid = v.kennung(vorgangId)
	if vid:
		vg = frappe.db.get_value("Plattform Vorgang", vid, ["name", "nutzer_id", "email", "flaeche_id"], as_dict=True)
		if vg and not vg.nutzer_id and vg.email == e:
			frappe.db.set_value("Plattform Vorgang", vg.name, "nutzer_id", konto.name, update_modified=False)
			verknuepft = vg.name
			if vg.flaeche_id and not frappe.db.get_value("Plattform Flaeche", vg.flaeche_id, "nutzer_id"):
				frappe.db.set_value("Plattform Flaeche", vg.flaeche_id, "nutzer_id", konto.name, update_modified=False)

	token = token_anlegen("email", konto.name, 72)
	mail.konto_bestaetigen(konto, token, fallback=basisUrl)
	protokoll(n, "registrierung", "nutzer", konto.name, f"Registrierung als {', '.join(r)}", ip)
	nachricht_anlegen("nutzer", konto.name, von_admin=True, system=True, text=WILLKOMMEN, mail=False)
	return {"nutzer": konto_json(konto), "vorgangVerknuepft": verknuepft}


@frappe.whitelist(methods=["POST"])
def email_bestaetigen(token=None):
	api_pruefen()
	konto = token_einloesen("email", token)
	konto.email_bestaetigt = 1
	konto.save(ignore_permissions=True)
	anzahl = verknuepfen(konto)
	konto.reload()
	protokoll(_n(konto), "email", "nutzer", konto.name, f"E-Mail bestätigt, {anzahl} Anfrage(n) zugeordnet")
	return konto_json(konto)


@frappe.whitelist(methods=["POST"])
def passwort_vergessen(email=None, basisUrl=None, ip=None):
	"""Antwortet immer gleich (keine Enumeration). Mail nur bei aktivem Konto."""
	api_pruefen()
	e = v.email(email)
	if not e:
		return {"ok": True}
	konto = konto_suchen(e)
	if konto and cint(konto.aktiv):
		token = token_anlegen("reset", konto.name, 1)
		mail.passwort_link(konto, token, fallback=basisUrl)
		protokoll(_n(konto), "passwort_vergessen", "nutzer", konto.name, "Passwort-Link angefordert", ip)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def passwort_setzen(token=None, passwort=None, ip=None):
	api_pruefen()
	fehler = v.passwort_fehler(passwort)
	v.pflicht(not fehler, fehler)
	konto = token_einloesen("reset", token)
	update_password(konto.user, passwort)
	konto.sitzung_version = cint(konto.sitzung_version) + 1
	konto.email_bestaetigt = 1  # Besitz der Adresse nachgewiesen
	konto.save(ignore_permissions=True)
	verknuepfen(konto)
	konto.reload()
	protokoll(_n(konto), "passwort_gesetzt", "nutzer", konto.name, "Passwort neu gesetzt", ip)
	return konto_json(konto)
