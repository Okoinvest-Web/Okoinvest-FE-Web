# Team-Berichte (fertig, aus dem ersten Lauf)

## Team Österreich
TEAM ÖSTERREICH: Bündel für den Strategie-Rat (Stand 03.10.2026)

Grundbefund: Die AT-Inhalte (9 Regionsdateien, Ratgeber Freiflächen-PV AT, Energy-Sharing-Ratgeber) sind tief recherchiert und mit RIS-Quellen belegt. Die Schwäche liegt woanders: Öffentliche Rechner und Konstanten behandeln AT wie ein deutsches Bundesland. Die Portal-Engines dagegen (scoring.js WIDMUNG, eg/netzentgelt.js, eg/ersparnis.js) kennen die AT-Logik schon, nur öffentlich wird sie nicht genutzt. Der schnellste Hebel ist deshalb, vorhandene Logik öffentlich zu machen und Länderweichen einzubauen.

SELBST GEPRÜFT (Code):
- markt.js Z. 232: PACHT.freiflaecheProHa {1500/2800/4500} gilt für ganz DACH. Der Ratgeber solarpark-pacht-pro-hektar.js Z. 16 nennt für AT 3.000–5.000 (LK Stmk 17.05.2022). Die Website widerspricht sich also selbst. BESTÄTIGT.
- rechner/pacht/page.js Z. 100/113/115: Für AT gelten „EEG-Zuschlagswert“ und „Ackerpacht Ø Deutschland 380 €“. BESTÄTIGT.
- flaechencheck.js Z. 74: „Gute Größe“ +15/+20 ohne Länderlogik. Z. 83: „in Deutschland EEG-förderfähig“ ohne Länderweiche. BESTÄTIGT.
- kommunen/page.js Z. 55: „ab bestimmten Größen ist eine UVP-Prüfung erforderlich“. Das widerspricht dem Ratgeber AT Z. 62/282 („kein eigener PV-Tatbestand“). Title, Description und Keywords Z. 21/26 sind rein DE (§ 6 EEG, Gewerbesteuer). BESTÄTIGT.
- markt.js Z. 521/537–541: AT-Rabatte nur lokal 57 % und regional 28 %, ohne NE 4/5 −64 %. abgabenCt 0,82 pauschal. Das Portal (eg/netzentgelt.js Z. 6–7) ist korrekt. Öffentliche Seite und Portal widersprechen sich. BESTÄTIGT.
- unternehmen.js Z. 171: „Bevorzugter PV-Errichter des Salzburg AG Konzerns“ steht im Präsens, obwohl die Beteiligung 2025 endete (Kommentar Z. 12). BESTÄTIGT.

AUFGELÖSTE WIDERSPRÜCHE IM TEAM:
- ElWG „seit 2 Tagen“: Das ElWG ist seit 24.12.2025 in Kraft (BGBl. I 91/2025). Seit 1.10.2026 gelten die Bürgerenergie-Regeln §§ 65 ff. Neue Modelle starten ab 5.10.2026. Bis 31.12.2026 gibt es für neue Modelle keine Netzentgelt-Reduktion. Die Sätze ab 2027 sind noch nicht kundgemacht.
- Bezeichnung des 0,05-ct-Entgelts: „Versorgungsinfrastrukturbeitrag (Einspeiseentgelt), max. 0,05 ct/kWh ab 2027, Anlagen > 20 kW“. Nicht „Netzentgelt“.
- AT-Pachtspanne: Einen eigenen Wert für den „mittleren“ Pachtpreis erfinden wir nicht (also nicht 4.000 oder 5.500). Wir zitieren „Angebotsspanne 3.000–5.000 €/ha (LK Stmk, 05/2022, historisch)“ mit Datum. Die Spitzenwerte von 6.000 € kommen nur als topagrar-Einzelbeleg vor, nicht als Norm. Vergleichswert: Ackerpacht 364 €/ha, Grünland 257 €/ha (Statistik Austria 2024; für Sbg, T und Vbg keine Werte, also nicht schätzen).
- Gemeinde- und Bezirksseiten: keine 2.093 Gemeindeseiten (Risiko dünner Inhalte), sondern 30–40 Bezirksseiten nur in den PV-Kerngebieten mit echten Daten.
- Gewerbestrom AT: Die E-Control-Schnittstelle verbietet, ihre Ergebnisse mit eigenen zu kombinieren oder neben Werbung bzw. Lead-Formularen zu zeigen. Ein eigenes Reststrom-Angebot für AT gibt es noch nicht. Deshalb rechnen wir nur Netz- und Abgabenanteile aus der SNE-VO (amtliches Werk) und führen eine Warteliste statt Liefer-Leads.

1) TOP-INITIATIVEN (priorisiert)
1. Flächencheck Österreich mit Landesregel-Engine und PDF-Steckbrief | AT | Wirkung sehr hoch | Aufwand mittel
   Inhalt: Auswahl von Bundesland und Gemeinde. Die WIDMUNG-Regeln aus plattform/geodaten/scoring.js werden öffentlich genutzt:
   - NÖ: außerhalb der 116 Zonen max. 2 ha, 200-m-Zusammenrechnung
   - Bgld: nur in Eignungszonen (95, davon 19 Beschleunigungsgebiete)
   - Ktn: max. 4 ha mit 1.000 m Abstand
   - Stmk: SAPRO, OÖ: Sonderausweisung
   - dazu: EAG-Abschlag ja/nein, HQ30 bzw. rote Zone als Ausschluss, Netzstatus des Umspannwerks als Link mit Stand
   Lead: PDF gegen Name, E-Mail und Telefon, mit getrennten Einwilligungen.
   Alleinstellung: Kein AT-Anbieter (Trianel, CPG, Selina, Energie AG, PV-Börse) prüft auf Zonen-Ebene. Unsere Regeldaten liegen schon vor.
   Risiko: Ergebnis als Ersteinschätzung kennzeichnen, nie als Widmungszusage. Stand-Datum je Regel. Geodaten nur als OGD mit CC-BY-Namensnennung. scoring.js „angrenzendM“ (NÖ 200 m, Stmk 500 m) vorher korrigieren.
2. AT-Pacht- und Pachtangebot-Check mit EAG-Logik (zweite Meinung zu Versorger-Angeboten) | AT | Wirkung sehr hoch | Aufwand klein bis mittel
   Inhalt: Länderweiche in pacht.js, pachtangebot.js, agriPv.js und solarpark.js:
   - AT-Spannen und AT-Ackerpacht (siehe oben)
   - Umsatzmodell mit EAG-Marktprämie (Grenzpreis Runde 2/2026 6,69 ct, Höchstpreis 7,77 ct) statt EEG 4,8 ct
   - Abschlag 25 % nach § 33 EAG mit Ausnahmen (Agri-PV, vorbelastete Flächen)
   - Optionsentgelt, VPI-Wertsicherung, Rückbau-Sicherheit
   - Steuerblock: Einheitswert gegenüber Grundvermögen, Grunderwerbsteuer bei Hofübergabe, keine Erbschaftsteuer in AT
   - Grundverkehr (z. B. NÖ GVG: über 2 ha genehmigungspflichtig)
   Ergebnis: PDF-Checkliste mit Fragen an den Anbieter.
   Alleinstellung: Kein Versorger veröffentlicht Pachtzahlen. Die LK warnt, hat aber kein digitales Werkzeug.
   Risiko: § 2a UWG, also keine Versorger namentlich negativ nennen. Interessenkonflikt offenlegen (wir sind selbst Pächter). Steuerteil nur als Hinweis mit Verweis auf Steuerberatung.
3. ElWG-Navigator Energiegemeinschaften mit datumsgenauem Netzentgelt-Rechner | AT | Wirkung sehr hoch | Aufwand mittel
   Inhalt: Öffentliche Version von eg/netzentgelt.js und ersparnis.js:
   - Modelle EEG lokal/regional, BEG, GEA, P2P, EVA
   - Netzebene und Datum
   - Übergangslücke Okt.–Dez. 2026, Werte ab 2027 als Platzhalter
   - Elektrizitätsabgabe nach Kundentyp
   - Regeln: Mehrfachteilnahme bis 5, 10-%-Quote bei Gemeinden, Lieferantenpflichten
   Daraus wird ein Ratgeber-Cluster (P2P, EVA, Netzentgelte 2027). Die Rechner /rechner/energy-sharing und /energiegemeinschaften/rechner werden zusammengeführt.
   Alleinstellung: Engine mit Testvektoren liegt schon vor. Die Koordinationsstelle erklärt nur, sie rechnet nicht.
   Risiko: SNE-VO 2027 ist offen. Sofort nach Kundmachung aktualisieren. Keine Rechtsberatung.
4. Rechtsstand-Register AT (src/lib/recht/at.js) plus öffentlicher Rechtsstand-Monitor mit Fristenkalender | AT | Wirkung hoch | Aufwand mittel
   Inhalt: Eine einzige Datenquelle für alle AT-Werte, jeweils mit gültig ab/bis, Status (gesichert/Entwurf/Platzhalter), Primärquelle und Prüfdatum. Öffentlich: Änderungsliste, Beschleunigungsgebiete je Bundesland und IZ- bzw. Gebotstermine als ICS-Datei. Erinnerungen und Newsletter nur mit Double-Opt-in.
   Alleinstellung: Grund wiederzukommen und Anlass für Medienzitate. Die Fehlerklasse „AT rechnet mit DE-Wert“ wird damit strukturell beseitigt.
   Risiko: Ohne festen Verantwortlichen und Prüfintervall veraltet auch das Register.
5. EAG-Marktprämien- und Förder-Monitor (/marktdaten/oesterreich) | AT | Wirkung hoch | Aufwand klein bis mittel
   Inhalt: Alle Gebotstermine seit 2022 (Volumen, Höchst- und Grenzpreis), Referenzmarktwert monatlich, IZ-Calls mit Sätzen, Day-Ahead AT (Energy-Charts bzn=AT, CC BY 4.0). Ergänzt die DE-EEG-Zeitreihe zu einem DACH-Vergleich.
   Alleinstellung: Keine konsolidierte öffentliche Zeitreihe in AT. Ein Linkmagnet für Fachpresse und Investoren.
   Risiko: Gering. Nur Primärquellen (OeMAG, E-Control), keine eigenen Durchschnittswerte erfinden.
6. Gemeinde-Paket AT: Widmungskit, EABG, ElWG-Sozialquote und Bürgerbeteiligung | AT | Wirkung hoch | Aufwand mittel
   Inhalt: Eigene AT-Variante der Kommunen-Seite: Widmungsweg je Land, EABG-Vorschlagsrecht und Beschleunigungsgebiete, Gemeinde-EG mit 10-%-Quote, Bgld-PV-Abgabe, Musterbeschluss. Lead: Gemeinde-PDF.
   Alleinstellung: Gemeinden sind der Engpass bei der Widmung. Kein Projektierer hat ein strukturiertes AT-Angebot für sie.
   Risiko: Mustertexte rechtlich prüfen. Beteiligung nach AltFG, KMG und ECSP-VO nur über lizenzierte Partner. Keine Vorteilsgewährung.
7. Netz- und Gewerbestrom-Atlas AT, ausbaufähig zum Netzkapazitäts-Radar | AT | Wirkung hoch | Aufwand groß
   Inhalt: Netzentgelte je Netzbereich und Netzebene aus der SNE-VO, Elektrizitätsabgabe, Förderbeiträge, Vorschau 2027 (Leistungspreis, SNAP). Erfüllt den Inhaberwunsch „Gewerbestrom je Region“ legal. Lead zunächst nur über die Warteliste Reststrom AT. Den UW-Status nach § 99 ElWG nur verlinken, mit Stand-Datum.
   Risiko: Den E-Control-Kalkulator nicht scrapen. Daten von ebutilities.at und Netzbetreibern erst nach schriftlicher Zustimmung übernehmen (§§ 76c ff. UrhG). Kein Angebot suggerieren, das es nicht gibt.
8. Partnerkanäle mit staatlicher bzw. Verbands-Reichweite | AT | Wirkung hoch | Aufwand klein
   Inhalt:
   - Listung im Dienstleisterverzeichnis energiegemeinschaften.gv.at (61 Anbieter, laut Auswertung kein großer Versorger)
   - Flächennutzer-Profil auf pv-boerse.at
   - Mitgliedschaft PV Austria und TPPV
   - LK-, LFI- und KEM-Vorträge
   - Versorger als Käufer in der Projektbörse statt als Gegner
   - je Kanal UTM-Kennung und Herkunftsfeld
   Risiko: Kodex-Pflichten einhalten. Keine LK-Logos oder Behauptungen einer „Partnerschaft“ ohne Vertrag. Keine Versorger-Teilnahme behaupten, solange kein Vertrag besteht.
Nachrangig: EG-Kostenvergleich (hohes UWG-Risiko, erst nach juristischer Prüfung), Einspeisetarif-Monitor (Pflegeaufwand), Großspeicher AT (SNE-G-V ist Entwurf), Agri-PV AT (siehe Quick Wins), eegfaktura-Migration.

2) KRITISCHE FEHLER IM BESTAND (sofort beheben)
- src/lib/invest/markt.js Z. 232/239 und rechner/pacht.js, pachtangebot.js Z. 117, rechner/pacht/page.js Z. 100/113/115: AT rechnet mit DACH-Spanne, Destatis 380 € und EEG 4,8 ct. Das widerspricht dem Ratgeber (3.000–5.000).
- src/lib/rechner/flaechencheck.js Z. 74 / 83 / 107: Größenbonus ohne Landesdeckel, d. h. 30 ha in NÖ außerhalb einer Zone wirken „gut“. Dazu der DE-Konversionstext und eine zu weiche Überschwemmungsregel (in NÖ und Ktn ist HQ30 bzw. rote Zone unzulässig).
- src/app/kommunen/page.js Z. 55: falsche UVP-Aussage. Z. 21/26: Meta nur DE bei areaServed AT.
- markt.js Z. 506–541, components/Gemeinschaft/laender.js Z. 56, rechner/energy-sharing/page.js:
  - Elektrizitätsabgabe 0,82 ct gilt auch für Haushalte (2026 richtig: 0,1 ct)
  - NE 4/5 −64 % fehlt
  - Übergangslücke nicht erwähnt
  - „Details offen“ ist veraltet
  - GEA, P2P und EVA fehlen
  - der Kommentar „Regeln ab 1.10.2026“ ist irreführend
- src/data/unternehmen.js Z. 171: Salzburg-AG-Satz ins Präteritum setzen (UWG-Risiko, auch in EN-Seiten und JSON-LD prüfen).
- src/lib/rechner/netzanschluss.js Z. 115/139/148: DE-Ertrag und DE-Paragrafen für AT. Die alten Entgeltbegriffe ersetzen durch Netzanschlussentgelt § 130 ElWG, flexiblen Netzzugang, Spitzenkappung ≥ 70 % und VIB ab 2027.
- src/content/ratgeber/freiflaechen-pv-oesterreich.js:
  - Z. 107: Sbg ist eine Kennzeichnung, keine Widmung
  - Z. 108: Ktn ohne 100-m²-Schwelle
  - Z. 109: Tirol über 250 kWp TEG ohne Widmung
  - Z. 21/208: Begriff VIB statt „Netzentgelt“
  - Z. 64/164: EABG = BGBl. I 47/2026 vom 01.07.2026, Verfahrensteil ab 01.01.2027
- src/app/landwirte/page.js Z. 75/142 und agriPv.js Z. 60: GAP-Logik nur DE. Für AT fehlt die AMA-Regel (jährliche ortsübliche Bewirtschaftung, Flächenverlust max. 15 %).
- src/app/energiegemeinschaften/page.js: Die Meta beginnt mit § 42c EnWG, Titel „DACH“, kein ElWG auf der Hauptseite des AT-Kerngeschäfts.
- src/lib/plattform/eg/foerder.js: Die IZ-Sätze 2026 stehen noch als „zu bestätigen“, obwohl sie feststehen (A 150 / B 140 / C ≤130 / D ≤120 €/kWp, Speicher 150 €/kWh, max. 30 %).

3) QUICK WINS (≤ 1 Tag je Punkt)
- Vor dem 8.10.2026: Hinweis auf den 3. EAG-IZ-Call (8.–22.10.2026) mit Sätzen, Vorbedingung (Genehmigungen und Zählpunktangebot) und CTA. Zeitkritisch.
- Kommunen-FAQ zur UVP korrigieren. Salzburg-AG-Satz ins Präteritum.
- markt.js: PACHT.at (3.000–5.000, LK Stmk 05/2022) und Acker/Grünland AT (364/257, Statistik Austria 2024). Das Label „Ø Deutschland“ dynamisch machen.
- Energy-Sharing:
  - Abgabe nach Kundentyp (0,1 / 0,82 ct; ab 2027 1,5 ct)
  - Option −64 % NE 4/5
  - Satz zur Übergangslücke, „vorläufig“-Kennzeichnung
  - Werte aus ersparnis.js übernehmen statt doppelt pflegen
- Flächencheck: Konversionstext je Land (AT: kein 25-%-Abschlag auf vorbelasteten Flächen). Vorläufiger AT-Pflichtschritt „Fläche in Zone/Eignungszone/Vorrangzone/vorbelastet?“ mit Deckelung der Größenwertung.
- /energiegemeinschaften: Block „Was sich seit 1.10.2026 ändert“ und AT-Meta. Auf /software einen „ab“-Preis je Zählpunkt nennen statt „Preise auf Anfrage“ (Wien Energie veröffentlicht Preise).
- Ratgeber AT: Tabellenzeilen Sbg, Ktn und Tirol sowie EABG, VIB und Runde 2/2026 (6,69 ct) aktualisieren.
- Landwirte- und Agri-PV-Seite: AT-Satz zu AMA/GAP mit Quelle.
- /marktdaten: erste EAG-Tabelle 2026 (je 175.000 kWp, Höchstpreis 7,77 ct, Runde 2 Grenzpreis 6,69 ct) mit Stichtag.
- Lexikon: VIB, Spitzenkappung AT, SNAP/WiNAP, P2P (ElWG), EVA, Referenzmarktwert.
- AT-Regionsseiten: FAQ zum Grundverkehr mit RIS-Link. NÖ-Netzlage auf Grundlage einer eigenen Zählung der Netz-NÖ-Tabelle verschärfen.
- Organisatorisch: Listung bei energiegemeinschaften.gv.at beantragen, Profil auf pv-boerse.at anlegen, Herkunftsfeld bzw. UTM je Kanal. Auf den AT-Seiten den Sitz in Oberösterreich (FN 541505g) sichtbar machen.

4) ROTE LINIEN / WARNUNGEN
- Kein Scraping: weder E-Control-Kalkulator noch ebutilities- bzw. Netzbetreiber-Tabellen, Versorger-Preisblätter oder EG-Anbieterseiten (Datenbankrecht §§ 76c ff. UrhG AT). Nur amtliche Quellen (RIS, SNE-VO, OeMAG), manuelle Einzelerfassung mit Datum oder schriftliche Zustimmung.
- E-Control-Schnittstelle: Daten unverändert lassen, nicht mit eigenen Ergebnissen kombinieren, keine Lead- oder Werbeverknüpfung. Logo, Quelle, Abnahme durch die E-Control und Quartalsmeldung sind Pflicht.
- Vergleichende Werbung (EG-Kosten, Pacht, Einspeisetarife) nach § 2a UWG: objektiv, vollständig, aktuell, Interessenkonflikt offengelegt. Vor dem Start juristisch prüfen lassen.
- Versorger-Marken (Wien Energie, EVN, Energie AG, Verbund, Salzburg AG) nicht als Köder in Titeln oder Anzeigen, keine Logos, keine angedeutete Partnerschaft.
- Keine LK-Logos oder Behauptungen „LK-empfohlen“ ohne schriftliche Zustimmung. 3.000–5.000 €/ha nur als historische Angebotsspanne (2022) zitieren. Die „3.500 € Mindestpacht der LK“ stammt aus Niedersachsen (DE).
- Werte 2027 (SNE-VO-Rabatte, Leistungspreise, Speicherbefreiung) und die Beschleunigungsgebiete NÖ, OÖ, T und Sbg nur als Entwurf bzw. Platzhalter mit Stand. Die Senkung der Elektrizitätsabgabe endet am 31.12.2026, also nicht über die ganze Laufzeit mit 2026-Werten rechnen.
- Keine DE-Steuerargumente auf AT übertragen (in AT gibt es keine Erbschaftsteuer). Steuer- und Grundverkehrsaussagen vor der Veröffentlichung von AT-Juristen bzw. Steuerberatern prüfen lassen.
- BEV-Bodenschätzung ist kein Open Data. Nicht anzeigen und nicht exportieren. OSM-Netzdaten unterliegen ODbL Share-Alike.
- INVEKOS nicht mit Eigentümerdaten für Kaltakquise verknüpfen (DSGVO, § 174 TKG 2021). Werbeanrufe nur mit vorheriger Einwilligung. Einwilligungen für PDF-Bericht und Marketing getrennt einholen.
- Bürgerbeteiligung (AltFG, KMG, ECSP-VO) nicht selbst als Plattform anbieten, nur über lizenzierte Partner.
- Kein Reststrom- oder Gewerbestrom-Lead für AT, solange es keinen lizenzierten Lieferanten gibt. Nur Warteliste.
- Kein eegfaktura-Code (AGPL-3.0) in proprietärem Code, nur Anbindung über Datenformate.
- Nicht verifiziert, vor Veröffentlichung prüfen: EVN-Tarife 09/2026, Wien Energie „regional bis 46 %“, § 18 EAG (negative Preise), 50-%-Grenze EEG, Zahl der UW mit 0 MVA in NÖ, Stmk 36 oder 37 Zonen, Similarweb-Werte (nur Schätzungen; Ahrefs- und Similarweb-Konnektoren nicht autorisiert).

Quellen (Auswahl): energiegemeinschaften.gv.at/faqs-zum-elwg/ ; eag-abwicklungsstelle.at/artikel/die-2-ausschreibung-zur-marktpraemie-fuer-pv-anlagen-wurde-mit-10-juli-2026-bezuschlagt/ ; eag-abwicklungsstelle.at/wissen/investitionszuschuss-photovoltaik-und-speicher/ ; ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790 ; ris.bka.gv.at/Dokumente/BgblAuth/BGBLA_2025_I_91/BGBLA_2025_I_91.html ; statistik.at/statistiken/land-und-forstwirtschaft/land-und-forstwirtschaftliche-oekonomie-und-preise/landwirtschaftliche-pachtpreise ; stmk.lko.at/photovoltaik-auf-freifl%C3%A4chen-nicht-alles-ist-gold-was-gl%C3%A4nzt+2400+3639657 ; netz-noe.at/strom/versorgungsgebiete-und-kapazitaeten/kapazitaeten-der-umspannwerke ; pv-boerse.at ; energiegemeinschaften.gv.at/dienstleister-in-oesterreich/ ; wienenergie.at/business/energiegemeinschaften/

Hinweis: Die Konnektoren Similarweb und Ahrefs sowie weitere MCP-Server sind nicht autorisiert. Sie müssen in den claude.ai-Connector-Einstellungen bzw. per /mcp freigeschaltet werden, sonst sind keine echten Suchvolumina für AT verfügbar.

## Team Deutschland
TEAM DEUTSCHLAND – Ergebnis für den Strategie-Rat (Stand 03.10.2026)

Selbst im Code geprüft:
- markt.js:402 setzt die Umlagen auf 1,8 ct. Richtig wären 2,946 ct. Bestätigt.
- markt.js:239 setzt `ackerProHa` auf 380 €/ha. Destatis nennt für Ackerland 407 €/ha. Bestätigt.
- markt.js:154–158 `zuschlagsHistorie` endet mit 1.12.2025. Bestätigt.
- /flaeche-verpachten erwähnt „Speicher“ an keiner Stelle. Bestätigt.
- Die Tabelle in kommunale-beteiligung-6-eeg.js:199–203 nennt nur BB, MV und NI, danach folgt „Übrige Länder: keine Solarregelung“. Der eigene Einleitungstext in Z. 193 nennt aber auch Saarland, Sachsen, Sachsen-Anhalt und Bayern. Damit widerspricht sich die Seite selbst. Bestätigt.
- Vertrauensleiste.js:15 zeigt allen Besuchern nur das AT-Register. Bestätigt.

## 1) Priorisierte Initiativen (Dubletten zusammengeführt)

**I-1 Daten-Rückgrat DE: eine Quelle für alle Marktdaten** [DE | Wirkung hoch, Voraussetzung für I-3 bis I-7 | Aufwand klein bis mittel]
- Die BNetzA-Runden (1. und 2. Segment) werden nur noch in markt.js geführt. Der EEG-Ratgeber übernimmt `RUNDEN` von dort.
- Jahreszahlen in Beschriftungen kommen aus den Daten. Dazu kommen ein Rechtsstand-Register (rechtsstand.js) mit Prüfdatum und eine Build-Warnung ab 90 Tagen.
- Später zieht ein Datenjob automatisch MaStR (open-MaStR nur als internes Werkzeug), Destatis-Regionalstatistik und SMARD.
- Alleinstellung: Verlässlichkeit. Sie ist die Bedingung für Bank- und Presse-Zitate.
- Risiko: gering. Schema-Prüfung und Vier-Augen-Prinzip einbauen.

**I-2 Speicherflächen verpachten DE** [DE | Wirkung sehr hoch | Aufwand mittel]
- Neue Seite /flaeche-verpachten/batteriespeicher mit einem Rechner für Pacht je MW und je ha. Er zeigt Spannen mit Quellen und die Einflussfaktoren: UW-Abstand, Spannungsebene, Baukostenzuschuss, Reifegrad.
- Eine UW-Ampel ist mit Daten der Netzbetreiber nach § 14e EnWG verlinkt bzw. nutzt OSM.
- Querverweise von /landwirte, /grossspeicher und aus dem Flächencheck.
- Grund: Das ist 2026 das heißeste Thema für Landeigentümer, und die Funnel-Lücke ist bestätigt.
- Alleinstellung: mittel. Die belegte Logik eines Entwicklers, der selbst baut und betreibt, ist selten.
- Risiko: Die Spannen streuen extrem (10–80 T€/ha). Keine Lockzahlen, und die Pipeline muss die Leads auch bedienen können.

**I-3 Kulissen- und Flächencheck mit automatischen Geodaten** [DE | Wirkung sehr hoch | Aufwand groß, in Stufen]
- Drei Expertenvorschläge zusammengeführt: Karten-Flächencheck, Flurstück-Kulisse-Check und Kulissen-Check.
- Eingabe per Adresse, Gemarkung oder Kartenpunkt. Geprüft werden automatisch:
  - benachteiligte Gebiete (amtliche Länderdaten: NRW, BB, TH, RLP, NI/HB, BY Energie-Atlas)
  - EEG-Randstreifen bis 500 m
  - Privilegierung nach § 35 Abs. 1 Nr. 8 b BauGB bis 200 m, nur an Autobahn oder zweigleisiger Bahn
  - Schutzgebiete (BfN), Überschwemmungsgebiete, UW-Abstand, MaStR-Bestand im Umkreis, Landesbeteiligungsgesetz
- Das Kurzergebnis ist frei und verlangt keine Personendaten (Parität mit ENLAPA). Ein PDF-Steckbrief kommt per Double-Opt-in.
- Die Scoring-Engine aus docs/AKQUISE-GEODATEN.md wird wiederverwendet.
- Stufe 1 deckt die Länder mit offenen Shapes ab, Bayern folgt später (ALKIS ist dort nicht offen).
- Alleinstellung: sehr hoch. Es verbindet die Geodaten aus 16 Ländern mit der Rechtsfolge.
- Risiko: Lizenzen (ODbL Share-Alike, dl-de/by), uneinheitliche Länderdaten, Gleiszahl in OSM unzuverlässig. Als „Ersteinschätzung, keine Rechtsberatung“ kennzeichnen.

**I-4 Gewerbestrom-Kostenatlas DE (Bundesland → Netzgebiet → PLZ), monatlich** [DE | Wirkung sehr hoch | Aufwand groß]
- Zwei Expertenvorschläge zusammengeführt.
- Kostenbaukasten für die Profile SLP 50 MWh, RLM-NS 300 MWh, RLM-MS 2 GWh. Bausteine:
  - Netzentgelt aus eigener Extraktion der Preisblätter, mit Quell-URL
  - Zuordnung PLZ→VNB aus dem MaStR
  - Umlagen von netztransparenz.de, Konzessionsabgabe, Stromsteuer regulär oder reduziert
  - Beschaffungsindikator aus Energy-Charts bzw. SMARD (CC BY 4.0)
  - Grundversorgungspreis als sachliche Referenz
- Lead über den „Standort-Strombericht“ und einen Rechnungs-Check mit Kündigungsfristen-Wecker (Q4-Anlass: laut BDEW 08/2026 droht bei Neuverträgen ein Preissprung). Übergabe in den Reststrom-Pool.
- Ein Widget für Presse und IHK ist möglich.
- Alleinstellung: sehr hoch. Die Pflege von rund 860 Preisblättern ist der Burggraben.
- Risiko: Datenbankrecht (§ 87b UrhG) erlaubt keine Übernahme von preisblaetter.de oder ene't. EEX-Daten nur mit Lizenz. Vergleiche nach § 6 UWG nur objektiv und mit Datum. Uploads nach DSGVO (AVV, EU-Hosting, Löschfristen).

**I-5 EEG-2027- und Netzpaket-Radar mit Szenario-Schaltern in den Rechnern** [DE | Wirkung hoch bis sehr hoch | Aufwand mittel]
- Drei Expertenvorschläge zusammengeführt: Radar, Überbauungsrechner und CfD-Szenario.
- Seite /eeg-2027 mit dem Verfahrensstand: BT-Drs. 21/7867, Kabinett 29.07., 1. Lesung 24.09.2026, Ausschuss, Beihilfe. Eine Tabelle stellt „gilt heute“ und „Entwurf“ gegenüber.
- Schalter in den Rechnern Solarpark, Netzanschluss und Kommune. Abgebildet werden:
  - CfD bzw. Refinanzierungsbeitrag ab 100 kW
  - 14 GW pro Jahr
  - Agri- und Moor-Bonus 0,5 ct
  - Redispatch-Vorbehalt rund 20 % bis 6 Jahre bei mehr als 5 % Engpass
  - § 6 auf die Gesamterzeugung mit Länderdeckel 0,3 ct
  - PV+Speicher am selben NVP
  - Reifegrad-Score („first ready, first served“), der auch als Filter in der Projektbörse dient
- Ein Alarm-Abo mit Rollenwahl ist der Lead-Magnet.
- Widerspruch aufgelöst: Den 70-%-Anschlussdeckel hat nur eine Quelle (GÖRG). Er kommt nur als optionales Szenario mit Quellenvorbehalt, nicht als Kernlogik.
- Alleinstellung: hoch. Ein öffentliches Werkzeug, das die Entwurfslogik rechnet, gibt es nicht.
- Risiko: Der Inhalt kann sich ändern. Jede Aussage braucht Datum und Entwurfshinweis. Keine Anlage- oder Rechtsberatung.

**I-6 Kommunal-Cockpit mit 16-Länder-Pflichten und Gemeinderatsvorlage als PDF** [DE | Wirkung sehr hoch | Aufwand mittel]
- Drei Expertenvorschläge zusammengeführt.
- Bundesland als Pflichtfeld. Landesregeln: BB 2.000 €/MW/a, MV BüGembeteilG, NI 0,2 ct, ST 0,3 ct (mindestens 2,50 €/kWp), SL SGBG, SN EEErtrBetG (Wert prüfen).
- Weitere Umschalter: erstattungsfähige Menge oder PPA-Menge, EEG-2027-Szenario.
- Dazu Gemeindeauswahl mit MaStR-Bestand und Gewerbesteuer-Schätzung (Hebesatz von Destatis).
- Die Ratsvorlage als PDF gibt es gegen Name, Funktion, Gemeinde und E-Mail (Double-Opt-in).
- Alleinstellung: hoch. Eine vollständige Ländermatrix mit Ratsvorlage bietet niemand an.
- Risiko: Koppelungsverbot (§ 11 BauGB, §§ 331 ff. StGB). Landesrecht ändert sich oft, deshalb Prüfprozess je Land.

**I-7 Solarpark-Atlas je Landkreis plus Zuschlags-Radar** [DE | Wirkung hoch bis sehr hoch | Aufwand groß]
- Drei Expertenvorschläge zusammengeführt. Start auf Landkreisebene, Gemeinden nur ab einer Datenschwelle.
- Inhalte aus amtlichen Daten:
  - MaStR: Freiflächen-PV und Speicher
  - BNetzA-Zuschlagslisten seit 2017, nur aggregiert (die xlsx enthalten Kreis, Gemeinde und Flurstück; geprüft)
  - Kulissenanteil, Destatis 61521 (Kaufwerte, LF), PVGIS-Ertrag, Netzsignal
- Nach jedem Gebotstermin erscheint unter 24 h eine Auswertung je Kreis als Newsroom-Beitrag, Newsletter-Anlass und CSV.
- Dazu kommt der 1-%-Opt-out-Monitor nach § 37c je Land als zitierfähige Kennzahl.
- Alleinstellung: hoch. Der Datenvorsprung wächst mit jeder Runde.
- Risiko: Google-Richtlinie gegen massenhaft erzeugte Inhalte, deshalb Datenschwelle und noindex für dünne Seiten. DSGVO: keine Flurstücke und keine natürlichen Personen. dl-de/by-Namensnennung ist Pflicht. Der Monitor darf keinen Verknappungsdruck aufbauen.

**I-8 Ehrliche Pacht-Positionierung und Zweitmeinung zu Angeboten; danach Stadtwerke-Partnerprogramm** [DE | Wirkung hoch | Aufwand klein, Partnerprogramm mittel]
- Botschaft „Realistische Spanne statt Lockangebot“ mit den Faktoren UW-Abstand, Kulisse und Netz.
- Der Pachtangebot-Check wird zur „Zweitmeinung zu jedem Angebot“ ausgebaut, mit Upload. Konzernnamen werden dabei nicht genannt. Hintergrund: EnBW, RWE und RheinEnergie nennen keine Spannen.
- Phase 2: /stadtwerke mit drei Angeboten: Zugang zur Projektbörse, PPA, White-Label-Werkzeuge.
- Risiko: RDG, also nur wirtschaftliche Einordnung. Der eigene Interessenkonflikt als Pächter wird offengelegt. Beim Partnerprogramm AVV bzw. Art. 26 DSGVO, Kartell- und Vergaberecht beachten.

Kleinere eigenständige Kandidaten für eine spätere Welle:
- Stromsteuer-Entlastungs-Check (Aufwand klein, Prüfung durch Steuerberater)
- Industriestrompreis-Check (KUEBLL-Liste)
- Hof-Agri-PV-Assistent nach § 35 Abs. 1 Nr. 9
- Energy-Sharing-Startklar DE
- Hofstrom-Paket

## 2) Kritische Fehler im Bestand (sofort beheben)

1. **src/lib/invest/markt.js:402 – Umlagen.** Dort stehen 1,8 ct. Richtig sind 2,946 ct (KWKG 0,446, Offshore 0,941, § 19 1,559 für die erste GWh). Folgefehler:
   - Reststrom-Deckel und Pool-Ersparnis sind zu hoch (src/lib/rechner/reststrom.js).
   - Betroffen sind auch /reststrom (Z. 98–118) und /rechner/reststrom.
   - Gefahr: Irreführung.
   - markt.js:395 zusätzlich mit der BDEW-Strompreisanalyse 08/2026 abgleichen: 17,2 ct für kleine und mittlere Industrie.
