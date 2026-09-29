# Copyright (c) 2026, ÖkoInvest GmbH
#
# Stammlisten der Plattform – 1:1 aus der Website übernommen:
#   src/lib/plattform/konstanten.js, src/lib/invest/markt.js (PHASEN, PROVISION)
# Bei Änderungen auf der Website hier nachziehen.

# ---------------------------------------------------------------- Rollen

ROLLE_API = "ÖkoInvest API"  # technischer API-Benutzer der Website (nur diese Rolle)
ROLLE_DESK_ADMIN = "ÖkoInvest Admin"  # Pflege im Frappe-Desk (Leserechte/Korrekturen)

# Website-Rollen-ID → (Frappe-Rolle, Bezeichnung, selbst wählbar)
ROLLEN = {
	"flaeche": ("Plattform Flächeneigentümer", "Flächeneigentümer", 1),
	"landwirt": ("Plattform Landwirt", "Landwirt", 1),
	"investor": ("Plattform Investor", "Investor", 1),
	"anbieter": ("Plattform Anbieter", "Projektentwickler / Anbieter", 1),
	"unternehmen": ("Plattform Unternehmen", "Unternehmen", 1),
	"mitglied": ("Plattform Mitglied", "Mitglied / Bürger", 1),
	"admin": ("Plattform Backoffice", "Backoffice", 0),
}
ROLLEN_IDS = ["flaeche", "landwirt", "investor", "anbieter", "unternehmen", "mitglied"]
ALLE_ROLLEN_IDS = ROLLEN_IDS + ["admin"]
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
FLAECHE_NUTZUNG = ["acker", "gruenland", "konversion", "gewerbe", "sonstige"]
EIGENTUM = ["eigentum", "miteigentum", "verwaltung"]
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
}
