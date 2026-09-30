# Geodaten & Akquise-Engine – Flächen finden, bewerten, gewinnen

Stand: 30.09.2026. Österreich (Innviertel/Oberösterreich), Deutschland (Demo Unterallgäu/Türkheim, EEG-Kulisse) und Schweiz (Adapter); Akquise-Kampagnen, Sperrliste und Gemeinde-Screening (Abschnitte 9–12).

**Ziel:** Geeignete Flächen für Freiflächen- und Agri-PV systematisch finden. Die Flächen werden objektiv bewertet und mit Netzanschluss-Schätzung priorisiert. Mit einem Klick gehen sie in die Akquise-Pipeline – schneller und vollständiger, als es mit Anfragen und Zufallskontakten möglich ist.

> Alle Bewertungen sind Schätzungen für die Vorauswahl. Maßgeblich sind die Auskunft des Netzbetreibers, die Widmungsprüfung durch Gemeinde und Land und die Standortbegehung. Keine Rechtsberatung. Datenschutz- und Lizenzfragen vor dem Echtbetrieb freigeben lassen.

## 1. Überblick

```
Amtliche/offene Daten ──▶ Geodaten-Dienst (Backend-Import/dienste/geodaten)
 BEV DKM, VGD, DGM          PostGIS (EPSG:31287) · Import je Quelle (idempotent, Lizenz/Stand/SHA-256)
 AMA INVEKOS                Ableitung: Nutzung → Verbünde (ST_ClusterDBSCAN) → Merkmale → Scoring (scoring.py)
 OSM/Geofabrik Netz          REST-API (Bearer) · GeoJSON · Vector Tiles
 EEA/UBA Schutzgebiete               │
 Länder-Zonen, Gebäude               ▼
                            Next.js (src/lib/plattform/geodaten) ── Rechte: Backoffice „geodaten“ (Leitung, Akquise)
                                     │                      └── Demo: lokale GeoJSON + gleiche Scoring-Logik (scoring.js)
                                     ▼
                            /portal/admin/akquise/karte  (Leaflet + basemap.at)
                                     │ „Als Akquise-Ziel übernehmen“
                                     ▼
                            Plattform-Backend (Demo bzw. Frappe): Fläche (Akquise-Pipeline) + Aufgabe
                            „Eigentümer ermitteln (Grundbuchabfrage)“ + Plattform Akquise Ziel (Geometrie, Score, UW)
```

## 2. Bedienung (Backoffice)

**Zugang**

- Seite `/portal/admin/akquise/karte`, im Menü unter „Steuerung → Akquise-Karte“.
- Einstieg außerdem auf `/portal/admin/akquise` über die Karte „Akquise-Karte: neue Flächen finden“.
- Nur für die Unterrollen **Leitung** und **Akquise** (Rechte-Matrix, Bereich `geodaten`). Alle anderen Unterrollen erhalten 404 bzw. 403.

**Karte**

- basemap.at, umschaltbar zwischen Grau und Orthofoto (mit Beschriftungs-Overlay).
- Ebenen:
  - Kandidatenflächen (Polygone in Score-Farbe)
  - Score-Heatmap bei kleinem Maßstab
  - Umspannwerke nach Spannungsebene (380/220 kV, 110 kV, MS). Der Ring zeigt die Kapazität: grün frei, rot knapp, weiß unbekannt.
  - Trafostationen ab Zoom 12
  - Schutzgebiete
  - Zonen bzw. OÖ-Prioritätsradien
  - Umkreis-Radius und Trassenlinie
- Die Attribution (basemap.at, OSM, BEV, AMA) ist unten rechts immer sichtbar.

**Filter**

- Mindestgröße, max. Trassenlänge, Mindest-Score, Ampel
- Bundesland / Bezirk / Gemeinde

**Suche** (Taste `/`)

- Ort/Gemeinde, Katastralgemeinde, Grundstück (`KG-Nr Gst-Nr`, z. B. `40404 123/4`), Umspannwerk, Kandidaten-ID.
- Die Adresssuche folgt im Dienst über das BEV-Adressregister (siehe Abschnitt 8).

**Umkreis-Suche**

- Umspannwerk anklicken → Radius wählen → „Beste Flächen“.
- Die Liste ist nach Score sortiert, mit Abstand zum UW.

**Steckbrief** (Klick auf Fläche)

- Score mit Begründung je Kriterium und K.-o.-Gründe
- Hektar, mögliche MWp
- Nutzung, Neigung/Exposition, Kompaktheit, Siedlungsabstand, Schutzgebiete, Widmungslage mit Landesregel
- Anschlusspunkt mit Luftlinie, geschätzter Trasse, Kostenspanne, €/kWp, Anteil an der Anlage, Kapazitätsampel und Zeitrahmen
- Ertrag, Pachtspanne (Freifläche und Agri-PV), Errichtungskosten
- Liste der Grundstücke

