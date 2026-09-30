# Copyright (c) 2026, ÖkoInvest GmbH
#
# Backoffice-Unterrollen (identisch zu src/lib/plattform/rechte.js): leitung, akquise, transaktion, buchhaltung, lesen.
# Gespeichert am Plattform Konto im Feld `backoffice_rollen` (kommagetrennt, ausgegeben als `backofficeRollen`).
# Ohne Unterrolle gilt „leitung“ (rückwärtskompatibel). Stufen: 0 kein Zugriff, 1 lesen, 2 schreiben.
# Die Website prüft vorab in jeder Admin-Route (server/route.js); die Backoffice-Methoden prüfen selbst mit recht_noetig().

import frappe

BACKOFFICE_ROLLEN = ["leitung", "akquise", "transaktion", "buchhaltung", "lesen", "betrieb"]  # betrieb: Anlagen & Monitoring

BEREICHE = {
	"cockpit": "Cockpit", "vorgaenge": "Vorgänge", "flaechen": "Flächen", "akquise": "Akquise & Gebiete", "projekte": "Projekte",
	"interessen": "NDA & LOI", "provisionen": "Provisionen", "aufgaben": "Aufgaben", "crm": "CRM", "vorlagen": "Vorlagen",
	"automationen": "Automationen", "berichte": "Berichte", "export": "CSV-Export", "postausgang": "Postausgang", "nutzer": "Nutzer",
	"protokoll": "Protokoll", "rechte": "Rechte", "anlagen": "Anlagen & Monitoring", "sonstiges": "Weitere Admin-Funktionen",
}

# Spalten: leitung, akquise, transaktion, buchhaltung, lesen
_M = {
	"cockpit": [2, 1, 1, 1, 1],
	"vorgaenge": [2, 2, 1, 1, 1],
	"flaechen": [2, 2, 1, 0, 1],
	"akquise": [2, 2, 1, 0, 1],
	"projekte": [2, 1, 2, 1, 1],
	"interessen": [2, 0, 2, 1, 1],
	"provisionen": [2, 0, 1, 2, 1],
	"aufgaben": [2, 2, 2, 2, 1],
	"crm": [2, 2, 2, 1, 1],
	"vorlagen": [2, 2, 2, 1, 1],
	"automationen": [2, 1, 1, 0, 1],
	"berichte": [2, 1, 1, 2, 1],
	"export": [2, 1, 1, 1, 0],
	"postausgang": [2, 1, 1, 0, 1],
	"nutzer": [2, 1, 1, 1, 1],
	"protokoll": [2, 1, 1, 1, 1],
	"rechte": [2, 0, 0, 0, 0],
	"anlagen": [2, 0, 0, 1, 1],  # Anlagen & Monitoring
	"sonstiges": [2, 1, 1, 1, 1],
}
# Anlagen & Monitoring: Spalte „betrieb“ (wie rechte.js) – Anlagen schreiben, Cockpit/Nutzer lesen, Aufgaben schreiben
_BETRIEB = {"cockpit": 1, "aufgaben": 2, "anlagen": 2, "nutzer": 1}
for _b, _z in _M.items():
	if len(_z) < 6:
		_z.append(_BETRIEB.get(_b, 0))
RECHTE_MATRIX = {b: dict(zip(BACKOFFICE_ROLLEN, s)) for b, s in _M.items()}
STUFE_LABEL = ["–", "lesen", "schreiben"]
BEREICH_FUER_ART = {"vorgang": "vorgaenge", "flaeche": "flaechen", "projekt": "projekte", "interesse": "interessen", "provision": "provisionen"}


def rollen_aus_feld(wert):
	return [r for r in (x.strip() for x in str(wert or "").split(",")) if r in BACKOFFICE_ROLLEN]


def unterrollen(n):
	if not n or "admin" not in (n.get("rollen") or []):
		return []
	r = n.get("backofficeRollen")
	liste = [x for x in (r if isinstance(r, list) else rollen_aus_feld(r)) if x in BACKOFFICE_ROLLEN]
	return list(dict.fromkeys(liste)) or ["leitung"]


def stufe(n, bereich):
	zeile = RECHTE_MATRIX.get(bereich) or RECHTE_MATRIX["sonstiges"]
	return max([zeile.get(r, 0) for r in unterrollen(n)] or [0])


def darf_lesen(n, bereich):
	return stufe(n, bereich) >= 1


def recht_noetig(n, bereich, st=1):
	from oekoinvest_app.plattform.kern import admin_noetig

	admin_noetig(n)
	if stufe(n, bereich) < st:
		frappe.throw(f"Ihre Backoffice-Rolle erlaubt im Bereich „{BEREICHE.get(bereich, bereich)}“ kein {STUFE_LABEL[st]}.", frappe.PermissionError)