2. **markt.js:154–158 `zuschlagsHistorie` (Freifläche)** endet 2025. Es fehlen:

   | Runde | Ø | Höchstwert |
   |---|---|---|
   | 1.3.2026 | 4,94 ct | 5,79 ct |
   | 1.7.2026 | 4,79 ct | 5,90 ct |

   Bei Dach fehlt Juni 2026 mit Ø 9,72 ct; `eegDachCt` 9,3 ist zu prüfen. Die Daten widersprechen dem eigenen EEG-Ratgeber. Feste Jahreszahlen stehen in:
   - investoren/page.js:71
   - en/investors/page.js:59
   - rechner/solarpark/page.js:94
   - SolarparkRechner.js:271
   - rechner/dachpacht/page.js:84
3. **markt.js:239 `ackerProHa` 380** ist als Destatis-Wert ausgewiesen, Destatis nennt aber 407 €/ha für Ackerland und 212 €/ha für Grünland. Der Folgefehler steht in ratgeber/solarpark-pacht-pro-hektar.js:144 und :163.
4. **ratgeber/kommunale-beteiligung-6-eeg.js:203** „Übrige Länder: keine Solarregelung“ widerspricht dem eigenen Einleitungstext (Z. 193) und den Regionsseiten. Es fehlen ST AuBG, SL SGBG und SN, Bayern ist zu prüfen. Außerdem nennt **data/regionen/saarland.js:65/170** das SGBG als bloße „Ankündigung“, obwohl es seit 2024 in Kraft ist.
5. **lib/rechner/kommune.js** rechnet nur mit § 6, Gewerbesteuer und Pacht, ohne Landespflichten. Für BB, MV, NI, ST und SL zeigt er deshalb zu niedrige Einnahmen.
6. **lib/rechner/flaechencheck.js** hat vier Fehler:
   - Z. 93: Die 200-m-Privilegierung nennt die Bedingung „Autobahn oder zweigleisige Bahn des übergeordneten Netzes“ nicht.
   - Z. 83: „Konversion = EEG-förderfähig“ wird auch für AT und CH ausgegeben.
   - Z. 79–98: Für Acker außerhalb der Kulisse fehlt der Hinweis „nur Agri-PV-Segment oder PPA“.
   - Z. 146–167: Die Pachtspannen sind für DE, AT und CH identisch, für CH sogar ohne CHF. Das verstößt gegen die Vorgabe der Ländertrennung.
7. **Speicher-Funnel gebrochen:** /flaeche-verpachten und /landwirte nennen Speicher nicht. Der FAQ-Link in grossspeicher-erloese.js:299 führt deshalb ins Leere.
8. **ratgeber/eeg-ausschreibung-freiflaeche.js:** Der Text sagt bei CfD „offen“ (ca. Z. 230); der Regierungsentwurf ist dort nicht nachgezogen. Die eigene Konstante `RUNDEN` (Z. 12–18) ist eine doppelte Datenhaltung.
9. **reststrom/page.js:**
   - Z. 212–216 Stromsteuer: Sie gilt dauerhaft seit 2026, vorher befristet. Antrag beim Hauptzollamt und Mindestverbrauch ergänzen, „bis zu 10.000 €“ formulieren.
   - Die PPA-Aussage „aus Parks der ÖKOVOLT Gruppe“ belegen oder abschwächen (§ 5 UWG).
10. **kommunen/page.js:51** sagt „künftig Energy Sharing“. § 42c EnWG gilt aber seit 01.06.2026.
11. **Vertrauensleiste.js:15** zeigt allen Besuchern nur das AT-Firmenbuch. Auf DE-Seiten die ÖKOVOLT GmbH Solartechnik zeigen (Türkheim, HRB 14166 AG Memmingen, src/data/unternehmen.js:234).
12. **lib/energy.js:7 (aWATTar):** Die Rechte zur kommerziellen Weiterveröffentlichung der EPEX-Daten sind nicht geklärt. Energy-Charts als Hauptquelle behalten.

## 3) Quick Wins (je unter 1 Tag)

- markt.js-Korrekturen 1–3 umsetzen, `RUNDEN` auf markt.js umstellen und Jahreszahlen aus den Daten ableiten.
- Ländertabelle in § 6 und saarland.js korrigieren. Im Kommunal-Rechner zunächst die Bundesland-Auswahl mit BB und ST einbauen, dazu den Hinweis „§ 6 nur für EEG-Mengen erstattet“.
- Textkorrekturen im Flächencheck: 200 m, Konversion nur für DE, Acker außerhalb der Kulisse. Die Pachtspannen getrennt nach DE, AT und CH (CHF) ausweisen.
- Speicher-Abschnitt mit CTA auf /flaeche-verpachten und /landwirte, mit belegter Spanne und Quellen. Damit funktioniert auch der FAQ-Link wieder.
- Block „Schon ein Angebot? Kostenlose Zweitmeinung“ mit Link auf /rechner/pachtangebot-check.
- Einheitliche Infobox „EEG 2027 / Netzpaket – Regierungsentwurf, Stand 24.09.2026, nicht beschlossen“ auf /freiflaeche, /kommunen, /investoren, /rechner/solarpark, /rechner/kommune und im EEG-Ratgeber.
- Ratgeber Netzanschluss ergänzen:
  - § 17c-Netzkapazitätskarten
  - 5-%-Schwelle
  - 1. Lesung am 24.09.
  - PV-Abregelung 2025: 2.704 GWh gegenüber 1.394 GWh im Vorjahr
- Auf allen 16 DE-Regionsseiten die Kapazitätskarten der VNB nach § 14e verlinken (mit Stand), die Juli-Zuschläge je Land nennen (BY 429 MW, BW 266, RP 239, NRW 233, NI 225) und auf den nächsten Termin 1.12.2026 hinweisen.
- Prototyp „Zuschläge in Ihrem Landkreis“ aus 6 xlsx-Dateien, aggregiert und ohne Flurstücke.
- Den Baustein ErgebnisAnfrage auch in die Rechner Reststrom, Kommune und Pacht einbauen. Danach „Bericht per E-Mail“ mit Double-Opt-in. Das Telefon bleibt freiwillig. Heute ist „PDF“ nur Browserdruck (Werkzeuge.js:141).
- Q4-Hinweis auf /reststrom zum Kündigungstermin 31.12., mit Formularfeld für den Kündigungstermin.
- DE-Seiten zeigen die deutsche Gesellschaft mit Ansprechpartner und Telefon.
- Newsletter- bzw. Alert-Anmeldung auf öffentlichen Seiten (heute keine), segmentiert nach Landwirt, Kommune, Investor und Mittelstand.

## 4) Rote Linien

- EEG 2027, Netzpaket und AgNes sind Entwürfe. Jede Aussage braucht Datum und Entwurfshinweis. Die Quellen widersprechen sich (6 oder 7,5 Jahre; 70-%-Deckel nur bei einer Quelle). Das Agri-PV-Untersegment (9,5 ct) ist beihilferechtlich nicht freigegeben und darf nicht als Standardwert in Rechner.
- Keine Übernahme fremder Datenbanken: preisblaetter.de, ene't, 14a-atlas, Check24/Verivox und Versorger-Rechner (§ 87b UrhG und Nutzungsbedingungen). EEX nur mit Lizenz.
- Lizenzen einhalten:
  - MaStR, Destatis und BNetzA: dl-de/by-2-0 mit Namensnennung
  - OSM: ODbL Share-Alike
  - open-MaStR: AGPL, nur intern als Werkzeug
  - Landes-Geodaten: je Land einzeln prüfen
- DSGVO:
  - Keine Flurstücke und keine natürlichen Personen aus Zuschlagslisten oder MaStR veröffentlichen.
  - Leads nur mit Double-Opt-in und Protokoll (Art. 6 Abs. 1 lit. a DSGVO, § 7 UWG).
  - Keine Vorauswahl bei Einwilligungen, Telefon freiwillig.
  - Uploads nur mit AVV und EU-Hosting.
- Keine Rechts-, Steuer-, Förder- oder Anlageberatung (RDG, StBerG). Ergebnisse als Ersteinschätzung kennzeichnen.
- Freie Netzkapazität nie ohne Daten des Netzbetreibers behaupten. Die Ampel heißt „Netzsignal“.
- Keine Lockzahlen. Wettbewerberwerte wie „bis 5.000 €/ha“ oder „20–30 T€/ha Speicher“ nicht als eigene Aussage übernehmen. Vergleiche nur nach § 6 UWG. Keine Marken oder Logos von Versorgern.
- Programmatische Seiten nur mit einer Datenschwelle je Seite, sonst noindex (Google-Richtlinie gegen massenhaft erzeugte Inhalte).
- Kommunen: Zahlungen nie an Planungsentscheidungen koppeln (§ 11 BauGB, §§ 331 ff. StGB). Nur § 6 EEG ist privilegiert.
- Keine Verknappungsrhetorik, etwa beim § 37c-Monitor.
- Energy Sharing DE hat keinen Netzentgeltvorteil. Keine Ersparnisversprechen nach AT-Vorbild, und die Abkürzung „EEG (AT)“ immer eindeutig machen.
- Offen bzw. noch zu prüfen:
  - BayWiVG und der aktuelle Satz in Sachsen sind nur über Sekundärquellen belegt.
  - Suchvolumina sind nicht gemessen, weil Ahrefs und Similarweb nicht autorisiert sind. Vor Investitionen über die Google Search Console prüfen.

Quellen:
- https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260818_Solar1.html
- https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/2026/01032026/start.html
- https://www.bdew.de/media/documents/BDEW_Strompreisanalyse_082026.pdf
- https://www.vea.de/newsroom/aktuelles/thema/netztransparenzde-meldet-netzentgeltbasierte-umlagen-fuer-2026
- https://www.gesetze-im-internet.de/eeg_2014/__37c.html
- https://www.enlapa.de/de/grundstueckspruefung
- https://www.topagrar.com/betriebsleitung/news/mehrere-zehntausend-euro-pacht-pro-hektar-land-fur-batteriespeicher-verpachten-c-20011146.html
- https://www.goerg.de/de/aktuelles/veroeffentlichungen/22-09-2026/bundesregierung-beschliesst-netzpaket-kein-anschluss-unter-dieser-nummer

Geprüfte Dateien:
- c:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/invest/markt.js
- c:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/content/ratgeber/kommunale-beteiligung-6-eeg.js
- c:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/flaeche-verpachten/page.js
- c:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Home/Vertrauensleiste.js

## Team Schweiz
TEAM SCHWEIZ: Ergebnis für den Strategie-Rat

Selbst geprüft im Code (am 03.10.2026, nur gelesen):
- Der Flächencheck rechnet für die Schweiz mit der deutschen Logik. In src/lib/rechner/flaechencheck.js bringen eine Fläche ab 20 ha +20 Punkte (Z. 74) und Acker +5 Punkte (Z. 81). Die Netzkosten werden in €/kWp ausgegeben (Z. 120–123), die Agri-PV mit GAP-Anteil gerechnet (Z. 167). Der Text sagt „Flurstücke … Regionalplan“ (Z. 183). Der einzige CH-Eingriff ist ein Infotext mit 0 Punkten und „Außerhalb“ mit ß (Z. 137). Eine CH-Ackerfläche kommt dadurch auf Grün, obwohl unsere eigene Regionsseite sie als kaum bewilligungsfähig bezeichnet.
- Der CH-Ertrag widerspricht sich: 1.050 kWh/kWp in src/lib/invest/markt.js:35 und src/lib/plattform/geodaten/scoring.js:88, aber 1.230 kWh/kWp in src/data/regionen/schweiz.js:19.
- In src/content/ratgeber/freiflaechen-pv-schweiz.js:68 steht „Seit 2025 regelt Art. 24ter RPG“. Der Quellenkopf derselben Datei (Z. 2) und die Regionsseite nennen 01.01.2026. Den Konkurs-Kommentar in src/data/unternehmen.js:330 gibt es ebenfalls.
- Den Rechtsstand selbst habe ich nicht im Web geprüft. Zwei Experten belegen ihn unabhängig voneinander (ARE, Fedlex/lexfind, Pronovo).

1) STÄRKSTE INITIATIVEN (priorisiert, alle Land CH)
1. Vertrauensbasis CH (Pflicht vor allem anderen) | Wirkung sehr hoch | Aufwand klein bis mittel
   - Inhalt: eine sachliche, juristisch freigegebene Klarstellung zur Ökovolt Schweiz AG (Franchisenehmer, Konkurs seit 30.04.2026, gesellschaftsrechtlich getrennt von der ÖkoInvest GmbH). Dazu ein ehrliches Profil „Zielmarkt CH, Projektentwicklung im Aufbau“, revDSG in der Datenschutzerklärung (Art. 19 DSG, EDÖB, Prüfung eines Vertreters nach Art. 14) und echte Präsenzsignale, sobald es sie gibt (Partner, Ansprechperson).
   - Alleinstellung: keine. Ohne diese Basis wandeln sich CH-Besucher aber kaum in Leads, weil Eigentümer und Gemeinden über Moneyhouse und Handelsregister prüfen.
   - Risiko: Haftung, Franchisevertrag und Markenrecht „Ökovolt“ in CH müssen geprüft werden. Keine virtuelle CH-Adresse und keine +41-Nummer, die einen Sitz vortäuschen (UWG Art. 3 lit. b).
2. Gewerbestrom- und LEG-Atlas je Gemeinde aus ElCom-Daten | Wirkung sehr hoch | Aufwand mittel
   - Herkunft: zusammengeführt aus vier Expertenvorschlägen (Strompreisatlas, LEG-Rechner, Gewerbestromvergleich, ElCom-Atlas).
   - Inhalt: Grundversorgungstarife C1–C7 und H4 je Gemeinde aus LINDAS/SPARQL, freie Nutzung (Open Use) mit Quellenangabe. Die Tarife 2027 sind seit 08.09.2026 veröffentlicht (Median Haushalt 26,5 Rp., Energie 11,35 Rp., Netz 10,94 Rp.), Aufschlüsselung nach Komponenten, Mehrjahresverlauf.
   - Je Gemeinde: LEG-Rechnung mit dem echten Netztarif (40 % bzw. 20 % Abschlag nur auf die Netznutzung, ohne Systemdienstleistungen, Stromreserve, Netzzuschlag und Abgaben), Eigenverbrauch/ZEV und der Hinweis „Marktzugang ab 100 MWh: ja/nein“.
   - Lead: PDF-Dossier gegen Name und E-Mail, Telefon optional. Gemeindeseiten werden schrittweise indexiert, nur mit echtem Mehrwert. Die September-Veröffentlichung ist jedes Jahr ein Presseanlass.
   - Alleinstellung: ElCom, Upgrid und wieviel.ch richten sich an Haushalte oder liefern Rohdaten. Gewerbekategorie, LEG-Rechnung, Marktzugang und Projektentwickler verbindet bisher niemand. Der Datenbestand wächst jedes Jahr.
   - Risiko: Vergleiche nach UWG Art. 3 lit. e nur sachlich, keine Ranglisten gegen Werke, kein „günstigsten Anbieter finden“ (unter 100 MWh gibt es keine Wahl). Thin-Content-Gefahr, Pflege jährlich im September.
3. Parzellen- und Flächencheck Schweiz mit eigener Rechtslogik | Wirkung sehr hoch | Aufwand mittel
   - Inhalt: ersetzt den CH-Zweig im Flächencheck. Eingabe EGRID oder Adresse, Abfrage über die geo.admin-API, ÖREB und geodienste.ch (Bauzone, Fruchtfolgeflächen, BLN, Moore, Wald, ARE-Hinweiskarte „prüfenswerte Gebiete“ 07/2025, Winterertrag). Ergebnis ist einer von fünf Wegen:
     - (a) Art. 24ter Abs. 1 RPG / Art. 32d RPV, vorbelastetes Gebiet
     - (b) Agri-PV mit Produktionsvorteil (Sonderkultur)
     - (c) Art. 32c RPV, Infrastruktur
     - (d) Dach, ZEV oder LEG statt Freifläche
     - (e) Ausschluss
     Ausgabe in CHF, PDF-Standortdossier gegen Kontakt.
   - Alleinstellung: Eine öffentliche, rechtlich korrekte Vorprüfung auf Parzellenebene gibt es in CH nicht.
   - Risiko: Haftung. Deshalb „unverbindliche Vorprüfung“ und „Hinweiskarte nicht behördenverbindlich“ deutlich zeigen, nie „geeignet“ behaupten. Daten je Kanton unterschiedlich aktuell, Quellenangabe nach den OGD-Bedingungen.
4. Infrastruktur-PV (Art. 32c RPV) als CH-Hauptprodukt | Wirkung hoch | Aufwand mittel
   - Inhalt: zusammengeführt mit dem Programm für vorbelastete Flächen. Kiesgruben, Deponien, Böschungen, Lärmschutzwände, Parkplätze, ARA, ASTRA-Lose (nur als Kooperation mit den Losinhabern). Kombiniert mit Solarcarport (Art. 45a EnG), HEIV-Auktion und LEG-Absatz in der Gemeinde.
   - Alleinstellung: realistischster Freiflächenweg im Mittelland, den niemand bespielt. Ehrlichkeit statt „Solarpark auf Acker“ schafft Vertrauen bei Behörden.
   - Risiko: Wirtschaftlichkeit belegt schwierig (an Nationalstrassen war bis 07/2026 keine Anlage in Betrieb), lange Entscheidungswege, Beschaffungsrecht.
5. Rechtsstand- und Richtplan-Monitor CH mit Pronovo-Auktionsmonitor | Wirkung hoch | Aufwand klein bis mittel
   - Inhalt: versionierte Seite „Was gilt ab wann“: RPG 2 (01.01. und 01.07.2026), Beschleunigungserlass seit 01.04.2026, Rückliefervergütung viertelstündlich ab 01.01.2027 mit Smart Meter, Abregelung bis 3 %, Stromabkommen nur als „geplant“.
   - Dazu ein Status je Kanton zum Richtplan Teil Energie mit Prüfdatum und Quelle, und in /marktdaten alle Pronovo-Runden: 2026 durchweg unterzeichnet, Runde 1 im Schnitt CHF 516,20/kW, Runde 4 vom 18.10. bis 01.11.2026, Höchstgebot CHF 620/kW.
   - Newsletter mit Double-Opt-in. Zusätzlich gueltigBis-Felder an allen CH-Konstanten.
   - Alleinstellung: Neutrale Übersicht über Stichtage und deren Folgen für die Rechner, kombiniert mit den Auktionen in DE, AT und CH auf einer Seite.
   - Risiko: Pflegeaufwand, deshalb Vier-Augen-Prinzip mit einem CH-Energierechtler. Keine Rechtsberatung.
6. Kantonsseiten statt einer einzigen Schweiz-Seite, zuerst 8 bis 10 Kantone | Wirkung hoch | Aufwand mittel bis groß
   - Kantone: BE, LU, ZH, AG, SG, TG, FR, VD, VS, GR.
   - Inhalt je Kanton: Richtplanstand, zuständige Stelle für Bauten ausserhalb der Bauzone, Merkblätter, Planungsschwellen, PVGIS-Ertrag, ElCom-Median, Praxisbeispiele (z. B. Lovatens VD).
   - Dazu eine eigene CH-Eigentümerseite: Baurecht/Dienstbarkeit statt Pacht, BGBB/LPG, Direktzahlungen nach Art. 16 LBV, keine erfundenen CHF-Pachtwerte. Technisch hreflang de-CH, CHF und „ss“.
   - Alleinstellung: Die Suchergebnisse zu „Land verpachten Solar Schweiz“ zeigen heute fast nur deutsche Anbieter mit €- und EEG-Inhalten. Kantonsgenaues Wissen kostet viel Recherche.
   - Risiko: Ohne echten Kantonsbezug gelten die Seiten als Doorway-Pages, Richtpläne ändern sich laufend. Die Suchvolumina sind nicht gemessen (Ahrefs nicht verbunden), deshalb vorher mit der Search Console mit Länderfilter CH prüfen.
7. Agri-PV Schweiz nur für Sonderkulturen, mit Nutzennachweis | Wirkung mittel | Aufwand mittel
   - Inhalt: Rechner und Leitfaden in CHF für Beeren, Obst und Reben (Hagelnetz oder Folientunnel gegen PV-Dach). Ergebnis ist ein agronomisches Konzept als Nachweis für Art. 24ter Abs. 2 RPG. Keine GAP, keine DIN-SPEC-Logik.
   - Alleinstellung: Kein Anbieter rechnet den Nutzennachweis öffentlich.
   - Risiko: wenig Präzedenzfälle, uneinheitliche kantonale Praxis. Belege von Agroscope und ZHAW sind nötig.
8. Marktzugang-Check CH ab 100 MWh mit Warteliste zur Marktöffnung | Wirkung mittel | Aufwand mittel
   - Inhalt: Vergleich Grundversorgungstarif gegen eine offen gelegte Marktpreisspanne. Pflichthinweis „einmal frei, immer frei“, ehrliches Ergebnis „bleiben Sie in der Grundversorgung“, wo es passt. Eigene Logik, ohne die DE-Bestandteile Stromsteuer und BDEW.
   - Risiko: Ein CH-Lieferpartner bzw. eine Bilanzgruppe fehlt. Das Stromabkommen ist politisch offen.

Widersprüche, die ich aufgelöst habe:
- LEG- und EG-Software für CH: Ein Experte schlägt sie als groß angelegte Initiative vor, drei raten ab. Mein Urteil: nicht als Produkt bauen. Der Markt ist besetzt (EKZ, BKW/LEGhub, LEG Manager, OpenLEG), im Schnitt hat eine LEG nur 7,2 Teilnehmende. ÖkoInvest positioniert sich stattdessen als Lieferant von Produktionsanlagen und als Kooperationspartner.
- Französische Fassung (fr-CH): erst nach Initiativen 2, 3 und 6 und nur mit französischsprachigem Vertrieb.
- Alpin-PV: nur als Ratgeber und Vermittlung. Der Solarexpress ist geschlossen und die Projekte entwickeln die Energieversorger.

2) KRITISCHE FEHLER IM BESTAND (sofort beheben)
- src/lib/rechner/flaechencheck.js und src/components/Flaeche/FlaechenWizard.js: CH-Acker und -Grünland erreichen Grün. Ausgabe in €-Pacht, €/kWp und mit GAP (EU-Recht), Begriffe Flurstück/Regionalplan, „Außerhalb“ mit ß. Für Schweizer Nutzer ist das irreführend. (selbst geprüft)
- src/lib/rechner/pacht.js mit src/components/Flaeche/PachtRechner.js, src/components/Agri/AgriPvRechner.js (Z. ~108, 242) und src/components/Rechner/PachtangebotCheck.js: Region CH wählbar, Ausgabe in €/ha, ct/kWh, mit GAP und deutschem Pachtdurchschnitt.
- CH-Ertrag: markt.js:35 und scoring.js:88 nennen 1.050 kWh/kWp, schweiz.js:19 nennt 1.230. Der Ratgeber leitet daraus „unter Österreich“ ab (freiflaechen-pv-schweiz.js:184). (selbst geprüft)
- src/content/ratgeber/freiflaechen-pv-schweiz.js:68: „Seit 2025“ ist falsch, richtig ist 01.01.2026. Art. 32d RPV fehlt, Fassadenanlagen (Art. 32abis RPV) fehlen. (selbst geprüft)
- src/lib/invest/markt.js ca. Z. 546–560 (Energy-Sharing-Rechner CH): Energiepreis 14 Rp. statt 11,35 Rp. (ElCom 2027). Die Netznutzung enthält vom Abschlag ausgenommene Komponenten. 6 Rp. Überschussvergütung gelten nur bis 30 kW, die Standardanlage hat 250 kWp. Der LEG-Vorteil ist dadurch überzeichnet.
- Faktisch falsch:
  - src/data/lexikon.js „Einmalvergütung“: Eine laufende Vergütung gebe es nicht. Die gleitende Marktprämie fehlt. Gleicher Fehler in src/app/en/investors/page.js:59.
  - src/data/lexikon.js „UVP“ ist zu vage. Richtig: über 5 MW, Anh. 21.9 UVPV.
  - Energy-Sharing-Ratgeber, FAQ: „Lieferant frei wählbar in allen drei Ländern“ ist für CH unter 100 MWh falsch.
  - Ebenda: „die Schweiz startet mit der LEG“ ist überholt (rund 1.860 LEG im 1. Halbjahr 2026).
- Veraltet:
  - src/lib/rechner/projektbewertung.js:143 und src/app/freiflaeche/page.js Z. 200–206: Solarexpress als möglicher Weg dargestellt. Er ist seit Auflagefrist 31.12.2025 für neue Projekte geschlossen.
  - src/app/agri-pv/page.js:149: verweist auf die „Raumplanungsverordnung“, massgeblich ist Art. 24ter Abs. 2 RPG.
  - src/app/kommunen/page.js:55: „Nutzungsplanung“ statt kantonaler Ausnahmebewilligung.
- LEG-Regel: src/components/Gemeinschaft/laender.js:79 und src/data/faq.js:111 sagen „20 % über mehrere Ebenen“. Richtig: 20 % bei Nutzung der Transformationsebene. Es fehlen 5 % Mindestproduktion, die Grenze von 36 kV und die Smart-Meter-Pflicht.
- Möglicherweise irreführende Aussagen über die eigene Tätigkeit (UWG):
  - src/app/page.js:98 „3 Länder“
  - src/app/warum-oekoinvest/page.js:256 „Wir arbeiten in … der Schweiz“
  - src/components/Home/Vertrauensleiste.js:14 „Projekte im gesamten DACH-Raum“
  - Pacht-FAQ „im DACH-Raum … €/ha … EEG“ in src/app/flaeche-verpachten/page.js:40/49 und src/app/regionen/page.js:90/145 (selbst geprüft). Gilt nur für DE.
- src/app/datenschutz/page.js: nur DSGVO und österreichisches DSG, kein revDSG, obwohl CH-Leads erhoben werden.
- src/app/reststrom/page.js:57/79: CH-Besucher bekommen nur DE-Logik, die 100-MWh-Schwelle und „einmal frei, immer frei“ fehlen.

3) QUICK WINS (Stunden bis wenige Tage)
- Ratgeber: „Seit 1. Januar 2026“ einsetzen, Art. 32d und 32abis RPV ergänzen. Beschleunigungserlass (seit 01.04.2026) und RPG 2 (01.07.2026) in schweiz.js, im Ratgeber und im Lexikon ergänzen.
- Flächencheck für CH sofort deckeln: Acker oder Grünland ohne Sonderkultur höchstens Gelb, mit Hinweis auf Art. 24ter Abs. 2 und Fruchtfolgeflächen. Grössen- und Acker-Bonus aus. €-Pacht, €-Netz und GAP ausblenden. Begriffe Parzelle/Richtplan, „ss“.
- Pacht-, Agri-PV- und Pachtangebots-Rechner: Region CH ausblenden oder „CH-Werte in CHF auf Anfrage“ zeigen.
- Einen CH-Ertragswert mit Quelle (PVGIS, Methode dokumentieren) zentral in markt.js. schweiz.js und scoring.js lesen ihn daraus. Den Österreich-Vergleich anpassen.
- Energy-Sharing CH auf ElCom 2027 umstellen, Stand und Quelle ausweisen, Rücklieferung bei 250 kWp zum Referenzmarktpreis.
- LEG-Formulierung überall vereinheitlichen. Lexikon (Einmalvergütung, UVP), en/investors und die Lieferanten-FAQ korrigieren.
- Kasten „Ab 1.1.2027“ (viertelstündliche Vergütung, Smart Meter, Abregelung 3 %) und Pronovo-Kasten 2026 mit Countdown zu Runde 4 (Start 18.10.).
- Solarexpress als „für neue Projekte geschlossen“ kennzeichnen. BelpmoosSolar als Fallbeispiel aufnehmen (von rund 25 auf 16,5 ha geschrumpft, Bewilligung frühestens Ende 2027).
- Marktdaten CH 2025 auf 1.333 MW aktualisieren, davon Freifläche 50 Anlagen mit 33,3 MW (Swissolar, 10.07.2026).
- Tätigkeitsangaben präzisieren: „Entwicklung in DE und AT, Schweiz im Aufbau“. Pacht-FAQ auf Deutschland eingrenzen.
- revDSG-Abschnitt in der Datenschutzerklärung. Reststrom-Box für CH (100 MWh, „einmal frei, immer frei“).
- de-CH-Formatierer (1'150, CHF 4000, Rp.) plus ein Test, der ß in CH-Strings findet. hreflang de-CH.
- Prototyp: ElCom-SPARQL-Abfrage (eine Gemeinde, C3) testen und den VESE-Schlüssel für pvtarif.ch beantragen, um den Aufwand des Atlas zu schätzen.

4) ROTE LINIEN UND WARNUNGEN
- Marktgrösse: Freiflächen-PV in CH waren 2025 rund 33 MW. Die CH-Investition begründet sich über Alleinstellung, Daten, Presse und Backlinks, nicht über Leadvolumen. Suchvolumina vor der Priorisierung messen.
- Keine erfundenen CHF-Pachtwerte (Pachtzinskontrolle nach LPG, BGBB). Nur Herleitungen und Verbandsansätze (SBV/Agriexpert, SAV) mit Quelle.
- Keine Ackerbau-Agri-PV in CH bewerben. Fruchtfolgeflächen gelten grundsätzlich als Ausschluss. Die ARE-Hinweiskarte zeigt keine „geeigneten“ Gebiete.
- Strompreise: ElCom-Werte sind Grundversorgungstarife, keine Angebote. Unter 100 MWh kein „Jetzt wechseln“. Werke nicht herabsetzen. Quelle und Datenstand immer nennen.
- Stromabkommen, Marktöffnung, Abnahmepflicht ab 200 kW: nur als „geplant“ mit Datum darstellen, keine Abstimmungsempfehlung.
- HEIV/GMP und LEG/Eigenverbrauch nicht kombinieren, bevor Pronovo/BFE das geklärt hat.
- Konkurs des Franchisepartners: nicht verschweigen, nicht herunterspielen. Wortlaut juristisch freigeben lassen.
- Keine Schein-Präsenz (Adresse, +41) und keine Labels ohne Erwerb. „Die Solarprofis“ setzt einen Sitz in CH/FL voraus.
- Nicht scrapen: kein obeng.ch, sec-energy.ch, tarifdaten.ch oder upgrid.ch. Erlaubt sind ElCom/LINDAS, opendata.swiss, swisstopo/geo.admin (mit Quellenangabe) und pvtarif.ch mit VESE-Lizenz.
- Leads aus CH: Informationspflicht nach revDSG, Opt-in für E-Mail-Werbung (UWG Art. 3 lit. o), Telefon optional, keine Kaltakquise bei Sterneintrag. Grundbuch-Eigentümerabfragen für Serienbriefe je Kanton prüfen.
- Lex Koller bei ausländischen Investoren in der Projektbörse: Prüfpunkt in der Due Diligence vorsehen.
- Französische Seiten nur mit französischsprachiger Bearbeitung der Anfragen und mit Fachlektorat, keine reine Maschinenübersetzung.

Wichtigste Quellen: pronovo.ch/de/foerderung/photovoltaik/auktionen/ ; are.admin.ch (Inkrafttreten Raumplanungsrecht 2026; freistehende-photovoltaikanlagen-de.pdf) ; lexfind.ch/tolv/257906/de ; admin.ch/de/newnsb/1miE201yRzoA (ElCom 2027) ; elcom.admin.ch/de/tarifdaten-und-visualisierungen ; swissolar.ch (Neuerungen 2026) ; strom.ch (Abnahmevergütung ab 2027) ; pv-magazine.de 10.07.2026 (Zubau CH)

## Technik & Ingenieurwesen
TEAM TECHNIK & INGENIEURWESEN – Bündel für den Strategie-Rat (Stand 03.10.2026)

Ich habe vier Kernbehauptungen selbst im Code geprüft. Alle vier stimmen:
- (a) `netzanschluss.js`: `land` wirkt nur in den Tipps (Z. 144–149). Gerechnet wird mit ERTRAG_DE (Z. 57). Der AT-Tipp nennt noch „Netzzutritts-/Netzbereitstellungsentgelte“, der CH-Tipp „über Netzkosten (Swissgrid)“.
- (b) `NetzanschlussRechner.js` Z. 108 zeigt immer „N × 20-kV-System“, auch bei der Ebene „hs“. Die Grafik in Z. 232 unterscheidet die Ebenen richtig.
- (c) `grossspeicher.js`: Z. 55 setzt `netzentgeltBefreit: true` als Standard. Z. 69 setzt bei Co-Location `bkz = 0`, und der Selbsttest in Z. 153 schreibt das fest. Ohne Befreiung rechnet Z. 93 das Netzentgelt in ct/kWh auf den Ladestrom.
- (d) `solarpark.js` Z. 85 rechnet jede kWh mit `Math.max(Zuschlag, Marktwert)`, ohne § 51 EEG. `markt.js` Z. 443 nennt selbst `negativAnteilSolar 0.241`, die Seite `rechner/solarpark/page.js` Z. 79 schreibt dagegen „einige Prozent“. REGIONEN (Z. 30–35: 960/1020/1000/1100/1120/1050) und BAUART ostWest 0,92 / tracker 1,15 sind bestätigt.

Websuche habe ich selbst nicht durchgeführt. Mehrere Experten melden ein erschöpftes Suchbudget. Ihre Rechtsangaben (Netzpaket, AgNes, MiSpeL, ElWG, Art. 13e StromVV, EU-Gebäuderichtlinie Art. 14, UVPV CH) sind deshalb vor der Umsetzung von den Energierechtlern DE/AT/CH zu prüfen.

Zwei Widersprüche zwischen den Experten habe ich aufgelöst:
- **Höhere PVGIS-Erträge gegen geschöntes Bild.** Die Ertragsbasis wird nur zusammen mit dem Abschlag für negative Preise (§ 51/51a EEG), Verfügbarkeit und LID angehoben. Andernfalls steigen alle Renditen, und das verletzt die Leitplanke „keine Fake-Zahlen“.
- **Drei Kartenideen** (Netz-Lagebild, Trassen-Vorplaner, Speicherflächen-Check mit Umspannwerk-Radius) und **zwei Lagebilder** (Flächen-Restriktionen, Netz) kommen auf eine gemeinsame Geo-Plattform (Karte + offene Geodienste + OSM power=substation). Sie werden nicht getrennt gebaut.

## 1) Die stärksten Initiativen, priorisiert

**P1 · Eine Datenquelle und echte Ländertrennung im Rechenkern (DACH) | Wirkung sehr hoch | Aufwand mittel**
- **Inhalt:** Je Land eigene Parametersätze in `markt.js` für Netz, Erlöse, Förderung, Währung, Pacht, Strompreis und GAP:
  - DE: EEG mit § 51/51a.
  - AT: EAG-Marktprämie mit § 33-Abschlag, ElWG-Netzanschlussentgelt, MS mit 30 kV.
  - CH: Rechnung in CHF, Einmalvergütung, Art. 13e StromVV, 16 kV/NE 5.
