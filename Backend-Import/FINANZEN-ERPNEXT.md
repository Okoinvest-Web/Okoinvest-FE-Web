# Finanzen & Abrechnung (ERPNext optional)

Pachtabrechnung (Gutschrift an Flächen-/Dacheigentümer), Contracting-Rechnungen aus Zählerstand-Monatswerten,
Provisionsrechnungen der Projektbörse, Anlagenbuchhaltung (AfA), Projektcontrolling der Entwicklung und Auszahlungen
per SEPA-Datei. **ERPNext v15 ist optional:** ohne ERPNext (oder mit ausgeschaltetem Schalter) sind die
Plattform-Abrechnungen die maßgeblichen Belege; mit ERPNext werden sie zusätzlich als Purchase/Sales Invoice gebucht.

> **Steuer- und Rechtshinweis:** Die Umsatzsteuer-Behandlung ist als konfigurierbare Vorlage hinterlegt
> (Pacht steuerfrei mit Option, Kleinunternehmer, Reverse Charge, CH-MWST) und **vor dem Livegang mit der
> Steuerberatung abzustimmen**. Gleiches gilt für Kontenplan, Steuerkonten, AfA-Nutzungsdauern und die
> Wertsicherungsklausel (DE: Preisklauselgesetz). Die VPI-Startwerte sind gerundete **Beispielwerte**.

## Bausteine

| Teil | Ort |
|---|---|
| Reine Logik (Fälligkeiten, Indexierung, Umsatzbeteiligung, Contracting, Provision, AfA, Steuer, IBAN, SEPA pain.001) | `plattform/finanzen/{logik,steuer,sepa}.py` – Spiegel von `src/lib/plattform/finanzen/*.js` |
| Abrechnungskern (Belege, Klärfälle, Lauf, KYC-Anbindung, Gesellschaften) | `plattform/finanzen/abrechnung.py` |
| ERPNext-Adapter (Supplier/Customer, Purchase/Sales Invoice, Payment Entry, Subscription, Asset, Project-Ist) | `plattform/finanzen/erpnext.py` |
| Setup-Assistent (idempotent) | `plattform/finanzen/einrichtung.py` |
| Whitelisted API (Website) | `plattform/api/finanzen.py` |
| Druck | `templates/finanzen/beleg.html` (gemeinsamer Belegkörper), Druckformat „Abrechnung Beleg“ (Plattform Abrechnung), `plattform/finanzen/druckformate/*.html` (ERPNext, vom Assistenten angelegt), Jinja `oekoinvest_abrechnung`, `oekoinvest_beleg_erpnext` |
| Tests | `plattform/finanzen/test_logik.py` (ohne Frappe), `plattform/tests/test_finanzen.py` (FrappeTestCase) |

DocTypes (Modul Plattform): **Plattform Pachtvertrag** (PT), **Plattform Abrechnung** (AR – Beleg, nicht löschbar),
**Plattform Klaerfall** (KL), **Plattform Zahlungslauf** (ZL – nur SHA-256 der Datei), **Plattform Abrechnungslauf** (LA),
**Plattform VPI Wert** (`<Reihe>-<Jahr>`), **Plattform Anlagen Aktivierung** (AA), **Plattform Kostentraeger** (KT),
**Plattform Projektkosten** (PK), **Plattform Finanzen Einstellungen** (Single).

## Inbetriebnahme

1. `bench --site <site> migrate` – legt DocTypes, Druckformat „Abrechnung Beleg“, Hooks an.
2. Backoffice-Konten der Buchhaltung: Unterrolle `buchhaltung` (Bereich „Finanzen & Abrechnung“ schreiben); Leitung schreibt ebenfalls,
   Transaktion/Nur lesen/Projektleitung lesen.
3. Desk → **Plattform Finanzen Einstellungen**: UID-Nummer (Pflichtangabe!), IBAN/BIC des Geschäftskontos (SEPA-Auftraggeber),
   Zahlungsziel, Vorlauf der Gutschriften.