**Aktionen**

- **Als Akquise-Ziel übernehmen:**
  - legt eine Fläche in der Akquise-Pipeline an (Status Entwurf, Tag „Geodaten“, Priorität aus dem Score, Netzentfernung und Besonderheiten vorbelegt, zuständig die übernehmende Person)
  - legt die Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“ an (fällig in 5 Tagen)
  - legt das Akquise-Ziel mit Geometrie an
  - doppelte Übernahme → 409
- **Anschreiben-Vorlage:** Serienbrief mit Datenschutzinformation, siehe Abschnitt 6.
- **Export** CSV (Excel-DE) oder GeoJSON der gefilterten Flächen. Der Export wird protokolliert und ist rate-limitiert.
- **Messwerkzeug** (Taste `m`): Distanzen in der Karte messen.
- **Netzkapazität pflegen** am Umspannwerk: frei/knapp/unbekannt, freie MW, **Quelle und Stand Pflicht**.

**Mobil:** Panel über „Panel“ öffnen, der Steckbrief erscheint als unteres Blatt. Vollbild-Schalter oben rechts.

## 3. Scoring (0–100 Punkte)

Die Engine gibt es identisch in JS (`src/lib/plattform/geodaten/scoring.js`) und Python (`…/dienste/geodaten/geodaten/scoring.py`). Die gemeinsamen Testfälle stehen in `tests/faelle.json`.

| Kriterium | max. | Regel |
|---|---|---|
| Größe | 20 | < 2 ha K.-o. (Deckel 25); 2–3 ha 6; 3–5 ha 6→14; **5–50 ha 20**; > 50 ha 16 (UVP-Schwelle und Netzkapazität prüfen) |
| Form | 8 | Kompaktheit = Fläche/konvexe Hülle × Streckungsfaktor (Hauptachsen > 2,5 : 1 abgewertet) |
| Neigung/Exposition | 12 | ≤ 3° 12; ≤ 7° 10 (Süd) bzw. 6; ≤ 12° 6 bzw. 1; > 15° K.-o. (Deckel 20) |
| Nutzung | 8 | Acker 8, Grünland 7, sonstige 3 (flächengewichtet). Hinweis auf den EAG-Abschlag von 25 % |
| Abstand Siedlung | 8 | < 100 m 0, ≥ 300 m 8, dazwischen linear |
| Netz (Trasse) | 22 | ≤ 1 km 22 → 3 km 18 → 5 km 13 → 8 km 7 → 12 km 3 → 0 |
| Netzanschlusskosten | 8 | Anteil an den Anlagenkosten < 8 % 8 → 15 % 5 → 25 % 2 → 0 |
| Widmungslage | 10 | Zone/Priorität 1: 10 · angrenzend/Priorität 2: 6 · Einzelfall: 4 · außerhalb: 2 |
| Einstrahlung | 4 | kWh/kWp je Bundesland (PVGIS, Regionaldaten), 1.000 → 0 bis 1.200 → 4 |

**Abzüge**

| Anlass | Wirkung |
|---|---|
| Natura 2000, Nationalpark, NSG, Überdeckung > 5 % | K.-o. (Deckel 15) |
| Nähe ≤ 200 m zu Natura 2000 / NSG | −6 bzw. −5 |
| Landschafts- oder Wasserschutzgebiet | −8 bzw. −10 anteilig |
| Kapazität „knapp“ | −8 |
| Kapazität „frei“ | +3 |
| Widmung außerhalb der Zonen über der Landesgrenze (NÖ > 2 ha) | Deckel 45 |
| Burgenland außerhalb der Eignungszonen | Deckel 20 |
| Kärnten > 4 ha je Widmung | −3 |

**Ampel und Priorität**

- Ampel: grün ≥ 65, gelb ≥ 45, sonst rot.
- Priorität: A bei Score ≥ 65 und ≥ 5 ha, B bei Score ≥ 45, sonst C (wie die Akquise-Pipeline).

**Kennzahlen**

- MWp = ha / 1,1 (`FREIFLAECHE.haProMwp`)
- Ertrag = MWp × kWh/kWp
- Pacht = ha × `PACHT.freiflaecheProHa` bzw. `agriProHa`

**Netzanschluss**

- **Trasse** = Luftlinie × 1,25 + 150 m je Querung. Querungen zählt der Dienst in PostGIS: Autobahn, Landes-/Bundesstraße, Bahn, Fluss (OSM). Die Demo rechnet ohne Querungen.
- **Anschlusspunkt:** Unter den Knoten im Suchradius (25 km) wird der Knoten mit den **geringsten geschätzten Kosten** gewählt, nicht der nächstgelegene.
  - bis 12 MW: Einschleifen an Trafostation/MS-Knoten oder MS-Sammelschiene
  - bis 35 MW: Umspannwerk 110 kV
  - darüber: 110-kV-Anschluss mit eigenem Umspannwerk