- **Datenbasis:** Die Ertragsbasis wird aus derselben PVGIS-5.3-Tabelle wie die 26 Regionsseiten erzeugt. Ein Selbsttest schlägt fehl, wenn Seite und Rechner mehr als 3 % auseinanderliegen. Ratgeber, Flächencheck und Großspeicher-Ratgeber rufen die Rechenkerne auf (`rechneNetzanschluss`, `rechneSpeicher`) statt eigene Formeln zu nutzen.
- **Betroffen:** Solarpark-, Agri-PV-, Carport-, Dachpacht-, Netzanschluss-, Bestandsanlagen- und Großspeicher-Rechner.
- **Alleinstellung:** Wettbewerber rechnen meist nur ein Land. Das ist die Pflichtgrundlage für alle weiteren Initiativen.
- **Risiko:** Kostensätze für AT/CH sind nur grob belegt, daher als Spannen und „eigene Einschätzung“ ausweisen. Prüfung durch die Energierechtler aller drei Länder.

**P2 · Standort-Ertrag und Marktwert per PVGIS plus Day-Ahead-Preisen (DACH) | sehr hoch | mittel**
- **Inhalt:** Serverseitiger PVGIS-Proxy mit Cache je km-Raster, Abfrage je Bauart (Süd, Ost/West, vertikal bifazial, Tracker, Carport). Monatswerte, ±SD-Band und ha/MWp.
- **Marktwert:** Das Stundenprofil wird mit SMARD-Preisen (CC BY 4.0) bzw. ENTSO-E verrechnet. Ergebnis: Capture Rate, Anteil in negativen Stunden und Erlös je kWp. Damit wird sichtbar, warum Ost/West und vertikal mehr wert sind als ihr kWh-Ertrag.
- **Lead:** Daraus entsteht das PDF „Standort-Ertragsprofil“ gegen Kontaktdaten. Das ist der technische Unterbau für P3–P5.
- **Alleinstellung:** Ehrlicher Standortwert mit offenem Rechenweg statt Pauschalwerten. Long-Tail-SEO „Solarpark Ertrag [Ort]“.
- **Risiko:** Lastgrenzen und Quellenangabe der PVGIS-API einhalten. Hinweis „kein Ertragsgutachten / kein P50“. Unsicherheitshinweis in Alpentälern.

**P3 · Netzanschluss-Check 2.0: Netzpaket-Simulator + Überbauungs- und Speicher-Optimierer (DE zuerst, dann AT/CH) | sehr hoch | mittel bis groß**
- **Schalter „Rechtsstand“:** heute / Netzpaket-Entwurf ab 1.1.2027 / final. Abgebildet werden:
  - Anschlussvorrang PV bis 70 % als Basisfall,
  - Redispatchvorbehalt bis 20 % der Jahreserzeugung in kapazitätslimitierten Gebieten,
  - BKZ für Einspeiser als Spanne,
  - 2-Monats-Statusfrist.
- **Optimierer:** 8.760-Stunden-Simulation (Web Worker) mit DC/AC-Verhältnis, Abregelungskurve je Bauart und optimalem Co-Location-Speicher. Abgleich mit der 70-%-Kappung nach ElWG in AT.
- **Alleinstellung:** Kanzleien erklären das Netzpaket nur als Text, einen rechnenden Simulator gibt es nicht. Die Suchnachfrage steigt bis Jahresende.
- **Risiko:** Der Entwurf kann sich ändern. Jeder Wert bekommt das Label „Entwurf, Stand …“ mit Pflicht zur Aktualisierung nach dem Bundestagsbeschluss.

**P4 · Geo-Plattform „Standort-Steckbrief“: Restriktionen, Netz, Umspannwerk, Trasse (DACH) | sehr hoch | groß**
- **Restriktionen** aus offenen Geodiensten (BfN/Länder, data.gv.at, api3.geo.admin.ch) in abgestuften Kategorien statt eines Häkchens:
  - NSG/Nationalpark,
  - Natura 2000 → FFH-Verträglichkeitsprüfung,
  - Wasserschutzzone I/II bzw. III,
  - LSG.
- **Netz:** Abstand zum Umspannwerk (OSM, ODbL), Trassen-Spanne mit Querungen, später ein Netzdruck-Index (MaStR dl-de/by-2-0, netztransparenz) auf Gemeindeebene als programmatisches SEO.
- **Ausgabe:** PDF-Steckbrief mit Datenquelle und Stand je Layer.
- **Alleinstellung:** Datenpipeline mit laufender Pflege, der stärkste Burggraben.
- **Risiko:** Lizenzen je Dienst prüfen, kein Scraping. Ein Index ist nie „Kapazität frei“ und nie eine Netzbetreiber-Auskunft. Kritische Infrastruktur nicht über OSM hinaus darstellen.

**P5 · Speicherflächen-Check (§ 35 Abs. 1 Nr. 11/12 BauGB, 200-m-Band zum Umspannwerk) (DE) | sehr hoch | mittel**
- **Inhalt:** Eigener Funnel für Eigentümer, Landwirte und Gemeinden mit Ampel für:
  - das 200-m-Band (ab 4 MW),
  - die EE-Kopplung nach Nr. 11,
  - einen Hinweis auf den Deckel von 0,5 % der Gemeindefläche,
  - die Pachtspanne nur mit Quelle und Datum.
- **Lead:** Mit Entfernung zum Umspannwerk, Spannungsebene und ha. Baut auf P4 auf, ein Schnellstart ist auch allein möglich.
- **Alleinstellung:** Größter ungenutzter Lead-Hebel. Flächen-Funnels erwähnen Speicher heute gar nicht.
- **Risiko:** OSM ist unvollständig, daher als Vorprüfung kennzeichnen. Pachtwerte nicht als eigenes Angebot darstellen (Irreführung). Formulierungen juristisch prüfen.

**P6 · Netzanschlussbegehren-Assistent mit Fristenwächter (DACH) | sehr hoch | mittel**
- **Inhalt:** PDF-Paket mit Checkliste:
  - DE: VDE-AR-N 4110/4120, § 8/§ 8a EEG,
  - AT: TOR Erzeuger, ElWG,
  - CH: Art. 13e StromVV.
- **Lead:** Fristen-Mails mit Double-Opt-in. Vorqualifizierter Lead ins CRM mit MW, Land und Netzstatus.
- **Alleinstellung:** Netzbetreiberunabhängig, bindet Nutzer über Monate.
- **Risiko:** Keine Rechtsberatung, keine nachgebauten Netzbetreiberformulare oder Marken, nur auf das Original verlinken.

**P7 · Genehmigungs-Navigator + Gemeinde-Werkzeugkasten (DACH) | hoch bis sehr hoch | groß**
- **Navigator:** Verfahrensweg je Land, Bundesland und Kanton, nötige Gutachten, UVP-Prüfschritt (UVPG Nr. 18.7) und Dauer aus PHASEN.
- **Gemeinde-Paket:** Muster-Kriterienkatalog, städtebaulicher Vertrag (§ 11 BauGB mit Rückbaubürgschaft), Gemeinderatsfolien, Brandschutz-/Akzeptanz-Kit für Speicher mit konkreten Normen.
- **Alleinstellung:** Kein Projektierer bietet das länderscharf.
- **Risiko:** RDG, Haftungshinweis. Muster dürfen nicht einseitig sein. Brandschutzinhalte nur nach Freigabe durch einen Sachverständigen.

**P8 · Regulierungs- und Rechtsstand-Radar DACH (Netz, Speicher, Umwelt, Ladepflicht) | hoch | klein**
- **Inhalt:** Datierte Einträge mit Status Entwurf/final/in Kraft, Quelle und Prüfdatum zu:
  - Netzpaket, AgNes, MiSpeL, BKZ-Festlegung,
  - ElWG/SNE-VO 2027, StromVV,
  - EABG, UVP-G,
  - EU-Gebäuderichtlinie Art. 14.
- **Kopplung:** Die Werte steuern `markt.js` und Banner in den Rechnern. Dazu ein Newsletter-Segment mit Double-Opt-in.
- **Alleinstellung:** Aktualität als Burggraben, bringt Backlinks und Wiederkehrer.
- **Risiko:** Vier-Augen-Prinzip mit der Rechtsabteilung und eine feste verantwortliche Person.

Als **zweite Welle** empfohlen:
- BESS-Finanzierungsmodus (Tolling-Anteil, DSCR, Augmentation, Stressfall Regulierung)
- Ladepflicht-Check für Parkplätze (Aufwand klein, braucht aber erst den geprüften Umsetzungsstand der EU-Gebäuderichtlinie)
- Ratgeber-Cluster: Carport-Bau (Überkopfverglasung DIN 18008, Fundament, Genehmigung je Land), Dach-PV/Statik/Asbest, Bodenschutz (DIN 19639)
- Cable-Pooling-Börse in der Projektbörse
- Speicher-Spread-Monitor (SMARD)
- Ertragsvergleich für Bestandsanlagen

## 2) Kritische Fehler im Bestand (sofort beheben)

**Ländermischung: AT/CH zeigen deutsche Ergebnisse**
- `src/lib/rechner/netzanschluss.js`
- `solarpark.js` (EEG 4,8 ct und € auch für AT/CH)
- `agriPv.js` (GAP 250 €/ha DE und PPA DE)
- `carport.js` und `dachpacht.js` (EEG-Dach 9,3 ct, Strompreis DE, € statt CHF)
- `grossspeicher.js` (nur EnWG/Bayernwerk)

**Negative Preise fehlen**
- `src/lib/rechner/solarpark.js` Z. 85 und `agriPv.js` Z. ~67: Ohne § 51/51a EEG wird der IRR deutlich überschätzt.
- `src/app/rechner/solarpark/page.js` Z. 79 „einige Prozent“ widerspricht dem eigenen Wert von 24,1 % (`markt.js` Z. 443).

**Großspeicher: Netzentgelt und BKZ**
- `src/app/grossspeicher/page.js` Z. 57/112 und `grossspeicher.js` Z. 55: „20 J. ohne Netzentgelte“ und Standard „befreit“. Laut AgNes-Entwurf (06.08.2026) gilt der Vertrauensschutz nur bei Inbetriebnahme oder FID vor 01.01.2027.
- Der Gegenfall ist falsch strukturiert: ct/kWh statt Kapazitätsentgelt in €/kW·a.
- `grossspeicher.js` Z. 69 und Selbsttest Z. 153: Co-Location rechnet ohne BKZ, aber mit Netz-Arbitrage und aFRR. Das widerspricht `netzanschluss.js` Z. 93–95.
- `dauerFaktor` (bis ×1,35) wird auch auf FCR/aFRR angewendet.
- Der Regler „Vollzyklen“ verändert keine Erlöse.

**Netzanschluss**
- Das Netzpaket fehlt in Rechner und FAQ. Die Sätze „kein BKZ für Einspeiser“ und „Kosten trägt er (§ 17 EEG)“ brauchen den Zusatz „nach heutigem Recht“.
- AT-Tipp veraltet (ElWG, BGBl. I Nr. 91/2025). CH-Tipp und CH-Absatz im Ratgeber `netzanschluss-solarpark.js` ohne Art. 13e StromVV (widerspricht `regionen/schweiz.js` Z. 106).
- `NetzanschlussRechner.js` Z. 108: „N × 20-kV-System“ auch bei 110 kV.

**Ertragsbasis**
- `src/lib/invest/markt.js` Z. 30–35: REGIONEN bis 17 % unter den eigenen Regionsseiten (CH 1.050 statt 1.230).
- Z. 43/44: Ost/West-Faktor 0,92 (PVGIS zeigt 0,82–0,85), Tracker 1,15 optimistisch.
- Folgefehler in `bestandsanlage.js` Z. 98–101: Bestandsanlagen erscheinen zu gut. Das ist ein Haftungsrisiko im Zweitmarkt.

**UVP-Aussagen widersprüchlich**
- `src/content/ratgeber/freiflaechen-pv-oesterreich.js` Z. 156 („ab 10 ha vorprüfungspflichtig“) ist falsch. Richtig nach UVPG Nr. 18.7: ab 10 ha zulässiger Grundfläche UVP-Pflicht, 2–10 ha allgemeine Vorprüfung.
- `solarpark-genehmigung-bebauungsplan.js` Z. 321 ist irreführend.
- AT-Texte mit „UVP ab Schwellenwert“ in:
  - `app/kommunen/page.js` Z. 55,
  - `lib/plattform/flaecheErklaerung.js:74`,
  - `rechner/projektbewertung.js:140`,
  - `plattform/gemeinde/cockpit.js:41`.

**Weitere fachliche Fehler**
- `src/lib/rechner/flaechencheck.js` Z. 29/101: Ein pauschales Häkchen „Schutzgebiet“ zieht −30 ab, das ist fachlich falsch differenziert.
- `flaechencheck.js` Z. 119: Netzkosten immer als MS-Kabel plus Fix, ohne Umspannwerk/110 kV bei großen Flächen.
- `src/components/Dach/DachpachtRechner.js` Z. 194 und `app/rechner/dachpacht/page.js` Z. 28: Faserzement pauschal „nicht belegbar“. Das kostet Leads und hat keine Länderunterscheidung (DE 1993, AT/CH 1990). Rechtsgrundlage ist § 11 Abs. 3 GefStoffV.
- `src/app/freiflaeche/page.js` Z. 117: „oft artenreicher als der Acker“ ist eine Umweltaussage ohne Beleg. Das UWG nach EU-Richtlinie 2024/825 gilt seit 27.09.2026.
- `src/components/Speicher/Seite/Modelle.js` Z. 21: MiSpeL ist überholt, die Festlegung gilt seit 01.10.2026.

## 3) Quick Wins (je unter 1 Tag)

- **Banner bei AT/CH** in allen betroffenen Rechnern: „Berechnung auf DE-Basis, Länderlogik folgt“, oder EEG-Modell für AT/CH sperren.
- **20-kV-Label korrigieren:** Bei `ebene === 'hs'` „110-kV-Anschluss / eigenes UW“ anzeigen.
- **Netzpaket-Hinweis** im Rechner, in der FAQ und am Regler für die Anschlussleistung („Entwurf: Anschlussvorrang künftig bis 70 %“), mit Link auf den Ratgeber.
- **Tipps aktualisieren:** AT auf ElWG-Begriffe, CH auf Art. 13e StromVV (max. CHF 50/kW). Den CH-Absatz im Ratgeber angleichen.
- **Großspeicher:**
  - Faktenleiste und FAQ auf den AgNes-Entwurfsstand bringen, Standard auf „FID vor 2027: nein“ stellen.
  - Co-Location aufteilen in „nur PV laden“ und „mit Netzbezug + BKZ“.
  - `dauerFaktor` nur auf die Arbitrage anwenden.
  - MiSpeL-Satz aktualisieren.
  - § 35 Nr. 11/12 und einen CTA „Fläche nahe Umspannwerk?“ in `Netz.js` ergänzen.
  - Normen in `Technik.js` nennen.
  - Warnung bei MS über 20–30 MW.
  - Formularfelder ergänzen: Entfernung zum Umspannwerk, ha, Netzzusage.
- **Solarpark-Text** „einige Prozent“ auf rund 24 % korrigieren und § 51/51a kurz erklären. Optionaler Regler „Anteil ohne Vergütung“.
- **REGIONEN anheben nur zusammen mit dem Negativpreis-Abschlag.** Ost/West auf ≈0,86, Tracker auf ≈1,11. PVGIS-Basis im Kommentar dokumentieren (Version, SARAH3 2005–2023, 14 % Verluste, Abrufdatum).
- **UVP-Textbaustein je Land vereinheitlichen.** Schutzgebiet in vier Stufen aufteilen. Biodiversitätsaussage mit Quelle belegen und vorsichtiger formulieren.
- **Dach und Faserzement:** Text zu asbesthaltig gegenüber asbestfrei korrigieren. Statikampel im Portal (`flaecheFach.js` Z. 581) umformulieren auf „deckt Eigengewicht; Schnee- und Windnachweis ausstehend“.
- **Kleinkorrekturen:**
  - `SolarparkSchnitt.js` „vollständig ziehbar“ relativieren.
  - Lexikon `umspannwerk`: Synonyme Übergabestation/Trafostation entfernen.
  - Schwellen MS/UW/HS zwischen Ratgeber und `markt.js` angleichen.
  - Kanton-Bern-Pflicht (KEnG ab 80 Plätzen) in die FAQ auf /solarcarport übernehmen.
- **„Rechtsstand geprüft am“** mit Quellen auf allen Umwelt- und Genehmigungsseiten anzeigen.
- **Lead-Strecke im Netzanschluss-Rechner:** PDF mit Begehren-Checkliste gegen Kontaktdaten und Rolle, mit DSGVO-Einwilligung.

## 4) Rote Linien und Warnungen

- **Entwürfe sind kein geltendes Recht.** Netzpaket (1. Lesung 24.09.2026) und AgNes (Konsultation bis 18.09.2026) immer als „Entwurf, Stand …“ kennzeichnen und nach dem Beschluss sofort nachziehen. Falsche Rechtsaussagen in Rechnern sind haftungsrelevant.
- **Keine schönere Rendite durch einseitige Korrekturen.** Höhere Erträge nur mit Negativpreis-, Verfügbarkeits- und LID-Abzug. Alle PDFs mit Spannen, Stand und dem Hinweis „kein Gutachten, keine Finanzierungszusage, keine Anlageberatung“. Bei Privatanlegern Prospektrecht prüfen.
- **Daten nur lizenzkonform.** SMARD (CC BY 4.0), MaStR (dl-de/by-2-0), OSM (ODbL, Share-Alike), geo.admin. Fremde Indizes (ISEA, Enervis, battery-charts) nur zitieren, kein Scraping von Netzbetreiber- oder Geoportalen. Normtexte (DIN, ÖNORM, SIA, VdS) nur zusammenfassen.
- **Keine Zusagen.** Kein Netzdruck-Index und keine Kapazitätsampel als Netzbetreiber-Auskunft oder „Kapazität frei“. Keine kritische Infrastruktur über OSM hinaus.
- **Keine Rechtsberatung** (RDG). Navigator, Begehren-Assistent und Muster sind Orientierung. Keine nachgebauten Netzbetreiberformulare oder Marken.
- **Kein Ersatz für Statik.** Statik- und Brandschutz-Vorchecks ersetzen keinen Tragwerksplaner oder Sachverständigen. Brandschutzinhalte vor Veröffentlichung freigeben lassen. Bei Asbest keine Anreize zur Eigenarbeit (TRGS 519).
- **Umweltaussagen nur belegt.** UWG nach EU-Richtlinie 2024/825 seit 27.09.2026, nur projektbezogen. Kein Monitoring und keine Referenzen ohne reale Parks. bne „Gute Planung“ nur als „unterzeichnet“ bezeichnen, wenn tatsächlich unterzeichnet.
- **Pacht- und Kostenwerte nur mit Quelle.** Speicherpacht 20–30 T€/ha·a, Rückbau 25 €/kWp und DC-Lader 45 T€ nur mit Quelle und als Spanne. Vor PDF-Berichten an Banken oder Gemeinden mit echten Angeboten der Gruppe abgleichen.
- **Nicht im Primärtext geprüft** (Prüfauftrag Energierecht DE/AT/CH vor der Umsetzung):
  - ElWG-Details (70-%-Kappung, Einspeiser-Entgelt über 20 kW),
  - § 51a-Kontingente,
  - Agri-PV-Untersegment EEG,
  - EU-Gebäuderichtlinie Art. 14 (Quoten),
  - UVPV CH über 5 MW,
  - Art. 14a StromVG,
  - Solar-Beschleunigungsgebiete DE nach RED III.

Quellen (Auswahl, von den Experten):
- https://www.gesetze-im-internet.de/eeg_2014/__51.html
- https://www.gesetze-im-internet.de/eeg_2014/__51a.html
- https://www.gesetze-im-internet.de/uvpg/anlage_1.html
- https://www.gesetze-im-internet.de/bbaug/__35.html
- https://www.gesetze-im-internet.de/gefstoffv_2010/__11.html
- https://www.bundestag.de/dokumente/textarchiv/2026/kw39-de-energiewirtschaftsrecht-1211298
- https://cms.law/de/deu/legal-updates/agnes-festlegungsentwurf-der-bnetza-was-sich-bei-netzentgelten-fuer-erzeuger-speicher-und-elektrolyseure-aendern-soll
- https://www.pv-magazine.de/2026/10/01/bundesnetzagentur-beschliesst-mispel-regeln-fuer-speicher-und-bidirektionales-laden/
- https://ris.bka.gv.at/Dokumente/BgblAuth/BGBLA_2025_I_91/BGBLA_2025_I_91.pdf
- https://re.jrc.ec.europa.eu/api/v5_3/PVcalc

Rohdaten der PVGIS-Abfrage: C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/wf5/pvsys/pvgis.json

Von mir geprüfte Dateien (alle unter C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/):
- lib/rechner/netzanschluss.js
- components/Rechner/NetzanschlussRechner.js
- lib/rechner/grossspeicher.js
- lib/rechner/solarpark.js
- app/rechner/solarpark/page.js
- lib/invest/markt.js

## Business & Prozesse
# Team „Business & Prozesse“: Bündel für den Strategie-Rat

**Selbst nachgeprüft am Code (3. Oktober 2026), alle Punkte bestätigt:**
- **AT/CH-PLZ wird abgelehnt.**
  - `AnfrageFormular.js:70` setzt das Land fest auf `land: "DE"`.
  - Z. 87 schickt `land` nur mit, wenn es in `felder` steht.
  - Die Regionsseite (`regionen/[slug]/page.js:417`) übergibt nur `["telefon","plz","ort","nachricht"]`. Das Land steht dort nur in `daten.land`.
  - `pruefung.js:31` verlangt beim Land DE 5 Ziffern. Wer auf den AT- oder CH-Regionsseiten eine 4-stellige PLZ eingibt, kann nicht absenden.
- **Lead-Regeln sind abgeschaltet.** In `bo-seed.js:146–148` stehen drei Regeln auf `aktiv: false`: SLA-Eskalation, Angebot vorbereiten und Eingangsbestätigung.
- **KI-Kanal wird falsch gezählt.** In `herkunft.js:48–49` läuft die Prüfung auf `/google\./` vor der KI-Prüfung. Besuche von gemini.google.com landen deshalb unter „Suchmaschine“.
- **Kein Funnel-Tracking.** `ereignis()` aus `src/lib/statistik.js` wird nirgends aufgerufen.
- **Gemini-Sperre.** `robots.js:30` sperrt „Google-Extended“.

## 1) Die stärksten Initiativen, nach Priorität (Dubletten zusammengeführt)

**I-1 Lead-Router und Speed-to-Lead-SLA** · DACH · Wirkung sehr hoch · Aufwand mittel
- Experten: Vertrieb, Operations, Funnel.
- **Zuständigkeit:** eine Routing-Matrix aus Land × Typ (11 Anfragetypen) × Größe (ha, MWp, MWh, GWh/a). Dazu Round-Robin mit Kapazitätsgrenze, Vertretung (`vertretungFinden` gibt es schon) und ein Lead-Desk je Land als Auffangstelle. Damit gibt es keine Anfrage mehr ohne `zustaendigId`.
- **SLA je Typ und Größe:**
  - Großspeicher, Investor und Kommune: 4 Geschäftsstunden
  - Fläche ab 20 ha: am selben Werktag
  - alles andere: 2 Werktage
- **Feiertage und Zeitzone:** Feiertagskalender für DE je Bundesland, AT und CH je Kanton, gerechnet in Europe/Vienna. Die Prüfung läuft alle 15 Minuten statt täglich.
- **Eskalation:** bei 50 % der Frist eine Erinnerung, bei 100 % die Teamleitung, bei 150 % die Geschäftsführung.
- **Was das löst:** Website-Flächen im Status `entwurf` werden mitgezählt. Die Rundmail an alle Admins entfällt.
- **Alleinstellung:** Das Versprechen „fester Ansprechpartner, 2 Werktage“ wird überprüfbar wahr. Später lässt sich eine echte Median-Antwortzeit veröffentlichen.
- **Risiko:**
  - Eine zu feine Matrix bei kleinem Team erzeugt Engpässe.
  - Auswertungen je Mitarbeiter fallen unter die Mitbestimmung (§ 87 BetrVG, ArbVG § 96/96a). Deshalb nur auf Team-Ebene auswerten.
  - Jede Änderung muss parallel in der Demo und in Frappe umgesetzt werden.

**I-2 Länderrichtige Formulare und Daten bis in den Datensatz** · DACH · Wirkung sehr hoch · Aufwand klein
- Experten: Funnel, Vertrieb, Newsletter.
- **Formular:** `AnfrageFormular` bekommt eine Eigenschaft `land`, vorbelegt aus dem Kontext: Regionsseite `r.land`, Flächencheck `eingaben.land`, Kommune `d.land`, Rechner über die Region. Das Land wird als `kontakt.land` gesendet.
- **Server:** übernimmt ersatzweise `daten.land`.
- **Flächencheck:** sendet `ha`, `nutzung` (als ID statt Label), `land` und `bundesland` als flache Felder. Heute legt das Backend die Fläche mit ha = null, Nutzung „acker“ und Land „DE“ an.
- Das ist die Voraussetzung für Routing, Länderlisten, Rechtstexte und Berichte je Land.

**I-3 Rechner als Lead-Maschine: Bericht per E-Mail, strukturierte Daten, Scoring** · DACH · Wirkung sehr hoch · Aufwand mittel
- Experten: 7 von 10 haben das unabhängig vorgeschlagen.
- **Abschluss in allen 16 Rechnern:** heute haben nur 4 den Baustein `ErgebnisAnfrage`. Pacht, Agri-PV und Dachpacht kommen zuerst.
- **Ergebnis frei, Bericht als Zusatz:** Das Ergebnis bleibt ohne Kontaktdaten sichtbar. Zusätzlich gibt es „Bericht per E-Mail“:
  - serverseitiges PDF mit Annahmen samt Quelle und Stand aus `markt.js`, Land, Rechtsstand und Haftungshinweis
  - Pflichtfelder: Name und E-Mail
  - Telefon freiwillig, mit eigener Einwilligung
  - Newsletter als getrenntes Häkchen, nicht vorbelegt
- **Strukturierte Daten:** Die Werte gehen als `daten.rechner {id, version, eingaben, ergebnis, land}` mit, nicht als Freitext.
- **Score:** Daraus berechnet der Server einen Score für Routing und Priorität. Der Mensch entscheidet (Art. 22 DSGVO).
- **Optional:** ein ehrlicher Hinweis, wenn sich eine Annahme in `markt.js` tatsächlich ändert. Nur mit Einwilligung.
- **Alleinstellung:** Länderspezifische Berichte mit Quellen. Der Vertrieb sieht beim Erstanruf die gerechnete Wirtschaftlichkeit.
- **Widerspruch aufgelöst:** Kein Rechner verlangt Telefon als Pflichtfeld. Der Wunsch des Inhabers „gegen Name, E-Mail, Telefon“ wird so umgesetzt: Telefon freiwillig mit eigener Einwilligung (BGH I ZR 164/09: Double-Opt-in belegt keine Einwilligung zum Anruf).
- **Wichtig:** Den Bericht erst ausrollen, wenn die Rechenlogik je Land stimmt (siehe Fehler F6).

**I-4 Einwilligungs- und Zustimmungs-Ledger mit Rechtstexte-Zentrale** · DACH · Wirkung sehr hoch · Aufwand mittel
- Experten: Recht, Operations, Newsletter.
- **Ledger:** speichert nur angehängt (append-only) jede Zustimmung und Einwilligung mit Dokument-ID, Fassung, Hash, Land, Zeitpunkt, gekürzter IP, Kanal und angezeigtem Text. Das gilt für Nutzungsbedingungen, NDA, Newsletter, Telefon und Weitergabe in der Gruppe.
- **Rechtstexte:** werden versioniert je Land DE, AT und CH geführt, mit Vier-Augen-Freigabe. Dazu ein öffentliches Archiv mit Änderungsvergleich unter `/rechtliches`. Bei wesentlichen Änderungen wird aktiv neu zugestimmt, statt eine Zustimmung zu unterstellen.
- **Alleinstellung:** Provision und 24-monatiger Umgehungsschutz der Projektbörse werden vor Gericht belegbar. Das ist der wirtschaftliche Kern.
- **Risiko:** Anwaltskosten in drei Ländern. Abhilfe: ein gemeinsamer Kern plus Länder-Module.

**I-5 Newsletter- und Abo-Zentrale mit datengetriebenem Monatsbrief und Fristen-Wecker** · DACH · Wirkung sehr hoch · Aufwand mittel
- Experten: Newsletter, Marketing, Engagement.
- **Anmeldung:** Double-Opt-in je Land (Pflichtfeld) und Thema. Präferenzzentrum per signiertem Link, Abmeldung mit einem Klick (RFC 8058), Abgleich mit der Akquise-Sperrliste.
- **Start:** mit dem Double-Opt-in aus Frappe v15 (Newsletter und Email Groups je Land × Zielgruppe). Später listmonk selbst gehostet als getrennter Dienst (Lizenz AGPL).
- **Inhalt:** ein Monatsbrief aus `/marktdaten` mit Quelle und Stand, für AT und CH erst ergänzen. Dazu ein Fristen-Wecker (Ende des Stromvertrags, EEG-Gebotstermine, EAG-Fristen, Kalender-Datei). Er ist der natürliche Einstieg in den Reststrom-Pool.
- **Versand:** Pflicht- und Marketing-Mails laufen über getrennte Subdomains mit SPF, DKIM und DMARC.
- **Alleinstellung:** ein Brief mit eigenen Daten statt Werbung. Wiederkehr durch echten Nutzen.

**I-6 Funnel-Messung, dann Tests** · DACH · Wirkung sehr hoch · Aufwand klein bis mittel
- Experten: Funnel, Marketing.
- **Ereignisse:** ein einheitliches Schema über `ereignis()`, nur mit Einwilligung: Einstieg, Wert-Start, Wert-Ergebnis, Formular-Start, Formular-Fehler, Anfrage gesendet.
- **Grundwert ohne Cookies:** eine serverseitige Zählung in `/api/anfrage`.
- **Herkunft korrigieren:** zuerst die KI-Regex, gclid/msclkid nur als Kennzeichen „bezahlt“. Erst- und Letztkontakt am CRM-Kontakt speichern.
- **Danach Tests:** A/B-Tests serverseitig, mit Ideen aus GrowthBook (MIT-Kern), gemessen an „qualifiziert“ statt an Klicks.
- **Reihenfolge ist Pflicht:** Datenfehler beheben, dann messen, dann testen.

**I-7 Newsroom und Daten-PR „Marktmonitor“** · DACH · Wirkung hoch · Aufwand mittel
- Experten: Presse, Marketing.
- **Newsroom:** `/presse` mit Länderfilter, NewsArticle-Schema, RSS, Medienkontakt und Pressekit mit Rechte-Register.
- **Daten-PR:** 24 bis 48 Stunden nach jeder BNetzA-Gebotsrunde eine Datenmeldung mit Grafik und CSV.
- **Dataset-Schema:** um `license`, `distribution` und `version` ergänzen.
- **Lokalpresse:** gemeinsame Meldungen von Gemeinde und ÖkoInvest aus dem vorhandenen Gemeinde-Cockpit.
- **Später:** ein jährlicher „Solarpacht-Report DACH“.
- **Alleinstellung:** Die Zeitreihe seit 2017 und eine Kontinuität über Jahre lassen sich nicht schnell kopieren. Das bringt Backlinks und Zitate in KI-Antworten.
- **Voraussetzungen:** freigegebene Kontaktdaten (heute ist `KONTAKT` in `site.js` null) und mindestens 3 echte Meldungen.

**I-8 Integrität: Hinweisgebersystem, Kennzeichnung von Interessenkonflikten, Verhaltenskodex** · DACH · Wirkung mittel bis hoch · Aufwand mittel
- Experten: Compliance, Recht, Operations, Marketing.
- **Widerspruch aufgelöst: kein Eigenbau im Portal.** Admin- und IT-Zugriff sowie die unlöschbare Hash-Kette widersprechen Anonymität und Löschpflicht (DE 3 Jahre, AT 5 Jahre). Stattdessen:
  - ein zertifizierter Anbieter mit EU- oder CH-Hosting, Mandanten je Gesellschaft und externer Ombudsperson
  - alternativ GlobaLeaks als getrennte Instanz
- **Öffentliche Seite** `/hinweisgeber`, verlinkt im Footer.
- **Projektbörse:** ein Pflichtfeld je Inserat „Gruppenbeteiligung ja/nein“, sichtbar als Badge, im Exposé und im Dealroom. Hohe Alleinstellung.
- **Verhaltenskodex:** Antikorruption mit PV-Bezug (Gemeinden, Prämien an Landwirte).
- **Offene Frage für die Pflicht:** Beschäftigtenzahl je Gesellschaft. Nötig ist ein Kanal aber ohnehin für Banken- und ESG-Prüfungen.

**Zurückgestellt (Wirkung hoch, Aufwand groß):**
- Gewerbestrompreis-Monitor und -Karte aus amtlichen Daten (ElCom/LINDAS, E-Control, Netzentgelte), Energie-live für AT und CH
- Fläche auf der Karte einzeichnen, mit Leaflet und AkquiseKarte aus dem Portal
- Headless-CMS. Dafür ist zuerst eine Architekturentscheidung nötig (Payload mit Postgres neben Frappe).
- Diese Punkte gehören an andere Teams oder in Welle 2.

## 2) Kritische Fehler, sofort beheben

- **F1 AT/CH-PLZ blockiert Leads (bestätigt).**
  - Betroffen: `AnfrageFormular.js:70/87`, `regionen/[slug]/page.js:417` (10 AT/CH-Regionsseiten), `FlaechenWizard.js:857`, `KommuneAnfrage.js:133`, `solarcarport/page.js:239`, die Anliegen in `KontaktAnliegen.js` (agri, reststrom, carport, speicher, kommune, genossenschaft), `ReststromRechner.js:219` und `InvestorAnfrage.js:87` (kein Land-Feld).
  - Zusätzlich: `demo.js` `anfrageAnlegen` und `anfrage.py:100` setzen das Land auf „DE“ zurück.
- **F2 Flächencheck-Daten gehen verloren.** `demo.js` liest `d.ha` und `d.nutzung`, der Wizard sendet aber `daten.eingaben.*` und die Nutzung als Label.
- **F3 Versprechen ohne Prozess.**
  - Die Regeln in `bo-seed.js:146–148` sind `aktiv: false` (bestätigt).
  - Die SLA gilt nur für „flaeche“, nur für die Status eingegangen und vorpruefung, und läuft nur täglich (`automation.js:241`, `hooks.py:185–189`).
  - `berichte.js:196` schließt den Status `entwurf` aus.
  - Neue Anfragen gehen an alle Admins und landen bei manchen im Tages-Digest.
  - Folge: „fester Ansprechpartner“ und „binnen zwei Werktagen“ (`faq.js:192`, `AnfrageFormular.js:19–23/61`) sind Irreführungsrisiken nach UWG.
- **F4 Vertraulichkeitslücke bei Geldwäsche-Meldungen.**
  - `verdachtMelden()` schreibt die `nutzerId` der meldenden Person ins allgemeine Protokoll (`datenschutz.js:299`). Das Protokoll dürfen laut `rechte.js:84/113` fast alle Backoffice-Rollen lesen. Verstoß gegen § 6 Abs. 5 GwG.
  - Dazu stilles Standard-Land „AT“ (Z. 293).
  - Dazu ein Tipping-off-Risiko: Der Text fordert die meldende Person auf, Auszahlungen selbst auszusetzen.
