// src/lib/plattform/eg/optimierung.js
//
// WP3: Mehrfachteilnahme-Optimierer (Fachkonzept 4.9; ElWG § 71 Abs. 5) – Empfehlung der Teilnahmefaktoren eines
// Zählpunkts über bis zu 5 Gemeinschaften. Reine Funktionen, Python-Spiegel: plattform/eg_energie_kern.py.
//
// maximiere Σ_k Wert_k(TF_k)  unter  Σ TF_k ≤ 100, TF_k ∈ {0} ∪ {1..100} ganzzahlig, höchstens 5 Gemeinschaften.
// Wert_k(t) = Σ_q geteilte Menge des Zählpunkts in Gemeinschaft k bei TF t × Vorteil_k (ct/kWh, inkl. Netzentgeltvorteil
// nach Zonelevel bzw. Preisspanne Einspeisung − Marktwert). Die geteilte Menge folgt dem dynamischen Modell (4.2):
//   Verbraucher:  V' = V·t/100; ED = min(V', E_k · V'/(D_k + V'))  (E_k Erzeugung, D_k Verbrauch der übrigen Teilnehmer)
//   Erzeuger:     E' = P·t/100; G = min(E_k + E', D_k) · E'/(E_k + E')
// Statt Greedy (setzt Konkavität voraus) wird EXAKT per dynamischer Programmierung über das TF-Budget optimiert
// (K ≤ 5, Budget 100 → vernachlässigbarer Aufwand). Rechengrundlage: repräsentative Viertelstunden (z. B. je Monat eine
// Woche), hochgerechnet auf ein Jahr. Umsetzung über EC_PRTFACT_CHG (WP2), derzeit 1 Änderung je Tag (bis 01.04.2028).

import { MAX_TEILNAHMEN_JE_ZP, TEILNAHME_ZAEHLT } from "./modell.js";
import { energieFehler, rund } from "./messwerte.js";

/** Geteilte Menge (kWh) eines Zählpunkts in einer Gemeinschaft bei Teilnahmefaktor t */
export function geteilteMenge(richtung, werte, k, t) {
  const f = t / 100;
  const E = k.erzeugung || [];
  const D = k.verbrauch || [];
  let s = 0;
  for (let q = 0; q < werte.length; q++) {
    const x = (werte[q] || 0) * f;
    if (x <= 0) continue;
    const e = E[q] || 0;
    const d = D[q] || 0;
    if (richtung === "verbrauch") {
      const v = d + x;
      s += e >= v ? x : (e * x) / v;
    } else {
      const g = e + x;
      s += (Math.min(g, d) * x) / g;
    }
  }
  return s;
}

/**
 * TF-Empfehlung.
 * @param {{richtung:"verbrauch"|"erzeugung", werte:number[], hochrechnung?:number,
 *          kandidaten:{gemeinschaftId:string, label?:string, vorteilCtKwh:number, erzeugung:number[], verbrauch:number[], aktuellTf?:number}[]}} e
 */