- **Kosten:** nach Netzanschluss-Rechner (`src/lib/rechner/netzanschluss.js`, `FREIFLAECHE.netz`) mit Spanne 0,8–1,4.
- Bei knapper Kapazität wird der Knoten intern mit dem Faktor 1,5 bewertet. So gewinnt ein etwas weiterer, freier Knoten.

**Widmung je Bundesland**

- **OÖ:** Kriterienkatalog PV-FFA, energiewirtschaftliche Priorität 1 (≤ 5 km zum UW) und Priorität 2 (≤ 7,5 km).
- **NÖ, Burgenland, Steiermark:** verordnete Zonen als Geodaten, sofern importiert.
- **Salzburg, Kärnten, Tirol, Vorarlberg, Wien:** Einzelfall mit hinterlegter Landesregel.

## 4. Datenmodell und Dienst

- Tabellen: `geo.quelle`, `importlauf`, `verwaltung`, `parzelle`, `schlag`, `netzknoten`, `netzkapazitaet`, `querung_linie`, `schutzgebiet`, `widmungszone`, `siedlung`, `kandidat`, `zugriff` (`sql/001_schema.sql`).
- Speicherung in EPSG:31287, Ausgabe in WGS84.
- Betrieb, Import-Befehle und API: [`Backend-Import/dienste/geodaten/README.md`](../Backend-Import/dienste/geodaten/README.md).

**Frappe** (`oekoinvest_app`)

| Bestandteil | Inhalt |
|---|---|
| DocType `Plattform Akquise Ziel` (Präfix AZ) | Kandidat-ID, Fläche, Aufgabe, Status (offen/in_kontakt/gesichert/verworfen), Score, ha, MWp, Gebiet, Umspannwerk-Bezug (ID, Name, Art, Trasse, Kostenspanne), Grundstücke (JSON), **Geometrie als GeoJSON-Text** (geprüft: Polygon/MultiPolygon, WGS84) |
| DocType `Plattform Netzkapazitaet` (Präfix NK) | Knoten-ID, frei/knapp/unbekannt, freie MW, **Quelle und Stand Pflicht** |
| API `oekoinvest_app.plattform.api.geodaten` | `ziele`, `ziel_uebernehmen`, `kapazitaeten`, `kapazitaet_setzen` |
| Rechte | `rechte.py`, Bereich `geodaten` |
| Tests | `plattform/tests/test_geodaten.py` |

Die DocTypes werden mit `bench migrate` angelegt; Einträge in `hooks.py` bzw. Fixtures sind nicht nötig.

Hinweis: Übernommene Flächen haben zunächst **kein Eigentümerkonto** (`nutzer_id` leer). Das Konto bzw. der CRM-Kontakt entsteht erst nach der Grundbuchabfrage und dem Erstkontakt. Vor dem Go-live prüfen, dass alle Backoffice-Ansichten der Fläche mit leerem Eigentümer umgehen.

**Website**

| Pfad | Inhalt |
|---|---|
| `src/lib/plattform/geodaten/{geo,scoring,kandidaten,demo,dienst,index,export,anschreiben}.js` | Adapter, Scoring, Export, Anschreiben |
| `src/lib/plattform/backend/geodaten.js` | Übernahme und Kapazitäten, Demo bzw. Frappe |
| `/api/admin/geodaten/**` | API-Routen, Vertrag siehe `docs/API.md` Abschnitt „Geodaten“ |
| `GEODATEN_URL`, `GEODATEN_TOKEN` | Umgebungsvariablen; ohne sie gilt Demo (im Produktions-Build nur mit `PLATTFORM_DEMO=1`) |

## 5. Demo-Datensatz

| Datei | Inhalt |
|---|---|
| `public/geo/netzknoten-ooe-sbg.geojson` | Umspannwerke und Schaltwerke OÖ und Salzburg aus OSM (Overpass, Stand 30.09.2026, ODbL), Trafostationen nur Innviertel |
| `public/geo/schutzgebiete-innviertel.geojson` | OSM-Schutzgebiete (ODbL, nicht amtlich) |
| `public/geo/orte-innviertel.geojson` | Siedlungspunkte (OSM, ODbL) |
| `src/data/geo/parzellen-demo.geojson` | **Synthetische** Parzellen rund um Braunau/Innviertel |

Zur Datei der Demo-Parzellen:

- 230 Parzellen in 32 Blöcken und 6 Einzelparzellen, ca. 780 ha
- zwei Blöcke absichtlich an Schutzgebieten; einer davon in Salzburg, um die Einzelfallregel zu zeigen
- KG-Nummern 99xxx (nicht vergeben), Kennzeichnung „DEMO-KG“
- **keine echten Grundstücke, keine Eigentümer**