4. Setup-Assistent (auch ohne ERPNext – legt dann nur die VPI-Startwerte an):
   ```
   bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.einrichten
   bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.einrichten --kwargs "{'kontenplan': 'Standard with Numbers', 'land': 'Austria'}"
   ```
   Mit ERPNext: Company „ÖkoInvest GmbH“, Kostenstellen (Flächen & Pacht, Contracting & PPA, Projektbörse, Projektentwicklung,
   Verwaltung), Artikel `PACHT`, `PACHT-RES`, `PACHT-UMSATZ`, `PROVISION`, `CONTRACTING-STROM` (kWh), `CONTRACTING-GRUND`,
   Anlagen-Artikel `PV-ANLAGE`/`BATTERIESPEICHER` + Kategorie „PV-Anlagen“, Lieferantengruppe „Flächeneigentümer“,
   Kundengruppen „Contracting-Kunden“/„Projektanbieter“, Steuerkonten und -vorlagen AT/DE/CH (Vorschlag), Zahlungsbedingungen
   „14/30 Tage netto“, Lagerort „ÖkoInvest Anlagen“, Custom Fields (`oekoinvest_*`), Druckformate „ÖkoInvest Pachtgutschrift“,
   „ÖkoInvest Contracting-Rechnung“, „ÖkoInvest Provisionsrechnung“. Der Bericht listet angelegt / vorhanden / Hinweise / Fehler.
5. ERPNext aktivieren: `bench --site <site> set-config oekoinvest_erpnext 1` (nur Finanzen abschalten: `oekoinvest_erpnext_finanzen 0`).
6. Projektgesellschaften (SPV): je SPV eine Company –
   `bench --site <site> execute oekoinvest_app.plattform.finanzen.einrichtung.spv_company --kwargs "{'name': '…', 'abkuerzung': '…', 'land': 'Germany'}"`;
   im Gesellschaftsverzeichnis `erpnext_company` auf diese Company setzen.
7. VPI-Werte prüfen/ergänzen (Backoffice → Finanzen → Index) – Jahresdurchschnitte laut Statistik Austria (VPI 2020), Destatis (VPI 2020), BFS (LIK Dez. 2020).
8. Scheduler muss laufen (`bench doctor`): täglich `finanzen.abrechnung.lauf_taeglich`.

**Vor Einsatz gegen die installierte ERPNext-Version prüfen:** Pflichtfelder von Asset (Finance Book), Subscription/Subscription Plan,
Steuervorlagen (`erpnext.controllers.accounts_controller.get_taxes_and_charges`), Kontenzuordnung des gewählten Kontenplans.

## Abläufe

**Pacht (Gutschrift):** Pachtvertrag mit Modell `fest` (Jahrespacht), `indexiert` (VPI-Reihe, Basisjahr, Schwelle %, Weitergabe %,
nur Erhöhung) oder `umsatz` (Anteil der Stromerlöse aus den Zählerstand-Monatswerten der verknüpften Anlage × vereinbartem Erlös,
mindestens Mindestpacht). Reservierungsprämie vom Vertragsdatum bis zum Pachtbeginn (Baubeginn/Inbetriebnahme) – immer
nachschüssig. Perioden kalendergebunden (jährlich/halbjährlich/vierteljährlich/monatlich), erste/letzte taggenau anteilig;
vorschüssig fällig am Periodenbeginn + Ziel (Gutschrift `Vorlauf` Tage vorher), nachschüssig nach Periodenende. Indexierung zum
1.1. mit dem Jahresdurchschnitt des Vorjahres. Fehlender Index/Ertrag → **Klärfall**. Je Periode höchstens ein nicht stornierter
Beleg (idempotent). ERPNext: **Purchase Invoice** an den Eigentümer als Supplier (automatisch angelegt, `oekoinvest_konto`).

**Auszahlung:** Zahlungsvorschlag (offene Gutschriften bis Stichtag, je zahlender Gesellschaft und Eigentümer). Freigabe nur mit
**KYC verifiziert + geprüfter Bankverbindung** (+ Eigentumsnachweis, wenn der Vertrag an eine Portal-Fläche gebunden ist) –
verbindlich über `kyc_kern.kyc_freigabe("auszahlung", …)` (Geltung laut KYC-Einstellungen/`oekoinvest_kyc_gating`). IBAN
ausschließlich aus der Verifizierung – ohne gültige IBAN nie eine Auszahlung. Gesperrte Posten erscheinen als **Klärfall
„KYC unvollständig“** (je Eigentümer und Vertrag, schließt sich nach Freigabe/Auszahlung). SEPA-Datei
**pain.001.001.09** (eine Datei je Auftraggeberkonto/Gesellschaft), Gutschriften → „angewiesen“; nach Ausführung durch die Bank
den Zahlungslauf bestätigen → „bezahlt“ (Benachrichtigung an den Eigentümer). Die App führt keine Zahlungen aus.

