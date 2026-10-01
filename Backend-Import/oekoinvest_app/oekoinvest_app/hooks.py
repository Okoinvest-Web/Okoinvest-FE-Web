app_name = "oekoinvest_app"
app_title = "ÖkoInvest Plattform"
app_publisher = "ÖkoInvest GmbH"
app_description = "Plattform-Backend der ÖkoInvest-Website: Portal, Projektbörse, Prozesse und Backoffice"
app_email = ""  # Kontaktadresse noch nicht freigegeben
app_license = "Proprietär"
# Nur Frappe ist Pflicht. ERPNext, HRMS, Drive, Helpdesk sind OPTIONAL (Integration nur, wenn installiert UND per
# site_config eingeschaltet) – deshalb hier bewusst KEIN Eintrag, siehe docs/BRIEFING.md „Ausbaustufe 4“.
required_apps = ["frappe"]

# ======================================================================================================
# Pflege dieser Datei: Team „Go-live-Paket“. Andere Teams tragen NUR gezielt in die markierten Listen ein
# (Datei direkt vorher neu lesen, kleine Einfügung, nichts umformatieren). Danach prüfen:
#   python Backend-Import/werkzeuge/pruefen.py   (Funktionen existieren, Fixtures/Workspaces/Druckformate gültig)
# ======================================================================================================

# ------------------------------------------------------------------------------------------------------
# Rollen (fixtures/role.json)
#   ÖkoInvest Admin (= Leitung), Akquise, Transaktion, Buchhaltung, Betrieb, Compliance, Leser – Desk-Rollen, alle mit 2FA
#   ÖkoInvest API              – ausschließlich der technische API-Benutzer der Website (kein Desk, keine DocPerm)
#   ÖkoInvest Anlagen-Dienst   – technischer Benutzer des Ingest-Dienstes (nur dienst_*-Methoden)
#   Plattform …                – fachliche Website-Rollen (automatisch aus „Plattform Konto“, kein Desk, keine DocPerm)
# DocPerm-Matrix: Backend-Import/werkzeuge/desk_rechte.py (eine Quelle für alle DocType-JSONs)
# ------------------------------------------------------------------------------------------------------
ROLLEN_FIXTURES = [
	"ÖkoInvest Admin",
	"ÖkoInvest Akquise",
	"ÖkoInvest Transaktion",
	"ÖkoInvest Buchhaltung",
	"ÖkoInvest Betrieb",
	"ÖkoInvest Compliance",
	"ÖkoInvest Leser",
	"ÖkoInvest API",
	"ÖkoInvest Anlagen-Dienst",  # Anlagen & Monitoring: Ingest-Dienst
	"Plattform Flächeneigentümer",
	"Plattform Landwirt",
	"Plattform Investor",
	"Plattform Anbieter",
	"Plattform Unternehmen",
	"Plattform Mitglied",
	"Plattform Backoffice",
	# ↓ weitere Rollen anderer Teams hier eintragen (und in fixtures/role.json ergänzen)
	"ÖkoInvest Energie",  # Energiebeschaffung: Desk-Rolle Handelsdesk (2FA)
	"Plattform Lieferant",  # Energiebeschaffung: Website-Rolle Energieversorger (nur per Einladung, keine DocPerm)
	"ÖkoInvest Projektleitung",  # Projektentwicklung: Desk-Rolle
	"ÖkoInvest Gutachter",  # Projektentwicklung: Website-Rolle (Gutachter/Planer, nur per Einladung)
	"ÖkoInvest Bank",  # Finanzierung: Website-Rolle Bank/Finanzierungspartner (nur per Einladung, keine DocPerm)
	"Plattform Kommune",  # Onboarding B1: Website-Rolle Kommune/Gemeinde (selbst wählbar, keine DocPerm)
]