Neu erzeugen mit `python Backend-Import/dienste/geodaten/demo/demo_bauen.py <overpass-json …>` (deterministisch).

## 6. Datenschutz, Direktwerbung, Grundbuch

**Datenbestand ohne Personenbezug**

- Der Geodaten-Dienst enthält **keine Eigentümerdaten**. Die DKM-Stichtagsdaten sind ohne Eigentümer, Kataster und Schläge sind Sachdaten.
- Personenbezogen wird es erst mit der Grundbuchabfrage. Deren Ergebnis gehört ins CRM der Plattform, nicht in den Dienst.

**Grundbuchabfrage**

- Nur über JustizOnline bzw. eine zugelassene **Verrechnungsstelle**, mit Vertrag. Die Kosten je Auszug stehen in `QUELLEN.md`.
- Suche **nur nach Grundstück** (KG + Grundstücksnummer / EZ), nie nach Person (§ 5 Abs. 4 GUG).
- Jede Abfrage wird mit Zweck, Person und Objekt protokolliert.
- Der Adapter `geodaten/grundbuch.py` ist vorbereitet und inaktiv. Es wird nichts gescrapt.

**Erstkontakt**

- Nur **per Brief**, einmalig.
- Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO. Die DSB hält eine einmalige Zusendung auf Grundbuchbasis bei Erfüllung der Informationspflichten für zulässig (GZ DSB-D123.626/0006-DSB/2018, Sekundärquelle).
- Der Brief enthält:
  - die **Art.-14-Information**: Verantwortlicher, Zweck, Rechtsgrundlage, **Datenquelle Grundbuch**, Speicherdauer, Rechte
  - den **Widerspruchshinweis** (Art. 21)
  - Liegenschaftsdaten nicht von außen sichtbar (Kuvert ohne Sichtfenster auf Grundstücksangaben)
- Keine wiederholten Zusendungen ohne Reaktion. Einen Widerspruch sofort als Sperrvermerk im CRM erfassen.
- **Telefon, E-Mail und SMS nur mit vorheriger Einwilligung** (§ 174 TKG 2021).
- Die Robinsonliste (§ 151 GewO) bindet nur Adressverlage und Direktmarketingunternehmen. Freiwillig gegen die eigene Sperrliste abgleichen.
- Die Vorlage erzeugt `src/lib/plattform/geodaten/anschreiben.js`. Platzhalter «…» kommen aus dem CRM. Es werden keine Telefonnummer und keine E-Mail-Adresse eingesetzt – sie sind nicht freigegeben.
- Einträge ins **Verarbeitungsverzeichnis**: Flächenakquise (Geodaten, Grundbuch, CRM) sowie die Interessenabwägung dokumentieren.

## 7. Lizenzen und Attribution

| Quelle | Lizenz | Pflichten |
|---|---|---|
| basemap.at | CC BY 4.0 | „Grundkarte: basemap.at“ |
| OSM | ODbL | „© OpenStreetMap-Mitwirkende“ mit Link. **Share-Alike** für abgeleitete Datenbanken; deshalb OSM-Knoten und eigene Kapazitäten getrennt halten, Exporte mit Hinweis. |
| BEV (DKM, VGD, DGM) | CC BY 4.0 | Quellenangabe |
| AMA INVEKOS | CC BY 4.0 | Quellenangabe |
| EEA Natura 2000 | CC BY 4.0 | Quellenangabe |
| APG und Verteilnetzbetreiber | keine Lizenz angegeben | nur manuell als Quelle für Kapazitäten nutzen |

Details in [`QUELLEN.md`](../Backend-Import/dienste/geodaten/QUELLEN.md).

## 8. Für den Echtbetrieb zu beschaffen bzw. zu klären

1. **Server** für den Dienst (PostGIS, ≥ 8 GB RAM, ~150 GB SSD für DKM national, DGM und PBF), TLS-Zertifikat und Tokens.
2. **Daten herunterladen:** DKM-GPKG (aktueller Stichtag), VGD, INVEKOS 2026-1, Geofabrik Austria, EEA Natura 2000, UBA-Schutzgebiete, DGM 10 m, DLM Bauwerke, NÖ-PV-Zonen, Bgld.-Eignungszonen. Offene Lizenzfelder bestätigen (NÖ-Zonen, DLM).
3. **Netzkapazitäten:**
   - Datenzugang bei ebUtilities bzw. den Netzbetreibern anfragen (Netz OÖ, Netz NÖ, Salzburg Netz, Energienetze Steiermark, Linz Netz).
   - Bis dahin manuelle Pflege je UW mit Quelle.
   - APG-Tabelle als Referenz für die 110-kV/380-kV-Ebene.
