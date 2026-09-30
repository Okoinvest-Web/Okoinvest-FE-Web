# Handbücher ÖkoInvest-Plattform

Stand: 30.09.2026 · Praxisnahe Anleitungen je Rolle. Grundlage sind die Funktionen, die in `docs/PLATTFORM.md` beschrieben sind; Pfade beziehen sich auf die Website (z. B. `/portal/flaechen`).

> Die Handbücher erklären die Bedienung. Sie sind keine Rechts-, Steuer- oder Anlageberatung. Verbindlich sind die Verträge, die [Nutzungsbedingungen](../../src/app/nutzungsbedingungen/page.js), die besonderen Bedingungen unter `/bedingungen/*` und die [Datenschutzerklärung](../../src/app/datenschutz/page.js).

## Externe Rollen (Portal)

| Handbuch | Für wen | Einstieg |
|---|---|---|
| [Eigentümer, Landwirte, Dachflächen](./rolle-eigentuemer.md) | Flächen- und Dacheigentümer, Landwirte (Agri-PV) | `/flaeche-verpachten`, `/landwirte`, `/dachflaeche-verpachten` |
| [Investor](./rolle-investor.md) | Fonds, Stadtwerke, IPP, Family Offices, Privatinvestoren | `/investoren`, `/projektboerse` |
| [Anbieter / Verkäufer](./rolle-anbieter.md) | Projektentwickler, Verkäufer von Projekten und Bestandsanlagen | `/projektboerse/anbieten`, `/bestandsanlagen` |
| [Contracting-Kunde](./rolle-contracting-kunde.md) | Unternehmen mit Anlage von ÖkoInvest auf dem Dach/Gelände | Portal „Mein Solarstrom“ |
| [Energiebeschaffung](./rolle-energiebeschaffung-kunde.md) | Unternehmen, die Reststrom über ÖkoInvest einkaufen | `/reststrom`, Portal „Energiebeschaffung“ |
| [Kommune](./rolle-kommune.md) | Gemeinden, Städte, Stadtwerke | `/kommunen` |
| [Gutachter / Planer](./rolle-gutachter.md) | eingeladene Fachleute der Projektentwicklung | Einladungslink |
| [Energieversorger](./rolle-lieferant.md) | eingeladene Lieferanten | Einladungslink |
| [Bank](./rolle-bank.md) | eingeladene Banken / Finanzierungspartner | Einladungslink |
| [Mitglied / Bürger](./rolle-mitglied.md) | Interessierte an Genossenschaft und Energiegemeinschaft | `/genossenschaft`, `/energiegemeinschaften` |

## Backoffice (Unterrollen)

| Handbuch | Schwerpunkt |
|---|---|
| [Leitung](./backoffice-leitung.md) | Steuerung, Freigaben, Rechte, Bankentscheidung, Geschäftsmodell |
| [Akquise](./backoffice-akquise.md) | Anfragen, Flächen-Pipeline, Akquise-Karte, Grundbuch, CRM |
| [Transaktion](./backoffice-transaktion.md) | Projekt-Freigabe, NDA/LOI, Deal-Room, Bieterverfahren, Closing |
| [Buchhaltung](./backoffice-buchhaltung.md) | Pacht, Contracting-Rechnungen, Provision, SEPA, Anlagenbuchhaltung |
| [Betrieb](./backoffice-betrieb.md) | Anlagen, Störungen, Geräte, Zähler, Support |
| [Compliance](./backoffice-compliance.md) | KYC/KYB, Sanktionsabgleich, Bonität, Register, Datenschutzanfragen |
| [Energie](./backoffice-energie.md) | Handelsdesk, Wechselanalyse, Ausschreibungen, Lieferanten, Pool |
| [Projektleitung](./backoffice-projektleitung.md) | Entwicklungsprojekte, Gantt, Risiken, Gutachter, Übergaben |

**Prozesse end-to-end:** [PROZESSLANDKARTE.md](./PROZESSLANDKARTE.md) (Mermaid-Diagramme mit Rollen, Status, Übergaben und Systemen).

## Für alle: Bedienung in 60 Sekunden

| Aktion | Tasten |
|---|---|
| Befehlspalette (Suche, Aktionen, Navigation) | `Strg` + `K` (Mac `⌘` + `K`) oder `/` |
| Übersicht der Tastenkürzel | `?` |
| Neu anlegen (je Rolle: Fläche, Projekt, Anliegen …) | `n` |
| Springen: Übersicht · Anfragen · Flächen · Projekte · Börse · Nachrichten · Hilfe | `g d` · `g a` · `g f` · `g p` · `g b` · `g n` · `g h` |
| Backoffice: Cockpit · Aufgaben · Vorgänge | `g c` · `g t` · `g v` |
| In Listen: wählen · öffnen · neuer Tab · schließen | `↑` `↓` · `Enter` · `Strg` + `Enter` · `Esc` |

Einzeltasten-Kürzel lassen sich unter `/portal/hilfe` abschalten; in Eingabefeldern greifen sie nie. Das Portal kann als App installiert werden (Hinweis auf der Übersicht).

## Schulung mit Demo-Konten

Im Demo-Betrieb (nicht in Produktion) sind die Konten aus `docs/PLATTFORM.md` („Demo-Konten“) mit dem dort genannten Passwort vorbelegt, z. B. `flaeche@example.com`, `investor@example.com`, `bo-akquise@example.com`. Alle Daten sind fiktiv.
