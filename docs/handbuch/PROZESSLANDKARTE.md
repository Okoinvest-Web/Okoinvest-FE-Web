# Prozesslandkarte ÖkoInvest-Plattform

Stand: 30.09.2026 · Alle End-to-End-Prozesse mit Rollen, Statusfolgen, Übergaben und Systemen. Maßgebliche Statusautomaten: `src/lib/plattform/prozesse.js` und `docs/API.md` (die Diagramme fassen zusammen, sie ersetzen den Vertrag nicht). Handbücher je Rolle: [README](./README.md).

## Legende

| Kürzel | Bedeutung |
|---|---|
| **Web** | Next.js-Website und Portal (`/portal/**`), Rechteprüfung, PDFs |
| **Frappe** | Kern-Backend `oekoinvest_app` (DocTypes, Scheduler, Desk, E-Mail) |
| **ERPNext** | optional: Rechnungen/Gutschriften, Zahlungen, Anlagen, Projekte |
| **Geo** | Geodaten-Dienst (PostGIS) – ohne Personenbezug |
| **IoT** | Messdaten-Dienst (MQTT → TimescaleDB) |
| **Extern** | Identitätsanbieter, Auskunftei, Register/Verrechnungsstelle, Notar, Grundbuch, Bank, Energieversorger, Netzbetreiber |
| BO-… | Backoffice-Unterrolle (Leitung, Akquise, Transaktion, Buchhaltung, Betrieb, Compliance, Energie, Projektleitung) |

## 0. Geschäftsmodelle im Überblick

```mermaid
flowchart LR
  A[Anfrage / Akquise] --> F[Fläche oder Dach gesichert]
  F --> E[Projektentwicklung bis Baureife]
  E -->|Build-to-Sell| B[Projektbörse / Bieterverfahren]
  B --> C[Closing]
  C --> P[Provision / Verkaufserlös]
  E -->|Eigenbetrieb| FI[Bankfinanzierung]
  FI --> BAU[Bau durch ÖKOVOLT]
  BAU --> BT[Betrieb / Monitoring]
  E -->|Contracting| BAU
  BT --> R[Contracting-Rechnung / Pacht-Gutschrift]
  X[Anbieter Dritter] --> B
  U[Unternehmen] --> EN[Energiebeschaffung / Pool]
  EN --> Z[Zuschlag Versorger]
  M[Bürger / Kommune] --> G[Genossenschaft / Energiegemeinschaft / § 6 EEG]
```

## 1. Anfrage → Vorgang

Rollen: Interessent (öffentlich) → BO-Akquise (bzw. Transaktion/Energie je Typ). Systeme: Web (`POST /api/anfrage`), Frappe (Vorgang, CRM-Kontakt), E-Mail.

```mermaid
stateDiagram-v2
  [*] --> eingegangen: Formular + Einwilligung
  eingegangen --> in_pruefung: BO übernimmt
  in_pruefung --> qualifiziert
  qualifiziert --> angebot
  angebot --> abgeschlossen
  in_pruefung --> abgelehnt: Grund Pflicht
  qualifiziert --> abgelehnt
  eingegangen --> zurueckgezogen: Eigentümer
  abgelehnt --> in_pruefung: BO
  zurueckgezogen --> in_pruefung: BO
```

Übergaben: Typ `flaeche/agri/kommune` → Akquise · `investor/projekt` → Transaktion · `reststrom` → Energie · `carport/speicher` → Vertrieb/Projektleitung · Registrierung mit gleicher E-Mail verknüpft den Vorgang mit dem Konto (nach bestätigter Adresse).

## 2. Flächenpacht (Freifläche, Agri-PV, Dach)

```mermaid
stateDiagram-v2
  [*] --> entwurf: Eigentümer oder Akquise-Karte
  entwurf --> eingegangen: vollständig eingereicht
  eingegangen --> vorpruefung: BO-Akquise
  vorpruefung --> standortanalyse
  standortanalyse --> pachtangebot: Angebot mit Pflichtangaben
  pachtangebot --> vertrag: Eigentümer nimmt an
  vertrag --> planung: Übergabe Projektleitung
  planung --> bau
  bau --> betrieb
  vorpruefung --> abgelehnt: Grund
  standortanalyse --> abgelehnt
  abgelehnt --> vorpruefung: BO
```

