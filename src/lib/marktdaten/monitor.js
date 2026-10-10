// src/lib/marktdaten/monitor.js – Auswertung des Ausschreibungs-Monitors (Welle 3, Paket B9)
//
// Reine Funktionen über src/data/ausschreibungsmonitor.js – ohne React, ohne Next.js, damit Seite,
// Download-Routen (CSV/JSON) und node:test dieselbe Logik nutzen.
//
// Ländertrennung: Jede Auswertung nimmt ein Land ("DE" | "AT" | "CH") oder null (= alle Länder,
// jede Zeile mit Länderkennung). Werte verschiedener Länder werden nie verrechnet.
// Relative Importe mit Dateiendung (node:test).

import { MONITOR_ABRUF, MONITOR_LIZENZ, MONITOR_PRUEFER, MONITOR_QUELLEN, MONITOR_STAND, RUNDEN, SERIEN, TERMINE } from "../../data/ausschreibungsmonitor.js";

export const MONITOR_LAENDER = Object.freeze(["DE", "AT", "CH"]);

const iso = (heute) => (typeof heute === "string" ? heute.slice(0, 10) : heute.toISOString().slice(0, 10));
const landOk = (land) => (land == null ? null : MONITOR_LAENDER.includes(land) ? land : undefined);

/** Reihen eines Landes (null = alle, Reihenfolge DE, AT, CH). Unbekanntes Land → []. */
export function serienFuer(land = null) {
  const l = landOk(land);
  if (l === undefined) return [];
  return SERIEN.filter((s) => !l || s.land === l);
}

/** Reihe nach id (oder null). */
export const serieNach = (id) => SERIEN.find((s) => s.id === id) || null;

