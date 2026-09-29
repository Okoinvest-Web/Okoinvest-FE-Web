app_name = "oekoinvest_app"
app_title = "ÖkoInvest Plattform"
app_publisher = "ÖkoInvest GmbH"
app_description = "Plattform-Backend der ÖkoInvest-Website: Portal, Projektbörse, Prozesse und Backoffice"
app_email = ""  # Kontaktadresse noch nicht freigegeben
app_license = "Proprietär"
required_apps = ["frappe"]

# ------------------------------------------------------------------
# Rollen als Fixtures (fixtures/role.json):
#   ÖkoInvest Admin  – Pflege im Desk (Lesen/Korrigieren der Plattform-DocTypes)
#   ÖkoInvest API    – ausschließlich der technische API-Benutzer der Website
#   Plattform …      – fachliche Rollen (werden aus „Plattform Konto“ gesetzt, ohne Desk-Zugang)
# ------------------------------------------------------------------
fixtures = [
	{
		"dt": "Role",
		"filters": [
			[
				"name",
				"in",
				[
					"ÖkoInvest Admin",
					"ÖkoInvest API",
					"Plattform Flächeneigentümer",
					"Plattform Landwirt",
					"Plattform Investor",
					"Plattform Anbieter",
					"Plattform Unternehmen",
					"Plattform Mitglied",
					"Plattform Backoffice",
				],
			]
		],
	}
]

# Stammdaten „Plattform Rolle“ (Website-Kennung ↔ Frappe-Rolle) – idempotent
after_install = "oekoinvest_app.plattform.installation.nach_installation"
after_migrate = ["oekoinvest_app.plattform.installation.nach_migration"]

# Das Aktivitätsprotokoll und Tokens verhindern das Löschen von Konten nicht (Protokoll bleibt lesbar).
ignore_links_on_delete = ["Plattform Aktivitaet", "Plattform Token"]

scheduler_events = {
	"daily": [
		"oekoinvest_app.plattform.aufgaben.tokens_aufraeumen",
	],
}
