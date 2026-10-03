# Prüfpunkte für die Kanzleien (Strang R)

> **ENTWURF – Arbeitsliste, keine Rechtsberatung.** Jede Zeile ist eine offene Frage an die Kanzlei des genannten Landes.
> Fundstelle = Datei unter `docs/strang-r/`. „Q“ = Stand der Quelle: ✔ am Original geprüft (03.10.2026) · ◐ Sekundärquelle ·
> ✖ nicht geprüft (Fachwissen der Agenten bzw. Expertenbefund).
> Priorität: **A** = Blocker für Livegang · **B** = vor Freigabe des betroffenen Texts · **C** = kann nachgezogen werden.

## Freigabe-Rahmen

- Je Land eine **schriftliche Freigabe** (AT, DE, CH) für: Datenschutzerklärung (Kern + Länderteil), Nutzungsbedingungen (Kern + Länderteil),
  Besondere Bedingungen, Hinweisgeber-Seite und Datenschutzhinweis Meldekanal.
- Termin laut Masterplan: 4–8 Wochen ab Mandat. Bis dahin `noindex` und kein öffentlicher Livegang.
- Zweite Prüfperson für Klasse-A-Änderungen (Masterplan E6) zeichnet die Übernahme in den Code ab.

## Inhaber und Stammdaten

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-01 | A | alle | Kontaktdaten (Telefon, Funktionspostfach, Datenschutz-Postfach, UID): Auftrag sagt „nicht freigegeben“, `src/data/site.js` sagt „vom Inhaber freigegeben (Oktober 2026)“. Welche Aussage gilt? | README | – |
| P-02 | A | alle | Registerangaben (Firma, Sitz, FN 541505g, LG Ried, Geschäftsführung, Vertretung) am aktuellen Firmenbuchauszug bestätigen | DSE 1; NB § 1 | ✖ |
| P-10 | C | alle | Kurzfassung „Das Wichtigste in Kürze“ zulässig und deckungsgleich mit dem Volltext? | DSE Kopf | – |

## Datenschutz – Kern (Kanzlei AT, Abstimmung DE/CH)

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-11 | B | AT | Pflicht zur Benennung eines Datenschutzbeauftragten (Art. 37 DSGVO) – KYC, Monitoring, Grundbuch-Akquise als Kerntätigkeit? | DSE 1 | ✖ |
| P-12 | B | alle | Rollenmodell Gruppe/Projektgesellschaften: Auftragsverarbeitung oder gemeinsame Verantwortung (Art. 26)? Verträge vorhanden? | DSE 1 | ✖ |
| P-13 | **A** | alle | GwG-Verpflichtetenstellung der ÖkoInvest GmbH (AT GewO §§ 365m ff./FM-GwG, DE GwG, CH GwG; AMLR ab 10.07.2027). Bestimmt Rechtsgrundlage KYC (lit. c oder b/f), Fristen, Tipping-off | DSE 2, 9, 15; NB § 9 | ✖ |
| P-14 | B | alle | Unveränderliche Hash-Kette im Aktivitäts- und Zustimmungsprotokoll vs. Löschpflicht Art. 17 – Pseudonymisierung? | DSE 5; ZUSTIMMUNG | ✖ |
| P-15 | B | EU | Art. 50 KI-VO: Geltungsbeginn (02.08.2026 laut Experten) und Pflichten für Assistent und KI-Exposé-Entwürfe; KI-Kompetenz Art. 4 | DSE 8; NB § 14 | ✖ |
| P-16 | A* | alle | Vertragspartner bei Anthropic für EU-Kunden, Anschrift, AV-Vertrag (DPA). *Blocker nur bei Aktivierung des KI-Modus | DSE 8 | ✖ |
| P-17 | A* | alle | Drittlandgrundlage KI: Laut Sekundärquelle **keine** DPF-Zertifizierung, DPA mit SCC. DPF-Liste und DPA am Original prüfen; TIA | DSE 8; CH C3 | ◐ (companyscope.io, Abruf 03.10.2026) |
| P-18 | B | alle | Rechtsgrundlage KI-Triage von Anfragen durch das Backoffice (lit. f? Einwilligung?) – bis Klärung abgeschaltet | DSE 8 | ✖ |
| P-19 | B | alle | Online-Identifizierung: Rolle des Anbieters, Biometrie-Einwilligung (Art. 9), Drittland | DSE 9, 14 | ✖ |
| P-20 | A | AT/DE | Rückruf zur eigenen Anfrage auf lit. b ohne Einwilligung – vereinbar mit § 174 TKG 2021 (AT) und § 7 UWG (DE)? | DSE 4 | ✔ § 174 TKG; ✖ Auslegung |
| P-21 | B | alle | Interessenabwägung Grundbuch-Akquise (lit. f) je Land dokumentiert? | DSE 10 | ✖ |
| P-22 | B | EU/CH | Google Analytics: DPF-Status Google LLC am Freigabetag; Rolle Google (AV oder eigene Verantwortung); Masterplan E12 (Matomo) | DSE 13, 14 | ✖ |
| P-23 | C | alle | Speicherfrist 3 Jahre für Anfragen ohne Vertrag begründbar? | DSE 15 | ✖ |
| P-24 | B | alle | Fristen und Umfang der Zustimmungs- und Einwilligungsnachweise (ohne Telefonwerbung DE); IP voll oder gekürzt; serverseitiger Cookie-Nachweis nötig? | DSE 15; ZUSTIMMUNG | ✖ |
| P-25 | C | alle | Aufbewahrungsfristen BAO/UGB, AO/HGB, OR – Geltung für die AT-Gesellschaft gegenüber DE/CH-Partnern | DSE 15 | ✖ |

