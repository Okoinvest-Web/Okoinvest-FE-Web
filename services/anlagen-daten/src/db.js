// TimescaleDB-Zugriff (Paket `pg`). Alle Abfragen parametrisiert. Antworten im Format der Website
// (src/lib/plattform/messdaten/dienst.js ↔ simulator.js): camelCase, Energien in kWh, Leistungen in kW.

import pg from "pg";
import { readFile } from "node:fs/promises";

const TZ = "Europe/Vienna";
const SICHT = { "15min": ["messwerte_15min", 0.25], "1h": ["messwerte_1h", 1], "1d": ["messwerte_1d", 24] };
const zahl = (v, s = 2) => (v === null || v === undefined ? null : Math.round(Number(v) * 10 ** s) / 10 ** s);

export class Datenbank {
  constructor({ url, ca, maxVerbindungen }) {
    this.pool = new pg.Pool({
      connectionString: url,
      max: maxVerbindungen,
      // TLS mit Prüfung, falls eine CA angegeben ist; rejectUnauthorized wird nie abgeschaltet
      ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
      statement_timeout: 15000,
    });
  }

  async schemaAnlegen() {
    const sql = await readFile(new URL("../sql/001_schema.sql", import.meta.url), "utf8");
    await this.pool.query(sql);
  }

  async ende() {
    await this.pool.end();
  }

  // ---------------------------------------------------------------- Schreiben

  async messwertSpeichern({ anlageId, geraetId, wert, plausibel = true, flags = [] }) {
    await this.pool.query(
      `INSERT INTO messwerte (ts, anlage_id, geraet_id, pv_kw, verbrauch_kw, speicher_kw, speicher_soc, erzeugung_kwh, netzbezug_kwh, einspeisung_kwh, wr_status, fehlercode, plausibel, flags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`,
      [wert.ts, anlageId, geraetId, wert.pvKw ?? null, wert.verbrauchKw ?? null, wert.speicherKw ?? null, wert.speicherSocPct ?? null, wert.erzeugungKwh ?? null, wert.netzbezugKwh ?? null, wert.einspeisungKwh ?? null, wert.wechselrichterStatus ?? null, wert.fehlercode ?? null, plausibel, flags.length ? flags : null]
    );
    // letzter Stand: nur vorwärts (Nachlieferungen überschreiben ihn nicht); Zählerstände des Vorstands bleiben erhalten
    await this.pool.query(
      `INSERT INTO geraet_stand (anlage_id, geraet_id, ts, letzte_nachricht, status, wert) VALUES ($1,$2,$3,now(),'online',$4)
       ON CONFLICT (anlage_id, geraet_id) DO UPDATE SET
         ts = GREATEST(geraet_stand.ts, EXCLUDED.ts), letzte_nachricht = now(), status = 'online',
         wert = CASE WHEN EXCLUDED.ts >= geraet_stand.ts THEN geraet_stand.wert || EXCLUDED.wert ELSE geraet_stand.wert END`,
      [anlageId, geraetId, wert.ts, JSON.stringify(wert)]
    );
  }

  async lebenszeichen({ anlageId, geraetId, status = null }) {
    await this.pool.query(
      `UPDATE geraet_stand SET letzte_nachricht = CASE WHEN $3::text = 'offline' THEN letzte_nachricht ELSE now() END, status = COALESCE($3, status)
       WHERE anlage_id = $1 AND geraet_id = $2`,
      [anlageId, geraetId, status]
    );
  }

  async stand(anlageId, geraetId) {
    const r = await this.pool.query(`SELECT ts, wert FROM geraet_stand WHERE anlage_id = $1 AND geraet_id = $2`, [anlageId, geraetId]);
    return r.rows[0] ? { ts: r.rows[0].ts.toISOString(), ...r.rows[0].wert } : null;
  }

  /** Letzte Nachricht je Anlage (Offline-Regel) */
  async letzteJeAnlage() {
    const r = await this.pool.query(`SELECT anlage_id, max(letzte_nachricht) AS ts, bool_and(status = 'offline') AS offline FROM geraet_stand GROUP BY anlage_id`);
    return new Map(r.rows.map((x) => [x.anlage_id, { ts: x.ts.toISOString(), statusOffline: !!x.offline }]));
  }

  // ---------------------------------------------------------------- Lesen