4. **Steiermark SAPRO-PV-Zonen** als Geodaten beim Land anfragen. **OÖ DORIS-Layer** (Ausschlusszonen, Bodenfruchtbarkeit) als Dienst oder Download anfragen.
5. **Grundbuch:** Vertrag mit einer Verrechnungsstelle, Adapter implementieren, Kostenstelle festlegen.
6. **Datenschutz:**
   - Interessenabwägung und Eintrag im Verarbeitungsverzeichnis
   - Freigabe der Brief-Vorlage
   - Prozess für Widerspruch und Sperrliste
   - Löschfristen (12 Monate ohne Rückmeldung)
7. **Adresssuche:** Anbindung an das BEV-Adressregister (OGD) oder den basemap.at-Geocoder im Dienst (`/v1/suche`).
8. **PVGIS** serverseitig für flächengenaue Ertragswerte (statt Bundesland-Mittel).
9. **Frappe:** `bench migrate` für die neuen DocTypes, `tests/test_geodaten.py` auf der Test-Bench ausführen, Ansichten mit leerem Eigentümer prüfen.

## 9. Deutschland und Schweiz (Ausbaustufe A1b, Stand 30.09.2026)

Gleiche Architektur wie in Österreich: Dienst (PostGIS) bzw. Demo (GeoJSON) → Kandidaten → Scoring (`scoring.js` ≙ `scoring.py`, gemeinsame Testfälle `tests/faelle.json`, Version `2026-09-30.2`). Österreich rechnet unverändert.

**Gewichte je Land (Summe 100)**

| Kriterium | AT | DE | CH |
|---|---|---|---|
| Größe / Form / Neigung / Nutzung / Siedlung | 20 / 8 / 12 / 8 / 8 | 18 / 7 / 10 / 6 / 7 | 18 / 7 / 11 / 6 / 7 |
| Netz (Trasse) / Netzkosten | 22 / 8 | 20 / 7 | 20 / 7 |
| Widmung bzw. Planungsrecht | 10 | 8 (BauGB) | 8 (Richtplan) |
| **Flächenkulisse** | – | **14** | **12** |
| Einstrahlung | 4 | 3 | 4 |

Die übrigen Kriterien werden proportional skaliert (Grundpunkte × Landesgewicht / Grundgewicht); Abzüge und K.-o.-Deckel gelten unverändert.

**Deutschland**

- **EEG-Flächenkulisse (14 Punkte)** – Anteil der Fläche × Faktor, das Maximum zählt (keine Doppelwertung):
  - Randstreifen bis 500 m längs Autobahnen oder Schienenwegen, gemessen vom äußeren Rand der Fahrbahn (§ 37 Abs. 1 Nr. 2 lit. c EEG 2023, **ohne Gleiszahl**) – Faktor 1,0
  - Konversions-/versiegelte Flächen (§ 37 Abs. 1 Nr. 2 lit. a/b) – 1,0
  - Acker/Grünland in benachteiligten Gebieten (§ 37 Abs. 1 Nr. 3 lit. h/i; seit Solarpaket I Opt-out der Länder nach § 37c EEG) – 0,85
  - entwässerte, landwirtschaftlich genutzte Moorböden mit dauerhafter Wiedervernässung (§ 37 Abs. 1 Nr. 3 lit. e) – 0,7
  - keine Kulisse → 0 Punkte, Hinweis „nur Agri-PV (besonderes Solarsegment) oder PPA ohne EEG“.
- **Planungsrecht (8 Punkte):** privilegiert nach § 35 Abs. 1 Nr. 8 lit. b BauGB, wenn ≥ 50 % der Fläche im Streifen bis 200 m längs **Autobahnen** oder **Schienenwegen des übergeordneten Netzes (§ 2b AEG) mit mindestens zwei Hauptgleisen** liegen („zone“); teilweise → „angrenzend“; sonst Bebauungsplan nötig („unklar“). Landesregeln als Text (Bayern: StMB-Hinweise; BW: Regionalpläne 0,2 %; Brandenburg: Arbeitshilfe/Sonderabgabe; übrige: allgemeine BauGB-Regel). § 35 Abs. 1 Nr. 9 BauGB (Agri-PV bis 2,5 ha mit Hofbezug) ist Hinweis, kein Kriterium.
- **Einstrahlung:** kWh/kWp je Bundesland aus `src/data/regionen/*.js`.
- **Ermittlung (Dienst):** `import verkehr` (Geofabrik-PBF: `highway=motorway`, `railway=rail` mit `usage=main|branch`, ohne `service`), Korridore per `ST_Buffer` 500/200 m, Anteil per `ST_Intersection` (`importe_de_ch.kulisse_verbund`). Kulissen-Polygone über `import kulisse --art benachteiligt|moor|konversion`.
- **Annahmen (dokumentiert, im Echtbetrieb prüfen):**
  - Gleiszahl: OSM-Tag `tracks`; fehlt er (im Unterallgäu durchgehend), gilt ein Hauptbahn-Weg als zweigleisig, wenn ein zweiter `usage=main`-Weg auf ≥ 60 % der Länge näher als 12 m verläuft. Maßgeblich ist das Infrastrukturregister der DB InfraGO.
  - Abstand zur OSM-Mittellinie statt zum äußeren Fahrbahnrand → Korridor leicht unterschätzt (konservativ).
  - Speicherung weiter in EPSG:31287; Verzerrung außerhalb Österreichs < 1 % (für 200/500-m-Korridore vernachlässigbar). DACH-weit mittelfristig EPSG:3035.
