# Copyright (c) 2026, ÖkoInvest GmbH
#
# E-Mails der Plattform über die Frappe-Mail-Warteschlange (Email Queue).
#  - Links immer auf `plattform_basis_url` aus site_config – nie aus dem Request-Host.
#    Nur mit developer_mode darf ersatzweise die von der Website übergebene basisUrl genutzt werden.
#  - Benachrichtigungen enthalten KEINE Inhalte (Nachrichtentext, vertrauliche Projektdaten),
#    nur Hinweis + Link ins Portal. Ob gesendet wird, entscheidet benachrichtigung.py anhand der
#    E-Mail-Einstellungen des Kontos (mail_einstellungen).
#  - Ein Fehler beim Versand bricht den fachlichen Vorgang nie ab (nur Fehlerprotokoll ohne Inhalte).

import re

import frappe
from frappe.utils import cint


URL = re.compile(r"^https?://[A-Za-z0-9.-]+(:\d{1,5})?$")


def basis_url(fallback=None):
	url = str(frappe.conf.get("plattform_basis_url") or "").strip().rstrip("/")
	if url and URL.match(url):
		return url
	if fallback and frappe.conf.get("developer_mode"):
		f = str(fallback).strip().rstrip("/")
		if URL.match(f):
			return f
	return ""


def _senden(empfaenger, betreff, template, args):
	if not empfaenger:
		return False
	try:
		frappe.sendmail(
			recipients=[empfaenger],
			subject=betreff,
			template=template,
			args=args,
			now=False,
			delayed=True,
			add_unsubscribe_link=0,
		)
		return True
	except Exception:
		# z. B. kein ausgehendes E-Mail-Konto: Hinweis nicht an die Website durchreichen, nur protokollieren
		frappe.clear_last_message()
		frappe.log_error(title="ÖkoInvest: E-Mail konnte nicht in die Warteschlange gestellt werden", message=f"Vorlage {template}")
		return False


def konto_bestaetigen(konto, token, fallback=None):
	basis = basis_url(fallback)
	if not basis:
		frappe.log_error(title="ÖkoInvest: plattform_basis_url fehlt", message="Bestätigungs-E-Mail nicht versendet.")
		return False
	return _senden(
		konto.email,
		"Bitte bestätigen Sie Ihre E-Mail-Adresse – ÖkoInvest",
		"oekoinvest_email_bestaetigen",
		{"vorname": konto.vorname or "", "link": f"{basis}/api/auth/email-bestaetigen?token={token}", "basis": basis},
	)


def passwort_link(konto, token, fallback=None):
	basis = basis_url(fallback)
	if not basis:
		frappe.log_error(title="ÖkoInvest: plattform_basis_url fehlt", message="Passwort-E-Mail nicht versendet.")
		return False
	return _senden(
		konto.email,
		"Neues Passwort festlegen – ÖkoInvest",
		"oekoinvest_passwort",
		{"vorname": konto.vorname or "", "link": f"{basis}/passwort-vergessen?token={token}", "basis": basis},
	)


def hinweis(empfaenger, vorname, betreff, text, pfad):
	basis = basis_url()
	if not basis:
		return False
	return _senden(
		empfaenger,
		betreff,
		"oekoinvest_hinweis",
		{"vorname": vorname or "", "text": text, "link": f"{basis}{pfad}" if pfad else basis + "/portal", "basis": basis},
	)


def _konto(konto_id):
	if not konto_id:
		return None
	return frappe.db.get_value("Plattform Konto", konto_id, ["name", "email", "vorname", "aktiv"], as_dict=True)


def _backoffice_empfaenger(zustaendig_id):
	z = _konto(zustaendig_id)
	if z and cint(z.aktiv):
		return z.email, z.vorname
	adresse = str(frappe.conf.get("plattform_backoffice_email") or "").strip()
	return (adresse, "") if adresse else (None, None)


def neue_anfrage(vorgang):
	"""Backoffice über eine neue Anfrage informieren (ohne Inhalte)."""
	adresse, _ = _backoffice_empfaenger(None)
	if adresse:
		hinweis(adresse, "", f"Neue Anfrage {vorgang.name} – ÖkoInvest", "Über die Website ist eine neue Anfrage eingegangen.", f"/portal/admin/vorgaenge/{vorgang.name}")


def benachrichtigung(konto, betreff, titel, text, pfad):
	"""E-Mail zu einer Benachrichtigung (plattform/benachrichtigung.py) – nur Hinweis, Titel (öffentlich/intern) und Link.

	Vorlage oekoinvest_benachrichtigung; die Entscheidung, OB gesendet wird (mail_einstellungen), trifft der Aufrufer.
	"""
	basis = basis_url()
	if not basis or not konto or not konto.get("email"):
		return False
	return _senden(
		konto.email,
		betreff,
		"oekoinvest_benachrichtigung",
		{"vorname": konto.get("vorname") or "", "titel": titel or "", "text": text, "link": f"{basis}{pfad or '/portal'}", "basis": basis},
	)