- **F5 Rechtstexte sind Entwürfe, werden aber verwendet.**
  - Nutzungsbedingungen: `ENTWURF=true`, aber `index:true`, und sie müssen bei der Registrierung akzeptiert werden.
  - Keine Fassung und kein Zeitpunkt gespeichert (`registrieren/route.js:11`, `demo.js:327`).
  - Datenschutzerklärung indexiert mit rohen Platzhaltern (Abschnitt 8a, 12) und `KONTAKT.email = null`.
  - Pflicht-„Einwilligung“ für Anfragen (`api/anfrage/route.js:7/11`) widerspricht der genannten Rechtsgrundlage Art. 6 Abs. 1 lit. b/f.
  - Zustimmungsfiktion in § 20 und pauschaler Haftungsausschluss in § 16 Abs. 3 halten gegenüber Verbrauchern nicht.
- **F6 DACH-Trennung in der Rechenlogik gebrochen.**
  - Pacht: `markt.js:230–248` mit einer DACH-Spanne in €. CH wird in € gerechnet, der Hinweis lautet „Durchschnitt Deutschland“ (`PachtRechner.js:102/113`).
  - `/flaechencheck` zeigt deutsche Annahmen und die BNetzA als Quelle auch für AT und CH.
- **F7 Unbelegter Social Proof.** „Beliebt“ (`tools.js:5`), „Hier fangen die meisten an“ (`RatgeberHero.js:83`) und „meistgelesen“ (`Uebersicht.js:30`) beruhen auf keinen Messdaten. Alle 37 Ratgeber tragen dasselbe Datum 2026-09-29.
- **F8 Cookie-Text stimmt nicht.** `cookiecomponent.js:73` sagt, gesendete Formulare würden gezählt. Es wird nichts gezählt.

## 3) Quick Wins (Stunden bis 2 Tage)

1. **Land-Prop in AnfrageFormular** mit Übergabe von Region, Wizard, Kommune und Kontakt-Anliegen. Unbekanntes Land: PLZ mit 4 oder 5 Ziffern zulassen. Server übernimmt `daten.land`. Wizard sendet flache Felder.
2. **Regeln aktivieren:** Eingangsbestätigung, auf alle Typen ausgeweitet, rein transaktional, Vorlage je Land. SLA-Regel auch für die Art „vorgang“, mit der Queue „Zentrale“ als Auffangstelle. Zusätzlich ein Cron-Lauf `*/15`.
3. **Übergangslösung ohne Code:** Standardzuweisung je Typ über den Regel-Editor (Investor zur Kapitalseite, Reststrom zur Energiebeschaffung, Kommune zum Kommunalteam). Benachrichtigungsart „anfrage“ aus dem Digest nehmen.
4. **Ehrliche Texte bis das Routing steht:** „Ein Ansprechpartner aus unserem Team meldet sich“. „Beliebt“ und „meistgelesen“ ersetzen durch „Guter Einstieg“ oder „Empfehlung der Redaktion“.
5. **herkunft.js:** KI-Regex vor die Suchmaschinen-Regex. copilot, mistral und meta.ai ergänzen. gclid/msclkid als Kennzeichen „bezahlt“. In `akquise-kampagne.js` die `ruecklaufQuote` je Person statt je Ereignis zählen.
6. **ErgebnisAnfrage in die übrigen 12 Rechner** einbauen und `daten.rechner` mitsenden. `ereignis()` an fünf Stellen einbauen.
7. **Pflicht-Einwilligung beim Anfrageformular ersetzen** durch einen Hinweis (lit. b) und ein optionales, getrenntes Häkchen für den Fachbrief mit Double-Opt-in. Bei der Registrierung Fassung und Zeitpunkt speichern. Die Checkbox nur noch für die Nutzungsbedingungen, die Datenschutzerklärung als Hinweis.
8. **Datenschutzerklärung:** noindex oder Entwurfs-Banner. Rohe `<mark>`-Texte neutral formulieren. Datenschutz-E-Mail freigeben. Kurzabschnitt revDSG ergänzen.
9. **Geldwäsche-Meldung:** Protokolleintrag pseudonymisieren, Land als Pflichtauswahl, Hinweistext korrigieren. Rollen-Test ergänzen.
10. **Pachtrechner und Flächencheck:** Annahmen und Quellen je Land. CH ausblenden, bis eigene CHF-Werte vorliegen.
11. **Integrität und Presse:**
    - Platzhalterseite `/hinweisgeber` mit Ombudsperson und externen Meldestellen (BfJ, BAK)
    - Anliegen „presse“ und „partner“ als eigene Anfragetypen
    - Google-Extended in `robots.js` bewusst entscheiden: Die Sperre blockiert auch das Gemini-Grounding.
12. **Regionsseiten mit Rechnern verknüpfen**, zum Beispiel `/rechner/pacht?region=…`.

## 4) Rote Linien

- **Kein Gate vor dem Ergebnis.** Kein Telefon-Pflichtfeld. Bericht nie an Newsletter- oder Telefon-Einwilligung koppeln (Art. 7 Abs. 4 DSGVO). Telefon-Einwilligung gesondert dokumentieren (BGH I ZR 164/09). Kein Werbeanruf bei Verbrauchern ohne ausdrückliche Einwilligung (§ 7 Abs. 2 Nr. 1 UWG, § 174 TKG 2021 AT, Art. 3 Abs. 1 lit. u UWG CH).
- **Kein Werbe-Mailversand ohne nachgewiesenes Double-Opt-in je Land.** Die Bestätigungsmail enthält keine Werbung. Für Empfänger in AT gilt AT-Recht (§ 174 Abs. 6 TKG 2021). Die Bestandskunden-Ausnahme ist eng: Eine bloße Anfrage ist kein Verkauf.
- **Keine Reaktionszeit öffentlich versprechen oder veröffentlichen**, die nicht gemessen und eskaliert wird. Kennzahlen nur aus echten Daten.
- **Keine Dark Patterns:** keine Fake-Knappheit, keine Countdowns, kein Confirmshaming, keine vorbelegten Häkchen, keine Push-Abfrage beim Seitenaufruf, keine Streaks. Auch A/B-Varianten müssen alle ehrlich sein.
- **Scoring:** nur zur Priorisierung, keine automatische Ablehnung (Art. 22 DSGVO, Art. 21 revDSG). Leistungsauswertung je Person nur mit Mitbestimmung, sonst auf Team-Ebene.
- **Hinweisgebersystem:** kein Eigenbau im Portal. Kein IP-Logging und keine Herkunftsmessung im Meldekanal. In CH nicht mit „gesetzlich vorgeschrieben“ werben. Kein „zertifiziertes CMS“ behaupten (ISO 37002 ist nicht zertifizierbar).
- **Keine produktive Bindung an Entwürfe.** Provisionen nur über individuell unterzeichnete Vereinbarungen. Projektbörse und Genossenschaft brauchen vor dem Livegang ein Aufsichtsrechts-Gutachten je Land (WAG/AltFG, KWG/§ 34f GewO, FIDLEG). Den KI-Assistenten nicht mit US-Übermittlung aktivieren, bevor die Grundlage (DPF oder SCC mit Transfer Impact Assessment) steht. Ab 2. August 2026 die KI-Hinweise nach Art. 50 KI-VO umsetzen.
- **Presse und Daten:**
  - keine erfundenen Zahlen, Zitate oder Superlative (zum Beispiel „Pionier“)
  - Stockbilder nie als reale Projekte ausgeben, Rechte-Register vor dem Pressekit
  - Rechner-Daten nur anonymisiert und ab einer Mindestfallzahl
- **Strompreisvergleich:** nur amtliche oder offen lizenzierte Daten. Kein Scraping von Tarifrechnern. Keine Versorgermarken in Rankings oder Betreffzeilen. Stand und Quelle je Wert.
- **GitHub-Funde nur als Ideen und Datenquellen.** AGPL-Code (listmonk, GlobaLeaks, open-MaStR, SOLECTRUS) nur als getrennter Dienst und unverändert, nie in die Website übernehmen. Notifuse steht unter BSL. SOLECTRUS ist eine geschützte Marke.
- **Jede Prozessänderung parallel** in der Demo (`src/lib/plattform/backend/demo*`) und in Frappe (`Backend-Import/oekoinvest_app`) umsetzen.
- **Grenzen der Recherche:** Das Web-Suchbudget war bei allen Experten ausgeschöpft. Die AT- und CH-Normen (TKG § 174/§ 107, HSchG-Details, UWG-CH) und die Zahlen der HBR-Studie sind nicht verifiziert und brauchen vor der Umsetzung eine juristische Prüfung.