- **Kataster:** ALKIS-Open-Data in 15 von 16 Ländern (ohne Eigentümer). **Bayern: keine offenen Flurstücksvektoren** (kostenpflichtig je Flurstück, Parzellarkarte nur als Raster ohne Flurnummern) – für Bayern Lizenzvertrag oder Arbeit mit Kulisse/Feldstücken und Flurstücksnummern aus der Grundbuchanfrage. Details je Land: `QUELLEN.md` Abschnitt 11.
- **Karte:** TopPlusOpen des BKG (dl-de/by-2-0) als Grundkarte in Deutschland (basemap.at deckt nur Österreich ab), Ebene „Autobahn / Schiene“, Steckbrief mit Randstreifen-/Privilegierungsanteil, benachteiligtem Gebiet, Moor und Abständen.

**Schweiz (Kurzfassung – Adapter und Scoring, keine Demo-Daten)**

- **Eignung (12 Punkte):** Anteil im kantonalen Eignungsgebiet für Solaranlagen (Richtplan, Art. 8b RPG) – Faktor 1,0; vorbelasteter Standort (Verkehrs-/Infrastrukturanlage) – 0,6. **Fruchtfolgeflächen** (Sachplan FFF): Abzug bis −8 nach Anteil. Raumplanung: im Eignungsgebiet „zone“, sonst Ausnahmebewilligung/Einzelfall (Art. 24 ff. RPG, Art. 32c RPV – Agri-PV in wenig empfindlichen Gebieten).
- Solarexpress (Art. 71a EnG) betrifft alpine Großanlagen (national bedeutend) und ist für Mittelland-Flächen nicht einschlägig; die vom Parlament beschlossene Verlängerung vor Einsatz im Detail prüfen.
- **Import:** `import av_ch` (amtliche Vermessung über geodienste.ch, Bedingungen je Kanton), `import kulisse --land CH --art eignung|fff|vorbelastet`, `import dgm` mit swissALTI3D-VRT (OGD, „© swisstopo“).

## 10. Akquise-Kampagnen (Backoffice)

Seiten `/portal/admin/akquise/kampagnen` (Liste, neue Kampagne aus Gemeinde oder Filter), `/portal/admin/akquise/kampagnen/[id]`, `/portal/admin/akquise/sperrliste`; aus der Karte: Liste → „Kampagne aus dieser Liste bilden“. Rechte: Bereich `geodaten` (Leitung, Akquise), Änderungen zusätzlich `akquise` schreiben; alle anderen Unterrollen 403/404.

**Ablauf**

1. **Kampagne bilden** – Kandidaten werden serverseitig geladen (Auswahl, Filter mit Mindest-Score 45 oder Gemeinde). Eine Kampagne = ein Land (Rechtslage, Brieftext, Kosten). Flurstücke mit Widerspruch aus früheren Kampagnen sind sofort gesperrt und fallen aus der Kostenschätzung.
2. **Starten** → je Zielfläche eine Aufgabe „Grundbuchabfrage: <Gemeinde> (n Flurstücke) – ca. X €“ mit Hinweis auf die Rechtsgrundlage (DE § 12 GBO/§ 43a GBV, AT Verrechnungsstelle nach Grundstück, CH Art. 970 ZGB). Kostenschätzung je Flurstück: DE ≈ 10 €, AT ≈ 7,50 €, CH ≈ 20 CHF (Annahmen, vor Einsatz prüfen).
3. **Ergebnis erfassen** (manuell, je Eigentümer: Anrede, Name/Firma, Anschrift, betroffene Flurstücke, tatsächliche Kosten) → Abgleich mit der Sperrliste, Einmalcode je Empfänger, Aufgabe wird erledigt.
4. **Serienbrief** – Druck-PDF (je Empfänger 2 Seiten, DIN 5008 Form B, Faltmarken; Anschriftfeld nur Name/Anschrift) und **Versandliste** (CSV für Post/Lettershop). Brieftext über die Vorlagen-Engine: Standardtext oder eine Vorlage mit den Platzhaltern `{{flaeche.gemeinde}}`, `{{flaeche.flurstuecke}}`, `{{flaeche.pachtMin}}`, `{{flaeche.pachtMax}}`, `{{angebot.link}}`, `{{angebot.code}}`, `{{kampagne.name}}`. Fest und nicht änderbar: Datenschutzinformation, Widerspruchsblock, Link + QR-Code. Frappe: Druckformat „Serienbrief Akquise“ (Plattform Kampagnenziel). Abruf wird protokolliert.
5. **Versand bestätigen** (ab dann laufen die Fristen).
6. **Rücklauf:** Aufrufe der Angebotsseite (Zählung je Code), Anfragen (Vorgang „Fläche verpachten“, Herkunft „kampagne“, CRM-Lead über die bestehende Automatik), Rückmeldung per Brief/Telefon, Termin, gesichert (ha), kein Interesse, Widerspruch.
7. **Nachfassstufen** (Automationsregeln der Kampagne, beim Öffnen und täglich im Scheduler): nach X Tagen **ohne Reaktion** (Anfrage, Termin, Rückmeldung, Widerspruch – ein Seitenaufruf zählt nicht) eine Aufgabe:
   - „Zweiten Brief senden (einmalig)“ – nie mehr als zwei Briefe; **Österreich standardmäßig aus** (DSB: einmalige Zusendung)
   - „Anruf“ **nur, wenn eine ausdrückliche Einwilligung mit Nachweis vorliegt** (Formular der Angebotsseite oder erfasste Rückantwort) – sonst übersprungen und protokolliert.
