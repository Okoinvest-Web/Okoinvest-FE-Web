# Copyright (c) 2026, ÖkoInvest GmbH
#
# Go-live-Paket: Systemeinstellungen beim Installieren/Migrieren (after_install / after_migrate) – idempotent.
#
#  1. Sicherheits-Mindestniveau (JEDES Migrate): Passwort-Richtlinie, 2FA für Desk-Rollen, Login-Sperre,
#     Abmelden nach Passwort-Reset, Datei-Upload-Größe. Werte werden nur ANGEHOBEN, nie abgesenkt.
#  2. Grundeinrichtung (einmalig je EINRICHTUNG_VERSION): Sprache de, Zeitzone Europe/Vienna, Datums-/Zahlenformat,
#     Land, Sitzungsdauer, Website nur Login (keine Registrierung). Danach im Desk änderbar – ein späteres
#     Migrate überschreibt sie nicht. Standard-Briefkopf und Protokoll-Aufbewahrung nur, solange nichts gesetzt ist.
#  3. site_config-Überschreibungen (JEDES Migrate, Vorrang vor allem): „oekoinvest_system_settings“,
#     „oekoinvest_website_settings“ (je ein Objekt Feld → Wert).
#  4. Optionale Custom Fields für ERPNext/HRMS/… – nur wenn die App installiert ist (OPTIONALE_FELDER).
#
# Rate-Limits: Frappe begrenzt global je IP. Alle Plattform-Aufrufe kommen vom Website-Server (eine IP) –
# ein globales `rate_limit` in site_config würde deshalb die ganze Plattform drosseln und wird hier bewusst NICHT
# gesetzt. Begrenzt wird auf der Website (je Nutzer/IP) und am Proxy (siehe Backend-Import/README.md).

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform.konstanten import ROLLE_DESK_ADMIN

EINRICHTUNG_VERSION = 1
DEFAULT_SCHLUESSEL = "oekoinvest_einrichtung_version"
BRIEFKOPF = "ÖkoInvest"

# Desk-Rollen (Backoffice im Frappe-Desk, alle mit 2FA) – Role Profiles siehe fixtures/role_profile.json
DESK_ROLLEN = [
	ROLLE_DESK_ADMIN,
	"ÖkoInvest Akquise",
	"ÖkoInvest Transaktion",
	"ÖkoInvest Buchhaltung",
	"ÖkoInvest Betrieb",
	"ÖkoInvest Compliance",
	"ÖkoInvest Leser",
]

# (1) Sicherheits-Mindestniveau: Feld → (Wert, Vergleich) · „min“ = mindestens, „max“ = höchstens, „=“ = genau
SICHERHEIT = {
	"enable_password_policy": (1, "="),
	"minimum_password_score": ("3", "min"),
	"enable_two_factor_auth": (1, "="),
	"allow_consecutive_login_attempts": (5, "max"),
	"allow_login_after_fail": (300, "min"),
	"logout_on_password_reset": (1, "="),
	"password_reset_limit": (3, "max"),
	"max_file_size": (25, "max"),  # MB; Plattform-Uploads sind ≤ 10 MB (Base64 im JSON ≈ 13,4 MB Request)
}

# (2) Grundeinrichtung (einmalig)
SYSTEM = {
	"language": "de",
	"time_zone": "Europe/Vienna",
	"country": "Austria",
	"date_format": "dd.mm.yyyy",
	"time_format": "HH:mm",
	"number_format": "#.###,##",
	"currency_precision": "2",
	"float_precision": "3",
	"first_day_of_the_week": "Monday",
	"session_expiry": "08:00",  # Desk-Sitzung (Portal-Sitzungen verwaltet die Website: 7 Tage)
	"two_factor_method": "OTP App",
	"otp_issuer_name": "ÖkoInvest",
	"lifespan_qrcode_image": 240,
	"app_name": "ÖkoInvest Backoffice",
	"disable_system_update_notification": 1,
	"disable_change_log_notification": 1,
	"enable_onboarding": 0,
	"email_footer_address": "ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething · Österreich",
}

WEBSITE = {
	"home_page": "login",  # Backend ohne öffentliche Website: Startseite = Desk-Login
	"disable_signup": 1,
	"hide_footer_signup": 1,
	"title_prefix": "ÖkoInvest Backoffice",
	"footer_powered": " ",
}

# Protokoll-Aufbewahrung (Frappe „Log Settings“): DocType → Tage. Überschreibbar: site_config „oekoinvest_log_tage“.
LOG_TAGE = {
	"Error Log": 30,
	"Email Queue": 30,  # enthält Links (Bestätigung/Passwort) → kurz halten
	"Activity Log": 180,
	"Scheduled Job Log": 30,
	"Route History": 90,
	"Access Log": 180,
}

