# Finanzierung – Investoren-Cockpit, Bankfinanzierung Eigenbetrieb, Förderung (Recherche und Umsetzung)

Stand: **September 2026**. Alle Werte sind **Orientierung** (marktübliche Spannen, eigene Einschätzung aus veröffentlichten
Branchenberichten, Term-Sheet-Übersichten und Förderrichtlinien) – **keine Bankkonditionen, keine Anlage-, Finanzierungs-
oder Steuerberatung**. Konditionen ändern sich laufend; maßgeblich sind die Richtlinien der Förderstellen und die Angebote der
Banken. Steuerliche Aussagen immer **mit Steuerberatung prüfen**. Rechenwerte stehen zentral in `src/lib/invest/markt.js`
(`FINANZIERUNG.projekt`, `.foerderkredit`, `.leasing`, `.mietkauf`, `.steuerLand`, `.afaDegressiv`, `.ifbAt`).

## 1. Projektfinanzierung PV im DACH-Raum

| Thema | Übliche Praxis (Orientierung) | Rechenwert |
|---|---|---|
| Struktur | Non-Recourse bzw. Limited Recourse über eine Projektgesellschaft (SPV); Sicherheiten: Sicherungsübereignung der Anlage, Abtretung der Erlöse und Verträge, Verpfändung der Anteile und Projektkonten, Eintrittsrechte (Direct Agreements) mit EPC/O&M/Abnehmer, Dienstbarkeiten zugunsten der Bank | – |
| Bemessung | Darlehen = Barwert des Schuldendienstes, der aus dem Cashflow (CFADS) mit Mindest-DSCR bedient werden kann – **Tilgung skulptiert nach DSCR** (Schuldendienst_t = CFADS_t ÷ Ziel-DSCR) | `skulptieren()` |
| DSCR (Sizing) | bei EEG/Marktprämie meist um 1,10–1,20 auf P90 bzw. 1,20–1,30 auf P50; PPA/Merchant deutlich höher (oft ≥ 1,3–1,4) | P90 1,10 · P50 1,20 |
| Covenants | Lock-up (Ausschüttungssperre) meist um 1,10; Default meist um 1,05; teils LLCR-Covenant | 1,10 / 1,05 |
| LLCR | Barwert der CFADS über die Restlaufzeit (+ DSRA) ÷ Restschuld | `llcr` |
| Laufzeit (Tenor) | meist 15–20 Jahre bei EEG-Projekten, mit Abstand (Tail) zur Förder- bzw. Pachtdauer | 18 Jahre |
| DSRA | Schuldendienstreservekonto, meist 6 Monate Schuldendienst (aus EK bzw. Garantie) | 6 Monate |
| Gearing | Fremdkapital häufig 70–85 % der Investition | max. 85 % |
| Zins 2026 | Referenz (EUR-Swap 10–15 J.) Größenordnung 2,5–3 % + Marge 1,4–2,5 % → all-in grob 4–5 %; tagesaktuell anfragen | 2,7 % + 1,8 % |
| Gebühren | Bearbeitungs-/Arrangierungsgebühr ca. 0,5–1,5 %, Bereitstellungsprovision während der Bauzeit | 1,0 % |

## 2. Förderkredite und Zuschüsse

