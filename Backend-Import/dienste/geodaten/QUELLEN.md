# Quellen, Lizenzen und Bezugswege – Geodaten & Akquise-Engine

Recherche am 30.09.2026. Status je Angabe:

- **geprüft** heißt: auf der genannten Belegseite selbst nachgelesen.
- **Snippet** heißt: nur aus Suchergebnis oder Sekundärquelle, die Seite war nicht auswertbar.
- **offen** heißt: nicht verifiziert.

Vor dem Produktivimport muss jede Quelle nochmals gegen die aktuelle Datensatzseite geprüft werden, besonders Stichtag, Dateiname und Lizenzfeld. Die Zuordnung der Import-Schritte steht in `geodaten/quellen.py`.

> Keine Rechtsberatung. Lizenz- und Datenschutzfragen (Grundbuch, Direktwerbung) vor Einsatz mit der Rechts- bzw. Datenschutzberatung abstimmen.

## 1. Kataster und Verwaltungsgrenzen (BEV)

| | DKM – Kataster Grafik Grundstücksverzeichnis (Stichtagsdaten) | VGD – Verwaltungsgrenzen |
|---|---|---|
| Lizenz | **CC BY 4.0** (Standardlizenz laut Metadaten, geprüft). Einen vorgegebenen Attributionstext habe ich nicht gefunden (offen). | **CC BY 4.0** (geprüft) |
| Format | GeoPackage national (~34 GB), z. B. `https://data.bev.gv.at/download/Kataster/gpkg/national/KAT_DKM_GST_epsg31287_20250401.gpkg`. SHP je Bundesland (`…/Kataster/shp/<JJJJMMTT>/KAT_DKM_<Land>_SHP_<JJJJMMTT>.zip`). | SHP, z. B. `https://data.bev.gv.at/download/Verwaltungsgrenzen/shp/20240401/VGD_Oesterreich_gen_50_20240401.zip` |
| EPSG | GPKG 31287, SHP 31254/31255/31256 | 31287 |
| Inhalt | Grundstücksgrenzen, Grundstücks- und KG-Nummern, Nutzungen, Flächen. **Keine Eigentümer.** | KG, Gemeinden, Bezirke, Länder u. a. |
| Stand | Stichtage 1.4. und 1.10., Veröffentlichung ca. 3 Monate später (geprüft: 01.04.2025, veröffentlicht 20.06.2025). Stichtag 01.10.2025 als Snippet; neuere offen. | Stichtage 1.4./1.10.; neuere als 01.04.2024 offen |
| Beleg | [Record DKM GPKG](https://data.bev.gv.at/geonetwork/srv/api/records/13e8a671-a82c-4f29-bcfa-1b3e18e035ce) · [Record SHP](https://data.bev.gv.at/geonetwork/srv/api/records/17d4357f-5576-41ed-81b2-8dc99ee73bb6) · [BEV Stichtagsdaten](https://www.bev.gv.at/Services/Produkte/Kataster-und-Verzeichnisse/Kataster-Stichtagsdaten.html) | [Record VGD](https://data.bev.gv.at/geonetwork/srv/api/records/4153cfa8-06ba-4582-ac76-561456721913) |

**Einschränkung:** Frei und CC BY 4.0 sind nur die Stichtagsdaten auf data.bev.gv.at. Nicht frei sind:

- der tagesaktuelle Stand aus dem BEV-Shop (entgeltlich)
- der INSPIRE-WFS, für den die „Standardentgelte und Nutzungsbedingungen des BEV“ gelten

## 2. AMA INVEKOS-Schläge

- **Lizenz:** CC BY 4.0, Quellenangabe verpflichtend (geprüft). Exakter Attributionstext offen; im Dienst verwendet: „Datenquelle: Agrarmarkt Austria (INVEKOS)“.
- **Downloads:**
  - `https://inspire.lfrz.gv.at/009501/ds/inspire_schlaege_2025-1_polygon.gpkg.zip` (EPSG:31287)
  - WMS `https://inspire.lfrz.gv.at/009501/wms`
  - OGC API Features `https://gis.lfrz.gv.at/api/geodata/i009501/ogc/features/v1/`
- **Stand:** zweimal jährlich, „JJJJ-1“ als Sommerstand und „JJJJ-2“ als Winterrevision. Stand 2026-1 offen.
- **Attribute:** Schlagnutzungsart und `KZ_BIO_OEPUL_JN` (geprüft). Die genauen Feldnamen für SNAR-Code und Fläche sind offen. Der Import sucht deshalb mehrere Feldnamen und bricht mit klarer Meldung ab, wenn keiner passt.
- **Beleg:** [INSPIRE-Metadaten](https://geoportal.inspire.gv.at/metadatensuche/inspire/api/records/b2bd27c3-ccd9-4e5a-98ce-28deab1266f5)

## 3. Umspannwerke und Trafostationen

### OpenStreetMap (Demo und Grundbestand)

- **Lizenz:** ODbL 1.0 (geprüft).
- **Attribution:** „© OpenStreetMap-Mitwirkende“ mit Link auf openstreetmap.org/copyright. Der genaue Wortlaut stand im abgerufenen Seitentext nicht; es ist die übliche Form.
- **Share-Alike:** Veränderte bzw. abgeleitete Datenbanken dürfen nur unter ODbL weitergegeben werden.
- **Umsetzung im Dienst:** OSM-Knoten (`geo.netzknoten`) und eigene Anreicherungen (`geo.netzkapazitaet`) liegen getrennt. Exporte tragen den ODbL-Hinweis.
- **Overpass Fair Use** (geprüft):
  - Unkritisch sind weniger als 10.000 Anfragen und weniger als 1 GB pro Tag.
  - Eigener User-Agent, keine Parallelabfragen, bei 429 mindestens 30 s warten.
  - Kommerzielle Nutzung soll über eine eigene Instanz laufen, daher im Betrieb **Geofabrik-Extrakt** statt Overpass.
- **Geofabrik Austria** (geprüft): `austria-latest.osm.pbf` (773 MB, stündlich), ODbL. Ob `power=substation` in den „free“-Shapes enthalten ist, ist offen. Deshalb wird das PBF mit eigener `osmconf.ini` importiert.
- **Demo-Abfrage:** am 30.09.2026 ausgeführt (`demo/overpass/*.overpassql`).
  - OSM-Stand 2026-09-30T02:49Z (Netz, Schutzgebiete) bzw. 2026-07-28 (Orte, Spiegelserver kumi.systems).
  - Ergebnis: 1.643 Netzknoten, davon 19 × 220/380 kV, 102 × 110 kV, 185 × MS-Umspann-/Schaltwerke; 1.337 Trafostationen nur im Innviertel.
  - Kraftwerks-, Bahn- und Industrieunterwerke sind ausgeschlossen.

### APG (Übertragungsnetz)

- Veröffentlicht „Netzanschlusskapazitäten“ als HTML-Tabelle je Bundesland und Umspannwerk (Stand 01.08.2026, geprüft).
- Laut APG gibt es aktuell im APG-Netz **keine uneingeschränkten Anschlusskapazitäten**.
- Einen maschinenlesbaren Download oder eine Lizenz habe ich nicht gefunden. Die Tabelle ist deshalb als nicht frei nachnutzbar zu behandeln und nur manuell als Quelle der Kapazitätspflege zu verwenden.
- [markt.apg.at – Netzanschlusskapazitäten](https://markt.apg.at/netz/netzanschluss/netzanschlusskapazitaeten/)

### Verteilnetzbetreiber (Einspeisekapazitäten)

**Rechtsrahmen**

- Das ElWG (BGBl. I 91/2025, in Kraft laut RIS-Record 24.12.2025) enthält § 99 „Transparenz und Reservierung verfügbarer Netzanschlusskapazitäten“ und § 117 „Gemeinsame Internetplattform“ (Inhaltsverzeichnis geprüft, Wortlaut offen).
- Laut Snippets verlangt § 99:
  - Veröffentlichung je Umspannwerk auf Netzebene 4 (NE 6 innerhalb von 3 Jahren)
  - getrennt nach Technologie
  - quartalsweise Aktualisierung
- Sammelplattform: **ebUtilities „Verfügbare Netzanschlusskapazitäten“**. Die Seite ist JS-gerendert; Format und Nutzungsbedingungen sind offen.

**Einzelne Netzbetreiber**

| Netzbetreiber | Format | Stand | Status |
|---|---|---|---|
| Netz NÖ | Liste je UW in MVA und „Trafokarte“; mit * markierte UW ohne Kapazität | 03.08.2026 | geprüft |
| Energienetze Steiermark | HTML-Tabelle in MW, „unverbindlich“ | 01.07.2026 | geprüft |
| Salzburg Netz | Übersicht/Bild | Juni 2026 | geprüft (Format teilweise) |
| Linz Netz | HTML-Tabelle, 25 UW | 27.07.2026 | geprüft |
| Netz Oberösterreich | V-NEP 2026 (PDF); eigene Kapazitätsseite nicht gefunden | – | offen |
| Netz Burgenland, Wiener Netze, KNG-Kärnten Netz, TINETZ | – | – | offen |

**Konsequenz:** Keiner der geprüften Netzbetreiber bietet CSV oder API an, und nirgends ist eine Lizenz angegeben. Deshalb gilt:

- Kapazitäten werden im Backoffice **manuell mit Quelle und Stand** gepflegt (`Plattform Netzkapazitaet`).
- Kein Scraping.
- Für einen Datenzugang bei ebUtilities bzw. Oesterreichs Energie anfragen.

## 4. Geländemodell (Neigung/Exposition)

- **DGM Österreich 10 m** (data.gv.at, geoland.at): CC BY 4.0, GeoTIFF, EPSG:31287. Stand 10.06.2024 (Snippet; die data.gv.at-Seite lieferte 404).
- **Alternative BEV „ALS DTM Höhenraster 1 m“:** CC BY 4.0, COG, EPSG:3035 (geprüft). Neuere Stichtage offen.
- **Verarbeitung:** `import dgm` rechnet mit `gdaldem slope/aspect` auf 10 m und bildet je Parzelle den Mittelwert der Neigung und das Kreismittel der Exposition.

## 5. Schutzgebiete

| Datensatz | Lizenz | Format | Status |
|---|---|---|---|
| EEA Natura 2000 (end 2024), [Record](https://sdi.eea.europa.eu/catalogue/srv/api/records/91357f39-7866-41ce-b447-43905c364ec8) | CC BY 4.0, Rechteinhaber DG ENV | GPKG/SHP, EPSG:3035 | geprüft |
| EEA Nationally designated areas (Nachfolger CDDA) v23 | CC BY 4.0 | GPKG | geprüft |
| Umweltbundesamt „Naturschutzgebiete Österreich 2025“ (Nationalparks, Europaschutzgebiete, NSG, LSG …) | CC BY 4.0 | GPKG, jährlich | Snippet (data.gv.at 404) |
| Länderdienste (DORIS, SAGIS, NÖ Atlas, GIS-Stmk) | – | – | offen; durch den UBA-Datensatz abgedeckt |

**Demo:** Schutzgebiete aus OSM (`boundary=protected_area`, ODbL). Sie sind **nicht amtlich und lückenhaft**; OÖ-Europaschutzgebiete fehlen weitgehend. Im Betrieb durch EEA/UBA ersetzen.

## 6. Siedlung und Gebäude (Abstände)

- **BEV DLM Bauwerke:** unentgeltlich, GPKG, EPSG:31255, mit AGWR-Objektnummer (geprüft). Lizenz CC BY 4.0 laut Snippet – vor Einsatz bestätigen.
- **Statistik Austria Rastereinheiten (GWR-Merkmale):** CC BY 4.0 (Snippet).
- **GHSL GHS-BUILT-S:** CC BY 4.0 (Snippet).
- **OSM building:** ODbL.
- **Demo:** OSM-Ortspunkte (`place=*`) mit Näherungsradius (Stadt 700 m, Dorf 250 m, Weiler 60 m).

## 7. Widmungs- und Eignungszonen

| Land | Datensatz | Lizenz / Status |
|---|---|---|
| NÖ | SekROP PV (LGBl. 94/2022, 116 Zonen): OGD „Photovoltaik-Zonen im Grünland gem. § 20 NÖ ROG 2014“, JSON/SHP/GPKG | Lizenz offen (vermutlich CC BY 4.0 wie das NÖ-OGD) |
| Burgenland | „Photovoltaik Eignungszonen Burgenland“, [Bestandsliste](https://www.burgenland.at/service/open-government-data/bestandsliste/detail/photovoltaik-eignungszonen-burgenland/) | CC BY 4.0 (geprüft), SHP (Snippet) |
| Steiermark | SAPRO Solarenergie (36 Vorrangzonen, 1. Novelle seit 13.02.2026) | **kein OGD-Geodatensatz gefunden**, nur Windenergie. Beim Land anfragen. |
| OÖ | „DORIS-Karte Photovoltaik-Freiflächen“ (Ausschlusszone, Prüferfordernis) | nur Viewer, Download/Lizenz offen. Die Scoring-Engine bildet die **energiewirtschaftliche Priorität** (≤ 5 km / ≤ 7,5 km um Umspannwerke) aus dem Kriterienkatalog nach. |
| OÖ | Flächenwidmung Widmungen Flächen (`FLWI_WIDMUNGEN_F.zip`, EPSG 31255) | CC BY 4.0 (geprüft), Vermerk „Datenquelle: Land Oö., doris.at“ |
| Kärnten, Salzburg | – | Zonen als Geodaten offen. Regeln (Ktn. max. 4 ha; Sbg. Kennzeichnung mit Punktesystem) sind in der Scoring-Engine als Text/Regel hinterlegt. |

## 8. Kartenhintergrund basemap.at

- **Lizenz:** CC BY 4.0, auch kommerziell (geprüft).
- **Attribution:** „Grundkarte: basemap.at“ bzw. „Datenquelle: basemap.at“ mit Link.
- **Capabilities:** `https://mapsneu.wien.gv.at/basemapneu/1.0.0/WMTSCapabilities.xml` (geprüft).
- **Kachel-Muster:** `https://mapsneu.wien.gv.at/basemap/{layer}/normal/google3857/{z}/{y}/{x}.png` (Orthofoto `.jpeg`).
- **Layer im Cockpit:** `bmapgrau`, `bmaporthofoto30cm` + `bmapoverlay`.
- **Betrieb:** Aktualisierung etwa alle 2 Monate, Verfügbarkeit laut Anbieter > 99,98 %, **kein SLA**.

## 9. Einstrahlung

- **PVGIS (JRC):**
  - Nutzung frei und ohne Einschränkung (geprüft).
  - API `https://re.jrc.ec.europa.eu/api/v5_3/…`, 30 Aufrufe/s je IP.
  - **Nur serverseitig** abfragen (CORS nicht erlaubt).
  - Die Scoring-Engine nutzt derzeit die PVGIS-Werte je Bundesland aus `src/data/regionen/*.js`.
- **Global Solar Atlas:** CC BY 4.0 mit vorgegebenem Zitiertext (Snippet). Kommerzielle API-Bedingungen offen.

## 10. Grundbuch (Eigentümer) – NICHT frei

- **Zugang:** über JustizOnline oder eine zugelassene **Verrechnungsstelle** (u. a. lexunited, MANZ, Moody's Analytics; ÖGIZIN nur für Notare).
- **Gerichtsgebühren** laut oesterreich.gv.at, jeweils zuzüglich Entgelt der Verrechnungsstelle:

| Abfrage | Gebühr |
|---|---|
| Grundbuchauszug aktuell | 4,89 € |
| Teilauszug | 2,60 € |
| Adressverzeichnis | 1,52 € |
| Umkreisabfrage | 63 € |

  Gilt laut Snippet seit 01.08.2026.
- **Abfrage nur nach Grundstück** (KG + Grundstücksnummer / EZ). Die **Personensuche** ist nach § 5 Abs. 4 GUG nur bei rechtlichem Interesse zulässig; wirtschaftliches Interesse reicht nicht (Snippet OGH 5 Ob 178/22w).
- **Im Dienst:** nur ein Adapter-Gerüst (`geodaten/grundbuch.py`), **kein Scraping**.

**Direktwerbung** (Details in `docs/AKQUISE-GEODATEN.md`):

- Nach DSB GZ DSB-D123.626/0006-DSB/2018 (Sekundärquelle geprüft) kann eine **einmalige Briefzusendung** auf Grundbuchbasis nach Art. 6 Abs. 1 lit. f DSGVO zulässig sein. Voraussetzungen:
  - Art.-14-Information im Brief
  - Widerspruchsmöglichkeit
  - keine wiederholten Zusendungen
- Telefon, E-Mail und SMS brauchen vorher eine Einwilligung (§ 174 TKG 2021).
- Die Robinsonliste nach § 151 GewO bindet nur Adressverlage und Direktmarketingunternehmen.

## 11. Deutschland und Schweiz (Recherche 30.09.2026, Ausbaustufe A1b)

Status wie oben: **geprüft** = Seite selbst gelesen, **Snippet** = nur Suchergebnis/Sekundärquelle.

### ALKIS-Flurstücke (ohne Eigentümer)

15 von 16 Ländern offen, Bayern nicht (geprüft: FOSSGIS 2025; Übersicht [geodienstleistungen.de/alkis](https://geodienstleistungen.de/alkis.html), Stand 27.03.2026, ohne Lizenzen).

| Land | Lizenz | Bezug | Status |
|---|---|---|---|
| BW | dl-de/by-2-0 („Datenquelle: LGL, www.lgl-bw.de“) | [opengeodata.lgl-bw.de](https://opengeodata.lgl-bw.de/) NAS/Shape, WFS | Freigabe geprüft, Lizenz Snippet |
| BY | **kein Open Data** – Vektor 2,90 €/Flurstück (mind. 20 €); Parzellarkarte als Raster ohne Flurnummern CC BY 4.0 | [geodatenonline.bayern.de](https://geodatenonline.bayern.de/geodatenonline/seiten/dfkalkis_info) | geprüft |
| BE | dl-de/zero-2-0 | WFS gdi.berlin.de/services/wfs/alkis_flurstuecke | Snippet |
| BB | dl-de/by-2-0 („GeoBasis-DE/LGB“) | data.geobasis-bb.de, OGC API alkis-vereinfacht | Snippet |
| HB | CC BY 4.0 | geo.bremen.de (seit 09.06.2024) | Snippet |
| HH | dl-de/by-2-0 | Transparenzportal, INSPIRE-WFS | Snippet |
| HE | frei, Lizenzname (zero/by) offen | gds.hessen.de | Freigabe geprüft |
| MV | CC BY 4.0 | LAiV-Downloadportal (landesweit seit 02/2026) | Snippet |
| NI | CC BY 4.0 („© GeoBasis-DE/LGLN <Jahr>“) | ni-lgln-opengeodata.hub.arcgis.com | Snippet |
| NW | dl-de/zero-2-0 | opengeodata.nrw.de …/gru_xml, OGC API | Snippet |
| RP | dl-de/by-2-0 („©GeoBasis-DE / LVermGeoRP“) | geoshop.rlp.de, WFS | Snippet |
| SL | dl-de/by-2-0 | shop.lvgl.saarland.de | Snippet |
| SN | dl-de/by-2-0 | geodaten.sachsen.de (NAS) | Snippet |
| ST | dl-de/by-2-0 („© GeoBasis-DE / LVermGeo ST“) | lvermgeo.sachsen-anhalt.de (NAS) | Snippet |
| SH | CC BY 4.0 | INSPIRE-WFS gdi-sh.de | Snippet |
| TH | dl-de/by-2-0 | geoportal-th.de (Shape/NAS) | Snippet |

### Weitere Quellen Deutschland

| Datensatz | Lizenz | Bezug | Status |
|---|---|---|---|
| Feldblöcke/InVeKoS | je Land: NW, SN dl-de/by-2-0; BB offen (Lizenz offen); **BY Feldstückskarte CC BY-ND 4.0 (keine Bearbeitung!)** | [geodienstleistungen.de/feldbloecke](https://geodienstleistungen.de/feldbloecke.html) | Snippet |
| Benachteiligte Gebiete | BY CC BY 4.0 (Energie-Atlas, Shape); NRW dl-de/by-2-0 (OGC API `inspire-lc-bena`); BW LUBW-Shape („kein amtliches Dokument“, Lizenz offen); bundesweit kein Datensatz | [Energie-Atlas Bayern](https://www.energieatlas.bayern.de/erneuerbare-energien/photovoltaik/freiflaechen/benachteiligte_gebiete) | geprüft (BY, NRW) |
| Moorkulisse | Thünen „Kulisse organischer Böden“ CC BY 4.0, DOI 10.3220/DATA20230510130443-0 | [atlas.thuenen.de](https://atlas.thuenen.de/maps/243/metadata_detail) | geprüft |
| Schutzgebiete | BfN-WFS unter GeoNutzV, Hinweis „Nicht für Planungszwecke geeignet“; Alternative EEA Natura 2000 CC BY 4.0 | [geodienste.bfn.de](https://geodienste.bfn.de/ogc/wfs/schutzgebiet) | geprüft |
| MaStR Gesamtexport | dl-de/by-2-0, XML ~3 GB täglich; genaue Koordinaten erst ab 30 kW; Koordinaten der Netzanschlusspunkte offen – nur als Hinweisquelle | [marktstammdatenregister.de](https://www.marktstammdatenregister.de/MaStR/Datendownload) | geprüft |
| DGM | BKG DGM200 dl-de/by-2-0; DGM25 nur Behörden; Bayern DGM1 CC BY 4.0 | gdz.bkg.bund.de, geodaten.bayern.de | Snippet |
| Grundkarte | **TopPlusOpen** dl-de/by-2-0, „© BKG (Jahr) dl-de/by-2-0“ (in der Karte verwendet); basemap.de CC BY 4.0 | sgx.geodatenzentrum.de/wmts_topplus_open | geprüft |
| Autobahn/Schiene, Umspannwerke Schwaben | OSM ODbL; Demo-Abfrage 30.09.2026 (Overpass-Spiegel, OSM-Stand 2026-06/07) | `demo/overpass/*-{schwaben,unterallgaeu}.overpassql` | – |

**Gesetzestexte (geprüft, gesetze-im-internet.de):** § 37 Abs. 1 Nr. 2 lit. c EEG (500 m längs Autobahnen oder Schienenwegen, vom äußeren Rand der Fahrbahn, keine Gleiszahl), Nr. 3 lit. e (Moor mit Wiedervernässung), lit. h/i (benachteiligte Gebiete), § 37c EEG (Opt-out der Länder; Schwelle 1 % bzw. ab 2031 1,5 % der LF – Wortlaut Abs. 2 nachprüfen), § 35 Abs. 1 Nr. 8 lit. b BauGB (200 m längs Autobahnen bzw. Schienenwegen des übergeordneten Netzes i. S. d. § 2b AEG mit mind. zwei Hauptgleisen), § 35 Abs. 1 Nr. 9 BauGB (besondere Solaranlagen ≤ 25.000 m², Hofbezug), § 43a GBV (Grundbucheinsicht für EE-Projektierer ab 750 kW, seit 01.05.2025).

### Schweiz

| Datensatz | Lizenz / Bedingungen | Bezug | Status |
|---|---|---|---|
| Amtliche Vermessung (Liegenschaften) | je Kanton: frei u. a. AG, AI, AR, BE, BL, BS, FR, GL, GR, SH, SO, SZ, TG, TI, UR, VD, VS, ZG, ZH; Registrierung u. a. NW, OW; kostenpflichtig LU, JU (ab 10 ha), NE (Vertrag) | [geodienste.ch/services/av](https://www.geodienste.ch/services/av) | geprüft, Einordnung nachprüfen |
| swissALTI3D, swissTLM3D | OGD swisstopo, kommerziell erlaubt, „© swisstopo“ | STAC data.geo.admin.ch | geprüft |
| Fruchtfolgeflächen | je Kanton, Modell `Fruchtfolgeflaechen_V1` | models.geo.admin.ch | Snippet |
| Eignungsgebiete Solar | kantonale Richtpläne (Art. 8b RPG, Stromgesetz); Art. 32c RPV | Kantone | Snippet |
| Solarexpress (Art. 71a EnG) | alpine Großanlagen; Verlängerung beschlossen (21.03.2025), Details offen | – | Snippet |
| Grundkarte | swisstopo WMTS (3857), „© swisstopo“ | docs.geo.admin.ch | geprüft |

## Offen zur Nachprüfung

- § 99 ElWG im Volltext
- Nutzungsbedingungen ebUtilities
- Lizenz NÖ-PV-Zonen
- SAPRO-PV-Geodaten Steiermark
- Feldnamen INVEKOS 2026-1
- DKM-Stichtag 01.04.2026
- DLM-Bauwerke-Lizenz
- ALKIS-Lizenzen der Länder mit Status „Snippet“ auf den Landesseiten bestätigen; Bayern INSPIRE-WFS Flurstücke (HVD-Verordnung?)
- Lizenzen Feldblöcke BB/NI, BW-Kulisse benachteiligte Gebiete, Länder mit Verordnung nach § 37c EEG
- MaStR-Koordinaten der Netzanschlusspunkte; TopPlusOpen Pflichtlink „Datenquellen“
- CH: Kategorien je Kanton (geodienste.ch), Art. 24ter RPG, Solarexpress-Verlängerung
- Zweckbindung: Nutzung von Grundbuchdaten aus § 43a GBV für Werbebriefe
- Status § 17c EnWG