ROLE_PROFILES = [
	"ÖkoInvest Leitung",
	"ÖkoInvest Akquise",
	"ÖkoInvest Transaktion",
	"ÖkoInvest Buchhaltung",
	"ÖkoInvest Betrieb",
	"ÖkoInvest Compliance",
	"ÖkoInvest Nur lesen",
	"ÖkoInvest API-Benutzer",
	"ÖkoInvest Anlagen-Dienst",
	"ÖkoInvest Energie",  # Energiebeschaffung
]

WORKFLOW_ZUSTAENDE = [
	"abgelehnt", "abgeschlossen", "angebot", "bau", "betrieb", "eingegangen", "entwurf", "in_pruefung", "pachtangebot", "planung",
	"pruefung", "qualifiziert", "reserviert", "standortanalyse", "verkauft", "veroeffentlicht", "vertrag", "vorpruefung", "zurueckgezogen",
]
WORKFLOW_AKTIONEN = [
	"Ablehnen", "Abschließen", "Als eingegangen übernehmen", "Als qualifiziert markieren", "Als reserviert markieren", "Angebot / Gespräch",
	"Angebot angenommen (erfasst)", "Baubeginn", "Inbetriebnahme", "Pachtangebot senden", "Planung & Genehmigung starten", "Prüfung beginnen",
	"Reservierung aufheben", "Standortanalyse starten", "Verkauf abschließen", "Veröffentlichen", "Vorprüfung starten", "Wieder aufnehmen",
	"Zur Überarbeitung zurückgeben",
]

# Fixtures: `bench export-fixtures` exportiert nach diesen Filtern; beim Migrate importiert Frappe ALLE
# JSON-Dateien in fixtures/. Namensregel: Präfix „ÖkoInvest“ bzw. Modul „Plattform“.
fixtures = [
	{"dt": "Role", "filters": [["name", "in", ROLLEN_FIXTURES]]},
	{"dt": "Role Profile", "filters": [["name", "in", ROLE_PROFILES]]},
	{"dt": "Letter Head", "filters": [["name", "in", ["ÖkoInvest"]]]},
	{"dt": "Email Template", "filters": [["name", "like", "ÖkoInvest:%"]]},
	{"dt": "Notification", "filters": [["name", "like", "ÖkoInvest:%"]]},
	# Workflows sind INAKTIV (Prozessdarstellung) – Zustände = Status-IDs der Automaten, siehe plattform/desk.py
	{"dt": "Workflow State", "filters": [["name", "in", WORKFLOW_ZUSTAENDE]]},
	{"dt": "Workflow Action Master", "filters": [["name", "in", WORKFLOW_AKTIONEN]]},
	{"dt": "Workflow", "filters": [["name", "like", "ÖkoInvest%"]]},
	{"dt": "Number Card", "filters": [["module", "=", "Plattform"]]},
	{"dt": "Dashboard Chart", "filters": [["module", "=", "Plattform"]]},
	# Custom Fields/Property Setter auf FRAPPE-Standard-DocTypes (Modul Plattform). Felder für optionale Apps
	# (ERPNext, HRMS …) NICHT als Fixture, sondern in plattform/einrichtung.py → OPTIONALE_FELDER.
	{"dt": "Custom Field", "filters": [["module", "=", "Plattform"]]},
	{"dt": "Property Setter", "filters": [["module", "=", "Plattform"]]},
	# ↓ weitere Fixtures anderer Teams hier eintragen
]

# ------------------------------------------------------------------------------------------------------
# Installation / Migration (idempotent)
#   installation.nach_*  – Rollen + Stammdaten „Plattform Rolle“
#   einrichtung.anwenden – Systemeinstellungen (Sprache, Zeitzone, Formate, Passwort-Richtlinie, 2FA, Website nur
#                          Login, Briefkopf, Protokoll-Aufbewahrung), optionale Custom Fields
# ------------------------------------------------------------------------------------------------------
after_install = [
	"oekoinvest_app.plattform.installation.nach_installation",
	"oekoinvest_app.plattform.einrichtung.anwenden",
	# ↓ weitere after_install-Schritte
]
after_migrate = [
	"oekoinvest_app.plattform.installation.nach_migration",
	"oekoinvest_app.plattform.einrichtung.anwenden",
	"oekoinvest_app.plattform.kyc_aufgaben.einrichten",  # KYC/KYB: Workflow „KYC Prüfung“, Einstellungen
	# ↓ weitere after_migrate-Schritte
	"oekoinvest_app.plattform.api.entwicklung.vorlagen_sicherstellen",  # Projektentwicklung: Standard-Meilenstein-Vorlagen
]

