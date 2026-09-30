# Energiebeschaffung & Versorger-Ausschreibung (Team A3)

Stand: 30.09.2026. Fachkonzept, Datenquellen, Rechtsrahmen und Bedienung. Vertrag der Schnittstellen: [`docs/API.md`](./API.md), Abschnitt „Energiebeschaffung“.
Unsichere Punkte sind als solche gekennzeichnet („nach aktuellem Stand“, „vor Einsatz prüfen“) – vor dem Livegang juristisch und energiewirtschaftlich prüfen lassen.

## 1. Geschäftsmodell

Gewerbe- und Industriekunden (oft ÖKOVOLT-Kunden mit eigener PV und Speicher) beauftragen ÖkoInvest mit dem Einkauf ihres **Reststroms**. ÖkoInvest holt Angebote mehrerer Energieversorger ein (formal Angebotsanfrage, faktisch Bieterwettbewerb mit verdeckten Angeboten und ggf. Folgerunden), bündelt Kunden im **Pool**, normiert alle Angebote auf das Verbrauchsprofil und empfiehlt einen Zuschlag. **Kein Vertrag ohne Freigabe des Kunden im Portal.** Danach überwacht die **laufende Wechselanalyse** Vertrag, Kündigungsfrist und Terminmarkt.

Vergütung ÖkoInvest: Servicefee je MWh und/oder Erfolgshonorar – **nur als Parameter** hinterlegt (Handelsdesk → Annahmen & Vergütung, Standard 0 = nicht festgelegt).

## 2. Preisbildung Gewerbestrom (DE/AT) – Kurzfassung

- **Bestandteile** (netto): Energie/Beschaffung inkl. Vertriebsmarge (durch Ausschreibung beeinflussbar) + Netzentgelte, Messung, Umlagen, Konzessionsabgabe, Stromsteuer bzw. AT: Netzentgelte, Elektrizitätsabgabe, Ökostrompauschale (nicht beeinflussbar). Die Plattform vergleicht deshalb nur den **Energiepreis**; bei Verträgen mit Gesamtpreis werden die festen Bestandteile aus `src/lib/invest/markt.js` (STROM) abgezogen.
- **Festpreis (Vollversorgung)**: Lieferant trägt Preis-, Mengen- und Profilrisiko, preist diese als Aufschlag ein.
- **Strukturierte Beschaffung / Tranchen**: Base-Mengen werden in mehreren Tranchen zu Terminpreisen (Cal/Q/M) gekauft, Profil und Restmenge über den Spotmarkt; Aufschlag je kWh für Strukturierung und Bilanzierung. Kunde trägt ein Teil-Marktrisiko (Plattform: 50 % Exposition als Annahme in der Sensitivität).
- **Spot-Index**: stündlich bzw. viertelstündlich zum Day-Ahead-Preis der Gebotszone + fester Aufschlag – volle Marktexposition, dafür keine Risikoprämie.
- **Profilfaktor** = lastgewichteter Preis / Base-Preis. Ein Einschichtbetrieb mit Last in Peak-Stunden liegt über 1; zusätzliche PV senkt die Menge, erhöht aber meist den Profilfaktor des Reststroms (Abend-/Winterlast) – deshalb wird mit Profil statt Jahresmenge ausgeschrieben.
- **Peak** (EEX-Konvention): Montag–Freitag 08:00–20:00 Uhr Ortszeit; Base = alle Stunden; Offpeak = Rest.

## 3. Datenquellen und Lizenzen

| Daten | Quelle | Lizenz / Nutzung | Umsetzung |
|---|---|---|---|
| Day-Ahead DE-LU und AT (seit 01.10.2025 15-min) | Energy-Charts API (Fraunhofer ISE), `https://api.energy-charts.info/price?bzn=DE-LU\|AT` | Laut API-Beschreibung für DE-LU und AT: **„CC BY 4.0 from Bundesnetzagentur \| SMARD.de“** – Quellenangabe an jeder Darstellung (umgesetzt). Andere Zonen nur privat/intern. | Website: `src/lib/plattform/energie/quellen.js` (6 h Cache, Zeitlimit, Simulation nur als gekennzeichneter Ausfallwert). Frappe: `plattform/energie_quellen.py`, Scheduler täglich, Historie per `historie_laden`. |
| Terminmarkt EEX (Cal/Q/M, Base/Peak) | EEX Group DataSource bzw. lizenzierte Datenanbieter | **Lizenzpflichtig** (Internal Usage License u. a.). Kein automatischer Abruf. | Manuelle Eingabe oder CSV-Import mit **Pflichtfeld Quelle** und Handelstag; Demo-Kurve deutlich gekennzeichnet und abschaltbar. Öffentlich zitierte Schlusskurse nur mit Quelle. |
| Kundenlastgang | Upload der Fachprüfung (Team B): `db.fach.lastgaenge` bzw. „Plattform Lastgang“ | Kundendaten, Geschäftsgeheimnis | Wochenprofil + Monatsmengen der Analyse → Stundenreihe; ohne Lastgang synthetisch aus Lastprofil. |
| Abnahmestellen (MaLo/MeLo, Zählpunkt AT) | Fachprüfung (Team B) | Kundendaten | nur Anzahl/Land/Spannungsebene/Messart an Versorger; IDs erst nach Zuschlag. |