```mermaid
sequenceDiagram
  participant EG as Eigentümer
  participant AK as BO-Akquise
  participant PL as BO-Projektleitung
  participant GB as Grundbuch-Akte / Notar
  participant BH as BO-Buchhaltung
  participant CO as BO-Compliance
  EG->>AK: Fläche einreichen (Flurstücke, Eigentum, Belastungen)
  AK->>AK: Vorprüfung, Besichtigung (Termin/ICS)
  AK->>EG: Pachtangebot (Angebotsbogen mit Ampel)
  EG->>AK: Annahme, Unterschrift (EES) Absichtserklärung
  AK->>PL: Neues Entwicklungsprojekt aus Fläche
  AK->>GB: Akte Dienstbarkeit (Vertrag, Beglaubigung, Rangrücktritt, Antrag, Eintragung)
  EG->>CO: Verifizierung (Ausweis, IBAN, Eigentumsnachweis)
  AK->>BH: Pachtvertrag in Finanzen
  BH->>EG: Gutschrift + SEPA-Auszahlung (nur mit KYC)
```

## 3. Aktive Flächenakquise (Geodaten → Brief)

Rollen: BO-Akquise, BO-Leitung, BO-Compliance (Sperrliste). Systeme: Geo, Web (Akquise-Karte), Frappe (Akquise-Ziel, CRM), Extern (Verrechnungsstelle Grundbuch), Post.

```mermaid
flowchart TD
  K[Kandidat auf der Karte: Score, Netz, Widmung] --> U[Als Akquise-Ziel übernehmen]
  U --> T[Aufgabe: Eigentümer ermitteln]
  T --> GB[Grundbuchabfrage nur nach Grundstück, protokolliert]
  GB --> S{Auf Sperrliste?}
  S -- ja --> ENDE[Keine Ansprache]
  S -- nein --> BR[Ein Brief mit Art.-14-Info und Widerspruchshinweis]
  BR --> R{Reaktion}
  R -- Interesse --> V[Vorgang / Fläche → Prozess 2]
  R -- Widerspruch --> SP[Sperrvermerk im CRM sofort]
  R -- keine --> L[Löschung nach 12 Monaten, keine Folgebriefe]
```

## 4. Projektentwicklung → Übergabe

Rollen: BO-Projektleitung, Gutachter (Einladung), Eigentümer (vereinfachte Sicht), Co-Investor (freigegeben), BO-Leitung (Geschäftsmodell). Systeme: Web, Frappe, ERPNext optional (Project/Task/Timesheet).

```mermaid
flowchart LR
  subgraph Entwicklung
    V[Vorlage Land × Typ] --> M[Meilensteine mit Abhängigkeiten]
    M --> N[Netzanfrage / Zusage]
    M --> B[Bauleitplanung / Umwidmung / Nutzungsplanung]
    M --> G[Gutachten: Gutachter lädt hoch → eingereicht → PL erledigt]
    M --> FS[Flächensicherung + Dienstbarkeit]
  end
  N & B & G & FS --> RTB[Phase Baureife RTB]
  RTB --> GM{Geschäftsmodell - BO-Leitung}
  GM -- Build-to-Sell --> BOERSE[Übergabe Börse → Prozess 5]
  GM -- Eigenbetrieb --> FIN[Finanzierungsfall → Prozess 9]
  GM -- Contracting --> ANL[Übergabe Bau → Anlage → Prozess 10]
```

Regeln: Erledigen nur mit erledigten Vorgängern (409) und Pflichtdokument bzw. begründetem Verzicht (422); Gutachter setzt nie „erledigt“.

## 5. Projektbörse und Deal-Room

Rollen: Anbieter, Investor, BO-Transaktion, BO-Compliance (KYC), BO-Leitung. Systeme: Web, Frappe, E-Mail, KI (optional).

```mermaid
stateDiagram-v2
  state "Projekt" as P {
    [*] --> entwurf
    entwurf --> pruefung: Anbieter reicht ein (Provisionsvereinbarung)
    pruefung --> entwurf: Rückfrage / zurückziehen
    pruefung --> veroeffentlicht: Freigabe, Satz 1,5–3 %, KYB Anbieter
    pruefung --> abgelehnt
    abgelehnt --> entwurf
    veroeffentlicht --> reserviert: LOI angenommen / Zuschlag
    reserviert --> veroeffentlicht
    veroeffentlicht --> entwurf: von der Börse nehmen
    reserviert --> verkauft: Closing
  }
```