**Deutschland**
- **KfW Erneuerbare Energien – Standard (270)**: bis 100 % der Investitionskosten, bis 150 Mio. € je Vorhaben, Laufzeit bis
  30 Jahre, bis 5 tilgungsfreie Anlaufjahre, danach gleich hohe vierteljährliche Raten, Zinsbindung bis 20 Jahre,
  risikogerechter Zins über die Hausbank (Antrag vor Vorhabenbeginn). Quelle: [kfw.de/270](https://www.kfw.de/270), abgerufen 09/2026.
  Premium-Varianten (z. B. 271/281) richten sich an Wärmeanwendungen – für PV-Parks in der Regel nicht einschlägig.
- **EEG 2023**: ab 1 MW Ausschreibung (erstes Segment Freifläche/Agri-PV, zweites Segment Gebäude), Zuschlag 20 Jahre als
  gleitende Marktprämie; keine Zusage – Wettbewerb. Landesförderinstitute (LfA Bayern, L-Bank, NRW.BANK …) mit eigenen Programmen.

**Österreich**
- **EAG-Investitionszuschuss PV & Speicher** (OeMAG): Fördercalls, Kategorien A–D bis 1.000 kWp (2026 Kategorie D bis 120 €/kWp),
  Zuschläge u. a. für Agri-PV (ab 2 m), Parkplatzüberdachung, europäische Komponenten; nicht mit Marktprämie kombinierbar.
  Quelle: [eag-abwicklungsstelle.at](https://www.eag-abwicklungsstelle.at).
- **EAG-Marktprämie** über Ausschreibung; für Freiflächen je nach Fläche Abschläge (Details im EAG prüfen).
- **aws** (Kredite, Garantien), **OeKB** (Schwerpunkt Export – für Inlandsparks in der Regel nicht einschlägig),
  **Umweltförderung im Inland (UFI/KPC)** – PV vorrangig über EAG.

**Schweiz**
- **Einmalvergütung**: KLEIV < 100 kW, **GREIV** ab 100 kW (höchstens rund 30 % der Investitionskosten von Referenzanlagen),
  **HEIV** ab 150 kW ohne Eigenverbrauch über Auktion (bis 60 %). Quelle: [pronovo.ch](https://pronovo.ch/de/foerderung/photovoltaik/).
- **Solarexpress** für alpine Grossanlagen (befristet), kantonale Programme.

Umsetzung: `src/lib/plattform/finanzierung/foerder.js` (Förder-Check je Land/Typ/Größe mit Quelle, „keine Zusage“) und
DocType `Plattform Foerderprogramm` (im Desk pflegbar).

## 3. Leasing, Mietkauf

- **Anlagenleasing** (Voll-/Teilamortisation): Leasinggeber ist Eigentümer, Raten sind Betriebsaufwand, Kaufoption zum Restwert;
  Zurechnung steuerlich nach den Leasingerlassen (Grundmietzeit 40–90 % der Nutzungsdauer) – **mit Steuerberatung prüfen**.
  **Sale-and-Lease-back** für Bestandsanlagen (Liquidität freisetzen).
- **Mietkauf**: Eigentumsübergang, Abschreibung beim Mietkäufer, Anzahlung als Eigenkapital.
- Rechenwerte: Leasing Bankzins + 1,0 Pp., 15 Jahre, Restwert 10 %, Sonderzahlung 10 %; Mietkauf + 0,75 Pp., Anzahlung 10 %.

## 4. Steuern (Näherung – mit Steuerberatung prüfen)

- **AfA**: PV linear 20 Jahre (AfA-Tabelle DE; AT/CH übliche Nutzungsdauer). **DE**: degressive AfA 30 % (max. 3 × linear) für
  bewegliche Wirtschaftsgüter mit Anschaffung 1.7.2025–31.12.2027 (Gesetz für ein steuerliches Investitionssofortprogramm);
  Körperschaftsteuer sinkt ab 2028 schrittweise auf 10 % (2032). **AT**: degressive AfA bis 30 % (§ 7 Abs. 1a EStG);
  **Investitionsfreibetrag** (§ 11 EStG) 10 % bzw. 15 % ökologisch, befristet für Anschaffungen 11/2025–12/2026 20 % bzw. 22 %,
  Bemessung max. 1 Mio. € je Wirtschaftsjahr. **CH**: Abschreibung nach kantonaler Praxis.
- Cockpit: Ertragsteuer auf CFADS − Zinsen/Leasingraten − AfA (− IFB), unbegrenzter Verlustvortrag; keine Gewerbesteuer-
  Hinzurechnungen, keine Mindestbesteuerung → ausdrücklich als Näherung gekennzeichnet.

## 5. Geschäftsmodelle je Entwicklungsprojekt

| Modell | Wert heute | Kapitalbindung | Rechnung |
|---|---|---|---|
| Build-to-Sell (ÖKOVOLT baut per EPC, SPV/Rechte verkauft) | Verkaufspreis Projektrechte (Standard: Mitte RTB-Spanne `PHASEN`) + optional EPC-Marge (Konzernsicht) | keine | `geschaeftsmodellVergleich` |
| Eigenbetrieb mit Bankfinanzierung | Barwert der EK-Cashflows (nach Steuern, Näherung) zum EK-Diskont | EK-Bedarf der Variante | `varianteRechnen` |
| Contracting im Eigentum | wie Eigenbetrieb mit Direktlieferpreis (`DACH.ppaVorOrtCt`) und Lieferanteil | EK-Bedarf | dito |
| Reine Verpachtung | Barwert (Nutzungsentgelt − eigene Pacht) | keine | dito |

## 6. Umsetzung (Code)

| Teil | Datei |
|---|---|
| Rechenkern (Varianten, Skulptierung, Steuern, Stresstest, Vorbelegung aus Bewertung) | `src/lib/plattform/finanzierung/kern.js`, `vorbelegung.js` |
| Bank: Paket, Term Sheet, CPs, Covenants | `src/lib/plattform/finanzierung/bank.js` |
| Förder-Check | `src/lib/plattform/finanzierung/foerder.js` |
| Geschäftsmodell | `src/lib/plattform/finanzierung/geschaeftsmodell.js` |
| Backend (Demo/Frappe) | `backend/finanzierung.js`, `backend/demo/finanzierung{,-seed}.js`, `backend/frappe/finanzierung.js`, Frappe `plattform/api/finanzierung.py`, `plattform/finanzierung_kern.py` |
| PDFs/CSV | `src/lib/plattform/server/finanzierung-pdf.js`; Frappe-Druckformate „Finanzierungsvergleich“, „Bank Reporting Covenants“ |
| Seiten | `/portal/finanzierung` (Investor/Anbieter), `/portal/admin/finanzierung[/id]` (Backoffice), `/portal/bank[/id]` (Bank), `/einladung/bank/[token]` |
| Bank-Akte (Anforderungen, Q&A, Kreditentscheidung, CP-Bestätigung, Auszahlungen, Berichte, Bank-Team) | `src/lib/plattform/finanzierung/bankakte.js`, `backend/{demo,frappe}/bankakte.js`, Frappe `plattform/api/bankakte.py`, `plattform/bankakte_kern.py`; Seiten `/portal/bank/[id]`, `/portal/bank/team`, `/portal/admin/finanzierung/[id]/bank/[anfrageId]` |
| Tests | `node scripts/plattform-test-finanzierung.mjs` (`--nur-logik` ohne Server); Frappe `tests/test_finanzierung{,_kern}.py` | · `node scripts/plattform-test-gutachter-bank.mjs` (Bank-Akte)
