# geodaten – Geodaten & Akquise-Engine

Eigenständiger Dienst für die Flächenakquise. Er importiert Kataster, Schläge, Netzknoten, Schutzgebiete, Gelände, Zonen und Gebäude nach PostGIS. Daraus bildet er Kandidatenflächen (Verbünde zusammenhängender Parzellen) und bewertet sie mit der Scoring-Engine. Über eine REST-API liefert er die Ergebnisse an das Portal.

- Architektur, Datenschutz und Ausbau: [`docs/AKQUISE-GEODATEN.md`](../../../docs/AKQUISE-GEODATEN.md)
- Quellen und Lizenzen: [`QUELLEN.md`](./QUELLEN.md)

Die Website spricht den Dienst serverseitig mit `GEODATEN_URL` und `GEODATEN_TOKEN` an (`src/lib/plattform/geodaten/dienst.js`). Ohne Dienst läuft das Portal im Demo-Betrieb. Dieser nutzt die lokalen GeoJSON-Dateien und dieselbe Scoring-Logik in JavaScript.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `geodaten/scoring.py` | Scoring-Engine, reine Funktionen und identisch mit `src/lib/plattform/geodaten/scoring.js` |
| `geodaten/netz.py` | Netzanschlusskosten, gespiegelt aus Netzanschluss-Rechner und `FREIFLAECHE.netz` |
| `geodaten/geometrie.py` | Distanzen (Haversine), Fläche, Kompaktheit, Punkt-in-Polygon, Neigung/Exposition – rein |
| `geodaten/quellen.py` | Quellenregister: Lizenz, Attribution, Bezugsweg |
| `geodaten/db.py` | Verbindung, Schema, Importlauf mit SHA-256 (idempotent), ogr2ogr → Stage-Tabelle |
| `geodaten/importe.py` | Import-Schritte je Quelle (VGD, DKM, INVEKOS, OSM, Natura 2000, Schutzgebiete, DGM, Zonen, Gebäude, Demo) |
| `geodaten/ableiten.py` | Nutzung je Parzelle, Verbünde (`ST_ClusterDBSCAN`), Merkmale, Scoring je Bezirk |
| `geodaten/api.py` | REST-API (FastAPI): Bearer-Token, BBox, GeoJSON, Vector Tiles |
| `geodaten/grundbuch.py` | Adapter für die Grundbuchabfrage – vorbereitet, **nicht aktiv**, kein Scraping |
| `geodaten/cli.py` | Kommandozeile: `schema`, `import …`, `ableiten`, `demo`, `quellen` |
| `sql/001_schema.sql` | Datenmodell (EPSG:31287) |
| `demo/` | Overpass-Abfragen, `demo_bauen.py` und der Demo-Datensatz |
| `tests/` | `python -m unittest` (ohne GIS-Bibliotheken) mit gemeinsamen Testfällen JS ↔ Python (`faelle.json`) |

## Tests (lokal, ohne Docker)

```
cd Backend-Import/dienste/geodaten
python -m unittest discover -s tests -v
```

Testfälle nach einer Änderung an der JS-Engine neu erzeugen (im Website-Repository):

```
node Backend-Import/dienste/geodaten/tests/faelle_erzeugen.mjs
```

## Inbetriebnahme

1. `cp .env.example .env`. Dann `POSTGRES_PASSWORD` und `DIENST_TOKEN` zufällig erzeugen (`openssl rand -base64 48`).
2. Zertifikate `api.crt` und `api.key` nach `./zertifikate` legen (Hostname z. B. `geodaten.oekoinvest.com`).
3. `docker compose up -d --build`. Der Dienst legt das Schema beim Start an.
4. Zum Ausprobieren: `docker compose run --rm geodaten python -m geodaten.cli demo --verzeichnis demo`.
5. Website: `GEODATEN_URL=https://<host>:8444` und `GEODATEN_TOKEN=<DIENST_TOKEN>` setzen. Port 8444 nur für den Website-Server freigeben.

## Datenbezug und Import (Oberösterreich zuerst)

Dateien nach `./daten` legen. Die Dateinamen ändern sich mit jedem Stichtag – aktuelle Links stehen in [`QUELLEN.md`](./QUELLEN.md).

```
docker compose run --rm geodaten python -m geodaten.cli import vgd        --datei /daten/VGD_Oesterreich_gen_50_<stichtag>.zip --stand <JJJJ-MM-TT>
docker compose run --rm geodaten python -m geodaten.cli import dkm        --datei /daten/KAT_DKM_GST_epsg31287_<stichtag>.gpkg --stand <JJJJ-MM-TT> --bundesland Oberösterreich
docker compose run --rm geodaten python -m geodaten.cli import invekos    --datei /daten/inspire_schlaege_2026-1_polygon.gpkg.zip --jahr 2026-1
docker compose run --rm geodaten python -m geodaten.cli import osm        --datei /daten/austria-latest.osm.pbf
docker compose run --rm geodaten python -m geodaten.cli import natura2000 --datei /daten/Natura2000_end2024.gpkg --stand 2024-12-31
docker compose run --rm geodaten python -m geodaten.cli import schutz     --datei /daten/naturschutzgebiete_oesterreich_2025.gpkg
docker compose run --rm geodaten python -m geodaten.cli import dgm        --datei /daten/dgm_oesterreich_10m.tif
docker compose run --rm geodaten python -m geodaten.cli import gebaeude   --datei /daten/DLM_BAUWERKE.gpkg
docker compose run --rm geodaten python -m geodaten.cli import zonen      --quelle noe_pv_zonen --bundesland Niederösterreich --art noe_pv_zone --datei /daten/pv_zonen_noe.gpkg
docker compose run --rm geodaten python -m geodaten.cli ableiten
```

