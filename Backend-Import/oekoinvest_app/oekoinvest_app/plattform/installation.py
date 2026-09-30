# Copyright (c) 2026, ÖkoInvest GmbH
#
# Installation/Migration: Rollen und Stammdaten „Plattform Rolle“ sicherstellen (idempotent).
# Hilfsfunktion für das erste Backoffice-Konto:
#   bench --site <site> execute oekoinvest_app.plattform.installation.admin_konto_anlegen \
#     --kwargs "{'email': 'vorname.nachname@oekoinvest.com', 'vorname': 'Vorname', 'nachname': 'Nachname'}"
# Das Konto erhält KEIN Passwort – es kommt eine E-Mail mit Link „Neues Passwort festlegen“.

import frappe

from oekoinvest_app.plattform.konstanten import ROLLE_ANLAGEN_DIENST, ROLLE_API, ROLLE_DESK_ADMIN, ROLLEN

DESK_ROLLEN = {ROLLE_DESK_ADMIN: 1, ROLLE_API: 0, ROLLE_ANLAGEN_DIENST: 0}  # Anlagen-Dienst: Ingest-Dienst (MQTT → Frappe)
DESK_ROLLEN["ÖkoInvest Projektleitung"] = 1  # Projektentwicklung: Desk-Rolle (Entwicklungsprojekte, Meilensteine, Risiken)


def rollen_anlegen():
	for rolle, desk in [*DESK_ROLLEN.items(), *[(r[0], 0) for r in ROLLEN.values()]]:
		if not frappe.db.exists("Role", rolle):
			frappe.get_doc({"doctype": "Role", "role_name": rolle, "desk_access": desk}).insert(ignore_permissions=True)


def stammdaten_anlegen():
	rollen_anlegen()
	for rolle_id, (frappe_rolle, bezeichnung, waehlbar) in ROLLEN.items():
		werte = {"bezeichnung": bezeichnung, "frappe_rolle": frappe_rolle, "selbst_waehlbar": waehlbar}
		if frappe.db.exists("Plattform Rolle", rolle_id):
			doc = frappe.get_doc("Plattform Rolle", rolle_id)
			doc.update(werte)
			doc.save(ignore_permissions=True)
		else:
			frappe.get_doc({"doctype": "Plattform Rolle", "rolle_id": rolle_id, **werte}).insert(ignore_permissions=True)


def nach_installation():
	stammdaten_anlegen()
	frappe.db.commit()


def nach_migration():
	stammdaten_anlegen()


def admin_konto_anlegen(email, vorname, nachname):
	"""Erstes Backoffice-Konto (Rolle admin) anlegen und Passwort-Link senden."""
	from oekoinvest_app.plattform import mail
	from oekoinvest_app.plattform import validierung as v
	from oekoinvest_app.plattform.kern import token_anlegen

	stammdaten_anlegen()
	e = v.email(email)
	if not e:
		frappe.throw("Ungültige E-Mail-Adresse.")
	if frappe.db.exists("Plattform Konto", {"email": e}):
		frappe.throw("Für diese E-Mail-Adresse besteht bereits ein Konto.")
	if not frappe.db.exists("User", e):
		user = frappe.get_doc({"doctype": "User", "email": e, "first_name": vorname, "last_name": nachname, "user_type": "Website User", "send_welcome_email": 0})
		user.flags.no_welcome_mail = True
		user.insert(ignore_permissions=True)
	konto = frappe.get_doc(
		{
			"doctype": "Plattform Konto",
			"user": e,
			"email": e,
			"vorname": v.text(vorname, 80),
			"nachname": v.text(nachname, 80),
			"firma": "ÖkoInvest GmbH",
			"rollen": [{"rolle": "admin"}],
			"aktiv": 1,
			"email_bestaetigt": 1,
		}
	).insert(ignore_permissions=True)
	token = token_anlegen("reset", konto.name, 24)
	if not mail.passwort_link(konto, token):
		print("Achtung: E-Mail nicht versendet – plattform_basis_url und ausgehendes E-Mail-Konto prüfen.")
	frappe.db.commit()
	print(f"Backoffice-Konto {konto.name} ({e}) angelegt. Passwort-Link ist 24 Stunden gültig.")
	return konto.name


