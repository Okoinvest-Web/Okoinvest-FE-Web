# Copyright (c) 2026, ÖkoInvest GmbH
#
# Backoffice-Unterrollen (identisch zu src/lib/plattform/rechte.js – dort ist die Wahrheit): leitung, akquise, transaktion,
# buchhaltung, lesen, betrieb, compliance, projektleitung, energie. Abgleich JS ↔ Python: tests/test_rechte_kern.py und
# werkzeuge/pruefen.py (Fehler bei jeder Abweichung in Unterrollen, Bereichen oder Stufen).
# Gespeichert am Plattform Konto im Feld `backoffice_rollen` (kommagetrennt, ausgegeben als `backofficeRollen`).
# Ohne Unterrolle gilt „leitung“ (rückwärtskompatibel). Stufen: 0 kein Zugriff, 1 lesen, 2 schreiben.
# Die Website prüft vorab in jeder Admin-Route (server/route.js); die Backoffice-Methoden prüfen selbst mit recht_noetig().

import frappe

BACKOFFICE_ROLLEN = ["leitung", "akquise", "transaktion", "buchhaltung", "lesen", "betrieb", "compliance"]  # betrieb: Anlagen & Monitoring, compliance: KYC/KYB

BEREICHE = {
	"cockpit": "Cockpit", "vorgaenge": "Vorgänge", "flaechen": "Flächen", "akquise": "Akquise & Gebiete", "projekte": "Projekte",
	"interessen": "NDA & LOI", "provisionen": "Provisionen", "aufgaben": "Aufgaben", "crm": "CRM", "vorlagen": "Vorlagen",
	"automationen": "Automationen", "berichte": "Berichte", "export": "CSV-Export", "postausgang": "Postausgang", "nutzer": "Nutzer",
	"protokoll": "Protokoll", "rechte": "Rechte", "anlagen": "Anlagen & Monitoring", "compliance": "Compliance (KYC/KYB)", "sonstiges": "Weitere Admin-Funktionen",
	"finanzen": "Finanzen & Abrechnung",  # ERPNext-Finanzen & Abrechnung
	"finanzierung": "Finanzierung & Banken",  # Bankfinanzierung Eigenbetrieb, Covenants, Geschäftsmodell
	"entwicklung": "Projektentwicklung",  # Projektentwicklung
	"gesellschaften": "Gesellschaften & SPV-Gründung", "bonitaet": "Bonitätsauskünfte", "register": "Registerauskünfte",  # Dienste
	"grundbuch": "Grundbuch & Dienstbarkeiten", "closing": "Deal-Abschluss (Closing)",  # Grundbuch & Closing
	"portfolio": "Portfolio & Beteiligungen",  # Investor-Portfolio nach dem Kauf
	"pachtakte": "Pachtakten (Kündigung, Eigentümerwechsel, Rückbau)",  # Team 1: Pachtakte nach Vertragsschluss
	"geodaten": "Geodaten & Akquise-Karte",  # Geodaten & Akquise-Engine
	"signatur": "Elektronische Unterschrift", "kalender": "Termine & Kalender", "support": "Service & Support", "team": "Team & HR", "wissen": "Wissensdatenbank",  # Signatur, Termine, Service & HR
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
	"compliance": [1, 0, 0, 0, 0],  # KYC/KYB: Leitung nur Warteschlange/Status, Unterlagen nur Unterrolle „compliance“
	"entwicklung": [2, 1, 1, 1, 1],  # Projektentwicklung (übrige Unterrollen lesen)
	"finanzen": [2, 0, 1, 2, 1],  # ERPNext-Finanzen & Abrechnung (rechte.js: zusätzlich Projektleitung lesen)
	"finanzierung": [2, 0, 2, 2, 1],  # Bankfinanzierung (wie rechte.js): Leitung/Transaktion/Buchhaltung schreiben, Lesen lesen; Entscheidung nur Leitung
	# Dienste – alle 8 Spalten (leitung, akquise, transaktion, buchhaltung, lesen, betrieb, compliance, projektleitung), wie rechte.js
	"gesellschaften": [2, 0, 2, 1, 1, 0, 0, 1],
	"bonitaet": [2, 0, 2, 0, 0, 0, 2, 0],
	"register": [2, 1, 2, 1, 1, 0, 2, 1],
	"geodaten": [2, 2, 0, 0, 0, 0, 0, 0],  # Geodaten & Akquise-Engine: nur Leitung und Akquise (wie rechte.js)
	# Signatur, Termine, Service & HR – alle 8 Spalten, wie rechte.js
	"signatur": [2, 2, 2, 1, 1, 0, 1, 1],
	"kalender": [2, 2, 2, 1, 1, 2, 1, 2],
	"support": [2, 1, 1, 1, 1, 2, 1, 1],
	"team": [2, 1, 1, 1, 1, 1, 1, 1],
	"wissen": [2, 2, 2, 2, 1, 2, 2, 2],
	# Grundbuch & Closing – 8 Spalten (leitung, akquise, transaktion, buchhaltung, lesen, betrieb, compliance, projektleitung), wie rechte.js
	"grundbuch": [2, 2, 2, 1, 1, 1, 0, 2],
	"pachtakte": [2, 2, 1, 2, 1, 1, 0, 1],  # Pachtakten (wie rechte.js)
	"closing": [2, 0, 2, 1, 1, 0, 1, 1],
	"portfolio": [2, 0, 2, 2, 1, 1, 0, 1],  # Portfolio (wie rechte.js): Leitung/Transaktion/Buchhaltung schreiben, Lesen/Betrieb/Projektleitung lesen
	"sonstiges": [2, 1, 1, 1, 1],
}
# Anlagen & Monitoring: Spalte „betrieb“ (wie rechte.js) – Anlagen schreiben, Cockpit/Nutzer lesen, Aufgaben schreiben
_BETRIEB = {"cockpit": 1, "aufgaben": 2, "anlagen": 2, "nutzer": 1}
for _b, _z in _M.items():
	if len(_z) < 6:
		_z.append(_BETRIEB.get(_b, 0))
