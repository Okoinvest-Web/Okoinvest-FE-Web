// src/lib/plattform/eg/prognose.js
//
// WP3: Prognose im Betrieb (Fachkonzept 4.8) – nächste 7 Tage aus der Historie der Gemeinschaft, reine Funktionen.
// Python-Spiegel: plattform/eg_energie_kern.py.
//
// Erzeugung: Klarhimmel-Modell der Anlagen (simulation.js) × Kalibrierfaktor aus den letzten 30 Tagen (gemessenes E' ÷
// Klarhimmel derselben Tage – enthält Wetter im Mittel, TF und Eigenverbrauch). Band P10–P90 aus der Verteilung der
// Tagesverhältnisse. Mit Wettervorhersage (z. B. GeoSphere Austria/Open-Meteo, Lizenz prüfen) kann je Tag ein
// Bewölkungsfaktor 0–1 übergeben werden; dann klarer Tag (P90-Verhältnis) × Faktor.
// Verbrauch: gleitendes Wochentagsprofil (Mittel der letzten 4 gleichen Wochentage je Viertelstunde).
// Ergebnis: Eigendeckung je Viertelstunde (dynamisch: min(E', V')), „grüne Stunden“ (E' > V') als Empfehlung für
// Lastverschiebung – keine Steuerung in Phase 1.

import { plusTag, rund, versatzMin, wochentag } from "./messwerte.js";
import { pvKlarhimmel } from "./simulation.js";

const QH = 96;
/** Tag im Jahr (1–366) */
function tagImJahr(tag) {
  const [j, m, d] = tag.split("-").map(Number);
  return Math.round((Date.UTC(j, m - 1, d) - Date.UTC(j, 0, 1)) / 864e5) + 1;
}
/** Klarhimmel-Tagesprofil der Anlagen in Lokalzeit (96 Werte; MESZ: Uhr − 1 h = MEZ) */
export function klarhimmelTag(tag, anlagen = [], standort = {}, sommerzeit = false) {
  const n = tagImJahr(tag);
  const out = new Array(QH).fill(0);
  for (const a of anlagen) {
    const opt = { lat: standort.lat ?? 48.2, lon: standort.lon ?? 13.5, ausrichtung: a.ausrichtung ?? 0, neigung: a.neigung ?? 30 };
    for (let q = 0; q < QH; q++) out[q] += pvKlarhimmel(n, (q + 0.5) / 4 - (sommerzeit ? 1 : 0), opt) * (a.kwp || 0);
  }
  return out;
}
const quantil = (werte, p) => {
  if (!werte.length) return 0;
  const s = werte.slice().sort((a, b) => a - b);
  const x = (s.length - 1) * p;
  const lo = Math.floor(x);
  const hi = Math.ceil(x);
  return s[lo] + (s[hi] - s[lo]) * (x - lo);
};
/** Zusammenhängende Stunden mit E' > V' als Zeitfenster „HH:00–HH:00“ */
export function grueneFenster(stunden) {
  const f = [];
  let von = null;
  for (let h = 0; h <= 24; h++) {
    const gruen = h < 24 && stunden[h].e > stunden[h].v && stunden[h].e > 0;
    if (gruen && von === null) von = h;
    if (!gruen && von !== null) {
      f.push({ von: `${String(von).padStart(2, "0")}:00`, bis: `${String(h).padStart(2, "0")}:00`, stunden: h - von });
      von = null;
    }
  }
  return f;
}

/**
 * Prognose der nächsten Tage.
 * @param {{heute:string, historie:{tag:string, erzeugung:number[], verbrauch:number[]}[], anlagen:{kwp,ausrichtung,neigung}[],
 *          standort:{lat,lon}, tage?:number, wetter?:{tag:string, faktor:number}[]}} e
 */
export function prognose({ heute, historie = [], anlagen = [], standort = {}, tage = 7, wetter = [], sommerzeit = null } = {}) {
  const st = sommerzeit || ((t) => versatzMin(Date.parse(`${t}T10:00:00Z`)) === 120);
  const hist = historie.filter((h) => h.tag < heute).sort((a, b) => a.tag.localeCompare(b.tag));
  const letzte30 = hist.slice(-30);
  const verh = [];
  let sumMess = 0;
  let sumKlar = 0;
  for (const h of letzte30) {
    const k = klarhimmelTag(h.tag, anlagen, standort, st(h.tag)).reduce((a, b) => a + b, 0);
    const m = (h.erzeugung || []).slice(0, QH).reduce((a, b) => a + (b || 0), 0);
    if (k > 0) {
      verh.push(m / k);
      sumMess += m;
      sumKlar += k;
    }
  }
  const kal = sumKlar > 0 ? sumMess / sumKlar : 0;
  const p10 = quantil(verh, 0.1);
  const p90 = quantil(verh, 0.9);
  const wMap = new Map(wetter.map((w) => [w.tag, Math.max(0, Math.min(1, Number(w.faktor)))]));
  const ergebnis = [];
  for (let d = 1; d <= tage; d++) {
    const tag = plusTag(heute, d - 1);
    const wt = wochentag(tag);
    const gleiche = hist.filter((h) => wochentag(h.tag) === wt).slice(-4);
    const basis = gleiche.length ? gleiche : hist.slice(-7);
    const v = new Array(QH).fill(0);
    for (const h of basis) for (let q = 0; q < QH; q++) v[q] += (h.verbrauch?.[q] || 0) / basis.length;
    const klar = klarhimmelTag(tag, anlagen, standort, st(tag));
    const faktor = wMap.has(tag) ? p90 * wMap.get(tag) : kal;
    const e = klar.map((x) => x * faktor);
    const ed = e.map((x, q) => Math.min(x, v[q]));
    const stunden = [];
    for (let h = 0; h < 24; h++) {
      let se = 0;
      let sv = 0;
      for (let q = h * 4; q < h * 4 + 4; q++) {
        se += e[q];
        sv += v[q];
      }
      stunden.push({ stunde: h, e: rund(se, 3), v: rund(sv, 3) });
    }
    const E = e.reduce((a, b) => a + b, 0);
    const V = v.reduce((a, b) => a + b, 0);
    const ED = ed.reduce((a, b) => a + b, 0);
    const kl = klar.reduce((a, b) => a + b, 0);
    let beste = null;
    for (const s of stunden) if (s.e - s.v > 0 && (!beste || s.e - s.v > beste.e - beste.v)) beste = s;
    ergebnis.push({
      tag, wochentag: wt, quelle: wMap.has(tag) ? "wetter" : "klimamittel",
      erzeugungKwh: rund(E, 3), verbrauchKwh: rund(V, 3), eigendeckungKwh: rund(ED, 3), quote: V > 0 ? rund(ED / V, 4) : 0,
      band: { p10Kwh: rund(kl * p10, 3), p90Kwh: rund(kl * p90, 3) },
      gruenFenster: grueneFenster(stunden), besteStunde: beste ? beste.stunde : null, stunden,
    });
  }
  return { heute, kalibrierung: rund(kal, 4), tageHistorie: letzte30.length, verhaeltnisP10: rund(p10, 4), verhaeltnisP90: rund(p90, 4), tage: ergebnis, hinweis: "Prognose aus Klimamittel und Messhistorie der letzten 30 Tage; mit Wettervorhersage genauer. Nur Empfehlung, keine Steuerung." };
}