# Das Aktivitätsprotokoll und Tokens verhindern das Löschen von Konten nicht (Protokoll bleibt lesbar).
ignore_links_on_delete = ["Plattform Aktivitaet", "Plattform Token", "Plattform Anmeldung", "Plattform Sitzung"]

# ------------------------------------------------------------------------------------------------------
# Desk: Statuswechsel-Knöpfe über den Zustandsautomaten (plattform/desk.py) – Frappe-Workflows bleiben inaktiv
# ------------------------------------------------------------------------------------------------------
doctype_js = {
	"Plattform Vorgang": "public/js/desk_status.js",
	"Plattform Flaeche": "public/js/desk_status.js",
	"Plattform Projekt": "public/js/desk_status.js",
	"Plattform Interesse": "public/js/desk_status.js",
	"Plattform Provision": "public/js/desk_status.js",
	# ↓ weitere Formular-Skripte
}

# Jinja-Hilfen für Druckformate, Briefkopf und E-Mail-Vorlagen (plattform/druck.py)
jinja = {
	"methods": [
		"oekoinvest_app.plattform.druck.oekoinvest_firma",
		"oekoinvest_app.plattform.druck.oekoinvest_json",
		"oekoinvest_app.plattform.druck.oekoinvest_datum",
		"oekoinvest_app.plattform.druck.oekoinvest_zahl",
		"oekoinvest_app.plattform.druck.oekoinvest_eur",
		"oekoinvest_app.plattform.druck.oekoinvest_prozent",
		"oekoinvest_app.plattform.druck.oekoinvest_status",
		"oekoinvest_app.plattform.druck.oekoinvest_label",
		"oekoinvest_app.plattform.druck.oekoinvest_nda",
		"oekoinvest_app.plattform.druck.oekoinvest_provision",
		"oekoinvest_app.plattform.druck.oekoinvest_konto",
		"oekoinvest_app.plattform.druck.oekoinvest_projekt",
		"oekoinvest_app.plattform.druck.oekoinvest_oeffentlich",
		"oekoinvest_app.plattform.druck.oekoinvest_vertraulich",
		"oekoinvest_app.plattform.druck.oekoinvest_anlage",
		"oekoinvest_app.plattform.druck.oekoinvest_anlage_kurz",
		"oekoinvest_app.plattform.druck.oekoinvest_monatsbericht",
		# ERPNext-Finanzen & Abrechnung: Belege (Plattform Abrechnung, Purchase/Sales Invoice)
		"oekoinvest_app.plattform.finanzen.druck.oekoinvest_abrechnung",
		"oekoinvest_app.plattform.finanzen.druck.oekoinvest_beleg_erpnext",
		"oekoinvest_app.plattform.dienste_kern.oekoinvest_gesellschaft",  # Dienste: Druckformat „Projektgesellschaft Gründungspaket“
		# ↓ weitere Jinja-Methoden (Präfix „oekoinvest_“)
		"oekoinvest_app.plattform.api.closing.oekoinvest_grundbuch",  # Grundbuch & Closing: Druckformate Dienstbarkeit/Servitut, Rangrücktritt, Löschung (Muster)
		"oekoinvest_app.plattform.api.closing.oekoinvest_closing",  # Grundbuch & Closing: Druckformate Kaufvertrag (Muster), Abschlussbericht
		"oekoinvest_app.plattform.energie_druck.oekoinvest_energie_vergleich",  # Energiebeschaffung: Angebotsvergleich/Zuschlag
		"oekoinvest_app.plattform.api.entwicklung.oekoinvest_entwicklung",  # Projektentwicklung: Druckformat „Projektsteckbrief“
		"oekoinvest_app.plattform.api.planung.oekoinvest_kostenrahmen",  # Planungsdateien & Projektkosten: Druckformat „Kostenrahmen“
		"oekoinvest_app.plattform.api.akquise_kampagne.oekoinvest_serienbrief",  # Akquise A1b: Druckformat „Serienbrief Akquise“
	],
}