# (4) Custom Fields für optionale Apps: App → {DocType: [Felddefinitionen wie frappe.custom.doctype.custom_field.create_custom_fields]}
# Andere Teams tragen hier ihre Felder ein (kleine Einfügung, Feldnamen mit Präfix „oekoinvest_“, module = „Plattform“).
OPTIONALE_FELDER = {
	"erpnext": {
		# ERPNext-Finanzen & Abrechnung (plattform/finanzen): Verknüpfung Plattform ↔ ERPNext
		"Purchase Invoice": [{"fieldname": "oekoinvest_abrechnung", "label": "ÖkoInvest-Beleg", "fieldtype": "Link", "options": "Plattform Abrechnung", "insert_after": "bill_date", "read_only": 1, "module": "Plattform"}],
		"Sales Invoice": [
			{"fieldname": "oekoinvest_abrechnung", "label": "ÖkoInvest-Beleg", "fieldtype": "Link", "options": "Plattform Abrechnung", "insert_after": "due_date", "read_only": 1, "module": "Plattform"},
			{"fieldname": "oekoinvest_steuerhinweis", "label": "Steuerhinweis (Beleg)", "fieldtype": "Small Text", "insert_after": "oekoinvest_abrechnung", "module": "Plattform"},
		],
		"Supplier": [{"fieldname": "oekoinvest_konto", "label": "ÖkoInvest-Konto", "fieldtype": "Data", "insert_after": "supplier_name", "read_only": 1, "search_index": 1, "module": "Plattform"}],
		"Customer": [{"fieldname": "oekoinvest_konto", "label": "ÖkoInvest-Konto/Organisation", "fieldtype": "Data", "insert_after": "customer_name", "read_only": 1, "search_index": 1, "module": "Plattform"}],
		"Asset": [{"fieldname": "oekoinvest_anlage", "label": "ÖkoInvest-Anlage", "fieldtype": "Link", "options": "Plattform Anlage", "insert_after": "asset_name", "module": "Plattform"}],
		"Project": [{"fieldname": "oekoinvest_entwicklungsprojekt", "label": "Entwicklungsprojekt (Plattform)", "fieldtype": "Data", "insert_after": "project_name", "search_index": 1, "module": "Plattform"}],
	},
	"hrms": {},
	"drive": {},
	"helpdesk": {},
}


def _conf_dict(schluessel):
	wert = frappe.conf.get(schluessel)
	return wert if isinstance(wert, dict) else {}


def _setzen(doc, werte, nur_wenn_leer=False):
	meta = frappe.get_meta(doc.doctype)
	geaendert = False
	for feld, wert in werte.items():
		if not meta.has_field(feld):
			continue
		if nur_wenn_leer and doc.get(feld) not in (None, "", 0):
			continue
		if doc.get(feld) != wert:
			doc.set(feld, wert)
			geaendert = True
	return geaendert


def _sicherheit(doc):
	meta = frappe.get_meta(doc.doctype)
	geaendert = False
	for feld, (wert, art) in SICHERHEIT.items():
		if not meta.has_field(feld):
			continue
		ist = doc.get(feld)
		if art == "=":
			neu = wert
		elif art == "min":
			neu = wert if cint(ist) < cint(wert) else ist
		else:  # max: 0/leer bedeutet in Frappe meist „unbegrenzt“ → ebenfalls begrenzen
			neu = wert if (not cint(ist) or cint(ist) > cint(wert)) else ist
		if str(ist) != str(neu):
			doc.set(feld, neu)
			geaendert = True
	return geaendert


def systemeinstellungen(erstmalig):
	doc = frappe.get_single("System Settings")
	geaendert = False
	if erstmalig:
		geaendert |= _setzen(doc, SYSTEM)
	geaendert |= _sicherheit(doc)
	geaendert |= _setzen(doc, _conf_dict("oekoinvest_system_settings"))
	if geaendert:
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)


def website_einstellungen(erstmalig):
	doc = frappe.get_single("Website Settings")
	geaendert = _setzen(doc, WEBSITE) if erstmalig else False
	geaendert |= _setzen(doc, _conf_dict("oekoinvest_website_settings"))
	if geaendert:
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
	if erstmalig and frappe.db.exists("DocType", "Portal Settings"):
		portal = frappe.get_single("Portal Settings")
		if _setzen(portal, {"hide_standard_menu": 1}):
			portal.save(ignore_permissions=True)


def desk_rollen_2fa():
	"""Alle Desk-Rollen der App verlangen 2FA (zusätzlich zu den Fixtures, falls jemand sie im Desk abschaltet)."""
	for rolle in DESK_ROLLEN:
		if frappe.db.exists("Role", rolle):
			if not cint(frappe.db.get_value("Role", rolle, "two_factor_auth")):
				frappe.db.set_value("Role", rolle, "two_factor_auth", 1)
		else:
			frappe.get_doc({"doctype": "Role", "role_name": rolle, "desk_access": 1, "two_factor_auth": 1}).insert(ignore_permissions=True)


def briefkopf_standard():
	"""Briefkopf „ÖkoInvest“ als Standard, sofern (noch) kein anderer Standard gesetzt ist."""
	if not frappe.db.exists("Letter Head", BRIEFKOPF):
		return
	if frappe.db.get_value("Letter Head", {"is_default": 1}, "name"):
		return  # es gibt bereits einen Standard (ggf. bewusst anders gewählt)
	doc = frappe.get_doc("Letter Head", BRIEFKOPF)
	if not cint(doc.is_default):
		doc.is_default = 1
		doc.save(ignore_permissions=True)