8. **Kennzahlen je Kampagne:** Zielflächen, Flurstücke, Empfänger, Briefe, Aufrufe (Summe und Anteil der Angeschriebenen), Anfragen, Termine, Widersprüche, gesicherte ha, Kosten (Grundbuch Ist/Plan, Versand, sonstige) und **Kosten je gesichertem ha**, Rücklaufquote.

**Angebotsseite `/angebot/[code]`** (öffentlich, nur per Einmalcode; Eingabe auch über `/angebot`)

- `noindex, nofollow`, `referrer: no-referrer`, keine Statistik (Google Analytics nimmt `/angebot` aus), Rate-Limit je IP, unbekannte Codes neutral.
- Inhalt nur Flächen-Steckbrief: Gemeinde, ha, MWp, Pachtspanne, Trassenlänge, Kulissen-Pluspunkt, schematischer Umriss **ohne Koordinaten und Karte**; **keine** Namen, Anschriften, Flurstücksnummern, Kampagnen-IDs. Pachtrechner mit Vorbelegung (ha, Region, Mitte der Spanne).
- Formular „unverbindlich Kontakt aufnehmen“ (optional Einwilligung Telefon) und **„Nicht mehr anschreiben“** (Widerspruch, sofort wirksam).

**Sperrliste**

- Gespeichert werden nur Abgleichswerte: SHA-256 mit geheimem Pfeffer (`SPERRLISTE_PFEFFER` bzw. site_config `oekoinvest_sperrliste_pfeffer` – setzen und nie ändern) über **Name + PLZ** (Straße bewusst nicht: Schreibweisen) und über die **Flurstücke**; Anzeige maskiert („H. W***, 86807“).
- Wirkt sofort in allen Kampagnen: gleiche Person → gesperrt, Code inaktiv, kein Brief; Flurstücke → in neuen Kampagnen vorab gesperrt (Miteigentümer bestehender Kampagnen bleiben ansprechbar).
- Manuelle Erfassung (Brief/Telefon/E-Mail) mit Vor- und Nachname bzw. Firma und PLZ. Aufheben nur durch die Leitung mit Begründung (Irrtum), protokolliert; gelöscht wird nur mit einer **Testkampagne**.

## 11. Gemeinde-Screening

Seite `/portal/admin/akquise/gemeinden`. Je Gemeinde: Kandidaten, ha (geeignet ab Score 45), MWp, beste Flächen, Netzknoten mit gepflegter Kapazität, Stand Bauleitplanung und Kriterienkatalog (aus kommunalen Anliegen oder gepflegt), Konkurrenzhinweise (nur mit Quelle, keine Personendaten), Kampagnen-Stand.

**Ranking (0–100):** Flächenpotenzial 35 (Σ ha × Score, voll ab 60 gewichteten ha) · Qualität der besten drei 15 · Netz 15 (frei 15, unbekannt 8, knapp 2) · Bauleitplanung 15 (FNP mit PV 15 … keine 5, +3 bei beschlossenem Kriterienkatalog) · Kulisse/Widmung 10 (DE EEG-Kulisse, CH Eignung, AT Zone) · Wettbewerb 10 (−2 je Gewichtspunkt: Hinweis 1, Flächen gesichert 3, Verfahren 4, genehmigt/gebaut 5). Stufe A ab 65, B ab 45.