export function tfOptimieren({ richtung = "verbrauch", werte = [], kandidaten = [], hochrechnung = 1 } = {}) {
  if (!["verbrauch", "erzeugung"].includes(richtung)) throw energieFehler("Richtung verbrauch oder erzeugung.", "richtung");
  if (!kandidaten.length) throw energieFehler("Keine Gemeinschaft zur Auswahl.", "kandidaten");
  if (kandidaten.length > MAX_TEILNAHMEN_JE_ZP) throw energieFehler(`Höchstens ${MAX_TEILNAHMEN_JE_ZP} Gemeinschaften je Zählpunkt (ElWG § 71 Abs. 5).`, "kandidaten");
  const K = kandidaten.length;
  // Wertkurven je Gemeinschaft (€ je Jahr) für t = 0..100
  const kurven = kandidaten.map((k) => {
    const c = new Array(101).fill(0);
    for (let t = 1; t <= 100; t++) c[t] = (geteilteMenge(richtung, werte, k, t) * hochrechnung * (k.vorteilCtKwh || 0)) / 100;
    return c;
  });
  // DP: best[k][b] = max Σ Wert der ersten k Gemeinschaften mit Budget b
  const best = Array.from({ length: K + 1 }, () => new Array(101).fill(0));
  const wahl = Array.from({ length: K + 1 }, () => new Array(101).fill(0));
  for (let k = 1; k <= K; k++) {
    for (let b = 0; b <= 100; b++) {
      let bw = best[k - 1][b];
      let bt = 0;
      for (let t = 1; t <= b; t++) {
        const x = best[k - 1][b - t] + kurven[k - 1][t];
        if (x > bw + 1e-12) {
          bw = x;
          bt = t;
        }
      }
      best[k][b] = bw;
      wahl[k][b] = bt;
    }
  }
  const tf = new Array(K).fill(0);
  let b = 100;
  for (let k = K; k >= 1; k--) {
    tf[k - 1] = wahl[k][b];
    b -= wahl[k][b];
  }
  const menge = (i, t) => (t ? geteilteMenge(richtung, werte, kandidaten[i], t) * hochrechnung : 0);
  const aktuell = kandidaten.map((k) => Math.max(0, Math.min(100, Math.round(k.aktuellTf || 0))));
  const aktuellWert = aktuell.reduce((s, t, i) => s + kurven[i][t], 0);
  const wert = tf.reduce((s, t, i) => s + kurven[i][t], 0);
  const empfehlung = kandidaten.map((k, i) => ({
    gemeinschaftId: k.gemeinschaftId, label: k.label || k.gemeinschaftId, vorteilCtKwh: k.vorteilCtKwh, aktuellTf: aktuell[i], empfohlenTf: tf[i],
    geteiltKwh: rund(menge(i, tf[i]), 3), wertEur: rund(kurven[i][tf[i]], 2), aktuellGeteiltKwh: rund(menge(i, aktuell[i]), 3), aktuellWertEur: rund(kurven[i][aktuell[i]], 2),
    kurve: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((t) => ({ tf: t, wertEur: rund(kurven[i][t], 2) })),
  }));
  const gesamt = (richtung === "verbrauch" ? 1 : 1) * werte.reduce((s, x) => s + (x || 0), 0) * hochrechnung;
  const summeTf = tf.reduce((s, x) => s + x, 0);
  const aenderungen = empfehlung.filter((x) => x.aktuellTf !== x.empfohlenTf).length;
  return {
    richtung, empfehlung, summeTf, restTf: 100 - summeTf, wertEur: rund(wert, 2), aktuellWertEur: rund(aktuellWert, 2), verbesserungEur: rund(wert - aktuellWert, 2), mengeKwh: rund(gesamt, 3),
    aenderungen,
    hinweise: [
      "Teilnahmefaktoren ganzzahlig 1–100 %, Summe höchstens 100 %, bis zu 5 Gemeinschaften (ElWG § 71 Abs. 5).",
      "Änderung über EC_PRTFACT_CHG, derzeit einmal je Tag und Gemeinschaft (ab 01.04.2028 mehrmals täglich, zu bestätigen).",
      ...(summeTf < 100 ? [`${100 - summeTf} % bleiben ohne Gemeinschaft – dort lohnt keine weitere Teilnahme (Grenznutzen 0).`] : []),
      "Empfehlung auf Basis repräsentativer Viertelstunden; fremde Gemeinschaften nur mit Daten, die das Mitglied selbst bereitstellt.",
    ],
  };
}

/**
 * Teilnahmen eines Zählpunkts, die der Optimierer berücksichtigt: alle zählenden (TEILNAHME_ZAEHLT – auch Entwürfe und
 * laufende Anmeldungen, denn sie belegen Teilnahmefaktor); verworfene, abgelehnte, abgelaufene und beendete nicht.
 */
export const optimierungsTeilnahmen = (teilnahmen = []) => teilnahmen.filter((t) => TEILNAHME_ZAEHLT.includes(t?.status));