**Quellen:**
- Selbst geprüfter Code:
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Plattform/AnfrageFormular.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Portal/Bedienung/pruefung.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/regionen/[slug]/page.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/herkunft.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/plattform/backend/demo/bo-seed.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/robots.js`
  - `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/statistik.js`
- Weitere Quellen der Experten:
  - gesetze-im-internet.de: HinSchG §§ 11, 12, 14, 16, 17, 40; UWG § 7; GwG § 6
  - ris.bka.gv.at: TKG 2021 § 174, HSchG
  - github.com: listmonk, mautic, growthbook, payloadcms, globaleaks, open-MaStR, visualize-admin/electricity-prices-switzerland
  - api.energy-charts.info (bzn=AT/CH)
  - basemap.at und swisstopo (Nutzungsbedingungen)
  - artificialintelligenceact.eu/article/50
  - developers.google.com: Google-Extended, Dataset

## Zukunft & Strategie
# Team „Zukunft & Strategie“: Ergebnis für den Strategie-Rat

**Selbst nachgeprüft (Code, 03.10.2026), alle bestätigt:**
- `src/lib/rechner/solarpark.js:85`: `Math.max(e.preisCt, marktCt)` wird auf jede kWh angewendet. Keine Logik zu § 51 EEG (negative Viertelstunden).
- `src/lib/rechner/pacht.js:64`: Der deutsche EEG-Zuschlag (`eegFreiflaecheCt`) gilt für alle Regionen, auch AT und CH. Zeile 43 setzt standardmäßig die deutsche Ackerpacht.
- `src/app/projektboerse/[slug]/page.js:68/75`: Jedes Projekt bekommt `brand` = ÖkoInvest, `seller` = ÖkoInvest GmbH, `priceCurrency` „EUR“ (auch CH) und `availability` InStock.
- `src/app/projektboerse/page.js:97`: Die Hero-Pill zeigt „Live“, ohne `demo` zu prüfen, obwohl `istDemo()` vorhanden ist (Z. 75).
- `markt.js:521/537`: AT-Rabatt „lokal 57 %“ ohne Gültigkeitsende.
- `robots.js:30`: GPTBot, CCBot und Google-Extended sind gesperrt, ClaudeBot und Applebot-Extended nicht.

**Hinweis zum Nutzerauftrag (GitHub-Ideenrecherche):** In diesem Team ist sie nicht erfolgt. Das Websuch-Kontingent war bei mehreren Experten erschöpft, und der GitHub-Connector ist nicht autorisiert (in den claude.ai-Connector-Einstellungen freischalten). Der einzige GitHub-Bezug ist open-MaStR (OpenEnergyPlatform) als Vorlage für ein Datenprodukt. Die Recherche sollte ein eigener Agent mit freiem Kontingent übernehmen.

## 1) Die stärksten Initiativen, priorisiert (Dubletten zusammengeführt)

**I1 Rechtsstand-Engine und Ländertrennung in allen Rechnern** [DACH | Wirkung sehr hoch | Aufwand mittel]
- Ein zentrales Modul REGIME in markt.js mit `gueltigAb`, `gueltigBis` und Status (Gesetz / Entwurf / Konsultation) je Parameter.
- Die Rechner bekommen einen Schalter „heute | voraussichtlich ab 2027 | Merchant/CfD“. Abgebildet werden:
  - § 51/51a EEG
  - Netzpaket: 70-%-Einspeisegrenze, 20-%-Grenze beim Redispatch-Ausgleich, Baukostenzuschuss für Erzeuger
  - AgNes-Kapazitätsentgelt von 4–7 €/kW pro Jahr
  - AT: ElWG und SNE-VO 2027
  - CH: LEG
- Gleichzeitig getrennte Blöcke je Land: PACHT, PHASEN und Ackerpacht für DE, AT und CH, CH in CHF. Speicher in €/MW bzw. €/MWh.
- Das PDF zeigt beide Szenarien nebeneinander mit P50/P90 und DSCR.
- Zusammengeführt aus Zukunftsforscher I1, M&A I1, Finanz-Analyst I7 und den Ländertrennungs-Funden des Strategieberaters.
- Alleinstellung: Kein frei zugänglicher DACH-Rechner kennzeichnet heute den Rechtsstand ab 2027 mit Quelle und Status. Das ist zitierfähig für Banken und Presse.
- Risiko: Netzpaket und AgNes sind noch Entwürfe. Deshalb immer „Entwurf, Stand TT.MM.JJJJ“ anzeigen, ein Changelog führen und die Inhalte je Land von Energierechtlern freigeben lassen.

**I2 Gewerbestrom-Atlas DACH, je Land getrennt; Pilot CH** [DACH | Wirkung sehr hoch | Aufwand groß]
- Das Inhaberziel taucht bei 4 von 5 Experten auf und ist im Bestand nicht vorhanden.
- Datenquellen je Land:
  - CH: ElCom-Tarifrohdaten je Gemeinde (offene Daten, LINDAS/SPARQL). Das ist die sauberste Datenlage, deshalb dort zuerst.
  - DE: Netzentgelt-Preisblätter der rund 800 Verteilnetzbetreiber, Umlagen von netztransparenz.de, Stromsteuer, Beschaffungskomponente nur aus lizenzierten oder CC-BY-Quellen.
  - AT: SNE-V. Die Nutzungsbedingungen von E-Control sind vorher zu prüfen.
- Angezeigt werden nur Preisbestandteile und typische Profile, keine Versorgermarken.
- Lead-Stufe: Upload des Lastgangs, daraus ein PDF zu Flexibilität, PPA und Reststrom-Pool. Telefon ist optional.
- Alleinstellung: Die laufende Datenpflege ist der Burggraben.
- Risiko: § 6 UWG (DE), § 2a UWG (AT), Art. 3 UWG (CH). Kein Scraping. Lastgänge sind sensibel (DSGVO/revDSG).
- Voraussetzung: Vorher die Vergütung des Reststrom-Pools festlegen und offenlegen (siehe Fehler F7).

**I3 Lead-Magnet-PDFs plus Lead-Wert-Modell** [DACH | Wirkung sehr hoch | Aufwand mittel]
- Bericht per E-Mail mit Double-Opt-in für Projektbewertung, Pacht, Agri-PV und Reststrom. Das Ergebnis bleibt ohne Kontaktangabe sichtbar.
- Die Projektbewertung bekommt Projekttyp, eine Lückenliste und für Bestandsanlagen die DCF-Logik aus `bestandsanlage.js`.
- Serverseitig in `/api/anfrage` eine Wertklasse A/B/C und einen erwarteten Deckungsbeitrag ablegen (neuer Block LEADWERT in markt.js).
- Dazu das Formularfeld „Wie haben Sie uns gefunden?“, damit Kanal-ROI messbar wird.
- Modellwert eines A-Flächen-Leads: ca. 15–70 T€. Das ist unbelegt und muss mit CRM-Daten kalibriert werden.
- Risiko: Kopplungsverbot nach Art. 7 Abs. 4 DSGVO. Einwilligungen für Bericht, Newsletter und Telefon getrennt einholen (§ 7 UWG).

**I4 Neutralität und Governance der Projektbörse** [DACH | Wirkung sehr hoch | Aufwand klein bis mittel]
- Pflichtfeld „Anbieter: ÖKOVOLT Gruppe | Dritter | Gruppe beteiligt“ in Liste, Exposé und Teaser.
- Informationsbarriere: Die Akquise-Engine schließt Flurstücke aus, die Dritte in der Börse anbieten. Jeder Zugriff wird protokolliert (Hashkette).
- Veröffentlichte Konfliktregel: kein Vorkaufsrecht, gleiche Information und gleiche Fristen für alle Bieter.
- Die Besonderen Bedingungen je Land finalisieren.
- Ohne diese Absicherung stellen ernsthafte Drittentwickler keine Projekte ein. Das ist die Voraussetzung für I5 und I6.
- Risiko: anwaltliche Formulierung ist Pflicht, außerdem Erlaubnisfragen nach § 34c GewO und MaklerG.

**I5 Echte Nachfrage sichtbar machen und Reifegrad-Index im Teaser** [DACH | Wirkung sehr hoch | Aufwand mittel]
- Öffentliche, anonyme Kaufgesuche aus Suchprofilen mit Opt-in, Ablaufdatum und Schwelle (mindestens 3–5 je Region). Sie erscheinen auf Börse, Anbieterseite und Regionsseiten.
- Der Teaser zeigt je Kernunterlage die Stufe vorhanden / gesichtet / extern geprüft, ohne den Inhalt preiszugeben.
- Später auch Offtake-Indikationen (PPA, Direktvermarktung) über die bestehende Ausschreibungsmaschine, nur als aggregierte Bandbreite.
- Risiko: erfundener Social Proof (UWG) und Kartellrecht. Nur aggregiert, keine Hochrechnung, und das Siegel ausdrücklich als „keine Due Diligence“ kennzeichnen.

**I6 Datenvorsprung und Primärquellen für KI-Suche** [DACH | Wirkung hoch | Aufwand mittel bis groß]
- Offene, versionierte Datensätze (CSV/JSON, CC BY, Dataset-Schema, Methodik-Seite, Anker-URLs):
  - EEG-Runden
  - Netzdruck- und Speicher-Radar aus dem MaStR (DL-DE-BY 2.0, nur aggregiert)
  - später proprietäre Indizes aus Plattformdaten (Nachfrage, Pacht, €/kWp je Phase), nur mit k ≥ 5, mindestens 1 Quartal verzögert und mit Einwilligung in den Nutzungsbedingungen
- Die robots.js-Strategie bewusst entscheiden.
- Grund: Laut Pew klicken Nutzer nur in 1 % der Fälle auf eine Quelle in der KI-Zusammenfassung. Primärdaten werden zitiert, allgemeine Ratgeber verlieren Klicks.
- Risiko: Kartellrecht bei Preis-Indizes, ODbL bei Kombination mit OSM-Daten, Datenqualität im MaStR.

**I7 Versorger-, Stadtwerke- und Verbandskanal** [DACH | Wirkung hoch | Aufwand klein bis mittel]
- Das ist der legitime Hebel, um die Reichweite der Energieversorger zu nutzen.
- Bausteine:
  - Seite /stadtwerke mit Beteiligung, Regional-PPA bzw. Regionalnachweis und Gremienpaket
  - Investortyp „Stadtwerk/EVU“ mit Kriterium Netzgebiet
  - Ansprache über Bündnisse statt einzeln: Trianel, THEE/Thüga, Swisspower
  - Verbandsmitgliedschaften: BSW, bne, PV&B Austria, Swissolar, VSE
  - Kommunal-Widget je Land für die Gemeindebünde
- Risiko: Fremde Logos und „Partner von …“ nur mit Vertrag. Neutralität der Spitzenverbände wahren, kein Lead-Zwang.

**I8 Zeitfenster-Programme mit echten Fristen** [Wirkung hoch | Aufwand mittel]
- (a) AT: Wechselfenster zum ElWG. Rechner zur SNE-VO 2027 am Tag der Veröffentlichung, Eintrag in die Dienstleisterliste der Koordinationsstelle.
- (b) DE: Speicher-Fenster bis 04.08.2029 (§ 118 Abs. 6 EnWG) mit einem Co-Location-Rechner am bestehenden PV-Anschluss.
- (c) DE: Post-EEG-, Bestands- und Distressed-Desk. Die Insolvenzwelle 2026 (Enerparc, Next2Sun) und das Förderende der Jahrgänge 2006–2012 bringen Mandate. Dazu eine Hilfeseite für Flächeneigentümer.
- Gekoppelt an einen Fristen-Alarm mit Double-Opt-in.
- Risiko: keine künstliche Knappheit, keine Insolvenznamen in Anzeigen oder Überschriften, Ansprache aus dem MaStR nur per Brief bzw. mit Rechtsgrundlage.

**Widersprüche zwischen den Experten, aufgelöst:**
- **Speicherbefreiung:** Die Frist 04.08.2029 ist für die Kommunikation verbindlich. Die zusätzlichen AgNes-Bedingungen (Investitionsentscheidung vor der neuen Regel) werden nur als Entwurf gekennzeichnet.
- **Ausschreibungsdruck:** Die EEG-Ausschreibungen sind weiter überzeichnet, im Juli 2026 aber nur noch rund 1,5-fach (Dezember 2025: 2,2-fach). Der Wert von 4,8 ct in markt.js bleibt gültig.
- **CfD:** Ein Beschluss ist nicht belegt (siehe F5).
- **Umlagen und Gewerbestrompreis:** Der Experte nennt rund 2,6 ct statt der in markt.js angesetzten 1,8 ct, und der BDEW-Wert von 17,2 ct passt nicht zur Summe von 19,96 ct in markt.js. Beides ist ungeprüft (netztransparenz.de war nicht erreichbar) und vor dem Atlas zu verifizieren.

## 2) Kritische Fehler im Bestand (sofort beheben)

- **F1** `src/lib/rechner/solarpark.js:85`: § 51 EEG fehlt. Laut markt.js fielen 24,1 % der Solarerzeugung in Stunden mit negativen Preisen, die Erlöse sind also überhöht. Das wirkt auf IRR und DSCR, also auch auf Bankunterlagen. Dazu fehlt das CfD-Szenario; dasselbe gilt für `pachtangebot.js:130`.
- **F2** `src/lib/rechner/pacht.js:43/64`, `src/app/rechner/pacht/page.js:115`, `HubBuehne.js:79`, `ToolVorschau.js:61`: AT und CH rechnen mit deutschem EEG-Zuschlag und deutscher Ackerpacht, CH in € statt CHF.
- **F3** `markt.js:230–235` (PACHT „DACH“) und `markt.js:479–486` (PHASEN): eine einzige Tabelle für drei Märkte und alle Projekttypen, ohne Einzelquelle, trotzdem im Exposé als „Übliche Preise (Markt)“ gezeigt. Für Speicher sind €/kWp fachlich falsch (`PhasenEinordnung.js`). `Marktbild.js:21` und `backend/demo.js:907` zählen Speicher-MW in die MWp-Summe.
- **F4** `src/app/projektboerse/[slug]/page.js:68/75`: Im JSON-LD ist ÖkoInvest Verkäufer und Marke auch bei Drittprojekten, dazu InStock und immer EUR. Das ist eine falsche Rollenangabe. Ebenso `projektboerse/page.js:97`: „Live“ im Demo-Modus, außerdem „geprüft“ in Titel und H1 statt „vorgeprüft“.
- **F5** Ratgeber widersprechen sich: `agri-pv-foerderung-gap.js:210f` behauptet eine EEG-Novelle mit CfD-Umstieg, `eeg-ausschreibung-freiflaeche.js:~230` sagt nur „zu prüfen“. Belegt ist nur der Kabinettsbeschluss zum Netzpaket. Dazu tragen alle 37 Ratgeber dasselbe Datum `aktualisiert '2026-09-29'`. Das Datum nur nach echtem Prüfprotokoll setzen.
- **F6** `src/app/datenschutz/page.js:430/436`: sichtbare Platzhalter zu Drittlandtransfer und Speicherdauer beim KI-Dienst. Das verletzt Art. 13 DSGVO und blockiert den Livegang.
- **F7** `src/app/reststrom/page.js:249` wirbt mit „Kostenlos und unverbindlich“. In `bedingungen/energiebeschaffung/page.js:141` ist offen, ob Versorger Provisionen zahlen, und in `docs/ENERGIEBESCHAFFUNG.md:10` steht als Servicefee der Standard 0. Das ist Irreführung durch Unterlassen; vor der Bewerbung entscheiden und offenlegen. Zusätzlich ist der Länderumfang widersprüchlich: DE laut Seite, DE/AT im Backoffice, keine Aussage zu CH.
- **F8** `markt.js:521/537`: AT-Rabatt 57/28 % ohne `gueltigBis 2026-12-31`. Ab 01.01.2027 gilt eine neue SNE-VO, deren Werte offen sind und die nur den Bezug rabattiert.
- **F9** `projektboerse/anbieten/page.js`: Verkäufer sollen „die Vereinbarung akzeptieren“, obwohl `bedingungen/projektboerse/page.js` ein noindex-Entwurf mit Platzhaltern ist (Z. 53, 135). Die Zusage „Provision nur bei Abschluss“ ist so nicht belastbar.
- **F10** `Kommune/Seite/Fakten.js:8` und `kommunen/page.js:35`: § 6 EEG pauschal „freiwillig“, obwohl Landesgesetze z. B. in Niedersachsen, Brandenburg und Mecklenburg-Vorpommern Beteiligungen vorschreiben.
- **F11** `projektbewertung.js`: Der EEG-Faktor 1,12 wirkt auch für AT und CH. `DdCheckliste.js` ist rein deutschrechtlich.

## 3) Quick Wins (je unter 1–2 Tage)

1. Hero-Pill nur zeigen, wenn nicht `istDemo()`, und den Vorführdaten-Hinweis über die Kennzahlen stellen. „geprüft“ durch „vorgeprüft“ ersetzen.
2. JSON-LD des Exposés: Offer, price und InStock streichen, `seller` und `brand` nur bei Gruppenprojekten setzen.
3. Speicher aus der MWp-Summe nehmen und separat ausweisen. PhasenEinordnung bei Speichern ausblenden.
4. Pachtrechner: Umsatzmodell und Ackerpacht für AT und CH ausblenden oder als „nur DE“ kennzeichnen, CHF-Hinweis ergänzen.
5. `solarpark.js`: Parameter für den Abschlag negativer Viertelstunden in markt.js anlegen, mit Testfall in der Selbstprüfung.
6. `gueltigBis` für die AT-Rabatte setzen und den Hinweis auf die SNE-VO 2027 anzeigen.
7. In jedem Ertragsrechner einen Kasten „Rechtsstand heute / ab 2027 (Status, Quelle, Datum)“. Reine Textänderung.
8. CfD-Aussage in den beiden Ratgebern vereinheitlichen. Ratgeberdaten nur nach Prüfprotokoll setzen.
9. Badge „Projekt der ÖKOVOLT Gruppe“ einführen und die FAQ auf warum-oekoinvest zum Interessenkonflikt neu formulieren.
10. In allen Formularen das Feld „Wie haben Sie uns gefunden?“ und die Wertklasse A/B/C im Vorgang (`prioritaetAuto` existiert bereits).
11. Text zu § 6 EEG auf /kommunen korrigieren: freiwillig nach Bundesrecht, in einigen Ländern verpflichtend, mit Link auf die Regionsseite. Dazu ein Stadtwerke-CTA.
12. AT: Eintrag in die Dienstleisterliste der Koordinationsstelle (kostenlos, Kodex anerkennen).
13. /marktdaten: EEG-Rundenreihe als CSV mit Dataset-JSON-LD und Lizenzangabe anbieten.
14. Entscheidung zur robots.js-Strategie dokumentieren (Google-Extended sperrt auch das Grounding in Gemini) und KI-Bots einheitlich behandeln.
15. Analytics-Kanäle für chatgpt.com, perplexity.ai, copilot.microsoft.com und gemini.google.com anlegen; monatlich 30 Kernfragen je Land in KI-Assistenten prüfen.
16. Umlagen 2026 und die Zuordnung zum BDEW-Wert (Verbrauchsband, Stromsteuer) prüfen und das Stand-Datum nachziehen.
17. `ENTWICKLUNG.wahrscheinlichkeit` für die Phasen netz und aufstellung konservativer ansetzen, bis Ist-Quoten vorliegen.

## 4) Rote Linien und Warnungen

- Netzpaket, AgNes, EEG-Novelle und CfD sind kein geltendes Recht. In Rechnern und Bank-PDFs nur als gekennzeichnetes Szenario mit Stand und Quelle zeigen.
- Lead-PDFs: Das Ergebnis bleibt immer ohne Kontaktangabe sichtbar. Telefon ist optional, Einwilligungen getrennt. Werbeanrufe in DE nur mit vorheriger ausdrücklicher Einwilligung (§ 7 Abs. 2 UWG).
- Gewerbestrom-Atlas: keine Versorgernamen ohne objektive, aktuelle Datenbasis. Kein Scraping von Vergleichsportalen oder Versorgerseiten. Börsendaten nur mit Lizenz.
- Kartellrecht: Indizes, Offtake-Panel und Versorger-Ausschreibung nur aggregiert, historisch und mit Mindestfallzahl. Keine Einzelgebote, keine Sicht auf Angebote anderer Bieter.
- Kein erfundener Social Proof: Kaufgesuche und Nachfragezahlen nur aus echten, aktiven Opt-in-Profilen mit Schwelle.
- Erlaubnis- und Prospektpflichten vor Skalierung klären: § 34c GewO, MaklerG (AT), VermAnlG/KMG/FIDLEG bei Bürgerbeteiligung, AWV/InvKG bei Käufern aus Drittstaaten.
- MaStR- und Grundbuchdaten: nur aggregiert und mit Namensnennung (DL-DE-BY 2.0). Keine Direktansprache ohne Rechtsgrundlage. Briefe an Unternehmen sind zulässig, E-Mails und Anrufe nur mit Einwilligung.
- Interessenkonflikt: Ein einziger Fall, in dem die Gruppen-Akquise Daten aus einem Drittlisting nutzt, beendet das Drittgeschäft.
- Fremde Marken, Logos und „Partner von …“ nur mit schriftlicher Zustimmung. Keine Werbung mit Verbandsmitgliedschaften vor der Aufnahme.
- Countdowns nur mit echten gesetzlichen Daten. Kein Zeitdruck gegenüber Kommunen und Stadtwerken.
- Offene Prüfpunkte, weil Primärquellen nicht abrufbar waren: CfD-Stichdatum (VO 2024/1747), SNE-VO 2027, CH-LEG und BFE, Umlagen 2026, Regionalnachweis-Regeln.

**Quellen:**
- https://www.goerg.de/de/aktuelles/veroeffentlichungen/22-09-2026/bundesregierung-beschliesst-netzpaket-kein-anschluss-unter-dieser-nummer
- https://www.gesetze-im-internet.de/enwg_2005/__118.html
- https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html
- https://www.pv-magazine.de/2026/08/25/netzanschluesse-fuer-batteriespeicher-574-gigawatt-angefragt-54-gigawatt-zugesagt/
- https://www.pv-magazine.de/2026/10/02/enerparc-insolvenz-mehr-als-100-anfragen-transaktion-anfang-dezember-angestrebt/
- https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/
- https://www.elcom.admin.ch/elcom/de/home/themen/strompreise/tarif-rohdaten-verteilnetzbetreiber.html
- https://www.marktstammdatenregister.de/MaStR/Datendownload
- https://energiegemeinschaften.gv.at/faqs-zum-elwg/
- https://energiegemeinschaften.gv.at/dienstleister-in-oesterreich/
- https://www.trianel.com/
- https://ee.thuega.de/
- http://swisspower.ch/
- https://pvbaustria.at/
- https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/
- https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers

**Selbst geprüfte Dateien** (alle unter `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/`):
- `src/lib/rechner/solarpark.js`
- `src/lib/rechner/pacht.js`
- `src/app/projektboerse/[slug]/page.js`
- `src/app/projektboerse/page.js`
- `src/lib/invest/markt.js`
- `src/app/robots.js`

## Marketing & Content
# Team Marketing & Content: Bündel für den Strategie-Rat

**Selbst geprüft (Code, 03.10.2026), alle Behauptungen bestätigt:**
- `src/app/regionen/[slug]/page.js:52` setzt für alle Regionen `locale: "de_DE"`. Dasselbe gilt für Ratgeber in `src/app/ratgeber/[slug]/page.js:39`. Dort steht außerdem `inLanguage: "de-DE"` (Z. 70 und 91) und als `author` nur die Organisation (Z. 73).
- `src/data/site.js` enthält `SOCIAL = []` (Z. 69) sowie `telefon: null` und `email: null` (Z. 45 und 47). `src/app/layout.js` enthält kein `sameAs`.
- `src/lib/invest/markt.js:232` gibt `freiflaecheProHa` 1.500–4.500 als pauschalen DACH-Wert an. Z. 239 enthält `ackerProHa: 380`, einen Destatis-Wert, der nur für DE gilt.
- Alle 37 Ratgeber haben `veroeffentlicht` und `aktualisiert` = 2026-09-29. „in der Regel“ kommt 105-mal vor.
- Außerhalb des Portals gibt es keine Newsletter-, Presse- oder Webinar-Route. Die „newsletter“-Treffer im Code sind nur Quellenlinks auf Newsletter Dritter.
- Im Impressum (Z. 46) lautet der OG-Alt-Text „Firmensitz der ÖkoInvest GmbH“.
- Der Cookie-Banner fragt Google Maps ab. „Alle akzeptieren“ setzt `googleMaps: true` (Z. 126).
- `public/robots.txt` ist gelöscht, `src/app/robots.js` existiert. Das ist voraussichtlich in Ordnung.

## 1) Priorisierte Initiativen (Dubletten zusammengeführt)

**I1 – Fundament „Absender und Fakten“ (DACH | Wirkung sehr hoch | Aufwand klein)**
Diese Initiative ist Voraussetzung für alles Weitere.
- Ein verbindliches Faktenblatt mit Gründungsjahren, eigenen Parks seit 2012 und der Angabe „50 MWp“. Festzulegen ist, ob die Zahl für die Gruppe oder für ÖkoInvest gilt. Ebenso festzulegen sind die Dauer bis RTB und die Dauer bis zum fertigen Park.
- Darauf aufbauend ein Botschaftshaus „Wir betreiben, was wir entwickeln“, mit Varianten je Land und Zielgruppe.
- Freigabe eines Pressekontakts (als Funktionsadresse oder Formular), echte Profile in `sameAs`, LinkedIn-Seite anlegen und Kanalnamen sichern.
- Widerspruch aufgelöst: Die EN-Seiten nennen „2–3 J. bis RTB“, DE nennt „2–4 J. bis Park“. Beide Angaben bleiben, werden aber im Faktenblatt sauber getrennt definiert.
- Alleinstellung: Eine echte Betriebshistorie ist nicht kopierbar.
- Risiko: Jede Aussage muss belegt sein. „Bleibt 30 Jahre“ ist als Absicht zu kennzeichnen. Superlative lässt die Rechtsabteilung prüfen.

**I2 – Redaktionssystem mit Länder-Trennung und echten Personen (DACH | Wirkung sehr hoch | Aufwand mittel)**
Zusammengeführt aus drei Expertenvorschlägen.
- Neue Felder im Content-Modell: `land`, `autor`, `fachpruefer`, `geprueftAm`, `naechstePruefung`, `aenderungslog`.
- Länderfilter auf /ratgeber, Kasten „Gilt für: Deutschland“, locale und inLanguage je Land.
- hreflang erst, wenn echte Länderausgaben existieren.
- Person-Schema plus `reviewedBy`, Autorenseiten.
- Pflicht-Eigenanteil je Beitrag, Floskel-Lint und Länderstil (CH: ss, Rp., CHF; AT: Jänner, Einverleibung).
- Abwechselnde Formate, darunter auch Kurzantworten aus echten Kundenfragen.
- Alleinstellung: ein über 12 Monate gewachsenes Archiv geprüfter, personengebundener Inhalte.
- Risiko: Personen nur mit schriftlicher Einwilligung. Genannte Prüfer müssen tatsächlich geprüft haben. Keine KI-Personas.

**I3 – Daten-Reports als Leitformat: Ausschreibungs-Monitor, Pachtindex und Gewerbestrom-Monitor (DACH | Wirkung sehr hoch | Aufwand mittel bis groß)**
Zusammengeführt aus Pachtindex, Strompreis-Monitor und Ausschreibungs-Monitor. Reihenfolge nach Aufwand:
- **(a) Ausschreibungs-Monitor:** /marktdaten bekommt Tabs für DE, AT (EAG) und CH (Pronovo). Erstes Ziel ist die BNetzA-Runde vom 1.12.2026: Die Vorlage wird jetzt gebaut, damit die Analyse innerhalb von 48 h nach den Ergebnissen erscheint.
- **(b) Gewerbestrom-Monitor /strompreis-gewerbe:**
  - CH über ElCom/LINDAS
  - DE über Preisblätter der Netzbetreiber, SMARD und Energy-Charts
  - AT über die SNE-VO
  - Netzentgelte und Umlagen werden als amtlich ausgewiesen, die Energiekomponente als Spanne mit Quelle und Stand.
- **(c) Pachtindex DE/AT/CH:** halbjährlich, mit Mindest-n je Zelle und Spannen statt Punktwerten. Er ersetzt die pauschale Spanne in `markt.js`.
- Zu jedem Report gehören Methodenpapier, CSV/PDF, Zitiervorschlag und Pressemitteilung.
- Alleinstellung: Die Zeitreihe ab heute kann ein Nachzügler nicht nachträglich erzeugen. Dazu kommt die Verknüpfung mit Reststrom-Pool und PPA.
- Risiko: Vergleichswerbung nach § 6 UWG DE, § 2a UWG AT und Art. 3 UWG CH. Lizenzen der Quellen müssen geprüft werden (ElCom-Lizenz ungeprüft, opendata.swiss lieferte 403). Kein Scraping. Personenbezug beim Pachtindex vermeiden. Kein einziger geschönter Wert.

**I4 – Wiederkehr-Motor aus Newsletter, Newsroom und Fristenservice (DACH | Wirkung hoch | Aufwand mittel)**
- Drei Länderausgaben im Monat mit Segmenten. Fester Aufbau: Zahl des Monats, Rechtsänderung im Klartext, Rechner-Tipp, Fristen.
- Anmeldung im Kontext am Ende von Ratgebern und Rechnern, kein Pop-up. Double-Opt-in, EU-Versanddienst.
- /presse mit Länderfilter, Faktenblatt, Bildarchiv mit Lizenz und Index-Archiv. Pflege durch Marketing im Portal, Freigabe durch die Rechtsabteilung.
- Alleinstellung: Abonnentenbasis und Archiv wachsen über die Zeit.
- Risiko: Kopplungsverbot nach Art. 7 Abs. 4 DSGVO, § 7 UWG DE, TKG 2021 § 174 in AT, revDSG und UWG in CH.

**I5 – Echt-Material-Offensive: Betriebsbuch der eigenen Parks und Drohnen- bzw. Baustellenarchiv (DACH | Wirkung sehr hoch | Aufwand mittel)**
- Jahresbericht je Park (Irsingen, Artern, Tilleda): Ertrag, Verfügbarkeit, Beweidung, Lehren.
- Eigene Drohnenpiloten mit A1/A3- bzw. A2-Nachweis. Ein Drehtag je Saison. Stockbilder schrittweise ersetzen, jedes Bild mit „eigene Aufnahme, Park X, Datum“.
- Freigabeprozess für Fallstudien Dritter. „Praxisbeispiel“ nur für reale Fälle, sonst „Rechenbeispiel“.
- Alleinstellung: Vermittlerplattformen haben kein solches Material.
- Risiko: Freigabe durch Betreibergesellschaften und Banken (Vertraulichkeit). KUG und DSGVO bei Personen. Geozonen über dipul (DE), Dronespace (AT) und BAZL (CH; BAZL-Details ungeprüft).

**I6 – Video-System: Watch-Pages, Erklärreihe und Shorts (DACH | Wirkung hoch | Aufwand mittel)**
- Eigene Seiten /video/<slug> mit selbst gehostetem MP4/HLS, Untertiteln (VTT), Transkript, Clip-Markup und Video-Sitemap.
- Erklärreihe „In 4 Minuten erklärt“: 8 Videos in 3 Monaten, mit Länderfassungen, wo das Recht abweicht.
- Aus jedem Video und Drehtag 2–3 Shorts pro Woche (YouTube, LinkedIn).
- AT-Serie zu Energiegemeinschaften mit Bildschirmaufnahmen der eigenen EG-Software (Demodaten).
- Budget: einmalig ca. 6–10 TEUR, laufend 1,5–3 TEUR pro Monat, dazu 0,5 FTE.
- Risiko: Stand-Datum in jedem Video. Keine Renditeversprechen (VermAnlG, KMG, FIDLEG). Musiklizenzen. Remotion ist ab 4 Mitarbeitern lizenzpflichtig, alternativ FFmpeg.

**I7 – AT-Offensive und CH-Plan im Redaktionsplan Okt 2026 bis Sep 2027 (AT/CH | Wirkung sehr hoch für AT | Aufwand mittel)**
- AT ist Firmensitz, aber nur 1 von 37 Ratgebern ist AT-spezifisch. Ziel: mindestens 15 eigenständige AT-Beiträge, darunter:
  - Pachtsteuer AT
  - Grünland-PV-Widmung in allen 9 Bundesländern, verdichtet aus den vorhandenen Regionsseiten
  - EAG-Marktprämie mit Grünland-Abschlag
  - SNE-VO
  - Agri-PV mit ÖPUL
- CH: LEG im ersten Praxisjahr, Pronovo-Runden, Höhepunkt Aug/Sep mit den ElCom-Tarifen.
- DE läuft im Takt der Ereignisse (Gebotstermine 1.3., 1.7. und 1.12., Netzentgelte, Jahresmarktwert).
- Risiko: Fachprüfung durch Juristen des jeweiligen Landes. Keine Pseudo-Varianten mit getauschten Wörtern (Google: Scaled Content). Termine 2027 am Original prüfen.

**I8 – Reichweite über Kooperationen und Community (DACH | Wirkung mittel bis hoch | Aufwand mittel)**
- White-Label-Flächencheck bzw. EG-Rechner für Stadtwerke und Verbände, mit Co-Branding.
- Fachbeiträge, Pachtsprechstunde online, jährlicher Parktag.
- DE: Landkreis-Solarmonitor auf MaStR-Basis (open-MaStR, DL-DE-BY-2.0) mit Pressepaketen für Lokalmedien und Eintrag in die Nutzerliste von open-MaStR (Backlink).
- Optional später: Jahresstudie mit Hochschule oder Verband.
- Risiko: Bei Lead-Teilung gemeinsame Verantwortlichkeit nach Art. 26 DSGVO, Kartellrecht. Markennutzung nur schriftlich. Das Paket open-MaStR steht unter AGPL: nur im Backend nutzen. Keine Ranglisten, die Gemeinden bloßstellen.

## 2) Kritische Fehler im Bestand (sofort beheben)
1. `src/app/impressum/page.js:46`: Der OG-Alt-Text sagt „Firmensitz der ÖkoInvest GmbH“, das Foto zeigt ÖKOVOLT in Türkheim (DE). Der Sitz von ÖkoInvest ist Ostermiething (AT). Das ist eine Falschangabe im Impressum.
2. `src/components/Cookies/cookiecomponent.js:14–18, 126`: Der Banner holt eine Einwilligung für Google Maps ein, obwohl der Dienst nicht genutzt wird. Muss bereinigt werden, bevor Video-Einwilligungen dazukommen.
3. `public/img/investoren-vor-ort.jpg` (Stockmotiv) trägt Bildtexte, die Tatsachen behaupten: „Investoren bei der Besichtigung …“ in `src/app/investoren/page.js:40` und `en/investors/page.js:28`. Für alle 18 JPGs fehlt ein Bild- und Lizenznachweis.
4. `src/content/ratgeber/solarpark-genehmigung-bebauungsplan.js:215–216`: Eine Modellrechnung heißt „Praxisbeispiel“. Umbenennen in „Rechenbeispiel“.
5. `src/content/ratgeber/photovoltaik-landwirt-steuern.js`: reines deutsches Steuerrecht ohne Länderkennzeichnung. Für Leser in AT und CH ist das falsch.
6. `src/lib/invest/markt.js:232/239`: Pachtspanne pauschal für DACH, Ackerpacht 380 € nur DE, Schweizer Werte nicht in CHF. `STROM` enthält nur DE-Werte. Das führt Nutzer in AT und CH in die Irre.
7. `regionen/[slug]/page.js:52`, `ratgeber/[slug]/page.js:39/70/91`: locale bzw. inLanguage ist fest auf DE gesetzt, auch für AT- und CH-Inhalte.
8. Uneinheitliche Kennzahlen: `src/app/en/investors/page.js:47` sagt „Gruppe ~50 MWp“, `src/app/en/page.js:114/198` sagt „pipeline“. Bei der Dauer bis RTB widersprechen sich DE und EN.
9. `src/app/datenschutz/page.js` (Z. 310 und 761): Der Videokonferenzdienst steht noch als Platzhalter. Abschnitte zu Video und Social Media fehlen.

## 3) Quick Wins (je ≤ 1 Tag)
- Faktenblatt festlegen und EN/DE-Texte angleichen.
- Mapping locale/inLanguage nach Land (Regionsfeld bzw. neues Feld `land`).
- „Praxisbeispiel“ in „Rechenbeispiel“ umbenennen, Kasten „Gilt für Deutschland“ mit dem vorhandenen `kasten`-Typ `recht`.
- Impressum-Alt-Text korrigieren, Stock-Bildtext neutral formulieren, Bildnachweis-Datei für `public/img` anlegen.
- Google Maps aus dem Cookie-Banner entfernen.
- /marktdaten: „Nächste Aktualisierung“, Zitiervorschlag und CSV-Download ergänzen.
- `sameAs` und Footer-Links ergänzen, sobald Profile existieren. Pressekontakt als Formular.
- Floskel-Lint-Skript bauen und die 10 stärksten Artikel straffen.
- `aktualisiert` nur bei inhaltlicher Änderung erhöhen, Abschnitt „Was ist neu“ einführen.
- Vorlage für den Ausschreibungs-Monitor zur Runde 1.12.2026.
- Smartphone-Drehtag in einem eigenen Park (ca. 300 EUR) für 5 Shorts und 10 echte Hero- bzw. OG-Bilder.
- Individuelle OG-Bilder je Ratgeber und Rechner (`opengraph-image`), da derzeit fast alle Seiten `solarpark-himmel.jpg` bzw. `solarpark-reihen.jpg` nutzen.
- Rechner-Screenrecordings als Shorts mit UTM-Parametern (`herkunft.js` wertet sie bereits aus).
- AT-Schnellstart: Vergleichsartikel „Grünland-PV-Widmung in 9 Bundesländern“ aus den vorhandenen Regionsdaten.

## 4) Rote Linien und Warnungen
- Keine erfundenen Personen, Autoren, Zitate, Fallstudien oder Kundenstimmen. Fachprüfer nur, wenn wirklich geprüft wurde. Stock- oder KI-Bilder nie als „unser Projekt“ zeigen (UWG).
- Indizes und Monitore nur mit offengelegter Methodik, Mindest-n und Stand-Datum. Kein geschönter Wert.
- Strompreisvergleich: keine Versorgermarken in Titeln, Anzeigen oder Domains. Nur objektiv, nachprüfbar und aktuell. Kein Scraping von Versorger- oder Tarifrechnern (E-Control, ElCom-Webtool) und keine Übernahme aus Vergleichsportalen (§§ 87a ff. UrhG).
- Lizenzen nennen: MaStR unter DL-DE-BY-2.0, Energy-Charts unter CC BY 4.0. ElCom- und SMARD-Bedingungen vor Nutzung prüfen. open-MaStR (AGPL) nicht in die ausgelieferte Website einbinden.
- Einwilligungen: Newsletter und Events nie an Rechner-Ergebnisse oder PDFs koppeln. Der Basis-Report bleibt ohne Datenabgabe erreichbar. Double-Opt-in mit Protokoll.
- YouTube nur per Zwei-Klick-Lösung oder selbst gehostet. Für Fanpages gilt gemeinsame Verantwortlichkeit (EuGH C-210/16), dafür braucht es eine Vereinbarung.
- Keine KI-Massenproduktion von Gemeinde-, PLZ- oder Strompreisseiten ohne echten Mehrwert je Seite (Google: Scaled Content Abuse).
- Investoreninhalte ohne Renditeversprechen und mit kapitalmarktrechtlicher Prüfung. Rechtsinhalte jedes Landes werden von Fachleuten dieses Landes geprüft, die drei Rechtsordnungen nie vermischen.
- Betriebsdaten der Parks erst nach Freigabe durch Betreibergesellschaften und Banken veröffentlichen. Drohnenflüge nur nach Geozonen-Check und mit Freigabe des Netzbetreibers am Umspannwerk.
- Recherchelücke: Alle drei Experten hatten kein Websuche-Budget mehr. Rechtsstände (ElWG, LEG ab 01.01.2026, Stromsteuer 2026), Behördentermine 2027 und Plattform-Benchmarks muss das Energierecht-Team vor Nutzung bestätigen. Für die Lizenz der ElCom-Daten und die BAZL-Drohnenregeln gibt es keinen Beleg.

**Quellen:**
- Code unter `C:/Users/SALEADMIN/Downloads/Oekoinvest-Web`: `src/app/regionen/[slug]/page.js`, `src/app/ratgeber/[slug]/page.js`, `src/data/site.js`, `src/lib/invest/markt.js`, `src/app/impressum/page.js`, `src/components/Cookies/cookiecomponent.js`, `src/content/ratgeber/*`
- Web:
  - https://github.com/OpenEnergyPlatform/open-MaStR
  - https://github.com/visualize-admin/electricity-prices-switzerland
  - https://github.com/bundesAPI/smard-api
  - https://api.energy-charts.info/
  - https://developers.google.com/search/docs/essentials/spam-policies
  - https://developers.google.com/search/docs/appearance/video
  - https://www.lba.de/DE/Drohnen/Drohnen_node.html
  - https://www.dronespace.at
  - https://curia.europa.eu/juris/liste.jsf?num=C-210/16

## Mensch & Conversion
TEAM „MENSCH & CONVERSION“: BÜNDEL FÜR DEN STRATEGIE-RAT

Selbst geprüft:
- Bestätigt: In src/data/site.js:45/47 stehen `telefon: null` und `email: null`.
- Bestätigt: In src/app/freiflaeche/page.js:270 steht „zurück – garantiert“. src/app/landwirte/page.js:91 sagt „wetterunabhängig“, :233 sagt „mit dem Wetter nicht schwankt“.
- Bestätigt: src/app/api/anfrage/route.js:7/11 macht die Einwilligung „zur Bearbeitung der Anfrage“ zur Pflicht (Fehler 422).
- Bestätigt: Nur 4 von 16 Rechnern nutzen ErgebnisAnfrage, nämlich Solarpark, PPA, Großspeicher und Beteiligung.
- Bestätigt: In src/lib keine Treffer für BbgEESG, AuBG, NWindPVBetG und BüGembeteilG, also keine Landespflichtzahlungen. KommuneRechner.js:36 lässt alle REGIONEN zu, auch AT und CH.
- Bestätigt: Auf den Flächenseiten und in den Flächenkomponenten gibt es keinen Treffer für „Insolvenz“.

1) DIE STÄRKSTEN INITIATIVEN (priorisiert, Dubletten zusammengeführt)

1. Rechner-Ergebnis frei, Bericht gegen E-Mail, Übergabe an den Vertrieb als strukturiertes Dossier [DACH | Wirkung sehr hoch | Aufwand mittel]
   Fünf Experten haben diese Idee unabhängig voneinander geliefert.
   - Die Hauptzahl bleibt in allen 16 Rechnern sichtbar, die Druckansicht bleibt frei.
   - Gegen E-Mail mit Double-Opt-in (DOI) gibt es einen PDF-Bericht mit echtem Mehrwert: Sensitivität (P50/P90, Preis ±20 %), Annahmen mit Quelle und Stand aus markt.js, Rechtsrahmen des Landes und nächste Schritte.
   - Auf der Danke-Seite folgt freiwillig Stufe 2: Telefon, Rückruf-Zeitfenster, ha bzw. PLZ.
   - Übergabe als strukturierte Daten {rechner, version, land, eingaben, kernergebnis}, nicht als Freitext.
   - Grundlage sind ErgebnisAnfrage.js und server/pdf.js, beide vorhanden.
   - Vorrang: Pacht, Pachtangebot-Check, Agri-PV, Kommune, Dachpacht, Bestandsanlage.
   - Alleinstellung: 16 Rechner mit belegten Annahmen und einem einheitlichen, bankfähigen Bericht. Der Graben entsteht durch die Pflege der Daten.
   - Risiko: Kopplungsverbot nach Art. 7 Abs. 4 DSGVO (Werbe-Opt-in getrennt und freiwillig). Der E-Mail-Versand braucht SPF/DKIM/DMARC und einen Auftragsverarbeitungsvertrag (AVV). Ein Bericht ohne Mehrwert wirkt wie eine Sperre.
   - Messung: Berichte je 100 Rechnungen (8–15 %), DOI-Quote über 70 %, Anfragen in 60 Tagen.

2. Pachtangebot-Check als „Zweite Meinung“ mit Klausel-Ampel und Datenübernahme [zuerst DE, dann je Land eigene Klauselbasis | Wirkung sehr hoch | Aufwand klein bis mittel]
   Zusammengeführt aus dem Pachtvertrag-Röntgen, der Zweiten Meinung und dem Agri-Pachtcheck.
   - Sofort: Der CTA übernimmt die Angebotsdaten in /api/anfrage (Vorgangsart „Wettbewerbsangebot“, SLA 1 Werktag), dazu der Offenlegungssatz „Wir sind selbst Projektentwickler“.
   - Danach: Ampel je Klausel (Laufzeit und Optionen, Indexierung, Rückbausicherheit, Insolvenz, Maschinenschäden, GAP-Freistellung) und Barwertvergleich. Den Bericht „12 Fragen an jeden Projektierer“ gibt es gegen E-Mail.
   - Alleinstellung: sehr hoch. Wer neutral prüft, wird zur Vertrauensinstanz und sieht früh, was der Wettbewerb anbietet.
   - Risiko: Ohne Offenlegung droht Irreführung durch Unterlassen (RDG, § 5a UWG). Gilt nur als allgemeine Information. Vergleiche nach § 6 UWG nur objektiv. Hochgeladene Verträge streng zweckgebunden behandeln und Löschfristen festlegen.

3. Vertrauensarchitektur: Mensch, Vertragspartner und Ängste [DACH | Wirkung sehr hoch | Aufwand klein bis mittel]
   - (a) Telefon und E-Mail freigeben. Auf den Zielgruppen- und Regionsseiten eine Ansprechpartner-Karte mit Foto, Name, Region und Direktwahl. Notfalls zeigt sie die Geschäftsführung.
   - (b) Baustein „Mit wem schließen Sie ab?“: Gesellschaft je Land, anwendbares Recht, Gerichtsstand, wer im Grundbuch steht.
   - (c) Seite „Was, wenn …?“ je Zielgruppe und Land: Insolvenz des Betreibers, Verkauf des Parks, Verlängerungsoption, Bürgerprotest, Netzrisiko. Jeweils mit Vertragsklausel und offen benanntem Restrisiko.
   - (d) Echte Verpächter-Referenzgespräche (Irsingen, Artern, Tilleda), nur mit Einwilligung.
   - (e) Öffentliches Anti-Druck-Versprechen: mindestens 4 Wochen Prüfzeit, Musterverträge vorab.
   - Alleinstellung: Ehrlichkeit wird zum Prinzip. Die Ansätze dafür gibt es schon (Investoren-FAQ „Ehrlich: …“, Vertrauensleiste).
   - Risiko: Erreichbarkeit muss wirklich gegeben sein. Insolvenz- und Grundbuchaussagen müssen juristisch je Land geprüft werden (§ 1092 BGB, ABGB, ZGB). Referenzen nach § 5a UWG ohne geschönte Auswahl.

4. Speed-to-Lead und erklärbarer Lead-Score [DACH | Wirkung sehr hoch | Aufwand mittel]
   - Ein regelbasiertes Modul leadScore.js für alle Vorgangstypen, nicht nur für Flächen, mit Begründung je Score.
   - Gestaffelte SLA: A in 1 Stunde, B am selben Tag, C in 2 Werktagen.
   - Sofortige Zuweisung nach Gebiet und Fachrolle statt „alle Admins“.
   - Seed-Regeln aktivieren (bo-seed.js:146-148).
   - Feiertage je Land einrechnen.
   - Terminbuchung im Erfolgsschritt, verknüpft mit der Vorgangs-ID. Neue Terminarten für Investor, Reststrom und Projektanbieter.
   - Pipeline mit Kontaktversuchen 1/2/3, strukturierten Verlustgründen und der Trennung gewonnen/verloren.
   - Risiko: Der Score darf nur priorisieren, nie ablehnen (Art. 22 DSGVO, Eintrag im Verzeichnis der Verarbeitungstätigkeiten). Öffentliche Reaktionszeiten erst versprechen, wenn sie über Wochen gemessen gehalten werden (§ 5 UWG).

5. Gemeinderats-Werkzeuge: Kommunal-Rechner 2.0 und öffentliches „Sitzungspaket“ [zuerst DE; AT und CH eigene Seiten | Wirkung sehr hoch | Aufwand mittel]
   Zusammengeführt aus Gemeinde-Report, Sitzungspaket und Kommunal-Rechner 2.0.
   - Landesrecht-Engine: max(§ 6 EEG, Landespflicht) für BB, MV, NDS, ST, mit Stand und Quelle.
   - Amtlicher Hebesatz je Gemeinde, Freibetrag nach § 11 GewStG.
   - Die PDF-Engine des Gemeindecockpits (cockpit.js, MATERIAL_VORLAGEN) öffentlich ohne Projektdaten nutzen: Sachverhalt, Wertschöpfung, Zeitplan, § 6-Checkliste, Bürger-FAQ. Abgabe gegen Dienst-E-Mail mit DOI.
   - AT: eigene Seite (Widmung, Gemeindebeitrag, Gemeinde-EEG nach ElWG mit 10-%-Reservierung).
   - CH: eigene Seite (LEG, Baugesuch, Botschaftsentwurf mit Pro und Kontra).
   - Ausbaustufe: Gemeinde-Spiegel aus dem Marktstammdatenregister (MaStR, DL-DE BY 2.0), ohne „Schlusslicht“-Rankings.
   - Alleinstellung: Ein gemeindegenaues, länderscharfes Sitzungsdokument fehlt bisher im Markt.
   - Risiko: Keine Verknüpfung von Zahlungen mit Beschlüssen (§ 6 Abs. 4 EEG, §§ 331 ff. StGB). Die Werte landen in öffentlichen Protokollen, daher Vier-Augen-Prüfung.

6. Strikte Ländertrennung in Rechnern, Seiten und Konto [DACH | Wirkung hoch | Aufwand groß, Sofortteil klein]
   - Sofort: AT- und CH-Optionen in Rechnern, die nur deutsche Logik haben, ausblenden oder kennzeichnen. Betroffen sind Pacht, Solarpark, Pachtangebot, Kommune (Teilen-Link) und Agri-PV (deutsche GAP für AT, Euro statt CHF). Reststrom als „nur Deutschland“ kennzeichnen.
   - Danach: Länderpfade für Landwirte, Kommunen und Pacht (/…/at, /…/ch, hreflang de-AT/de-CH). Eigene Datensätze AGRI_AT, AGRI_CH, PACHT_CH in CHF.
   - Feld „Land des Vorhabens“ am Konto für länderreine Onboarding-Mails und AGB.
   - Alleinstellung: Saubere Rechenlogik für drei Länder ist teures Spezialwissen.
   - Risiko: hoher Pflegeaufwand, deshalb Stand-Datum je Wert.

7. Wiederkehr durch Nutzen statt Druck [DACH | Wirkung hoch | Aufwand mittel]
   - „Meine Berechnungen“ im Konto: Neuberechnung bei Änderungen in markt.js, Meldung per Opt-in.
   - Gewerbestrom-Preisspiegel und Preisalarm je Land (Daten von ElCom, ENTSO-E und Netzbetreibern, Lizenzen prüfen). Daraus entstehen Reststrom-Leads mit bekanntem Vertragsende.
   - Projektbörse-Suchauftrag per DOI.
   - Quartalsbrief für Verpächter in der Wartezeit von 2–4 Jahren.
   - Cockpit „festhängende Konten“: Der Onboarding-Snapshot wird schon gespeichert, aber nur für Backoffice-Konten ausgewertet.
   - Risiko: Werbe-Einwilligung je Land (DE § 7 UWG, AT § 174 TKG 2021 auch B2B, CH Art. 3 lit. o UWG). Ein Preisspiegel ohne monatliche Pflege schadet dem Vertrauen.

8. Landwirte-Werkzeuge und Multiplikatoren [DACH | Wirkung hoch | Aufwand mittel bis groß]
   - Ergebnis des WegeEntscheiders und die Felder ha, Kultur und Gemarkung ins Formular übernehmen (Quick Win).
   - Hofübergabe-Planer (zwei Generationen, PDF mit Verweis auf Steuerberatung).
   - Später: Schlag-Check, in AT über die öffentliche INVEKOS-OGC-API, in DE nur Upload durch den Landwirt. Bewirtschaftungsplaner mit Lichtkarte (pvlib/InSPIRE, BSD).
   - Wintervortrags-Baukasten, Webinare, Partnerschaft mit Maschinenringen.
   - Risiko: StBerG, RDG, WTBG; Ertrag nur als Spanne; keine Logos von Kammern oder Verbänden ohne Zustimmung.

Aufgelöste Widersprüche:
- PDF gegen „Name, E-Mail, Telefon“ (Wunsch des Inhabers) gegenüber nur E-Mail (Experten): Entscheidung für E-Mail als Pflicht und Telefon freiwillig mit Nutzenversprechen. Die Datenqualität ist besser, und die Telefon-Einwilligung ist rechtssauber.
- Gemeinde-Report: Die Idee des UX-Forschers geht im Sitzungspaket des Kommunal-Experten auf, weil die Engine dafür schon existiert.
- Empfehlungsprogramm: nur Teilen durch den Nutzer selbst, keine „Tell-a-friend“-Mail (BGH I ZR 208/12), keine Prämien für Investoren- oder Genossenschaftsvermittlung.

2) KRITISCHE FEHLER IM BESTAND (sofort beheben)

Recht und Vertrauen:
- src/data/site.js:45/47 (telefon und email null): Impressum ohne E-Mail, Risiko nach § 5 ECG (AT) bzw. § 5 DDG (DE).
- src/app/barrierefreiheit/page.js:146/175: Ergibt „mailto:null“.
- src/app/datenschutz/page.js:139: Zeigt einen Platzhalter statt einer Kontaktadresse.
- src/app/freiflaeche/page.js:270: „zurück – garantiert“ widerspricht der Verlängerungsoption 2 × 5 Jahre (markt.js PACHT). Irreführungsrisiko nach § 5 UWG.
- src/app/landwirte/page.js:91/233: „wetterunabhängig“ stimmt nur bei Festpacht.
- src/app/api/anfrage/route.js:7/11 und AnfrageFormular.js: Die Pflicht-Einwilligung ist falsch zugeschnitten, richtig wäre Art. 6 Abs. 1 lit. b DSGVO mit einem Hinweis. Gleichzeitig fehlt eine optionale, protokollierte Werbe-Einwilligung. Nachfassen ist deshalb rechtlich nicht gedeckt.
- PachtangebotCheck.js: Die Offenlegung „wir sind selbst Entwickler“ fehlt. Der CTA bei :285 führt auf einen leeren /flaechencheck, die Angebotsdaten gehen verloren.

Falsche Zahlen und Länder vermischt:
- src/lib/rechner/pacht.js:63-74, solarpark.js, PachtangebotCheck.js:24, agriPv.js: AT und CH werden mit deutschem EEG, deutscher Destatis-Pacht, deutscher GAP (250 €/ha) und in Euro statt CHF gerechnet.
- KommuneRechner.js:36: Ein Link mit ?regionId=at rechnet deutsche Gewerbesteuer.
- reststrom.js: nur deutsche Logik, ohne Kennzeichnung.
- Vertrag.js (STEUERN) und die FAQ auf /flaeche-verpachten: deutsches Steuerrecht ohne DE-Kennzeichnung.
- Pachtspanne „DACH“ in Euro (markt.js:232).
- src/lib/rechner/kommune.js: Landespflichtzahlungen fehlen. In ST wird die Zahlung um mindestens 50 % unterschätzt, in BB, MV und NDS ist sie nicht „freiwillig“.
- src/app/kommunen/page.js, FAQ zu AT und CH: Die UVP-Aussage widerspricht dem eigenen Ratgeber. Für CH ist „Nutzungsplanung“ falsch, richtig sind Baugesuch und Art. 24ter RPG.
- Kommune/Seite/Verfahren.js: „Öffentliche Auslegung“ heißt seit der BauGB-Novelle „Veröffentlichung im Internet“.
- src/content/ratgeber/agri-pv-foerderung-gap.js: „85 %“ wird auf § 12 GAPDZV gestützt. Der Wortlaut nennt nur „höchstens 15 % Flächenverlust“.
- AGRI.direktzahlungProHa = 250: vermutlich zu hoch, Abgleich mit BAnz AT 31.03.2026 B6 nötig.
- Reservierungsprämie: Laut markt.js:247 „einmalig“, auf den Seiten „je ha und Jahr“, in Pachtmodelle.js:105 ohne Einheit. Klären und vereinheitlichen.

Prozess:
- bo-seed.js:146-148: SLA-Eskalation, Eingangsbestätigung und „qualifiziert → Angebot“ stehen auf aktiv:false.
- demo.js anfrageAnlegen: zustaendigId ist null.
- bo-kern.js:216: Einen Score gibt es nur für Flächen.
- herkunft.js kanal(): Die Google-Regex greift vor der KI-Prüfung, gemini.google.com zählt deshalb als Suchmaschine.
- termin/page.js:20/40: keine Vorgangs-ID, HERKUNFT zu eng. „MEZ (Wien/Berlin)“ stimmt nicht für die Sommerzeit, Zürich fehlt.
- Kommune-Onboardingpfad verspricht „Projekte im Gemeindegebiet“. In konstanten.js gibt es dafür keine Benachrichtigungsart.
- En/ContactForm.js:98-115: Die Registrierung wird nicht vorbelegt.

3) QUICK WINS (Stunden bis wenige Tage)

- Telefon und E-Mail in site.js eintragen, sobald die Erreichbarkeit gesichert ist. Null-Fall in barrierefreiheit/page.js absichern.
- „garantiert“ und „wetterunabhängig“ umformulieren. Verlängerungsoption offen nennen.
- Bei Pacht-, Solarpark-, Pachtangebot-, Agri-PV- und Kommune-Rechner die AT/CH-Optionen ausblenden oder als „Modell auf DE-Basis“ kennzeichnen. Reststrom mit „nur Deutschland“ markieren. Länder-Badge DE an Steuer- und Rechtskacheln.
- ErgebnisAnfrage in Pacht, Pachtangebot-Check (mit Offenlegungssatz), Agri-PV, Kommune, Dachpacht, Carport, Netzanschluss, Energy Sharing und Projektbewertung einbauen. Ergebnis zusätzlich strukturiert in `daten` mitgeben.
- Pflicht-Haken durch einen Datenschutzhinweis ersetzen, nach Freigabe durch die Rechtsabteilung. Optionales, nicht vorausgewähltes Werbe-Opt-in mit Protokoll (Zeitstempel, Textversion).
- Seed-Regeln „Eingangsbestätigung“ und „Zuständigen nach Gebiet setzen + Aufgabe Erstkontakt“ für alle Typen aktivieren.
- Terminbuchung mit Vorgangs-ID im Erfolgsschritt. Zeitangabe zu „mitteleuropäische Zeit (Berlin, Wien, Zürich)“ korrigieren.
- herkunft.js: KI-Prüfung vor die Suchmaschinen-Prüfung ziehen.
- Ergebnis des WegeEntscheiders und die Felder ha, Kultur, Gemarkung an das Landwirte-Formular übergeben.
- /kommunen: FAQ zu AT und CH korrigieren. Kasten „Landesrecht beachten“ (BB, MV, NDS, ST). Begriff zu „Veröffentlichung im Internet“ ändern. Hinweis zum Hebesatz ergänzen.
- GAP-Ratgeber: Norm für die 85 % korrigieren. Direktzahlungswert mit Quelle abgleichen.
- Reservierungsprämie klären und überall mit Einheit angeben.
- FAQ „Was passiert bei einer Insolvenz des Betreibers?“ auf allen Flächenseiten, nach juristischer Prüfung.
- Benachrichtigungsart „gemeinde“ in konstanten.js. „kommune“ in hauptRolle() und ersteSchritte(). Vorbelegung in En/ContactForm.js.
- Interne Kennzahl „Median Zeit bis Erstkontakt“ im Backoffice anzeigen, bevor öffentliche Versprechen geändert werden.

4) ROTE LINIEN UND WARNUNGEN

- Keine Knappheit, Countdowns, Fake-Zähler oder vorausgewählten Haken. Kein Druck bei Verträgen über 30 Jahre (UWG Anhang Nr. 7, § 4a UWG). Sofort-Rückruf nur bei echter Verfügbarkeit anzeigen.
- Das Rechner-Ergebnis nie hinter einer Kontaktsperre verstecken. Die Werbe-Einwilligung nie an den Bericht koppeln (Art. 7 Abs. 4 DSGVO).
- Werbung je Land:
  - AT: Werbeanrufe und Werbe-E-Mails brauchen auch gegenüber Unternehmen eine vorherige Einwilligung (§ 174 TKG 2021).
  - DE: Telefonwerbung an Verbraucher, also an viele Landwirte und Eigentümer, nur mit ausdrücklicher Einwilligung. Dokumentation 5 Jahre aufbewahren (§ 7a UWG).
  - CH: Art. 3 lit. o und u UWG beachten.
  - Ein Rückruf auf die konkrete Anfrage ist zulässig, Nachfassen ist Werbung. Keine Kaltakquise per E-Mail an Gemeinden.
- Testimonials und Referenzen nur echt, mit schriftlicher Einwilligung, Vergütung offengelegt, ohne Gating (§§ 5a und 5b UWG).
- Keine Tell-a-friend-Mails durch ÖkoInvest. Keine Prämien für die Vermittlung von Investoren oder Genossenschaftsanteilen (§§ 34c/34f GewO, VermAnlG, WAG, FIDLEG).
- Prüf- und Steuerwerkzeuge nur als allgemeine Information, keine Einzelfallberatung (RDG, StBerG, WTBG).
- Bei Gemeinden: Zahlungen nie mit Beschlüssen verknüpfen (§ 6 Abs. 4 EEG, StGB). Keine Direktvergabe gemeindeeigener Flächen suggerieren. Abstimmungsentwürfe für CH ausgewogen halten.
- Lead- und Kunden-Scores nur zur Priorisierung (Art. 22 DSGVO). In Datenschutzerklärung und Verzeichnis der Verarbeitungstätigkeiten aufnehmen.
- Daten nur aus offenen Quellen mit geprüfter Lizenz: MaStR (DL-DE BY 2.0), ElCom, ENTSO-E, AMA-INVEKOS-API. Keine Vergleichsportal-Datenbanken übernehmen (§ 87b UrhG), kein Scraping, Versorger nur sachlich nennen (§ 6 UWG).
- GitHub-Funde nur als Idee nutzen, keinen Code übernehmen (openleg AGPL, ee-status GPLv3).
- Rechercheeinschränkung: Das Web-Suchkontingent war bei allen Experten aufgebraucht. Vor der Veröffentlichung juristisch bzw. fachlich nachprüfen:
  - Direktzahlungsbeträge
  - Landesgesetze außer NDS und ST
  - CH-Normen (fedlex)
  - HBR-Zahlen zu Online-Leads
  - Insolvenzfestigkeit der Dienstbarkeit

Quellen sind die Experten-Quellen wie oben, dazu die selbst geprüften Code-Stellen:
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/data/site.js:45-47
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/freiflaeche/page.js:270
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/landwirte/page.js:91, :233
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/api/anfrage/route.js:7-11
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Rechner/ErgebnisAnfrage.js (nur 4 Verwender)
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/rechner/kommune.js und src/components/Rechner/KommuneRechner.js:36

## SEO & SEM
TEAM SEO & SEM – Bündel für den Strategie-Rat (Stand 03.10.2026)

Selbst nachgeprüft (Code, read-only):
- Bestätigt: `ereignis()` aus src/lib/statistik.js wird nirgends importiert. Die anderen Treffer für „ereignis“ gehören zur Portal- und EG-Logik, nicht zum Tracking. GA4 misst also keine einzige Conversion.
- Bestätigt: src/components/Statistik/GoogleAnalytics.js Z. 20 schließt nur `scan|fortsetzen|tv|angebot` aus. Nach einer Einwilligung gehen `/einladung/*/[token]` und `/portal/**` mit Objekt-IDs im page_path an Google.
- Bestätigt: Im ganzen Code gibt es 0 Treffer für gclid, msclkid, li_fat_id und sameAs. Klick-IDs und Entitätsverweise fehlen also komplett.
- Bestätigt: src/app/regionen/[slug]/page.js Z. 52 setzt `locale: "de_DE"` fest für alle 26 Regionen. Dasselbe gilt für layout.js, ratgeber/[slug] und RechnerSeite.js.
- Bestätigt: `htmlLimitedBots` fehlt in next.config.mjs. Dass Metadaten für KI-Crawler ins `<body>` gestreamt werden, ist nur im Dev-Modus gemessen. Vor dem Fix mit `next build` + `next start` und dem User-Agent OAI-SearchBot gegenprüfen.

1) STÄRKSTE INITIATIVEN (priorisiert, Dubletten zusammengeführt)

**I-1 Mess- und Lead-Fundament „Klick bis Vertrag“** [DACH | Wirkung sehr hoch | Aufwand klein bis mittel]
- Zusammengeführt aus Ads, Social, Tracking und Attribution.
- Stufe A (sofort, ohne neue Einwilligung):
  - Lead-Ereignisse in GA4 senden: generate_lead, sign_up, termin_gebucht, rechner_ergebnis, bericht_angefordert, jeweils mit dem Parameter `markt` (DE/AT/CH).
  - Klick-IDs (gclid, gbraid, wbraid, msclkid, li_fat_id) nur im Arbeitsspeicher erfassen und mit der Anfrage ins eigene CRM geben.
  - Herkunft auch bei Registrierung und Terminbuchung mitsenden.
- Stufe B: Consent-Kategorie „Marketing“ mit versionierter Einwilligung und serverseitigem Einwilligungsnachweis.
- Stufe C: Offline-Conversions nach CRM-Stufen mit Wert (Anfrage → qualifiziert → Termin → LOI/Vertrag) über die Google Data Manager API (Pflicht ab 15.06.2026), Microsoft Offline Goals und LinkedIn CAPI.
- Alleinstellung: Der Monatsbericht hat den CRM-Trichter je Kanal schon. Gebote auf qualifizierte Hektar statt auf Formulare holt kein Projektierer schnell auf.
- Risiko: Stufe B und C nur mit dokumentierter Einwilligung (ad_user_data), angepasster Datenschutzerklärung und Prüfung, ob Auftragsverarbeitung oder gemeinsame Verantwortung vorliegt. Für CH vorerst kein Sondermodus ohne juristische Freigabe.

**I-2 Gewerbestrom- und Netzentgelt-Atlas DACH** [DACH | Wirkung sehr hoch | Aufwand groß]
- Zusammengeführt aus 6 von 7 Experten. Das ist zugleich das Ziel des Inhabers.
- Reihenfolge:
  1. CH zuerst: ElCom-Tarife C1–C7 je Gemeinde, Netzbetreiber und Kanton über LINDAS. Offene Daten, schnellster Weg, alles in CHF.
  2. AT: SNE-VO aus dem RIS (amtliches Werk), Netzentgelte je Netzbereich inkl. Leistungspreis 2027 und EG-Ortstarif.
  3. DE: Preisblätter der Verteilnetzbetreiber (Veröffentlichungspflicht nach § 20 EnWG, Vier-Augen-Prüfung), zuerst die rund 150 größten. Dazu Börsenanteil aus SMARD (Nennung „Bundesnetzagentur | SMARD.de“).
- Lead-Angebot: Übersicht frei sichtbar, PDF-Kostencheck gegen Kontaktdaten. Dazu Pressemitteilung zum Monatswechsel und einbettbare Grafik.
- Alleinstellung: Ein neutraler, quellenbelegter Atlas mit Zeitreihe über drei Länder existiert nicht. Heute zitieren KI-Antworten nur Momentaufnahmen (strom-report, wattline-PR).
- Risiko:
  - Kein Abgreifen von Vergleichsportalen oder ene't (§ 87b UrhG DE / § 76d UrhG AT).
  - Vergleiche nur objektiv, nachprüfbar und datiert (§ 6 UWG DE, § 2a UWG AT, Art. 3 UWG CH).
  - Lizenzen von ElCom/LINDAS und Energy-Charts sind live noch nicht geprüft.
  - Für AT/CH-Reststrom fehlt heute die Rechenlogik.

**I-3 Länder-Architektur /at/ und /ch/ mit hreflang-Clustern** [DACH | Wirkung sehr hoch | Aufwand groß]
- Grundaufbau:
  - Die Wurzel bleibt de-DE.
  - Länderzwillinge entstehen nur dort, wo sich Recht, Rechenlogik und Begriffe wirklich unterscheiden: Pacht, Agri-PV, Freifläche/Genehmigung, Kommunen, EG (AT als Hauptversion), Gewerbestrom.
  - hreflang mit de-DE, de-AT, de-CH, en und x-default, auch in der Sitemap. Länderwähler als Banner, keine Weiterleitung nach IP.
- Erste Inhaltswelle:
  - AT-Cluster: Widmung und Zonierung je Bundesland, EAG und OeMAG, EG mit ElWG, AT-Steuer- und Pachtvertragsartikel.
  - CH-Cluster: Art. 24ter RPG, Solarexpress, Pronovo, ZEV/vZEV/LEG-Rechner in CHF, Kantonsseiten.
- Voraussetzung: PACHT und STROM in markt.js nach DE, AT und CH aufteilen.
- Alleinstellung: In AT und CH ranken heute unpassende DE-Seiten. Die Firma sitzt in AT und hat eigene EG-Software.
- Risiko:
  - Zwillinge brauchen mindestens 40–50 % eigenen Inhalt, sonst legt Google sie als Duplikate zusammen.
  - Fehlende Rückverweise machen das Cluster wirkungslos.
  - Rechtstexte vorab von den Energierechtlern AT, DE und CH freigeben lassen.

**I-4 Eigene Primärdaten: Pachtindex DACH plus zitierfähiges Datenzentrum /marktdaten** [DACH | Wirkung sehr hoch | Aufwand mittel]
- Zusammengeführt aus GEO und Digital PR.
- Pachtindex: anonymisierte Werte aus Pachtangebot-Check, Flächencheck und eigenen Verhandlungen, je Land und Region, nur ab einer Mindestfallzahl je Zelle (n ≥ 10–15). Mit Methodenseite, CSV, CC BY 4.0 und Pressemitteilung (APA-OTS, topagrar, pv magazine).
- /marktdaten bekommt: license, distribution (CSV/JSON) und version im Dataset-Schema, einen Kasten „So zitieren Sie“, Anker je Gebotstermin, Aktualisierung binnen 24 Stunden nach BNetzA-Meldungen plus IndexNow, Ausbau um die AT-EAG- und CH-Pronovo-Daten.
- Alleinstellung: Mit jedem Quartal wächst eine Zeitreihe, die niemand nachträglich aufholen kann. KI-Systeme zitieren bevorzugt Statistiken mit Quelle (GEO-Studie: +30–40 %).
- Risiko:
  - Ausdrückliche Einwilligung im Formular, k-Anonymität.
  - Ohne echte Daten keinen „Index“ veröffentlichen (§ 5 UWG).
  - Fehler verbreiten sich in KI-Antworten weiter.

**I-5 Programmatische Seiten nur hinter einer Qualitätsschranke** [DACH | Wirkung hoch | Aufwand mittel]
- Build-Gate: Seiten ohne genug eigene Datenpunkte, mit veraltetem Stand, fehlenden Quellen, hoher Ähnlichkeit zu Nachbarseiten oder falscher Landeslogik bekommen automatisch noindex und fallen aus der Sitemap.
- Darauf aufbauend, in Wellen:
  - Netzbetreiber- und EG-Guides: 20–30 Verteilnetzbetreiber, Marken nur beschreibend nennen.
  - CH: 26 Kantonsseiten.
  - DE: zuerst 30 Landkreis-Dossiers aus MaStR (DL-DE-BY-2.0), BNetzA-Zuschlägen und der Kulisse.
  - Gemeinde-Suche als noindex-Werkzeug statt 10.000 Gemeindeseiten.
- Risiko: Spam-Richtlinien zu Scaled Content und Doorway-Seiten können die ganze Domain treffen. Deshalb Start mit 30–50 Seiten.

**I-6 Entität und E-E-A-T** [DACH | Wirkung sehr hoch als Voraussetzung | Aufwand klein]
- sameAs ergänzen: Firmenbuch FN 541505g, North Data, LinkedIn, ÖKOVOLT-Seiten, Wikidata (nur belegbare Angaben).
- Telefon und E-Mail freigeben (in site.js heute null).
- Abgrenzung zum Informationsdienst „Öko-Invest“ in Wien (seit 1991) auf /unternehmen und in llms.txt.
- Namentliche Fachautoren und Fachprüfer (Person-Schema, reviewedBy), dazu ein Feld `land` je Artikel. Daraus inLanguage und og:locale ableiten.
- Seite /presse anlegen; Google Business Profile nur für Ostermiething als Service-Area-Betrieb.
- Risiko: Kollision mit der Marke „Öko-Invest“ vor weiterem Markenaufbau prüfen lassen. Nur echte Personen nennen, mit deren Einwilligung.

**I-7 Kannibalisierung auflösen** [DACH | Wirkung hoch | Aufwand klein]
- Rollen festlegen: Landingpage = Abschluss, Rechner = „berechnen“, Ratgeber = Wissen.
- Keyword-zu-URL-Tabelle in docs/, ein Build-Check verhindert doppelte Hauptkeywords.
- Betroffene Paare:
  - /reststrom ↔ /rechner/reststrom
  - /dachflaeche-verpachten ↔ /rechner/dachpacht
  - /kommunen ↔ /rechner/kommune
  - /grossspeicher ↔ /rechner/grossspeicher
  - Zwei EG-Rechner: /energiegemeinschaften/rechner wird reiner AT-Rechner, /rechner/energy-sharing wird „DE + LEG CH“; beide verlinken sich gegenseitig, alternativ 301.

**I-8 Distribution über legitime Reichweite Dritter** [DACH, Schwerpunkt AT | Wirkung hoch | Aufwand klein bis mittel]
- Eintrag in die Dienstleisterliste von energiegemeinschaften.gv.at: Das ist heute die meistzitierte Quelle für EG-Software. Vorher den Kodex prüfen.
- Einbett-Widgets (Pachtrechner, Strompreis-Ticker, EG-Rechner AT) für Kammern, Maschinenringe, Energieagenturen und Gemeinden. Nur mit Markenanker, kein versteckter Link.
- Gemeinde-Leitfaden je Land, Reaktiv-PR zu jeder Ausschreibungsrunde, Stadtwerke als Datenpartner für den Atlas.
- LinkedIn: Thought Leader und quartalsweiser Pipeline-Report für Investoren über Lead Gen Forms mit Lead Sync.
- Ads: zuerst Länder-Kampagnen mit Standort-Ausrichtung „Präsenz“ und Negativ-Keyword-Liste ab Tag 1. Bezahlte Anzeigen erst nach I-1 Stufe A.

Widersprüche aufgelöst:
- Klick-IDs:
  - Erfassen im Arbeitsspeicher und Speichern im eigenen CRM: ohne Ads-Einwilligung zulässig (Tracking-Experte).
  - Cookie-Speicherung und Weitergabe an Google, Microsoft oder LinkedIn: nur mit Marketing-Einwilligung.
  - Das löst den Einwand des Social-Experten, der Klick-IDs „nur nach Einwilligung“ erfassen wollte.
- Consent Mode: Basic bleibt (Tag lädt erst nach Einwilligung). Advanced Mode mit cookielosen Pings vor der Einwilligung kommt in DE und AT nicht zum Einsatz.
- Meta: Für Landwirte nur auf Landingpages mit Rechner leiten statt Instant Forms. Die CRM-Rückkopplung „Conversion Leads“ braucht mindestens 200 Leads pro Monat, das wird in dieser Nische nicht erreicht.

2) KRITISCHE FEHLER IM BESTAND (sofort beheben)
1. **Token-Leck an Google.** GoogleAnalytics.js Z. 20: /einladung (5 Token-Routen), /login/link und /portal fehlen in AUSGENOMMEN. src/lib/herkunft.js Z. 32/59 schreibt /angebot- und /einladung-Codes zudem im Klartext ins CRM. Beides über eine gemeinsame Konstante lösen. Selbst bestätigt.
2. **Keine Conversion-Messung.** `ereignis()` ist toter Code. Gleichzeitig behaupten cookiecomponent.js Z. 73 und datenschutz/page.js Z. 709 „Ereignisse wie gesendete Formulare“; diese Aussage ist heute falsch. Selbst bestätigt.
3. **Cookie-Banner (cookiecomponent.js).**
   - „Weiter ohne Einwilligung“ speichert die angehakte Auswahl, also kann darüber doch eingewilligt werden (Z. 300–305).
   - Der Textbaustein zu berechtigtem Interesse und Widerspruch beschreibt einen Dienst, den es nicht gibt (Z. 283–290).
   - Art. 49 und Art. 45 DSGVO widersprechen sich (Z. 314–320 gegen Z. 86 und die Datenschutzerklärung).
   - Altbestand googleMaps.
   - Keine Version und kein Zeitstempel im Einwilligungs-Cookie.
   - Auf der ersten Ebene fehlen die Links zu Datenschutz und Impressum.
4. **/regionen/schweiz** zeigt eine Euro-Pachtspanne als „DACH-Spanne“ (page.js Z. 341–353, RegionKennzahlen.js). Die eigene Datei schweiz.js Z. 130/213 sagt, diese Spanne sei nicht übertragbar.
5. **og:locale und inLanguage** stehen überall fest auf de_DE / de-DE, auch für die 9 AT-Bundesländer, die Schweiz und die AT/CH-Ratgeber. Selbst bestätigt.
6. **markt.js:**
   - PACHT gilt als eine DACH-Spanne für alle Länder; 22 von 26 Regionen zeigen dadurch dieselbe „Pacht in <Region>“.
   - Zwei Werte für die Ackerpacht: 380 €/ha (markt.js) gegen 357 €/ha (marktdaten.js, Destatis 2023).
   - CH-Ertrag 1.050 (markt.js Z. 35) gegen 1.230 kWh/kWp (schweiz.js).
   - CO₂-Faktor 0,65 kg/kWh (DE) gilt für alle Länder.
