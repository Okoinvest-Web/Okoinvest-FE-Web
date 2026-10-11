# Auftragsbuch des Inhabers – Reihenfolge der Armee-Einsätze

## 1. Masterplan Website DACH – läuft
Agenten-Armee (Fachteams, Pflicht-Teams, Wettbewerbs-Aufklärung, Personalchef, Strategie-Rat) → `docs/MASTERPLAN-DACH.md`.
Danach: Entscheidungen des Inhabers einholen (z. B. Länder-URL-Struktur /at /de /ch, Preisradar-Datenquellen).

## 2. Umsetzung Website – Wellen 1–3 laut Masterplan
Umsetzungsteams mit Qualitätsmanager, visueller Kontrolle, SEO/SEM; Server-Wächter und Dashboard laufen mit.

## 3. Plattform-Armee – startet SOFORT, wenn die Website fertig ist (ausdrücklicher Wunsch, 03.10.2026)
Das gesamte Website-Team PLUS zusätzliche Plattform-Spezialisten wird auf die Plattform (Portal, ~177 Seiten, Frappe-Backend unter Backend-Import/oekoinvest_app, Demo-Backend unter src/lib/plattform) angesetzt. Leitfrage: Hat jede Rolle und jeder Nutzer alles, was er braucht – Funktionen, Prozesse, Workflows, Rechte?

Teams und Fachbereiche (mindestens):
- **Business-Analysten & Prozesse:** jede Rolle (Flächeneigentümer, Landwirt, Investor, Anbieter, Unternehmen, Mitglied, Kommune, Bank, Gutachter, Lieferant, Backoffice-Unterrollen) – Bedarf vs. vorhandene Funktionen, Workflows, Lücken.
- **Funktions- & Fachanalysten:** je Modul (CRM, KYC, Finanzierung, Closing, Dealroom, Portfolio, EG-Abrechnung, Entwicklung, Buchhaltung, Energie, Termine, Dokumente, Signatur, Support).
- **Benutzerrechte & Rollen:** Rechte-Matrix (src/lib/plattform/rechte.js, Frappe desk_rechte.py), Least Privilege, Vier-Augen, Mandantentrennung.
- **UI / UX / Animation:** Portal auf Website-Niveau, Bedienführung, Dashboards, mobile Nutzung.
- **Security & Cyber:** API-Sicherheit, AuthN/AuthZ, Sessions, 2FA, Pen-Test-Denkweise (nur lokal/Test), OWASP ASVS, Logging/Hash-Kette, Secrets.
- **API-Experten:** API-Vertrag (docs/API.md), Konsistenz Demo ↔ Frappe, Versionierung, Fehlerbilder, Rate-Limits.
- **Python- & Frappe-Experten:** DocTypes, Kern-Module (*_kern.py), Whitelist-Methoden, Tests (plattform/tests), Performance, Migrationen.
- **Datenbank-Experten:** MariaDB-Schema, Indizes, Abfragen, Datenqualität, Archivierung.
- **Backup / Restore / Data-Loss:** Sicherungskonzept, Wiederherstellungstests (NUR mit Demo-/Testdaten), RPO/RTO, Notfallhandbuch.
- **Buchhaltung & Steuerberatung:** Buchhaltungsmodul, ERPNext-Anbindung (Backend-Import/FINANZEN-ERPNEXT.md), Umsatzsteuer-Fälle je Land, Exporte für Steuerberatung.
- **M&A-Berater:** Projektbörse, Dealroom, Closing, Datenraum – Transaktionstauglichkeit.
- **Marketing:** Marketing-Cockpit, Newsletter, Kampagnen, Presse aus der Plattform heraus.
- **Banken & Finanzierung, Compliance, Recht, Datenschutz, Qualitätsmanagement, Dokumentation (ISO)** – wie im Website-Einsatz.
- **Personalchef** rekrutiert weiter bis zum Gipfel; Posteingang gilt auch hier.

Sicherheitsregeln für den Plattform-Einsatz: keine Produktivdaten, keine Änderungen an Live-Systemen, Restore-/Angriffstests nur lokal gegen das Demo-Backend, Schema-/Datenmigrationen nur als Vorschlag mit Rückweg; Abnahme durch Qualitätsmanager.