## 4. Rechtsrahmen (vorsichtig formuliert)

- **Private Auftraggeber**: freie Verhandlung; Spielregeln (Fristen, Runden, Bestpreis-Hinweis, Zuschlagskriterien) werden allen Bietern vorab bekanntgegeben und gleich angewendet (Teilnahmebedingungen im Versorger-Portal).
- **Öffentliche Auftraggeber (Kommunen)**: Vergaberecht (DE: GWB/VgV, unterhalb der Schwellenwerte UVgO/Landesrecht; AT: BVergG 2018). EU-Schwellenwert Liefer-/Dienstleistungen **216.000 € netto** (2026/2027, subzentrale Auftraggeber), maßgeblich der geschätzte Gesamtauftragswert über die Laufzeit. Die Plattform ersetzt kein förmliches Verfahren – Schalter „Öffentlicher Auftraggeber“ blendet Warnhinweise ein (nur Markterkundung).
- **Beschaffungsvollmacht**: versionierter Text (`energie/texte.js` = `plattform/energie_texte.py`, gleiche SHA-256-Prüfsumme), Klick-Zustimmung mit Zeitpunkt/IP/Browser, widerrufbar; optional zusätzlich einfache elektronische Signatur über das Signatur-Modul (Backoffice: „Zur elektronischen Unterschrift senden“). Ohne aktive Vollmacht keine Ausschreibung und keine Freigabe.
- **Datenschutz / Geschäftsgeheimnis**: Lastgänge sind bei Kapitalgesellschaften in der Regel keine personenbezogenen Daten, bei Einzelunternehmen/Personengesellschaften können sie es sein (DSGVO); in jedem Fall Geschäftsgeheimnis. Versorger erhalten nur ein Los-Kennzeichen, gerundete Kennzahlen (Menge auf 10/50 MWh, Spitze auf 10 kW), ein **normiertes** Wochenprofil (Faktoren) und Monatsanteile – keine Namen, Orte, PLZ, Lokations-IDs, keine Zeitreihe. Geprüft im Test.
- **Lieferantenwechsel DE**: seit 06.06.2025 technisch binnen 24 Stunden an jedem Werktag (BNetzA-Festlegung, GPKE); vertragliche Kündigungsfristen bleiben maßgeblich → Kündigungsstichtag steuert Fristen-Alarm und Empfehlung.
- **Lieferantenwechsel AT**: Wechsel-Verordnung der E-Control (aktuell Wechsel-V 2026) – Wechselverfahren nach aktuellem Stand höchstens drei Wochen; Details (Fristen der Wechselanfrage) vor Einsatz prüfen.
- **Gebotszonen**: DE-LU und AT seit 01.10.2018 getrennt → eigene Preise und Terminprodukte je Zone.
- **KYC/KYB**: Angebotsabgabe (Schritt „gebot“) und Zuschlag (Schritt „zuschlag“) nutzen das Gating des KYC-Teams (`kycSperre`); im Entwicklungsbetrieb nur Pilot-Konten.

## 5. Funktionen

