-- Geodaten-Dienst – Erweiterung Deutschland/Schweiz (Ausbaustufe A1b). Idempotent, läuft nach 001_schema.sql.
-- Speicherung weiterhin in EPSG:31287 (Lambert, metrisch). Außerhalb Österreichs wächst die Längenverzerrung langsam
-- (Größenordnung < 1 % in Nord-/Westdeutschland und der Westschweiz) – für Korridore (200/500 m), Abstände und ha-Werte der
-- Vorauswahl vernachlässigbar. Für ein DACH-weites Endsystem mittelfristig EPSG:3035 (ETRS89-LAEA).

SET search_path = geo, public;

-- Autobahnen und Schienenwege (OSM) für EEG-Randstreifen (§ 37 Abs. 1 Nr. 2 lit. c, 500 m) und BauGB-Privilegierung
-- (§ 35 Abs. 1 Nr. 8 lit. b, 200 m an Autobahnen bzw. Schienenwegen des übergeordneten Netzes mit ≥ 2 Hauptgleisen)
CREATE TABLE IF NOT EXISTS verkehr_linie (
  id            text PRIMARY KEY,
  art           text NOT NULL CHECK (art IN ('autobahn', 'schiene')),
  usage         text,                            -- OSM usage=main|branch (Schiene)
  gleise        smallint NOT NULL DEFAULT 1,
  gleise_quelle text NOT NULL DEFAULT 'osm',     -- osm (tracks-Tag) | schaetzung (parallele Gleise) | isr (Infrastrukturregister)
  name          text,
  geom          geometry(MultiLineString, 31287) NOT NULL,
  quelle_id     text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS verkehr_linie_geom ON verkehr_linie USING gist (geom);

-- Flächenkulissen: DE benachteiligte Gebiete (Länder), Moorböden (Thünen), Konversion; CH Eignungsgebiete (Richtplan),
-- Fruchtfolgeflächen (Sachplan FFF), vorbelastete Standorte
CREATE TABLE IF NOT EXISTS kulisse (
  id         text PRIMARY KEY,
  art        text NOT NULL CHECK (art IN ('benachteiligt', 'moor', 'konversion', 'eignung', 'fff', 'vorbelastet')),
  land       char(2) NOT NULL,
  name       text,
  geom       geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id  text REFERENCES quelle(id),
  stand      date
);
CREATE INDEX IF NOT EXISTS kulisse_geom ON kulisse USING gist (geom);
CREATE INDEX IF NOT EXISTS kulisse_art ON kulisse (land, art);

ALTER TABLE parzelle ADD COLUMN IF NOT EXISTS kennzeichen text;   -- ALKIS-Flurstückskennzeichen bzw. CH-EGRID
ALTER TABLE kandidat ADD COLUMN IF NOT EXISTS kulisse jsonb;      -- Anteile Randstreifen/Privilegierung/benachteiligt/Moor (DE) bzw. Eignung/FFF (CH)
