// src/lib/plattform/eg/verteilung.js
//
// WP3: Zuteilung der Gemeinschaftserzeugung je Viertelstunde (Fachkonzept 4.1–4.4, 4.10) – reine Funktionen.
// Python-Spiegel: plattform/eg_energie_kern.py. Prüfwerte aus der Handlungsanweisung II (HA II) in testdaten/energie.
//
// 4.1 Vorverarbeitung:   E'_j = E_j · TF_j/100 · V'_i = V_i · TF_i/100 (HA II 12, ab 08.04.2024); mehrere Anlagen zuerst je
//                        Viertelstunde summieren (ElWG § 71 Abs. 4).
// 4.2 Dynamisch:         A_i = E' · V'_i/V' (V' > 0) · ED_i = min(A_i, V'_i) · R = max(0, E' − V') · R_j = R · E'_j/E'
//                        (proportional, ohne Iteration).
// 4.3 Statisch:          s*_i = s_i/Σs nur wenn Σs > 100 % (HA II 12.2) · A_i = E' · s*_i · ED_i = min(A_i, V'_i)
//                        R = E' − Σ ED (nicht genutzte Anteile werden NICHT umverteilt).
// 4.4 Rundung:           volle Präzision; maßgeblich sind die Werte des Netzbetreibers (ElWG § 71 Abs. 1, 4) – die eigene
//                        Rechnung dient Simulation, Plausibilisierung (Abweichungsbericht) und Vorschau.
// Mehrfachteilnahme:     ein Zählpunkt in bis zu 5 Gemeinschaften (ElWG § 71 Abs. 5), TF ganzzahlig 1–100, Σ ≤ 100.
//                        Jede Gemeinschaft rechnet nur mit ihrem TF-Anteil; der Rest bleibt beim Lieferanten bzw. Abnehmer.

import { MAX_TEILNAHMEN_JE_ZP, TF_MAX, TF_MIN } from "./modell.js";
import { energieFehler, rund } from "./messwerte.js";

const w = (x) => (x === null || x === undefined || !Number.isFinite(x) ? 0 : x);
const laenge = (listen) => listen.reduce((m, x) => Math.max(m, (x.werte || []).length), 0);

/** Teilnahmefaktor anwenden (4.1) */
export function tfAnwenden(werte = [], tf = 100) {
  const f = (Number(tf) || 0) / 100;
  return werte.map((x) => (x === null || x === undefined ? null : x * f));
}

/** Teilnahmefaktoren eines Zählpunkts prüfen (ganzzahlig 1–100, Σ ≤ 100, max. 5 Teilnahmen) */
export function tfPruefen(tfs = []) {
  const fehler = [];
  if (tfs.length > MAX_TEILNAHMEN_JE_ZP) fehler.push(`Höchstens ${MAX_TEILNAHMEN_JE_ZP} Teilnahmen je Zählpunkt (ElWG § 71 Abs. 5).`);
  for (const t of tfs) if (!Number.isInteger(t) || t < TF_MIN || t > TF_MAX) fehler.push(`Teilnahmefaktor ${t} ungültig (ganzzahlig ${TF_MIN}–${TF_MAX} %).`);
  const s = tfs.reduce((a, b) => a + (Number(b) || 0), 0);
  if (s > 100) fehler.push(`Summe der Teilnahmefaktoren ${s} % über 100 %.`);
  return { ok: !fehler.length, summe: s, rest: Math.max(0, 100 - s), fehler };
}

/**
 * Mehrfachteilnahme: gemessene Werte eines Zählpunkts nach TF auf die Gemeinschaften aufteilen.
 * @param {number[]} werte · @param {{gemeinschaftId:string, tf:number}[]} teilnahmen
 * @returns {{anteile:Object<string,number[]>, rest:number[], pruefung}}
 */
export function mehrfachAufteilen(werte = [], teilnahmen = []) {
  const pruefung = tfPruefen(teilnahmen.map((t) => t.tf));
  if (!pruefung.ok) throw energieFehler(pruefung.fehler.join(" "), "teilnahmefaktor");
  const anteile = {};
  for (const t of teilnahmen) anteile[t.gemeinschaftId] = tfAnwenden(werte, t.tf);
  const rest = tfAnwenden(werte, pruefung.rest);
  return { anteile, rest, pruefung };
}

