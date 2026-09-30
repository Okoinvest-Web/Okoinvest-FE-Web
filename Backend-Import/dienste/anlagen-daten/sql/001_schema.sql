-- Anlagen & Monitoring – TimescaleDB-Schema (idempotent; wird vom Dienst beim Start ausgeführt bzw. manuell mit psql)
-- Zeitreihen gehören NICHT nach Frappe/MariaDB. Frappe hält Stammdaten, Störungsfälle und Abrechnungs-Monatswerte.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ------------------------------------------------------------------ Rohwerte (je Gerät und Telegramm)
CREATE TABLE IF NOT EXISTS messwerte (
  ts               timestamptz      NOT NULL,
  anlage_id        text             NOT NULL,
  geraet_id        text             NOT NULL,
  pv_kw            double precision,
  verbrauch_kw     double precision,
  speicher_kw      double precision,          -- + laden / − entladen
  speicher_soc     double precision,          -- %
  erzeugung_kwh    double precision,          -- Zählerstand (monoton)
  netzbezug_kwh    double precision,          -- Zählerstand (monoton)
  einspeisung_kwh  double precision,          -- Zählerstand (monoton)
  wr_status        text,
  fehlercode       text,
  plausibel        boolean          NOT NULL DEFAULT true,
  flags            text[],
  empfangen        timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY (anlage_id, geraet_id, ts)
);
SELECT create_hypertable('messwerte', 'ts', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS messwerte_anlage_ts ON messwerte (anlage_id, ts DESC);

-- Kompression nach 7 Tagen (Segment je Anlage/Gerät)
ALTER TABLE messwerte SET (timescaledb.compress, timescaledb.compress_segmentby = 'anlage_id, geraet_id', timescaledb.compress_orderby = 'ts DESC');
SELECT add_compression_policy('messwerte', INTERVAL '7 days', if_not_exists => TRUE);

-- ------------------------------------------------------------------ Letzter Stand je Gerät (für Live, Offline-Regel, Plausibilisierung)
CREATE TABLE IF NOT EXISTS geraet_stand (
  anlage_id        text        NOT NULL,
  geraet_id        text        NOT NULL,
  ts               timestamptz NOT NULL,
  letzte_nachricht timestamptz NOT NULL,
  status           text,                     -- online | offline (Last Will)
  wert             jsonb       NOT NULL,     -- letzter vollständiger Messwert (camelCase)
  PRIMARY KEY (anlage_id, geraet_id)
);

-- ------------------------------------------------------------------ Continuous Aggregates (15 min / 1 h / 1 Tag)
-- Leistung als Mittelwert, Zählerstände als Endwert je Intervall (last). Energie je Intervall = Differenz der Endwerte
-- zum Vorintervall (Fensterfunktion in der Abfrage) – so gehen Energien an Intervallgrenzen nicht verloren.
-- Verbrauch hat keinen Zähler: Energie = mittlere Leistung × Dauer.

CREATE MATERIALIZED VIEW IF NOT EXISTS messwerte_15min WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '15 minutes', ts) AS bucket, anlage_id, geraet_id,
       avg(pv_kw) AS pv_kw, avg(verbrauch_kw) AS verbrauch_kw, avg(speicher_kw) AS speicher_kw, last(speicher_soc, ts) AS speicher_soc,
       avg(greatest(speicher_kw, 0)) AS laden_kw, avg(greatest(-speicher_kw, 0)) AS entladen_kw,
       last(erzeugung_kwh, ts) FILTER (WHERE erzeugung_kwh IS NOT NULL) AS erzeugung_ende,
       last(netzbezug_kwh, ts) FILTER (WHERE netzbezug_kwh IS NOT NULL) AS netzbezug_ende,
       last(einspeisung_kwh, ts) FILTER (WHERE einspeisung_kwh IS NOT NULL) AS einspeisung_ende,
       count(*) AS anzahl, max(fehlercode) AS fehlercode
