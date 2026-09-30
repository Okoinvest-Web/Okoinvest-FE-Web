# Copyright (c) 2026, ÖkoInvest GmbH
#
# E-Mails der Service-Module über die Frappe-Mail-Warteschlange (wie plattform/mail.py):
#   - Bestätigungscode der elektronischen Unterschrift (enthält bewusst den Code, sonst keine Vertragsinhalte)
#   - Termin-Bestätigung/Änderung/Absage/Erinnerung mit Kalenderdatei (ICS) als Anhang
# Links nur auf `plattform_basis_url` (site_config). Fehler beim Versand brechen den Vorgang nie ab.

import frappe

from oekoinvest_app.plattform.mail import basis_url


def _senden(empfaenger, betreff, template, args, anhaenge=None):
	if not empfaenger:
		return False
	try:
		frappe.sendmail(recipients=[empfaenger], subject=betreff, template=template, args=args, attachments=anhaenge or None, now=False, delayed=True, add_unsubscribe_link=0)
		return True
	except Exception:
		frappe.clear_last_message()
		frappe.log_error(title="ÖkoInvest: E-Mail (Service) nicht in die Warteschlange gestellt", message=f"Vorlage {template}")
		return False


def signatur_code(email, vorname, vorgang_id, code, minuten):
	basis = basis_url()
	return _senden(
		email,
		"Ihr Bestätigungscode zur Unterschrift – ÖkoInvest",
		"oekoinvest_signatur_code",
		{"vorname": vorname or "", "code": code, "minuten": minuten, "vorgang": vorgang_id, "link": f"{basis}/portal/signatur/{vorgang_id}" if basis else "", "basis": basis},
	)


def termin(email, name, betreff, text, pfad, ics, linktext="Termin im Portal"):
	"""Terminmail mit ICS-Anhang. `pfad` = /portal/termine bzw. /termin/verwalten?token=… (öffentliche Buchung)."""
	basis = basis_url()
	return _senden(
		email,
		betreff,
		"oekoinvest_termin",
		{"name": name or "", "text": text, "link": f"{basis}{pfad}" if basis and pfad else "", "linktext": linktext, "basis": basis},
		anhaenge=[{"fname": "termin.ics", "fcontent": ics.encode("utf-8")}] if ics else None,
	)