**Aktionen:** Stand pflegen, Konkurrenz erfassen, „Kampagne für die Gemeinde“, **Übergabe an die Kommune-Ansprache** (CRM-Organisation Art „gemeinde“ falls neu, CRM-Aktivität Termin/Notiz, Aufgabe „Gemeinde ansprechen“); Rücknahme nur Leitung.

**Frappe:** DocTypes `Plattform Kampagne` (AQ), `Plattform Kampagnenziel` (AQZ, Kindtabelle `Plattform Kampagnenempfaenger`), `Plattform Sperrliste` (SL), `Plattform Gemeinde Potenzial` (GP); Methoden `oekoinvest_app.plattform.api.akquise_kampagne.*`, reine Logik `plattform/akquise_kampagne_kern.py` (Unit-Tests ohne Bench), Druckformat „Serienbrief Akquise“, Scheduler `nachfassen_taeglich`. Desk-Rechte: nur ÖkoInvest Admin/Akquise (Sperrliste lesend).

## 12. Recht: Direktwerbung, Grundbuch, Kontaktwege (keine Rechtsberatung)

| Thema | Deutschland | Österreich | Schweiz |
|---|---|---|---|
| Eigentümer ermitteln | Grundbucheinsicht nur bei **berechtigtem Interesse** (§ 12 GBO); ein bloßes Kauf-/Pachtinteresse reichte nach bisheriger Rechtsprechung nicht. **Seit 01.05.2025 § 43a GBV:** bei Unternehmen, die Solaranlagen ≥ 750 kW projektieren oder betreiben, liegt das berechtigte Interesse **in der Regel** vor (Eigenerklärung), wenn das Grundstück im **Außenbereich (§ 35 BauGB)** bzw. in einem Plangebiet für Solar liegt. Abfrage nur nach Flurstück; Zweck dokumentieren. | Grundbuch öffentlich, Abfrage **nach Grundstück** (KG + Gst.-Nr./EZ) über Verrechnungsstelle; Personensuche nur bei rechtlichem Interesse (§ 5 Abs. 4 GUG). | Eigentümerauskunft **ohne Interessennachweis** (Art. 970 Abs. 2 ZGB; kantonale Online-Beschränkungen möglich). |
| Erstkontakt per Brief | Art. 6 Abs. 1 lit. f DSGVO i. V. m. ErwGr 47; Wertungen des § 7 UWG gelten mit (DSK-Orientierungshilfe Werbung 02/2022). Briefwerbung zulässig, solange nicht erkennbar unerwünscht. Pflicht: **Art.-14-Information mit Datenquelle**, **Widerspruchshinweis** (Art. 21 Abs. 2/4). Offen: ob Grundbuchdaten aus § 43a GBV für Werbebriefe genutzt werden dürfen (Zweckbindung) – vor Echtbetrieb mit der Datenschutzberatung klären und im Verarbeitungsverzeichnis/Interessenabwägung dokumentieren. | Art. 6 Abs. 1 lit. f DSGVO; DSB (DSB-D123.626/0006-DSB/2018): **einmalige** Zusendung auf Grundbuchbasis mit Art.-14-Information zulässig, keine Wiederholung ohne Reaktion. | revDSG (Art. 19 Informationspflicht, Art. 31 überwiegendes Interesse); zusätzlich DSGVO, da Verantwortlicher in der EU. Sterneintrag (Art. 3 Abs. 1 lit. u UWG) sperrt Telefon/Fax, nicht Post. |
| Telefon | nur mit **vorheriger ausdrücklicher Einwilligung** (§ 7 Abs. 2 Nr. 1 UWG) | nur mit Einwilligung (§ 174 TKG 2021) | nicht bei Sterneintrag; Einwilligung empfohlen |
| E-Mail/SMS | nur mit ausdrücklicher Einwilligung (§ 7 Abs. 2 Nr. 2 UWG) | nur mit Einwilligung (§ 174 TKG 2021) | Einwilligung (Art. 3 Abs. 1 lit. o UWG) |

Umsetzung in der Plattform: Erstkontakt nur per Brief; Datenquelle, Rechtsgrundlage, Speicherdauer (12 Monate ohne Rückmeldung), Rechte und Beschwerdestelle im Brief; Widerspruch per Brief oder Klick → Sperrliste über alle Kampagnen; Anruf-Aufgaben nur mit dokumentierter Einwilligung; keine Eigentümerdaten im Geodaten-Dienst, auf der Angebotsseite oder in Exporten der Karte; Zugriffe auf Serienbrief/Versandliste protokolliert. **Vor dem ersten Versand:** Brief-Vorlage und Interessenabwägung von der Datenschutzberatung freigeben lassen, Datenschutzerklärung um „Flächenakquise per Brief und Angebotsseite“ ergänzen, `SPERRLISTE_PFEFFER` setzen, Portokosten aktualisieren.
