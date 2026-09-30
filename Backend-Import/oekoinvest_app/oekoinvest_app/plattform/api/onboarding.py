# Copyright (c) 2026, ÖkoInvest GmbH
#
# Onboarding-Assistenten je Rolle und Untertyp (Team B1) – Gegenstück zu src/lib/plattform/backend/demo/onboarding.js.
# Zustand am Konto: Plattform Konto.onboarding_pfade (JSON). Definitionen: plattform/onboarding_pfade.json (Export der Website).
#
# Rechte: nur das eigene Konto (als_benutzer). Der Website-Server prüft jede Änderung gegen die Fakten aus echten
# Daten (server/onboarding.js); Frappe prüft zusätzlich die Struktur (onboarding_kern.struktur_pruefen): Pfad passt zu
# den Rollen, Untertyp erlaubt (Backoffice nur eigene Unterrollen), nur bestätigbare Schritte bestätigt, Abschluss nur
# mit Auswertung ohne offene Pflichtschritte. Team-Sicht nur Unterrolle „Leitung“.
# Scheduler: mail_lauf_taeglich (hooks.py, daily) – Erinnerungen nach 3/7 Tagen, einmal je Art und Konto.

import frappe
from frappe.utils import cint

from oekoinvest_app.plattform import onboarding_kern as ok
from oekoinvest_app.plattform.kern import als_json, aus_json, iso, jetzt_iso, konflikt, konto_rollen, nutzer, protokoll, ungueltig, verboten
from oekoinvest_app.plattform.rechte import rollen_aus_feld, unterrollen

FELD = "onboarding_pfade"


def _fehler(e):
	if e.status == 403:
		verboten(e.meldung)
	if e.status == 409:
		konflikt(e.meldung)
	ungueltig(e.meldung)


def _zustand(konto_id):
	return ok.zustand_bereinigen(aus_json(frappe.db.get_value("Plattform Konto", konto_id, FELD)))


@frappe.whitelist(methods=["POST"])
def zustand(als_benutzer=None):
	n = nutzer(als_benutzer)
	return _zustand(n.id)


@frappe.whitelist(methods=["POST"])
def speichern(zustand=None, aktion=None, auswertung=None, protokollText=None, als_benutzer=None):  # noqa: N803 – Feldname laut Website-Vertrag
	n = nutzer(als_benutzer)
	alt = _zustand(n.id)
	try:
		neu = ok.struktur_pruefen(n.rollen or [], aktion, alt, zustand, unterrollen(n), auswertung)
	except ok.OnboardingFehler as e:
		_fehler(e)
	neu["mails"] = alt["mails"]  # Mail-Vermerke setzt nur mail()/mail_lauf
	neu["aktualisiertAm"] = jetzt_iso()
	frappe.db.set_value("Plattform Konto", n.id, FELD, als_json(neu), update_modified=False)
	if protokollText:
		protokoll(n, "onboarding", "nutzer", n.id, str(protokollText)[:200])
	return neu


@frappe.whitelist(methods=["POST"])
def mail(art=None, pfadTitel=None, offen=0, als_benutzer=None):  # noqa: N803
	n = nutzer(als_benutzer)
	if art not in ok.MAIL_ARTEN:
		ungueltig("Unbekannte Mail.")
	z = _zustand(n.id)
	if z["mails"].get(art):
		return False
	return _mail_senden(n.id, n.email, n.vorname, z, art, pfadTitel or "Ihr Einstieg", cint(offen))


def _mail_senden(konto_id, email, vorname, z, art, pfad_titel, offen):
	from oekoinvest_app.plattform import mail as mail_modul

	inhalt = ok.mail_inhalt(art, pfad_titel, offen)
	mail_modul.hinweis(email, vorname, inhalt["betreff"], inhalt["text"], inhalt["pfad"])
	z["mails"][art] = jetzt_iso()
	frappe.db.set_value("Plattform Konto", konto_id, FELD, als_json(z), update_modified=False)
	return True


