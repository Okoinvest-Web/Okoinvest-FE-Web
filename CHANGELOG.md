# Änderungen

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