7. **/energie-live** zeigt nur die Gebotszone DE-LU (energy.js Z. 46/72), ohne Kennzeichnung für AT-Nutzer.
8. **KI-Crawler:** `htmlLimitedBots` fehlt in next.config.mjs, dazu steht ein `<title>` im Logo-SVG. Das ist im Prod-Build zu verifizieren.
9. **Weitere Einzelfehler:**
   - Lead-Formulare ohne Landesfeld, obwohl AT- und CH-Postleitzahlen beide vierstellig sind (KontaktAnliegen.js); AnfrageFormular Z. 68 setzt standardmäßig „DE“.
   - Registrierung und Termin werden ohne Herkunft gesendet.
   - Teilen.js setzt beim E-Mail-Teilen utm_medium=social.
   - utm_term fehlt in herkunftZeile.
   - src/lib/hreflang.js ist eine ÖKOVOLT-Altlast mit fremden Domains.
   - baseUrl.js liefert in Produktion localhost:3000 zurück.
   - llms.txt nennt eine fest eingetragene, noch nicht erreichbare Domain.

3) QUICK WINS (jeweils unter 1 Tag)
- Ausschlussliste in GA und herkunft.js erweitern (unter 1 Stunde).
- `ereignis()` an 5 Stellen verdrahten und in GA4 als Key Events markieren (etwa 2 Stunden).
- Klick-IDs und utm_term erfassen; Herkunft auch bei Registrierung und Terminbuchung mitsenden.
- og:locale und inLanguage aus `r.land` bzw. einem neuen Feld `land` je Artikel ableiten.
- Schweiz-Seite: die Euro-Spanne für CH ausblenden und den Text aus schweiz.js zeigen. „Pacht in <Region>“ umbenennen in „Orientierung (DACH-Spanne)“.
- Ackerpacht auf einen Wert mit Quelle vereinheitlichen, CH-Ertrag abgleichen.
- `htmlLimitedBots` setzen, SVG-`<title>` entfernen, danach mit curl -A OAI-SearchBot prüfen.
- Banner-Texte bereinigen, Einwilligungs-Cookie um Version und Zeitstempel ergänzen, Links auf erster Ebene, Knopf in „Auswahl speichern“ umbenennen.
- Dataset-Schema auf /marktdaten um license, distribution und version ergänzen, CSV-Route und Zitierkasten bereitstellen.
- Organization-Schema: sameAs ergänzen, Kontaktdaten freigeben, Abgrenzung zu Öko-Invest (Wien).
- Eintrag in die Dienstleisterliste von energiegemeinschaften.gv.at beantragen.
- Rein deutschen Ratgeber-Artikeln „(Deutschland)“ in den Titel setzen: Steuern Landwirt, § 6 EEG, Repowering, Artenschutz u. a.
- /energie-live als „DE/LU“ kennzeichnen; die Umschaltung auf bzn=AT/CH vorbereiten, zuerst die Lizenz prüfen.
- src/lib/hreflang.js löschen; die gelöschte public/robots.txt mit committen.
- Landesfeld in alle Anliegen aufnehmen; Land aus Regionsseite oder `?land=` vorbelegen.
- Search Console, Bing Webmaster Tools und IndexNow einrichten, sobald die Domain feststeht; GA4-Segment für KI-Verweise anlegen.
- Negativ-Keyword-Liste auf Kontoebene anlegen; UTM-Konvention dokumentieren.

4) ROTE LINIEN UND WARNUNGEN
- Kein Abgreifen von Vergleichsportalen, ene't, dem E-Control-Tarifkalkulator oder der LinkedIn-Oberfläche. Nur amtliche bzw. offen lizenzierte Quellen mit Quelle und Stand.
- Vergleiche nur objektiv, nachprüfbar und datiert. Fremde Marken (Versorger, Netzbetreiber, Wettbewerber) nie in Anzeigentext, Display-Pfad, Sitelinks, Domain oder Logo. Als Keyword nur nach Freigabe der Rechtsabteilung, bei Beschwerde sofort stoppen.
- Keine programmatischen Seiten ohne eigene Daten (Scaled Content / Doorway). Keine IP-Weiterleitung nach Land.
- Keine fast gleichen Länderzwillinge; hreflang erst bei echtem Unterschied im Inhalt.
- Server-Side Tagging und „Cookieless“-Lösungen ersetzen in DE und AT nicht die Einwilligung (§ 25 TDDDG, § 165 TKG 2021). Kein Fingerprinting, keine Firmen-Erkennung über die IP.
- Bericht gegen Kontaktdaten: Das Ergebnis bleibt frei sichtbar (Kopplungsverbot Art. 7 Abs. 4 DSGVO). Newsletter-Einwilligung separat; Werbeanrufe nur mit ausdrücklicher Einwilligung (§ 7 UWG DE, § 174 TKG AT).
- Kein „Index“ ohne echte Datenbasis. Interne Lead-Werte für Value-Based Bidding nie öffentlich zeigen.
- Keine Renditeversprechen in Anzeigen für Projektbörse und Genossenschaft (VermAnlG, KMG/AltFG, FIDLEG).
- Bei Meta können Botschaften zu Energiewende, Klima oder Gemeindepolitik seit 6.10.2025 als gesellschaftspolitisch eingestuft und in der EU abgelehnt werden (TTPA). Texte strikt produkt- und nutzenbezogen.
- Kein Linkkauf und keine Widget-Links mit Keyword-Ankern. Keine Anweisungen an KI-Systeme in Seiteninhalten.
- Bewusste Entscheidungen der Geschäftsführung, kein technischer Fix: Sperre von GPTBot, CCBot und Google-Extended; Markenkollision „Öko-Invest“ (Wien); Domainstrategie (.com mit Pfaden oder .de/.at/.ch) vor dem Messaufbau festlegen.
- Recherche-Lücken:
  - Suchvolumina und CPC-Spannen sind Erfahrungsschätzungen; vor Budget-Beschluss im Keyword-Planer je Land prüfen.
  - Lizenzen von ElCom/LINDAS und Energy-Charts (AT/CH) sowie Rechtsquellen (TDDDG, TKG, DSK) wurden nicht live geprüft.
  - Grund: Das Websuch-Kontingent war in mehreren Expertensitzungen erschöpft.
- Betrieb: Der Dev-Server auf localhost:3100 antwortete laut GEO-Experte ab etwa 05:40 Uhr nicht mehr, möglicherweise wegen Speicherdruck bei 8 GB RAM. Bitte prüfen; er wurde nicht angefasst.
- Nicht verfügbar: Die Plugins Ahrefs und Similarweb sowie der GitHub-Connector sind nicht autorisiert. Freigabe über die claude.ai-Connector-Einstellungen nötig, falls Volumina und eine tiefere GitHub-Recherche gewünscht sind.

Relevante Dateien:
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Statistik/GoogleAnalytics.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/statistik.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/herkunft.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Cookies/cookiecomponent.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/regionen/[slug]/page.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/invest/markt.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/next.config.mjs
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/layout.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/marktdaten/page.js

## Daten & Software
TEAM-ERGEBNIS „Daten & Software“ für den Strategie-Rat (Stand 2026-10-03)

SELBST GEPRÜFT (Team-Lead, im Code):
- Bestätigt: src/lib/ipAdresse.js:8 nimmt den ersten Eintrag aus X-Forwarded-For. Das ist der Wert, den der Client selbst setzen kann.
- Bestätigt: src/app/projektboerse/[slug]/page.js:96 und src/app/projektboerse/page.js:94 geben JSON-LD mit `JSON.stringify(jsonLd)` aus, ohne `<` zu escapen. Die zweite Seite war im Expertenbericht nicht genannt.
- Bestätigt: Die Rechner mischen die Länder. In solarpark.js:23/36 und pachtangebot.js:130 ist der EEG-Wert fest gesetzt, in netzanschluss.js:57/115/117 gelten der DE-Ertrag und der EEG-Erlös für alle Länder.
- Bestätigt: markt.js:402 setzt „Umlagen (KWKG, Offshore, § 19)“ auf 1,8 ct, markt.js:18 hat ein globales STAND. In footer.js:7 wird der CookieBanner statisch importiert.
- NICHT verifiziert: der Umlagen-Sollwert von rund 2,95 ct für 2026. netztransparenz.de lieferte 503, und das Websuch-Budget ist erschöpft. Das bleibt ein Prüfauftrag mit hoher Priorität.

1) DIE STÄRKSTEN INITIATIVEN (priorisiert, Dubletten zusammengeführt)

I-1 [DACH | Wirkung sehr hoch | Aufwand mittel] Serverseitiger Rechner-Bericht als Lead-Magnet
  Zusammengeführt aus den Vorschlägen von JS-Architekt, Data Scientist, KI-Produkt und Preisradar.
  - Neue Route POST /api/bericht. Der Server rechnet mit src/lib/rechner neu und übernimmt keine Zahlen vom Client.
  - Das PDF entsteht mit dem vorhandenen src/lib/plattform/server/pdf.js. Es enthält zu jeder Annahme Quelle, Stand und Status (amtlich/berechnet/Schätzung) sowie einen Hash der Marktdaten.
  - Versand als befristeter Link per E-Mail. Dieser Versand ist zugleich das Double-Opt-in.
  - Start mit dem Pachtangebot-Check: anonyme Datenspende per eigener Checkbox, damit wächst der Startbestand für I-6.
  - Das Ergebnis bleibt immer frei sichtbar. Nur der erweiterte Bericht kostet Kontaktdaten. Telefon ist optional, die Newsletter-Checkbox getrennt und nicht vorausgefüllt.
  - Alleinstellung: Ein Bericht mit belegter Annahme je Zeile kann an Bank oder Gemeinderat weitergereicht werden. Heute gibt es nur window.print().
  - Risiko: Kopplungsverbot (Art. 7 Abs. 4 DSGVO), Anlageberatungs-Nähe (Haftungshinweis nötig), CP1252-Zeichensatz.
  - Messung: Berichte je 100 Rechnernutzer, Opt-in-Quote über 70 %, Anteil Bericht → Erstgespräch je Land.

I-2 [DACH | Wirkung sehr hoch | Aufwand mittel bis groß] Strikte Ländertrennung in Daten und Rechenlogik
  - markt.js wird aufgeteilt in gemeinsam.js sowie markt/{de,at,ch}.js mit gleichem Schema. Jeder Wert erhält { wert, quelle, stand }, Zugriff nur über marktFuer(land).
  - Ein CI-Test bricht ab, wenn ein Schlüssel fehlt oder ein Wert älter als 12 Monate ist.
  - Alle Rechner verlangen `land` als Pflichtfeld und rechnen in CH in CHF/Rp.
  - Wo eine AT- oder CH-Logik noch fachlich ungeprüft ist, steht „in Vorbereitung“ statt eines deutschen Werts.
  - Nebeneffekt: kleinere Bundles. Heute wird die 48-KB-Datei in 69 Komponenten vollständig importiert.
  - Alleinstellung: 16 Rechner mit getrennter Rechtslage für drei Länder bietet im DACH-Raum aktuell niemand.
  - Risiko: Die Werte für AT und CH müssen die Energierechtler je Land freigeben. Fehlerhafte Logik ist ein UWG- und Haftungsthema.

I-3 [DACH | Wirkung sehr hoch | Aufwand groß, gestaffelt] Gewerbestrom-Preisradar mit drei sichtbar getrennten Datenqualitäten: amtlich, berechnet, Schätzung
  Zusammengeführt aus Preisradar, Gewerbestrom-Vergleich und Strompreis-Monitor.
  a) CH zuerst (Aufwand klein)
     - Quelle: ElCom über LINDAS-SPARQL, Lizenz Open-Use mit Quellenangabe. Die Tarife 2027 sind bereits veröffentlicht.
     - Die Mediane sinken in C1–C7, z. B. C3 von 25,00 auf 23,97 Rp.
     - 26 Kantonsseiten plus große Netzbetreiber. Gemeinden nur über Suche und mit noindex.
     - Der Aufruf zur Anfrage führt auf eine Interessentenliste, nicht auf ein Wechselversprechen.
  b) AT (Aufwand mittel)
     - Basis: SNE-V gemäß BGBl. II 305/2025 für 14 Netzbereiche.
     - Dazu ein Leistungspreis-Check 2027 nach dem SNE-G-V-Entwurf: Monatsspitze, 10-kW-Stufe auf NE7, 20 % Mindestverrechnung, SNAP/WiNAP.
     - Der Check führt zu Speicher, EG und Pool. Bis zur Kundmachung sind die Werte als „Entwurf“ gekennzeichnet.
  c) DE (Aufwand groß)
     - Der Nutzer gibt die PLZ ein und wählt daraus den Netzbetreiber (VNB).
     - Das Netzentgelt kommt aus dem Preisblatt, mit Herkunftsnachweis aus URL, Hash und Methode.
     - Dazu Umlagen, Stromsteuer und Konzessionsabgabe. Das ergibt eine amtliche Untergrenze plus eine gekennzeichnete Energiespanne.
     - Start mit den 50 größten VNB. Für den Rest eine Lizenz (ene't) oder die Freigabe der Netzbetreiber.
  d) Kopplung an den Reststrom-Rechner
     - Die PLZ ersetzt die Pauschale von 5,5 ct Netzentgelt. Die Anfrage wird mit Netzbetreiber, Spannungsebene und Vertragsende vorbefüllt.
     - Der bestehende Ersparnis-Deckel bleibt.
  - Unterbau: ein Datenschema mit snapshot_hash und Status. Plausibilitätsfunde (z. B. ein Sprung über 30 %) gehen in eine Prüfaufgabe und werden nicht automatisch veröffentlicht. Next.js liest nur aus diesem Schema, mit ISR und revalidateTag je Land.
  - Alleinstellung: Der Burggraben ist die Pflege der Daten und ihre Belegkette.
  - Risiko: Datenbankherstellerrecht (§ 87b UrhG DE, § 76c UrhG AT), Thin Content, § 5/§ 6 UWG.

I-4 [DACH | Wirkung sehr hoch | Aufwand groß] Länderrouting /de, /at, /ch vor dem Livegang
  - Struktur: app/(laender)/[land] mit generateStaticParams. Root-Layouts je Gruppe setzen lang auf de-DE, de-AT, de-CH bzw. en.
  - Ein zentrales Länderregister (src/lib/land) liefert die hreflang-Angaben, bidirektional und mit x-default. Ein Test prüft die Gegenseitigkeit.
  - Ein Geo-Hinweis bietet das Land an, leitet aber nicht weiter. Auch Bots werden nicht weitergeleitet.
  - Die Produktivdomain ist noch nicht festgelegt. Jetzt kostet der Umbau fast keine Rankings, nach dem Livegang wird er zu einer Migration mit Ranking-Risiko.
  - Nur dort Länderfassungen anlegen, wo sich Recht, Rechenlogik oder Markt wirklich unterscheiden. Keine 3×-Klone.
  - Aufwand: etwa 3–4 Personenwochen Entwicklung, ohne Redaktion.

I-5 [DACH | Wirkung hoch | Aufwand klein bis mittel] Lead-Pipeline: Scoring, Triage und Bot-Schutz
  - Regelbasierter Fit- und Absichts-Score A/B/C mit Begründung für den Vertrieb. Routing nach Land und Segment.
  - Die vorhandene KI-Triage startet automatisch beim Eingang. Vorher werden E-Mail, Telefon und IBAN maskiert, und ein Mensch gibt die Rückfrage frei.
  - Bot-Schutz: signiertes Formular-Token mit Mindestzeit, selbst gehostetes ALTCHA nur bei Risikosignal, MX-Prüfung und Liste von Wegwerf-Domains. Kein reCAPTCHA.
  - Strukturierte Felder `land` und `rechner` in /api/anfrage.
  - Machine Learning erst ab etwa 300 Abschlüssen je Segment.
  - Alleinstellung: Schnellste Antwortzeit, und der Vertrieb erhält vorqualifizierte Leads.

I-6 [DACH | Wirkung sehr hoch | Aufwand mittel] ÖkoInvest Solarpacht-Index für DE, AT und CH getrennt
  - Datenbasis: eigene Pachtakten plus anonyme Spenden aus dem Pachtangebot-Check.
  - Veröffentlichung erst ab n ≥ 10 je Zelle. Methodik, Fallzahl und Interessenkonflikt werden offengelegt.
  - Ausgabe als CSV/JSON unter CC BY mit DOI über Zenodo. Daraus wird später PACHT je Land gespeist.
  - Es gibt keinen amtlichen Solarpacht-Index. Die Zeitreihe ist nicht nachkaufbar.
  - Risiko: Ein geschönter Index wäre irreführend (§ 5 UWG). In CH nicht in Euro umrechnen.

I-7 [DACH | Wirkung hoch | Aufwand mittel] „Fragen zu Ihrem Ergebnis“: KI erklärt, rechnet aber nie selbst
  - Die KI arbeitet per Tool-Use auf den vorhandenen Rechenkernen. Ein Server-Abgleich stellt sicher, dass jede Zahl im Text aus einer Tool-Ausgabe stammt.
  - Die Wissensbasis ist nach Land gefiltert. Sonnet 5.5 mit Tagesbudget, Turnstile bzw. ALTCHA und IP-Limit.
  - Kennzeichnung nach Art. 50 AI Act.
  - Danach: Pachtvertrags- und Stromrechnungs-Upload-Check, nur als allgemeine Klauselerklärung und nach Prüfung von RDG/RAO.

I-8 [DACH | Wirkung hoch | Aufwand mittel] Performance-Budget und eigenes RUM
  - Messung über useReportWebVitals an /api/rum, ohne IDs und mit gekürzter IP. CI-Budget mobil: LCP ≤ 2,0 s, INP ≤ 150 ms, initiales JS ≤ 120 KB gzip.
  - Die App-Shell wird zur Server-Komponente mit kleinen Client-Inseln. Die Projektbörse wechselt von force-dynamic auf ISR mit revalidateTag('boerse').
  - Zuerst eine Baseline mit `next build` messen, aber nicht auf dem 8-GB-Rechner neben dem Dev-Server.

Hinweisgebersystem nach HinSchG und HSchG (Wirkung mittel)
  - Gehört in die Compliance-Spur, nicht in Sprint 1.
  - Empfehlung: Eigenbau nur nach Prüfung durch Rechtsabteilung, Datenschutzbeauftragten und Betriebsrat. Eine zertifizierte Fremdlösung ist schneller rechtssicher.

Aufgelöste Widersprüche:
- Eurostat Band IC für DE: Der Preisradar nennt 22,64 ct, der Data Scientist 18,28 ct. Das ist kein Widerspruch, sondern unterschiedliche Abgrenzung: einmal ohne MwSt, einmal ohne alle Steuern und Abgaben. Auf der Seite immer die Abgrenzung angeben.
- ElCom-Zugang: Der Preisradar nutzt LINDAS-SPARQL mit Open-Use-Lizenz, der Data Scientist die GraphQL-API der Website. Entscheidung: LINDAS als offizieller, lizenzierter Weg.
- Länderrouting und Geo-Logik: Unterverzeichnisse auf einer Domain, ccTLDs nur per 301 auf das Verzeichnis. Keine IP-Weiterleitung.