## Datenschutz – Länderteile

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-30 | B | DE/AT | Gerätekennung `oi_geraet` (400 Tage, Erkennung neuer Geräte) „unbedingt erforderlich“ (§ 25 Abs. 2 Nr. 2 TDDDG, § 165 Abs. 3 TKG 2021)? | DE D1; AT A1 | ✔ Normen |
| P-31 | B | DE | B2B-Telefonwerbung mit mutmaßlicher Einwilligung nutzen? (Empfehlung Team: nein) | DE D2 | ✖ § 7 UWG |
| P-32 | C | DE/AT | Bestandskundenausnahme für Werbe-E-Mails (§ 7 Abs. 3 UWG; § 174 TKG 2021) nutzen? | DE D2; AT A2 | ✔ § 174 TKG |
| P-33 | B | DE | § 43a GBV: Praxis der Grundbuchämter, Nachweis je Abfrage | DE D3 | ✔ Wortlaut |
| P-34 | C | DE | BDSG anwendbar auf AT-Verantwortlichen ohne DE-Niederlassung? | DE D4 | ✖ |
| P-35 | B | AT | DSB-Linie zur Direktansprache aus dem Grundbuch | AT A3 | ✖ |
| P-40 | **A** | CH | revDSG-Wortlaut (Art. 19, 25, 28; Auswirkungsprinzip) – Fedlex war nicht abrufbar | CH C1–C7 | ◐ (dsg.ch, EDÖB) |
| P-41 | B | CH | Bekanntgabe ins Ausland (Art. 16 DSG, Anhang 1 DSV): Staatenliste; Swiss-US DPF (wirksam seit 15.09.2024) und Zertifizierung der Empfänger | CH C3 | ◐ |
| P-42 | B | CH | Art. 45c FMG (Cookies: Information + Ablehnungsmöglichkeit) | CH C4 | ◐ |
| P-43 | B | CH | UWG-CH Art. 3 Abs. 1 lit. o (Massenwerbung) und lit. u (Sterneintrag) | CH C5 | ✖ |
| P-44 | B | CH | Grundbuchauskunft Art. 970 ZGB und kantonale Regeln für Direktansprache | CH C6 | ✖ |
| P-45 | B | CH | Vertretung nach Art. 14 DSG nötig? (kumulativ: Angebot in CH, umfangreich, regelmäßig, hohes Risiko) | CH C8 | ✔ EDÖB-Seite |
| P-46 | B | CH | Verhältnis zur Ökovolt Schweiz AG (E14) – Empfängerin, Mitverantwortliche, Klarstellung nötig? | CH C8 | ✖ |

