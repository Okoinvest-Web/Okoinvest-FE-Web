# Copyright (c) 2026, ÖkoInvest GmbH
#
# Stammlisten der Plattform – 1:1 aus der Website übernommen:
#   src/lib/plattform/konstanten.js, src/lib/invest/markt.js (PHASEN, PROVISION)
# Bei Änderungen auf der Website hier nachziehen.

# ---------------------------------------------------------------- Rollen

ROLLE_API = "ÖkoInvest API"  # technischer API-Benutzer der Website (nur diese Rolle)
ROLLE_DESK_ADMIN = "ÖkoInvest Admin"  # Pflege im Frappe-Desk (Leserechte/Korrekturen)
ROLLE_PROJEKTLEITUNG = "ÖkoInvest Projektleitung"  # Projektentwicklung: Desk-Rolle (Entwicklungsprojekte pflegen, 2FA)
ROLLE_ANLAGEN_DIENST = "ÖkoInvest Anlagen-Dienst"  # Anlagen & Monitoring: technischer Benutzer des Ingest-Dienstes (nur dienst_*-Methoden)

# Website-Rollen-ID → (Frappe-Rolle, Bezeichnung, selbst wählbar)
ROLLEN = {
	"flaeche": ("Plattform Flächeneigentümer", "Flächeneigentümer", 1),
	"landwirt": ("Plattform Landwirt", "Landwirt", 1),
	"investor": ("Plattform Investor", "Investor", 1),
	"anbieter": ("Plattform Anbieter", "Projektentwickler / Anbieter", 1),
	"unternehmen": ("Plattform Unternehmen", "Unternehmen", 1),
	"mitglied": ("Plattform Mitglied", "Mitglied / Bürger", 1),
	"admin": ("Plattform Backoffice", "Backoffice", 0),
	"gutachter": ("ÖkoInvest Gutachter", "Gutachter / Planer", 0),  # Projektentwicklung: Website-Rolle, nur per Einladung
	"lieferant": ("Plattform Lieferant", "Energieversorger / Lieferant", 0),  # Energiebeschaffung: Website-Rolle, nur per Einladung
	"bank": ("ÖkoInvest Bank", "Bank / Finanzierungspartner", 0),  # Finanzierung: Website-Rolle, nur per Einladung zu einer Finanzierungsanfrage
}
ROLLEN_IDS = ["flaeche", "landwirt", "investor", "anbieter", "unternehmen", "mitglied"]
ALLE_ROLLEN_IDS = ROLLEN_IDS + ["admin", "gutachter", "lieferant", "bank"]  # gutachter: Projektentwicklung, lieferant: Energiebeschaffung, bank: Finanzierung (nur per Einladung)
FRAPPE_ROLLEN = [r[0] for r in ROLLEN.values()]

# ---------------------------------------------------------------- Anfragen

VORGANG_TYPEN = {
	"flaeche": "Fläche verpachten",
	"agri": "Agri-PV",
	"investor": "Investment",
	"projekt": "Projekt anbieten",
	"reststrom": "Reststrom-Pool",
	"energiegemeinschaft": "Energiegemeinschaft",
	"genossenschaft": "Genossenschaft",
	"kommune": "Kommune",
	"carport": "Solarcarport",
	"speicher": "Großspeicher",
	"kontakt": "Allgemeine Anfrage",
}

ROLLE_FUER_TYP = {
	"flaeche": "flaeche",
	"agri": "landwirt",
	"investor": "investor",
	"projekt": "anbieter",
	"reststrom": "unternehmen",
	"carport": "unternehmen",
	"speicher": "unternehmen",
	"kommune": "unternehmen",
	"genossenschaft": "mitglied",
	"energiegemeinschaft": "mitglied",
	"kontakt": "flaeche",
}

# ---------------------------------------------------------------- Projekte / Flächen

PROJEKT_TYPEN = {
	"freiflaeche": "Freiflächen-PV",
	"agri": "Agri-PV",
	"carport": "Solarcarport / Parkplatz",
	"speicher": "Batteriegroßspeicher",
	"hybrid": "PV mit Speicher",
	"dach": "Dach-PV (Gewerbe/Halle)",
}

LAENDER = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz"}

BUNDESLAENDER = {
	"DE": [
		"Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Mecklenburg-Vorpommern",
		"Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
	],
	"AT": ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
	"CH": [
		"Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft", "Basel-Stadt", "Bern", "Freiburg", "Genf", "Glarus",
		"Graubünden", "Jura", "Luzern", "Neuenburg", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Tessin",
		"Thurgau", "Uri", "Waadt", "Wallis", "Zug", "Zürich",
	],
}

