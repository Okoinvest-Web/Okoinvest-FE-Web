# Änderungen

## 0.4.0 – 01.10.2026 – Design-Offensive (Design-System 2.0)

- Design-System 2.0 (docs/DESIGN.md, Styleguide /design): semantische Farben, Tiefenstufen, Zahlen-Typografie, Motion-System, Kontraste nach WCAG 2.2 AA zentral korrigiert, neue Bausteine (KPI-Kachel, Sparkline, Fortschrittsring, Skeleton, Toast, Tooltip, Dialog/Bottom-Sheet, Tabs, Erfolgshaken)
- Illustrationsbibliothek mit 41 eigenen SVG-Motiven (Hero-Szenen, Leerzustände, Spots, animiertes Marken-Motiv), Galerie /design/illustrationen
- UX-Audit der 12 Kernwege (docs/UX-AUDIT.md); alle P0-Punkte behoben (u. a. Flächencheck-Eingabe, Pachtangebot mit Prüfschritt, Rückfragen in der EG-Abrechnung, Exposé-Aktionsleiste mobil)
- Markendialoge statt Browser-Rückfragen (52 Bestätigungen, 13 Eingaben)
- Startseite und Landingpages: Tiefen-Hero, Vertrauensleiste, Mega- und Mobilmenü-Choreografie, Seitenübergänge, Sprungnavigation mobil
- Rechner: Live-Ergebnis mit Hauptzahl, Szenario-Vergleich, Teilen-Link, Druck, mobile Ergebnisleiste; Flächencheck mit Live-Zwischenstand
- Portal: einklappbare Seitenleiste, Brotkrumen ohne IDs, Skeleton-Ladezustände, Dashboards mit „Als Nächstes“ und KPI-Kacheln, Glocke mit Zu-erledigen/Info
- Einheitliches Chart-System (Linie, Balken, Heatmap, Donut, Wasserfall, Energiefluss, Gauge) mit Tastatur, Tabelle, CSV/PNG-Export
- Formulare: gemeinsame Bausteine mit Inline-Validierung, Split-Screen-Login, 2FA-Codefelder, Entwurf-Sicherung
- Energiegemeinschaften: „Energie heute“-Dashboard, Kassier-Ablauf mit Vorzeitraum-Vergleich, Produktseite /energiegemeinschaften/software
- Statusfarben vereinheitlicht (237 ad-hoc Rot-Stellen auf danger-Tokens)
- Qualität: 37 Testreihen grün (frische Demo-DB), Produktions-Build, ESLint ohne Befund, npm audit 0, Frappe-Konsistenzprüfer 0/0

## 0.3.0 – 01.10.2026 – Vollausbau Portal und Energiegemeinschaften

**Energiegemeinschaften Österreich (EEG lokal/regional, BEG, GEA nach ElWG §§ 65–72)**
- Markt- und Fachrecherche mit Quellen: docs/EG-MARKT.md, docs/EG-FACHKONZEPT.md, Schnittstellen docs/EG-SCHNITTSTELLEN.md
- Stammdaten mit Teilnahmefaktor-Regeln, Mehrfachteilnahme, Netzentgelt-Regeltabelle, Massenbearbeitung und CSV-Import
- EDA-Marktkommunikation (Anmeldung, Online-Zustimmung mit Fristen und Erinnerungen, Teilnahmefaktor, Abmeldung, Energiedaten, Reklamation), Gateway-Dienst und Netzbetreiber-Simulator
- 15-Minuten-Energiedaten, Datenqualität, Verteilung statisch/dynamisch nach Marktregeln, Simulation vor der Gründung, Prognose, Mehrfachteilnahme-Optimierer, Speicher
- Abrechnung mit Steuer-Engine (Kleinunternehmer, Reverse Charge, Landwirte, Gemeinden) und Prüfpfad, Gutschriften, SEPA, Mahnwesen, Vereinsbuchhaltung, Exporte BMD/RZL/DATEV, Probe-Abrechnung für Wechsler
- Gründung als Dienstleistung mit Mustervorlagen, Wechsel bestehender Gemeinschaften mit Import, Vereinsorganisation, Förder-Check, Lieferantenpflichten
- Mitglieder-, Interessenten- und Gemeindeportal; öffentliche Seiten /energiegemeinschaften/software und /energiegemeinschaften/rechner