**Contracting (Rechnung):** je Anlage und Monat aus den **abrechnungsrelevanten (geeichten)** Messpunkten: geliefert = Erzeugung
(2.8.0) − Einspeisung (Zweirichtungszähler 2.8.0), sonst Verbrauchszähler (1.8.0); × Arbeitspreis (Indexierung % p. a. je volles
Vertragsjahr) + Grundgebühr. Fehlender Monatswert/Vormonatsstand, negative Lieferung oder > 270 kWh/kWp → **Klärfall**. Aussteller
ist die **Eigentümergesellschaft** der Anlage (`eigentuemer_id` → Gesellschaftsverzeichnis, sonst `eigentuemer`, sonst ÖkoInvest
GmbH), Empfänger der Stromabnehmer (Kunde bzw. Organisation). Ab dem 5. des Monats rechnet der Scheduler den Vormonat ab.
ERPNext: **Sales Invoice** in der Company der Eigentümergesellschaft; optional Grundgebühr als **Subscription**
(Einstellung „Grundgebühr über Subscription“, dann enthält die Plattform-Rechnung nur den Arbeitspreis).

**Provision:** beim Verkauf entsteht die Provision (Kern) → sofort Provisionsrechnung (Hook `Plattform Provision.after_insert`,
Scheduler als Rückfall), Provision → „In Rechnung“. Zahlungseingang (ERPNext Payment Entry bzw. „bezahlt“ im Backoffice) →
Provision „Bezahlt“. Mahnhinweis ab 7/21/35 Tagen Überfälligkeit (Vorschlag, Versand durch die Buchhaltung).

**Anlagenbuchhaltung:** Aktivierung je Contracting-Anlage (Anschaffungswert, Nutzungsdauer – PV 20, Speicher 10 Jahre als Vorschlag –,
Inbetriebnahme, Regel AT Halbjahresregel / DE, CH monatsgenau); ERPNext **Asset** (Straight Line) in der Company der
Eigentümergesellschaft, verknüpft über `oekoinvest_anlage`.

**Projektcontrolling:** Ist-Kosten je Entwicklungsprojekt – mit ERPNext aus Purchase Invoice Items, Journal Entry Accounts (Aufwand)
und Timesheets mit Projektbezug (`Project.oekoinvest_entwicklungsprojekt`), ohne ERPNext aus „Plattform Projektkosten“.
Budget vs. Ist, Ampel, Kosten je MWp. API für das Entwicklungsmodul: `finanzen.entwicklung_ist(projektId)`.

**Bankfinanzierung (später):** Belege, Aktivierungen und Zahlungsläufe tragen `gesellschaft_id` – Erlöse (Contracting), Pachtaufwand
und offene Forderungen sind je Gesellschaft auswertbar (Cockpit „Je Gesellschaft“); Grundlage für CFADS/DSCR je SPV.

## Pflichtangaben auf Rechnungen und Gutschriften (Checkliste)

Geprüft beim Erzeugen jedes Belegs (`steuer.pflichtangaben_pruefen`); Fehlendes erscheint am Beleg und im Cockpit.

