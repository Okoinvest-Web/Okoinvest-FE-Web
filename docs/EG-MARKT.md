# Marktanalyse Software für Energiegemeinschaften (AT, mit Blick auf DE/CH)

Rechercheteam A „Markt“, Stand 01.10.2026. Grundlage sind ausschließlich öffentliche Quellen (Websites der Anbieter, Koordinationsstelle, Netzbetreiber, Presse). Jede Aussage hat eine Quelle. **„zu bestätigen“** bedeutet: Quelle widersprüchlich, veraltet, nur indirekt oder nicht eindeutig. „nicht gefunden“ in der Matrix heißt *in öffentlichen Quellen nicht belegt*, nicht „gibt es sicher nicht“.

Begriffe: **EEG** Erneuerbare-Energie-Gemeinschaft (lokal/regional), **BEG** Bürgerenergiegemeinschaft (österreichweit), **GEA** Gemeinschaftliche Erzeugungsanlage (Haus/Sammelschiene), **P2P** Peer-to-Peer-Vertrag (neu im ElWG), **ZP** Zählpunkt, **TNF** Teilnahmefaktor, **EDA** Energiewirtschaftlicher Datenaustausch.

---

## 0. Kurzfazit (für Eilige)

1. **Der Markt ist groß, jung und gerade im Umbruch.** Über 6.500 Energiegemeinschaften in AT (dazu ca. 5.000 GEA), Verfünffachung der EEG in zwei Jahren. Am **01.10.2026** (heute) tritt das **ElWG** für die gemeinsame Energienutzung in Kraft: P2P-Verträge, neue Nahebereiche, Lieferantenpflichten ab Schwellenwerten, 10 %-Quote für schutzbedürftige Haushalte bei Gemeinden, neue Netzentgelt-Rabatte erst ab 01.01.2027. Alle bestehenden Gemeinschaften müssen Verträge anpassen. **Das ist das Wechselfenster.**
2. **Software ist zur Commodity geworden.** Rund ein Dutzend Plattformen machen „Mitglieder + EDA + Abrechnung + Portal“. Der Preisanker liegt bei **1–2 ct/kWh** oder **ca. 1,90–3 € je ZP und Monat**. Die Open-Source-Lösung EEG Faktura kostet **24–60 €/Jahr**. Gegen Preis gewinnt man nicht.
3. **energiedigital** (Graz, ca. 160 EGs, 1/1,5/2 ct/kWh, Smart Meter Reader, Marktplatz stromplatz.at, P2P, seit 06/2026 mit 50 % Investor aus Abu Dhabi) ist ein solider All-in-One-Anbieter. Er ist **nicht** Marktführer nach Menge: EGON (über 250 EGs, über 25.000 Mitglieder), energyfamily (ca. 330 EGs), enixi (276 EGs) und EEG Faktura (über 65.000 ZP) sind größer.
4. **Die echten Schmerzpunkte liegen nicht in der Rechnung, sondern im Drumherum:** Datenlücken und Verzögerungen bei den Netzbetreibern, abgelehnte Zustimmungen, Ehrenamts-Überlastung (dokumentiert: ca. 1.000 Std./Jahr in einer EEG), USt-Komplexität (Kleinunternehmer, Reverse Charge, Landwirte, Gemeinden), Mehrfachteilnahme mit TNF, Vereinsführung (GV, Beiträge, Protokolle), Massenänderungen, Wechsel zwischen Plattformen, Kommunikation mit Mitgliedern. Dazu kommt das ElWG-Neuland.
5. **Differenzierung für ÖkoInvest:** (a) Gründung als Dienstleistung plus Software aus einer Hand, (b) „Betriebssystem der Gemeinschaft“ statt Abrechnungstool: Vereinsführung, GV, Beschlüsse, Kassa, Förderungen, Anlagenprojekte (Kerngeschäft PV/Speicher), (c) **Datenqualitäts-Leitstand** mit automatischer Reklamation beim Netzbetreiber, (d) **USt-/Steuer-Engine** mit Prüfprotokoll, (e) **ElWG-fähig ab Tag 1**: P2P, Mehrfachteilnahme-Optimierer, Lieferantenpflichten, Sozialquote, (f) **Wechselgarantie** mit Parallel- und Kontrollabrechnung, (g) Investitions-Brücke: Gemeinschaft finanziert eigene Anlagen über die Projektbörse und Bürgerbeteiligung.

---

## 1. Marktüberblick mit Zahlen

### 1.1 Anzahl Energiegemeinschaften in Österreich

