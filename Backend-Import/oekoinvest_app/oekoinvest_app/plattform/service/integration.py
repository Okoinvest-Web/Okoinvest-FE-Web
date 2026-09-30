# Copyright (c) 2026, ÖkoInvest GmbH
#
# Optionale Frappe-Apps – jede Integration ist nur aktiv, wenn
#   1. die App installiert ist (frappe.get_installed_apps()) UND
#   2. der Schalter in site_config gesetzt ist:
#        oekoinvest_drive     = 1   Frappe Drive: Plattform-Dokumente zusätzlich im Drive des internen Teams ablegen
#        oekoinvest_drive_kyc = 1   (zusätzlich) KYC-Unterlagen NUR verschlüsselt in einen abgeschotteten Ordner
#        oekoinvest_helpdesk  = 1   Frappe Helpdesk: Tickets als „HD Ticket“ spiegeln
#        oekoinvest_hrms      = 1   HRMS: Employee, Holiday List, Leave Application, Timesheet
#        oekoinvest_event     = 1   (Frappe-Kern, keine App) Termine zusätzlich als „Event“ im Desk-Kalender
# Ohne App/Schalter läuft alles wie bisher (eigene Datensätze der Plattform). Kein harter required_apps-Eintrag.

import frappe

SCHALTER = {
	"drive": ("drive", "oekoinvest_drive"),
	"helpdesk": ("helpdesk", "oekoinvest_helpdesk"),
	"hrms": ("hrms", "oekoinvest_hrms"),
}


def installiert(app):
	try:
		return app in (frappe.get_installed_apps() or [])
	except Exception:
		return False


def aktiv(name):
	"""Integration aktiv? name: drive | helpdesk | hrms | event"""
	if name == "event":
		return bool(frappe.conf.get("oekoinvest_event"))
	app, schalter = SCHALTER[name]
	return installiert(app) and bool(frappe.conf.get(schalter))


def status():
	"""Status für /portal/admin/team (ohne Interna)."""
	out = {}
	texte = {
		"drive": "Plattform-Dokumente (Datenraum, Flächen- und Projektakten) werden für das interne Team gespiegelt; Rechte bleiben in der Plattform. KYC nur verschlüsselt.",
		"helpdesk": "Tickets werden zusätzlich als „HD Ticket“ geführt; Status wird abgeglichen.",
		"hrms": "Mitarbeiter (Employee), Abwesenheiten (Leave Application), Feiertage (Holiday List) und Zeiten (Timesheet).",
	}
	for name, (app, schalter) in SCHALTER.items():
		out[name] = {"installiert": installiert(app), "aktiv": aktiv(name), "schalter": schalter, "hinweis": texte[name] + (" Vor Einsatz gegen die installierte Version prüfen." if name in ("drive", "helpdesk") else "")}
	out["kalender"] = {"event": aktiv("event"), "hinweis": "Mit oekoinvest_event = 1 wird jeder Termin zusätzlich als „Event“ im Desk-Kalender angelegt."}
	out["backend"] = "frappe"
	return out
