// src/lib/plattform/energie/quellen.js
//
// Spotpreise Day-Ahead DE-LU und AT – NUR serverseitig (Route-Handler, Server-Komponenten, Demo-Backend).
// Quelle: Energy-Charts (Fraunhofer ISE), https://api.energy-charts.info/price?bzn=DE-LU|AT&start=…&end=…
// Lizenz (lt. API-Beschreibung, Stand 09/2026): Daten der Gebotszonen DE-LU und AT „CC BY 4.0 from
// Bundesnetzagentur | SMARD.de“ – Quellenangabe an jeder Darstellung. Seit 01.10.2025 in 15-Minuten-Auflösung.
//
// Abruf mit Next-Cache (6 h) und Zeitlimit; zusätzlich Speicher-Cache im Prozess. Kein Dateizugriff (siehe BRIEFING:
// keine awaited fs-Lesezugriffe beim Rendern). Fällt die Quelle aus, liefert die Funktion eine deutlich
// gekennzeichnete Simulation (quelle „simulation“) – im Betrieb liefert Frappe die gespeicherten Werte
// (Scheduler energie_quellen.spot_taeglich).

import { QUELLEN, ZONEN, simulierteSpotpreise, stundenwerte, aufloesungMin } from "./markt.js";

const EC = "https://api.energy-charts.info";
const CACHE = new Map(); // key → { bis: ms, wert }
const TAG = 86400000;

function datum(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function holen(bzn, von, bis) {
  const url = `${EC}/price?bzn=${encodeURIComponent(bzn)}&start=${von}&end=${bis}`;
  const res = await fetch(url, { next: { revalidate: 21600 }, headers: { Accept: "application/json", "User-Agent": "oekoinvest-handelsdesk" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const j = await res.json();
  const punkte = (j.unix_seconds || []).map((s, i) => ({ t: s * 1000, eurMwh: j.price?.[i] })).filter((p) => typeof p.eurMwh === "number" && Number.isFinite(p.eurMwh));
  return { punkte, lizenzText: typeof j.license_info === "string" ? j.license_info.slice(0, 300) : "" };
}

/**
 * Spotpreise einer Zone der letzten `tage` Tage bis einschließlich morgen (sofern veröffentlicht).
 * @returns {{zone, quelle: "energycharts"|"simulation", quelleLabel, lizenz, aufloesungMin, stunden: [{t, eurMwh}] (Stundenmittel),
 *            aktuell: [{t, eurMwh}] (Originalauflösung ab vorgestern), stand, fehler?}}
 */
export async function spotReihe(zone = "DE", { tage = 400 } = {}) {
  const z = ZONEN[zone] || ZONEN.DE;
  const heute = Date.now();
  const vonMs = heute - tage * TAG;
  const key = `${z.id}|${tage}|${datum(heute)}`;
  const c = CACHE.get(key);
  if (c && c.bis > heute) return c.wert;
  let wert;
  try {
    const { punkte, lizenzText } = await holen(z.bzn, datum(vonMs), datum(heute + 2 * TAG));
    if (punkte.length < 24) throw new Error("zu wenige Werte");
    wert = { zone: z.id, quelle: "energycharts", quelleLabel: QUELLEN.energycharts.label, lizenz: lizenzText || QUELLEN.energycharts.lizenz, aufloesungMin: aufloesungMin(punkte), stunden: stundenwerte(punkte), aktuell: punkte.filter((p) => p.t >= heute - 2 * TAG), stand: new Date().toISOString() };
  } catch (e) {
    const punkte = simulierteSpotpreise({ zone: z.id, vonMs: Date.parse(`${datum(vonMs)}T00:00:00Z`), bisMs: Date.parse(`${datum(heute + TAG)}T22:00:00Z`) });
    wert = { zone: z.id, quelle: "simulation", quelleLabel: QUELLEN.simulation.label, lizenz: QUELLEN.simulation.lizenz, aufloesungMin: 60, stunden: punkte, aktuell: punkte.filter((p) => p.t >= heute - 2 * TAG), stand: new Date().toISOString(), fehler: `Energy-Charts nicht erreichbar (${String(e?.message || e).slice(0, 80)}) – Simulation angezeigt.` };
  }
  CACHE.set(key, { bis: heute + (wert.quelle === "energycharts" ? 3 * 3600e3 : 10 * 60e3), wert });
  if (CACHE.size > 8) CACHE.delete(CACHE.keys().next().value);
  return wert;
}
