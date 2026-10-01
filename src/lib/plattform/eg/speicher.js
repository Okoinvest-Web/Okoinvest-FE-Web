// src/lib/plattform/eg/speicher.js
//
// WP3: Gemeinschaftsspeicher-Bilanz (Fachkonzept 4.7 Nr. 7, Marktanalyse „Speicher-Bilanzierung als Zukunftsmodul“) –
// reine Funktionen. Python-Spiegel: plattform/eg_energie_kern.py.
//
// Greedy je Viertelstunde: Laden aus dem Restüberschuss R = max(0, E' − V'), Entladen in den Restbedarf max(0, V' − E'),
// begrenzt durch Leistung (kW × 0,25 h), Kapazität und Ladezustandsgrenzen; Wirkungsgrad als Rundlauf-Wirkungsgrad
// (je Richtung √η). Bilanzgleichung: geladen = entladen + Verluste + Δ Ladezustand.
// Rechtlicher Rahmen offen: Messkonzepte nach § 111 ElWG; Gemeinschaftsspeicher derzeit nur bei Beladung aus EINER
// Erzeugungstechnologie (Koordinationsstelle) – Ergebnis ist eine Empfehlung, keine Abrechnungsgrundlage (zu bestätigen).

import { energieFehler, rund } from "./messwerte.js";

export const SPEICHER_HINWEIS = "Gemeinschaftsspeicher: Messkonzepte nach § 111 ElWG noch offen, Beladung derzeit nur aus einer Erzeugungstechnologie (Koordinationsstelle). Ergebnis als Empfehlung (zu bestätigen).";

/** Speicherparameter prüfen */
export function speicherBereinigen(d = {}) {
  const k = Number(d.kapazitaetKwh);
  if (!Number.isFinite(k) || k <= 0 || k > 100000) throw energieFehler("Speicherkapazität zwischen 0 und 100.000 kWh angeben.", "kapazitaetKwh");
  const p = Number(d.leistungKw ?? k / 2);
  const eta = Number(d.wirkungsgradPct ?? 90);
  const smin = Number(d.socMinPct ?? 5);
  const smax = Number(d.socMaxPct ?? 100);
  const start = Number(d.socStartPct ?? smin);
  if (!Number.isFinite(p) || p <= 0) throw energieFehler("Speicherleistung (kW) angeben.", "leistungKw");
  if (!(eta >= 50 && eta <= 100)) throw energieFehler("Wirkungsgrad zwischen 50 und 100 %.", "wirkungsgradPct");
  if (!(smin >= 0 && smin < smax && smax <= 100)) throw energieFehler("Ladezustandsgrenzen ungültig.", "socMinPct");
  return { kapazitaetKwh: k, leistungKw: p, wirkungsgradPct: eta, socMinPct: smin, socMaxPct: smax, socStartPct: Math.min(smax, Math.max(smin, start)) };
}

/**
 * Bilanz eines Gemeinschaftsspeichers über Viertelstundenreihen der Gemeinschaft.
 * @param {{erzeugung:number[], verbrauch:number[]}} reihen E' bzw. V' der Gemeinschaft (kWh je Viertelstunde)
 * @param {Object} parameter speicherBereinigen
 * @param {{mitVerlauf?:boolean}} opt
 */
export function speicherBilanz({ erzeugung = [], verbrauch = [] } = {}, parameter = {}, { mitVerlauf = false } = {}) {
  const sp = speicherBereinigen(parameter);
  const n = Math.max(erzeugung.length, verbrauch.length);
  const eta = Math.sqrt(sp.wirkungsgradPct / 100);
  const min = (sp.kapazitaetKwh * sp.socMinPct) / 100;
  const max = (sp.kapazitaetKwh * sp.socMaxPct) / 100;
  const start = (sp.kapazitaetKwh * sp.socStartPct) / 100;
  const dt = sp.leistungKw * 0.25;
  let soc = start;
  let geladen = 0;
  let entladen = 0;
  let edOhne = 0;
  let restOhne = 0;
  let bedarfOhne = 0;
  let E = 0;
  let V = 0;
  let voll = 0;
  let leer = 0;
  const verlauf = mitVerlauf ? new Array(n) : null;
  for (let q = 0; q < n; q++) {
    const e = erzeugung[q] || 0;
    const v = verbrauch[q] || 0;
    E += e;
    V += v;
    edOhne += Math.min(e, v);
    const r = Math.max(0, e - v);
    const b = Math.max(0, v - e);
    restOhne += r;
    bedarfOhne += b;
    if (r > 0) {
      const l = Math.min(r, dt, (max - soc) / eta);
      if (l > 0) {
        soc += l * eta;
        geladen += l;
      }
      if (max - soc < 1e-9) voll++;
    } else if (b > 0) {
      const x = Math.min(b, dt, (soc - min) * eta);
      if (x > 0) {
        soc -= x / eta;
        entladen += x;
      }
      if (soc - min < 1e-9) leer++;
    }
    if (verlauf) verlauf[q] = soc;
  }
  const verluste = geladen - entladen - (soc - start);
  const r3 = (x) => rund(x, 3);
  return {
    parameter: sp,
    erzeugungKwh: r3(E),
    verbrauchKwh: r3(V),
    eigendeckungOhneKwh: r3(edOhne),
    eigendeckungMitKwh: r3(edOhne + entladen),
    restueberschussOhneKwh: r3(restOhne),
    restueberschussMitKwh: r3(restOhne - geladen),
    restbezugOhneKwh: r3(bedarfOhne),
    restbezugMitKwh: r3(bedarfOhne - entladen),
    geladenKwh: r3(geladen),
    entladenKwh: r3(entladen),
    verlusteKwh: r3(verluste),
    socEndeKwh: r3(soc),
    zyklen: rund(entladen / sp.kapazitaetKwh, 2),
    quoteOhne: V > 0 ? rund(edOhne / V, 4) : 0,
    quoteMit: V > 0 ? rund((edOhne + entladen) / V, 4) : 0,
    vollQh: voll,
    leerQh: leer,
    bilanzOk: Math.abs(geladen - entladen - verluste - (soc - start)) < 1e-6,
    verlauf,
    hinweis: SPEICHER_HINWEIS,
  };
}

/** Größenempfehlung: Bilanz für mehrere Kapazitäten (C-Rate 0,5), Grenznutzen je zusätzlicher kWh Kapazität */
export function speicherEmpfehlung(reihen, { groessen = [10, 25, 50, 100, 200], wirkungsgradPct = 90, wertCtKwh = 10 } = {}) {
  let vorher = 0;
  let vorherK = 0;
  return groessen.map((k) => {
    const b = speicherBilanz(reihen, { kapazitaetKwh: k, leistungKw: k / 2, wirkungsgradPct });
    const zusatz = b.entladenKwh - vorher;
    const z = { kapazitaetKwh: k, entladenKwh: b.entladenKwh, quoteMit: b.quoteMit, zyklen: b.zyklen, wertEur: rund((b.entladenKwh * wertCtKwh) / 100, 2), grenzKwhJeKwh: k - vorherK > 0 ? rund(zusatz / (k - vorherK), 3) : 0 };
    vorher = b.entladenKwh;
    vorherK = k;
    return z;
  });
}