2) KRITISCHE FEHLER, SOFORT BEHEBEN

Sicherheit:
- XSS in der Projektbörse
  - src/app/projektboerse/[slug]/page.js:96 und src/app/projektboerse/page.js:94 geben JSON-LD ohne `<`-Escaping aus. Titel und Beschreibung kommen aus Anbietereingaben, das ist eine wahrscheinliche gespeicherte XSS.
  - Fix: `.replace(/</g,'\\u003c')` ergänzen, danach eine gemeinsame <JsonLd>-Komponente für alle 47 Stellen.
- Client-IP
  - src/lib/ipAdresse.js:8 liest X-Forwarded-For[0]. Damit sind alle IP-Rate-Limits umgehbar, und Einwilligungs- und NDA-Nachweise können eine gefälschte IP enthalten.
  - Fix: nginx setzt X-Real-IP auf $remote_addr, und die App liest nur diesen Wert. In docs/PLATTFORM.md als Pflicht festhalten.
- Login, Registrierung, Demo-Modus, Header
  - src/app/api/auth/passwort-vergessen/route.js: Es gibt kein Limit je E-Mail, damit ist Mail-Flooding möglich.
  - src/app/api/auth/registrieren/route.js:10: Ein ausgelöster Honeypot antwortet mit 422 statt still zu verwerfen.
  - Demo-Modus: Läuft ein Produktions-Build mit PLATTFORM_DEMO=1, zeigt /login die Admin-Zugangsdaten an. Das Standardpasswort ist 'Demo-2026!' (seed.js:16, login/page.js:50-55). Nötig ist ein Start-Guard.
  - Öffentliche Seiten haben keine CSP und kein HSTS. X-Frame-Options ist doppelt und widersprüchlich gesetzt (next.config.mjs gegenüber middleware.js).
  - src/lib/energy.js holeJson hat kein Timeout. Hängt die Quelle, blockiert das Rendering der Startseite und von /energie-live.

Fachlich falsch, Länder vermischt:
- Rechner mit DE-Werten für AT und CH
  - Der Solarpark-Rechner bietet „EEG-Zuschlag“ auch für AT und CH an (solarpark.js:23/36, SolarparkRechner.js:79).
  - Der Pachtangebot-Check rechnet 20 Jahre mit EEG-Wert und für die Schweiz in Euro (pachtangebot.js:130).
  - Der Netzanschluss-Rechner nutzt immer DE-Ertrag und EEG-Erlös (netzanschluss.js:57/115/117).
  - Carport und Dachpacht verwenden die DE-Strompreis-Zusammensetzung. Agri-PV wendet die deutsche GAP-Logik auf AT an. Der Pacht-Rechner vergleicht immer mit der deutschen Ackerpacht.
- Pacht und Mindestgröße
  - Eine einzige „DACH“-Pachtspanne in Euro (markt.js ~232) erscheint auf mindestens 12 Seiten, widerspricht aber regionen/schweiz.js:127.
  - Ackerpacht: 380 in markt.js gegenüber 357 in marktdaten.js.
  - Mindestfläche: 3 ha in markt.js gegenüber 2 ha im Scoring.
- Strompreis-Annahmen
  - markt.js:402: Umlagen 1,8 ct sind vermutlich deutlich zu niedrig (Größenordnung rund 2,5–3 ct). Das macht die Ersparnisaussage im Reststrom-Rechner zu optimistisch. Dringend gegen netztransparenz.de prüfen.
  - Die Abgrenzung zu den 17,2 ct der BDEW-Analyse offenlegen.
  - markt.js:18: Das globale STAND „September 2026“ gilt auch für Werte von 2024 und ist damit irreführend.
  - AT-Netzentgelte stützen sich auf Stromliste.at statt auf die SNE-V. Die Kommentare in markt.js und eg/netzentgelt.js widersprechen sich.
- Lizenz-Namensnennung
  - /energie-live (page.js:95, :315–325) und ErzeugungChart.js:308 nennen nur Fraunhofer. Für die Day-Ahead-Preise ist „Bundesnetzagentur | SMARD.de, CC BY 4.0“ Pflicht.
  - Die Ersatzquelle aWATTar (energy.js:55) leitet inzwischen weiter und hat keine belegte Lizenz.
- KI und Datenschutz
  - src/app/datenschutz/page.js 8a enthält zwei sichtbare <mark>-Platzhalter.
  - Die Aussage „keine E-Mail oder Telefonnummer an die KI“ stimmt nicht, weil Freitexte ungefiltert übermittelt werden (kontext.js). Die Verarbeitungsgeografie (inference_geo) ist nicht benannt.
  - wissen.js filtert nicht nach Land, deshalb erhalten AT- und CH-Landwirte EEG-Antworten.
- Leads
  - Die Rechner haben keinen Lead-Weg. Das „PDF“ ist nur window.print() (Werkzeuge.js:139, ToolTeile.js:37).
  - /api/anfrage erfasst kein strukturiertes `land` und kein Scoring.

3) QUICK WINS (je Stunden bis 1 Tag)
1. JSON-LD-Escape in der Projektbörse, ipAdresse() auf X-Real-IP umstellen, Limit je E-Mail beim Passwort-Reset, Honeypot still beantworten, AbortSignal.timeout(10000) in energy.js, Demo-Guard, security.txt.
2. In Solarpark-Rechner, Pachtangebot-Check und Netzanschluss-Rechner bei land ≠ DE das EEG-Modell ausblenden und „AT/CH-Logik in Vorbereitung“ anzeigen.
3. Umlagen 2026 gegen netztransparenz.de prüfen und korrigieren. Redaktionstermin: Umlagen 2027 bis 25.10., VNB-Preisblätter ab 15.10. STAND je Abschnitt statt global angeben.
4. Namensnennung auf /energie-live korrigieren und license_info mitspeichern. aWATTar durch SMARD (CC BY) ersetzen. docs/ENERGIEBESCHAFFUNG.md:25 aktualisieren: CH steht jetzt unter CC BY.
5. Ratgeber „Gewerbestrom Schweiz 2027: Mediane C1–C7 sinken“ mit der Quelle „ElCom/LINDAS, Open-Use“ (etwa 1 Tag, Zeitvorteil).
6. Pachtangebot-Check: „Bericht per E-Mail“ und „anonym zum Index beitragen“ als zwei getrennte Checkboxen anbieten. Das ist der erste echte Rechner-Lead.
7. Strukturierte Felder `land` und `rechner` in /api/anfrage, regelbasierter Fit-Score Stufe 1, automatische Triage mit vorgeschalteter PII-Maskierung.
8. KI-Kosten
   - Modell je Fall: Sonnet 5.5 für alle Fälle außer expose.
   - Den Wissensblock per suchen() auf die 3–5 passenden Einträge kürzen und das Länderfeld laender in allen Ratgebern ergänzen.
   - Links nur gegen eine Whitelist erlauben.
9. Performance
   - CookieBanner in footer.js per dynamic laden.
   - Schriften nur mit subsets ['latin'], Manrope variabel.
   - In next.config.mjs AVIF und minimumCacheTTL setzen, dazu Cache-Header für /img und /geo.
   - RevealObserver gegen das Hydrierungs-Flackern absichern und das LCP-Bild aus .ov-hero-in herausnehmen.
   - Den Login-Status einmal pro Sitzung statt bei jedem Pfadwechsel abfragen.
   - Quellbilder auf maximal 2000 px verkleinern.
10. Produktivdomain jetzt festlegen und die Entscheidung für /de, /at, /ch treffen. src/lib/hreflang.js (oekovolt-Altcode) und src/lib/baseUrl.js (localhost) löschen. openGraph.locale der Regionsseiten aus r.land ableiten.
11. Die Datenschutz-Platzhalter von der Rechtsabteilung füllen lassen. Auf 26 Regionsseiten einen Block „Netzentgelte in [Region]“ mit Links zum Preisblatt, zur SNE-V bzw. zur ElCom-Seite ergänzen.

4) ROTE LINIEN UND WARNUNGEN
- Datenquellen
  - Kein Abgreifen des E-Control-Tarifkalkulators: keine Lizenz, robots.txt sperrt /services. Nur Deep-Link oder Kooperation.
  - Keine systematischen Crawls von VNB-Preisblättern, Vergleichsportalen, Kapazitätskarten oder VNBdigital ohne Rechtsprüfung bzw. Lizenz (§ 87b UrhG DE, § 76c UrhG AT).
  - EEX- und EPEX-Daten nur manuell mit Quelle. Spotdaten nur aus den CC-BY-Zonen.
- Werbung und Vergleich
  - Keine Rangliste „günstigster Gewerbestromanbieter“ und keine Versorgernamen in Rankings. Gewerbestrom über 100 MWh wird individuell verhandelt (§ 5 und § 6 UWG DE, § 2a UWG AT, Art. 3 lit. e UWG CH).
  - Modellpreise immer als Modell kennzeichnen, Daten getrennt nach amtlich, berechnet und Schätzung ausweisen.
- Leads
  - Das Ergebnis bleibt ohne Kontaktdaten sichtbar. Bericht, Alarm, Werbung und Rückruf brauchen getrennte Einwilligungen ohne vorausgefüllte Häkchen und mit Double-Opt-in (§ 7 UWG, § 174 TKG AT, Art. 3 Abs. 1 lit. o UWG CH, revDSG). Telefon nie als Pflichtfeld.
- Länderlogik
  - Keine AT- oder CH-Rechenlogik aus deutschen Werten ableiten, bevor die Energierechtler sie freigegeben haben.
  - Keine IP- oder Accept-Language-Weiterleitung (Art. 3 Abs. 2 Geoblocking-VO 2018/302, Google-Empfehlung).
- KI
  - Die KI rechnet nie selbst, jede Zahl kommt aus einem Rechenkern.
  - Keine Einzelfall-Rechtsberatung (RDG § 2, RAO).
  - Kennzeichnung nach Art. 50 AI Act. Öffentliche Endpunkte nur mit Budget-Obergrenze und Regelmodus als Fallback.
  - Datenresidenz der Claude API ist global oder US. Für vertrauliche Dokumente ein EU-Endpunkt über Bedrock oder Vertex.
- CH
  - Die ElCom-Werte sind Grundversorgungstarife. Ohne CH-Pool kein „Wechsel lohnt sich“, nur eine Interessentenliste.
- SEO
  - Keine massenhaft indexierten Gemeinde- oder PLZ-Seiten, das wäre Thin Content. Indexierbar sind Seiten je Bundesland, Kanton, Netzbereich und großem VNB.
- Interessenkonflikte
  - Pachtindex und Netzanschluss-Index nur ehrlich, mit Mindest-n, offener Methodik und Stellungnahmerecht für Netzbetreiber. So bleiben auch die Versorger-Kooperationen ungefährdet.
- Messwerte
  - Die opacity-0.001-Technik verbessert nur die gemessene LCP-Metrik, nicht die erlebte Geschwindigkeit. Solche LCP-Werte nicht nach außen als Qualitätsversprechen nutzen.
- Prüfgrenzen
  - Nicht live verifiziert: Umlagen 2026, Destatis-Tabellennummer, Leistungsumfang des E-Control-Gewerbekalkulators, CH-Rechtsstand zur Netzverstärkung, Zeitplan AI Act und Digital Omnibus.
  - Der Dev-Server war nicht erreichbar, die ausgelieferten Header sind deshalb nicht geprüft.
  - Alle KB-Angaben sind Quelltextgrößen und keine gzip-Bundle-Größen.

QUELLEN (Auswahl aus den Expertenberichten):
- ElCom über LINDAS-SPARQL: https://ld.admin.ch/query
- SNE-V im RIS: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010107
- Eurostat nrg_pc_205: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_205
- Energy-Charts OpenAPI: https://api.energy-charts.info/openapi.json
- SMARD-API: https://github.com/bundesAPI/smard-api
- BDEW-Strompreisanalyse: https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/
- § 8 EEG: https://www.gesetze-im-internet.de/eeg_2014/__8.html
- Google, mehrsprachige und regionale Websites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- open-MaStR: https://github.com/OpenEnergyPlatform/open-MaStR
- photovoltaic-roadmap: https://github.com/jschroeter/photovoltaic-roadmap
- GLAES: https://github.com/FZJ-IEK3-VSA/glaes

Eigene Prüfung (Lead): Ich habe diese Dateien im Code gelesen.
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/ipAdresse.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/projektboerse/[slug]/page.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/app/projektboerse/page.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/invest/markt.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/rechner/solarpark.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/rechner/pachtangebot.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/lib/rechner/netzanschluss.js
- C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/src/components/Reusable/footer.js

Websuche: Das Budget ist erschöpft (200/200), daher konnte ich die Umlagen nicht verifizieren.

## Recht & Qualität
TEAM „RECHT & QUALITÄT“ – BÜNDELUNG FÜR DEN STRATEGIE-RAT (Stand 03.10.2026)

EIGENE NACHPRÜFUNG (Lead, nur lesend, im Code)
- Bestätigt: Das GA4-Token-Leck. In src/components/Statistik/GoogleAnalytics.js:20 lautet die Regex `AUSGENOMMEN = /^\/(scan|fortsetzen|tv|angebot)(\/|$)/`. /einladung/[token] und /portal sind nicht ausgenommen. Z. 87/88 senden page_location und page_path mit dem vollständigen Pfad an Google.
- Bestätigt: Der Cookie-Etikettenfehler. In src/components/Cookies/cookiecomponent.js:301-304 ruft „Weiter ohne Einwilligung“ `handleAcceptSelected` auf. Hat der Nutzer im Dialog Analytics angeschaltet, erteilt der Knopf also die Einwilligung. Der Satz „auf der Grundlage eines berechtigten Interesses“ steht in Z. 285.
- Bestätigt: Die Länder-Vermischung im Pachtrechner. src/lib/rechner/pacht.js:64 rechnet `t < 20 ? ERLOESE.eegFreiflaecheCt` für jede Region, auch für AT und CH.
- Bestätigt: Die Pflicht-„Einwilligung“ im Anfrageformular (src/app/api/anfrage/route.js:7/11, ohne Haken Fehler 422).
- Bestätigt sind auch die Claims: freiflaeche/page.js:270 „garantiert“, Reststrom/Seite/Hero.js:32 „wird günstiger“, Zusammenspiel.js:42 „immer der günstigste Strom“, unternehmen.js:165/170 und referenzen.js:150 „TOP 3“, Home/zielgruppen.js:15 „ohne eigenes Risiko“.

1) DIE STÄRKSTEN INITIATIVEN (priorisiert, Dubletten zusammengeführt)

P1 · Länder-Engine DE/AT/CH für Rechner, Inhalte und Rechtstexte [DACH | Wirkung sehr hoch | Aufwand groß]
Zusammengeführt aus Faktencheck, QM, Visuelle Kontrolle und Recht.
- markt.js wird in markt/de.js, markt/at.js und markt/ch.js aufgeteilt. Jedes Land bekommt sein eigenes Erlösmodell: DE mit EEG und PPA, AT mit EAG-Marktprämie und dem 25-%-Abschlag nach § 33 EAG, CH mit HEIV, GMP oder Einmalvergütung. Dazu kommen je Land Währung (€ bzw. CHF), Steuern, Pacht-Benchmarks und GAP-Regeln.
- Das Land wird zuerst gewählt und erscheint als Badge auf dem Ergebnis und im PDF.
- Jede Seite, jeder Ratgeber und jeder Rechner bekommt das Pflichtfeld land. Ein Länder-Linter schlägt an, wenn DE-Begriffe auf AT/CH-Seiten stehen.
- Alleinstellung: Kein DACH-Wettbewerber rechnet mit echter Dreiländer-Rechtslogik. Das ist die Kernvorgabe des Inhabers.
- Risiko: Pflege dreier Rechtsordnungen, daher braucht jedes Land einen Owner. Bis zur Umsetzung werden AT und CH in den Rechnern Solarpark, Pacht und Agri-PV ausgeblendet oder als „DE-Logik“ gekennzeichnet.

P2 · Faktenregister und Claims-Register als Single Source of Truth [DACH | Wirkung sehr hoch | Aufwand mittel]
Zusammengeführt aus Daten-Frische-Register (QM), Faktenregister (Faktencheck), Claims-Register (Recht) und Behauptungs-Gate (QM).
- Jede Zahl wird als Objekt geführt: {wert, einheit, land, quelleURL, abruf, gueltigBis, status (belegt / eigene Annahme / zu bestätigen), pruefer}.
- Ratgeber importieren Werte nur noch daraus, statt sie lokal zu führen (wie heute RUNDEN, AT_EEG_REDUKTION).
- Ein Gate bricht ab bei abgelaufenen Werten, bei Superlativen ohne Beleg und bei Platzhaltern oder ENTWURF.
- Im Frontend steht an jeder Zahl „Stand und Quelle“.
- Alleinstellung: E-E-A-T, Zitierfähigkeit für KI-Suche, Banken und Gemeinden. Außerdem ist das Register die Voraussetzung für jeden Preisvergleich (§ 6 UWG verlangt aktuelle Werte).
- Risiko: einmaliger Migrationsaufwand. Der Status „zu bestätigen“ muss sichtbar sein, sonst entsteht falsche Sicherheit.

P3 · Consent Engine im CRM mit Kanal-Ampel und Länder-Telefonregelwerk [DACH | Wirkung sehr hoch | Aufwand mittel]
Zusammengeführt aus Datenschutz und Recht.
- Einwilligungen werden je Kanal gespeichert (Telefon, E-Mail-Werbung, Newsletter je Thema, Weitergabe an benannte Partner). Jede trägt Textversions-ID mit Hash, Zeit, IP, Quelle und Land. Widerrufe werden append-only in die Hash-Kette geschrieben.
- Regeln je Land:
  - AT: Telefon und E-Mail-Werbung nur mit Einwilligung, auch B2B (§ 174 TKG 2021).
  - DE: Verbraucher nur mit ausdrücklicher Einwilligung (§ 7 Abs. 2 Nr. 1, § 7a UWG). Unternehmen mit dokumentierter mutmaßlicher Einwilligung.
  - CH: Sterneintrag beachten, Art. 3 lit. o/u UWG.
- Bei roter Ampel werden Anrufaufgaben und Mails technisch gesperrt. Der Einwilligungsnachweis überlebt die Lead-Löschung als Minimaldatensatz (5 Jahre, § 7a UWG).
- Darauf aufbauend: Double-Opt-in-Abos mit echtem Nutzen, nämlich Strompreis-Alarm je Bundesland/Kanton, Projektbörse-Alerts und ein Rechts-Update je Land. Abos sind nie an Rechner oder PDF gekoppelt, RTR-ECG-Liste für AT.
- Alleinstellung: legales, schnelles Nachfassen, während Wettbewerber Abmahnungen riskieren. Der Alarm ist der stärkste ehrliche Grund wiederzukommen.
- Risiko: Die Regel-Engine braucht eine juristische Abnahme (DE-B2B, AT-Bestandskunden-Ausnahme).

P4 · Ehrliches Report-Gating: Lead-PDF als „prüffähig“, nicht als „bankkonform“ [DACH | Wirkung hoch | Aufwand mittel]
Zusammengeführt aus Recht, Datenschutz, Faktencheck, Visuelle Kontrolle und Barrierefreiheit.
- Ergebnis und freie Druckfunktion bleiben ohne Formular sichtbar.
- Zusätzlich gibt es einen serverseitigen Bericht gegen Name und E-Mail. Der Link kommt per Mail und verifiziert damit die Adresse. Das Telefon ist optional.
- Drei getrennte, nicht vorangekreuzte Checkboxen: Rückruf, Alarm/Newsletter, Weitergabe an Partner.
- Das PDF enthält Rechenkern-Version, Annahmen-Stand, Eingabe-Hash, Länderkennzeichen, eine Annahmen- und Quellentabelle und Szenarien statt eines Punktwerts. Es ist als PDF/UA getaggt.
- Drei Stufen: „Orientierung“, „Vorprüfung durch ÖkoInvest“ und „Gutachten“ (nur durch Externe). Das Label „bankkonform“ erst nach dokumentierter Bankabstimmung und externer Methodikprüfung.
- Widerspruch aufgelöst: Visuelle Kontrolle und Inhaber wollten „Telefon“ als Pflichtfeld. Das Team entscheidet: Telefon bleibt optional. Gründe sind das Kopplungsverbot (Art. 7 Abs. 4 DSGVO) und § 174 TKG in AT.
- Risiko: In DE Mängelhaftung bei „Bezahlen mit Daten“ (§ 327 BGB), in AT Sachverständigenhaftung (§ 1300 ABGB), dazu Dritthaftung gegenüber Banken. Daher Leistungsbeschreibung je Stufe, Haftungsbegrenzung und Vermögensschadenhaftpflicht.

P5 · Gewerbestrom-Preisatlas DACH bottom-up, ohne Versorgernamen [DACH, Start DE | Wirkung sehr hoch | Aufwand groß]
Zusammengeführt aus Recht und Faktencheck.
- Je Netzgebiet bzw. Bundesland/Kanton und je Abnahmefall wird ein Referenzpreis aus amtlichen Bestandteilen gerechnet. DE: Netzentgelt-Preisblätter direkt vom Netzbetreiber, KAV, ÜNB-Umlagen nach Verbrauchsband, StromStG, SMARD-Day-Ahead (CC BY). AT: SNE-VO aus dem RIS. CH: ElCom, Lizenz vorher klären.
- Die Beschaffungskomponente ist als „Modellwert“ gekennzeichnet. Methodikseite, Stand-Stempel und Datenschnitt jährlich zum 1.1.
- Ohne Versorgernamen ist das keine vergleichende Werbung. Geprüft wird nur auf Irreführung.
- Alleinstellung: Monate eigener Datenerhebung, zusätzlich durch das eigene Datenbankrecht geschützt. Speist Lead-Magnet und Alarm (P3).
- Risiko: Keine Daten aus Vergleichsportalen oder ene't, keine EEX-Reihen ohne Lizenz.
- Versorger-Reichweite nur legitim: Netzgebiets- und Ratgeberseiten nennen Marken nur beschreibend im Fließtext, ohne Logos und ohne Marke in Titel oder Anzeigentitel. Dazu ein White-Label- bzw. Co-Brand-Programm für Stadtwerke per Vertrag (Art. 26/28 DSGVO, Kartellprüfung).

P6 · Qualitäts-Gate „npm run verify“ mit Golden-Master-Tests [DACH | Wirkung sehr hoch | Aufwand mittel]
- Die QA-Skripte aus ~/claude-browser kommen ins Repo (qa/) und setzen einen Exit-Code. Ablauf: ESLint-CLI, Golden-Master- und Eigenschaftstests für 17 Rechner und markt.js (node:test), Build mit .next-verify, axe (WCAG 2.2) mit Tab-Durchlauf, Lighthouse-CI, Platzhalter- und Claims-Scanner, Funnel-Abnahmetests mit abgefangenen POSTs.
- ereignis() wird an Rechner-Ergebnis und Lead-Absendung verdrahtet (nur nach Einwilligung). Ergänzend ein cookieloser, aggregierter first-party Funnel-Zähler.
- Der Prüfbericht ist an die SHA gebunden. Schwereklassen S0–S3 mit Freigabepfad: verify, dann Fachfreigabe, dann Recht, dann Inhaber.
- Alleinstellung: zitierfähige, abgenommene Rechenergebnisse und messbare Funnels.
- Risiko: 8 GB RAM, daher alles seriell, mit separatem distDir und Port.

P7 · Rechts- und Compliance-Center je Land, mit Hinweisgebersystem [DACH | Wirkung mittel–hoch | Aufwand mittel]
- Versionierte Legal-Text-Registry (Datenschutz, AGB, Bedingungen, Einwilligungstexte) je Land und Sprache, mit Hash, Freigabe-Workflow und Annahmeprotokoll. Jede Einwilligung verweist auf eine Versions-ID.
- Hinweisgebersystem nach HinSchG (DE) und HSchG (AT), freiwillig für CH: anonym, Eingangsbestätigung binnen 7 Tagen, Rückmeldung binnen 3 Monaten, ohne IP und ohne Analytics, getrennt vom Vertriebs-CRM. Vorzugsweise externe Ombuds- bzw. geprüfte Fremdlösung.
- Länder-Rechtsticker („Was gilt seit wann“) mit Juristenfreigabe. Speist Newsletter und Presse.
- Alleinstellung: ein Hygienefaktor bei Bank-, ESG- und Kommunen-Due-Diligence.
- Risiko: Die Pflicht ab 50 Beschäftigten gilt je Gesellschaft und muss anwaltlich geklärt werden.

P8 · Investor-Content-Firewall nach Land und Anlegertyp [DACH | Wirkung mittel | Aufwand mittel]
- Ein serverseitiges Gate vor Börsendetails, Entwicklungsbeteiligung und eG-Unterlagen.
- DE: VermAnlG-Ausnahme, z. B. ab 200.000 € je Anleger (§ 2 Abs. 1 Nr. 3). In der eG keine erfolgsabhängigen Vertriebsvergütungen (§ 2 Abs. 1 Nr. 1).
- AT: KMG und AltFG. CH: FIDLEG und KAG. Vor Go-live anwaltliches Gutachten je Land.

Außerhalb der Top 8, aber stark (Visuelle Kontrolle): das Flächen-Studio, bei dem man die Fläche auf der Karte einzeichnet und das Ergebnis live sieht. Basemaps nur mit offener Lizenz (BKG, basemap.at, swisstopo), nur offene Netzdaten.

2) KRITISCHE FEHLER IM BESTAND – SOFORT BEHEBEN
S0 Recht und Datenschutz
- GoogleAnalytics.js:20: Einladungs-Tokens und /portal-IDs gehen an Google. Die Regex muss um einladung, portal, termin, registrieren, login und passwort-* erweitert werden. (selbst geprüft)
- cookiecomponent.js:301-304: „Weiter ohne Einwilligung“ ruft handleAcceptSelected auf. In Z. 285 steht der widersprüchliche Satz zum „berechtigten Interesse“. (selbst geprüft)
- AnfrageFormular.js:17/51/244, api/anfrage/route.js:7/11 und En/ContactForm.js:193-195: Die Pflicht-„Einwilligung“ wird für eine Verarbeitung nach Art. 6 Abs. 1 lit. b DSGVO verlangt. Telefon wird ohne Rückruf-Einwilligung erhoben. (selbst geprüft)
- datenschutz/page.js Z. 157: Die Erklärung behauptet Werbe-Einwilligungen, die nirgends eingeholt werden. bo-seed.js:144 erzeugt „Investor anrufen“ ohne Einwilligung (in AT unzulässig).
- Irreführende Absolutaussagen (selbst geprüft):
  - freiflaeche/page.js:270 „garantiert“
  - Reststrom/Seite/Hero.js:32 „wird günstiger“ und die Legende „mindestens eingespart“
  - Zusammenspiel.js:42 „immer der günstigste“
  - Home/zielgruppen.js:15 „ohne eigenes Risiko“
  - unternehmen.js:165/170 und referenzen.js:150 „TOP 3 IPC“, belegt nur durch Eigenangabe
- investoren/page.js:63: Die Entwicklungsbeteiligung wird öffentlich ohne Hinweis auf Zielgruppe oder Mindestbetrag beworben.
- Livegang-Blocker:
  - nutzungsbedingungen ENTWURF = true
  - Datenschutz mit rund 26 Platzhaltern
  - KONTAKT.email = null, damit fehlt die Impressum-E-Mail (§ 5 ECG / § 5 DDG)
  - UID fehlt
  - Barrierefreiheitserklärung behauptet eine Selbstbewertung, die laut TODO-Kommentar nicht durchgeführt wurde

S1 Falsche Rechenergebnisse
- pacht.js:64 (selbst geprüft), solarpark.js und agriPv.js:52/60: AT und CH werden mit DE-EEG, DE-GAP-Regeln und € gerechnet.
- markt.js GEMEINSCHAFTEN.at.abgabenCt 0,82: Für Haushalte ist der Wert vermutlich zu hoch, das Portal setzt 0,1 an.
- STROM.bestandteile umlagen 1,8 ct: Unter 1 GWh sind es rund 2,8 ct, oder die Verbrauchsannahme muss genannt werden.
- zuschlagsHistorie endet 12/2025. Es fehlen 03/2026 (4,94 ct) und 07/2026 (4,79 ct) sowie der Deckel von 5,9 ct nach § 37b.
- AT-Rabatt: markt.js nennt 1.10.2026, der Ratgeber 1.1.2027.
- /reststrom und /rechner: Werte für den „Modellbetrieb DE“ werden als DACH beworben.
- energie-live: Die Pflichtnennung „Bundesnetzagentur | SMARD.de, CC BY 4.0“ fehlt (die Lizenzangabe liefert die API selbst). Für aWATTar fehlt jede Lizenzangabe.
- HomeBoerse.js:14: Testprojekte erscheinen ungefiltert auf der Startseite.

S2 Barrierefreiheit
- Cookie-Banner verdeckt den Fokus (2.4.11). Gemessen auf /flaechencheck bei 390 px: 26 von 40 Tab-Zielen.
- /en mit html lang="de".
- Ungültige dl-Strukturen auf /kontakt, /marktdaten, /agri-pv und /landwirte.
- Kontrastfehler auf /energiegemeinschaften (4,41:1) und /termin (opacity-50).

3) QUICK WINS (jeweils unter etwa 1 Stunde)
- GA-Regex in einer Zeile erweitern. Cookie-Knopf auf handleRejectAll umstellen und den Satz zum berechtigten Interesse streichen.
- Die sieben Claims umformulieren, z. B. „Rückbau vertraglich und durch Bürgschaft abgesichert“, „kann günstiger werden“, „ohne eigene Investition“. „TOP 3“ streichen, solange kein externer Beleg vorliegt.
- Anfrageformular: Pflicht-Checkbox durch einen Datenschutzhinweis ersetzen. Optionale Checkbox „Rückruf gewünscht“ mit Text-Version-ID nach dem Vorbild von /api/angebot/[code]/anfrage. Beim Telefonfeld den Zweck nennen.
- markt.js: zuschlagsHistorie 2026 und Deckel 5,9 ct nachtragen. AT-Kommentar angleichen. Umlagen-Annahme benennen. Bei § 9b StromStG Antragspflicht und Bagatellgrenze von 250 € ergänzen.
- Rechner Pacht, Solarpark und Agri-PV: bei AT/CH den Hinweis „DE-Logik“ einblenden oder die Länder ausblenden. agriPv: GAP für AT auf 0 setzen.
- Quellenzeile auf energie-live korrigieren, am besten license_info dynamisch aus der API übernehmen.
- HomeBoerse serverseitig nur auf veröffentlichte Projekte ohne Test-Flag filtern.
- investoren:63 mit dem Hinweis „nur professionelle Investoren, Mindestbetrag, kein öffentliches Angebot“ versehen.
- Arbeitsstand in thematische Commits sichern. Seit 7b9f622 sind rund 160 Dateien ungesichert, deshalb vor jeder weiteren Welle.
- QA-Skripte mit Exit-Code ins Repo übernehmen. In film.mjs und qm-wege.mjs das Cookie „cookieConsent“ statt localStorage setzen.
- Bei 3 Referenzfällen je Rechner den Golden-Master einfrieren. Regressionstest für P0-1 des FlaechenWizard nachziehen.
- Barrierefreiheit: scroll-padding-bottom passend zum Banner setzen, dl-Strukturen korrigieren, Kontrast von ink-400 auf ink-600 anheben, Sprachwahl-Labels eindeutig machen.
- Kommunen: § 6 EEG mit „Deutschland“ kennzeichnen, den Wert aus KOMMUNE.beteiligungCt beziehen, auf die Landespflicht in BB, MV und NI hinweisen.
- Impressum: Funktionspostfach in KONTAKT.email eintragen.

4) ROTE LINIEN UND WARNUNGEN
- Kein Scraping und keine Übernahme aus Vergleichsportalen (Check24, Verivox, E-Control-Tarifkalkulator, Versorger-Rechner). Rechtsgrundlagen: §§ 87a ff. UrhG, §§ 76c ff. öUrhG, EuGH Innoweb. Keine laufend gepflegten EEX- oder EPEX-Reihen ohne Lizenz. Damit ist die Admin-Route /api/admin/energie/termin kritisch.
- Versorgernamen nur als Wort und beschreibend. Keine Logos, keine Marke im Seiten- oder Anzeigentitel, keine suggerierte Verbindung (EuGH Google France, Interflora). Vergleiche mit Namen nur über ein Freigabe-Gate mit Snapshot und Hash.
- Keine Bewertungen, Kundenzahlen oder Testsiegel ohne echten Beleg (UWG Anh. Nr. 23b/c). Keine Konformitätsaussage wie „barrierefrei“, „bankkonform“ oder „geprüft“ ohne dokumentierte Prüfung. Keine Overlay-Plugins.
- Kein Telefon-Pflichtfeld und keine Kopplung von PDF oder Ergebnis an eine Werbe-Einwilligung (Art. 7 Abs. 4 DSGVO, Planet49). Die freie Druckfunktion bleibt. In AT kein Werbeanruf ohne Einwilligung, auch nicht B2B. DE-B2B-Regeln nicht auf AT übertragen. Gekaufte Listen sind unbrauchbar.
- eG-Funnel: keine Affiliate-Programme, Lead-Prämien oder Vertriebsboni, sonst entfällt die Prospektbefreiung (§ 2 Abs. 1 Nr. 1 VermAnlG). Die Entwicklungsbeteiligung nicht öffentlich an Privatanleger bewerben.
- Kein Livegang und keine Lead-Kampagne vor anwaltlicher Freigabe der Rechtstexte je Land. Vor Werbung mit Preisen muss die Rolle im Reststrom-Pool (Lieferant oder Vermittler) feststehen (§ 5 EnWG).
- Grundbuch DE: Abfragen über § 43a GBV nur ab 750 kW und mit Gebietsnachweis. Sonst gilt § 12 GBO, also keine Serienabfragen.
- Nicht live verifiziert und deshalb „zu prüfen“: AT-Elektrizitätsabgabe 2026, KWKG- und § 19-Umlage 2026, CH-LEG-Rabatte, AltFG/KMG- und FIDLEG-Schwellen, Lizenzen von ElCom und E-Control, BaFG-Strafhöhe. Das Websuche-Budget der Experten war erschöpft.
- Prozess: Viele parallele Wellen auf ungesichertem Stand ohne Gate sind ein Regressionsrisiko. Erst committen und ein Gate einziehen. Bei 8 GB RAM laufen Build, Playwright und Lighthouse nur seriell.

Relevante Dateien (alle unter C:/Users/SALEADMIN/Downloads/Oekoinvest-Web):
- src/components/Statistik/GoogleAnalytics.js
- src/components/Cookies/cookiecomponent.js
- src/lib/rechner/pacht.js
- src/app/api/anfrage/route.js
- src/components/Plattform/AnfrageFormular.js
- src/lib/invest/markt.js
- src/app/freiflaeche/page.js
- src/components/Reststrom/Seite/Hero.js
- src/components/Reststrom/Seite/Zusammenspiel.js
- src/components/Home/zielgruppen.js
- src/data/unternehmen.js
- src/data/referenzen.js
- src/app/datenschutz/page.js
- src/app/nutzungsbedingungen/page.js
- src/data/site.js