def _backoffice_fakten(k):
	from oekoinvest_app.plattform.sicherheit import zf_aktiv

	def zaehlen(doctype, filter_):
		try:
			return frappe.db.count(doctype, filter_)
		except Exception:  # vor Einsatz gegen installierte Version prüfen – fehlt der DocType, gilt der Fakt als offen
			return 0

	return {
		"name": bool(k.vorname and k.nachname), "telefon": bool(k.telefon), "firma": bool(k.firma),
		"mailEinstellungen": bool(aus_json(k.get("mail_einstellungen"))), "zweiFaktor": zf_aktiv(k.name),
		"aufgabenErledigt": zaehlen("Plattform Aufgabe", {"zustaendig_id": k.name, "status": "erledigt"}),
		"gebiete": zaehlen("Plattform Gebiet", {"mitarbeiter_id": k.name, "aktiv": 1}),
	}


@frappe.whitelist(methods=["POST"])
def team(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "leitung" not in unterrollen(n):
		verboten("Den Einarbeitungsstand des Teams sieht nur die Leitung.")
	pfad = ok.pfad_nach_id("backoffice")
	ergebnis = []
	for name in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, pluck="name"):
		k = frappe.get_doc("Plattform Konto", name)
		if "admin" not in konto_rollen(k):
			continue
		ur = rollen_aus_feld(k.get("backoffice_rollen")) or ["leitung"]
		z = ok.zustand_bereinigen(aus_json(k.get(FELD)))
		pz = z["pfade"].get("backoffice") or {}
		legacy = (aus_json(k.get("onboarding")) or {}).get("erledigt") or []
		a = ok.pfad_auswerten(pfad, _backoffice_fakten(k), pz, ur[0], legacy)
		ergebnis.append({
			"id": k.name, "name": " ".join(x for x in (k.vorname, k.nachname) if x) or k.email, "email": k.email, "unterrollen": ur,
			"untertyp": a["untertyp"], "erledigt": a["erledigt"], "gesamt": a["gesamt"], "quote": a["quote"], "abgeschlossen": a["abgeschlossen"],
			"offen": [{"id": s["id"], "kurz": s["kurz"], "pflicht": s["pflicht"]} for s in a["schritte"] if not s["erledigt"]],
			"gestartetAm": pz.get("gestartetAm"), "letzterLogin": iso(k.get("letzter_login")), "erstelltAm": iso(k.creation),
		})
	return sorted(ergebnis, key=lambda x: (x["quote"], x["name"]))


def _lauf():
	versendet = 0
	for k in frappe.get_all("Plattform Konto", filters={"aktiv": 1}, fields=["name", "email", "vorname", "creation", FELD, "onboarding"]):
		roh = aus_json(k.get(FELD))
		if not roh or not k.email:
			continue
		if "admin" in konto_rollen(frappe.get_doc("Plattform Konto", k.name)):
			continue
		z = ok.zustand_bereinigen(roh)
		legacy = aus_json(k.get("onboarding")) or {}
		art = ok.faellige_mail(iso(k.creation), legacy.get("checklisteAus") is True, z)
		if not art or art == "willkommen":
			continue
		a = z["auswertung"]
		pfad = ok.pfad_nach_id(a["pfad"]) or {}
		_mail_senden(k.name, k.email, k.vorname, z, art, pfad.get("titel") or "Ihr Einstieg", len(a["pflichtOffen"]))
		versendet += 1
	return versendet


@frappe.whitelist(methods=["POST"])
def mail_lauf(als_benutzer=None):
	n = nutzer(als_benutzer)
	if "leitung" not in unterrollen(n):
		verboten("Den Erinnerungslauf startet nur die Leitung.")
	versendet = _lauf()
	protokoll(n, "onboarding", "nutzer", n.id, f"Erinnerungslauf Onboarding: {versendet} E-Mail(s)")
	return {"versendet": versendet}


def mail_lauf_taeglich():
	"""Scheduler (hooks.py, daily): Erinnerungen an offene Pflichtschritte nach 3 bzw. 7 Tagen."""
	try:
		_lauf()
		frappe.db.commit()
	except Exception:
		frappe.log_error(title="ÖkoInvest: Onboarding-Erinnerungslauf fehlgeschlagen")