- **Idempotent:** Gleiche Eingabedateien (SHA-256) werden übersprungen, mit `--erzwingen` trotzdem importiert. Jeder Import ersetzt nur die Datensätze seiner Quelle, und zwar in einer Transaktion.
- **Protokoll:** Jeder Lauf steht in `geo.importlauf`. Lizenz, Stand und Anzahl stehen in `geo.quelle` (`python -m geodaten.cli quellen`).
- **Feldnamen:** Der Import prüft sie gegen das Stage-Schema. Weicht eine Ausgabe ab, bricht er mit der Liste der vorhandenen Spalten ab. Dann die Kandidatenliste im jeweiligen Schritt ergänzen.

## Deutschland und Schweiz (Ausbaustufe A1b)

Die Schema-Erweiterung `sql/002_de_ch.sql` (Tabellen `verkehr_linie`, `kulisse`; Spalten `parzelle.kennzeichen`, `kandidat.kulisse`) läuft automatisch mit `schema`. Import-Schritte in `geodaten/importe_de_ch.py`:

```
docker compose run --rm geodaten python -m geodaten.cli import alkis       --datei /daten/alkis_nw.zip --bundesland Nordrhein-Westfalen --quelle alkis --stand <JJJJ-MM-TT>
docker compose run --rm geodaten python -m geodaten.cli import feldbloecke --datei /daten/feldbloecke_nw.gpkg --quelle invekos_de --jahr 2026
docker compose run --rm geodaten python -m geodaten.cli import verkehr     --datei /daten/germany-latest.osm.pbf
docker compose run --rm geodaten python -m geodaten.cli import kulisse     --datei /daten/bena_by.zip --art benachteiligt --land DE --quelle kulisse_bena
docker compose run --rm geodaten python -m geodaten.cli import kulisse     --datei /daten/organische_boeden.gpkg --art moor --land DE --quelle kulisse_moor_thuenen
docker compose run --rm geodaten python -m geodaten.cli import av_ch       --datei /daten/av_be.gpkg --bundesland Bern --quelle av_ch
docker compose run --rm geodaten python -m geodaten.cli import kulisse     --datei /daten/fff_be.gpkg --art fff --land CH --quelle ch_fff
docker compose run --rm geodaten python -m geodaten.cli import dgm         --datei /daten/dgm_de.vrt
docker compose run --rm geodaten python -m geodaten.cli ableiten
```

- `ableiten` berechnet für DE-Verbünde Randstreifen (500 m) und Privilegierung (200 m, Autobahn bzw. zweigleisige Hauptbahn) per Puffer/Verschneidung sowie die Kulissen-Anteile, für CH Eignung/FFF. Regeln: `docs/AKQUISE-GEODATEN.md` Abschnitt 9.
- DGM je Land als VRT aus Kacheln (`gdalbuildvrt`, DGM1 der Länder bzw. swissALTI3D).
- Demo DE: `python demo/demo_bauen_de.py <netz.json> <verkehr.json> <orte.json> <schutz.json>` (Abfragen in `demo/overpass/*-{schwaben,unterallgaeu}.overpassql`).
- Tests: `python -m unittest discover -s tests` (inkl. `test_scoring_de_ch.py`).

## Aktualisierung (empfohlen)

| Quelle | Rhythmus |
|---|---|
| DKM, VGD | halbjährlich nach den BEV-Stichtagen 1.4. und 1.10., Download etwa +3 Monate |
| INVEKOS | zweimal jährlich (`JJJJ-1` und `JJJJ-2`) |
| OSM-Netz | monatlich (Geofabrik) |
| Schutzgebiete | jährlich |
| DGM | bei neuer Ausgabe |

Danach `ableiten` ausführen. Kapazitäten pflegt das Backoffice laufend im Portal. Die Neuberechnung der betroffenen Bezirke läuft nächtlich per Cron: `python -m geodaten.cli ableiten`.

## API

Authentifizierung mit `Authorization: Bearer <DIENST_TOKEN>` (außer `/v1/gesundheit`).

| Endpunkt | Inhalt |
|---|---|
| `GET /v1/kandidaten?bbox=&minHa=&maxTrasseKm=&minScore=&bundesland=&bezirk=&gemeinde=&ampel=&q=&limit=` | Kandidatenflächen |
| `GET /v1/kandidaten/{id}` | Steckbrief mit Grundstücken |
| `GET /v1/umkreis?knoten=&km=` | Beste Flächen um einen Netzknoten |
| `GET /v1/netzknoten?bbox=&arten=` | GeoJSON |
| `GET /v1/ebenen/{schutzgebiete\|zonen}?bbox=` | GeoJSON, vereinfacht |
| `GET /v1/suche?q=` | Gemeinde, KG, „KG-Nr Gst-Nr“, Umspannwerk |
| `PUT /v1/netzkapazitaet/{knotenId}` | Kapazität mit Quelle und Stand |
| `GET /v1/tiles/{kandidaten\|parzellen\|netzknoten}/{z}/{x}/{y}.pbf` | Mapbox Vector Tiles |
| `GET /v1/quellen` | Lizenzen und Attributionen |
| `GET /v1/uebersicht` | Kennzahlen und Gebietslisten für die Filter |

Jeder Abruf wird mit der vom Portal durchgereichten Konto-ID in `geo.zugriff` protokolliert (Kopfzeile `X-Plattform-Nutzer`, ohne Geometrien).