```mermaid
stateDiagram-v2
  state "Interesse (Investor)" as I {
    [*] --> gemerkt
    gemerkt --> nda_angefragt: Klick-NDA / EES
    nda_angefragt --> nda_freigegeben: BO + KYC Investor → Datenraum Stufe 1
    nda_freigegeben --> loi_abgegeben: LOI (+ Bonität) → Stufe 2
    loi_abgegeben --> loi_angenommen: BO
    nda_freigegeben --> loi_angenommen: Zuschlag im Bieterverfahren
    loi_angenommen --> abgeschlossen: Verkauf
    nda_angefragt --> abgelehnt
    loi_abgegeben --> abgelehnt
  }
```

Fragen & Antworten: `eingereicht → freigegeben (Anbieter, Frist) → beantwortet → veroeffentlicht` · `abgelehnt` · Rückgabe `beantwortet → freigegeben`.
Bieterverfahren: `laufend → auswertung → zuschlag → abgeschlossen` · `abgebrochen`; Runden indikativ/verbindlich; Gebote verdeckt, Zuschlag erst nach Rundenende, KYC des Bieters.

## 6. Closing → Provision → Rechnung

```mermaid
sequenceDiagram
  participant TR as BO-Transaktion
  participant K as Käufer
  participant V as Verkäufer
  participant CO as BO-Compliance
  participant N as Notar / Treuhand
  participant BH as BO-Buchhaltung
  TR->>TR: Closing-Raum aus Zuschlag bzw. LOI (Asset/Share, Kaufpreis, SPA-Muster)
  CO-->>TR: KYC/KYB beider Seiten verifiziert
  TR->>K: Kontaktfreigabe
  TR->>V: Kontaktfreigabe
  K->>TR: CPs melden (Nachweis)
  V->>TR: CPs melden (Nachweis)
  TR->>N: Notartermin (.ics), Beurkundung Share Deal
  N-->>TR: Zahlungseingang / Treuhandfreigabe
  TR->>TR: Closing → Projekt verkauft (System)
  TR->>BH: Provision entsteht automatisch
  BH->>V: Provisionsrechnung → bezahlt
```

## 7. Grundbuch und Dienstbarkeit

Rollen: BO-Akquise/Projektleitung/Transaktion, Eigentümer bzw. Dachgeber, Notar, Grundbuchgericht/-amt, Grundpfandgläubiger (Bank). Systeme: Web (Akte, Muster-PDF, Signatur), Frappe (Fristen täglich).

```mermaid
flowchart LR
  V[Vertrag erstellt] --> U[Unterschrift EES oder Upload]
  U --> BG[Beglaubigung / Beurkundung beim Notar]
  BG --> RR{Grundpfandrechte?}
  RR -- ja --> RANG[Rangrücktritt / Vorrangseinräumung der Bank]
  RR -- nein --> A
  RANG --> A[Antrag / Grundbuchsgesuch - Aktenzeichen bzw. TZ]
  A --> E[Eintragung bestätigt - Auszug]
  E --> ANL[Anlage: Dienstbarkeit eingetragen]
```

DE § 29 GBO · AT § 31/§ 32 GBG · CH Art. 732 ZGB. Die EES ersetzt die Beglaubigung nie.

## 8. Identität, Bonität, Register (Querschnitt)

```mermaid
stateDiagram-v2
  [*] --> offen
  offen --> eingereicht: Nutzer, alle Pflichtpunkte
  eingereicht --> in_pruefung: Compliance übernimmt
  in_pruefung --> zweitpruefung: Risiko hoch / Treffer ausgeschlossen
  zweitpruefung --> verifiziert: andere Person
  in_pruefung --> verifiziert
  in_pruefung --> nachgefordert
  in_pruefung --> abgelehnt
  nachgefordert --> eingereicht
  verifiziert --> abgelaufen: Wiederholungsprüfung fällig
  verifiziert --> offen: erneute Prüfung
  abgelehnt --> offen
```