function vorverarbeiten(liste, n) {
  return liste.map((x) => {
    const f = (x.tf === undefined || x.tf === null ? 100 : Number(x.tf)) / 100;
    const a = new Array(n);
    for (let q = 0; q < n; q++) a[q] = w(x.werte?.[q]) * f;
    return a;
  });
}

/**
 * Zuteilung nach dynamischem (Standard) oder statischem Modell.
 * @param {{modell?:"dynamisch"|"statisch", erzeuger:{id,werte,tf?}[], verbraucher:{id,werte,tf?,schluesselPct?}[]}} e
 * @returns {{verbraucher:[{id, verbrauchTf[], anteil[], eigendeckung[]}], erzeuger:[{id, erzeugungTf[], restueberschuss[], eingebracht[]}],
 *            summe:{erzeugungTf[], verbrauchTf[], eigendeckung[], restueberschuss[]}, normierung:number|null}}
 */
export function verteilen({ modell = "dynamisch", erzeuger = [], verbraucher = [] } = {}) {
  const n = Math.max(laenge(erzeuger), laenge(verbraucher));
  const E = vorverarbeiten(erzeuger, n);
  const V = vorverarbeiten(verbraucher, n);
  const Es = new Array(n).fill(0);
  const Vs = new Array(n).fill(0);
  for (let q = 0; q < n; q++) {
    let s = 0;
    for (const a of E) s += a[q];
    Es[q] = s;
    let t = 0;
    for (const a of V) t += a[q];
    Vs[q] = t;
  }
  let sStern = null;
  let normierung = null;
  if (modell === "statisch") {
    const s = verbraucher.map((x) => Number(x.schluesselPct) || 0);
    const sum = s.reduce((a, b) => a + b, 0);
    normierung = sum;
    sStern = s.map((x) => (sum > 100 ? x / sum : x / 100));
  }
  const vOut = verbraucher.map((x, i) => ({ id: x.id, verbrauchTf: V[i], anteil: new Array(n), eigendeckung: new Array(n) }));
  const EDs = new Array(n).fill(0);
  for (let q = 0; q < n; q++) {
    let ed = 0;
    for (let i = 0; i < vOut.length; i++) {
      const v = V[i][q];
      let a;
      if (sStern) a = Es[q] * sStern[i];
      else a = Vs[q] > 0 ? (Es[q] * v) / Vs[q] : 0;
      const d = Math.min(a, v);
      vOut[i].anteil[q] = a;
      vOut[i].eigendeckung[q] = d;
      ed += d;
    }
    EDs[q] = ed;
  }
  const Rs = new Array(n);
  for (let q = 0; q < n; q++) Rs[q] = sStern ? Math.max(0, Es[q] - EDs[q]) : Math.max(0, Es[q] - Vs[q]);
  const eOut = erzeuger.map((x, j) => {
    const r = new Array(n);
    const g = new Array(n);
    for (let q = 0; q < n; q++) {
      r[q] = Es[q] > 0 ? (Rs[q] * E[j][q]) / Es[q] : 0;
      g[q] = E[j][q] - r[q];
    }
    return { id: x.id, erzeugungTf: E[j], restueberschuss: r, eingebracht: g };
  });
  return { verbraucher: vOut, erzeuger: eOut, summe: { erzeugungTf: Es, verbrauchTf: Vs, eigendeckung: EDs, restueberschuss: Rs }, normierung };
}

/** Summen einer Zuteilung (Kennzahlen 4.7): Eigendeckungsquote Σ ED/Σ V', Nutzungsgrad Σ ED/Σ E' */
export function verteilungKennzahlen(z) {
  const s = (a) => a.reduce((x, y) => x + y, 0);
  const E = s(z.summe.erzeugungTf);
  const V = s(z.summe.verbrauchTf);
  const ED = s(z.summe.eigendeckung);
  const R = s(z.summe.restueberschuss);
  return { erzeugungTfKwh: E, verbrauchTfKwh: V, eigendeckungKwh: ED, restueberschussKwh: R, restbezugKwh: V - ED, eigendeckungsquote: V > 0 ? ED / V : 0, nutzungsgrad: E > 0 ? ED / E : 0 };
}