# ================================================================ Go-live: technische und Desk-Benutzer (idempotent)
# Aufruf aus Backend-Import/installieren.sh bzw. von Hand:
#   bench --site <site> execute oekoinvest_app.plattform.installation.technischer_benutzer_anlegen \
#     --kwargs "{'email': 'plattform-web@<domain>', 'art': 'api'}"
#   bench --site <site> execute oekoinvest_app.plattform.installation.desk_benutzer_anlegen \
#     --kwargs "{'email': 'vorname.nachname@<domain>', 'vorname': 'Vorname', 'nachname': 'Nachname', 'profil': 'ÖkoInvest Leitung'}"
# API-Schlüssel werden NICHT automatisch erzeugt (das Secret gehört nur in die Umgebung der Website bzw. des Dienstes):
# Desk → User → „API Access“ → „Generate Keys“.

TECHNISCHE_PROFILE = {"api": ("ÖkoInvest API-Benutzer", ROLLE_API, "Plattform Website"), "anlagen": ("ÖkoInvest Anlagen-Dienst", ROLLE_ANLAGEN_DIENST, "Anlagen-Dienst")}


def _profil_setzen(user, profil):
	if not frappe.db.exists("Role Profile", profil):
		frappe.throw(f"Rollenprofil „{profil}“ fehlt – bitte zuerst bench migrate ausführen.")
	user.role_profile_name = profil
	user.set("roles", [])
	for r in frappe.get_doc("Role Profile", profil).roles:
		user.append("roles", {"role": r.role})


def technischer_benutzer_anlegen(email, art="api"):
	"""Website User mit genau einer technischen Rolle (API der Website bzw. Anlagen-Dienst), ohne Passwort-Login."""
	from oekoinvest_app.plattform import validierung as v

	if art not in TECHNISCHE_PROFILE:
		frappe.throw("art muss 'api' oder 'anlagen' sein.")
	profil, rolle, vorname = TECHNISCHE_PROFILE[art]
	e = v.email(email)
	if not e:
		frappe.throw("Ungültige E-Mail-Adresse.")
	user = frappe.get_doc("User", e) if frappe.db.exists("User", e) else frappe.new_doc("User")
	if user.is_new():
		user.update({"email": e, "first_name": vorname, "send_welcome_email": 0, "user_type": "Website User"})
	_profil_setzen(user, profil)
	if "System Manager" in [r.role for r in user.roles]:
		frappe.throw("Technische Benutzer dürfen keine weiteren Rollen haben.")
	user.flags.no_welcome_mail = True
	user.save(ignore_permissions=True)
	frappe.db.commit()
	print(f"Technischer Benutzer {e} ({rolle}) bereit. API-Schlüssel im Desk erzeugen: User → API Access → Generate Keys.")
	return e


def desk_benutzer_anlegen(email, vorname, nachname="", profil="ÖkoInvest Nur lesen"):
	"""System User (Desk) mit Rollenprofil; Frappe sendet den Link zum Festlegen des Passworts. 2FA ist Pflicht."""
	from oekoinvest_app.plattform import validierung as v

	e = v.email(email)
	if not e:
		frappe.throw("Ungültige E-Mail-Adresse.")
	if not str(profil).startswith("ÖkoInvest ") or profil in ("ÖkoInvest API-Benutzer", "ÖkoInvest Anlagen-Dienst"):
		frappe.throw("Für Desk-Benutzer bitte ein Desk-Rollenprofil wählen (z. B. „ÖkoInvest Leitung“).")
	neu = not frappe.db.exists("User", e)
	user = frappe.new_doc("User") if neu else frappe.get_doc("User", e)
	if neu:
		user.update({"email": e, "first_name": vorname, "last_name": nachname, "send_welcome_email": 1})
	_profil_setzen(user, profil)
	user.user_type = "System User"
	user.save(ignore_permissions=True)
	frappe.db.commit()
	print(f"Desk-Benutzer {e} mit Profil „{profil}“ {'angelegt (Einladungs-E-Mail folgt)' if neu else 'aktualisiert'}.")
	return e
