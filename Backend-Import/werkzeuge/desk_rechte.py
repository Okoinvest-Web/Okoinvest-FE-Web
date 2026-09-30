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