NETZANSCHLUSS = ["offen", "angefragt", "zusage", "reserviert", "vorhanden"]
FLAECHE_NUTZUNG = ["acker", "gruenland", "konversion", "gewerbe", "sonstige", "dach", "dauerkultur", "brache", "deponie"]  # + Fachprüfung Flächen
EIGENTUM = ["eigentum", "miteigentum", "verwaltung", "erbengemeinschaft", "gesellschaft"]  # + Fachprüfung Flächen
PREIS_MODUS = ["gesamt", "proKwp", "anfrage"]

# Phasen aus src/lib/invest/markt.js (Reihenfolge ist relevant für das Matching)
PHASEN = [
	{"id": "flaeche", "kurz": "Flächensicherung"},
	{"id": "netz", "kurz": "Netzzusage"},
	{"id": "aufstellung", "kurz": "Aufstellungsbeschluss"},
	{"id": "satzung", "kurz": "Baurecht"},
	{"id": "rtb", "kurz": "Baureif"},
	{"id": "cod", "kurz": "Bestand"},
]
PHASEN_IDS = [p["id"] for p in PHASEN]

# ---------------------------------------------------------------- Provision / NDA

PROVISION_MIN = 0.015
PROVISION_MAX = 0.03
PROVISION_TEXT = "1,5–3 % des Kaufpreises, nur bei erfolgreichem Abschluss"
PROVISION_VERSION = "2026-09"
NDA_VERSION = "2026-09"

# ---------------------------------------------------------------- Nachrichten / Dokumente

BEZUG_ARTEN = ["vorgang", "flaeche", "projekt", "interesse", "nutzer"]
DOKUMENT_KATEGORIEN = ["allgemein", "datenraum", "vertrag", "plan"]

UPLOAD_MAX_BYTES = 10 * 1024 * 1024
UPLOAD_TYPEN = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}

# Objektart (Website) → DocType
DOCTYPE = {
	"vorgang": "Plattform Vorgang",
	"flaeche": "Plattform Flaeche",
	"projekt": "Plattform Projekt",
	"interesse": "Plattform Interesse",
	"provision": "Plattform Provision",
	"nutzer": "Plattform Konto",
}

