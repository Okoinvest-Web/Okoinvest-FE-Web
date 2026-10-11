# Copyright (c) 2026, ÖkoInvest GmbH
# Eigenes Konto: Passwort ändern, Profil, Suchprofil (Investor).

import frappe
from frappe.utils import cint
from frappe.utils.password import check_password, update_password

from oekoinvest_app.plattform import sicherheit as s
from oekoinvest_app.plattform import validierung as v
from oekoinvest_app.plattform.kern import als_json, konto_json, nutzer, protokoll, rolle_noetig, ungueltig
from oekoinvest_app.plattform.konstanten import LAENDER, PHASEN_IDS, PROJEKT_TYPEN, ROLLEN_IDS, SUCHPROFIL_SCHWELLE


@frappe.whitelist(methods=["POST"])
def passwort_aendern(alt=None, neu=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	fehler = v.passwort_fehler(neu)
	v.pflicht(not fehler, fehler)
	konto = frappe.get_doc("Plattform Konto", n.id)
	s.sperre_pruefen(konto.email, konto)
	try:
		check_password(konto.user, alt if isinstance(alt, str) else "")
	except frappe.AuthenticationError:
		# Pen-Test-Befund S1 (Paket SECURITY): auch „Passwort ändern“ zählt zur Kontosperre
		s.fehlversuch_buchen(konto.email, konto, grund="passwort")
		s.festschreiben()  # Zähler bleibt trotz Fehler (Rollback) erhalten
		ungueltig("Das bisherige Passwort stimmt nicht.")
	update_password(konto.user, neu)
	konto.sitzung_version = cint(konto.sitzung_version) + 1
	konto.save(ignore_permissions=True)
	protokoll(n, "passwort_geaendert", "nutzer", konto.name, "Passwort geändert")
	return konto_json(konto)


@frappe.whitelist(methods=["POST"])
def profil_speichern(daten=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	d = daten if isinstance(daten, dict) else {}
	vn = v.text(d.get("vorname"), 80)
	nn = v.text(d.get("nachname"), 80)
	v.pflicht(vn and nn, "Bitte geben Sie Vor- und Nachnamen an.")
	konto = frappe.get_doc("Plattform Konto", n.id)
	konto.vorname = vn
	konto.nachname = nn
	konto.firma = v.text(d.get("firma"), 120)
	konto.telefon = v.text(d.get("telefon"), 40)
	if isinstance(d.get("rollen"), list):
		r = v.mehrfach(d.get("rollen"), ROLLEN_IDS)  # „admin“ wird nie ergänzt …
		v.pflicht(len(r) > 0, "Bitte wählen Sie mindestens eine Rolle.")
		if "admin" in n.rollen:  # … bleibt aber erhalten
			r.append("admin")
		if "gutachter" in n.rollen:  # Projektentwicklung: Gutachter-Rolle (per Einladung) bleibt erhalten
			r.append("gutachter")
		konto.set("rollen", [{"rolle": x} for x in r])
	konto.save(ignore_permissions=True)
	protokoll(n, "profil", "nutzer", konto.name, "Profil aktualisiert")
	return konto_json(konto)


@frappe.whitelist(methods=["POST"])
def suchprofil_speichern(profil=None, als_benutzer=None):
	n = nutzer(als_benutzer)
	rolle_noetig(n, ["investor"], "Suchprofile sind für Investoren.")
	p = profil if isinstance(profil, dict) else {}
	sp = {
		"mwpMin": v.zahl(p.get("mwpMin"), min=0, max=5000),
		"mwpMax": v.zahl(p.get("mwpMax"), min=0, max=5000),
		"phasen": v.mehrfach(p.get("phasen"), PHASEN_IDS),
		"laender": v.mehrfach(p.get("laender"), LAENDER),
		"typen": v.mehrfach(p.get("typen"), PROJEKT_TYPEN),
		"ticketMin": v.zahl(p.get("ticketMin"), min=0, max=1e10),
		"ticketMax": v.zahl(p.get("ticketMax"), min=0, max=1e10),
		"benachrichtigen": v.wahr(p.get("benachrichtigen")),
		"schwelle": v.zahl(p.get("schwelle"), min=SUCHPROFIL_SCHWELLE["min"], max=SUCHPROFIL_SCHWELLE["max"], stellen=0) or SUCHPROFIL_SCHWELLE["standard"],
	}
	# Fachprüfung Kapitalseite: Investorentyp, Regionen, Rendite-Ziel, Deal-Struktur, Co-Development, ESG, Finanzierung
	from oekoinvest_app.plattform.fach.suchprofil import suchprofil_erweiterung
	from oekoinvest_app.plattform.konstanten import BUNDESLAENDER

	sp.update(suchprofil_erweiterung(p, [b for liste in BUNDESLAENDER.values() for b in liste]))
	if sp["mwpMin"] is not None and sp["mwpMax"] is not None:
		v.pflicht(sp["mwpMin"] <= sp["mwpMax"], "MWp: Minimum größer als Maximum.")
	if sp["ticketMin"] is not None and sp["ticketMax"] is not None:
		v.pflicht(sp["ticketMin"] <= sp["ticketMax"], "Ticket: Minimum größer als Maximum.")
	from oekoinvest_app.plattform.organisation import team_suchprofil_setzen

	if team_suchprofil_setzen(n, sp):  # aktive Organisation → Team-Suchprofil (Rolle ≥ Mitglied)
		return sp
	konto = frappe.get_doc("Plattform Konto", n.id)
	konto.suchprofil = als_json(sp)
	konto.save(ignore_permissions=True)
	protokoll(n, "suchprofil", "nutzer", konto.name, "Suchprofil gespeichert")
	return sp