# ------------------------------------------------------------------------------------------------------
# Dokument-Ereignisse (derzeit keine – die App arbeitet über Controller). Format:
#   doc_events = {"DocType": {"on_update": "oekoinvest_app.….funktion"}}
# ------------------------------------------------------------------------------------------------------
doc_events = {
	# ERPNext-Finanzen & Abrechnung: Zahlungseingang/-ausgang → Status der Plattform-Belege (prüft selbst „installiert + Schalter“);
	# neue Provision (Verkauf) → Provisionsrechnung sofort
	"Payment Entry": {
		"on_submit": "oekoinvest_app.plattform.finanzen.erpnext.zahlung_abgleichen",
		"on_cancel": "oekoinvest_app.plattform.finanzen.erpnext.zahlung_abgleichen",
	},
	"Plattform Provision": {"after_insert": "oekoinvest_app.plattform.finanzen.abrechnung.provision_angelegt"},
	# ↓ Einträge anderer Teams (z. B. ERPNext-Rechnungen) – nur mit Prüfung „App installiert + Schalter an“
	# Dokumente & Service: Spiegelung nach Frappe Drive (nur mit App `drive` + oekoinvest_drive; KYC zusätzlich oekoinvest_drive_kyc, verschlüsselt)
	"Plattform Dokument": {"after_insert": "oekoinvest_app.plattform.service.drive.nach_dokument"},
	"KYC Dokument": {"after_insert": "oekoinvest_app.plattform.service.drive.nach_kyc_dokument"},
}