/** Summe einer Kandidaten-Datenreihe {erzeugung[], verbrauch[]} (0 = keine Werte) */
export const reihenSumme = (r) => [...(r?.erzeugung || []), ...(r?.verbrauch || [])].reduce((s, x) => s + (Number(x) || 0), 0);

export const OPTIMIERUNG_DATENBASIS = {
  messwerte: "Messwerte des Netzbetreibers",
  schaetzung: "Schätzung aus der Mitgliederliste (Standardlastprofile)",
  keine: "keine Daten der übrigen Teilnehmer",
};

/**
 * Kandidat für tfOptimieren mit Datenbasis: Messwerte der übrigen Teilnehmer nur, wenn sie in der Stichprobe tatsächlich
 * vorliegen (Summe > 0). Sonst – z. B. Gemeinschaft in Gründung, in der der Zählpunkt erst als Entwurf geplant ist und noch
 * niemand Werte liefert – die Schätzung aus Standardlastprofilen/PV-Profilen der Mitglieder; ohne beides Kurve 0 („keine“).
 * @param {{gemeinschaftId:string, messung?:{erzeugung:number[],verbrauch:number[]}|null, schaetzung?:{erzeugung:number[],verbrauch:number[]}|null}} k
 */
export function optimierungsKandidat({ messung = null, schaetzung = null, ...k } = {}) {
  const basis = reihenSumme(messung) > 0 ? "messwerte" : reihenSumme(schaetzung) > 0 ? "schaetzung" : "keine";
  const q = basis === "messwerte" ? messung : basis === "schaetzung" ? schaetzung : {};
  return { ...k, erzeugung: q.erzeugung || [], verbrauch: q.verbrauch || [], datenbasis: basis, datenbasisText: OPTIMIERUNG_DATENBASIS[basis] };
}

/**
 * Zusätzliche Hinweise zur Empfehlung je Kandidat (Datenbasis Schätzung/keine, Teilnahme noch nicht aktiv).
 * @param {{gemeinschaftId:string, label?:string, datenbasis?:string, status?:string}[]} kandidaten · @param {{gemeinschaftId:string, aktuellTf:number, empfohlenTf:number}[]} empfehlung
 */
export function optimierungsHinweise(kandidaten = [], empfehlung = []) {
  const h = [];
  for (const k of kandidaten) {
    const name = k.label || k.gemeinschaftId;
    const e = empfehlung.find((x) => x.gemeinschaftId === k.gemeinschaftId);
    if (k.datenbasis === "schaetzung") h.push(`${name}: noch keine Messwerte der übrigen Teilnehmer – Wert geschätzt aus Standardlastprofilen der Mitglieder (unsicher).`);
    else if (k.datenbasis === "keine") h.push(`${name}: keine Daten der übrigen Teilnehmer – mit 0 bewertet.`);
    if (k.status === "entwurf") h.push(`${name}: Teilnahme ist noch ein Entwurf – der Teilnahmefaktor gilt erst mit der Anmeldung; Anteile aus einer aktiven Gemeinschaft erst nach der Aktivierung verschieben.`);
    else if (k.status && !["aktiv", "abmeldung_angefragt"].includes(k.status) && e && e.empfohlenTf !== e.aktuellTf) h.push(`${name}: Anmeldung läuft – eine Änderung ist erst nach der Aktivierung möglich (EC_PRTFACT_CHG).`);
  }
  return h;
}

/** Repräsentative Stichprobe: je Monat die ersten 7 Tage (Indizes in einem Tages-Array), Hochrechnung auf ein Jahr */
export function repraesentativeTage(tage = []) {
  const je = new Map();
  for (const t of tage) {
    const m = t.slice(0, 7);
    if (!je.has(m)) je.set(m, []);
    if (je.get(m).length < 7) je.get(m).push(t);
  }
  const auswahl = [...je.values()].flat().sort();
  return { tage: auswahl, hochrechnung: auswahl.length ? 365 / auswahl.length : 1 };
}