| Angabe | DE § 14 Abs. 4 UStG | AT § 11 Abs. 1 UStG 1994 | Umsetzung |
|---|---|---|---|
| Name und Anschrift des leistenden Unternehmers | ✔ | ✔ | Aussteller = Gesellschaft (Gutschrift: Eigentümer als Leistender) |
| Name und Anschrift des Leistungsempfängers | ✔ | ✔ | aus der Verifizierung (KYC), sonst Konto/Organisation |
| Steuernummer oder UID des Leistenden | ✔ | UID ✔ | Finanzeinstellungen „UID“ / `oekoinvest_uid` |
| UID des Empfängers | bei Reverse Charge | ab 10.000 € brutto und bei Reverse Charge | KYC/KYB (`uid`) |
| Ausstellungsdatum | ✔ | ✔ | Rechnungsdatum |
| Fortlaufende, einmalige Nummer | ✔ | ✔ | Nummernkreise PG/CR/PR-JJJJ-NNNNN |
| Menge und Art der Leistung | ✔ | ✔ | Positionen (kWh, Zeitraum, Pauschale) |
| Zeitpunkt/Zeitraum der Leistung | ✔ | ✔ | Leistungszeitraum |
| Entgelt, Steuersatz, Steuerbetrag | ✔ | ✔ | netto, Satz, Steuer, brutto |
| Hinweis auf Steuerbefreiung | ✔ | ✔ | Steuertext der Vorlage (z. B. § 4 Nr. 12 a UStG, § 6 Abs. 1 Z 16 UStG 1994) |
| „Steuerschuldnerschaft des Leistungsempfängers“ | ✔ (§ 14a Abs. 5) | ✔ (§ 11 Abs. 1a) | Vorlagen DE-RC-13b / AT-RC-EU |
| Bezeichnung „Gutschrift“ | ✔ (§ 14 Abs. 4 Nr. 10) | § 11 Abs. 7–8 (Vereinbarung, Widerspruchsrecht) | Titel „Gutschrift – Pachtabrechnung“; Gutschriftsverfahren im Pachtvertrag vereinbaren |
| Kleinunternehmer-Hinweis | § 19 UStG | § 6 Abs. 1 Z 27 | Vorlagen „Kleinunternehmer“ |

**Kleinbetragsrechnungen** sind abgebildet (AT bis 400 € brutto § 11 Abs. 6 UStG 1994, DE bis 250 € brutto § 33 UStDV):
Empfängerangaben entfallen, in DE auch der Leistungszeitraum; nicht bei Reverse Charge/nicht steuerbar und nicht für
Gutschriften (`steuer.kleinbetrag_info`). Sonderfälle (z. B. Anzahlungen) sind nicht abgebildet. CH (MWSTG Art. 26,
Kleinbetrag 400 CHF Art. 26 Abs. 3) sinngemäß – Registrierung in der Schweiz prüfen.

Der Monatsabschluss zeigt eine **USt-Verprobung** (Netto/USt je Steuervorlage, Stornos negativ, nach Rechnungsdatum =
Soll-Besteuerung) als Vorbereitung von UVA/UStVA/MWST-Abrechnung (`buchhaltung_kern.ust_verprobung`); sie zählt nur
Ausgangsumsätze – Gutschriften (Gutschriftsverfahren Pacht, Eingangsseite) stehen separat unter `gutschriften` –
und ist keine Steuermeldung, Vorsteuer ist nicht enthalten.

## Steuervorlagen (Vorschlag – mit Steuerberatung abstimmen)

| Vorgang | AT | DE | CH |
|---|---|---|---|
| Pacht (Gutschrift) | steuerfrei § 6 Abs. 1 Z 16 · Option § 6 Abs. 2 (20 %) · Kleinunternehmer | steuerfrei § 4 Nr. 12 a · Option § 9 (19 %) · Kleinunternehmer § 19 | ausgenommen Art. 21 Abs. 2 Ziff. 21 · Option Art. 22 (8,1 %) |
| Contracting-Strom (ÖkoInvest AT liefert) | 20 % | § 13b Abs. 2 Nr. 5 a UStG (Steuerschuld Kunde; entfällt bei deutscher Betriebsstätte) | 8,1 % – Registrierung CH prüfen |
| Provision an Anbieter | 20 % | Reverse Charge (Art. 196 MwStSystRL) – bei Grundstücksbezug Leistungsort prüfen (Art. 31a MwSt-DVO) | nicht steuerbar in AT |

Je Vertrag bzw. Beleg kann eine andere Vorlage gewählt werden; in ERPNext bildet `steuerzuordnung` (Finanzeinstellungen) die
Plattform-Vorlage auf das Taxes-and-Charges-Template ab.