# ------------------------------------------------------------------------------------------------------
# Geplante Aufgaben (Scheduler und Worker müssen laufen: bench doctor)
# ------------------------------------------------------------------------------------------------------
scheduler_events = {
	"daily": [
		"oekoinvest_app.plattform.aufgaben.tokens_aufraeumen",
		"oekoinvest_app.plattform.aufgaben.wiedervorlagen_erinnern",
		"oekoinvest_app.plattform.backoffice.fristen_taeglich",  # Automationen: Regeln „Frist überschritten“
		# Login, Sicherheit & Teams: alte Sitzungen, abgelaufene Einladungen, Anmeldehistorie > 180 Tage
		"oekoinvest_app.plattform.sicherheit.aufraeumen",
		# Löschkonzept: Benachrichtigungen, KI-/Automations-Protokolle, Anfragen ohne Konto (Fristen per site_config)
		"oekoinvest_app.plattform.aufbewahrung.taeglich",
		# KYC/KYB: Ausweis-Ablauf, Wiederholungsprüfung, Neuabgleich Sanktionsliste, Löschfristen (§ 8 Abs. 4 GwG)
		"oekoinvest_app.plattform.kyc_aufgaben.fristen_taeglich",
		# ERPNext-Finanzen & Abrechnung: fällige Pacht-Gutschriften, Provisionsrechnungen, Contracting (Vormonat ab dem 5.),
		# Zahlungsstatus aus ERPNext
		"oekoinvest_app.plattform.finanzen.abrechnung.lauf_taeglich",
		"oekoinvest_app.plattform.api.dienste.gesellschaft_fristen_taeglich",  # Dienste: Fristen der Projektgesellschaften (Meldungen, Jahresabschluss, WiEReG)
		# ↓ weitere tägliche Jobs
		"oekoinvest_app.plattform.api.closing.fristen_taeglich",  # Grundbuch & Closing: überfällige Grundbuch-Schritte an das Backoffice
		"oekoinvest_app.plattform.api.anbieter.frist_lauf_taeglich",  # Anbieter / Verkäufer: Erinnerung an überfällige Rückfragen des Backoffice
		"oekoinvest_app.plattform.api.finanzierung.covenants_taeglich",  # Finanzierung: Covenant-Prüfung (DSCR/LLCR), Reporting-Fristen
		"oekoinvest_app.plattform.api.gutachterauftrag.fristen_taeglich",  # Gutachteraufträge: Angebotsfristen, Liefertermine, Termine, Zahlungsziele
		"oekoinvest_app.plattform.api.portfolio.fristen_taeglich",  # Portfolio: Erinnerung/Verzug Kapitalabrufe, Covenant-Hinweise (DSCR aus Monatserträgen)
		"oekoinvest_app.plattform.energie_quellen.spot_taeglich",  # Energiebeschaffung: Day-Ahead DE-LU/AT von Energy-Charts (CC BY 4.0)
		"oekoinvest_app.plattform.api.energie.fristen_taeglich",  # Energiebeschaffung: Kündigungsfristen-Alarm, Erinnerung Angebotsfristen
		"oekoinvest_app.plattform.api.betrieb.lauf_taeglich",  # Betriebsführung: Fristen (Eichung, Garantie, Wartung, Meldefrist), SLA, Nachbestellung
		"oekoinvest_app.plattform.api.kundenenergie.fristen_taeglich",  # Kundenseite Energie: Lieferantenwechsel anlegen, Fristen-Alarme
		"oekoinvest_app.plattform.api.entwicklung.fristen_taeglich",  # Projektentwicklung: Fristen-Erinnerungen, optional ERPNext-Abgleich
		"oekoinvest_app.plattform.api.entwicklung_steuerung.aufgaben_taeglich",  # Entwicklungssteuerung: Aufgaben aus fälligen Meilensteinen und Optionsfristen
		"oekoinvest_app.plattform.api.signatur.erinnerungen_senden",  # Signatur: Erinnerung nach 3 Tagen, abgelaufene Fristen
		"oekoinvest_app.plattform.api.hr.hrms_abgleich",  # HR: Leave Applications (HRMS, optional) → Abwesenheit + Vertretung
		"oekoinvest_app.plattform.api.onboarding.mail_lauf_taeglich",  # Onboarding B1: Erinnerung an offene Einstiegsschritte nach 3/7 Tagen
		"oekoinvest_app.plattform.api.akquise_kampagne.nachfassen_taeglich",  # Akquise A1b: Nachfassstufen der Kampagnen (Aufgaben)
		"oekoinvest_app.plattform.api.querschnitt.digest_taeglich",  # Querschnitt: Tages-Digest der Benachrichtigungen (E-Mail ohne Inhalte)
		"oekoinvest_app.plattform.api.frist_erinnerung.erinnerungen_taeglich",
		"oekoinvest_app.plattform.eg_eda_jobs.taeglich",  # Energiegemeinschaften WP2: EDA-Fristen (30 Tage Zustimmung), Erinnerungen  # Integration: Fristerinnerungen Pachtakte, Genossenschaft (Einzahlung), Gemeinde (Stellungnahme)
	],
	# Deal-Room: Erinnerung 48 h vor Ende einer Angebotsfrist
	"hourly": [
		"oekoinvest_app.plattform.api.bieter.erinnerungen_senden",
		"oekoinvest_app.plattform.api.termine.erinnerungen_senden",  # Termine: Erinnerung 24 h vorher (E-Mail mit ICS)
		"oekoinvest_app.plattform.api.support.sla_pruefen",  # Service: SLA-Verletzungen melden (einmal je Ticket)
		# ↓ weitere stündliche Jobs
		"oekoinvest_app.plattform.eg_eda_jobs.stuendlich",  # Energiegemeinschaften WP2: EDA-Gateway-Postfach, Wiederholungen
	],
	# Energiebeschaffung: Wechselanalyse aller Kundenverträge gegen die Terminkurve
	"weekly": [
		"oekoinvest_app.plattform.api.energie.lauf_woechentlich",
	],
}
