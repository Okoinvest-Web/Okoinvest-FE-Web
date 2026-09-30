-- Geodaten-Dienst Flächenakquise – Datenmodell (PostgreSQL 16 + PostGIS 3.4)
-- Idempotent: wird bei jedem Start des Dienstes ausgeführt (CREATE … IF NOT EXISTS).
--
-- Speicherung in EPSG:31287 (MGI / Austria Lambert, metrisch, ganz Österreich) – Flächen, Abstände und Neigungen
-- werden damit ohne Umrechnung korrekt. Ausgabe an die API in EPSG:4326 (GeoJSON) bzw. 3857 (Vector Tiles).
-- Für DE/CH später eigene Schemata oder ETRS89-LAEA (EPSG:3035) als gemeinsames metrisches System.
--
-- Jede Tabelle trägt `quelle_id` → Tabelle `quelle` (Lizenz, Attribution, Stand, Prüfsumme des Imports).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS geo;
SET search_path = geo, public;

-- ---------------------------------------------------------------- Quellen & Importläufe
CREATE TABLE IF NOT EXISTS quelle (
  id            text PRIMARY KEY,               -- z. B. 'bev_dkm', 'ama_invekos_schlaege', 'osm_netz'
  titel         text NOT NULL,
  herausgeber   text NOT NULL,
  lizenz        text NOT NULL,                  -- 'CC-BY-4.0', 'ODbL-1.0', 'DL-DE/BY-2.0', 'proprietär'
  attribution   text NOT NULL,                  -- Pflichtvermerk in Karte und Export
  url           text,
  stand         date,                           -- Stichtag der Daten
  importiert_am timestamptz,
  pruefsumme    text,                           -- SHA-256 der Eingangsdatei(en)
  anzahl        integer,
  hinweis       text
);

CREATE TABLE IF NOT EXISTS importlauf (
  id          bigserial PRIMARY KEY,
  quelle_id   text NOT NULL REFERENCES quelle(id),
  gestartet   timestamptz NOT NULL DEFAULT now(),
  beendet     timestamptz,
  status      text NOT NULL DEFAULT 'laeuft' CHECK (status IN ('laeuft', 'ok', 'fehler', 'unveraendert')),
  anzahl      integer,
  pruefsumme  text,
  meldung     text
);