def log_aufbewahrung():
	if not frappe.db.exists("DocType", "Log Settings"):
		return
	eigene = {k: cint(v) for k, v in _conf_dict("oekoinvest_log_tage").items()}
	for dt, t in {**LOG_TAGE, **eigene}.items():
		if not t or not frappe.db.exists("DocType", dt):
			continue
		try:
			ls = frappe.get_single("Log Settings")
			zeile = next((z for z in ls.get("logs_to_clear") or [] if z.ref_doctype == dt), None)
			if zeile:
				# vorhandene Zeilen nur per site_config ändern (Desk-Einstellungen bleiben sonst erhalten)
				if dt not in eigene or cint(zeile.days) == t:
					continue
				zeile.days = t
			else:
				ls.append("logs_to_clear", {"ref_doctype": dt, "days": t})
			ls.save(ignore_permissions=True)
		except Exception:
			# DocType unterstützt kein automatisches Aufräumen (clear_old_logs) → überspringen
			frappe.clear_last_message()
			frappe.db.rollback()


def optionale_felder():
	"""Custom Fields nur für installierte optionale Apps UND gesetzten Schalter (site_config „oekoinvest_<app>“)."""
	from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

	installiert = set(frappe.get_installed_apps())
	for app, felder in OPTIONALE_FELDER.items():
		if not felder or app not in installiert or not frappe.conf.get(f"oekoinvest_{app}"):
			continue
		vorhanden = {dt: f for dt, f in felder.items() if frappe.db.exists("DocType", dt)}
		if vorhanden:
			create_custom_fields(vorhanden, ignore_validate=True, update=True)


def anwenden():
	"""after_install und after_migrate – idempotent, jeder Schritt einzeln abgesichert."""
	stand = cint(frappe.db.get_default(DEFAULT_SCHLUESSEL))
	erstmalig = stand < EINRICHTUNG_VERSION
	schritte = [
		("Desk-Rollen/2FA", desk_rollen_2fa),
		("Systemeinstellungen", lambda: systemeinstellungen(erstmalig)),
		("Website-Einstellungen", lambda: website_einstellungen(erstmalig)),
		("Optionale Felder", optionale_felder),
		("Briefkopf", briefkopf_standard),  # nach install-app existiert er erst nach den Fixtures → auch beim Migrate
		("Protokoll-Aufbewahrung", log_aufbewahrung),
	]
	fehler = []
	for titel, schritt in schritte:
		try:
			schritt()
			frappe.db.commit()
		except Exception:
			frappe.db.rollback()
			fehler.append(titel)
			frappe.log_error(title=f"ÖkoInvest Einrichtung: {titel}")
	if not fehler:
		frappe.db.set_default(DEFAULT_SCHLUESSEL, str(EINRICHTUNG_VERSION))
		frappe.db.commit()
	elif not frappe.flags.in_test:
		print(f"ÖkoInvest Einrichtung: Schritte mit Fehler (siehe Error Log): {', '.join(fehler)}")


def _scheduler_aus():
	try:
		from frappe.utils.scheduler import is_scheduler_disabled

		return bool(is_scheduler_disabled())
	except Exception:
		return None


def pruefen():
	"""Kurzbericht für die Go-live-Checkliste: bench --site <site> execute oekoinvest_app.plattform.einrichtung.pruefen"""
	ss = frappe.get_single("System Settings")
	ergebnis = {
		"einrichtung_version": cint(frappe.db.get_default(DEFAULT_SCHLUESSEL)),
		"sprache": ss.get("language"),
		"zeitzone": ss.get("time_zone"),
		"passwort_richtlinie": cint(ss.get("enable_password_policy")),
		"passwort_score": ss.get("minimum_password_score"),
		"zwei_faktor": cint(ss.get("enable_two_factor_auth")),
		"desk_rollen_ohne_2fa": [r for r in DESK_ROLLEN if not cint(frappe.db.get_value("Role", r, "two_factor_auth"))],
		"briefkopf_standard": frappe.db.get_value("Letter Head", {"is_default": 1}, "name"),
		"plattform_basis_url": bool(frappe.conf.get("plattform_basis_url")),
		"ausgehendes_email_konto": bool(frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}, "name")),
		"scheduler_aktiv": not _scheduler_aus(),
		"api_benutzer": frappe.get_all("Has Role", filters={"role": "ÖkoInvest API", "parenttype": "User"}, pluck="parent"),
		"system_manager_mit_api_rolle": [
			u for u in frappe.get_all("Has Role", filters={"role": "ÖkoInvest API", "parenttype": "User"}, pluck="parent")
			if "System Manager" in frappe.get_roles(u)
		],
	}
	for k, v in ergebnis.items():
		print(f"{k:32} {v}")
	return ergebnis
