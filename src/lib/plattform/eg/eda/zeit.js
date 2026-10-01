// src/lib/plattform/eg/eda/zeit.js
//
// Datums- und Zeitfunktionen der EDA-Logik (reine Funktionen, ohne Intl – identisch im Python-Spiegel).
// Viertelstunden-Tage in Lokalzeit Europe/Vienna: Sommerzeit vom letzten Sonntag im März 01:00 UTC bis zum letzten
// Sonntag im Oktober 01:00 UTC (EU-Regel, Richtlinie 2000/84/EG) → 92 bzw. 100 Viertelstunden an den Umstellungstagen.

const TAG_MS = 864e5;
const tagMs = (tag) => Date.parse(`${String(tag).slice(0, 10)}T00:00:00Z`);
export const tagVon = (iso) => String(iso || "").slice(0, 10);
export const isoAus = (ms) => new Date(ms).toISOString().slice(0, 19) + "Z";

export function plusTage(tag, n) {
  return new Date(tagMs(tag) + n * TAG_MS).toISOString().slice(0, 10);
}
export function tageZwischen(von, bis) {
  return Math.round((tagMs(bis) - tagMs(von)) / TAG_MS);
}
/** Alle Tage von bis bis (einschließlich) */
export function tageListe(von, bis) {
  const aus = [];
  for (let t = tagVon(von); t <= tagVon(bis) && aus.length < 3700; t = plusTage(t, 1)) aus.push(t);
  return aus;
}

function letzterSonntagUtc(jahr, monat) {
  // monat 1–12; letzter Tag des Monats, zurück bis Sonntag
  let d = Date.UTC(jahr, monat, 0);
  while (new Date(d).getUTCDay() !== 0) d -= TAG_MS;
  return d + 3600e3; // 01:00 UTC
}
/** Offset Wien zu UTC in Minuten (60 bzw. 120) für einen UTC-Zeitpunkt (ms) */
export function wienOffsetMinuten(ms) {
  const j = new Date(ms).getUTCFullYear();
  return ms >= letzterSonntagUtc(j, 3) && ms < letzterSonntagUtc(j, 10) ? 120 : 60;
}
/** Beginn des Lokaltags (Wien) als UTC-ISO */
export function tagBeginnUtc(tag) {
  const m = tagMs(tag);
  return isoAus(m - wienOffsetMinuten(m - 3 * 3600e3) * 60000);
}
/** Anzahl Viertelstunden des Lokaltags (96, an Umstellungstagen 92 bzw. 100) */
export function qhAnzahl(tag) {
  return Math.round((Date.parse(tagBeginnUtc(plusTage(tag, 1))) - Date.parse(tagBeginnUtc(tag))) / 9e5);
}
/** Lokaldatum (Wien) eines UTC-Zeitpunkts */
export function lokalTag(isoUtc) {
  const ms = Date.parse(isoUtc);
  return new Date(ms + wienOffsetMinuten(ms) * 60000).toISOString().slice(0, 10);
}
/** Lokale Stunde (Bruchteil) eines UTC-Zeitpunkts – für Profile im Simulator */
export function lokalStunde(ms) {
  const d = new Date(ms + wienOffsetMinuten(ms) * 60000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}