## Nutzungsbedingungen

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-50 | B | alle | Einordnung Landwirte als Unternehmer | NB § 1 | ✖ |
| P-51 | B | DE/AT | Leistungsänderungsvorbehalt gegenüber Verbrauchern (§ 308 Nr. 4 BGB; § 6 Abs. 2 Z 3 KSchG) | NB § 2 | ✖ |
| P-52 | B | EU | Platform-to-Business-VO (EU) 2019/1150: anwendbar auf Projektanbieter/Versorger? Begründung von Sperren, Ranking-Transparenz, Fristen | NB §§ 3, 6, 19; LF § 7 | ✖ |
| P-53 | A | alle | Tipping-off bei Sperre wegen Geldwäscheverdacht – Formulierung der Mitteilung | NB § 9 | ✖ |
| P-54 | B | DE/AT | Beweisregel bei e-Signatur (live: „gilt als abgegeben, sofern nicht …“) gegenüber Verbrauchern unzulässig? B2B wieder aufnehmen? | NB § 10 | ✖ |
| P-55 | **A** | alle | Genossenschaft „in Vorbereitung“: Prospekt-/Aufsichtsrecht auch für Vormerkungen (KMG/AltFG; VermAnlG; FIDLEG) | NB § 13 | ✖ |
| P-56 | **A** | alle | Aufsichtsrechtliche Einordnung der Projektbörse (Anlage-/Wertpapiervermittlung): AT WAG 2018/AltFG/KMG; DE KWG/WpIG/§ 34c, § 34f GewO; CH FIDLEG/FINIG – **Gutachten je Land** | NB § 15; BB-PB | ✖ |
| P-57 | B | alle | Haftungshöchstbetrag B2B bei leichter Fahrlässigkeit (Betrag) | NB § 16; BB-EB § 8 | – |
| P-58 | **A** | alle | Neufassung Haftung AGB-fest? (DE §§ 307, 309 Nr. 7 BGB; AT § 6 Abs. 1 Z 9 KSchG, § 879 Abs. 3 ABGB; CH Art. 100 OR, Art. 8 UWG) | NB § 16; AT-3 | ✖ |
| P-59 | B | EU | Digital Services Act: Melde- und Abhilfeverfahren, Begründung (Art. 16, 17 DSA) für Nutzerinhalte | NB § 18 | ✖ |
| P-60 | **A** | alle | Umgehungsschutz: Dauer 24 Monate; Bindung des Investors ohne eigene Provisionsvereinbarung; Schadenersatz | NB § 17; BB-PB § 5 | ✖ |
| P-61 | C | EU | Kündigungsfrist gegenüber gewerblichen Nutzern (P2B-VO 30 Tage?) | NB § 19 | ✖ |
| P-62 | B | EU | Mitteilungsfrist für Änderungen B2B (P2B-VO mind. 15 Tage?) | NB § 20 | ✖ |
| P-63 | **A** | DE/AT | Änderungsklausel: Zustimmungsfiktion nur noch B2B, Verbraucher aktiv (DE BGH XI ZR 26/20; AT § 6 Abs. 1 Z 2 KSchG) – tragfähig? | NB § 20 | ✖ |
| P-64 | C | alle | Salvatorische Klausel/Ersetzungsklausel je Zielgruppe | NB § 22; DE-4; AT-4 | ✖ |
| P-70 | B | DE | Rechtswahl österreichisches Recht für DE-Kunden sinnvoll? | DE-1 | ✖ |
| P-71 | **A** | AT/DE/CH | Gerichtsstand konkret benennen (BG Braunau am Inn / LG Ried im Innkreis?) | DE-2; AT-2; CH-2 | ✖ |
| P-72 | **A** | DE/AT | Widerrufs-/Rücktrittsrecht bei kostenfreier Registrierung von Verbrauchern (Daten als Gegenleistung); Widerrufsfunktion (RL (EU) 2023/2673, DE § 356a BGB ab 19.06.2026 laut Experten) | DE-3; AT-3 | ✖ |
| P-73 | C | DE | Kündigungsschaltfläche § 312k BGB nötig? | DE-3 | ✖ |
| P-74 | B | DE/AT | Verbraucherschlichtung: Informationspflicht § 36 VSBG / AStG; Wegfall OS-Plattform-Hinweis (VO (EU) 2024/3228) – Datum | DE-3; AT-3 | ✖ |
| P-75 | C | AT | § 14 KSchG Gerichtsstand | AT-2 | ✖ |
| P-76 | **A** | CH | Rechtswahl gegenüber CH-Konsumenten (Art. 120 IPRG) | CH-1 | ✖ |
| P-77 | B | CH | Gerichtsstandsvereinbarung nach Art. 23 LugÜ, Form | CH-2 | ✖ |
| P-78 | B | CH | Art. 8 UWG-CH (missbräuchliche AGB), Art. 100 OR | CH-3 | ✖ |
| P-79 | C | CH | Preisbekanntgabeverordnung bei entgeltlichen Leistungen | CH-4 | ✖ |

