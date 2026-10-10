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

## Buchhaltung: OP, Mahnwesen, Zahlungseingang, Storno, Export, Abschluss

Seite `/portal/admin/finanzen/buchhaltung` (Reiter):

| Reiter | Was | Hinweise |
|---|---|---|
| Offene Posten | OP-Liste mit Altersstruktur, Teilzahlungen, Mahnstufe; je Beleg **Stornieren** und **Mahnsperre** | CSV-Export |
| Mahnwesen | Mahnvorschläge auswählen → **Vorschau** → **Mahnungen erstellen** (Nummer `MA-…`, neue Frist, PDF); Stufen, Gebühren, Verzugszinsen, 40-€-Pauschale konfigurieren | Folge-Mahnung erst nach Ablauf der Frist; Einspruch des Kunden sperrt automatisch; Basiszinssatz amtlich eintragen |
| Zahlungseingang | Kontoauszug **CAMT.053/.054 (XML) oder CSV** einlesen → Vorschläge prüfen → „sichere Treffer übernehmen“ bzw. einzeln zuordnen/ignorieren | voller Betrag → „bezahlt“ (Provision/Kunde automatisch), sonst Teilzahlung; Überzahlung → Aufgabe; SEPA-Ausgänge bestätigen angewiesene Gutschriften |
| Storno & Korrektur | Beleg wählen, Grund angeben → **Stornobeleg** `ST-…` mit Verweis auf den Ursprung | nie löschen; bereits gezahlt → Aufgabe Erstattung/Rückforderung; Pacht/Contracting: nächster Lauf erzeugt den korrigierten Beleg |
| Export & Konten | **DATEV-Buchungsstapel** (DE) bzw. **BMD** (AT) für einen Zeitraum, OP-Liste; Kontenzuordnung | Beispielkonten – vor dem ersten Echtimport mit der Steuerberatung festlegen und testen |
| Monatsabschluss | Checkliste je Monat (Läufe, Klärfälle, Kontoauszüge, SEPA, Mahnlauf, Pflichtangaben, OP-Abstimmung, AfA, UVA/ZM, Export) → **Monat abschließen**; **USt-Verprobung** (Netto/USt je Steuervorlage, Stornos negativ) als Vorbereitung der UVA/UStVA/MWST | offene Pflichtpunkte blockieren; Wiedereröffnen nur mit Grund; Steuerfristen AT/DE/CH als Orientierung; Verprobung = Soll-Besteuerung nach Rechnungsdatum, nur Ausgangsumsätze – Gutschriften (Gutschriftsverfahren Pacht) stehen separat als Eingangsseite, keine Steuermeldung |
| Nummernkreise & Steuer | Nummernkreise je Jahr mit Lückenprüfung, Steuer-Check (Pflichtangaben, Reverse Charge ohne UID) | Lücken (z. B. Testbelege) dokumentieren |

## Kontenrahmen-Zuordnung (Export)

Vorbelegung in `src/lib/plattform/buchhaltung/export.js` (`KONTEN_STANDARD`), änderbar unter „Export & Konten“.
**Beispielwerte – vor dem ersten Echtimport mit der Steuerberatung festlegen und einen Testimport fahren.**

| Zweck | DATEV (DE, SKR03-üblich) | BMD (AT, EKR-üblich) |
|---|---|---|
| Debitoren-Sammelkonto | 10000 | 200000 |
| Kreditoren-Sammelkonto (Eigentümer) | 70000 | 330000 |
| Bank (Geschäftskonto) | 1200 | 2800 |
| Erlöse Contracting / Provision (steuerpflichtig) | 8400 | 4000 |
| Erlöse Reverse Charge (Contracting § 13b / Provision Art. 196) | 8337 / 8338 | 4030 |
| Aufwand Pacht (Gutschriften) | 4210 | 7400 |
| BU-Schlüssel (DATEV) bzw. Steuercode (BMD) je Steuervorlage | leer – mit Steuerberatung festlegen | leer – mit Steuerberatung festlegen |
| Buchungssymbole (BMD) | – | AR (Rechnung/Storno), ER (Gutschrift), BK (Zahlung) |

Hinweise: SKR04 statt SKR03 ist möglich – einfach die Kontonummern in der Kontenzuordnung ändern (z. B. Erlöse 4400
statt 8400); DATEV-Personenkonten brauchen je nach Mandanteneinrichtung Sachkontenlänge + 1 Stellen. Für die
Schweiz gibt es keinen eigenen Export (Treuhand erhält OP-Liste/CSV) – bei Bedarf KMU-Kontenrahmen als Vorhaben.

## Kleinbetragsrechnungen

Bis **400 € brutto (AT, § 11 Abs. 6 UStG 1994)** bzw. **250 € brutto (DE, § 33 UStDV)** gelten erleichterte
Pflichtangaben: Empfängername/-anschrift entfallen, in DE auch der Leistungszeitraum. Die Pflichtangaben-Prüfung
berücksichtigt das automatisch. **Nicht** bei Reverse Charge/nicht steuerbaren Leistungen und nicht für Gutschriften
(Gutschriftsverfahren). CH (Art. 26 Abs. 3 MWSTG, 400 CHF) ist nicht abgebildet.

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