# KYC/KYB: Spalte „compliance“ (wie rechte.js) – Compliance schreiben, Cockpit/Nutzer/Protokoll lesen, Aufgaben schreiben
_COMPLIANCE = {"cockpit": 1, "aufgaben": 2, "nutzer": 1, "protokoll": 1, "compliance": 2}
for _b, _z in _M.items():
	if len(_z) < 7:
		_z.append(_COMPLIANCE.get(_b, 0))
# Projektentwicklung: Spalte „projektleitung“ (wie rechte.js) – Entwicklung und CRM schreiben, Aufgaben schreiben, Kernbereiche lesen
_PROJEKTLEITUNG = {"cockpit": 1, "aufgaben": 2, "flaechen": 1, "akquise": 1, "projekte": 1, "crm": 2, "vorlagen": 1, "berichte": 1, "nutzer": 1, "entwicklung": 2, "finanzen": 1, "finanzierung": 1}
if "projektleitung" not in BACKOFFICE_ROLLEN:
	BACKOFFICE_ROLLEN.append("projektleitung")
for _b, _z in _M.items():
	while len(_z) < len(BACKOFFICE_ROLLEN) - 1:
		_z.append(0)
	if len(_z) < len(BACKOFFICE_ROLLEN):
		_z.append(_PROJEKTLEITUNG.get(_b, 0))
# Energiebeschaffung: Bereich „energie“ (Leitung schreiben, Buchhaltung/Lesen lesen) und Spalte „energie“ (wie rechte.js)
BEREICHE["energie"] = "Energiebeschaffung"
_ENERGIE = {"cockpit": 1, "vorgaenge": 1, "aufgaben": 2, "crm": 2, "vorlagen": 1, "berichte": 1, "nutzer": 1, "energie": 2, "kalender": 2, "wissen": 1}
if "energie" not in _M:
	_M["energie"] = [2, 0, 0, 1, 1]
if "energie" not in BACKOFFICE_ROLLEN:
	BACKOFFICE_ROLLEN.append("energie")
for _b, _z in _M.items():
	while len(_z) < len(BACKOFFICE_ROLLEN) - 1:
		_z.append(0)
	if len(_z) < len(BACKOFFICE_ROLLEN):
		_z.append(_ENERGIE.get(_b, 0))
# Mitglied/Genossenschaft und Gemeindecockpit (Team 5) – alle 9 Spalten, wie rechte.js
BEREICHE["genossenschaft"] = "Genossenschaft & Energiegemeinschaften"
BEREICHE["kommunen"] = "Kommunen & Gemeinden"
_M["genossenschaft"] = [2, 1, 1, 2, 1, 0, 1, 0, 2]
_M["kommunen"] = [2, 2, 1, 1, 1, 0, 0, 2, 0]
# Energiegemeinschaften ElWG (WP1): Bereich „eg“ und Spalte „eg“ (Betriebsführung/Organisator), wie rechte.js
BEREICHE["eg"] = "Energiegemeinschaften (ElWG)"
_M["eg"] = [2, 0, 0, 1, 1, 0, 1, 0, 1]
_EG = {"cockpit": 1, "vorgaenge": 1, "aufgaben": 2, "crm": 2, "vorlagen": 1, "berichte": 1, "nutzer": 1, "signatur": 2, "kalender": 2, "support": 1, "wissen": 1, "genossenschaft": 1, "kommunen": 1, "eg": 2}
if "eg" not in BACKOFFICE_ROLLEN:
	BACKOFFICE_ROLLEN.append("eg")
for _b, _z in _M.items():
	while len(_z) < len(BACKOFFICE_ROLLEN) - 1:
		_z.append(0)
	if len(_z) < len(BACKOFFICE_ROLLEN):
		_z.append(_EG.get(_b, 0))
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