| Bereich | Route | Inhalt |
|---|---|---|
| Handelsdesk | `/portal/admin/energie` (?tab=uebersicht\|termin\|portfolio\|einstellungen, &zone=DE\|AT) | Spot DE-LU/AT: letzte 48 h (Originalauflösung), Tages-/Monatsmittel Base/Peak, Solar-Capture und Capture-Rate, negative Stunden, Volatilität (σ Tagesänderung, Tagesspanne), Spread AT−DE, Tagesgang. Terminkurve Cal/Q/M Base/Peak mit Verlauf je Produkt, Einzel-/CSV-Einspielung. Pool-Portfolio: Bedarf je Quartal, Tranchen, Hedge-Quote, Mark-to-Market, Risiko (offene Menge × Preisbewegung). Annahmen & Vergütung. |
| Kunden | `/portal/admin/energie/kunden`, `…/kunden/[id]` | Wechselanalyse je Kunde (Empfehlung ausschreiben/abwarten/verlängern mit Begründung), Profilkennzahlen, Kosten Festpreis/Tranchen/Spot rückwirkend (Spot-Historie) und prognostisch (HPFC aus Terminkurve + Stundenform), PV/Speicher-Einfluss, Wochen-Heatmap, Verträge, Vollmacht. |
| Ausschreibungen | `/portal/admin/energie/ausschreibungen[/id]` | Anlegen (ein Kunde oder Pool), Produktvarianten, Einladung (Portal oder E-Mail-Link), Runden mit Frist, Nachladen, Erinnerung, Runde 2 mit Hinweis (aus/Rang/Abstand/Bestpreis – nie Namen), Q&A, normierter Vergleich, Sensitivität, Zuschlagsvorschlag → Kundenfreigabe → Zuschlag, Absagen, Verträge, PDFs. |
| Lieferanten | `/portal/admin/energie/lieferanten` | Stamm DE/AT, Ansprechpartner, Bewertungen, Teilnahmehistorie, KYB-Status, Einladung. |
| Kunde | `/portal/energie/beschaffung` | Vertrag, Kündigungsfrist, Markteinschätzung, Ersparnis vs. Vorvertrag, Angebotsvergleich zur Freigabe, Vollmacht, Ausschreibungsstatus, PDFs. Abnahmestellen/Lastgang: `/portal/energie` (Team B). |
| Versorger | `/portal/ausschreibungen[/id]`, `/einladung/lieferant/[token]` | Nur eingeladene Lose, anonymes Profil, Preisblatt (Arbeitspreis bzw. Aufschlag, Grundpreis, HKN, Mengentoleranz, Bindefrist, Zahlungsziel, Sicherheit), eigene Angebote, Q&A, Ergebnis, Zuschlagsschreiben. |

**Scheduler (Frappe)**: täglich Spotpreise, täglich Fristen-Alarme (90/60/30/14/7 Tage und verstrichen → Aufgabe + Benachrichtigung, je Stufe einmal) und Erinnerung 48 h vor Angebotsfrist, wöchentlich Wechselanalyse aller Verträge. Demo: automatisch, wenn der letzte Lauf älter als 7 Tage ist, oder per Knopf.

## 6. Demo

Einmalig unter `db.energie` ergänzt (fiktiv): 6 Versorger mit Konten `lieferant@example.com`, `lieferant2…6@example.com`; Backoffice `bo-energie@example.com` (Unterrolle Energie); Pool-Kunden `energie-kunde1…3@example.com`; Ausschreibung „Werk Nord“ für `unternehmen@example.com` wartet auf Kundenfreigabe, „Pool Österreich“ in der Angebotsphase (lieferant@ kann bieten), „Pool Süd“ mit Zuschlag, Tranchen 2027/28. Passwort wie alle Demo-Konten. Die Terminkurve der Demo wird bei jedem Abruf erzeugt (nicht gespeichert, gekennzeichnet).

## 7. Tests

- `node scripts/plattform-test-energie.mjs --logik` – reine Logik (ohne Server)
- `node scripts/plattform-test-energie.mjs` – zusätzlich End-to-End gegen den Dev-Server
- Frappe: `python -m unittest oekoinvest_app.plattform.tests.test_energie_kern` (ohne Bench), `bench run-tests --module oekoinvest_app.plattform.tests.test_energie`

Quellen: [Energy-Charts API](https://api.energy-charts.info/), [EEX Licensing & Policies](https://www.eex.com/en/market-data/licensing-policies), [BNetzA Lieferantenwechsel 24h](https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_83_Zug_Mess/8353_Lieferantenwechsel/BK6_Lieferantenwechsel24h_node.html), [E-Control Wechsel-Verordnung 2026](https://www.e-control.at/documents/1785851/0/BGBLA_2026_II_47_Wechsel-Verordnung+2026_Wechsel-V+2026.pdf), [EU-Schwellenwerte 2026/2027](https://www.dstgb.de/themen/vergaberecht/aktuelles/neue-eu-schwellenwerte-festgelegt-2026-2027/).