**Portal – Vollausbau je Rolle**
- Eigentümer: Pachtakte bis Vertragsende (Fristen, Kündigung, Eigentümerwechsel/Erbfall, Rückbausicherheit, Agri-PV-Nachweis, Jahresbescheinigung)
- Investor: Portfolio nach dem Kauf (Ertrag Soll/Ist aus Monitoring, DSCR/Covenants, Ausschüttungen, Kapitalabrufe, Berichte, Wiederverkauf)
- Anbieter: Vermittlungsauftrag mit Exklusivität, Prüfpunkte, Anonymisierungsprüfung, Stellungnahme zu LOI und Geboten, Vorkenntnis, Bestandsanlagen-Akte
- Kundenseite Energie: Einspruch, Störungsmeldung, Vertragsende, Lieferantenwechsel, Kostenreport, Vertragsdatenblatt für Versorger
- Mitglied/Genossenschaft und Gemeindecockpit; Gutachter- und Bankakte; Entwicklungssteuerung (Entscheidungsvorlagen, Projektampel, Kapazität, Pipeline)
- Backoffice: Deal-Pipeline, KYC-SLA, DSGVO-Workflows, Verdachtsfälle, Mahnwesen, Zahlungsabgleich, DATEV/BMD, Monatsabschluss; Betriebsführung (Störungs-SLA, Serviceaufträge, Ertragsausfall, Versicherung, Wartungsplan, Ersatzteile, PR)
- Querschnitt: Nachrichten mit Anhängen, Dokumentenablage mit Versionen, Tages-Digest, erweiterte Suche, Seitenhilfe, Leitungs-Cockpit mit Management-Bericht
- Identifizierung: MRZ-Prüfung, Videoident durch eigene Compliance, ID Austria und Online-Ausweis (OIDC)
- Fehlerbehebung über alle Bereiche (u. a. 2FA-Sperre, Bonität null, KYC-Vier-Augen, Zahlungsläufe, Polygonflächen, Monatsenden); Demo: alle Demo-Konten auf frischer Datenbank sofort verfügbar

**Qualität**
- 37 Plattform-Testreihen zentral auf frischer Demo-Datenbank grün (rund 4.170 Prüfungen)
- Frappe: Konsistenzprüfer 0 Fehler / 0 Warnungen, 330 Kern-Unittests grün (1 übersprungen), Dienste-Tests grün
- Produktions-Build erfolgreich, ESLint ohne Befund, npm audit 0
- Offen vor Livegang: Bench-Tests auf Staging, anwaltliche/steuerliche Freigaben, EDA-Registrierung und Abgleich mit ebUtilities-Schemas – siehe docs/ROADMAP-STUFE5.md, docs/EG-FACHKONZEPT.md Abschnitt 9, Backend-Import/GO-LIVE.md

## 0.2.0 – 30.09.2026 – Plattform-Ausbau (Stufen 2–5)

**Website**
- Neue Seiten: Dacheigentümer, Bestandsanlagen, Börse auf der Karte, Regionen je Bundesland/Kanton, Marktdaten, Referenzen, Warum ÖkoInvest (Vergleich), Terminbuchung, englische Seiten für internationale Investoren, weitere Rechner (Pachtangebot-Check, Dachpacht, Netzanschluss, PPA, Großspeicher, Energy Sharing)
- Rechtstexte: Datenschutzerklärung um alle Plattform-Verarbeitungen erweitert, Nutzungsbedingungen §§ 1–22, Besondere Bedingungen (Entwurf, noindex) unter `/bedingungen/*`
- Angebotsseite für Akquise-Briefe `/angebot/[code]` (noindex, ohne Eigentümerdaten)

**Plattform – je Rolle**
- Onboarding-Assistenten für alle Rollen und Untertypen, eigene Rolle Kommune, Einarbeitung je Backoffice-Unterrolle
- Investoren: Deal-Room mit Datenraum-Stufen, Q&A, verdeckten Geboten; Finanzierungscockpit (ROI, Kredit/Förderkredit/Leasing/Mietkauf, Förder-Check DE/AT/CH); Co-Development nur nach KYC
- KYC/KYB: Ausweis-Upload, Online-Identifizierung (Anbieter-Adapter, Webhook mit HMAC), manuelle Prüfung, Register (Firmenbuch, Handelsregister, Zefix), Bonität vor LOI, Investorentyp-Vorgaben
- Akquise: Österreich-, Deutschland- und Schweiz-Scoring (Umspannwerke, Leitungslänge, EEG-Kulisse, § 35 BauGB), Karte, Brief-Kampagnen mit Sperrliste, Gemeinde-Screening
- Projektentwicklung: Meilensteine, Gutachter-Portal, Planunterlagen (DWG/DXF-Vorschau, Versionen, Freigabe), Projektkostenkalkulation nach Gewerken, SPV-Gründung
- Grundbuch & Dienstbarkeiten (DE/AT/CH) und Deal-Abschluss (Closing-Raum, Signing nur mit KYC, Notartermin, Treuhand, Provisionsrechnung)
- Anlagen & Störungen für ÖkoInvest-eigene Contracting-Anlagen (MQTT-Datendienst, Zählerstände, Störungen, Stromabrechnung)
- Energiebeschaffung: Handelsdesk mit Spotmarkt, Wechselanalyse, Bieterwettbewerb der Energieversorger, Versorger- und Bank-Portal
- Finanzen, CRM, Automatisierung, Berichte, Signatur, Termine, Helpdesk, Team/HR, KI-Assistent

