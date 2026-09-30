# Backoffice-Handbuch: Leitung

Stand: 30.09.2026 · Unterrolle `leitung` (Vollzugriff inkl. Rechte, Automationen, Nutzer) · Desk-Rollenprofil „ÖkoInvest Leitung“ · Demo: `admin@example.com`

## Verantwortung

Steuerung aller Geschäftsmodelle, Freigaben mit Außenwirkung, Rechte und Sicherheit, **Bankentscheidung** und **Geschäftsmodell je Projekt** (nur Leitung), Eskalationsstelle für alle Unterrollen.

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Morgens (15 min) | Cockpit: überfällige Aufgaben, SLA-Ampel der Anfragen (2 Werktage), neue Vorgänge ohne Zuständigkeit | `/portal/admin` (`g c`), `/portal/admin/vorgaenge?ohne=1` |
| | Störungs-Leitstand: kritische Störungen offen? | `/portal/admin/anlagen` |
| | Covenant-Frühwarnungen, Fristen Energieverträge, KYC-Warteschlange (nur Status) | `/portal/admin/finanzierung`, `/portal/admin/energie`, `/portal/admin/compliance` |
| Mittags | Freigaben: Projekte (Satz 1,5–3 %), Zuschlagsvorschläge, Term-Sheet-Entscheidungen | `/portal/admin/projekte`, `/portal/admin/dealroom`, `/portal/admin/finanzierung/[id]` |
| Wöchentlich | Berichte (Trichter, Quellen, Pipeline, Provision, Durchlauf, Team), Entwicklungs-Portfolio (MWp je COD-Jahr vs. Ziel rund 50 MWp/Jahr), Revisionsprotokoll prüfen | `/portal/admin/berichte`, `/portal/admin/entwicklung`, `/portal/admin/protokoll` |
| Monatlich | Monatsbericht-PDF, Rechte-Matrix und Nutzer durchsehen, Automationen-Protokoll, 2FA-Pflicht | `/portal/admin/rechte`, `/portal/admin/automationen`, `/portal/sicherheit` |

## Abläufe mit Leitungsentscheidung

**Geschäftsmodell je Entwicklungsprojekt** (`/portal/admin/finanzierung` → Geschäftsmodell-Vergleich):
1. Werte vergleichen: Build-to-Sell (Verkaufspreis Projektrechte + optional EPC-Marge), Eigenbetrieb mit Bankfinanzierung (Barwert EK-Cashflows), Contracting im Eigentum, reine Verpachtung.
2. Annahmen prüfen (Diskont, Preise aus `markt.js`), Begründung eintragen, Modell wählen – wird protokolliert.
3. Übergabe: Build-to-Sell → Projektleitung „Übergabe Börse“; Eigenbetrieb → Finanzierungsfall; Contracting → Betrieb/Anlage.

**Bankentscheidung:** Term-Sheet-Vergleich (Betrag, Marge, Tenor, DSCR, Covenants, Gebühren) → „Entscheidung“ mit Begründung → Kreditvertrag, CPs, Covenant-Monitoring.

**Rechte und Nutzer:** Unterrollen zuweisen (`/portal/admin/rechte`); ein Konto kann mehrere Unterrollen haben. Nutzer sperren wirkt sofort (Sitzungen ungültig). Desk-Benutzer bekommen genau ein Rollenprofil.

**Automationen:** Wenn–Und–Dann-Regeln; vor Aktivierung immer **Testlauf** (ohne Wirkung), Ausführungsprotokoll prüfen.

## Tastenkürzel

`Strg`+`K` Palette · `g c` Cockpit · `g t` Aufgaben · `g v` Vorgänge · `/` Suche · `n` neu · `?` Hilfe. Listen: Filter-Chips, gespeicherte Ansichten, Massenaktionen.

## Typische Fehler

| Fehler | Folge | Vermeidung |
|---|---|---|
| Unterrolle „Leitung“ großzügig vergeben | Zugriff auf alles inkl. Rechte | Nach Aufgabe vergeben, „Nur lesen“ für Einsicht |
| Automation ohne Testlauf aktiviert | Massenmails/-aufgaben | Testlauf, Schleifenschutz beachten |
| Zuschlag vor KYC beider Seiten | wird vom System blockiert (409) | Compliance früh einbinden |
| Hash-Kette nicht geprüft | Manipulation bleibt unentdeckt | monatlich „Kette prüfen“ |

## Offene Leitungsthemen (vor Livegang)

Rechtstexte freigeben (NDA, Provisionsvereinbarung, Nutzungsbedingungen, Datenschutzerklärung, `/bedingungen/*`), Kontakt-E-Mail/Telefon freigeben, Verpflichtetenstellung GwG klären, Vergütungsmodell Energiebeschaffung festlegen, Löschkonzept beschließen (`Backend-Import/GO-LIVE.md`).
