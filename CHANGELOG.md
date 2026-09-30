# Änderungen

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