# Präfixe der Kennungen (Format ^[A-Z]{1,3}-[0-9A-Z-]{4,40}$, siehe docs/API.md)
PRAEFIX = {
	"Plattform Konto": "U",
	"Plattform Vorgang": "V",
	"Plattform Flaeche": "F",
	"Plattform Projekt": "P",
	"Plattform Interesse": "I",
	"Plattform Provision": "PV",
	"Plattform Dokument": "D",
	"Plattform Nachricht": "M",
	"Plattform Aktivitaet": "A",
	"Plattform Benachrichtigung": "B",
	"Plattform Aufgabe": "AF",
	# Login, Sicherheit & Teams
	"Plattform Organisation": "O",
	"Plattform Mitgliedschaft": "MG",
	"Plattform Einladung": "EL",
	"Plattform Sitzung": "S",  # 10 zufällige Zeichen (Kennung steht im Sitzungs-Cookie)
	"Plattform Geraet": "G",
	"Plattform Anmeldung": "AN",
	# Deal-Room & Investoren
	"Plattform Frage": "FR",
	"Plattform Bieterverfahren": "BV",
	"Plattform Gebot": "GB",
	"Plattform Datenraum Eintrag": "DR",
	"Plattform Zugriff": "ZG",
	"Plattform Notiz": "NZ",
	"Plattform Suchprofil": "SP",
	"Plattform Kontaktfreigabe": "KF",
	"Plattform Projektaufruf": "PA",
	# Anlagen & Monitoring
	"Plattform Anlage": "AL",
	"Plattform Anlagenkomponente": "AK",
	"Plattform Messpunkt": "MP",
	"Plattform Geraetezugang": "GZ",
	"Plattform Stoerungsfall": "ST",
	"Plattform Wartung": "WA",
	"Plattform Contracting Vertrag": "CV",
	"Plattform Zaehlerstand Monatswert": "ZM",
	# KYC/KYB
	"KYC Fall": "KY",
	"KYC Dokument": "KD",
	"KYC Sanktionsabgleich": "KA",
	"KYC Bankverbindung": "KB",
	# ERPNext-Finanzen & Abrechnung
	"Plattform Pachtvertrag": "PT",
	"Plattform Abrechnung": "AR",
	"Plattform Klaerfall": "KL",
	"Plattform Zahlungslauf": "ZL",
	"Plattform Abrechnungslauf": "LA",
	"Plattform Anlagen Aktivierung": "AA",
	# Projektentwicklung
	"Plattform Entwicklungsprojekt": "EP",
	"Plattform Entwicklung Meilenstein": "MS",
	"Plattform Meilenstein Vorlage": "MV",
	"Plattform Entwicklung Risiko": "RK",
	"Plattform Entwicklung Entscheidung": "EN",
	"Plattform Budgetposition": "BP",
	"Plattform Projektflaeche": "PF",
	"Plattform Entwicklung Kontakt": "EK",
	"Plattform Entwicklung Freigabe": "FG",
	"Plattform Entwicklung Dokument": "ED",
	"Plattform Entwicklung Rueckfrage": "RF",
	"Plattform Gutachter Einladung": "GE",
	"Plattform Gutachter Profil": "GP",
	"Plattform Projektkosten": "PK",
	"Plattform Kostentraeger": "KT",
	# Fachprüfung Kapitalseite
	"Plattform Abnahmestelle": "AS",
	"Plattform Lastgang": "LG",
	"Plattform Bewertung Szenario": "SZ",
	"Plattform Beteiligung Interesse": "BI",
	# Dokumente, Signatur, Termine, Service & HR
	"Plattform Signaturvorgang": "SV",
	"Plattform Termin": "TE",
	"Plattform Mitarbeiter": "MA",
	"Plattform Abwesenheit": "AB",
	"Plattform Zeiteintrag": "ZE",
	"Plattform Ticket": "TK",
	"Plattform Wissensartikel": "WI",
	# Energiebeschaffung & Versorger-Ausschreibung
	"Plattform Marktpreis Spot": "SX",
	"Plattform Marktpreis Termin": "TP",
	"Plattform Energie Vertrag": "EV",
	"Plattform Ausschreibung": "EA",
	"Plattform Lieferantenangebot": "LO",
	"Plattform Lieferant": "LF",
	"Plattform Lieferant Einladung": "LE",
	"Plattform Beschaffungstranche": "BT",
	"Plattform Wechselanalyse": "WN",
	"Plattform Beschaffungsvollmacht": "VM",
	# Finanzierung: Cockpit-Szenarien, Bankfinanzierung Eigenbetrieb, Covenants, Förder-Check
	"Plattform Finanzierungsszenario": "FS",
	"Plattform Finanzierungsfall": "FF",
	"Plattform Bank": "FB",
	"Plattform Finanzierungsanfrage": "FA",
	"Plattform Term Sheet": "FT",
	"Plattform Kreditvertrag": "KV",
	"Plattform Covenant Pruefung": "CO",
	"Plattform Finanzierungsdokument": "FD",
	"Plattform Foerderprogramm": "FP",
}

# ---------------------------------------------------------------- Benachrichtigungen (Glocke) – wie BENACHRICHTIGUNG_ARTEN in konstanten.js
# Art → (Bezeichnung, Standard „per E-Mail“, nur Backoffice, nur für Rollen)
BENACHRICHTIGUNG_ARTEN = {
	"status": ("Statuswechsel", True, False, None),
	"nachricht": ("Neue Nachrichten", True, False, None),
	"nda": ("NDA-Freigabe & Datenraum", True, False, ["investor"]),
	"suchprofil": ("Neue passende Projekte", True, False, ["investor"]),
	"anfrage": ("Neue Anfragen", True, True, None),
	"aufgabe": ("Aufgaben & Wiedervorlagen", True, True, None),
	# Login, Sicherheit & Teams: E-Mail immer (nicht abschaltbar, daher nicht in den Einstellungen – „fest“)
	"sicherheit": ("Sicherheit & Anmeldungen", True, False, None),
	# Anlagen & Monitoring: neue/behobene Störung an einer eigenen bzw. betreuten Anlage
	"stoerung": ("Anlagenstörungen", True, False, ["unternehmen"]),
	# ERPNext-Finanzen & Abrechnung: neue Gutschrift/Rechnung, Zahlung, Zahlungserinnerung
	"abrechnung": ("Abrechnungen & Zahlungen", True, False, ["flaeche", "landwirt", "unternehmen", "anbieter"]),
	# Projektentwicklung: Fortschritt (Eigentümer, Co-Investoren), Fristen, Gutachten-Aufträge
	"entwicklung": ("Projektentwicklung", True, False, ["flaeche", "landwirt", "investor", "gutachter"]),
	# Energiebeschaffung: Kündigungsfristen, Angebotsvergleich zur Freigabe (Kunde); Angebotsanfragen, Fristen, Zuschläge (Versorger)
	"energie": ("Energiebeschaffung", True, False, ["unternehmen", "lieferant"]),
	# Finanzierung: Anfragen, Term Sheets, Entscheidungen (Bank) und Covenant-Frühwarnungen (Backoffice)
	"finanzierung": ("Finanzierung & Banken", True, False, ["bank", "investor"]),
	# Dokumente, Signatur, Termine, Service & HR
	"signatur": ("Elektronische Unterschrift", True, False, None),
	"termin": ("Termine", True, False, None),
	"ticket": ("Support-Anfragen", True, False, None),
}
BENACHRICHTIGUNG_ART_IDS = list(BENACHRICHTIGUNG_ARTEN)
BENACHRICHTIGUNG_FEST = ["sicherheit"]


