# Copyright (c) 2026, ÖkoInvest GmbH
#
# Hilfen für die Tests: API-Benutzer, Konten, Aufrufe „wie die Website“ (API-Benutzer + als_benutzer).
# Alle Daten fiktiv (example.com), eindeutige Adressen je Lauf.

import frappe

from oekoinvest_app.plattform.api import auth, flaeche, interesse, projekt, prozess
from oekoinvest_app.plattform.installation import stammdaten_anlegen
from oekoinvest_app.plattform.konstanten import ROLLE_API

API_USER = "oekoinvest-api-test@example.com"
PASSWORT = "Test-Passwort-2026!"
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


def vorbereiten():
	stammdaten_anlegen()
	frappe.local.conf.plattform_basis_url = "https://plattform-test.example.com"
	if not frappe.db.exists("User", API_USER):
		u = frappe.get_doc({"doctype": "User", "email": API_USER, "first_name": "API Test", "user_type": "Website User", "send_welcome_email": 0})
		u.append("roles", {"role": ROLLE_API})
		u.flags.no_welcome_mail = True
		u.insert(ignore_permissions=True)


def aufruf(fn, **kwargs):
	"""Methode so aufrufen wie die Website: als API-Benutzer, optional mit als_benutzer."""
	frappe.set_user(API_USER)
	try:
		return fn(**kwargs)
	finally:
		frappe.set_user(API_USER)


def konto(rollen, bestaetigt=True, vorname="Test"):
	"""Konto über auth.registrieren anlegen; `admin` wird wie im Backoffice nachträglich gesetzt."""
	email = f"t-{frappe.generate_hash(length=10).lower()}@example.com"
	waehlbar = [r for r in rollen if r != "admin"] or ["flaeche"]
	ergebnis = aufruf(
		auth.registrieren,
		email=email,
		passwort=PASSWORT,
		vorname=vorname,
		nachname="(Test)",
		rollen=waehlbar,
		basisUrl="https://plattform-test.example.com",
		ip="127.0.0.1",
	)
	kid = ergebnis["nutzer"]["id"]
	k = frappe.get_doc("Plattform Konto", kid)
	if bestaetigt:
		k.email_bestaetigt = 1
	if "admin" in rollen:
		k.set("rollen", [{"rolle": r} for r in rollen])
	k.save(ignore_permissions=True)
	return kid


def flaeche_vollstaendig(eigentuemer):
	return aufruf(
		flaeche.anlegen,
		daten={"bezeichnung": "Acker am Waldrand (Test)", "land": "DE", "bundesland": "Bayern", "plz": "86842", "ort": "Testort", "ha": 12.5},
		ip="127.0.0.1",
		als_benutzer=eigentuemer,
	)


def projekt_daten():
	return {
		"titel": "Freiflächen-PV 12 MWp in Süddeutschland (Test)",
		"typ": "freiflaeche",
		"land": "DE",
		"bundesland": "Bayern",
		"region": "Schwaben",
		"mwp": 12,
		"phase": "aufstellung",
		"preisModus": "proKwp",
		"preisProKwp": 40,
		"beschreibung": "Testprojekt mit ausreichend langer Beschreibung, damit die Einreichungsbedingung von achtzig Zeichen sicher erfüllt ist.",
		"vertraulich": {"gemeinde": "Geheimdorf", "netzbetreiber": "Netz Test GmbH"},
	}


def projekt_veroeffentlicht(anbieter, admin, satz=2):
	p = aufruf(projekt.anlegen, daten=projekt_daten(), ip="127.0.0.1", als_benutzer=anbieter)
	aufruf(projekt.provision_akzeptieren, id=p["id"], ip="127.0.0.1", als_benutzer=anbieter)
	aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="pruefung", als="eigentuemer", extra={}, als_benutzer=anbieter)
	aufruf(prozess.status_wechsel, art="projekt", id=p["id"], nach="veroeffentlicht", als="admin", extra={"provisionSatz": satz}, als_benutzer=admin)
	return p["id"]


def interesse_mit_datenraum(investor, admin, projekt_id):
	i = aufruf(interesse.nda_anfragen, projektId=projekt_id, akzeptiert=True, ip="127.0.0.1", userAgent="Test", als_benutzer=investor)
	aufruf(prozess.status_wechsel, art="interesse", id=i["id"], nach="nda_freigegeben", als="admin", extra={}, als_benutzer=admin)
	return i["id"]