| Stichtag | Zahl | Quelle |
|---|---|---|
| Mitte 2023 | 364 Energiegemeinschaften | E-Control EAG-Monitoringbericht 2025, zitiert von [Wiener Stadtwerke](https://positionen.wienerstadtwerke.at/aktuelles/eag-monitoringbericht-2025) |
| Feb. 2024 | ca. 1.170 EEG | [elektronik-zeit.de](https://elektronik-zeit.de/grafik/energiegemeinschaften-oesterreich-wachstum/), [Steiermark Wirtschaft](https://steiermark-wirtschaft.at/energiedigital-graz-energiegemeinschaften-investment/) |
| Mitte/Juli 2025 | 3.868 EEG; NÖ 958, OÖ 790; über 3.500 GEA | [Wiener Stadtwerke Wissenshub](https://positionen.wienerstadtwerke.at/wissenshub/grafiken/anzahl-energiegemeinschaften-in-oesterreich) |
| Ende 2025 | 5.590 EEG, ca. 1.000 BEG, ca. 5.000 GEA, also **über 11.500 Gemeinschaften inkl. GEA** | [elektronik-zeit.de](https://elektronik-zeit.de/grafik/energiegemeinschaften-oesterreich-wachstum/), [Suchtreffer energiegemeinschaften.gv.at / smartmeter-portal.at](https://www.smartmeter-portal.at/energiegemeinschaften/eeg/) (zu bestätigen: Zählweise EEG vs. „Energiegemeinschaften“ unterschiedlich) |
| Mai 2026 | „über 6.500 Energiegemeinschaften (EEG, BEG)“ plus ca. 5.000 GEA, über 500 BEG | Suchtreffer zu [gridbert.at](https://www.gridbert.at/energiegemeinschaft) und [erneuerbareenergiegemeinschaften.at](https://erneuerbareenergiegemeinschaften.at/) (zu bestätigen, Sekundärquelle) |

**Widerspruch:** Die Zahlen zu BEG reichen von „über 500“ bis „ca. 1.000“, je nach Quelle und Zählweise. Für Planung konservativ rechnen: **ca. 5.500–6.500 EEG, 500–1.000 BEG, 5.000 GEA.**

### 1.2 Teilnehmer und Zählpunkte

- Ende 2024 gab es 472.000 Smart Meter mit Opt-In, davon **ca. 119.000 bei Mitgliedern einer Energiegemeinschaft**. Das ist eine Vervierfachung zum Vorjahr ([E-Control Smart-Meter-Monitoring 2025](https://www.e-control.at/documents/1785851/1811582/20251020-Monitoringbericht-SM-2025.pdf/4ce4b22f-8149-5162-770a-83f132511199?t=1763621630772), Zusammenfassung über Suchtreffer).
- **Netz NÖ allein:** 1.412 EEG mit 82.646 Teilnehmern, 417 BEG mit 17.917 Teilnehmern, 307 GEA mit 1.473 Teilnehmern ([Netz NÖ, aktuelle Zahlen](https://www.netz-noe.at/Netz-Niederosterreich/Service/Erneuerbare-Energiegemeinschaften/Aktuelle-Zahlen-zu-Energiegemeinschaften.aspx); Stichtag auf der Seite nicht eindeutig, zu bestätigen).
- Daraus folgt eine **mittlere EEG-Größe von ca. 50–60 Teilnehmern** in NÖ. BEG sind ähnlich groß, aber mit stark gestreuter Verteilung: Es gibt einige sehr große Gemeinschaften (z. B. „BEG Kärnten“ mit über 1.000 ZP bei [energiedigital](https://www.energiedigital.at/)).
- **Hochrechnung (eigene Schätzung, zu bestätigen):** österreichweit **ca. 250.000–350.000 teilnehmende ZP** im Jahr 2026. Belegte Untergrenzen: 100.000 Teilnehmer in NÖ allein, 65.000 ZP bei EEG Faktura allein ([VFEEG](https://vfeeg.org/)).

### 1.3 Marktvolumen Software und Betrieb (eigene Schätzung)

| Annahme | Wert |
|---|---|
| teilnehmende ZP AT 2026 | 300.000 |
| Marktpreis Software je ZP und Jahr | 20–36 € (1,90–3 €/Monat, siehe Steckbriefe) |
| **Softwaremarkt AT** | **ca. 6–11 Mio. €/Jahr** |
| plus Betriebsführung/Gründung (Rundum-Pakete, Gründung 100–500 € je Gemeinschaft, z. B. [Wien Energie](https://www.wienenergie.at/business/energiegemeinschaften/)) | zusätzlich mehrere Mio. €/Jahr |

Der Software-Markt allein ist klein. Interessant wird er durch **Betriebsführung** (Mehrwertdienst), durch **Anlagengeschäft** (PV, Speicher, Ladeinfrastruktur für die Gemeinschaft) und durch **Energiehandel/Reststrom** (Kerngeschäft der ÖKOVOLT-Gruppe und ÖkoInvest).

### 1.4 Wirtschaftlicher Hebel für Mitglieder

- Netzentgelt-Reduktion auf den Arbeitspreis des Netznutzungsentgelts: **bis 57 % lokal, 28 % regional** (bis 30.09.2026 nach SNE-VO 2018). BEG und österreichweit: keine Reduktion ([Koordinationsstelle FAQ](https://energiegemeinschaften.gv.at/faqs/), [energiemagazin.at](https://www.energiemagazin.at/energiegemeinschaften-in-osterreich/)). Wien Energie nennt „bis 46 %“ regional ([Wien Energie Business](https://www.wienenergie.at/business/energiegemeinschaften/)), zu bestätigen.
- **Elektrizitätsabgabe** (1,5 ct/kWh) entfällt für Strom aus EEG ([FAQ](https://energiegemeinschaften.gv.at/faqs/)).
- Realistische Ersparnis je Haushalt: **50–200 €/Jahr** ([neoom KLUUB](https://neoom.com/KLUUB_energiegemeinschaften)), Beispiel Wien mit 1.200 kWh: **ca. 57 € brutto/Jahr** ([stromliste.at](https://stromliste.at/aktuelles/energiegemeinschaft-neue-regeln-oktober-2026)), neoom-Beispiel 74 €/Jahr ([neoom Blog](https://neoom.com/blog/kluub-ergebnis)).
- **Folge:** Die Ersparnis je Mitglied ist klein. Software- und Verwaltungskosten fressen davon schnell 25–60 €/Jahr. Darum ist **Preis je Mitglied sichtbar**, und darum wird **Nutzen jenseits der Netzersparnis** entscheidend: Gemeinschaftsgefühl, Transparenz, eigene Anlagen, Speicher, E-Mobilität, Flexibilität.
- Typische interne Energiepreise: Bezug **9–14 ct/kWh** (neoom), 9,9–11 ct/kWh (EGON-Gemeinschaften), Einspeisung **7–8 ct/kWh** ([EGON-Gemeinschaftsseiten](https://app.egon.energy/viendorf), [app.egon.energy/sonne-wind-eeg](https://app.egon.energy/sonne-wind-eeg)), Wien Energie 12 ct/kWh netto ([Wien Energie Village im Dritten](https://energiegemeinschaften.wienenergie.at/village-im-dritten)).

### 1.5 Regulatorischer Umbruch: ElWG ab 01.10.2026

Quelle, wenn nicht anders angegeben: [Koordinationsstelle, FAQs zum ElWG](https://energiegemeinschaften.gv.at/faqs-zum-elwg/).

| Thema | Inhalt | Bedeutung für Software |
|---|---|---|
| Inkrafttreten | 01.10.2026; bestehende GEA/EEG/BEG werden **überführt, keine Neugründung**, aber **Verträge sollen angepasst werden**. Alte ElWOG-Muster laufen am 30.09.2026 aus ([Downloadbereich](https://energiegemeinschaften.gv.at/downloadbereich/)). | Vertrags-Neuausrollung an alle Mitglieder (digitale Zustimmung, Versionierung). **Wechselanlass.** |
| Start neuer Modelle | ab 05.10.2026 innerhalb eines Netzgebiets, österreichweit voraussichtlich ab **April 2027** | Roadmap-Fenster: Bis April 2027 muss netzgebietsübergreifend alles laufen. |
| Nahebereiche | Standort (Sammelschiene), Lokal (NE7), Regional (NE5 ohne Umspannung), Österreichweit | Zuordnung der ZP zu Nahebereich, je Bereich eigener Netzrabatt |
| **P2P-Verträge** (§ 68) | Direkter Stromverkauf/-schenkung zwischen Personen, **ohne Rechtsform** | Neues Massensegment (Familie, Nachbarn, Betrieb an Mitarbeiter). energiedigital, EG Control, BillWise, smartCOMMUNITY positionieren sich bereits. |
| **Organisator** (§ 68 Abs. 2) | Kann im Namen aktiver Kunden Lieferverträge schließen | Rolle „ÖkoInvest als Organisator“ möglich (Geschäftsmodell) |
| **Mehrfachteilnahme** | Gleichzeitig in P2P, EEG, BEG, GEA. Seit 08.04.2024 bis zu **5 Gemeinschaften**, TNF in ganzen Prozent, Summe max. 100 %, Kaskade nach Rang, Änderung täglich möglich ([trendingtopics](https://www.trendingtopics.eu/mehrfachteilnahme-jetzt-kann-man-bei-bis-zu-5-energiegemeinschaften-mitmachen/), Suchtreffer [ebutilities Konsultation](https://www.ebutilities.at/konsultationen/50)). Ob die Grenze von 5 im ElWG bleibt: zu bestätigen. | TNF-Verwaltung, Prioritäten, **Optimierer** über Gemeinschaften hinweg |
| **Lieferantenpflichten** (§ 69) | ab Erzeugung über 30 kW (Haushalt) bzw. über 100 kW (andere) an gemeinsamer Nutzung: AGB/Lieferbedingungen, Informationsblatt, transparente Rechnung, Tarifänderung mind. 1 Monat vorher, Rechnung kostenfrei, mind. jährlich, **Wahlrecht Monatsrechnung** | Rechnungslayout nach Pflichtinhalten, Fristen-Automatik, Dokumentenvorlagen |
| **Sozialquote** (§ 68 Abs. 6) | Gebietskörperschaften müssen schutzbedürftigen Haushalten Zugang sichern, **mind. 10 % der erzeugten Menge** | Gemeinde-Modul: Nachweis, Kontingent, Tarif für vulnerable Kunden |
| Große Unternehmen | nur in BEG, Leistungsgrenze je ZP 6 MW | Validierung bei Beitritt |
| Netzentgelt | neue SNE-VO ab **01.01.2027**; **Okt.–Dez. 2026 keine reduzierten Netzentgelte** möglich (Übergangslücke). PV über 30 kW bei Haushalten: Versorgungsinfrastrukturbeitrag | Mitgliederkommunikation („Warum diesmal kein Rabatt?“), Ersparnisrechner mit Stichtagen |
| Speicher | Messkonzepte (§ 111) sollen Stromherkünfte trennen; Gemeinschaftsspeicher mit externem Laden angestrebt; Rückspeicherung über OeMAG nicht vorgesehen | Speicher-Bilanzierung als Zukunftsmodul |

### 1.6 Prozessrahmen (gilt für alle Anbieter)

- **EDA** ist die Pflicht-Schnittstelle zwischen Gemeinschaft und Netzbetreiber. Das **EDA-Anwenderportal ist bis 100 ZP kostenlos**, kann aber keine Rechnungen ([trendingtopics/EDA](https://www.trendingtopics.eu/mehrfachteilnahme-jetzt-kann-man-bei-bis-zu-5-energiegemeinschaften-mitmachen/), [EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html)). Größere Anbieter haben eigene Anbindung (z. B. PONTON, EG Control „eigene KEP-Schnittstelle“, [egcontrol.at](https://egcontrol.at/)).
- **Online-Beitritt (EC_REQ_ONL):** Das Mitglied muss **binnen 10 Werktagen** im **Smart-Meter-Portal des Netzbetreibers** zustimmen, sonst wird der Antrag abgelehnt ([eda.at Infoveranstaltung](https://www.eda.at/pdf/20221214informationsveranstaltunganwenderportalfragen.pdf), [Feistritzwerke FAQ](https://www.feistritzwerke.at/faq/f5653/)). Jeder Netzbetreiber hat ein eigenes Portal. Darum veröffentlichen Anbieter Anleitungen je Netzbetreiber ([energyfamily Wiener Netze](https://www.energyfamily.at/anleitung-datenfreigabe-wienernetze), [energyfamily Netz OÖ](https://www.energyfamily.at/anleitung-datenfreigabe-netzober%C3%B6sterreich), [EGON-PDF](https://www.e-gon.at/wp-content/uploads/Datenfreigabe.pdf)).
- Voraussetzung ist ein **Smart Meter mit Opt-In / 15-Minuten-Werten (IME)** ([FAQ](https://energiegemeinschaften.gv.at/faqs/)).
- Belastbare Daten kommen nach Freigabe erst nach **bis zu 14 Tagen, bei Smart-Meter-Umstellung bis 28 Tage** ([EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html)).
- **Verteilschlüssel:** statisch (fixer Anteil) oder dynamisch (nach Verbrauch). Die Verteilung rechnet der **Netzbetreiber**, die Gemeinschaft rechnet nur intern ab ([FAQ](https://energiegemeinschaften.gv.at/faqs/), [Netz NÖ](https://www.netz-noe.at/Netz-Niederosterreich/Service/Erneuerbare-Energiegemeinschaften/Aktuelle-Zahlen-zu-Energiegemeinschaften.aspx)).
- **Rechtsform:** Verein, Genossenschaft, GmbH, AG u. a.; mindestens 2 Mitglieder ([FAQ](https://energiegemeinschaften.gv.at/faqs/)). Meldung ans Finanzamt binnen 1 Monat nach Vereinsgründung (Suchtreffer [Koordinationsstelle Steuern](https://energiegemeinschaften.gv.at/steuern-und-abgaben-in-energiegemeinschaften/), zu bestätigen).
- **Umsatzsteuer:** Kleinunternehmer bis **55.000 € brutto** Jahresumsatz (ohne Vorsteuerabzug, Option zur Regelbesteuerung 5 Jahre bindend); bei Regelbesteuerung 20 % USt; bei Stromlieferung **an** die Gemeinschaft (Wiederverkäufer) grundsätzlich **Übergang der Steuerschuld (Reverse Charge)**; Voranmeldung quartalsweise bis 100.000 €, darüber monatlich ([Koordinationsstelle Steuern](https://energiegemeinschaften.gv.at/steuern-und-abgaben-in-energiegemeinschaften/)). Sonderfälle **pauschalierte Landwirte** und **Gemeinden (BgA)** behandelt der Ratgeber ([EEG-Ratgeber Steuern & Abgaben 2026](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2023/05/EEG-Ratgeber-Steuern-Abgaben-2026.pdf), [Factsheet USt](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2024/02/EEG-Factsheet-Enegriegemeinschaften-und-Umsatzsteuer.pdf); Einzelheiten zu bestätigen, Steuerberater einbinden). Die Koordinationsstelle bietet **Beispielrechnungen und Gutschriften** an ([Download](https://energiegemeinschaften.gv.at/downloads/beispielrechnungen-und-gutschriften-fuer-erneuerbare-energie-gemeinschaften/)).

### 1.7 Angebot der Koordinationsstelle (energiegemeinschaften.gv.at)

Keine Betriebssoftware. Sie bietet aber Material, das ÖkoInvest einbauen und digitalisieren sollte:

- **Benefit-Tool** (Online-Simulation für EEG, BEG, Eigenversorgung, P2P), Excel-Rechner PV und PV + Speicher ([Tools](https://energiegemeinschaften.gv.at/tools/)).
- **Musterstatuten EEG/BEG**, **Leitfaden Vereinsstatuten**, **GEA-Musterverträge**, **P2P-Vertragsmuster**, **Muster Allgemeine Lieferbedingungen**, Ratgeber Steuern (Jan. 2026), Ratgeber Rechtsformen, Leitfäden für Gemeinden, Betriebe und Haushalte, Infografiken, Speicher-Doku, Beispielrechnungen ([Downloadbereich](https://energiegemeinschaften.gv.at/downloadbereich/), [Vereinsstatuten EEG](https://energiegemeinschaften.gv.at/downloads/vorschlag-fuer-vereinsstatuten-erneuerbare-energie-gemeinschaft/), [Leitfaden](https://energiegemeinschaften.gv.at/downloads/leitfaden-vereinsstatut-eeg/), [Ratgeber Rechtsformen](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2023/01/Ratgeber-Rechtsformen-Erneuerbare-Energie-Gemeinschaften.pdf)).
- **Dienstleisterliste** mit 61 Anbietern, die sich zum „Kodex für Dienstleister“ bekennen ([Dienstleister in Österreich](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/)). **ÖkoInvest sollte sich dort eintragen.**

---

## 2. Wettbewerber-Steckbriefe

Gruppierung: (A) unabhängige Software-Plattformen, (B) Energieversorger-Angebote, (C) Marktplatz-/P2P-Modelle, (D) Open Source und Nischen, (E) DE/CH.

### A. Unabhängige Plattformen

#### A1. energiedigital (ed-energiedigital GmbH, Graz) – Hauptwettbewerber laut Auftrag
- **Firma:** gegründet 2022 von Martin Moser, Andreas Zobl, Stefano Coss; 10 Mitarbeiter, bis Ende 2026 geplant 20. Seed-Runde (siebenstellig) im **Juni 2026** von JS North Asia Investments (JS Group, Abu Dhabi), der Investor hält **50 %**. Expansion nach ES/FR/UK, Series A in 2 Jahren geplant ([Steiermark Wirtschaft](https://steiermark-wirtschaft.at/energiedigital-graz-energiegemeinschaften-investment/)).
- **Kunden:** „156 Energiegemeinschaften“ auf der Website ([energiedigital.at](https://www.energiedigital.at/)), 160 laut Presse (von 20 im April 2023) ([Steiermark Wirtschaft](https://steiermark-wirtschaft.at/energiedigital-graz-energiegemeinschaften-investment/)). Referenzen: BEG Kärnten (über 1.000 ZP), EG Hart, EEG Murauer GreenPower, EG Finkenstein. White-Label-Instanzen für Regionen, z. B. [drautal.energiedigital.at](http://www.drautal.energiedigital.at/).
- **Funktionen** ([Energiegemeinschaften-Seite](http://www.energiedigital.at/energiegemeinschaften), [Startseite](https://www.energiedigital.at/)):
  - Gründung digital, Schritt-für-Schritt, GEA/EEG/BEG
  - „100 % digitalisierter Onboardingprozess für neue User und Zählpunkte“
  - automatisierter Datenaustausch mit Netzbetreibern **inkl. Datennachforderung**, Datenvalidierung
  - Abrechnung „per Klick“, Tarifgruppen, frei wählbare Abrechnungszeiträume (monatlich/quartalsweise), PDF-Rechnungen per E-Mail, **SEPA-Lastschrift**
  - Mitgliederportal mit Visualisierung, Rechnungsübersicht
  - Datenimport aus Vorsystemen (Migration)
  - Marktplatz **stromplatz.at** (Sichtbarkeit für neue Mitglieder/Erzeuger; „über 107 Gemeinschaften“), Seite „Strom verkaufen“ für Erzeuger, Verkauf an mehrere Gemeinschaften gleichzeitig ([stromverkaufen](https://www.energiedigital.at/stromverkaufen))
  - **P2P** nach ElWG: „P2P-Verträge einrichten in 5 min“, nationaler Marktplatz, 15-min-Zuordnung, Gutschriften, energiedigital als Organisator ([p2p](https://www.energiedigital.at/p2p))
  - **EnergyPlanner** (kostenloser Planungsrechner) (Suchtreffer [LinkedIn/greenstart](https://greenstart.at/projekt/energiedigital/))
  - **Smart Meter Reader** (LTE-M, 1-Minuten-Werte, P1/M-Bus oder IR, REST-API, Vorbestellung, kein Preis veröffentlicht) ([livedaten](https://www.energiedigital.at/livedaten), [Datenblatt](https://api.app.energiedigital.at/api/live_data/download_product_info))
  - **Steuerung** von Warmwasserboiler, Wärmepumpe, Wallbox nach Angebot und Preis (GreenCharge) ([Steiermark Wirtschaft](https://steiermark-wirtschaft.at/energiedigital-graz-energiegemeinschaften-investment/), [gemeinschaffen-Blog](https://blog.gemeinschaffen.com/2024/05/29/eeg/))
- **Preise** (je kWh, die in der Gemeinschaft getauscht wird, netto): **Basic 1 ct** (Selbstverwaltung, nur Admin-Support), **Standard 1,5 ct** (EEG-Management durch energiedigital, kein Endkunden-Support), **Premium 2 ct** (zusätzlich Mitglieder-Support, IoT). Servicegebühren werden **jährlich im Voraus** verrechnet ([energiedigital.at](https://www.energiedigital.at/), [AGB](https://www.energiedigital.at/terms_of_service)). Für Erzeuger am Marktplatz kostenlos, die Gebühr wird intern verrechnet ([stromverkaufen](https://www.energiedigital.at/stromverkaufen)).
- **Schwächen/Angriffsflächen:**
  - AGB sehr anbieterfreundlich: **Haftung für Systemausfälle ausgeschlossen**, Mahnspesen **40 € je Mahnung**, Sperre und **Datenlöschung binnen 2 Wochen** bei Zahlungsverzug, 15 % Pönale bei unberechtigter Kündigung ([AGB, Stand 30.10.2025](https://www.energiedigital.at/terms_of_service)). Für Gemeinden und Vorstände ist das ein Risikoargument.
  - Eigentümerwechsel (50 % Auslandsinvestor) und Internationalisierung: Fokus könnte vom österreichischen Detail weggehen (Vermutung, zu bestätigen).
  - Keine öffentlich dokumentierte **Vereinsverwaltung** (GV, Beschlüsse, Mitgliedsbeiträge), **Buchhaltungsexport**, **Mahnwesen** für Mitglieder, **USt-Sonderfälle** (in öffentlichen Quellen nicht gefunden).
  - kWh-basierter Preis wird bei großen Erzeugern teuer (Gemeinde mit großer PV-Anlage).
  - Keine öffentlichen Kundenbewertungen gefunden.

#### A2. EGON (E.GON GmbH, NÖ)
- „Meistgenutzte Energy-Sharing-Plattform Europas“ mit **über 52.000 Nutzern** (Selbstangabe in der [Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/)), Website: **über 250 Gemeinschaften, über 25.000 Mitglieder** ([egon.energy](https://www.egon.energy/)). Die zwei Zahlen passen nicht zusammen, zu bestätigen.
- Funktionen: geführte Gründung, Einladung mit **E-Signatur**, monatliche automatische Abrechnung, Echtzeitdaten über **Smongle** und **Fronius**, eigene öffentliche Gemeinschafts-Landingpages (`app.egon.energy/<gemeinschaft>`) mit Tarifen und Beitritt ([egon.energy](https://www.egon.energy/), [Beispiel Viendorf](https://app.egon.energy/viendorf)).
- Partner: Energie Zukunft Niederösterreich (EZN, EVN-Umfeld) betreibt Gemeinschaften auf EGON ([Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/), [EZN](https://www.ezn.at/)).
- **Preis:** pro ZP und Monat, von Gemeinschaft weiterverrechnet: **1,90 €** (Viendorf), **3,00 € brutto** (Sonne-Wind-EEG), **3,12 € brutto** (Rosental), ca. 2 € (Maria Enzersdorf) ([Suchtreffer app.egon.energy](https://app.egon.energy/sonne-wind-eeg), [Rosental](https://app.egon.energy/rosental)). Der Plattformpreis selbst ist nicht veröffentlicht.
- Schwächen: kein öffentliches Preisblatt; Fokus NÖ (zu bestätigen).

#### A3. energyfamily GmbH (Amstetten)
- **ca. 330 Gemeinschaften** (über 350 laut Dienstleisterliste), ca. 15.000 Nutzer, über 23 Mio. kWh gehandelt ([energyfamily.at](https://www.energyfamily.at/), [Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/)).
- Gründungs-Checklisten, Verwaltung, automatische Abrechnung; GEA/EEG/BEG; gute Anleitungen je Netzbetreiber für die Datenfreigabe ([Wiener Netze](https://www.energyfamily.at/anleitung-datenfreigabe-wienernetze)); Ratgeber Rechtsform/Steuern ([rechtsformundsteuern](https://www.energyfamily.at/rechtsformundsteuern)); Regionalmarken wie „Einfach! Energiegemeinschaft Tirol“ ([Link](https://www.energyfamily.at/einfach-energiegemeinschaft-tirol)).
- **Preis** (Suchtreffer, zu bestätigen): Servicegebühr **2 ct/kWh bis 300.000 kWh, 1,5 ct bis 700.000, 1 ct darüber**; einmalig 25 €, 1 €/Monat Fixkosten; Energiepreise 7,00/9,90 ct netto ([Suchtreffer energyfamily Kosten](https://www.energyfamily.at/en/kosten-energiegemeinschaften), Seite zur Zeit 404).
- Förderungen von FFG, aws, Klimafonds.

#### A4. enixi GmbH (Villach)
- **276 Gemeinschaften, 13.842 Mitglieder, 52.397 MWh** ([enixi.io](https://enixi.io/)).
- Core-Plattform (Energiedaten, Validierung, Tariflogik, Abrechnung, Reporting), **White-Label** für Versorger/Dienstleister, **energyAPI**. Auch Mieterstrom/Gebäudemodelle.
- B2B2C-Anbieter: Er ist eher Technologielieferant hinter Versorgern als direkter Wettbewerber im Endkundenauftritt (Vermutung, zu bestätigen).
- Preise nicht veröffentlicht.

#### A5. EG Control (cyb cyber telekom gmbh, Guntramsdorf)
- **120 Gemeinschaften, 3.759 ZP** (Stand 13.09.2026) ([egcontrol.at](https://egcontrol.at/)).
- GEA, EEG, BEG, **P2P**; eigene **KEP-Schnittstelle** zum Netzbetreiber, tägliche 15-min-Daten, API, Statistiken, Rechnungen, **Zahlungsverwaltung**, **Buchhaltung und Steuer**.
- **Preise sehr transparent und paketiert:** Selbstverwaltet 0,13–0,83 €/ZP/Monat; Organisator 2 €/ZP + 25–100 € Grundgebühr; Complete 0,83 €/ZP + 4 €/Mitglied; **„Mehrfachteilnahme“-Paket** 0,83 €/ZP + 4 €/Mitglied + 1.000 € Grundgebühr (für mehrstufige Strukturen); **6 Monate gratis** für neue Gemeinschaften ([egcontrol.at](https://egcontrol.at/)). Bezugszeitraum „4 €/Mitglied“ (Monat oder Jahr) zu bestätigen.
- Stärke: einziger Anbieter mit eigenem Paket für Mehrfachteilnahme und mit Buchhaltung/Steuer als Leistung.

#### A6. BillWise GmbH
- Für **große** Gemeinschaften: über 5.000 ZP, über 20 Gemeinschaften, 13 Mio. kWh/Jahr, „100 % automatisiert“; EEG, BEG, GEA, **P2P & EV** (Eigenversorgung); **Speichersteuerung** ([billwise.at](https://billwise.at/)).
- **Preise:** GEA/P2P/EV 2,0 ct/kWh; EEG/BEG gestaffelt **1,2 / 1,0 / 0,7 ct/kWh** (bis 350.000 / bis 700.000 / darüber) ([billwise.at](https://billwise.at/)). Bietet zusätzlich Betreiberleistungen ([Suchtreffer Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/)).
- Zielgruppe: Gemeinden, Versorger, professionelle Betreiber.

#### A7. colibrie (a wattwise FlexCo)
- **Kostenlos bis 51 ZP** (Freemium), in 9 Bundesländern aktiv; Beispiele EEG Pulkaustrom (328 ZP in 6 Monaten), Ebergassing; 7+ GWh ([colibrie.eu](https://colibrie.eu/)).
- Schwerpunkt Wissen/Gründung/Wachstum; Monitoring, automatisierte Abrechnung.
- Gefahr für ÖkoInvest im Segment kleiner Gemeinschaften durch den Gratis-Einstieg.

#### A8. sonnnig
- Plattform plus selbst betriebene Gemeinschaften. **ZP-Status ehrlich sichtbar** (ausstehend/abgelehnt, Korrektur ohne Neustart), **EDA-Kommunikation direkt mit Status und Rückmeldung**, Mitglieder sehen **Solar-Prognose** („weniger Rückfragen“); **Wechselprozess:** keine Neuanmeldung der ZP, Stichtag zum Abrechnungsende, Kommunikationsvorlagen, **erste Abrechnung gemeinsam prüfen** ([sonnnig.at](https://www.sonnnig.at/energiegemeinschaften)). Preise auf eigener Seite (nicht abgerufen, zu bestätigen).

#### A9. EVA 2 (ratko)
- Mitglieder, ZP, Verträge, Rollen; **Datenqualität und Lücken**; Rechnungen, Gutschriften, **Steuern, Exportdateien**; Dokumente, **Mitgliederanfragen**, Kundenportal; Migration mit **Kontrollabrechnung vor Produktivstart** ([ratko.at/eva](https://ratko.at/eva/)).
- Preis: **390 €/Monat bis 100.000 kWh**, darüber gestaffelt (laut Abruf „0,29–0,39 je kWh“, vermutlich **ct**/kWh, zu bestätigen), keine ZP-Gebühr, alles inklusive.

#### A10. Weitere unabhängige Plattformen (Kurzprofil)
| Anbieter | Profil | Quelle |
|---|---|---|
| ekarus energyShare | Dashboard, automatische Abrechnung per Mail, **Export an k5 (Kommunal-Software) und BMD**, **SEPA-Datei**, revisionssichere Ablage; Gemeinschaften bis 200+ Teilnehmer | [ekarus.io](https://ekarus.io/) |
| Flexum Share (Conversio Gruppe) | eigene Preise je Mitglied, Monitoring, **Echtzeit-Speicherregelung**, Förder-/Behördenabwicklung | [flexum.at](https://flexum.at/), [Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/) |
| enerloop (CPCS GmbH) | EEG, BEG, GEA, P2P, Eigenversorgung: Mitglieder, Onboarding, Verträge, Tarife, Abrechnung, Dashboards | Suchtreffer [enerloop.at](https://www.enerloop.at/) |
| So-Strom (Graz) | So-Strom-Digital: Rechts-/Registrierungs-Support, Verträge, Abrechnung „steuersicher“, für Gemeinden, KMU, **Wohnbaugenossenschaften** | [so-strom.at](https://www.so-strom.at/) |
| Green Community Consulting (Graz) | Simulation, digitale Selbstregistrierung, tägliche Daten über Marktkommunikation, automatische Rechnung, **ERP-Anbindung**, Mieterstrom, dynamische Preise | [gccg.at](https://www.gccg.at/) |
| SmartEnergyManagement & Solutions | Abrechnung, Analyse, Optimierung, Teilnehmer, Logo je Gemeinschaft | [smart-energy-management.at](https://smart-energy-management.at/anzahl-von-energiegemeinschaften/) |
| connesso communities, z'ammstromen (e3 consult, Tirol) | regionale Plattform plus Beratung | [Dienstleisterliste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/) |

#### A11. neoom KLUUB (neoom AG, OÖ) – Modell „Plattform als Betreiber“
- KLUUB ist ein **Skill der neoom-App**, der passende Erzeuger und Verbraucher „verkuppelt“ und den Beitritt abwickelt. Tagesaktuelle Übersicht, **EDA, Datennachforderung, Abrechnung, Zahlungsabwicklung automatisch**; Tag/Nacht- und Sommer/Winter-Tarife, Fixkosten je Standort ([neoom KLUUB](https://neoom.com/KLUUB_energiegemeinschaften), [Wissen](https://wissen.neoom.com/erneuerbare-energiegemeinschaften-mit-neoom-kluub)).
- **Kosten:** Servicebeitrag **1,2 ct/kWh auf Lieferung UND Bezug**, **1 €/Standort/Monat** Betriebskosten, **50 € Kaution je ZP**, Nachschusspflicht bis 50 € je Mitglied in den Statuten, Staffelrabatt ab 200.000 kWh (ab 01.01.2026) ([Kostenüberblick](https://wissen.neoom.com/kostenueberblick-egs)).
- Größe: über 50 Gemeinschaften, über 1.000 ZP, ca. 400 Teilnehmer nach 6 Monaten ([neoom Blog](https://neoom.com/blog/kluub-ergebnis), Datum zu bestätigen). Auf Warteliste für DE ([nex-ora](https://www.nex-ora.de/energy-sharing)).
- Schwächen: Kaution und Nachschuss sind eine **Beitrittshürde**; man ist an das neoom-Ökosystem (Hardware/App) gebunden.

### B. Energieversorger-Angebote

| Anbieter | Produkt | Funktionen | Preis | Quelle |
|---|---|---|---|---|
| **Wien Energie** | Energiegemeinschaften (Business/Gemeinden, auch eigene Gemeinschaften „powered by Wien Energie“) | Gründungsberatung, Online-Portal (Mitglieder einladen, **Website der Gemeinschaft erstellen**, Rechnungen, **SEPA-Mandate**, Preise anpassen), Anmeldung bei Netzbetreiber, optional Vereinsgründung; Voraussetzung mind. 5 ZP und eine Anlage | Setup **100 € (ohne Verein) / 500 € (mit Verein)**, **1,90–2,50 €/ZP/Monat** | [wienenergie.at/business](https://www.wienenergie.at/business/energiegemeinschaften/), [Village im Dritten](https://energiegemeinschaften.wienenergie.at/village-im-dritten) |
| **Salzburg AG** | **enox.share** | EDA-Prozesse integriert, ZP selbst aktivieren/deaktivieren, **TNF anpassen**, quartalsweise Rechnungen/Gutschriften je ZP mit eigener Adresse, eigenem Steuersatz und Tarif | **Jahresgebühr je ZP**, quartalsweise, **keine kWh-Gebühr**, keine Staffel nach Mitgliedern (Betrag nicht veröffentlicht) | [salzburg-ag.at](https://www.salzburg-ag.at/photovoltaik/privat/energiegemeinschaften.html) |
| **Energie Steiermark** | **smartCOMMUNITY** (P2P-Handelsplattform) | 15-min-Matching mit Handelsalgorithmus; „Energy Depot“ (Gebote: Max-Kauf-/Min-Verkaufspreis) und „Energy Friends“ (fixe Zweierverträge); Strom verschenken; nur für Kunden der Energie Steiermark | **2,50 €/Monat** (12 Monate gratis), **2 ct/kWh** Einspeise-Abwicklung; Aug. 2026: 77,56 MWh zu Ø 8,38 ct/kWh gehandelt | [e-steiermark.com](https://www.e-steiermark.com/privat/produkte/energiegemeinschaft) |
| **EVN / EZN** | Rundumbetreuung | Gründung, energiewirtschaftliche Analyse, Kommunikation mit Behörden/Netzbetreibern, Mitgliederverwaltung, Abrechnung, Echtzeitdaten, App, **Steuerberatung**; technisch auf EGON | nicht veröffentlicht | [EVN Rundumbetreuung](https://www.evn.at/home/energiegemeinschaften/rundumbetreuung-durch-die-evn), [EZN](https://www.ezn.at/) |
| Kelag, Energie AG, TIWAG, VKW, Linz AG | eigene EG-Angebote nicht eindeutig gefunden | – | – | zu bestätigen |

**Bewertung:** Versorger punkten mit Vertrauen, Hotline (Salzburg AG 24/7) und einfachen Preisen. Sie sind aber **regional begrenzt** und binden teils an Stromkunden (smartCOMMUNITY). Gemeinschaften, die **unabhängig vom Landesversorger** sein wollen, suchen Alternativen (so ausdrücklich bei [gccg.at](https://www.gccg.at/)).

### C. Marktplatz-/P2P-Modelle (Versorger-Lizenz)

| Anbieter | Modell | Preis | Quelle |
|---|---|---|---|
| **eFriends** (eFriends Energy GmbH) | Echtzeit-Stromhandel mit **10-Sekunden-Daten** über eigene Hardware, Verkäufer setzt Preis je Käufer, Käufer priorisiert Erzeuger; man muss zu eFriends als **Stromlieferant wechseln** | Plattform 1,2 ct/kWh; Kleinkunden 5,99 € bzw. 2,99 €/Monat; Abrechnung monatlich per SEPA, 5 € bei Rücklastschrift | [efriends.at](https://www.efriends.at/), [Nutzungsbedingungen](https://www.efriends.at/cms/wp-content/uploads/2024/08/efriends_Nutzungsbedingungen_V0.8.pdf), [Support Abrechnung](https://support.efriends.at/hc/de/articles/360023407454-Wie-funktioniert-die-Abrechnung) |
| **OurPower** (Energie-Genossenschaft SCE, seit 2018) | Marktplatz für Strom direkt von Kleinkraftwerken; „Family & Friends“: Erzeuger bestimmt, wer zu welchem Preis bekommt; über 400 Verkäufer | bis 11 ct/kWh für Erzeuger | [ourpower.coop](https://www.ourpower.coop/), [Family&Friends](https://strom.ourpower.coop/family-and-friends/) |

Kritik in Foren: Das Konzept gilt als „idealistisch“, weil der Energiepreis nur ein kleiner Teil der Stromkosten ist ([energiesparhaus Forum](https://www.energiesparhaus.at/forum-e-friends/53321), Suchtreffer-Zusammenfassung, zu bestätigen). Mit dem ElWG-P2P **ohne Lieferantenwechsel** verlieren diese Modelle ihren Alleinstellungsvorteil.

### D. Open Source und Low-Cost

#### EEG Faktura (VFEEG – Verein zur Förderung von Erneuerbaren Energiegemeinschaften)
- Open Source ([GitHub eegfaktura](https://github.com/eegfaktura)), entstanden mit den LEADER-Regionen Mostlandl-Hausruck, Mitten im Innviertel, Traunsteinregion; KEM-Projekt des Jahres ([klimaaktiv](https://www.klimaaktiv.at/kem-projekt-eeg-faktura), [Klimafonds](https://www.klimafonds.gv.at/projekt/eeg-faktura/)).
- **Über 650 Vereinsmitglieder, über 65.000 ZP** ([vfeeg.org](https://vfeeg.org/)).
- **Preis:** 60 €/Jahr (regionale EEG, BEG), 24 €/Jahr (lokale EEG, GEA); selbst gehostet kostenlos ([Suchtreffer KEM-Newsletter](https://www.klimaundenergiemodellregionen.at/service/newsletter/newsletter-2/kostenlose-abwicklungssoftware-fuer-erneuerbare-energiegemeinschaften/)).
- **Dokumentierte Grenzen** ([EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html)):
  - ohne PONTON teils manuelle Energiedaten
  - kein Bulk-Edit für Tarifänderungen
  - **SEPA-Mandate nur einzeln**, kein Massen-Upload
  - Typwechsel privat/Firma nur per Support-Ticket
  - E-Mail-Text an neue Mitglieder nicht anpassbar
  - Fehlablehnungen erfordern Neustart des Prozesses
  - Doppelte Mitglieder („Karteileichen“) stören die Nummernlogik
  - Beim Wechsel vom EDA-Portal Neuerfassung per Excel
  - Support über Doku, Community und WhatsApp-Gruppe
- **Bedeutung:** Der Preisanker für „Selbermacher“. Wechselkandidaten sind Gemeinschaften, die gewachsen sind und keine Zeit mehr für Selbstverwaltung haben.

### E. Deutschland und Schweiz

**Deutschland:** Energy Sharing nach **§ 42c EnWG**, in Kraft seit 22.12.2025, Pflicht der Verteilnetzbetreiber zur technischen Umsetzung ab **01.06.2026** ([Görg](https://www.goerg.de/de/aktuelles/veroeffentlichungen/13-04-2026/bald-strom-mit-nachbarn-teilen-ein-ausblick-auf-das-ab-1-juni-2026-geltende-energy-sharing-gemaess-ss-42c-enwg-chancen-und-grenzen), [DGS](https://www.dgs.de/beratung-und-kompetenz/energy-sharing-in-deutschland/), [dena](https://future-energy-lab.de/projekte/faq-was-man-ueber-energy-sharing-wissen-sollte/)). **Kein Netzentgelt-Rabatt** wie in AT, darum geringere Wirtschaftlichkeit ([elektronik-zeit](https://elektronik-zeit.de/grafik/energiegemeinschaften-oesterreich-wachstum/)). Anbieter Mitte 2026 noch im Pilotstadium: neoom KLUUB (Warteliste), WeShareEnergy, power-share, Stadtwerke-Piloten, Nexora, NESH.HUB (Neshtec); „flächendeckend buchbar ist Mitte 2026 noch niemand“, Preise ab ca. 2,5 ct/kWh ([nex-ora](https://www.nex-ora.de/energy-sharing), [volt-e](https://volt-e.de/energy-sharing-anbieter), [items-Blog](https://itemsnet.de/itemsblogging/energy-sharing-ambition-trifft-auf-abrechnung/)). **Chance:** Die ÖKOVOLT-Gruppe ist in DE präsent. Ein AT-erprobtes Produkt kann dort früh starten.

**Schweiz:** **LEG** (lokale Elektrizitätsgemeinschaft) seit 01.01.2026 bei allen Netzbetreibern möglich, bis 40 % Rabatt auf Netznutzung (lokal); dazu ZEV/vZEV ([upgrid](https://upgrid.ch/de/articles/leg-schweiz-2026), [Swissolar/lokalerstrom](https://www.swissolar.ch/de/news/detail/lokalerstrom-ch-neue-tools-fuer-leg-vzev-und-zev-81038)). Anbieter: Upgrid (Matching, Abrechnung, VNB-Datenaustausch), innosolv, PVshare, zevvy, EKZ, BKW ([lokalerstrom.ch](https://www.lokalerstrom.ch/), [EKZ](https://www.ekz.ch/leg), [PVshare Kosten](https://pvshare.ch/de/kosten), [zevvy](https://www.zevvy.org/de-CH/blog/virtuelle-zev-und-leg), [innosolv](https://www.innosolv.ch/bereit-fuer-neue-energiegemeinschaften/)). Typisch: CHF 50–100 Verwaltungspauschale je Verbraucher und Jahr ([upgrid](https://upgrid.ch/de/articles/leg-schweiz-2026)). Ideen zum Übernehmen: **Mieter ohne Zustimmung des Vermieters**, öffentliches Dienstleisterregister mit Filter (lokalerstrom.ch).

### Preisvergleich (Rechenbeispiel, eigene Rechnung)

Annahme: EEG mit **50 ZP / 45 Mitgliedern**, **150.000 kWh/Jahr** intern geteilt. Netto, nur Software/Plattform. Die Annahmen sind vereinfacht, Werte zu bestätigen.

| Anbieter | Rechnung | ca. €/Jahr | ca. €/ZP/Jahr |
|---|---|---|---|
| EEG Faktura (gehostet) | Pauschale | 24–60 | ca. 1 |
| colibrie | gratis bis 51 ZP | 0 | 0 |
| EG Control Selbstverwaltet | 0,13–0,83 €/ZP/Monat | 78–498 | 1,6–10 |
| Wien Energie | 1,90–2,50 €/ZP/Monat | 1.140–1.500 (+ Setup) | 23–30 |
| EGON (Weiterverrechnung) | ca. 1,90–3,12 €/ZP/Monat (brutto/netto gemischt) | 1.140–1.870 | 23–37 |
| energiedigital Basic / Standard / Premium | 1 / 1,5 / 2 ct × 150.000 kWh | 1.500 / 2.250 / 3.000 | 30 / 45 / 60 |
| BillWise | 1,2 ct × 150.000 | 1.800 | 36 |
| energyfamily | 2 ct × 150.000 + 1 €/Monat (Bezug zu bestätigen) | ca. 3.000+ | 60+ |
| neoom KLUUB | 1,2 ct × (Lieferung + Bezug = 300.000) + 1 €/Standort/Monat | ca. 4.200 | 84 |
| EVA 2 | 390 €/Monat | 4.680 | 94 |

**Erkenntnis:** Die Spanne reicht von ca. 1 € bis über 90 € je ZP und Jahr. Bei 50–200 € Ersparnis je Haushalt ist **alles über ca. 40 € je ZP und Jahr erklärungsbedürftig**. Wer teurer ist, muss sichtbar mehr Leistung (Betrieb, Support, Mehrerträge) liefern.

---

## 3. Feature-Matrix (Wettbewerber × Funktion)

Legende: **J** belegt · **T** teilweise/eingeschränkt · **–** in öffentlichen Quellen nicht gefunden · **?** unklar. Quellen siehe Steckbriefe.
Abkürzungen: eD = energiedigital, EGON, eF = energyfamily, enx = enixi, EGC = EG Control, BW = BillWise, nK = neoom KLUUB, WE = Wien Energie, eS = enox.share (Salzburg AG), sC = smartCOMMUNITY, eFr = eFriends, EF = EEG Faktura, son = sonnnig, EVA = EVA 2, col = colibrie, eka = ekarus.

| Funktion | eD | EGON | eF | enx | EGC | BW | nK | WE | eS | sC | eFr | EF | son | EVA | col | eka |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gründungsbegleitung (Statuten, Verein, Netzbetreiber) | J | J | J | – | T | T | J | J | ? | – | – | T | J | – | J | – |
| Planungs-/Ersparnisrechner | J (EnergyPlanner) | ? | ? | – | – | – | J (Matching) | ? | – | – | – | – | T (Prognose) | – | J | – |
| Online-Beitritt mit E-Signatur | J | J | J | J | J | J | J | J | ? | J | J | J | J | ? | J | ? |
| Hilfe bei Zustimmung im Netzbetreiber-Portal | ? | J (PDF) | J (Anleitungen je NB) | ? | ? | ? | J | ? | ? | – | – | J (FAQ) | J (Status) | ? | ? | ? |
| EDA-Anbindung automatisch | J | J | J | J | J (KEP) | J | J | J | J | n/a | n/a | T (PONTON nötig) | J | J | J | ? |
| Datennachforderung / Datenqualität | J | ? | ? | J | J | J | J | ? | J | – | – | T | J | J | ? | T |
| ZP-Verwaltung mit Status (ausstehend/abgelehnt) | J | J | J | J | J | J | J | J | J | – | – | T | J | J | J | J |
| 15-min-Daten im Portal | J | J | J | J | J | J | J (tagesaktuell) | J | J | J | J (10 s) | J | J | J | J | J |
| Echtzeitdaten (Hardware) | J (SMR) | J (Smongle, Fronius) | – | – | – | – | J (neoom-HW) | – | – | – | J | – | – | – | – | – |
| Verteilschlüssel statisch/dynamisch wählbar | J | ? | ? | ? | ? | ? | ? | ? | J (TNF) | n/a | n/a | J | ? | ? | ? | ? |
| Mehrfachteilnahme / TNF-Verwaltung | J (Erzeuger) | ? | ? | ? | J (Paket) | ? | ? | ? | J | – | – | T (TNF min. 1) | ? | ? | J | ? |
| Tarifmodelle (Tag/Nacht, Saison, Gruppen) | J (Gruppen) | ? | ? | J | ? | J | J | J | J (je ZP) | J (Gebote) | J | T (kein Bulk) | ? | ? | ? | ? |
| Rechnungen + Gutschriften PDF | J | J | J | J | J | J | J | J | J | J | J | J | J | J | J | J |
| USt-Logik (Kleinunt., RC, Landwirt, Gemeinde) | ? | ? | T (Ratgeber) | J (Tariflogik) | J (Steuer) | ? | J (Steuermeldungen) | ? | J (Steuersatz je ZP) | ? | ? | T | ? | J | ? | ? |
| SEPA-Lastschrift / Mandate | J | ? | ? | J | J | ? | J | J | ? | ? | J | T (einzeln) | ? | J (Export) | ? | J (Datei) |
| Mahnwesen | – | – | – | – | T (Zahlungsverw.) | – | T (Kaution) | – | – | – | T | – | – | – | – | – |
| Buchhaltungsexport (BMD, k5, DATEV) | – | – | – | J (API) | J | – | – | – | – | – | – | – | – | J | – | J |
| Mitgliederportal / App | J | J | J | J | J | J | J (App) | J | J | J | J | J | J | J | J | T |
| Dashboards für Vorstand | J | J | J | J | J | J | J | J | J | – | – | J | J | J | J | J |
| Prognosen (PV, Verbrauch) | – | – | – | – | – | – | ? | – | – | – | – | – | J | – | – | – |
| Speicher-Steuerung/-Bilanzierung | – | – | – | – | – | J | T | – | – | – | – | – | – | – | – | – |
| E-Mobilität / Lastverschiebung | J (GreenCharge) | – | – | – | – | J (EV) | T | – | – | – | – | – | – | – | – | – |
| P2P nach ElWG | J | ? | ? | ? | J | J | ? | ? | ? | J | J (eigenes Modell) | – | ? | ? | ? | ? |
| Marktplatz / Gemeinschaftssuche | J (stromplatz.at) | J (Landingpages) | ? | – | – | – | J | T (Website) | – | J | J | – | – | – | – | – |
| Multi-Gemeinschaft / Mandanten (Dienstleister-Modus) | J | J | J | J (White Label) | J | J | J | J | J | n/a | n/a | J | J | J | J | ? |
| Vereinsverwaltung (GV, Beschlüsse, Beiträge) | – | – | – | – | – | – | T | T (opt. Verein) | – | – | – | – | – | T (Dokumente) | – | – |
| Förderungs-/Anlagenprojekte | – | – | – | – | – | – | T | – | – | – | – | – | – | – | – | – |
| Migration mit Kontrollabrechnung | J (Import) | ? | ? | ? | ? | ? | ? | ? | ? | – | – | – | J | J | ? | ? |
| API / White Label | J (SMR-API) | ? | ? | J | J | ? | – | – | – | – | – | Open Source | ? | ? | ? | ? |
| Preis öffentlich | J | T | T | – | J | J | J | J | T | J | J | J | ? | J | J | – |

**Lesart:** Fast alle haben den Grundumfang (Beitritt, EDA, Rechnung, Portal). **Fast niemand** hat öffentlich belegt: Mahnwesen, Vereinsführung, Prognosen, Speicher-Bilanzierung, Förder- und Anlagenprojekte, durchgängige USt-Sonderfälle, Optimierung bei Mehrfachteilnahme. **Dort ist die Lücke.**

---

## 4. Lücken und Schmerzpunkte der Kunden

### 4.1 Netzbetreiber, EDA und Daten (größter Ärger)
- Nach Freigabe kommen keine Daten, oft tagelang. Netzbetreiber brauchen **bis 14 bzw. 28 Tage**. Auch falsche ZP-Zuordnung beim Netzbetreiber kommt vor ([EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html), Suchtreffer [Koordinationsstelle FAQ](https://energiegemeinschaften.gv.at/faqs/)).
- Abrechnungsverzug durch IT-Umstellungen beim Netzbetreiber; Abrechnung oft erst quartalsweise im Nachhinein, wenn genug Daten vorliegen ([Suchtreffer FAQ / regenerative.at](https://support.regenerative.at/wissensdatenbank/wie-funktioniert-die-abrechnung)).
- **Zustimmungsfrist 10 Werktage** im Netzbetreiberportal: Mitglieder vergessen sie oder scheitern an der Bedienung. Folge: Ablehnung und Neustart ([eda.at](https://www.eda.at/pdf/20221214informationsveranstaltunganwenderportalfragen.pdf), [EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html)). Jeder Netzbetreiber hat ein anderes Portal, deshalb gibt es eigene Anleitungen je Netzbetreiber ([energyfamily](https://www.energyfamily.at/anleitung-datenfreigabe-wienernetze)).
- Beschwerdeweg ist die Schlichtungsstelle der E-Control. Kommunikation mit dem Netzbetreiber muss **schriftlich dokumentiert** werden (Suchtreffer [Koordinationsstelle FAQ](https://energiegemeinschaften.gv.at/faqs/)). Kaum eine Software unterstützt das.
- Mitgliederwechsel müssen sofort gemeldet werden, sonst wird falsch zugeordnet (ebd.).

### 4.2 Ehrenamt und Aufwand
- Dokumentiertes Beispiel: **ca. 1.000 Stunden/Jahr** Verwaltungsaufwand in einer EEG: 250 h Vereinsverwaltung (10 Vorstandssitzungen, GV), 300 h Mitgliederbetreuung, Abrechnung, Optimierung, Homepage, 300 h Projekte (PV-Planung, Genehmigungen, Förderungen), 150 h Sonstiges; verteilt auf 6 Ehrenamtliche (Suchtreffer-Zusammenfassung aus [Koordinationsstelle BEG-Betrieb](https://energiegemeinschaften.gv.at/7-laufender-betrieb-beg/) bzw. [EnComm-Endbericht](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2024/05/EnComm_Endbericht_Fertig.pdf); genaue Fundstelle zu bestätigen).
- Haupthemmnisse bei Gründungen: hoher Gründungs- und Verwaltungsaufwand, Koordinationsprobleme, geringes Verständnis (ebd.).
- **Folge:** Nur ca. 30 % des Aufwands sind „Abrechnung“. Der Rest ist Vereinsführung, Mitgliederbetreuung und Projekte. **Keine Plattform deckt das ab.**

### 4.3 Bedienung und Massenpflege
- Kein Bulk-Edit für Tarife, SEPA-Mandate nur einzeln, nicht anpassbare E-Mail-Texte, Doppelanlagen, Typwechsel nur per Ticket ([EEG Faktura FAQ](https://docs.eegfaktura.at/books/faq/export/html)).
- Viele Rückfragen der Mitglieder („Wie viel habe ich bekommen? Warum ist die Rechnung so?“). sonnnig wirbt ausdrücklich mit Prognosen „gegen Rückfragen“ ([sonnnig](https://www.sonnnig.at/energiegemeinschaften)).

### 4.4 Steuern und Recht
- USt-Fallunterscheidungen (Kleinunternehmer 55.000 €, Option Regelbesteuerung, Reverse Charge bei Lieferung an die Gemeinschaft, Landwirte, Gemeinden) überfordern ehrenamtliche Kassiere ([Koordinationsstelle Steuern](https://energiegemeinschaften.gv.at/steuern-und-abgaben-in-energiegemeinschaften/), [Ratgeber 2026](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2023/05/EEG-Ratgeber-Steuern-Abgaben-2026.pdf)). Anbieter werben gezielt mit „steuersicher“ (So-Strom) oder Steuerberatung (EZN).
- **ElWG ab heute:** Vertragsanpassung, neue Lieferantenpflichten, P2P, Sozialquote, Netzentgelt-Lücke Okt.–Dez. 2026, Details zu Rabatten noch offen ([ElWG-FAQ](https://energiegemeinschaften.gv.at/faqs-zum-elwg/), [stromliste.at](https://stromliste.at/aktuelles/energiegemeinschaft-neue-regeln-oktober-2026)).

### 4.5 Wirtschaftlichkeit und Vertrauen
- Kleine Ersparnis je Haushalt (50–200 €) gegen Plattformgebühren: Gebühren sind sichtbar und werden hinterfragt.
- Beitrittshürden wie Kaution (neoom 50 € je ZP) oder Lieferantenwechsel (eFriends).
- **Vertragsrisiken** bei Anbietern (Haftungsausschluss, Datenlöschung bei Verzug, Vorauszahlung jährlich bei energiedigital, [AGB](https://www.energiedigital.at/terms_of_service)). Gemeinden und Vorstände haften persönlich für eine ordnungsgemäße Geschäftsführung (Vereinsrecht; zu bestätigen).
- **Lock-in und Wechsel:** Wechsel braucht Stichtag, Export, Neuerfassung der Stammdaten. Einige Anbieter (sonnnig, EVA) machen daraus ein Verkaufsargument ([sonnnig](https://www.sonnnig.at/energiegemeinschaften), [EVA](https://ratko.at/eva/)).

### 4.6 Was in öffentlichen Bewertungen fehlt
Für energiedigital, EGON, energyfamily, enixi wurden **keine belastbaren öffentlichen Kundenbewertungen** (Trustpilot, Google, Foren) gefunden. Empfehlung: **Interviews mit 10–15 Vorständen** (davon 5 Wechselwillige) als Folgeschritt, Leitfaden über Skill „user-research“.

---

## 5. Differenzierungs-Vorschläge für ÖkoInvest (priorisiert)

Leitidee: **Nicht „noch eine Abrechnungssoftware“, sondern das Betriebssystem der Energiegemeinschaft, plus ein Dienstleister, der es für einen betreibt.** Die Wettbewerber decken die ca. 30 % „Abrechnung“ ab, ÖkoInvest deckt die 100 % „eine Gemeinschaft führen“ ab und zusätzlich „eine Gemeinschaft wachsen lassen“ (eigene Anlagen, Speicher, Investitionen).

### P0 – ohne das kein Markteintritt (Parität, aber besser gemacht)
1. **EDA-Vollanbindung** (eigener Marktpartner oder Partner wie PONTON), alle Prozesse inkl. TNF, Mehrfachteilnahme, An-/Abmeldung, Datennachforderung, Stammdatenänderung.
2. **Online-Beitritt in unter 5 Minuten** mit E-Signatur, IBAN-Prüfung, SEPA-Mandat, Smart-Meter-Check. Danach eine **geführte Zustimmung je Netzbetreiber** (Anleitung mit Screenshots für genau *seinen* Netzbetreiber, Countdown der 10 Werktage, automatische Erinnerungen per E-Mail/SMS an Tag 2, 5 und 8, Rückruf-Option). **Ziel: Ablehnungsquote fast null.**
3. **Abrechnung** mit Rechnung/Gutschrift je ZP, Tarifgruppen, Tag/Nacht/Saison, monatlich/quartalsweise, Pflichtinhalte nach ElWG § 69, **SEPA-Lastschrift und -Überweisung (pain.001/008)**, Massenpflege überall (Bulk-Edit, CSV-Import mit Vorschau).
4. **ElWG-ready ab Tag 1:** Nahebereiche, P2P-Verträge, Vertrags-Neuausrollung an alle Mitglieder mit Zustimmungs-Tracking (aktueller Anlass!), Kommunikations-Kit zur Netzentgelt-Lücke Okt.–Dez. 2026.

### P1 – Alleinstellung („alle anderen sehen wie Billigsoftware aus“)
5. **Datenqualitäts-Leitstand:** Je ZP und Tag eine Ampel (Daten da / fehlen / unplausibel), automatische Nachforderung, **automatisch erzeugte, dokumentierte Reklamation an den Netzbetreiber** mit Fristen und Verlauf. Daraus entsteht eine **Beschwerdeakte für die E-Control-Schlichtung** als Export. Netzbetreiber-Statistik („Netz X liefert im Schnitt nach 9 Tagen“). Das adressiert den Schmerzpunkt Nr. 1 und hat niemand.
6. **Steuer-Engine mit Prüfprotokoll:** Je Mitglied und Gemeinschaft wird der USt-Fall automatisch bestimmt (Kleinunternehmer mit 55.000-€-Überwachung und Frühwarnung, Option Regelbesteuerung, Reverse Charge, pauschalierte Landwirte, Gemeinde/BgA, Elektrizitätsabgabe). UVA-Vorbereitung, **Export für BMD, RZL, DATEV, k5**, Belegjournal, Prüfpfad für Steuerberater und Rechnungsprüfer. Freigabe der Fallregeln durch einen Steuerberater als Qualitätssiegel.
7. **Vereins- und Gremienmodul:** Mitgliederregister nach Vereinsrecht, Mitgliedsbeiträge, **Einladung zur GV mit Fristen**, Online-/Hybrid-Abstimmung, Beschlussregister, Protokolle, Vorstand/Kassier/Rechnungsprüfer-Rollen, Kassabuch, Jahresabschluss-Paket für Rechnungsprüfer, Aufgaben und Fristen (Finanzamtsmeldung, Statutenänderung ElWG). Damit sind 250 der 1.000 Ehrenamtsstunden adressiert.
8. **Mahnwesen und Forderungsmanagement:** Rücklastschrift-Erkennung (camt.053/054-Import), Mahnstufen mit sozial verträglichen Texten, Ratenplan, Sperr- und Austrittsprozess inkl. EDA-Abmeldung. **Bei keinem Wettbewerber öffentlich belegt.**
9. **Mehrfachteilnahme-Optimierer:** Schlägt dem Mitglied die beste Rangfolge und die TNF über bis zu 5 Gemeinschaften (inkl. P2P) vor, simuliert Ersparnis je Variante und setzt sie per EDA um. EG Control verkauft das als teures Paket, ÖkoInvest macht es selbsterklärend.
10. **Gemeinschafts-Cockpit mit Prognose:** PV-Prognose (Wetter) für morgen („Morgen 11–15 Uhr viel Gemeinschaftsstrom, jetzt waschen/laden“), Eigendeckungsquote, Ersparnis je Mitglied in Euro, CO2, Ranglisten (opt-in), Push-Benachrichtigungen. Optional Steuerung über Partner-Hardware (Wallbox, Wärmepumpe, Speicher), herstelleroffen statt eigener Hardware.
11. **Wechselgarantie:** Migration aus energiedigital, EGON, EEG Faktura, Excel mit Importassistenten, **Parallel- und Kontrollabrechnung** des letzten Quartals vor Go-live, Stichtagsplanung, Kommunikationsvorlagen für Mitglieder, ohne Neuanmeldung der ZP. Werbeversprechen: „Ihre erste Abrechnung bei uns prüfen wir gemeinsam, Abweichungen erklären wir zeilengenau.“
12. **Faire, vorhersagbare Preise:** **Je ZP und Monat** (kalkulierbar für Gemeinden), keine Kaution, keine kWh-Strafe für große Erzeuger, Monatsabrechnung statt Jahresvorauszahlung, **faire AGB** (SLA mit Verfügbarkeitszusage, Datenexport jederzeit, keine Datenlöschung ohne Vorwarnung). Klar abgegrenzte Pakete: Selbstverwaltet / Begleitet / Rundum (ÖkoInvest als Betriebsführer und Organisator).

### P2 – Ökosystem-Hebel aus dem Kerngeschäft der ÖKOVOLT-Gruppe
13. **Gründung als Service mit Erfolgsplan:** Benefit-Simulation (über das Tool der Koordinationsstelle hinaus mit echten Lastprofilen und ElWG-Nahebereichen), Netzgebiets-/Trafo-Check, Statuten-Generator auf Basis der Musterstatuten, Vereinsanmeldung, Finanzamt, Netzbetreiber-Vertrag, Startkampagne für Mitglieder (Landingpage, Flyer, QR-Code, Infoabend-Kit).
14. **Anlagen- und Investitionsmodul:** Die Gemeinschaft plant eigene PV, Speicher oder Ladepunkte. ÖkoInvest liefert Projektierung und Bau über die Gruppe, Finanzierung über **Bürgerbeteiligung/Genossenschaftsanteile** und die **Projektbörse**, inkl. Förderrecherche und Fördereinreichung. Der Gemeinschaftsspeicher wird mit Messkonzept nach § 111 ElWG bilanziert, sobald die Regeln stehen. **Das kann kein reiner Softwareanbieter.**
15. **Reststrom-Pool und Energiebeschaffung:** Was die Gemeinschaft nicht deckt, beziehen die Mitglieder gebündelt über das virtuelle Kraftwerk von ÖkoInvest (siehe [BRIEFING.md](./BRIEFING.md), [ENERGIEBESCHAFFUNG.md](./ENERGIEBESCHAFFUNG.md)). Das ist ein Gesamtpreis-Argument, nicht nur ein Netzentgelt-Argument.
16. **Gemeinde-Paket:** Sozialquote 10 % nach ElWG mit Kontingent, Nachweis und eigenem Tarif; Bürgermeister-Dashboard; Gemeinde als Erzeuger (Kläranlage, Schule, Bauhof) mit BgA-Steuerlogik; k5-Export; Gemeinderatsbeschluss-Vorlagen.
17. **Dienstleister-/Mandantenmodus:** ÖkoInvest-Betriebsführung, Steuerberater, Regionen (KEM/LEADER) und Wohnbauträger verwalten viele Gemeinschaften aus einem Arbeitsplatz. Dazu gehören Aufgaben-Inbox über alle Gemeinschaften, SLA-Uhr, Massenaktionen und White Label.
18. **Marktplatz/Gemeinschaftsfinder mit Karte:** Öffentliche Seite je Gemeinschaft mit Tarifen und Beitritt (wie EGON/stromplatz.at), aber mit Netzgebiets-Prüfung per Adresse („Diese 4 Gemeinschaften passen zu deinem Zählpunkt, so viel sparst du“). P2P-Börse für Erzeuger.
19. **DE/CH-Fähigkeit:** Mandanten mit Länderregeln (§ 42c EnWG, LEG/vZEV). AT-Erfahrung zuerst, DE als Gruppenmarkt ab 2027.

### P3 – Vertrauen und Professionalität sichtbar machen
20. **Transparenz-Rechnung:** Jede Rechnung erklärt sich selbst (Grafik: Viertelstunden, Gemeinschaftsanteil, Ersparnis gegenüber Lieferant, Netzrabatt). Ein QR-Code führt zur Detailansicht.
21. **Barrierefreiheit (WCAG 2.1 AA), Mehrsprachigkeit, Senioren-Modus**, telefonischer Support für Mitglieder im Rundum-Paket.
22. **Datenschutz und Sicherheit** als Argument: Hosting in AT/EU, Rollen- und Rechtekonzept, Audit-Log, DSGVO-Auftragsverarbeitung als Muster, Löschkonzept. Bei energiedigital mit 50 % Auslandsinvestor ist das ein Gesprächsthema (sachlich bleiben, kein Negative Campaigning).
23. **Eintrag in die Dienstleisterliste** der Koordinationsstelle und Bekenntnis zum Kodex ([Liste](https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/)).

**Positionierung in einem Satz:** *„Andere rechnen Ihre Gemeinschaft ab. ÖkoInvest führt sie: von der Gründung über Daten, Steuern, Verein und Mahnwesen bis zur eigenen Anlage, zu einem festen Preis je Zählpunkt.“*

---

## 6. Nutzerprofile, Rollen und Jobs-to-be-done

| Rolle | Kontext | Jobs-to-be-done („Wenn …, will ich …, damit …“) | Schmerz heute | Was ÖkoInvest liefern muss |
|---|---|---|---|---|
| **Gründungsinitiative** (Bürger, Gemeinderat, Landwirt, Betrieb) | will eine Gemeinschaft starten | … wissen, ob es sich lohnt und welche Form passt, … ohne Juristen gründen, … schnell genug Mitglieder gewinnen | Formenvielfalt (EEG/BEG/GEA/P2P), Netzgebiet unklar, Bürokratie | Simulation mit echten Daten, Netzgebiets-Check, Statuten-Generator, Gründungs-Checkliste mit Status, Startkampagne |
| **Wechselnde Gemeinschaft** (Vorstand) | unzufrieden mit Abrechnung, Aufwand oder Preis | … ohne Risiko und Unterbrechung wechseln, … die erste Abrechnung bei uns gegenprüfen | Lock-in, Neuerfassung, Angst vor Fehlern | Importassistent, Kontrollabrechnung, Stichtagsplan, Mitglieder-Kommunikation |
| **Obfrau/Obmann / Vorstand** | Ehrenamt, haftet | … jederzeit sehen, dass alles läuft, … GV und Beschlüsse rechtssicher abwickeln, … Aufgaben delegieren | 1.000 Std./Jahr, verstreute Excel-Listen, WhatsApp | Vorstands-Cockpit, Gremienmodul, Aufgaben/Fristen, Rollen |
| **Kassier/in** | Finanzen, Steuer, Bank | … Rechnungen und Gutschriften korrekt und pünktlich, … USt richtig, … offene Posten eintreiben, … sauberer Jahresabschluss | USt-Fälle, SEPA einzeln, keine Mahnung, Steuerberater-Schnittstelle | Steuer-Engine, SEPA-Massenläufe, camt-Import, Mahnwesen, BMD/RZL/DATEV/k5-Export |
| **Rechnungsprüfer/in** | prüft einmal jährlich | … nachvollziehbar prüfen ohne IT-Kenntnis | Daten verstreut | Prüfer-Rolle (nur lesen), Prüfpaket mit Belegen und Prüfpfad |
| **Verbraucher/in** (Haushalt, Mieter) | will sparen, wenig Aufwand | … einfach beitreten, … verstehen, was ich spare, … wissen, wann Gemeinschaftsstrom da ist | Zustimmung im NB-Portal, unverständliche Rechnungen, geringe Ersparnis | geführter Beitritt, Transparenz-Rechnung, Prognose-Push, Ersparnis in Euro |
| **Erzeuger/in** (PV-Haushalt, Landwirt) | will mehr als OeMAG/Einspeisetarif | … Überschuss zu gutem Preis verkaufen, … in mehreren Gemeinschaften, … Gutschrift steuerlich richtig | Mehrfachteilnahme komplex, Landwirt-USt | Erzeuger-Cockpit, Mehrfachteilnahme-Optimierer, Gutschrift mit korrekter Steuerlogik, Erlösprognose |
| **Prosumer** (PV + Speicher + E-Auto/WP) | will optimieren | … Verbrauch in Gemeinschaftsstunden schieben, … Speicher sinnvoll nutzen | keine Signale, Hardware-Insellösungen | Prognosen, offene Schnittstellen zu Wallbox/WP/Speicher, Empfehlungen |
| **Gemeinde** (Bürgermeister, Amtsleitung) | Erzeuger, Verbraucher, Initiator, ElWG-Sozialquote | … Bürger beteiligen, … Sozialquote nachweisen, … BgA-Steuer korrekt, … Gemeinderat informieren | Haftungs- und Vergaberisiko, k5-Anbindung | Gemeinde-Paket, Berichte für Gemeinderat, k5-Export, faire AGB/SLA |
| **Betrieb/KMU** | Erzeuger oder Großverbraucher, ggf. nur BEG (Großunternehmen) | … Überschuss an Mitarbeiter/Nachbarn (P2P) vermarkten, … Reststrom günstig | Lieferantenpflichten ab 100 kW, Buchhaltung | P2P-Modul, Lieferantenpflicht-Vorlagen, Reststrom-Pool, ERP-Export |
| **Wohnbauträger/Hausverwaltung** | GEA im Mehrparteienhaus | … PV am Dach auf Mieter verteilen, … Wechsel der Mieter einfach | Mieterwechsel, Einzel-ZP | GEA-Modul, Mieterwechsel-Assistent, Massenbriefe |
| **ÖkoInvest Betriebsführung** (Sachbearbeitung) | betreut viele Gemeinschaften | … alle Aufgaben über alle Gemeinschaften in einer Inbox, … Netzbetreiber-Reklamationen nachverfolgen, … SLA einhalten | – (eigene Effizienz) | Mandantenmodus, Datenqualitäts-Leitstand, Massenaktionen, Vorlagen |
| **ÖkoInvest Vertrieb/Projektentwicklung** | Anlagengeschäft | … Gemeinschaften mit Bedarf an PV/Speicher erkennen, … Bürgerbeteiligung anbieten | – | Potenzial-Auswertung (Deckungsgrad, Überschuss), Projektbörse-Anbindung |
| **Steuerberater/Partner** | betreut mehrere Gemeinschaften | … Daten fertig und prüfbar erhalten | Excel-Chaos | Export-Schnittstellen, Partnerzugang |

---

## 7. Offene Punkte (zu bestätigen)

1. Genaue aktuelle Zahl EEG/BEG/GEA (Koordinationsstelle bzw. E-Control Monitoringbericht 2026 abwarten).
2. Gilt die Grenze von 5 Gemeinschaften bei Mehrfachteilnahme im ElWG unverändert weiter, und wie wird P2P in die Kaskade eingeordnet?
3. Netzentgelt-Rabatte ab 01.01.2027 je Nahebereich (SNE-VO-Novelle).
4. USt-Details (Landwirte, Gemeinden, Reverse Charge bei Kleinunternehmer-Erzeugern) mit Steuerberater gegen den [Ratgeber 2026](https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2023/05/EEG-Ratgeber-Steuern-Abgaben-2026.pdf) prüfen.
5. Preise von EGON, enixi, enox.share, sonnnig und EVA (kWh-Staffel) direkt anfragen.
6. Kundenstimmen: Interviews mit Vorständen (kein öffentliches Bewertungsmaterial gefunden).
7. EDA-Anbindungsweg für ÖkoInvest (eigener Marktpartner vs. Dienstleister) und Kosten klären ([eda.at Anbindungsarten](https://www.eda.at/anbindungsarten)).