def mail_einstellungen_standard():
	return {k: bool(a[1]) for k, a in BENACHRICHTIGUNG_ARTEN.items()}


# ---------------------------------------------------------------- Aufgaben / Suchprofil-Alarm
AUFGABE_STATUS = {"offen": "Offen", "erledigt": "Erledigt"}
AUFGABE_BEZUG_ARTEN = ["vorgang", "flaeche", "projekt", "interesse"]
SUCHPROFIL_SCHWELLE = {"standard": 70, "min": 50, "max": 100}
PROTOKOLL_AKTIONEN = ["export"]

# ---------------------------------------------------------------- Login, Sicherheit & Teams
# (src/lib/plattform/organisation.js, backend/demo/sicherheit.js, src/lib/plattform/sitzung.js)

# Organisationsarten → (Bezeichnung, Beschreibung)
ORGANISATION_ARTEN = {
	"investmenthaus": ("Investmenthaus / Investor", "Projekte prüfen, NDA und Datenraum im Team, gemeinsames Suchprofil."),
	"projektentwickler": ("Projektentwickler", "Projekte gemeinsam in die Börse stellen und Interessenten betreuen."),
	"stadtwerk": ("Stadtwerk / Kommune", "Flächen, Projekte und Beteiligungsmodelle im Team verfolgen."),
	"betrieb": ("Betrieb / Unternehmen", "Flächen, Anfragen und Unterlagen des Betriebs an einem Ort."),
}
# Teamrollen → (Bezeichnung, Stufe, Beschreibung). lesen 1 · mitglied 2 (bearbeiten) · admin 3 (verwalten) · inhaber 4
TEAM_ROLLEN = {
	"inhaber": ("Inhaber", 4, "Volle Rechte, überträgt die Inhaberschaft, löscht die Organisation."),
	"admin": ("Admin", 3, "Verwaltet Mitglieder und Einladungen, bearbeitet alles."),
	"mitglied": ("Mitglied", 2, "Sieht und bearbeitet die Objekte der Organisation."),
	"lesen": ("Nur lesen", 1, "Sieht die Objekte der Organisation, ändert nichts."),
}
EINLADUNG_ROLLEN = ["admin", "mitglied", "lesen"]  # Inhaber nur per Übertragung
ORGANISATION_OBJEKTE = ["flaeche", "projekt", "interesse"]
EINLADUNG_TAGE = 7
MAX_MITGLIEDER = 200
MAX_ORGANISATIONEN_JE_KONTO = 20

# Konto-Komfort (Avatarfarbe = Token des Design-Systems, Sprache)
AVATAR_FARBEN = ["navy", "gruen", "dunkelgruen", "sonne", "sand", "grau"]
SPRACHEN = {"de": "Deutsch", "en": "English (in Vorbereitung)"}

# Kontosperre mit exponentiellem Backoff: ab `schwelle` Fehlversuchen basis · 2^(fehl − schwelle) Sekunden, höchstens max
SPERRE = {"schwelle": 5, "basisSekunden": 30, "maxSekunden": 3600}
MAGIC_LINK_MINUTEN = 15
GERAET_MERKEN_TAGE = 30
SITZUNG_DAUER_S = 60 * 60 * 24 * 7  # wie SITZUNG_DAUER_S in src/lib/plattform/sitzung.js
EINRICHTUNG_2FA_MINUTEN = 30
MAX_SITZUNGEN_JE_KONTO = 30
