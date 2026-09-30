# Copyright (c) 2026, ÖkoInvest GmbH
#
# Löschkonzept – täglicher Aufbewahrungsjob (hooks.scheduler_events „daily“).
#
# Fristen in Tagen, überschreibbar je Site: site_config „oekoinvest_loeschfristen“ = {"schluessel": tage, …};
# 0 = nie löschen. Bereits vorhandene Jobs mit festen Fristen (nicht hier doppelt):
#   aufgaben.tokens_aufraeumen   Einmal-Tokens 7 Tage nach Ablauf/Benutzung
#   sicherheit.aufraeumen        Sitzungen/Einladungen 30 Tage, Anmeldehistorie 180 Tage
#   Frappe „Log Settings“        Error Log, Email Queue, Activity Log … (einrichtung.LOG_TAGE)
#
# NICHT gelöscht werden: Aktivitätsprotokoll (Hash-Kette, Nachweis), Datenraum-Zugriffe (Nachweis NDA),
# Provisionen/Projekte/Verträge (handels- und steuerrechtliche Aufbewahrung). Für diese Fälle ist eine
# kontrollierte Archivierung vorgesehen (Backend-Import/GO-LIVE.md, „Löschkonzept“).
#
# Gelöscht wird mit frappe.db.delete (ohne Controller): Die append-only-Controller verbieten das Löschen
# aus der Anwendung heraus bewusst; der Aufbewahrungsjob ist der einzige vorgesehene Weg.

import frappe
from frappe.utils import add_days, cint, now_datetime

FRISTEN = {
	# Schlüssel: (Standard-Tage, Beschreibung)
	"benachrichtigung_gelesen": (365, "gelesene Benachrichtigungen (Glocke)"),
	"benachrichtigung_alle": (730, "alle Benachrichtigungen"),
	"ki_nutzung": (365, "Nutzungsprotokoll KI-Assistent (ohne Inhalte)"),
	"automation_lauf": (365, "Ausführungsprotokoll der Automationen"),
	"projektaufruf": (730, "Aufrufzähler der Exposés je Tag"),
	"vorgang_ohne_konto": (1095, "Anfragen ohne Konto in Endstatus → anonymisieren"),
	"geloeschte_dokumente": (90, "Papierkorb (Deleted Document) der Plattform-DocTypes"),
}

VORGANG_ENDSTATUS = ("abgeschlossen", "abgelehnt", "zurueckgezogen")


def fristen():
	eigene = frappe.conf.get("oekoinvest_loeschfristen")
	eigene = eigene if isinstance(eigene, dict) else {}
	return {k: cint(eigene.get(k, standard)) for k, (standard, _t) in FRISTEN.items()}


def _grenze(tage):
	return add_days(now_datetime(), -tage)


def _loeschen(doctype, filters):
	if not frappe.db.exists("DocType", doctype):
		return 0
	anzahl = frappe.db.count(doctype, filters)
	if anzahl:
		frappe.db.delete(doctype, filters)
	return anzahl


def vorgaenge_anonymisieren(tage):
	"""Anfragen ohne Konto (nutzer_id leer) im Endstatus, seit `tage` unverändert: personenbezogene Felder leeren."""
	namen = frappe.get_all(
		"Plattform Vorgang",
		filters={"nutzer_id": ("is", "not set"), "status": ("in", VORGANG_ENDSTATUS), "modified": ("<", _grenze(tage)), "email": ("is", "set")},
		pluck="name",
		limit_page_length=500,
	)
	for name in namen:
		frappe.db.set_value(
			"Plattform Vorgang",
			name,
			{"email": None, "kontakt": '{"anonymisiert":true}', "daten": "{}", "ip": None, "herkunft": None, "einwilligung": '{"anonymisiert":true}'},
			update_modified=False,
		)
	return len(namen)


def taeglich():
	f = fristen()
	ergebnis = {}
	if f["benachrichtigung_gelesen"]:
		ergebnis["benachrichtigung_gelesen"] = _loeschen("Plattform Benachrichtigung", {"gelesen": 1, "creation": ("<", _grenze(f["benachrichtigung_gelesen"]))})
	if f["benachrichtigung_alle"]:
		ergebnis["benachrichtigung_alle"] = _loeschen("Plattform Benachrichtigung", {"creation": ("<", _grenze(f["benachrichtigung_alle"]))})
	if f["ki_nutzung"]:
		ergebnis["ki_nutzung"] = _loeschen("Plattform KI Nutzung", {"creation": ("<", _grenze(f["ki_nutzung"]))})
	if f["automation_lauf"]:
		ergebnis["automation_lauf"] = _loeschen("Plattform Automation Lauf", {"creation": ("<", _grenze(f["automation_lauf"]))})
	if f["projektaufruf"]:
		ergebnis["projektaufruf"] = _loeschen("Plattform Projektaufruf", {"creation": ("<", _grenze(f["projektaufruf"]))})
	if f["vorgang_ohne_konto"]:
		ergebnis["vorgang_ohne_konto"] = vorgaenge_anonymisieren(f["vorgang_ohne_konto"])
	if f["geloeschte_dokumente"]:
		ergebnis["geloeschte_dokumente"] = _loeschen(
			"Deleted Document", {"deleted_doctype": ("like", "Plattform %"), "creation": ("<", _grenze(f["geloeschte_dokumente"]))}
		)
	summe = {k: v for k, v in ergebnis.items() if v}
	if summe:
		from oekoinvest_app.plattform.kern import protokoll

		protokoll(None, "aufbewahrung", "system", "", "Aufbewahrung: " + ", ".join(f"{k} {v}" for k, v in summe.items()))
	frappe.db.commit()
	return ergebnis