Gating (Freigabe-Sperren, 409 `kyc`): NDA/Datenraum, LOI, Gebot, Zuschlag, Veröffentlichung, Auszahlung (+ IBAN + Eigentumsnachweis), Contracting-Vertrag, Signing/Closing (beide Seiten).
Externe Dienste liefern nur Hinweise an den Fall (Identitätsanbieter per signiertem Webhook, MRZ-Vorprüfung, Registerabruf mit Datum). **Bonität:** Anlass → Information des Betroffenen → Auskunft → Mensch entscheidet mit Begründung.

## 9. Bankfinanzierung Eigenbetrieb

```mermaid
sequenceDiagram
  participant L as BO-Leitung
  participant T as BO-Transaktion / Buchhaltung
  participant B as Bank (Portal)
  participant A as Anlage / IoT
  T->>T: Finanzierungsfall aus Entwicklungsprojekt oder Anlage
  T->>B: Anfrage an mehrere Banken (persönlicher Link, 14 Tage)
  T->>B: Bankenpaket - Bausteine einzeln freigeben
  B->>T: Rückfragen, Term Sheet oder Absage
  T->>L: Term-Sheet-Vergleich
  L->>T: Entscheidung (nur Leitung)
  T->>T: Kreditvertrag, CPs (Auszahlungsvoraussetzungen)
  A-->>T: Zählerwerte → DSCR rollierend 12 Monate, LLCR (täglich)
  T->>B: Bank-Reporting (PDF), Frühwarnung bei Ampel gelb/rot
```

## 10. Contracting: Anlage, Monitoring, Störung, Abrechnung

```mermaid
flowchart TD
  NEU[Anlage anlegen: Eigentümergesellschaft Pflicht] --> KYC{KYB Kunde verifiziert?}
  KYC -- nein --> WART[Vertrag gesperrt]
  KYC -- ja --> GER[Gerät verbinden: MQTT-Zugang, Passwort einmalig]
  GER --> LIVE[Live-Werte / Heartbeat → Portal Mein Solarstrom]
  LIVE --> ST{Störung?}
  ST -- ja --> Q[Betrieb quittiert, bearbeitet, behebt → Kunde informiert, ggf. Ticket]
  LIVE --> ZL[Geeichte Monatswerte Messstellenbetreiber]
  ZL --> RE[Ab dem 5.: Contracting-Rechnung Vormonat - Aussteller Eigentümergesellschaft]
  ZL -- fehlt --> KF[Klärfall Buchhaltung ↔ Betrieb]
```

## 11. Pacht-Abrechnung und Auszahlung

```mermaid
flowchart LR
  PV[Pachtvertrag: fest / indexiert / Umsatz + Mindestpacht] --> LAUF[Abrechnungslauf je Periode]
  LAUF --> GS[Gutschrift - je Periode genau eine]
  GS --> ZV[Zahlungsvorschlag je Gesellschaft]
  ZV --> K{KYC + IBAN geprüft + Eigentumsnachweis?}
  K -- nein --> KL[Klärfall KYC unvollständig]
  K -- ja --> SEPA[SEPA pain.001 → Bank]
  SEPA --> ANG[angewiesen]
  ANG --> BEZ[Zahlungslauf bestätigt → bezahlt, Eigentümer benachrichtigt]
```

## 12. Energiebeschaffung und Versorger-Ausschreibung

```mermaid
sequenceDiagram
  participant KU as Kunde (Unternehmen)
  participant EN as BO-Energie
  participant LF as Versorger (eingeladen)
  KU->>EN: Abnahmestellen, Vertrag, Kündigungsfrist, Lastgang
  KU->>EN: Beschaffungsvollmacht (Klick, optional EES) + Servicevertrag
  EN->>EN: Wechselanalyse (ausschreiben / abwarten / verlängern)
  EN->>LF: Einladung, anonymes Los (gerundet, normiertes Profil)
  LF->>EN: Fragen (Antwort anonym an alle)
  LF->>EN: Verdecktes Angebot mit Bindefrist (KYB)
  EN->>LF: ggf. Runde 2 (Rang/Abstand/Bestpreis, nie Namen)
  EN->>KU: Normierter Vergleich + Zuschlagsvorschlag
  KU->>EN: Freigabe (innerhalb der Bindefrist)
  EN->>LF: Zuschlag + Kundendaten / Absagen an übrige
  EN->>KU: Aufgabe Lieferantenwechsel, Vertrag, Fristen-Alarme
```

