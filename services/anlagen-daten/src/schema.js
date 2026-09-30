// MQTT-Vertrag (gleich wie src/lib/plattform/anlagen.js der Website, Doku: docs/ANLAGEN-IOT.md).
//
// Topic:   oekoinvest/v1/<anlagenId>/<geraetId>/<kanal>   kanal ∈ messwerte | heartbeat | status
// Payload: JSON, UTF-8, max. 8 KB. messwerte:
//   { "v": 1, "ts": ISO-8601 (UTC), "pv_leistung_kw", "erzeugung_kwh", "netzbezug_kwh", "einspeisung_kwh",
//     "verbrauch_kw", "speicher_soc_pct", "speicher_leistung_kw" (+ laden / − entladen), "wechselrichter_status", "fehlercode" }
//   Alle Messgrößen optional, aber mindestens eine. Zählerstände (…_kwh) sind monoton steigende Summen.
// heartbeat: { "v": 1, "ts": … } · status: "online" | "offline" (Last Will, retained)
//
// Reine Funktionen ohne Abhängigkeiten (Tests: test/schema.test.mjs).

export const VERSION = 1;
export const PRAEFIX = "oekoinvest/v1";
export const KANAELE = ["messwerte", "heartbeat", "status"];
export const MAX_BYTES = 8 * 1024;
const KENNUNG = /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/;

export const MESSGROESSEN = {
  pv_leistung_kw: { feld: "pvKw", min: 0, max: 1e6 },
  erzeugung_kwh: { feld: "erzeugungKwh", min: 0, max: 1e12, zaehler: true },
  netzbezug_kwh: { feld: "netzbezugKwh", min: 0, max: 1e12, zaehler: true },
  einspeisung_kwh: { feld: "einspeisungKwh", min: 0, max: 1e12, zaehler: true },
  verbrauch_kw: { feld: "verbrauchKw", min: 0, max: 1e6 },
  speicher_soc_pct: { feld: "speicherSocPct", min: 0, max: 100 },
  speicher_leistung_kw: { feld: "speicherKw", min: -1e6, max: 1e6 },
};
export const WR_STATUS = ["ok", "warnung", "stoerung", "aus"];

/** Topic zerlegen → { anlageId, geraetId, kanal } oder null */
export function topicLesen(topic) {
  const t = String(topic || "").split("/");
  if (t.length !== 5 || `${t[0]}/${t[1]}` !== PRAEFIX) return null;
  const [, , anlageId, geraetId, kanal] = t;
  if (!KENNUNG.test(anlageId) || !KENNUNG.test(geraetId) || !KANAELE.includes(kanal)) return null;
  return { anlageId, geraetId, kanal };
}

/** Darf `benutzer` (Zugang des Geräts) auf `topic` veröffentlichen? Nur eigene Anlage/eigenes Gerät. */
export function publishErlaubt(zugang, topic) {
  const t = topicLesen(topic);
  return !!(zugang && !zugang.gesperrt && t && t.anlageId === zugang.anlageId && t.geraetId === zugang.geraetId);
}

/**
 * Messwert-Payload prüfen. jetzt = Empfangszeit (ms).
 * Ergebnis { ok: true, wert: {ts, pvKw, …}, hinweise: [] } oder { ok: false, fehler }
 */
export function messwertPruefen(roh, { jetzt = Date.now() } = {}) {
  if (roh === null || roh === undefined) return { ok: false, fehler: "leer" };
  const text = Buffer.isBuffer(roh) ? roh.toString("utf8") : String(roh);
  if (Buffer.byteLength(text) > MAX_BYTES) return { ok: false, fehler: "zu_gross" };
  let p;
  try {
    p = JSON.parse(text);
  } catch {
    return { ok: false, fehler: "kein_json" };
  }
  if (!p || typeof p !== "object" || Array.isArray(p)) return { ok: false, fehler: "kein_objekt" };
  if (p.v !== VERSION) return { ok: false, fehler: "version" };
  const ts = Date.parse(p.ts);
  if (!Number.isFinite(ts)) return { ok: false, fehler: "ts" };
  if (ts > jetzt + 5 * 60e3) return { ok: false, fehler: "ts_zukunft" };
  if (ts < jetzt - 7 * 86400e3) return { ok: false, fehler: "ts_zu_alt" }; // Nachlieferung bis 7 Tage (Puffer im Logger)
  const wert = { ts: new Date(ts).toISOString() };
  const hinweise = [];
  let anzahl = 0;
  for (const [k, def] of Object.entries(MESSGROESSEN)) {
    if (p[k] === undefined || p[k] === null) continue;
    const n = typeof p[k] === "number" ? p[k] : NaN;
    if (!Number.isFinite(n) || n < def.min || n > def.max) {
      hinweise.push(`${k}_ungueltig`);
      continue;
    }
    wert[def.feld] = n;
    anzahl++;
  }
  if (p.wechselrichter_status !== undefined && p.wechselrichter_status !== null) {
    if (WR_STATUS.includes(p.wechselrichter_status)) wert.wechselrichterStatus = p.wechselrichter_status;
    else hinweise.push("wechselrichter_status_ungueltig");
  }
  if (p.fehlercode !== undefined && p.fehlercode !== null && p.fehlercode !== "") {
    wert.fehlercode = String(p.fehlercode).replace(/[\u0000-\u001f]/g, "").slice(0, 80);
  }
  if (!anzahl && !wert.wechselrichterStatus && !wert.fehlercode) return { ok: false, fehler: "keine_messgroesse" };
  return { ok: true, wert, hinweise };
}

/** Heartbeat: { v, ts } → ISO-Zeitpunkt oder null */
export function heartbeatPruefen(roh, { jetzt = Date.now() } = {}) {
  try {
    const p = JSON.parse(Buffer.isBuffer(roh) ? roh.toString("utf8") : String(roh));
    const ts = Date.parse(p?.ts);
    return p?.v === VERSION && Number.isFinite(ts) && ts <= jetzt + 5 * 60e3 ? new Date(ts).toISOString() : null;
  } catch {
    return null;
  }
}

export const statusPruefen = (roh) => {
  const s = (Buffer.isBuffer(roh) ? roh.toString("utf8") : String(roh || "")).trim();
  return s === "online" || s === "offline" ? s : null;
};
