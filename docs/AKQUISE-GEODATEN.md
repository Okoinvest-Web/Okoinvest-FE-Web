# Geodaten & Akquise-Engine – Flächen finden, bewerten, gewinnen

Stand: 30.09.2026. Österreich zuerst (Innviertel/Oberösterreich), Architektur für Deutschland und die Schweiz vorbereitet.

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

## 9. Ausbau Deutschland und Schweiz

**Deutschland**

- **Kataster:** ALKIS-OpenData der Länder, Flurstücke ohne Eigentümer (15 von 16 Ländern frei; **Bayern nicht**, dort nur Parzellarkarte als Raster und Tatsächliche Nutzung unter CC BY 4.0).
- **Import:** eigener Schritt je Land (NAS/GPKG → `parzelle`, `land = 'DE'`, gemeinsames metrisches System EPSG:3035 oder UTM 32N).
- **Schläge:** InVeKoS-Daten sind länderweise teils frei (z. B. Brandenburg, NRW) – je Land prüfen.
- **Netz:**
  - MaStR-Gesamtexport (DL-DE/BY-2.0) für bestehende Anlagen und Netzbetreiber
  - OSM-Umspannwerke
  - Kapazitätskarten der Netzbetreiber, sobald § 17c EnWG-E in Kraft ist; bis dahin manuell
- **Scoring:** EEG-Flächenkulisse (§ 37 EEG: 500-m-Randstreifen an Autobahnen/Schienen, benachteiligte Gebiete je Länderöffnungsklausel), BauGB § 35 (200-m-Privilegierung), Agri-PV nach DIN SPEC 91434. Widmungsregeln je Bundesland in `WIDMUNG`.

**Schweiz**

- **Kataster:** amtliche Vermessung über geodienste.ch (Liegenschaften, INTERLIS/GPKG, kantonale Bedingungen).
- **Gelände:** swissALTI3D (OGD, „© swisstopo“).
- **Weitere Daten:** Sonnendach/Solarpotenzial des BFE, Netzbetreiber-Kapazitäten (offen).
- **Scoring:** Solarexpress (alpine Anlagen) und kantonale Richtpläne als Zonen.