Status Ausschreibung (vereinfacht): `entwurf → angebotsphase (Runde n) → auswertung → vorschlag → freigabe Kunde → zuschlag` · `abgebrochen`. Kommunen: nur Markterkundung (Vergaberecht).

## 13. Elektronische Unterschrift

```mermaid
stateDiagram-v2
  [*] --> laufend: BO stellt PDF bereit, Reihenfolge festgelegt
  laufend --> laufend: Unterzeichner n - Code per E-Mail, Zustimmung, SHA-256 geprüft
  laufend --> abgeschlossen: letzte Unterschrift → Original + Prüfseite
  laufend --> abgelehnt: Grund
  laufend --> widerrufen: vor Abschluss
```

Protokoll: Zeit, IP, Browser, Code-Bestätigung, Hash vorher/nachher. Einfache elektronische Signatur – keine Schriftform, keine Beglaubigung.

## 14. Termine und Support

- **Termin:** öffentlich oder Portal → Zuständigkeit (Wunsch → Gebiet → geringste Belegung) → Sperre gegen Doppelbuchung → ICS an Kunde und Mitarbeiter → Erinnerung 24 h → Umbuchen/Absagen per Einmal-Link; Abwesenheit → automatische Vertretung.
- **Support:** Ticket (Kunde oder aus Störung) → Priorität/SLA → Zuweisung → öffentliche Antwort (erfüllt Reaktionsziel) / interne Notiz → gelöst → Kundenantwort öffnet wieder → geschlossen.

## 15. Kommune, Genossenschaft, Energiegemeinschaft

```mermaid
flowchart LR
  KA[Kommunale Anfrage mit Gemeindeschlüssel] --> CRM[CRM-Organisation]
  CRM --> BEST[Berechtigung unabhängig bestätigen]
  BEST --> ROLLE[Rolle kommune → Gemeinde-Sicht ab Planung]
  ROLLE --> P6[§ 6 EEG / Beteiligung / Bauleitplanung]
  MI[Mitglied] --> VM[Vormerkung Genossenschaft im Aufbau - keine Zeichnung]
  MI --> EG[Teilnahme Energiegemeinschaft je Land]
```

## 16. Systemübergaben (Wer schreibt wo?)

| Prozess | Web | Frappe | ERPNext | Geo | IoT | Extern |
|---|---|---|---|---|---|---|
| Anfrage/CRM | Formular, Portal | Vorgang, CRM, Automationen | – | – | – | E-Mail |
| Akquise | Karte | Akquise-Ziel, Aufgabe, Sperrvermerk | – | Kandidaten, Scoring | – | Verrechnungsstelle Grundbuch, Post |
| Entwicklung | Gantt, Portale | Projekte, Meilensteine | Project/Task/Timesheet (opt.) | Netzabstand | – | Gutachter, Behörden, Netzbetreiber |
| Börse/Deal-Room | Exposé, Datenraum, Q&A, Gebote | Interessen, Zugriffe, Hash-Kette | – | – | – | KI (opt.) |
| KYC/Bonität | Verifizierung | KYC-Fall (verschlüsselt) | – | – | – | Identitätsanbieter, Auskunftei, Register |
| Closing/Grundbuch | Räume, Muster-PDF, EES | Akten, Fristen | – | – | – | Notar, Grundbuch, Treuhand |
| Finanzen | Belege, SEPA-Datei | Abrechnung, Klärfälle | Invoices, Payment, Asset (opt.) | – | Zählerwerte | Hausbank |
| Energie | Handelsdesk, Portale | Ausschreibung, Vollmacht, Verträge | – | – | – | Energy-Charts, EEX-Lizenz, Versorger |
| Finanzierung | Cockpit, Bank-Portal | Fall, Covenants (täglich) | – | – | DSCR-Basis | Banken |
| Contracting | Mein Solarstrom, Leitstand | Anlagen, Störungen | Sales Invoice, Asset (opt.) | – | Messwerte, Live | Messstellenbetreiber |