  /** Aktueller Wert einer Anlage: Summe über alle Geräte (Zählerstände addiert, SOC gemittelt) */
  async aktuell(anlageId) {
    const r = await this.pool.query(`SELECT geraet_id, ts, letzte_nachricht, wert FROM geraet_stand WHERE anlage_id = $1`, [anlageId]);
    if (!r.rows.length) return null;
    const s = { pvKw: 0, verbrauchKw: 0, speicherKw: null, speicherSocPct: null, zaehler: { erzeugungKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0 } };
    let ts = 0;
    const soc = [];
    let status = null;
    let fehlercode = null;
    const rang = { stoerung: 3, warnung: 2, ok: 1, aus: 0 };
    for (const { ts: t, wert: w } of r.rows) {
      ts = Math.max(ts, t.getTime());
      s.pvKw += w.pvKw || 0;
      s.verbrauchKw += w.verbrauchKw || 0;
      if (w.speicherKw !== undefined) s.speicherKw = (s.speicherKw || 0) + w.speicherKw;
      if (w.speicherSocPct !== undefined) soc.push(w.speicherSocPct);
      for (const k of Object.keys(s.zaehler)) s.zaehler[k] += w[k] || 0;
      if (w.wechselrichterStatus && (rang[w.wechselrichterStatus] ?? 0) >= (rang[status] ?? -1)) status = w.wechselrichterStatus;
      fehlercode ||= w.fehlercode || null;
    }
    if (soc.length) s.speicherSocPct = soc.reduce((a, b) => a + b, 0) / soc.length;
    const heute = await this.summen(anlageId, tagesbeginn(), new Date());
    return {
      ts: new Date(ts).toISOString(),
      pvKw: zahl(s.pvKw), verbrauchKw: zahl(s.verbrauchKw), speicherKw: zahl(s.speicherKw), speicherSocPct: zahl(s.speicherSocPct, 1),
      netzKw: zahl(s.verbrauchKw + (s.speicherKw || 0) - s.pvKw),
      wechselrichterStatus: status, fehlercode,
      zaehler: { erzeugungKwh: zahl(s.zaehler.erzeugungKwh, 1), netzbezugKwh: zahl(s.zaehler.netzbezugKwh, 1), einspeisungKwh: zahl(s.zaehler.einspeisungKwh, 1) },
      heute, quelle: "dienst",
    };
  }

  /**
   * Zeitreihe. aufloesung 15min | 1h | 1d | 1mon. Energie je Intervall aus Differenzen der Zählerstände
   * (je Gerät, dann Summe über Geräte). Verbrauch/Laden/Entladen = mittlere Leistung × Dauer.
   */
  async reihe(anlageId, von, bis, aufloesung) {
    const monat = aufloesung === "1mon";
    const [sicht, stunden] = SICHT[monat ? "1d" : aufloesung] || SICHT["1h"];
    const r = await this.pool.query(
      `WITH g AS (
         SELECT bucket, geraet_id, pv_kw, verbrauch_kw, speicher_kw, speicher_soc, laden_kw, entladen_kw, fehlercode,
                erzeugung_ende - lag(erzeugung_ende) OVER w AS erz, netzbezug_ende - lag(netzbezug_ende) OVER w AS bez,
                einspeisung_ende - lag(einspeisung_ende) OVER w AS ein
         FROM ${sicht}
         WHERE anlage_id = $1 AND bucket >= $2::timestamptz - INTERVAL '2 days' AND bucket < $3
         WINDOW w AS (PARTITION BY geraet_id ORDER BY bucket)
       ), j AS (
         SELECT bucket, sum(pv_kw) AS pv_kw, sum(verbrauch_kw) AS verbrauch_kw, sum(speicher_kw) AS speicher_kw, avg(speicher_soc) AS speicher_soc,
                sum(laden_kw) AS laden_kw, sum(entladen_kw) AS entladen_kw, max(fehlercode) AS fehlercode,
                sum(greatest(erz, 0)) AS erz, sum(greatest(bez, 0)) AS bez, sum(greatest(ein, 0)) AS ein
         FROM g WHERE bucket >= $2 GROUP BY bucket
       )
       SELECT ${monat ? `time_bucket(INTERVAL '1 month', bucket, '${TZ}')` : "bucket"} AS ts,
              avg(pv_kw) AS pv_kw, avg(verbrauch_kw) AS verbrauch_kw, avg(speicher_kw) AS speicher_kw, avg(speicher_soc) AS speicher_soc,
              sum(erz) AS erz, sum(bez) AS bez, sum(ein) AS ein, sum(verbrauch_kw) * $4 AS verb, sum(laden_kw) * $4 AS laden, sum(entladen_kw) * $4 AS entladen,
              max(fehlercode) AS fehlercode
       FROM j GROUP BY 1 ORDER BY 1 LIMIT 3000`,
      [anlageId, von, bis, stunden]
    );
    const punkte = r.rows.map((x) => {
      const erz = Number(x.erz) || 0;
      const ein = Number(x.ein) || 0;
      const laden = Number(x.laden) || 0;
      return {
        ts: x.ts.toISOString(),
        pvKw: zahl(x.pv_kw), verbrauchKw: zahl(x.verbrauch_kw), speicherKw: zahl(x.speicher_kw), speicherSocPct: zahl(x.speicher_soc, 1),
        erzeugungKwh: zahl(erz, 1), netzbezugKwh: zahl(x.bez, 1), einspeisungKwh: zahl(ein, 1), verbrauchKwh: zahl(x.verb, 1),
        ladenKwh: zahl(laden, 1), entladenKwh: zahl(x.entladen, 1), eigenverbrauchKwh: zahl(Math.max(0, erz - ein - laden) + (erz > 0 ? Number(x.entladen) || 0 : 0), 1),
        netzbezugKw: stunden <= 1 ? zahl((Number(x.bez) || 0) / stunden) : undefined, einspeisungKw: stunden <= 1 ? zahl(ein / stunden) : undefined,
        fehlercode: x.fehlercode || null,
      };
    });
    return { aufloesung, punkte };
  }