/** Kontrolle 4.5: Σ Eigendeckung = Σ eingebrachte Erzeugung (Toleranz durch Rundung) */
export function bilanzPruefen(z, toleranz = 1e-6) {
  let ed = 0;
  let g = 0;
  for (const v of z.verbraucher) for (const x of v.eigendeckung) ed += x;
  for (const e of z.erzeuger) for (const x of e.eingebracht) g += x;
  return { eigendeckungKwh: ed, eingebrachtKwh: g, differenzKwh: ed - g, ok: Math.abs(ed - g) <= toleranz * Math.max(1, ed) };
}

/**
 * Abweichung eigene Zuteilung ↔ Netzbetreiber je Zählpunkt (Fachkonzept 4.4; Toleranz konfigurierbar, Standard 0,5 %
 * bzw. 0,1 kWh je ZP und Monat – künftige Toleranz der Marktregeln zu bestätigen). Über der Toleranz → Klärfall.
 * @param {{zaehlpunktId, eigenKwh, nbKwh}[]} posten
 */
export function nbAbgleich(posten = [], { toleranzPct = 0.5, toleranzKwh = 0.1 } = {}) {
  const zeilen = posten.map((p) => {
    const abw = (p.eigenKwh || 0) - (p.nbKwh || 0);
    const grenze = Math.max(toleranzKwh, (Math.abs(p.nbKwh || 0) * toleranzPct) / 100);
    const pct = p.nbKwh ? (abw / p.nbKwh) * 100 : p.eigenKwh ? 100 : 0;
    return { ...p, abweichungKwh: abw, abweichungPct: pct, grenzeKwh: grenze, klaerfall: Math.abs(abw) > grenze + 1e-9 };
  });
  const summeEigen = zeilen.reduce((s, z) => s + (z.eigenKwh || 0), 0);
  const summeNb = zeilen.reduce((s, z) => s + (z.nbKwh || 0), 0);
  return { zeilen, summeEigenKwh: summeEigen, summeNbKwh: summeNb, abweichungKwh: summeEigen - summeNb, klaerfaelle: zeilen.filter((z) => z.klaerfall).length, toleranzPct, toleranzKwh };
}

/**
 * Sozialquote (ElWG § 68 Abs. 6, Fachkonzept 4.10): Nimmt eine Gebietskörperschaft mit eigener Anlage teil, müssen
 * mind. 10 % der für die gemeinsame Nutzung erzeugten und eingespeisten Energie an schutzbedürftige Haushalte bzw.
 * Einrichtungen gehen. Zurechnung je Viertelstunde proportional: Anteil der Gemeinde-Erzeugung an der eingebrachten Menge.
 * @param {{verbraucher:[{id, eigendeckung[], schutzbeduerftig}], erzeuger:[{id, erzeugungTf[], eingebracht[], gemeinde}]}} z
 */
export function sozialquote({ verbraucher = [], erzeuger = [] } = {}, { zielPct = 10 } = {}) {
  const gem = erzeuger.filter((e) => e.gemeinde);
  if (!gem.length) return { anwendbar: false, quotePct: null, zielPct, text: "Keine Anlage einer Gebietskörperschaft – Sozialquote nicht anwendbar." };
  const n = Math.max(...erzeuger.map((e) => e.eingebracht.length), 0);
  let basis = 0;
  let anSchutz = 0;
  for (let q = 0; q < n; q++) {
    let gG = 0;
    let gAlle = 0;
    for (const e of erzeuger) gAlle += w(e.eingebracht[q]);
    for (const e of gem) {
      gG += w(e.eingebracht[q]);
      basis += w(e.erzeugungTf[q]);
    }
    if (gAlle <= 0 || gG <= 0) continue;
    let ed = 0;
    for (const v of verbraucher) if (v.schutzbeduerftig) ed += w(v.eigendeckung[q]);
    anSchutz += (ed * gG) / gAlle;
  }
  const quote = basis > 0 ? (anSchutz / basis) * 100 : 0;
  return { anwendbar: true, basisKwh: basis, anSchutzbeduerftigeKwh: anSchutz, quotePct: quote, zielPct, erfuellt: quote >= zielPct, fehlmengeKwh: Math.max(0, (zielPct / 100) * basis - anSchutz), text: quote >= zielPct ? `Sozialquote erfüllt (${rund(quote, 1)} % ≥ ${zielPct} %).` : `Sozialquote ${rund(quote, 1)} % – unter ${zielPct} % (ElWG § 68 Abs. 6). Steuerung über Teilnahmefaktor oder Sozialtarif.` };
}