**Backend (`Backend-Import/`)**
- Frappe-App `oekoinvest_app` mit 140 DocTypes, 12 Workspaces, 28 Druckformaten, Rollenprofilen, Notifications, Übersetzungen; optionale ERPNext/HRMS/Drive/Helpdesk-Anbindung
- Dienste: Anlagen-Daten (MQTT → TimescaleDB), Geodaten (PostGIS), CAD-Konverter (DWG → DXF)
- Konsistenzprüfer `werkzeuge/pruefen.py` inkl. Rechte-Abgleich Website ↔ Frappe; Go-live-Anleitung

**Qualität**
- 21 Plattform-Testreihen zentral auf frischer Demo-Datenbank: 2.323 Prüfungen grün (inkl. Rechteverletzungen, KYC-Sperren, Datenlecks)
- Frappe: Konsistenzprüfer 0 Fehler / 0 Warnungen, Rechte-Matrix Website = Frappe (35 Bereiche), 117 Kern-Unittests grün (1 übersprungen); Dienste-Tests grün
- Produktions-Build erfolgreich (520 Routen), ESLint ohne Befund, `npm audit`: 0 Befunde
- Seiten-Audit bei 390 px: 123 öffentliche Seiten ohne Laufzeitfehler, Überlauf und tote Links; Portal-Audit mit 20 Demo-Konten (≈ 700 Seiten), Befunde (Verifizierung mobil zu breit, Brotkrumen-Ziel /portal/planung) behoben
- Offen vor Livegang: anwaltliche Freigaben (Rechtstexte, Musterverträge, Akquise-Briefe), Platzhalter (Kontakt, Vergütungen, Dienstleister), Bench-Tests auf Staging – siehe docs/ROADMAP-STUFE5.md

## 0.1.0 – 29.09.2026 – Erstversion

Neue Website und Plattform der ÖkoInvest GmbH auf Basis der Ökovolt-DE-Website (Design-System, Bausteine, Rechner- und Ratgeber-System übernommen, Inhalte vollständig neu).

**Website (56 öffentliche Seiten)**
- Startseite mit Zielgruppen-Weiche, Wertschöpfungs-Kreislauf, Projekt-Werttreppe und Reststrom-Pool
- Lösungen: Freiflächen-PV, Agri-PV, Solarcarports, Großspeicher, Projektprozess, Kommunen
- Zielgruppen: Flächeneigentümer, Landwirte (vier Wege + Entscheider), Investoren, Projektentwickler
- Energie: virtuelles Kraftwerk, Reststrom-Pool Mittelstand, Energiegemeinschaften DE/AT/CH, Genossenschaft, Strommarkt live
- Rechner: Flächencheck, Pacht, Agri-PV, Solarpark-Rendite (IRR/LCOE/DSCR), Projektbewertung, Reststrom, Solarcarport, Kommune
- Wissen: 17 Fachartikel, Lexikon mit 80 Begriffen, FAQ mit 34 Fragen
- Unternehmen, Kontakt, Impressum (AT), Datenschutz, Nutzungsbedingungen (Entwurf), Barrierefreiheit, Sitemap, robots, llms.txt

**Plattform**
- Login, Registrierung mit Rollen, Passwort-Reset, E-Mail-Bestätigung
- Portale für Flächeneigentümer, Landwirte, Investoren, Anbieter, Unternehmen, Mitglieder
- Projektbörse: öffentliche Teaser, Suchprofil und Matching, Klick-NDA mit Protokoll, Datenraum, LOI
- Backoffice: Cockpit mit Trichtern, Vorgänge, Flächen-Kanban, Projekt-Freigabe, NDA & LOI, Deals & Provisionen, Nutzer & Protokoll
- Zustandsautomaten serverseitig, automatische Nachrichten bei Statuswechsel, automatische Provisionsberechnung
- Backend-Adapter Frappe (`oekoinvest_app`) und Demo (lokale JSON-Datenbank)

**Qualität**
- Alle Seiten in 1440 und 390 px visuell geprüft; automatisches Audit: Status, Laufzeitfehler, Überlauf, tote Links
- Plattform-Test `scripts/plattform-test.mjs`: 96 Prüfungen inkl. Rechteverletzungen
- `npm audit`: 0 Befunde (Next.js 15.5.26, ungenutzte Pakete entfernt)
- Marktannahmen zentral in `src/lib/invest/markt.js`, gegen Fraunhofer ISE / BNetzA kalibriert