-- ---------------------------------------------------------------- Verwaltungsgrenzen (BEV VGD)
CREATE TABLE IF NOT EXISTS verwaltung (
  id          text PRIMARY KEY,                 -- 'gem:40404', 'bez:404', 'kg:40001', 'bl:4'
  ebene       text NOT NULL CHECK (ebene IN ('land', 'bundesland', 'bezirk', 'gemeinde', 'kg')),
  name        text NOT NULL,
  kennziffer  text,                             -- GKZ, KG-Nummer …
  bundesland  text,
  land        char(2) NOT NULL DEFAULT 'AT',
  geom        geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id   text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS verwaltung_geom ON verwaltung USING gist (geom);
CREATE INDEX IF NOT EXISTS verwaltung_name ON verwaltung USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------- Parzellen (BEV DKM, Grundstücke)
-- KEINE Eigentümerdaten – die DKM enthält sie nicht; Eigentümer nur über die Grundbuchabfrage (Adapter, protokolliert).
CREATE TABLE IF NOT EXISTS parzelle (
  id           text PRIMARY KEY,                -- '<kgNr>-<gstNr>' bzw. 'DEMO-P-001'
  kg_nr        text NOT NULL,
  kg_name      text,
  gst_nr       text NOT NULL,
  gemeinde     text,
  bezirk       text,
  bundesland   text,
  land         char(2) NOT NULL DEFAULT 'AT',
  nutzung_dkm  text,                            -- Benützungsart/Nutzung laut Kataster
  flaeche_m2   double precision NOT NULL,       -- berechnet (ST_Area in 31287); Katasterfläche separat
  flaeche_kat  double precision,                -- Fläche laut Grundstücksverzeichnis
  -- abgeleitete Merkmale (Import-Schritte „ableiten“)
  nutzung      text,                            -- acker | gruenland | wald | gewaesser | bau | sonstige (aus INVEKOS/DKM)
  kultur       text,                            -- Schlagnutzung laut INVEKOS
  neigung_grad real,                            -- Mittel aus DGM 10 m
  exposition   text,                            -- N NO O SO S SW W NW eben
  demo         boolean NOT NULL DEFAULT false,
  geom         geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id    text REFERENCES quelle(id),
  stand        date
);
CREATE INDEX IF NOT EXISTS parzelle_geom ON parzelle USING gist (geom);
CREATE INDEX IF NOT EXISTS parzelle_kg ON parzelle (kg_nr, gst_nr);
CREATE INDEX IF NOT EXISTS parzelle_gemeinde ON parzelle (gemeinde);

-- ---------------------------------------------------------------- INVEKOS-Schläge (AMA)
CREATE TABLE IF NOT EXISTS schlag (
  id          text PRIMARY KEY,
  jahr        text NOT NULL,                    -- '2025-1'
  nutzung     text NOT NULL,                    -- Schlagnutzungsart (Originaltext)
  nutzung_gruppe text NOT NULL,                 -- acker | gruenland | dauerkultur | sonstige
  bio         boolean,
  flaeche_m2  double precision,
  geom        geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id   text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS schlag_geom ON schlag USING gist (geom);

-- ---------------------------------------------------------------- Netzknoten (OSM, APG, Netzbetreiber)
CREATE TABLE IF NOT EXISTS netzknoten (
  id           text PRIMARY KEY,                -- 'osm-n123', 'apg-…', 'vnb-netzooe-…'
  name         text,
  art          text NOT NULL CHECK (art IN ('uew', 'uw110', 'ms', 'trafo')),
  spannung_kv  integer[],
  betreiber    text,
  geom         geometry(Point, 31287) NOT NULL,
  quelle_id    text REFERENCES quelle(id),
  osm_id       text
);
CREATE INDEX IF NOT EXISTS netzknoten_geom ON netzknoten USING gist (geom);

-- Kapazitätsangaben (Netzbetreiber-Veröffentlichung oder Auskunft, gepflegt im Backoffice) – eigene Tabelle,
-- damit OSM-abgeleitete Daten (ODbL, Share-Alike) und eigene Anreicherungen getrennt bleiben.
CREATE TABLE IF NOT EXISTS netzkapazitaet (
  knoten_id    text PRIMARY KEY REFERENCES netzknoten(id) ON DELETE CASCADE,
  kapazitaet   text NOT NULL CHECK (kapazitaet IN ('frei', 'knapp', 'unbekannt')),
  frei_mw      real,
  quelle       text NOT NULL,                   -- z. B. 'Netz NÖ Liste 03.08.2026', 'Auskunft Netz OÖ (E-Mail)'
  stand        date NOT NULL,
  gepflegt_von text,
  gepflegt_am  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Querungen (für Trassenschätzung)
CREATE TABLE IF NOT EXISTS querung_linie (
  id         text PRIMARY KEY,
  art        text NOT NULL CHECK (art IN ('autobahn', 'strasse', 'bahn', 'fluss')),
  geom       geometry(MultiLineString, 31287) NOT NULL,
  quelle_id  text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS querung_geom ON querung_linie USING gist (geom);

-- ---------------------------------------------------------------- Schutzgebiete
CREATE TABLE IF NOT EXISTS schutzgebiet (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  art        text NOT NULL CHECK (art IN ('nationalpark', 'natura2000', 'naturschutz', 'wasserschutz', 'landschaftsschutz', 'sonstig')),
  kennung    text,                              -- Natura-2000-Code (AT31…), CDDA-ID …
  geom       geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id  text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS schutzgebiet_geom ON schutzgebiet USING gist (geom);

-- ---------------------------------------------------------------- Widmungs-/Eignungszonen der Länder
CREATE TABLE IF NOT EXISTS widmungszone (
  id          text PRIMARY KEY,
  bundesland  text NOT NULL,
  art         text NOT NULL,                    -- 'noe_pv_zone', 'bgld_eignungszone', 'stmk_sapro_vorrang', 'stmk_sapro_ausschluss', 'ooe_ausschluss', 'widmung_pv'
  name        text,
  rechtsgrundlage text,
  geom        geometry(MultiPolygon, 31287) NOT NULL,
  quelle_id   text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS widmungszone_geom ON widmungszone USING gist (geom);

-- ---------------------------------------------------------------- Siedlung (Gebäude, Siedlungsflächen)
CREATE TABLE IF NOT EXISTS siedlung (
  id         text PRIMARY KEY,
  art        text NOT NULL CHECK (art IN ('gebaeude', 'wohngebiet', 'ortspunkt')),
  name       text,
  geom       geometry(Geometry, 31287) NOT NULL,
  quelle_id  text REFERENCES quelle(id)
);
CREATE INDEX IF NOT EXISTS siedlung_geom ON siedlung USING gist (geom);

-- ---------------------------------------------------------------- Geländemodell: Neigung/Exposition als Raster
-- Das DGM wird mit gdaldem (slope/aspect) vorverarbeitet; die Mittelwerte je Parzelle schreibt import_dgm.py in
-- parzelle.neigung_grad / parzelle.exposition. Rasterdateien bleiben im Volume /daten/dgm (kein postgis_raster nötig).

-- ---------------------------------------------------------------- Kandidaten (Verbünde) und Bewertung
CREATE TABLE IF NOT EXISTS kandidat (
  id              text PRIMARY KEY,             -- 'K-<kleinste Parzellen-ID>'
  parzellen       text[] NOT NULL,
  flaeche_ha      double precision NOT NULL,
  kompaktheit     real,
  neigung_grad    real,
  exposition      text,
  nutzung         jsonb,                        -- { acker, gruenland, sonstige } in ha
  bundesland      text,
  bezirk          text,
  gemeinde        text,
  land            char(2) NOT NULL DEFAULT 'AT',
  siedlung        jsonb,                        -- { name, typ, abstandM }
  schutz          jsonb,                        -- [{ id, name, art, anteil, abstandM }]
  netz            jsonb,                        -- { knoten, luftlinieM, trasseM, querungen, ebene, kosten }
  umspannwerk     jsonb,
  widmung         jsonb,
  score           smallint NOT NULL,
  ampel           text NOT NULL,
  prioritaet      char(1) NOT NULL,
  kriterien       jsonb NOT NULL,
  ko              jsonb NOT NULL,
  kennzahlen      jsonb NOT NULL,
  scoring_version text NOT NULL,
  berechnet_am    timestamptz NOT NULL DEFAULT now(),
  demo            boolean NOT NULL DEFAULT false,
  geom            geometry(MultiPolygon, 31287) NOT NULL,
  schwerpunkt     geometry(Point, 31287) NOT NULL
);
CREATE INDEX IF NOT EXISTS kandidat_geom ON kandidat USING gist (geom);
CREATE INDEX IF NOT EXISTS kandidat_score ON kandidat (score DESC);
CREATE INDEX IF NOT EXISTS kandidat_gebiet ON kandidat (bundesland, bezirk, gemeinde);

-- Zugriffsprotokoll der API (ohne Geometrien) – Nachvollziehbarkeit, wer welche Flächen exportiert hat
CREATE TABLE IF NOT EXISTS zugriff (
  id        bigserial PRIMARY KEY,
  am        timestamptz NOT NULL DEFAULT now(),
  pfad      text NOT NULL,
  nutzer    text,                               -- vom Portal durchgereichte Konto-ID (X-Plattform-Nutzer)
  anzahl    integer
);
