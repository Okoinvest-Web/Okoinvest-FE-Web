# Backoffice-Handbuch: Buchhaltung

Stand: 30.09.2026 · Unterrolle `buchhaltung` (Finanzen & Abrechnung schreiben, Provisionen, Berichte, Exporte; Energie/Finanzierung lesen bzw. schreiben laut Matrix) · Desk „ÖkoInvest Buchhaltung“ · Demo: `bo-buchhaltung@example.com`

Fachgrundlage: `Backend-Import/FINANZEN-ERPNEXT.md` (Steuervorlagen, Pflichtangaben-Checkliste). **Steuerliche Behandlung vor Livegang mit der Steuerberatung abstimmen.**

## Tagesroutine

| Wann | Was | Wo |
|---|---|---|
| Täglich | Klärfälle (fehlender Index/Monatswert, KYC unvollständig), Zahlungseingänge, Mahnvorschläge (7/21/35 Tage) | `/portal/admin/finanzen` (Übersicht, Klärfälle) |
| Ab dem 5. des Monats | Contracting-Abrechnung Vormonat prüfen (Scheduler rechnet automatisch) | Reiter „Belege & offene Posten“ |
| Periodisch | Pachtgutschriften (vorschüssig: Gutschrift „Vorlauf“ Tage vorher) → Zahlungsvorschlag → SEPA | Reiter „Auszahlungen & SEPA“ |
| Januar | VPI-Werte prüfen/eintragen, Indexierung zum 1.1. | Reiter „Index (VPI)“ |
| Monatsende | offene Posten, Provisionen, Auswertung je Gesellschaft, Export an Steuerberatung | Reiter „Übersicht“, CSV |

## Ablauf: Pacht (Gutschrift) bis Auszahlung

1. Pachtvertrag anlegen/prüfen (Modell fest, indexiert oder Umsatzbeteiligung mit Mindestpacht; Reservierungsprämie bis Pachtbeginn; Periode; Gutschriftsverfahren vereinbart).
2. Abrechnungslauf erzeugt je Periode genau einen Beleg (idempotent).
3. **Zahlungsvorschlag** bis Stichtag, je zahlender Gesellschaft. Gesperrte Posten = Klärfall „KYC unvollständig“ (Eigentümer verifiziert? IBAN geprüft? Eigentumsnachweis?).
4. SEPA-Datei **pain.001.001.09** je Auftraggeberkonto erzeugen → bei der Bank einreichen (die App zahlt nicht selbst). Gutschriften → „angewiesen“.
5. Nach Ausführung **Zahlungslauf bestätigen** → „bezahlt“ (Eigentümer wird benachrichtigt).

## Ablauf: Contracting-Rechnung

Monatswerte der geeichten Messpunkte → geliefert = Erzeugung − Einspeisung bzw. Verbrauchszähler → × Arbeitspreis (Indexierung je Vertragsjahr) + Grundgebühr. Aussteller = **Eigentümergesellschaft** der Anlage. Klärfall bei fehlendem Wert, negativer Lieferung oder > 270 kWh/kWp im Monat → mit Betrieb klären.

## Ablauf: Provision

Verkauf (Transaktion) → Provision automatisch → Provisionsrechnung sofort → „In Rechnung“ → Zahlungseingang → „Bezahlt“. Storno nur mit Grund.

## Anlagenbuchhaltung und Controlling

Aktivierung je Contracting-Anlage (Anschaffungswert, Nutzungsdauer PV 20 / Speicher 10 Jahre als Vorschlag, AT Halbjahresregel, DE/CH monatsgenau); Projektcontrolling Budget vs. Ist je Entwicklungsprojekt.

## Aufbewahrung

AT 7 Jahre (§ 132 BAO, § 212 UGB; Grundstücksbezug bis 22 Jahre), DE bis 10 Jahre (§ 147 AO, § 257 HGB), CH 10 Jahre (Art. 958f OR). Belege sind nicht löschbar; Kontolöschung von Nutzern anonymisiert, Belege bleiben gesperrt erhalten.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| IBAN aus E-Mail übernommen | nur IBAN aus der Verifizierung (Betrugsschutz) |
| Zahlungslauf nicht bestätigt | Gutschriften bleiben „angewiesen“ |
| UID fehlt | Pflichtangabe – in „Plattform Finanzen Einstellungen“ eintragen |
| Reverse Charge ohne Hinweis | Steuervorlage wählen, Pflichtangaben-Prüfung beachten |
| Beleg doppelt | nicht möglich (je Periode ein Beleg) – bei Fehler stornieren und neu |