FROM messwerte WHERE plausibel
GROUP BY bucket, anlage_id, geraet_id
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS messwerte_1h WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 hour', bucket) AS bucket, anlage_id, geraet_id,
       avg(pv_kw) AS pv_kw, avg(verbrauch_kw) AS verbrauch_kw, avg(speicher_kw) AS speicher_kw, last(speicher_soc, bucket) AS speicher_soc,
       avg(laden_kw) AS laden_kw, avg(entladen_kw) AS entladen_kw,
       last(erzeugung_ende, bucket) FILTER (WHERE erzeugung_ende IS NOT NULL) AS erzeugung_ende,
       last(netzbezug_ende, bucket) FILTER (WHERE netzbezug_ende IS NOT NULL) AS netzbezug_ende,
       last(einspeisung_ende, bucket) FILTER (WHERE einspeisung_ende IS NOT NULL) AS einspeisung_ende,
       sum(anzahl) AS anzahl, max(fehlercode) AS fehlercode
FROM messwerte_15min
GROUP BY 1, anlage_id, geraet_id
WITH NO DATA;

-- Tagesgrenze in Ortszeit (Europe/Vienna = Europe/Berlin = Europe/Zurich)
CREATE MATERIALIZED VIEW IF NOT EXISTS messwerte_1d WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', bucket, 'Europe/Vienna') AS bucket, anlage_id, geraet_id,
       avg(pv_kw) AS pv_kw, avg(verbrauch_kw) AS verbrauch_kw, avg(speicher_kw) AS speicher_kw, last(speicher_soc, bucket) AS speicher_soc,
       avg(laden_kw) AS laden_kw, avg(entladen_kw) AS entladen_kw,
       last(erzeugung_ende, bucket) FILTER (WHERE erzeugung_ende IS NOT NULL) AS erzeugung_ende,
       last(netzbezug_ende, bucket) FILTER (WHERE netzbezug_ende IS NOT NULL) AS netzbezug_ende,
       last(einspeisung_ende, bucket) FILTER (WHERE einspeisung_ende IS NOT NULL) AS einspeisung_ende,
       sum(anzahl) AS anzahl, max(fehlercode) AS fehlercode
FROM messwerte_1h
GROUP BY 1, anlage_id, geraet_id
WITH NO DATA;

-- Aktualisierung (Nachlieferungen bis 7 Tage werden über start_offset erfasst)
SELECT add_continuous_aggregate_policy('messwerte_15min', start_offset => INTERVAL '8 days', end_offset => INTERVAL '1 minute', schedule_interval => INTERVAL '1 minute', if_not_exists => TRUE);
SELECT add_continuous_aggregate_policy('messwerte_1h', start_offset => INTERVAL '8 days', end_offset => INTERVAL '5 minutes', schedule_interval => INTERVAL '5 minutes', if_not_exists => TRUE);
SELECT add_continuous_aggregate_policy('messwerte_1d', start_offset => INTERVAL '9 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);

-- Echtzeit-Aggregation an (jüngste Werte ohne Warten auf die Policy)
ALTER MATERIALIZED VIEW messwerte_15min SET (timescaledb.materialized_only = false);
ALTER MATERIALIZED VIEW messwerte_1h SET (timescaledb.materialized_only = false);
ALTER MATERIALIZED VIEW messwerte_1d SET (timescaledb.materialized_only = false);

-- ------------------------------------------------------------------ Aufbewahrung (Retention)
-- Rohwerte 90 Tage · 15 min 2 Jahre · 1 h 5 Jahre · Tageswerte dauerhaft (Vertragslaufzeiten 20+ Jahre)
SELECT add_retention_policy('messwerte', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('messwerte_15min', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('messwerte_1h', INTERVAL '5 years', if_not_exists => TRUE);

-- ------------------------------------------------------------------ Rechte: eigener DB-Benutzer des Dienstes (nur diese Tabellen)
-- Beispiel (Passwort über Secret-Management setzen, nicht hier):
--   CREATE ROLE anlagen_dienst LOGIN;  GRANT SELECT, INSERT, UPDATE ON messwerte, geraet_stand TO anlagen_dienst;
--   GRANT SELECT ON messwerte_15min, messwerte_1h, messwerte_1d TO anlagen_dienst;