## Dokumentation & Normen
TEAM-LEAD-BÜNDEL „Dokumentation & Normen“ (ISO 9001 · ISO/IEC 27001 · ISO/IEC 25010 · arc42/ADR · Technische Redaktion) – Stand 03.10.2026, nur gelesen

**0. Gegengeprüft am 03.10.2026, vor allem anderen erledigen**
- Git hat kein Remote. Der Code liegt nur auf diesem Rechner. `git status` zeigt 223 Einträge ohne Commit, darunter Rechtsseiten, Rechner und die neue `robots.js`, während `public/robots.txt` gelöscht ist.
- In `package.json` steht Version 0.1.0, der CHANGELOG steht bei 0.4.0. Es gibt kein „test“-Script. `"lint": "next lint"` ist veraltet.
- `src/app/projektboerse/[slug]/page.js:96` schreibt `JSON.stringify(jsonLd)` ohne Escaping von `<` in ld+json. Titel und Beschreibung kommen von Anbietern. Damit ist gespeichertes XSS nach Admin-Freigabe möglich, praktisch ausgenutzt wurde es nicht. 42 weitere Stellen sind gleich gebaut.
- `src/lib/plattform/rechte.js:5`: Ein Backoffice-Konto ohne Unterrolle bekommt „leitung“, also Vollzugriff. Das ist eine Freigabe als Standard.
- Laut Teambefund übernimmt `src/lib/ipAdresse.js` den linken Eintrag aus X-Forwarded-For. Rate-Limits und gespeicherte IP-Nachweise für Einwilligung und NDA lassen sich so fälschen. Öffentliche Seiten haben keine CSP und kein HSTS, `security.txt` fehlt.
- Die `CLAUDE.md` im Elternordner gehört zum Fremdprojekt „ÖKOVOLT NetOps“ und wirkt auf alle Agenten in diesem Repo. Welche Arbeitsanweisung gilt, ist nicht festgelegt.

**1. Ziel-Dokumentenlandschaft (Docs as Code, Lenkung über Git, PR und CI)**

| Ordner | Inhalt | Norm | Eigentümer |
|---|---|---|---|
| docs/README.md und docs/REGISTER.md | Landkarte und Register (vom Skript erzeugt) | 9001 7.5 | QM-Beauftragter |
| docs/qm/ | Handbuch light: Geltungsbereich, Qualitätspolitik, Ziele, RACI, Lieferantenkriterien F-08, Audit F-09, Managementbewertung F-10, Korrekturmaßnahmen F-11 | 9001 4.3/5.2/6.2/8.4.1/9.2/9.3/10.2 | GF und QMB |
| docs/isms/ | Leitlinie, Risikomethode und Risikoregister, Behandlungsplan, SoA mit Code-Evidenz, 6 Richtlinien (Zugriff, Krypto, Logging, Backup, Lieferanten, sichere Entwicklung), Schlüsselinventar, TOM | 27001 Kap. 4–10, Annex A | ISB (getrennt vom IT-Betrieb) |
| docs/notfall/ | RTO/RPO je Dienst, Szenario-Runbooks, Vorfall- und Meldeprozess DSGVO/NIS2/ISG | BSI 200-4, ISO 22301, Art. 33/34 DSGVO | ISB und Betrieb |
| docs/architektur/ (arc42 §1–12) und docs/decisions/ (MADR 4.0) | Architektur und Entscheidungen | arc42, ADR | Tech-Lead |
| docs/betrieb/ | Deploy-, Release- und Rollback-Handbuch der Website, Env-Tabelle | 9001 8.1, 27001 A.8.32 | Betrieb |
| docs/redaktion/ | Pflege von markt.js mit Herkunft je Wert, Ratgeber-Freigabe, Länder-Matrix DE/AT/CH | 9001 8.5.1/8.6 | Fachredaktion je Land |
| docs/laender/{de,at,ch}.md | Rechtsgrundlagen, Stand, Energierechtler je Land | Inhabervorgabe | Recht je Land |
| docs/freigaben/ | Freigabeprotokolle für Rechtstexte und AGB, Versionsarchiv | 9001 8.6 | Rechtsabteilung |
| docs/handbuch/ | Anwenderhandbücher als Produktionsfassung je Rolle und Land, neu die EG-Rollen (Obmann, Kassier, Mitglied); Demo-Konten in einen Schulungsanhang | IEC/IEEE 82079-1, 26514 | Produkt |
| docs/compliance/hinweisgeber.md | Verfahren nach HinSchG (DE), HSchG (AT), CH freiwillig | ISO 37002 | Compliance |
| Repo-Root | Eigene CLAUDE.md, CODEOWNERS, PR-Vorlage mit Risikoklasse A/B/C, .github/ mit CI | 9001 7.5.3/8.5.6 | Tech-Lead |

Jedes Dokument bekommt einen Kopfblock mit `id, typ, eigentuemer, version, stand, freigegeben_von, naechste_pruefung, land`. Ein Prüfskript im CI meldet fehlende Felder, abgelaufene Prüffristen und tote Links.

**2. Priorisierte Lücken**

P0 (Livegang-Blocker oder akutes Risiko):
1. Kein Remote und kein Backup des Codes, Stand ohne Commit (7.5.3, A.8.13).
2. XSS über JSON-LD in der Projektbörse, dazu 42 weitere Fundstellen.
3. Standardrecht „leitung“, X-Forwarded-For fälschbar, keine CSP und kein HSTS auf öffentlichen Seiten und `/api/admin`.
4. Datenschutzerklärung mit 19 Platzhaltern (Art. 13). AVV, TOM und Drittlandprüfung für die KI-„triage“ mit Lead-Daten fehlen.
5. Ländervermischung in der Rechenlogik: Solarpark lässt AT/CH mit EEG kombinieren, Pacht rechnet CH in EUR, `regionById` fällt still auf Süddeutschland zurück. Das verletzt die Inhabervorgabe direkt.
6. Kein Vorfall- und Datenpannenprozess (72 h). NIS2-Betroffenheit je Land ungeklärt, in DE ist die BSI-Registrierungsfrist laut BSI abgelaufen.

P1 (Fundament für Bank-DD und Wachstum):
7. Die 4 ISO-9001-Pflichtdokumente fehlen, ebenso die Dokumentenlenkung (0 von 44 Dokumenten mit Eigentümer, Version und Freigabe).
8. Kein Test-Script und kein CI. Die 13 `selbsttest()` in den Rechnern laufen nie. Golden-Vektoren je Land fehlen.
9. markt.js hat nur einen globalen Stand. 208 Ratgeber-Konstanten und 17 Python-Handkopien liegen außerhalb von markt.js und laufen still auseinander. `energy.js` hat eigene Tarifzahlen.
10. Es gibt keinen Freigabeprozess für Inhalte, Rechtstexte und AGB je Land (`FREIGEGEBEN=false`, kein Archiv). 37 Artikel tragen dasselbe Batch-Datum.
11. Kein Hinweisgebersystem. Den GwG-Hinweis unter `/api/admin/hinweis` nicht damit verwechseln.
12. Kein Deploy- und Rollback-Handbuch der Website. RTO und RPO sind offen. Die Portal-Handbücher zeigen Demo-Konten.

P2:
13. Kein arc42 und keine ADRs.
14. Keine OpenAPI; 81 von 490 Routen sind nicht dokumentiert.
15. JSDoc, checkJs und Lint-Regeln fehlen.
16. Die Hash-Kette ist nicht extern verankert und wird nicht automatisch geprüft.
17. Die Altlast `hreflang.js` und `.data-alt-*`-Kopien ohne Klassifizierung liegen noch im Repo.

**3. Welle 1: Arbeitspakete für Agenten**

Code-Pakete laufen über Branch und PR. Die Commits bleiben beim Menschen.

| Paket | Inhalt | Aufwand |
|---|---|---|
| D1 Sicherung (macht der Mensch, Agent bereitet vor) | Commit-Plan nach Themen für die 223 Änderungen, Rechtsseiten getrennt. Ein Remote einrichten nur auf Anweisung des Inhabers. | 2 h |
| D2 Sicherheit (P0) | Zentrale `JsonLd`-Komponente mit `\u003c`-Escaping und Test; `rechte.js` mit Migration vor Rollout: erst Konten inventarisieren, dann explizit zuweisen; `ipAdresse` auf einen Header umstellen, den der Proxy setzt, mit Testfall; CSP als Report-Only und HSTS in next.config; `/.well-known/security.txt` | 1–2 Tage |
| D3 Test und CI | npm-Script `test` (`node --test` plus Hülle für `selbsttest`); Lint-Codemod auf die ESLint-CLI; `.github/workflows` mit test, build, lint, npm audit, pip-audit und gitleaks; Version 0.4.0; PR-Vorlage mit Risikoklasse A/B/C | 1 Tag |
| D4 Länder-Sofortfixes | EEG nur bei DE-Regionen; CH-Pacht als „Richtwert in EUR“ kennzeichnen; Label „Ø Deutschland“ landesabhängig; kein stiller Fallback in `regionById`; `TARIF_ANNAHMEN` nach markt.js; Prüfskript für die LAENDER-Deklaration. Fachfreigabe durch die Energierechtler. | 1–2 Tage |
| D5 Gerüst docs/ | README und Register mit Generator, Kopfblock in allen 44 Dateien, Struktur unter qm/, isms/, architektur/, decisions/; eigene Repo-CLAUDE.md als Entwurf | 1 Tag |
| D6 Entwürfe der QM-Pflichtdokumente | Geltungsbereich, Qualitätspolitik, 5–8 messbare Ziele mit Datenquelle, Lieferantenkriterien F-08 und Lieferantenliste (inkl. Anthropic, Ökovolt-DE-Codebasis, Kartenkacheln, Marktdatenquellen), RACI aus der Prozesslandkarte | 1 Tag |
| D7 ISMS-Entwürfe | Risikoregister mit den 8 benannten Szenarien, SoA-Tabelle mit Code-Evidenz für A.8, 6 Richtlinien, Schlüsselinventar, TOM aus GO-LIVE §4–6 | 2–3 Tage |
| D8 Architektur | 10 Start-ADRs (MADR), arc42-Gerüst mit Verweisen statt Kopien, Risiko- und Schuldenregister R1–R10, Qualitätsszenarien a–f, Mermaid-C4-Kontext | 1–2 Tage |
| D9 Betrieb | Deploy- und Rollback-Runbook der Website (inkl. „docs/handbuch muss mit ausgeliefert werden“), Env-Tabelle (GSC- und Bing-Variablen ergänzen), Entscheidungsvorlage RTO/RPO, Notfall-Runbooks (Verbot, Schlüssel „vorsichtshalber“ zu rotieren), Vorlage für den Vorfallprozess | 1–2 Tage |
| D10 Redaktion | Metadaten für markt.js (`quelle, url, stand, geprueftVon, naechstePruefung, land`), zuerst STROM, PACHT, ERLOESE und SPEICHER; Abgleich Python ↔ JS in `pruefen.py`; Ratgeber-Schema mit `land` und `geprueftAm`; Vorlage für Freigabeprotokolle | 2 Tage |
| D11 Handbücher | Demo-Teile in einen Schulungsanhang, der nur im Demo-Modus erscheint; Länderbausteine (Grundbuch, KYC, eID, Steuer); Entwürfe der EG-Handbücher | 2 Tage |
| D12 Generatoren | Routen-Tabelle aus den Kopfkommentaren (Grundlage für OpenAPI), Modul-READMEs für rechner, invest, plattform und eg | 1 Tag |

Welle 1 kostet insgesamt rund 15–20 Agenten-Tage. D2 bis D4 vor allen Doku-Paketen erledigen. Der Umbau von markt.js in Länderdateien läuft später als eigene Welle mit Koordinator, weil BRIEFING Regel 3 dagegen spricht, das parallel zu machen.

**4. Was nur Menschen, Juristen oder Zertifizierer leisten können**
- **Geschäftsführung:**
  - Qualitäts- und ISMS-Politik in Kraft setzen.
  - ISB und QMB ernennen, Restrisiken akzeptieren (6.1.3 f).
  - RTO/RPO und Aufbewahrungsfristen entscheiden.
  - Managementbewertung durchführen.
- **Vier-Augen-Prinzip:** Mit einem Entwickler plus KI ist es nicht erfüllbar. Für Klasse-A-Änderungen (Recht, Zahlen, Leads, Sicherheit) braucht es eine benannte zweite Person oder externe Fachprüfer. Die KI-Entwicklung ist als ausgelagerter Prozess mit menschlicher Abnahme zu lenken (8.4).
- **Anwälte je Land DE, AT und CH:**
  - Rechtstexte, AGB, Bedingungen und Datenschutzerklärung freigeben.
  - NIS2-Betroffenheit prüfen (NISG 2026 AT, BSIG DE, ISG CH).
  - Hinweisgeber-Pflicht prüfen: Schwelle 50 Beschäftigte, ob eine Konzernlösung zulässig ist, eigener Kanal oder externer Anbieter.
  - Lizenzen und Datenbankrecht der Quellen für das Preisradar prüfen (§ 87b UrhG, Vergleichswerbung § 6 UWG DE, § 2a UWG AT, Art. 3 UWG CH).
  - AVV und TIA mit Anthropic und dem Hosting.
- **Energierechtler und Fachprüfer:** AT/CH-Annahmen und Golden-Vektoren abnehmen. Prüfvermerke wie „fachlich geprüft am …“ nur setzen, wenn die Prüfung wirklich stattfand.
- **Sonstiges:**
  - Externer bzw. unabhängiger interner Auditor.
  - Zertifizierungsstelle für Stufe 1 und 2, nur wenn Banken oder Ausschreibungen das verlangen.
  - Moderierter Risiko-Workshop und Notfallübung.
  - Pentest, Remote und Branch-Schutz einrichten, Gesellschafts- und Personalzahlen liefern.

**5. Aufwand und Kosten (grob)**

| Posten | Aufwand oder Kosten |
|---|---|
| Welle 1 Agenten | 15–20 Tage Arbeit, dazu ca. 5–8 Tage menschliche Durchsicht und Freigabe |
| Gelebtes QMS und ISMS bis zur Auditreife | 3–6 Monate Laufzeit, ca. 0,2–0,3 Vollzeitstellen intern |
| Rechtsprüfung DACH (3 Rechtsordnungen) | erheblich und laufend, Angebote einholen |
| Hinweisgeber-Dienstleister | meist günstiger als Eigenbau; Eigenbau nur abgeschottet, ohne IP-Log und außerhalb von „leitung“ |
| Zertifizierung 9001 und/oder 27001 | Angebote einholen, erst nach Nachfrage aus Bank-DD oder Ausschreibungen |
| Qualifizierter Zeitstempel für die Hash-Kette (RFC 3161) | gering |

**6. Leitplanken für den Strategie-Rat**
- Kein Papier-QMS: nur 4 Pflichtdokumente plus Aufzeichnungen, sonst Verweise auf vorhandene Artefakte. Prozesslandkarte, GO-LIVE und Handbücher sind schon stark.
- Keine Aussagen wie „ISO-zertifiziert“, „NIS2-konform“ oder „DSGVO-konform“ ohne Nachweis. Zulässig ist nur „ausgerichtet an …“, wenn das zutrifft.
- CSP zuerst als Report-Only, sonst brechen Animationen, Karten und GA.
- Preisradar erst mit Quellenregister, Lizenzvermerk, Schnappschuss und Pflegeprozess starten. Kein Scraping.
- Offene Prüfpunkte: Die ISO-Seiten lieferten 403 und das Suchkontingent war erschöpft. Revision ISO 9001:2026, NISG 2026, die Meldefristen nach ISG (CH) und die Hinweisgeber-Lage in CH vor Verwendung an amtlichen Quellen prüfen.
- Das Trust Center unter /sicherheit und die öffentliche Seite „Methodik & Quellen“ sind die sichtbaren Vertrauens- und Lead-Hebel aus diesem Paket.

**Quellen**
- Teamberichte 9001, 27001, 25010, arc42 und Redaktion (URLs dort).
- https://advisera.com/9001academy/knowledgebase/list-of-mandatory-documents-required-by-iso-90012015/
- https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/nis-2-regulierte-unternehmen_node.html
- https://nextjs.org/docs/app/guides/json-ld
- https://nextjs.org/blog/next-15-5
- https://adr.github.io/madr/
- https://arc42.org/overview
- https://www.rfc-editor.org/rfc/rfc9116
- https://www.gesetze-im-internet.de/hinschg/
- Repo: C:/Users/SALEADMIN/Downloads/Oekoinvest-Web/package.json, src/app/projektboerse/[slug]/page.js:96, src/lib/plattform/rechte.js:5, Backend-Import/GO-LIVE.md, src/lib/invest/markt.js, c:/Users/SALEADMIN/Downloads/CLAUDE.md

## Kreativ- & Feature-Labor
## Kreativ- & Feature-Labor: Bündel für den Strategie-Rat

**Grundlage:** Berichte von 8 Experten. Sie haben GitHub nach Ideen durchsucht, ohne Code zu übernehmen, und Primärquellen gezielt abgerufen. Das Websuch-Kontingent war aufgebraucht. Deshalb müssen der Wettbewerbsanalyst und die Länder-Energierechtler die Aussagen zur Alleinstellung und den Rechtsstand prüfen.

Zwei Stichproben habe ich selbst im Code geprüft. Erstens gibt es `PACHT.freiflaecheProHa` nur als eine Spanne für alle drei Länder (markt.js:232). Sie erscheint in faq.js:219 als „im DACH-Raum“ und sogar im AT-Ratgeber freiflaechen-pv-oesterreich.js:298. Zweitens gibt es `zuschlagsHistorie` doppelt (markt.js:154 und :702), zwei Listen müssen also abgeglichen werden.

### 1. Befund in einem Satz
Die stärksten Werkzeuge der Website liegen hinter dem Login oder sind nur intern im Einsatz: die Geodaten-Scoring-Engine, die Lastgang-Analyse, das Gemeinde-Screening, das Ausschreibungsmodul und die eigenen Parks mit Monitoring. Öffentlich gibt es nur Fragebögen und Browser-Druck. Der größte Hebel ist deshalb, das Vorhandene ehrlich öffentlich zu machen, nicht neu zu erfinden.

### 2. Kreatives Leitkonzept: „Das offene Kraftwerk“
- **Ihre Zahl statt unserer Werbung:** Jede Fläche, jede Gemeinde und jeder Betrieb sieht die eigene Zahl: den eigenen Acker auf dem Luftbild, die eigene Gemeinde, den eigenen Lastgang.
- **Jede Zahl mit Quelle und Stand:** Annahmen sind versioniert, der Rechenweg lässt sich aufklappen, es gibt eine öffentliche Änderungsseite.
- **Echte Parks, echte Zeit:** Eigene Parks seit 2012 laufen live. Das Projekttagebuch zeigt auch Verzögerungen, im Ton der bestehenden FAQ „ehrlich gesagt: zwei bis vier Jahre“.
- **Drei Länder, drei Wahrheiten:** DE, AT und CH haben je eigene Rechenlogik, Währung (CHF), Rechtslage und Adressen.
- **Der Signature-Moment:** Die Fläche, die der Besucher einzeichnet, füllt sich Reihe für Reihe mit Modultischen, darüber läuft die Sonne. Das macht „Aus Flächen werden Kraftwerke“ zum Erlebnis, mit einer statischen Fassung bei reduzierter Bewegung (reduced-motion).
- **Warum schwer einholbar:** Eigene Parks, Zeitreihen, Daten aus Datenspenden und Abschlüssen, Rechtslogik für drei Länder und Partnernetz. Das lässt sich nicht kaufen, nur über Jahre aufbauen.

### 3. Feature-Katalog (Top 14, nach Priorität)
| # | Name | Zielgruppe | Nutzen | Alleinstellung | Lead-Wirkung | Aufwand | Datenbedarf | Land |
|---|---|---|---|---|---|---|---|---|
| 1 | **Bericht-Baustein** (Server-PDF für alle 17 Rechner, plus strukturierte Lead-Daten) | alle | Ergebnis mit Quellen, Rechenweg und QR-Code per E-Mail | Fachrechner mit belegtem Rechenweg statt Kontaktformular | sehr hoch: CRM bewertet nach kWp, ha und MWh | mittel | markt.js versioniert | DACH |
| 2 | **Flächenpass / Flächen-Röntgen** (Polygon auf Luftbild, gefüllt mit Modultischen) | Eigentümer, Landwirte | Eignung, ha, Netzabstand, Ertrag und Pachtspanne für die eigene Fläche | intern schon vorhanden: scoring.js, geo.js, AkquiseKarte; im DACH-Raum öffentlich nirgends | sehr hoch: Lead mit Geometrie | mittel bis groß | basemap.at, swisstopo, TopPlusOpen, PVGIS-Proxy, OSM-Netz | DACH |
| 3 | **Länder-Engine** (Profile DE, AT, CH; CHF; Förderregime; eigene URLs) | alle | korrekte Zahlen je Rechtsordnung | kein Anbieter rechnet konsequent nach drei Rechtsordnungen | hoch: AT- und CH-Suche | groß | Länderwerte mit Quelle und Stand | DACH |
| 4 | **Gewerbestrom-Preisradar** (zerlegter Index je Bundesland, Netzgebiet und Kanton, mit Preisalarm) | Mittelstand | Herleitung des eigenen Preises statt Lockpreis | Zeitreihe plus eigene Pool-Gebote | sehr hoch: Übergang in den Reststrom-Pool | groß (CH klein) | CH: ElCom/LINDAS-OGD; AT: SNE-VO; DE: Preisblätter (manuell gepflegt oder lizenziert), SMARD | DACH (CH zuerst) |
| 5 | **Lastgang-Röntgen öffentlich** (rechnet nur im Browser; Spitzenlast, Speicher, Peak Shaving) | Mittelstand ab 100 MWh | Viertelstunden-Analyse vor dem Erstkontakt | Engine fertig; Datenschutz-Argument: die Datei bleibt lokal | sehr hoch: Verbrauch und Spitzenlast liegen vor | mittel | BDEW-Profile als Fallback | DE zuerst, AT per SNE-Modul |
| 6 | **Energie-live AT und CH plus Morgen-Brief und Preisalarm** | Gewerbe, Energiegemeinschaften, Landwirte | Day-Ahead für morgen, negative Stunden | täglicher Wiederkehr-Grund in drei Ländern | hoch: Aufbau der Newsletter-Liste | klein bis mittel | Energy-Charts mit Gebotszonen AT und CH (CC BY 4.0, selbst geprüft) | DACH |
| 7 | **Gemeinde-Potenzialbericht plus Gemeinde-Atlas** | Bürgermeister, Gemeinderat | Bestand, Potenzial, Einnahmen, Fahrplan | Register, eigenes Scoring und Länderrecht zusammen | sehr hoch: Gemeinde-Pipeline | groß | MaStR (DL-DE-BY-2.0), BFE, Hebesätze | DACH, DE zuerst |
| 8 | **Kommunal-Rechner 2.0** (Landesgesetze BB, MV, NI; Schalter EEG/PPA; AT und CH getrennt) | Gemeinden | vollständige und korrekte Einnahmen | Bundes- und Landesrecht zusammen | hoch | mittel | liegt im Ratgeber schon vor | DACH |
| 9 | **Gläserner Solarpark** (eigene Parks live, aggregiert, mit Biodiversitäts-Tagebuch) | Eigentümer, Gemeinden, Presse | Beweis statt Behauptung: „Ihr Acker in Jahr 12“ | nicht kopierbar ohne Bestandsparks | mittel direkt, hoch für Vertrauen | mittel | Lese-Export aus TimescaleDB als Einweg-Strecke | DE |
| 10 | **Agri-PV-Lichtlabor** (Schattenspiel mit Kultur, Bauart und DIN SPEC 91434) | Landwirte, Agrarmedien | Agri-PV in 30 Sekunden verstanden | kein deutschsprachiges Werkzeug für die Öffentlichkeit gefunden | mittel: teilbar, Backlinks | mittel | AGRI aus markt.js, Bandbreiten von Fraunhofer ISE | DACH |
| 11 | **Familien- und Miteigentümer-Freigabelink** | Erbengemeinschaften | Abstimmung ohne Konto | löst den häufigsten Grund, warum Projekte stocken | hoch: mehrere Kontakte je Fläche | mittel | keiner | DACH |
| 12 | **Pachtangebot-Vergleich per Upload** | Eigentümer mit fremden Angeboten | Barwert und Klausel-Ampel nebeneinander | Check ist schon tief, mit Upload im DACH-Raum neu | sehr hoch: Lead mitten im Wettbewerb | groß | Extraktion; Rechtsdienstleistungsgesetz (RDG) beachten | DE zuerst |
| 13 | **Pacht-Barometer mit Datenspende** (vierteljährlich, Mindestfallzahl je Zelle) | Eigentümer, Presse, Kammern | belegte Spannen je Land | Netzwerkeffekt aus eigenen Daten | mittel, stark für PR und KI-Zitate | mittel | Datenspenden; kartellrechtliche Prüfung | DACH |
| 14 | **Partner-Widgets** für Stadtwerke, Maschinenringe und Kammern | Versorger, Verbände | fertige Rechner für die eigene Website | Reichweite der Versorger fließt legal in eigene Werkzeuge | hoch: Leads mit Partnerkennung | mittel | DSGVO Art. 26/28, CSP | DACH |

**Auf der Warteliste:**
- Vertragsfristen-Wecker als ICS-Datei (klein)
- CH-Tarif- und Marktzugang-Check je Gemeinde (klein)
- AT-Leistungspreis-Simulator SNE 2027 (Entwurf, mittel)
- Suchprofil-Abo der Projektbörse (mittel)
- Ausschreibungsradar (klein)
- Bürgerversammlungs-Modus
- Hofübergabe-Planer
- VSME/Scope-2-Modul
- Anwohner-Bonus / Park-Fanclub (nach dem Vorbild Octopus)
- Szenario-Tresor mit Benachrichtigung, wenn sich Annahmen ändern

### 4. Wachstums- und Suchmaschinen-Hebel je Kanal
- **Google organisch:**
  - Eigene Adressen je Land: /rechner/pacht/oesterreich, og:locale de_AT bzw. de_CH.
  - Kantonsseiten statt einer einzigen Seite für die Schweiz.
  - Lexikon mit einer URL je Begriff.
  - Programmatische Seiten (Landkreis, Gemeinde) nur indexieren, wenn echte Daten vorliegen, sonst noindex (Richtlinie gegen massenhaft erzeugte Inhalte).
- **Bing, Copilot, DuckDuckGo, Ecosia:**
  - Bing Webmaster Tools mit dem Bericht „AI Performance“, Grounding Queries wöchentlich auswerten.
  - IndexNow nur bei echten Inhaltsänderungen.
  - Aufwand: etwa ein halber Tag.
- **KI-Suche (ChatGPT, Perplexity, Gemini):**
  - Benannte Fachautoren mit Person-Markup.
  - Kurzantwort mit Stand-Datum am Anfang jedes Artikels.
  - .md-Fassungen über llms.txt verlinken; optional eine Marktdaten-API bzw. einen MCP-Server nur zum Lesen anbieten.
  - Google-Extended ist heute gesperrt. Damit erscheint die Seite nicht in Gemini-Antworten. Das entscheidet der Inhaber.
  - Monatlich einen festen Satz Prüffragen je Land stellen und protokollieren.
- **Discover und News:**
  - Newsroom mit NewsArticle-Markup, RSS/Atom-Feed und eigenem Bild je Artikel (heute nutzen 4–5 Artikel dasselbe Bild).
  - Datennachrichten wenige Stunden nach BNetzA-, EAG- und ElCom-Veröffentlichungen.
- **Google Dataset Search:**
  - license und eine CSV-distribution ergänzen.
  - Den Download von /energie-live aus dem gesperrten Pfad /api/ herausnehmen.
- **YouTube:**
  - Reihe „Solarpark verständlich“, gedreht in den eigenen Parks, mit Kapiteln und VideoObject-Markup, Playlists je Land.
- **Karten:**
  - Profile bei Google, Bing Places und Apple nur für besetzte Standorte (Ostermiething, ggf. Türkheim).
  - Blocker: Telefon und E-Mail in site.js sind null. Das fehlt auch im Impressum (§ 5 ECG).
- **E-Mail:**
  - Getrennte Listen für DE, AT und CH: Marktbrief, Preisalarm, Flächen-Wecker, Fristen-Wecker.
  - Double-Opt-in mit Einwilligungsprotokoll.
  - Druckansicht und Ergebnis bleiben ohne Anmeldung frei, sonst wäre es ein Dark Pattern.
- **Versorger-Reichweite (legal):**
  - Widgets mit gemeinsamer Nennung für Partner.
  - Versorger nehmen als Bieter an der Pool-Ausschreibung teil.
  - EG-Software als White-Label in AT.
  - Keine fremden Marken in Keywords, Titeln oder Domains.
- **Messung:** herkunft.js um eigene Kanäle erweitern (Karten, Video, Widget, Partner, Newsletter) und um weitere KI-Domains.

### 5. Was zuerst gebaut werden sollte
**Welle 0, Fehler im Bestand (Tage, vor Livegang):**
- PACHT je Land aufteilen und alle Texte mit „im DACH-Raum“ korrigieren, auch im AT-Ratgeber.
- Erlösmodell „EEG“ nur in DE wählbar, „Marktprämie“ nicht in CH.
- BNetzA-Zuschläge 2026 ergänzen (4,94 ct und 4,79 ct) und beide zuschlagsHistorie-Listen abgleichen.
- § 51 EEG als Regler für den Anteil negativer Preise.
- Carport-Rechner und lastgang.js rechnen für AT/CH mit DE-Strompreisbestandteilen: sperren, bis Länderwerte vorliegen.
- Randstreifen-Text ergänzen: 200 m Schiene nur an Strecken des übergeordneten Netzes mit mindestens zwei Hauptgleisen.
- Ablauf.js: Versprechen „zeichnen die Fläche ein“ (gibt es öffentlich nicht) und die zwei widersprüchlichen Antwortzeiten korrigieren.
- Doppelte Werte angleichen: PACHT.ackerProHa 380 gegenüber Destatis 357.
- dateModified und Sitemap-lastmod aus dem echten Datenstand ableiten.
- Telefon und E-Mail freigeben, sameAs und contactPoint ins Organization-Schema aufnehmen.
- Alle 8 Rechner ohne ErgebnisAnfrage anbinden, die Ergebnisse als strukturierte Daten übergeben.
- Der Flächencheck übergibt ha und Region an den Pachtrechner und bekommt einen Teilen-Link.

**Welle 1 (4–6 Wochen), der Lead-Motor:**
- Bericht-Baustein (#1) für Pacht, Solarpark und Reststrom zuerst.
- Newsletter-Infrastruktur mit Double-Opt-in.
- Energie-live AT und CH mit Morgen-Brief (#6).
- Bing-Paket und IndexNow.
- Flächencheck stufenweise: zuerst ein optionales Feld für Flurstück bzw. KML, dann die Karte zum Einzeichnen.
- Newsroom-Grundseite.

**Welle 2 (2–3 Monate), der Signature-Moment und die Daten:**
- Flächen-Röntgen und Flächenpass (#2) mit einem gemeinsamen Scoring statt zwei Logiken.
- Lastgang-Röntgen öffentlich (#5).
- CH-Strompreisatlas aus ElCom-Daten, nach Lizenzprüfung.
- Kommunal-Rechner 2.0 (#8).
- Beginn der Länder-Engine (#3).

**Welle 3 (Quartal 2–4), der Burggraben:**
- Gewerbestrom-Radar DE und AT (#4).
- Gemeinde-Bericht und Atlas (#7).
- Gläserner Solarpark (#9).
- Partner-Widgets (#14).
- Pacht-Barometer (#13).
- YouTube-Reihe.
- Lichtlabor (#10).

### 6. Rechtlicher Prüfbedarf vor dem Bau (verbindlich)
- **Lizenzen:**
  - PVGIS nur serverseitig mit Cache (kein AJAX, höchstens 30 Aufrufe/s).
  - open-MaStR-Code steht unter AGPL: nur die Daten nutzen (DL-DE-BY-2.0 mit Namensnennung).
  - OSM-Daten unter ODbL (Share-Alike), öffentlich nur Ergebnisse zeigen.
  - Nennungspflichten: basemap.at als Link, „©swisstopo“.
  - DE-Luftbilder sind je Bundesland verschieden lizenziert.
  - Lizenz der ElCom-Daten ist ungeprüft (Abruf ergab 403/404).
- **Kein Scraping:** keine Tarifrechner (Verivox, Check24, E-Control), kein ENET; Datenbankrecht nach § 87b UrhG bzw. § 76d UrhG AT. Preisblätter der Netzbetreiber manuell pflegen oder lizenzieren.
- **Vergleichswerbung:** objektiv und mit Datum (§ 6 UWG DE, § 2a UWG AT, UWG CH). Keine Rangliste „günstigster Anbieter“.
- **E-Mail und Leads:**
  - Double-Opt-in, getrennte Einwilligungen je Zweck, Koppelungsverbot (Art. 7 Abs. 4 DSGVO).
  - § 7 UWG (DE), § 174 TKG (AT), UWG (CH), revDSG.
  - Telefonnummer immer freiwillig.
- **Beratungsgrenzen:** Klausel-Upload (RDG), Steuer- und Erbschafts-Planer (StBerG), Beteiligungs-Cockpit (VermAnlG, KMG, FIDLEG). Keine Renditeversprechen. „Bankfähig“ erst sagen, wenn ein Bankpartner Bericht und Methodik geprüft hat.
- **Kartellrecht:** Pacht- und Preisindex nur aggregiert und historisch, mit Mindestfallzahl.
- **Gegenüber Amtsträgern:** Gemeinde-Werkzeuge anbieterneutral halten, keine Vorteilsgewährung.

**Wichtigste Quellen:**
- https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en
- https://www.marktstammdatenregister.de/MaStR/Datendownload
- https://github.com/OpenEnergyPlatform/open-MaStR
- https://www.elcom.admin.ch/elcom/de/home/themen/strompreise/tarif-rohdaten-verteilnetzbetreiber.html
- https://github.com/visualize-admin/electricity-prices-switzerland
- https://api.energy-charts.info/
- https://github.com/neuhubereco/ha-netzentgelt
- https://www.gesetze-im-internet.de/eeg_2014/__51.html
- https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html
- https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
- https://www.indexnow.org/faq
- https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
- https://www.landapp.com/landapp-landowners
- https://www.transect.com/
- https://www.octopusenergygeneration.com/fan-club/
- https://github.com/topics/agrivoltaics
- https://github.com/topics/energy-community

**Code-Stellen** (unter C:/Users/SALEADMIN/Downloads/Oekoinvest-Web):
- src/lib/invest/markt.js (Zeilen 154, 232, 702)
- src/data/faq.js:219
- src/content/ratgeber/freiflaechen-pv-oesterreich.js:298
- src/components/Rechner/Werkzeuge.js
- src/components/Rechner/ErgebnisAnfrage.js
- src/components/Flaeche/FlaechenWizard.js
- src/lib/plattform/geodaten/scoring.js
- src/lib/plattform/fach/lastgang.js
- src/app/robots.js
- src/data/site.js