  async summen(anlageId, von, bis) {
    const tage = (new Date(bis) - new Date(von)) / 86400e3;
    const { punkte } = await this.reihe(anlageId, von, bis, tage > 3 ? "1d" : "15min");
    const s = { erzeugungKwh: 0, verbrauchKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0, ladenKwh: 0, entladenKwh: 0, eigenverbrauchKwh: 0 };
    for (const p of punkte) for (const k of Object.keys(s)) s[k] += Number(p[k]) || 0;
    // Tageswerte enthalten den laufenden Tag nur bis zur letzten Aggregation – Rest des heutigen Tages aus 15-min-Werten
    if (tage > 3) {
      const heute = tagesbeginn();
      if (new Date(bis) > heute) {
        const h = await this.reihe(anlageId, heute, bis, "15min");
        const d = punkte.find((p) => new Date(p.ts) >= heute);
        if (d) for (const k of Object.keys(s)) s[k] -= Number(d[k]) || 0;
        for (const p of h.punkte) for (const k of Object.keys(s)) s[k] += Number(p[k]) || 0;
      }
    }
    return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, zahl(v, 1)]));
  }

  /** Monatsanfangs-/Endstände je Monat (Summe der Geräte) */
  async zaehlerMonat(anlageId, monate = 13) {
    const r = await this.pool.query(
      `WITH d AS (
         SELECT time_bucket(INTERVAL '1 month', bucket, '${TZ}') AS monat, geraet_id,
                last(erzeugung_ende, bucket) AS erz, last(netzbezug_ende, bucket) AS bez, last(einspeisung_ende, bucket) AS ein
         FROM messwerte_1d WHERE anlage_id = $1 AND bucket >= date_trunc('month', now() AT TIME ZONE '${TZ}') AT TIME ZONE '${TZ}' - make_interval(months => $2::int)
         GROUP BY 1, 2
       )
       SELECT monat, sum(erz) AS erz, sum(bez) AS bez, sum(ein) AS ein FROM d GROUP BY monat ORDER BY monat`,
      [anlageId, monate]
    );
    const zeilen = [];
    const aktuell = monatKennung(new Date());
    for (let i = 1; i < r.rows.length; i++) {
      const a = r.rows[i - 1];
      const e = r.rows[i];
      zeilen.push({
        monat: monatKennung(e.monat),
        vollstaendig: monatKennung(e.monat) !== aktuell,
        beginn: { erzeugungKwh: zahl(a.erz, 1), netzbezugKwh: zahl(a.bez, 1), einspeisungKwh: zahl(a.ein, 1) },
        ende: { erzeugungKwh: zahl(e.erz, 1), netzbezugKwh: zahl(e.bez, 1), einspeisungKwh: zahl(e.ein, 1) },
        erzeugungKwh: zahl(e.erz - a.erz, 1), netzbezugKwh: zahl(e.bez - a.bez, 1), einspeisungKwh: zahl(e.ein - a.ein, 1),
      });
    }
    return zeilen.slice(-monate);
  }

  /** Aktuelle PV-Leistung je Anlage (Minderleistungsregel) */
  async aktuellePv() {
    const r = await this.pool.query(`SELECT anlage_id, max(ts) AS ts, sum((wert->>'pvKw')::float) AS pv FROM geraet_stand GROUP BY anlage_id`);
    return r.rows.map((x) => ({ anlageId: x.anlage_id, ts: x.ts.toISOString(), pvKw: Number(x.pv) }));
  }
}

function monatKennung(d) {
  const s = new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });
  return s.slice(0, 7);
}

/** Beginn des heutigen Tages in Ortszeit als Date */
export function tagesbeginn(jetzt = new Date()) {
  const tag = jetzt.toLocaleDateString("sv-SE", { timeZone: TZ });
  const mitternachtUtc = new Date(`${tag}T00:00:00Z`);
  const versatz = new Date(mitternachtUtc.toLocaleString("en-US", { timeZone: TZ })) - new Date(mitternachtUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(mitternachtUtc.getTime() - versatz);
}

export function monatsbeginn(jetzt = new Date()) {
  const t = tagesbeginn(jetzt);
  const tag = Number(jetzt.toLocaleDateString("sv-SE", { timeZone: TZ }).slice(8, 10));
  return tagesbeginn(new Date(t.getTime() - (tag - 1) * 86400e3 + 12 * 3600e3));
}

export function jahresbeginn(jetzt = new Date()) {
  const jahr = jetzt.toLocaleDateString("sv-SE", { timeZone: TZ }).slice(0, 4);
  return tagesbeginn(new Date(`${jahr}-01-01T12:00:00Z`));
}