/** Runden einer Reihe, aufsteigend nach Gebotstermin. */
export function rundenDer(id) {
  return [...(RUNDEN[id] || [])].sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Letzte Runde mit veröffentlichtem Ø-Zuschlagswert. */
export function letzteRunde(id) {
  const liste = rundenDer(id).filter((x) => x.mittel != null);
  return liste.length ? liste[liste.length - 1] : null;
}

/** Überzeichnung = Gebotsmenge / Volumen (null, wenn eines davon nicht veröffentlicht ist). */
export function ueberzeichnung(runde) {
  if (!runde || runde.gebote == null || !runde.volumen) return null;
  return runde.gebote / runde.volumen;
}

/**
 * Jahreswerte einer Reihe: Anzahl Termine, Summen (nur veröffentlichte Werte) und mengengewichteter
 * Ø-Zuschlagswert über die Runden mit Ø-Wert (eigene Berechnung).
 */
export function jahresWerte(id) {
  const jahre = new Map();
  for (const x of rundenDer(id)) {
    const j = Number(x.datum.slice(0, 4));
    const z = jahre.get(j) || { jahr: j, termine: 0, volumen: 0, zuschlag: 0, summeWert: 0, mengeMitWert: 0 };
    z.termine += 1;
    z.volumen += x.volumen || 0;
    z.zuschlag += x.zuschlag || 0;
    if (x.mittel != null && x.zuschlag > 0) {
      z.summeWert += x.mittel * x.zuschlag;
      z.mengeMitWert += x.zuschlag;
    }
    jahre.set(j, z);
  }
  return [...jahre.values()].map(({ summeWert, mengeMitWert, ...z }) => ({ ...z, mittel: mengeMitWert > 0 ? summeWert / mengeMitWert : null }));
}

const hatErgebnis = (termin) => (RUNDEN[termin.serie] || []).some((x) => x.datum === termin.datum);

/**
 * Termine je Stichtag:
 *  laufend    Gebotsfenster offen (beginn ≤ heute ≤ datum)
 *  kommend    Gebotstermin heute oder später (inkl. laufend), aufsteigend
 *  ausstehend Gebotstermin vorbei, Ergebnis noch nicht veröffentlicht, absteigend
 * @param {Date|string} heute
 * @param {string|null} land
 */
export function termineAm(heute = new Date(), land = null) {
  const h = iso(heute);
  const ids = new Set(serienFuer(land).map((s) => s.id));
  const liste = TERMINE.filter((x) => ids.has(x.serie) && !hatErgebnis(x));
  const kommend = liste
    .filter((x) => x.datum >= h)
    .map((x) => ({ ...x, laufend: !!x.beginn && x.beginn <= h }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.serie.localeCompare(b.serie));
  const ausstehend = liste.filter((x) => x.datum < h).sort((a, b) => b.datum.localeCompare(a.datum));
  return { kommend, ausstehend };
}

/** Letzte Runden mit Ergebnis über alle Reihen eines Landes, absteigend (höchstens n). */
export function letzteErgebnisse(land = null, n = 8) {
  return serienFuer(land)
    .flatMap((s) => rundenDer(s.id).map((x) => ({ ...x, serie: s.id, land: s.land, einheit: s.einheit })))
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.serie.localeCompare(b.serie))
    .slice(0, n);
}

/** Quellen (Objekte mit id) einer Reihe bzw. aller Reihen eines Landes, ohne Doppelte. */
export function quellenFuer(land = null) {
  const ids = [...new Set(serienFuer(land).flatMap((s) => s.quellen))];
  return ids.map((id) => ({ id, ...MONITOR_QUELLEN[id] }));
}

/* ------------------------------------------------------------------ */
/* Export (CSV/JSON, CC BY 4.0)                                         */
/* ------------------------------------------------------------------ */

export const CSV_SPALTEN = Object.freeze([
  "land",
  "programm_id",
  "programm",
  "gebotstermin",
  "einheit_zuschlagswert",
  "volumen_mw",
  "gebotsmenge_mw",
  "zuschlagsmenge_mw",
  "anzahl_gebote",
  "anzahl_zuschlaege",
  "zuschlagswert_mittel",
  "zuschlagswert_min",
  "zuschlagswert_max",
  "hoechstwert",
  "vorlaeufig",
  "quelle_url",
  "abruf",
  "notiz",
]);

/** Flache Zeilen aller Runden (ein Land oder alle), aufsteigend je Reihe. */
export function exportZeilen(land = null) {
  return serienFuer(land).flatMap((s) =>
    rundenDer(s.id).map((x) => ({
      land: s.land,
      programm_id: s.id,
      programm: s.name,
      gebotstermin: x.datum,
      einheit_zuschlagswert: s.einheit,
      volumen_mw: x.volumen,
      gebotsmenge_mw: x.gebote,
      zuschlagsmenge_mw: x.zuschlag,
      anzahl_gebote: x.nGebote,
      anzahl_zuschlaege: x.nZuschlaege,
      zuschlagswert_mittel: x.mittel,
      zuschlagswert_min: x.min,
      zuschlagswert_max: x.max,
      hoechstwert: x.hoechst,
      vorlaeufig: x.vorlaeufig === true,
      quelle_url: MONITOR_QUELLEN[x.quelle || s.quellen[0]].url,
      abruf: MONITOR_ABRUF,
      notiz: x.notiz || "",
    }))
  );
}

/** CSV-Zelle (RFC 4180): Zahlen mit Punkt, leere Zelle für null, Text in Anführungszeichen; Formel-Präfixe entschärft. */
export function csvZelle(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV (UTF-8, Komma, CRLF) aller Runden eines Landes bzw. aller Länder. */
export function alsCsv(land = null) {
  const zeilen = exportZeilen(land).map((z) => CSV_SPALTEN.map((k) => csvZelle(z[k])).join(","));
  return [CSV_SPALTEN.join(","), ...zeilen].join("\r\n") + "\r\n";
}

/** JSON-Objekt mit Metadaten, Lizenz, Quellen, Reihen samt Runden und offenen Terminen. */
export function alsJson(land = null, heute = new Date()) {
  const { kommend, ausstehend } = termineAm(heute, land);
  return {
    titel: "Ausschreibungs-Monitor Photovoltaik DACH",
    herausgeber: "ÖkoInvest GmbH",
    lizenz: { name: MONITOR_LIZENZ.name, url: MONITOR_LIZENZ.url, hinweis: MONITOR_LIZENZ.hinweis },
    namensnennung: "Quelle: ÖkoInvest Ausschreibungs-Monitor (CC BY 4.0) auf Basis von Bundesnetzagentur, EAG-Förderabwicklungsstelle und Pronovo",
    stand: MONITOR_STAND,
    abruf: MONITOR_ABRUF,
    pruefung: MONITOR_PRUEFER,
    land: land || "DACH",
    hinweis: "Mengen in MW (Österreich: MWp). Zuschlagswerte in der Einheit der Reihe; Werte verschiedener Länder sind nicht vergleichbar. null = von der Stelle nicht veröffentlicht. Keine Anlage- oder Rechtsberatung, ohne Gewähr.",
    quellen: quellenFuer(land).map(({ id, titel, url, stand }) => ({ id, titel, url, stand })),
    reihen: serienFuer(land).map((s) => ({
      id: s.id,
      land: s.land,
      programm: s.name,
      stelle: s.stelle,
      einheit: s.einheit,
      zuschlagswert: s.wert,
      quellen: s.quellen,
      runden: rundenDer(s.id).map(({ notizEn, ...x }) => x),
    })),
    termine: { kommend: kommend.map(({ laufend, ...x }) => x), ergebnisAusstehend: ausstehend },
  };
}
