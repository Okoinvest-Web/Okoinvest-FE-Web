// test/charakterisierung/snapshot.mjs
//
// Stabile Serialisierung und Vergleich der Rechner-Ausgaben (ohne Abhängigkeiten).
//  - Zahlen auf 12 signifikante Stellen (Gleitkomma-Rauschen zwischen Plattformen
//    soll keinen Diff erzeugen, echte Wertänderungen schon)
//  - NaN/Infinity/undefined/Funktionen als lesbare Marker, damit auch sie im Diff stehen
//  - Objektschlüssel sortiert (stabile Dateien, kleine Diffs)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RECHNER } from "./faelle.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
export const WURZEL = resolve(HIER, "..", "..");
export const SNAPSHOT_ORDNER = join(HIER, "snapshots");

export function normalisiere(wert, gesehen = new WeakSet()) {
  if (typeof wert === "number") {
    if (Number.isNaN(wert)) return "§NaN";
    if (!Number.isFinite(wert)) return wert > 0 ? "§Infinity" : "§-Infinity";
    if (Object.is(wert, -0) || wert === 0) return 0;
    return Number(wert.toPrecision(12));
  }
  if (wert === undefined) return "§undefined";
  if (typeof wert === "function") return "§Funktion";
  if (typeof wert === "bigint") return `§BigInt:${wert}`;
  if (typeof wert === "symbol") return `§${String(wert)}`;
  if (wert === null || typeof wert !== "object") return wert;
  if (wert instanceof Date) return `§Date:${Number.isNaN(wert.getTime()) ? "ungültig" : wert.toISOString()}`;
  if (gesehen.has(wert)) return "§Zirkel";
  gesehen.add(wert);
  let aus;
  if (Array.isArray(wert)) aus = wert.map((v) => normalisiere(v, gesehen));
  else if (wert instanceof Map) aus = { "§Map": [...wert.entries()].map(([k, v]) => [normalisiere(k, gesehen), normalisiere(v, gesehen)]) };
  else if (wert instanceof Set) aus = { "§Set": [...wert].map((v) => normalisiere(v, gesehen)) };
  else {
    aus = {};
    for (const k of Object.keys(wert).sort()) aus[k] = normalisiere(wert[k], gesehen);
  }
  gesehen.delete(wert); // geteilte (nicht zirkuläre) Referenzen erlaubt
  return aus;
}

/** Führt einen Fall aus; ein Wurf wird als Ergebnis festgehalten (auch das ist Verhalten). */
export function fuehreAus(fn, modul) {
  try {
    return normalisiere(fn(modul));
  } catch (e) {
    return { "§wirft": String(e?.message || e) };
  }
}

export async function ladeModul(relPfad) {
  return import(pathToFileURL(join(WURZEL, relPfad)).href);
}

/** Aktuelle Ausgaben eines Rechners (alle Fälle). */
export async function aktuelleAusgaben(name) {
  const r = RECHNER[name];
  const m = await ladeModul(r.modul);
  const faelle = {};
  for (const [fall, fn] of Object.entries(r.faelle)) faelle[fall] = fuehreAus(fn, m);
  return { rechner: name, modul: r.modul, faelle };
}

export const snapshotPfad = (name) => join(SNAPSHOT_ORDNER, `${name}.json`);

export function leseSnapshot(name) {
  const p = snapshotPfad(name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function schreibeSnapshot(name, daten) {
  mkdirSync(SNAPSHOT_ORDNER, { recursive: true });
  writeFileSync(snapshotPfad(name), JSON.stringify(daten, null, 1) + "\n", "utf8");
}

const kurz = (v) => {
  const s = JSON.stringify(v);
  return s === undefined ? "–" : s.length > 80 ? s.slice(0, 77) + "…" : s;
};

/** Liste der Abweichungen { pfad, alt, neu } zwischen zwei normalisierten Werten. */
export function abweichungen(alt, neu, pfad = "", liste = []) {
  if (alt === neu) return liste;
  const istObj = (v) => v !== null && typeof v === "object";
  if (istObj(alt) && istObj(neu) && Array.isArray(alt) === Array.isArray(neu)) {
    const schluessel = new Set([...Object.keys(alt), ...Object.keys(neu)]);
    for (const k of schluessel) {
      const p = Array.isArray(alt) ? `${pfad}[${k}]` : pfad ? `${pfad}.${k}` : k;
      if (!(k in alt)) liste.push({ pfad: p, alt: "(fehlt)", neu: kurz(neu[k]) });
      else if (!(k in neu)) liste.push({ pfad: p, alt: kurz(alt[k]), neu: "(fehlt)" });
      else abweichungen(alt[k], neu[k], p, liste);
    }
    return liste;
  }
  liste.push({ pfad: pfad || "(Wurzel)", alt: kurz(alt), neu: kurz(neu) });
  return liste;
}

/** Relative Änderung für Zahlen (für den Diff-Bericht), sonst null. */
export function relativ(altText, neuText) {
  const a = Number(altText);
  const n = Number(neuText);
  if (!Number.isFinite(a) || !Number.isFinite(n) || a === 0) return null;
  return (n - a) / Math.abs(a);
}