## Besondere Bedingungen

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-80 | **A** | alle | Doppeltätigkeit/Interessenkonflikt (AT MaklerG; DE § 654 BGB; CH Art. 415 OR); eigene Projekte der Gruppe | BB-PB § 1 | ✖ |
| P-81 | B | alle | Entstehen der Provision: Signing oder Closing; Rücktritt; aufschiebende Bedingungen | BB-PB § 3 | ✖ |
| P-82 | B | alle | Nachweisfiktion bei versäumter Vorkenntnis-Mitteilung (live) – im Entwurf entschärft; zulässig? | BB-PB § 4 | ✖ |
| P-83 | B | alle | Vertragsstrafe ja/nein, Höhe, Mäßigung (AT § 1336 ABGB; DE §§ 343, 348 HGB; CH Art. 163 OR) | BB-PB § 5 | ✖ |
| P-84 | B | alle | Exklusivität/Alleinvermittlung (AT §§ 14, 15 MaklerG; CH Art. 412 ff. OR) | BB-PB § 6 | ✖ |
| P-85 | **A** | alle | Gewerbe-/Registrierungspflicht Energiebeschaffung (Energieberater/-vermittler); energierechtliche Vermittlerpflichten | BB-EB § 1 | ✖ |
| P-86 | C | alle | Fristüberwachung als wesentliche Pflicht – Haftungsfolge | BB-EB § 8 | ✖ |
| P-87 | B | alle | Vergaberecht: Normen; ist die Beauftragung von ÖkoInvest durch Kommunen selbst vergabepflichtig? | BB-EB § 9 | ✖ |
| P-88 | C | CH | CH-Strommarktzugang (Schwelle 100 MWh, Stand Marktöffnung) | BB-EB Länder | ✖ |
| P-89 | B | alle | Kartellrecht: Direktansprache-Verbot für Versorger (Dauer) und Informationsaustausch in Folgerunden | BB-LF §§ 5, 6 | ✖ |
| P-90 | B | alle | Übermittlung von Eigentümerdaten an Banken (Grundlage, Art.-14-Information) | BB-BK § 5 | ✖ |
| P-91 | C | alle | Rechtswahl und Gerichtsstand für Banken | BB-BK § 9 | ✖ |

## Hinweisgebersystem

| ID | Prio | Land | Frage | Fundstelle | Q |
|---|---|---|---|---|---|
| P-100 | B | DE/AT | Persönlicher Anwendungsbereich; Öffnung für Externe (Landwirte, Gemeinden, Investoren) | HG | ✖ |
| P-101 | B | DE/AT | Sachlicher Anwendungsbereich, Beispielliste | HG | ✖ |
| P-102 | B | AT | Paragraf der Rückmeldefrist (3 Monate) für interne Stellen im HSchG | HG | ◐ (§ 9 Abs. 1 Eingang ✔; Rückmeldung laut Abruf §§ 13 Abs. 9/17 Abs. 6 betrifft externe Stellen) |
| P-103 | B | DE/AT | Repressalienschutz, Beweislastumkehr (DE § 36 HinSchG), Falschmeldung | HG | ✖ |
| P-104 | B | DE/AT | Externe Stellen: § 22 HinSchG (Bundeskartellamt), Links BfJ/BAK, vollständige Liste § 15 Abs. 2 HSchG | HG | ◐ (§§ 19, 21 HinSchG ✔; § 15 HSchG ✔ Zusammenfassung) |
| P-105 | B | CH | Rechtslage Whistleblowing CH, zuständige Stellen, Aufbewahrungsfrist per Richtlinie | HG; HG-DS | ✖ |
| P-106 | **A** | alle | Pflicht je Gesellschaft (≥ 50 Beschäftigte: DE § 12 HinSchG ✔, AT § 11 HSchG ✔); Konzernlösung (DE § 14 HinSchG; AT); gemeinsame Verantwortung beim Kanal | HG; HG-DS | ◐ |
| P-107 | B | alle | Rechtsgrundlagen Datenverarbeitung im Kanal (§ 10 HinSchG; HSchG; revDSG); DSFA | HG-DS | ✖ |
| P-108 | B | alle | Einschränkung Art. 14/15 DSGVO gegenüber gemeldeten Personen | HG-DS | ✖ |

## Nicht-juristische Entscheidungen des Inhabers (aus den Platzhaltern)

Hosting-, Mail-, Backup-, ERP-Betreiber, Video-, Identitäts-, Auskunftei-, Verrechnungsstellen-Anbieter (je mit AV-Vertrag); Speicherfristen
(Server-Logs, KI-Protokoll, Bonität, Messdaten, GA4-Aufbewahrung); Partnerliste für die Weitergabe-Einwilligung; Datenschutz-Postfach;
Käuferprovision ausgeschlossen?; Bemessung Share Deal; Fälligkeit; Vertragsstrafe; Exklusivitätsdauer; Vergütungsmodell Energiebeschaffung;
Versorgerprovisionen; Laufzeit Servicevertrag; Vertraulichkeitsdauer Banken; Hinweisgeber-Anbieter, Ombudsperson, Gesellschaftsliste und
Beschäftigtenzahlen; Teilnahme an Verbraucherschlichtung; Registrierung bis zur Freigabe nur auf Staging?
