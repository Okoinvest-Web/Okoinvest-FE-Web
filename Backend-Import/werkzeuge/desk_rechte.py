# Copyright (c) 2026, ÖkoInvest GmbH
#
# Desk-Rechte-Matrix (DocPerm) der App oekoinvest_app – EINE Quelle für alle DocType-JSONs.
#
#   python Backend-Import/werkzeuge/desk_rechte.py            # Abweichungen anzeigen
#   python Backend-Import/werkzeuge/desk_rechte.py --anwenden # "permissions" in den DocType-JSONs setzen (+ modified)
#
# Grundsätze (siehe Backend-Import/README.md, Abschnitt „Rollen & Rechte“):
#  - Website-Rollen („Plattform …“) und die technischen Rollen „ÖkoInvest API“ / „ÖkoInvest Anlagen-Dienst“
#    haben KEINE DocPerm. Alles läuft über die whitelisted Methoden, die Rolle UND Eigentum selbst prüfen.
#  - Desk-Rollen („ÖkoInvest …“, alle mit 2FA) sehen die Daten ihres Bereichs; geschrieben wird nur, wo die
#    bisherige Rolle „ÖkoInvest Admin“ schreiben durfte (append-only-Protokolle bleiben lesend).
#  - Löschen darf nur „System Manager“. Anlegen im Desk nur bei „Plattform Aufgabe“ (Kennungen per Controller).
#  - „System Manager“-Zeilen bleiben unverändert, wie sie in der JSON stehen.
#  - DocTypes anderer Teams, die hier (noch) fehlen, meldet werkzeuge/pruefen.py als Warnung.
#
# Läuft ohne Frappe (nur Standardbibliothek).

import json
import os
import re
import sys
from datetime import datetime

HIER = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HIER, "..", "oekoinvest_app", "oekoinvest_app"))

ADMIN = "ÖkoInvest Admin"
AKQUISE = "ÖkoInvest Akquise"
TRANSAKTION = "ÖkoInvest Transaktion"
BUCHHALTUNG = "ÖkoInvest Buchhaltung"
BETRIEB = "ÖkoInvest Betrieb"
COMPLIANCE = "ÖkoInvest Compliance"
LESER = "ÖkoInvest Leser"

DESK_ROLLEN = [ADMIN, AKQUISE, TRANSAKTION, BUCHHALTUNG, BETRIEB, COMPLIANCE, LESER]
# Rollen ohne jede DocPerm (Fehler in pruefen.py, falls doch)
OHNE_DOCPERM = [
	"ÖkoInvest API",
	"ÖkoInvest Anlagen-Dienst",
	"Plattform Flächeneigentümer",
	"Plattform Landwirt",
	"Plattform Investor",
	"Plattform Anbieter",
	"Plattform Unternehmen",
	"Plattform Mitglied",
	"Plattform Backoffice",
	"Guest",
	"All",
]

# Stufen: L = lesen (read, report, print) · S = bearbeiten (+ write, email; write nur wenn die DocType-JSON
# für „ÖkoInvest Admin“ bisher write=1 hatte) · A = S + export (nur Leitung) · C = S + create
L, S, A, C = "L", "S", "A", "C"

_KERN_LESEN = {LESER: L, COMPLIANCE: L}

