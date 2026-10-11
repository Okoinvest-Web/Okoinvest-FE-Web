// src/lib/marktdaten/strompreisatlasCh.js – Auswertung des CH-Strompreis-Atlas (Welle 4, Paket CHATLAS)
//
// Reine Funktionen über src/data/strompreisatlasCh.js – ohne React, ohne Next.js, damit Seite,
// Download-Routen (CSV/JSON) und node:test dieselbe Logik nutzen.
//
// Nur amtliche ElCom-Werte (Median je Kanton, Tarif je Netzbetreiber für Beispielstädte), keine
// Anbieter-Rangliste, keine Schätzungen. Relative Importe mit Dateiendung (node:test).

import {
  ATLAS_ABRUF,
  ATLAS_GEMEINDEN,
  ATLAS_JAHRE,
  ATLAS_KANTONE,
  ATLAS_KATEGORIEN,
  ATLAS_LIZENZ,
  ATLAS_QUELLEN,
  ATLAS_STAND,
} from "../../data/strompreisatlasCh.js";

export const ATLAS_KATEGORIE_IDS = Object.freeze(Object.keys(ATLAS_KATEGORIEN));

const jahrOk = (jahr) => ATLAS_JAHRE.includes(jahr);
const katOk = (kat) => ATLAS_KATEGORIE_IDS.includes(kat);

/** Kantonswerte eines Tarifjahrs und einer Kategorie, alphabetisch nach Kantonsname. Unbekannt → []. */
export function kantonsWerte(jahr, kategorie) {
  if (!jahrOk(jahr) || !katOk(kategorie)) return [];
  return ATLAS_KANTONE.filter((x) => x.jahr === jahr && x.kategorie === kategorie).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Beispielstädte eines Tarifjahrs und einer Kategorie, alphabetisch nach Stadt, dann Betreiber. */
export function gemeindeWerte(jahr, kategorie) {
  if (!jahrOk(jahr) || !katOk(kategorie)) return [];
  return ATLAS_GEMEINDEN.filter((x) => x.jahr === jahr && x.kategorie === kategorie).sort(
    (a, b) => a.name.localeCompare(b.name, "de") || a.betreiber.localeCompare(b.betreiber, "de")
  );
}

/** Spannweite (min/max des Medians Total) über die Kantone eines Jahrs und einer Kategorie. */
export function spannweite(jahr, kategorie) {
  const werte = kantonsWerte(jahr, kategorie).filter((x) => x.total != null);
  if (!werte.length) return null;
  let min = werte[0];
  let max = werte[0];
  for (const x of werte) {
    if (x.total < min.total) min = x;
    if (x.total > max.total) max = x;
  }
  return { min, max };
}

/** Veränderung des Kanton-Medians (Total) vom ersten zum letzten Tarifjahr, je Kanton (abk → {von, nach, delta}). */
export function veraenderung(kategorie) {
  const [vonJahr, nachJahr] = [ATLAS_JAHRE[0], ATLAS_JAHRE[ATLAS_JAHRE.length - 1]];
  const von = new Map(kantonsWerte(vonJahr, kategorie).map((x) => [x.abk, x.total]));
  const liste = [];
  for (const x of kantonsWerte(nachJahr, kategorie)) {
    const alt = von.get(x.abk);
    if (alt == null || x.total == null) continue;
    liste.push({ abk: x.abk, name: x.name, von: alt, nach: x.total, delta: x.total - alt });
  }
  return liste;
}

/* ------------------------------------------------------------------ */
/* Export (CSV/JSON)                                                   */
/* ------------------------------------------------------------------ */

export const CSV_SPALTEN = Object.freeze([
  "ebene", // "kanton" | "gemeinde"
  "jahr",
  "kategorie",
  "kanton_abk",
  "name",
  "bfs",
  "netzbetreiber",
  "total_rp_kwh",
  "energie_rp_kwh",
  "netznutzung_rp_kwh",
  "abgaben_rp_kwh",
  "netzzuschlag_rp_kwh",
]);

export function exportZeilen() {
  const k = ATLAS_KANTONE.map((x) => ({
    ebene: "kanton",
    jahr: x.jahr,
    kategorie: x.kategorie,
    kanton_abk: x.abk,
    name: x.name,
    bfs: null,
    netzbetreiber: null,
    total_rp_kwh: x.total,
    energie_rp_kwh: x.energie,
    netznutzung_rp_kwh: x.netz,
    abgaben_rp_kwh: x.abgaben,
    netzzuschlag_rp_kwh: x.netzzuschlag,
  }));
  const g = ATLAS_GEMEINDEN.map((x) => ({
    ebene: "gemeinde",
    jahr: x.jahr,
    kategorie: x.kategorie,
    kanton_abk: null,
    name: x.name,
    bfs: x.bfs,
    netzbetreiber: x.betreiber,
    total_rp_kwh: x.total,
    energie_rp_kwh: x.energie,
    netznutzung_rp_kwh: x.netz,
    abgaben_rp_kwh: x.abgaben,
    netzzuschlag_rp_kwh: x.netzzuschlag,
  }));
  return [...k, ...g];
}

/** Eine CSV-Zelle: null → leer; Komma, Anführungszeichen oder Zeilenumbruch → in Anführungszeichen. */
export function csvZelle(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function alsCsv() {
  const zeilen = exportZeilen().map((z) => CSV_SPALTEN.map((k) => csvZelle(z[k])).join(","));
  return [CSV_SPALTEN.join(","), ...zeilen].join("\n") + "\n";
}

export function alsJson() {
  return {
    name: "ÖkoInvest CH-Strompreis-Atlas (amtliche ElCom-Tarifdaten)",
    stand: ATLAS_STAND,
    abruf: ATLAS_ABRUF,
    einheit: "Rp./kWh",
    jahre: ATLAS_JAHRE,
    kategorien: ATLAS_KATEGORIEN,
    lizenz: ATLAS_LIZENZ,
    quellen: ATLAS_QUELLEN,
    hinweis:
      "Mediane je Kanton und Tarife je Netzbetreiber (Produkt standard), unverändert aus den ElCom-Daten über LINDAS. Mediane der Bestandteile summieren sich nicht exakt zum Median des Totals.",
    kantone: ATLAS_KANTONE,
    gemeinden: ATLAS_GEMEINDEN,
  };
}