MATRIX = {
	# Anfragen & Flächen
	"Plattform Vorgang": {ADMIN: A, AKQUISE: S, TRANSAKTION: L, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Flaeche": {ADMIN: A, AKQUISE: S, TRANSAKTION: L, **_KERN_LESEN},
	# Projektbörse & Deals
	"Plattform Projekt": {ADMIN: A, TRANSAKTION: S, AKQUISE: L, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Interesse": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Provision": {ADMIN: A, BUCHHALTUNG: S, TRANSAKTION: L, **_KERN_LESEN},
	"Plattform Frage": {ADMIN: S, TRANSAKTION: S, **_KERN_LESEN},
	"Plattform Anbieter Akte": {ADMIN: S, TRANSAKTION: S, **_KERN_LESEN},  # Anbieter / Verkäufer: Vermittlungsauftrag, Prüfpunkte, Voten, Vorkenntnis, Bestand
	"Plattform Bieterverfahren": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Gebot": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Datenraum Eintrag": {ADMIN: S, TRANSAKTION: S, **_KERN_LESEN},
	"Plattform Kontaktfreigabe": {ADMIN: S, TRANSAKTION: S, **_KERN_LESEN},
	"Plattform Zugriff": {ADMIN: L, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Projektaufruf": {ADMIN: L, TRANSAKTION: L, LESER: L},
	# CRM & Backoffice
	"Plattform CRM Kontakt": {ADMIN: A, AKQUISE: S, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform CRM Organisation": {ADMIN: A, AKQUISE: S, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform CRM Aktivitaet": {ADMIN: A, AKQUISE: S, TRANSAKTION: S, BUCHHALTUNG: L, **_KERN_LESEN},
	"Plattform Gebiet": {ADMIN: S, AKQUISE: S, LESER: L},
	"Plattform Objekt Info": {ADMIN: S, AKQUISE: S, TRANSAKTION: S, LESER: L},
	"Plattform Aufgabe": {ADMIN: C, AKQUISE: C, TRANSAKTION: C, BUCHHALTUNG: C, BETRIEB: C, **_KERN_LESEN},
	"Plattform Automation Regel": {ADMIN: S, AKQUISE: L, TRANSAKTION: L, **_KERN_LESEN},
	"Plattform Automation Lauf": {ADMIN: L, **_KERN_LESEN},
	"Plattform Vorlage": {ADMIN: S, AKQUISE: L, TRANSAKTION: L, LESER: L},
	"Plattform Monatsbericht": {ADMIN: S, AKQUISE: S, TRANSAKTION: S, BUCHHALTUNG: S, BETRIEB: S, COMPLIANCE: S, LESER: L},
	# Konten, Nachrichten, Dokumente
	"Plattform Konto": {ADMIN: A, AKQUISE: L, TRANSAKTION: L, BUCHHALTUNG: L, BETRIEB: L, **_KERN_LESEN},
	"Plattform Rolle": {ADMIN: L, LESER: L},
	"Plattform Nachricht": {ADMIN: L, AKQUISE: L, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Dokument": {ADMIN: L, AKQUISE: L, TRANSAKTION: L, BUCHHALTUNG: L, BETRIEB: L, COMPLIANCE: L},
	"Plattform Benachrichtigung": {ADMIN: L},
	# Organisation & Sicherheit (Protokolle enthalten IP-Adressen → nur Leitung/Compliance)
	"Plattform Organisation": {ADMIN: L, COMPLIANCE: L, LESER: L},
	"Plattform Mitgliedschaft": {ADMIN: L, COMPLIANCE: L},
	"Plattform Einladung": {ADMIN: L, COMPLIANCE: L},
	"Plattform Sitzung": {ADMIN: L, COMPLIANCE: L},
	"Plattform Geraet": {ADMIN: L, COMPLIANCE: L},
	"Plattform Anmeldung": {ADMIN: L, COMPLIANCE: L},
	"Plattform Aktivitaet": {ADMIN: L, COMPLIANCE: L},
	"Plattform Kette": {ADMIN: L, COMPLIANCE: L},
	"Plattform KI Nutzung": {ADMIN: L, COMPLIANCE: L},
	# nur System Manager (Geheimnisse bzw. private Notizen/Suchprofile der Investoren)
	"Plattform Token": {},
	"Plattform Zwei Faktor": {},
	"Plattform Notiz": {},
	"Plattform Suchprofil": {},
	# Anlagen & Betrieb
	"Plattform Anlage": {ADMIN: A, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Anlagenkomponente": {ADMIN: S, BETRIEB: S, LESER: L},
	"Plattform Messpunkt": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Geraetezugang": {ADMIN: S, BETRIEB: S},
	"Plattform Stoerungsfall": {ADMIN: A, BETRIEB: S, LESER: L},
	"Plattform Wartung": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Contracting Vertrag": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Zaehlerstand Monatswert": {ADMIN: A, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	# Betriebsführung (plattform/api/betrieb.py): Pläne, Prüfungen, Aufträge, Versicherung, Lager; Buchungen/Freigaben nur über das Portal
	"Plattform Wartungsplan": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Pruefprotokoll": {ADMIN: S, BETRIEB: S, LESER: L},
	"Plattform Serviceauftrag": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Versicherungsfall": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Ersatzteil": {ADMIN: S, BETRIEB: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Ersatzteil Bewegung": {ADMIN: L, BETRIEB: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Anlagen Einstrahlung": {ADMIN: S, BETRIEB: S, LESER: L},
	"Plattform Zaehler Freigabe": {ADMIN: L, BETRIEB: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Betrieb Einstellungen": {ADMIN: S, BETRIEB: L},
}

# Projektentwicklung: Desk-Rolle „ÖkoInvest Projektleitung“ (2FA); Website-Rolle „ÖkoInvest Gutachter“ ohne DocPerm
PROJEKTLEITUNG = "ÖkoInvest Projektleitung"
if PROJEKTLEITUNG not in DESK_ROLLEN:
	DESK_ROLLEN.append(PROJEKTLEITUNG)
if "ÖkoInvest Gutachter" not in OHNE_DOCPERM:
	OHNE_DOCPERM.append("ÖkoInvest Gutachter")
_ENTW = {ADMIN: A, PROJEKTLEITUNG: S, AKQUISE: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L}
MATRIX.update({
	"Plattform Entwicklungsprojekt": _ENTW,
	"Plattform Entwicklung Meilenstein": _ENTW,
	"Plattform Meilenstein Vorlage": {ADMIN: S, PROJEKTLEITUNG: S, LESER: L},
	"Plattform Entwicklung Risiko": _ENTW,
	"Plattform Entwicklung Entscheidung": {ADMIN: L, PROJEKTLEITUNG: L, LESER: L},  # append-only
	"Plattform Budgetposition": {ADMIN: A, PROJEKTLEITUNG: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Projektflaeche": {ADMIN: S, PROJEKTLEITUNG: S, AKQUISE: L, LESER: L},
	"Plattform Entwicklung Kontakt": {ADMIN: S, PROJEKTLEITUNG: S, LESER: L},
	"Plattform Entwicklung Freigabe": {ADMIN: S, PROJEKTLEITUNG: S, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Entwicklung Dokument": {ADMIN: L, PROJEKTLEITUNG: L},
	"Plattform Entwicklung Rueckfrage": {ADMIN: L, PROJEKTLEITUNG: L},
	"Plattform Gutachter Einladung": {ADMIN: L, PROJEKTLEITUNG: L, COMPLIANCE: L},
	"Plattform Gutachter Profil": {ADMIN: S, PROJEKTLEITUNG: S, LESER: L},
})
# Entwicklungssteuerung (plattform/api/entwicklung_steuerung.py): Entscheidungsvorlagen nur lesend im Desk (Zustandsautomat,
# Vier-Augen-Prinzip und Momentaufnahme nur über das Portal); Kapazität je Projektleitung pflegt die Leitung.
MATRIX.update({
	"Plattform Entwicklung Vorlage": {ADMIN: L, PROJEKTLEITUNG: L, LESER: L},
	"Plattform Entwicklung Kapazitaet": {ADMIN: S, PROJEKTLEITUNG: L},
})

# Planungsdateien (CAD) & Projektkostenkalkulation (plattform/api/planung.py): Plankopf pflegt die Projektleitung im Desk; Versionen
# (Freigabestatus, Dateien) und Kostenstände nur lesend – Upload, Freigabe und Festschreiben nur über das Portal (Nachweis).
MATRIX.update({
	"Plattform Planunterlage": {ADMIN: S, PROJEKTLEITUNG: S, AKQUISE: L, TRANSAKTION: L, LESER: L},
	"Plattform Planversion": {ADMIN: L, PROJEKTLEITUNG: L, LESER: L},
	"Plattform Kostenkalkulation": {ADMIN: A, PROJEKTLEITUNG: S, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Kostenstand": {ADMIN: L, PROJEKTLEITUNG: L, BUCHHALTUNG: L, LESER: L},  # append-only
})

# KYC/KYB: Personendaten und Unterlagen NUR für „ÖkoInvest Compliance“ (lesen im Desk; Prüfung/Entscheidung über das Portal
# bzw. plattform/api/kyc.py). Leitung/Admin bewusst ohne DocPerm (Datenminimierung) – Status sieht sie im Portal.
MATRIX.update({
	"KYC Fall": {COMPLIANCE: L},
	"KYC Dokument": {COMPLIANCE: L},
	"KYC Sanktionsabgleich": {COMPLIANCE: L},
	"KYC Sanktionslisteneintrag": {COMPLIANCE: L},
	"KYC Bankverbindung": {COMPLIANCE: L},
	"KYC Einstellungen": {COMPLIANCE: L},
})

# Dienste: Identität, Register, Bonität, Projektgesellschaften (plattform/api/dienste.py). Bonität und Identitätsprüfung
# nur für Leitung/Transaktion bzw. Compliance (Ergebnisse vertraulich); Checkliste der Gründung schreibt Transaktion.
MATRIX.update({
	"Plattform Identitaetspruefung": {ADMIN: L, COMPLIANCE: L},
	"Plattform eID Vorgang": {ADMIN: L, COMPLIANCE: L},  # staatliche eID (plattform/api/eid.py)
	"Plattform Registerauskunft": {ADMIN: L, TRANSAKTION: L, COMPLIANCE: L, LESER: L},
	"Plattform Bonitaetsauskunft": {ADMIN: L, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Projektgesellschaft": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: L, LESER: L},
})

# Dokumente, Signatur, Termine, Service & HR (plattform/api/{signatur,termine,support,hr}.py). Signaturprotokolle enthalten
# IP-Adressen → Leitung/Transaktion/Akquise/Compliance lesen; Wissensdatenbank intern für alle Desk-Rollen.
MATRIX.update({
	"Plattform Signaturvorgang": {ADMIN: L, AKQUISE: L, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Signatur Unterzeichner": {ADMIN: L, AKQUISE: L, TRANSAKTION: L, COMPLIANCE: L},
	"Plattform Termin": {ADMIN: S, AKQUISE: S, TRANSAKTION: S, BETRIEB: S, LESER: L},
	"Plattform Mitarbeiter": {ADMIN: S, LESER: L},
	"Plattform Abwesenheit": {ADMIN: S, LESER: L},
	"Plattform Zeiteintrag": {ADMIN: L, BUCHHALTUNG: L, PROJEKTLEITUNG: L},
	"Plattform Ticket": {ADMIN: S, BETRIEB: S, LESER: L},
	"Plattform Wissensartikel": {ADMIN: S, AKQUISE: S, TRANSAKTION: S, BUCHHALTUNG: S, BETRIEB: S, COMPLIANCE: L, LESER: L},
	"Plattform Service Einstellungen": {ADMIN: S},
})

# ERPNext-Finanzen & Abrechnung (plattform/api/finanzen.py): Belege, Zahlungsläufe und Läufe nur lesend (Nachweis, nicht löschbar);
# Verträge, Index, Aktivierung, Kosten und Einstellungen pflegt die Buchhaltung. Zahlungs-/Steuerlogik nur über das Portal.
MATRIX.update({
	"Plattform Pachtvertrag": {ADMIN: A, BUCHHALTUNG: S, AKQUISE: L, LESER: L},
	# Pachtakte (Team 1): nur lesen im Desk – Anliegen, Nachweise, Rückbau/Sicherheit laufen über die API (Zustandsautomaten)
	"Plattform Pacht Anliegen": {ADMIN: L, AKQUISE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Agri Nachweis": {ADMIN: L, AKQUISE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Pachtakte": {ADMIN: L, AKQUISE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Abrechnung": {ADMIN: L, BUCHHALTUNG: L, TRANSAKTION: L, LESER: L},
	"Plattform Klaerfall": {ADMIN: S, BUCHHALTUNG: S, BETRIEB: L, LESER: L},
	"Plattform Zahlungslauf": {ADMIN: L, BUCHHALTUNG: L},
	"Plattform Abrechnungslauf": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform VPI Wert": {ADMIN: S, BUCHHALTUNG: S, LESER: L},
	"Plattform Anlagen Aktivierung": {ADMIN: S, BUCHHALTUNG: S, BETRIEB: L, LESER: L},
	"Plattform Kostentraeger": {ADMIN: S, BUCHHALTUNG: S, LESER: L},
	"Plattform Projektkosten": {ADMIN: S, BUCHHALTUNG: S, LESER: L},
	"Plattform Finanzen Einstellungen": {ADMIN: S, BUCHHALTUNG: S},
})

# Backoffice-Werkzeuge (Team 8, plattform/api/{buchhaltung,datenschutz,transaktion}.py): Nachweise nur lesend (Storno, Import,
# Buchungen, Export – nicht löschbar); Einstellungen pflegt die Buchhaltung. Datenschutzanfragen/Verdachtsfälle: Need-to-know.
MATRIX.update({
	"Plattform Buchhaltung Einstellungen": {ADMIN: S, BUCHHALTUNG: S},
	"Plattform Stornobeleg": {ADMIN: L, BUCHHALTUNG: L, TRANSAKTION: L, LESER: L},
	"Plattform Kontoauszug Import": {ADMIN: L, BUCHHALTUNG: L},
	"Plattform Zahlungseingang": {ADMIN: L, BUCHHALTUNG: L},
	"Plattform Buchungsexport": {ADMIN: L, BUCHHALTUNG: L},
	"Plattform Monatsabschluss": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Datenschutzanfrage": {ADMIN: L, COMPLIANCE: L},
	"Plattform Verdachtsfall": {COMPLIANCE: L},
	"Plattform Deal Prognose": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
})

# Energiebeschaffung & Versorger-Ausschreibung (plattform/api/energie.py): Desk-Rolle „ÖkoInvest Energie“ (2FA); Website-Rolle
# „Plattform Lieferant“ ohne DocPerm. Angebote, Vollmachten, Analysen und Marktpreise nur lesend (Nachweis; Pflege über das Portal).
ENERGIE = "ÖkoInvest Energie"
if ENERGIE not in DESK_ROLLEN:
	DESK_ROLLEN.append(ENERGIE)
if "Plattform Lieferant" not in OHNE_DOCPERM:
	OHNE_DOCPERM.append("Plattform Lieferant")
MATRIX.update({
	"Plattform Marktpreis Spot": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Marktpreis Termin": {ADMIN: S, ENERGIE: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Energie Vertrag": {ADMIN: A, ENERGIE: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Ausschreibung": {ADMIN: A, ENERGIE: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Lieferantenangebot": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L},
	"Plattform Lieferant": {ADMIN: A, ENERGIE: S, COMPLIANCE: L, LESER: L},
	"Plattform Lieferant Einladung": {ADMIN: L, ENERGIE: L, COMPLIANCE: L},
	"Plattform Beschaffungstranche": {ADMIN: A, ENERGIE: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Wechselanalyse": {ADMIN: L, ENERGIE: L, LESER: L},
	"Plattform Beschaffungsvollmacht": {ADMIN: L, ENERGIE: L, COMPLIANCE: L},
	"Plattform Energie Einstellungen": {ADMIN: S, ENERGIE: S},
})

# Finanzierung (plattform/api/finanzierung.py): Website-Rolle „ÖkoInvest Bank“ ohne DocPerm (nur API, nur eigene Anfragen).
# Bankfinanzierung im Desk: Leitung/Transaktion/Buchhaltung; Szenarien der Investoren nur System Manager (privat);
# Covenant-Prüfungen append-only (lesen).
if "ÖkoInvest Bank" not in OHNE_DOCPERM:
	OHNE_DOCPERM.append("ÖkoInvest Bank")
MATRIX.update({
	"Plattform Finanzierungsszenario": {},
	"Plattform Finanzierungsfall": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: S, LESER: L},
	"Plattform Bank": {ADMIN: S, TRANSAKTION: S, BUCHHALTUNG: L, LESER: L},
	"Plattform Finanzierungsanfrage": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Term Sheet": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Kreditvertrag": {ADMIN: S, TRANSAKTION: S, BUCHHALTUNG: S, LESER: L},
	"Plattform Covenant Pruefung": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, BETRIEB: L, LESER: L},
	"Plattform Finanzierungsdokument": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L},
	"Plattform Foerderprogramm": {ADMIN: S, TRANSAKTION: S, BUCHHALTUNG: L, LESER: L},
})

# Grundbuch & Dienstbarkeiten + Deal-Abschluss (plattform/api/closing.py): Akten pflegen Akquise/Transaktion/Projektleitung
# (Flächensicherung, Projekte), Betrieb liest (Anlagen); Closing nur Leitung/Transaktion, Buchhaltung/Compliance lesen.
MATRIX.update({
	"Plattform Grundbuch Vorgang": {ADMIN: A, AKQUISE: S, TRANSAKTION: S, PROJEKTLEITUNG: S, BUCHHALTUNG: L, BETRIEB: L, LESER: L},
	"Plattform Closing": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: L, COMPLIANCE: L, PROJEKTLEITUNG: L, LESER: L},
})

# Geodaten & Akquise (A1/A1b, plattform/api/geodaten.py, api/akquise_kampagne.py): nur Leitung und Akquise (Bereich
# „geodaten“ der Rechte-Matrix). Kampagnen/Empfänger enthalten Eigentümerdaten; Sperrliste nur lesend (Pflege über die API).
MATRIX.update({
	"Plattform Akquise Ziel": {ADMIN: S, AKQUISE: S},
	"Plattform Netzkapazitaet": {ADMIN: S, AKQUISE: S},
	"Plattform Kampagne": {ADMIN: S, AKQUISE: S},
	"Plattform Kampagnenziel": {ADMIN: S, AKQUISE: S},
	"Plattform Sperrliste": {ADMIN: L, AKQUISE: L},
	"Plattform Gemeinde Potenzial": {ADMIN: S, AKQUISE: S},
})

# Fachprüfung Kapitalseite (plattform/api/fach.py): Abnahmestellen und Lastgänge der Unternehmen (Reststrom-Pool) nutzt die
# Energiebeschaffung (Kundenanalyse) – im Desk nur lesen wie Bereich „energie“ (Pflege nur über das Portal, Rolle UND Eigentum).
# Beteiligungs-Vormerkungen enthalten die Bestätigungs-IP → nur Leitung/Compliance lesen. Bewertungsszenarien der
# Investoren/Anbieter sind privat (wie Finanzierungsszenario) → nur System Manager.
MATRIX.update({
	"Plattform Abnahmestelle": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Lastgang": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Beteiligung Interesse": {ADMIN: L, COMPLIANCE: L},
	"Plattform Bewertung Szenario": {},
})

# Portfolio (plattform/api/portfolio.py): Positionen nach dem Kauf, Kapitalabrufe, Ausschüttungen – wie Bereich „portfolio“ der
# Rechte-Matrix: Leitung/Transaktion/Buchhaltung pflegen (Pflege nur über die API, Controller sichern Automat und Unveränderlichkeit),
# Betrieb/Projektleitung/Leser lesen. Abrufe und Ausschüttungen im Desk nur lesen (Nachweis).
MATRIX.update({
	"Plattform Portfolio Position": {ADMIN: A, TRANSAKTION: S, BUCHHALTUNG: S, BETRIEB: L, PROJEKTLEITUNG: L, LESER: L},
	"Plattform Kapitalabruf": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Ausschuettung": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
})

# Kundenseite Energie (plattform/api/kundenenergie.py): Kundenanliegen (Einspruch, Kündigung, Verlängerung, Übernahme) bearbeiten
# Leitung/Buchhaltung (Bereich „finanzen“), Betrieb/Leser lesen; Lieferantenwechsel wie Bereich „energie“. Statuswechsel nur über die
# API (Zustandsautomat, Benachrichtigung, Folgeaktionen) – im Desk Lesen/Kommentieren.
MATRIX.update({
	"Plattform Kundenanliegen": {ADMIN: A, BUCHHALTUNG: S, BETRIEB: L, LESER: L},
	"Plattform Lieferantenwechsel": {ADMIN: A, ENERGIE: S, BUCHHALTUNG: L, LESER: L},
})

# Gutachteraufträge & Bank-Akte (plattform/api/gutachterauftrag.py, api/bankakte.py): Pflege nur über die API (Zustandsautomat,
# Rechnungsprüfung, Teamrollen der Bank) – im Desk lesend (Nachweis). Website-Rollen Gutachter/Bank ohne DocPerm.
MATRIX.update({
	"Plattform Gutachterauftrag": {ADMIN: L, PROJEKTLEITUNG: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Bankakte": {ADMIN: L, TRANSAKTION: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Bank Mitglied": {ADMIN: L, TRANSAKTION: L, COMPLIANCE: L},
})

# Mitglied/Genossenschaft & Gemeindecockpit (Team 5, plattform/api/mitglied.py, api/gemeinde.py): Pflege nur über die API
# (Zustandsautomaten, Fristen, Benachrichtigungen) – im Desk lesend wie Bereich „genossenschaft“ bzw. „kommunen“ der Rechte-Matrix.
# Mitgliederliste enthält IBAN und Anschrift → Leitung/Buchhaltung/Compliance/Leser; Stimmzettel nur System Manager (Wahlgeheimnis).
MATRIX.update({
	"Plattform Genossenschaft": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, ENERGIE: L, LESER: L},
	"Plattform Genossenschaftsmitglied": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform Anteilsuebertragung": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform Generalversammlung": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform GV Stimme": {},
	"Plattform Genossenschaft Ausschuettung": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Energiegemeinschaft": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Teilnahme": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Abrechnung": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform Gemeinde Akte": {ADMIN: L, AKQUISE: L, PROJEKTLEITUNG: L, LESER: L},
})

# Energiegemeinschaften ElWG (WP1–WP6, plattform/api/eg_*.py): Pflege nur über die API (Kontext-Rollen je Gemeinschaft,
# Zustandsautomaten, Protokoll) – im Desk lesend wie Bereich „eg“ der Rechte-Matrix (Leitung, Buchhaltung, Energie, Leser;
# Mitglieder/Organe mit Personendaten und IBAN zusätzlich Compliance). Kindtabellen (istable) brauchen keinen Eintrag.
_EG_LESEN = {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L}
MATRIX.update({
	"Plattform EG Gemeinschaft": dict(_EG_LESEN),
	"Plattform EG Organ": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform EG Mitglied": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform EG Zaehlpunkt": dict(_EG_LESEN),
	"Plattform EG ZP Teilnahme": dict(_EG_LESEN),
	"Plattform EG Anlage": dict(_EG_LESEN),
	"Plattform EG Tarif": dict(_EG_LESEN),
	"Plattform EG Verteilschluessel": dict(_EG_LESEN),
	"Plattform EG Netzbetreiber": dict(_EG_LESEN),
	"Plattform EG Netzentgelt Regel": dict(_EG_LESEN),
	# WP2 EDA
	"Plattform EG EDA Prozess": {ADMIN: L, ENERGIE: L, LESER: L},
	"Plattform EG EDA Nachricht": {ADMIN: L, ENERGIE: L, LESER: L},
	# WP4 Abrechnung
	"Plattform EG Periode": {ADMIN: L, BUCHHALTUNG: L, ENERGIE: L, LESER: L},
	"Plattform EG Beleg": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Zahlung": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Buchung": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Abrechnung Einstellung": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	# WP5 Gründung, Wechsel, Verein (Stimmzettel nur System Manager – Wahlgeheimnis)
	"Plattform EG Gruendungsauftrag": {ADMIN: L, ENERGIE: L, LESER: L},
	"Plattform EG Import": {ADMIN: L, COMPLIANCE: L},
	"Plattform EG Foerdercheck": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Dokument": {ADMIN: L, COMPLIANCE: L, LESER: L},
	"Plattform EG Versammlung": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform EG Versammlung Stimme": {},
	"Plattform EG Beschluss": {ADMIN: L, BUCHHALTUNG: L, COMPLIANCE: L, LESER: L},
	"Plattform EG Beitrag": {ADMIN: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Vereinsakte": {ADMIN: L, COMPLIANCE: L, LESER: L},
	# WP3 Energiedaten (Messwerte nur aggregiert im Desk lesbar wie Bereich „eg“)
	"Plattform EG Messreihe": {ADMIN: L, ENERGIE: L, LESER: L},
	"Plattform EG Messmonat": {ADMIN: L, ENERGIE: L, BUCHHALTUNG: L, LESER: L},
	"Plattform EG Simulation": {ADMIN: L, ENERGIE: L, LESER: L},
	# WP6 Portale (Interessenten mit Personendaten)
	"Plattform EG Interesse": {ADMIN: L, ENERGIE: L, COMPLIANCE: L, LESER: L},
})

SCHLUESSEL = ["create", "delete", "email", "export", "print", "read", "report", "share", "write"]


def zeile(rolle, stufe, admin_schreibt):
	z = {k: 0 for k in SCHLUESSEL}
	z.update(read=1, report=1, print=1)
	if stufe in (S, A, C):
		z["email"] = 1
		z["write"] = 1 if admin_schreibt else 0
	if stufe == A:
		z["export"] = 1
	if stufe == C:
		z["write"] = 1
		z["create"] = 1
	z["role"] = rolle
	return z


def doctype_dateien():
	for wurzel, _ordner, dateien in os.walk(APP):
		if os.sep + "doctype" + os.sep not in wurzel + os.sep:
			continue
		for d in dateien:
			if d.endswith(".json") and d[:-5] == os.path.basename(wurzel):
				yield os.path.join(wurzel, d)


def soll_rechte(doc):
	"""Soll-Permissions einer DocType-JSON (None = nicht in der Matrix bzw. Kindtabelle)."""
	if doc.get("istable") or doc.get("name") not in MATRIX:
		return None
	alt = doc.get("permissions") or []
	sm = [p for p in alt if p.get("role") == "System Manager"] or [
		{k: 1 for k in SCHLUESSEL} | {"role": "System Manager"}
	]
	admin_alt = next((p for p in alt if p.get("role") == ADMIN), None)
	# write nur dort, wo bisher „ÖkoInvest Admin“ schreiben durfte (Singles/neue DocTypes: laut System Manager)
	admin_schreibt = bool((admin_alt or sm[0]).get("write"))
	neu = list(sm)
	for rolle in DESK_ROLLEN:
		stufe = MATRIX[doc["name"]].get(rolle)
		if stufe:
			neu.append(zeile(rolle, stufe, admin_schreibt))
	return neu


def _einfuegen(text, rechte):
	"""Nur den Block "permissions": [...] ersetzen – Rest der Datei bleibt byte-gleich."""
	m = re.search(r'\n \"permissions\": \[', text)
	if not m:
		raise ValueError("kein permissions-Block")
	start = m.start() + 1
	i = text.index("[", start)
	tiefe = 0
	for j in range(i, len(text)):
		if text[j] == "[":
			tiefe += 1
		elif text[j] == "]":
			tiefe -= 1
			if tiefe == 0:
				ende = j + 1
				break
	block = json.dumps(rechte, indent=1, ensure_ascii=False, sort_keys=True).replace("\n", "\n ")
	return text[:start] + ' "permissions": ' + block + text[ende:]


def _modified(text):
	jetzt = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
	return re.sub(r'\n \"modified\": \"[^\"]*\"', f'\n "modified": "{jetzt}"', text, count=1)


def main(anwenden=False):
	abweichend = 0
	for pfad in sorted(doctype_dateien()):
		with open(pfad, encoding="utf-8") as f:
			text = f.read()
		doc = json.loads(text)
		soll = soll_rechte(doc)
		if soll is None:
			if not doc.get("istable") and doc.get("name") not in MATRIX:
				print(f"WARNUNG nicht in der Matrix: {doc.get('name')}")
			continue
		ist = doc.get("permissions") or []
		norm = lambda liste: sorted(json.dumps(p, sort_keys=True) for p in liste)  # noqa: E731
		if norm(ist) == norm(soll):
			continue
		abweichend += 1
		print(f"{'setze' if anwenden else 'abweichend'}: {doc['name']}")
		if anwenden:
			with open(pfad, "w", encoding="utf-8", newline="\n") as f:
				f.write(_modified(_einfuegen(text, soll)))
	print(f"{abweichend} DocType(s) {'angepasst' if anwenden else 'abweichend'}.")
	return abweichend


if __name__ == "__main__":
	main("--anwenden" in sys.argv)
