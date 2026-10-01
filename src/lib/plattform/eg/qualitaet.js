// src/lib/plattform/eg/qualitaet.js
//
// WP3 „Datenqualitäts-Leitstand“ (Fachkonzept 2.5, 4.4; Marktanalyse Differenzierung 5) – reine Funktionen.
// Python-Spiegel: plattform/eg_energie_kern.py.
//
// Je Zählpunkt und Tag eine Ampel:
//   ok        vollständig, nur L1/L2 (L2 = belastbarer Ersatzwert, abrechenbar; HA II 2.3.1)
//   erwartet  noch innerhalb der Lieferfrist (CR_MSG kommt in der Regel am Folgetag; ab 10/2026 max. 2 Läufe je Tag)
//   warn      L3-Werte (nicht abrechenbar, Ersatz durch L1/L2 binnen 60 Tagen, bei BEG/VEZ binnen 15 Kalendertagen, HA II
//             13.1) bzw. verspätete Lieferung
//   fehler    Lücke, fehlender Tag nach Frist, unplausible Werte, L3 nach Ablauf der Ersatzfrist
// Daraus entstehen Reklamationsfälle (Nachforderung CR_REQ_PT über WP2, edaNachforderung) mit Frist und Verlauf, und je
// Netzbetreiber eine Lieferstatistik („liefert im Schnitt nach N Tagen“). Ersatzwerte der Plattform (Interpolation,
// Vergleichstag) dienen NUR der Vorschau, nie der Abrechnung (Fachkonzept 7.3).

import { blockKennzahlen, plusTag, tageZwischen, werteJeTag } from "./messwerte.js";

export const AMPEL = {
  ok: { label: "Daten vollständig", ton: "ok" },
  erwartet: { label: "Lieferung erwartet", ton: "neutral" },
  warn: { label: "Prüfen", ton: "warn" },
  fehler: { label: "Reklamation nötig", ton: "fehler" },
  keine: { label: "keine Teilnahme", ton: "neutral" },
};
/** Fristen und Toleranzen (konfigurierbar; Quellen siehe Kopf) */
export const QUALITAET_REGELN = {
  lieferFristTage: 2, // Lieferung bis D+2 gilt als rechtzeitig (Auslegung, zu bestätigen)
  l3FristTage: 60, // HA II 13.1
  l3FristTageBeg: 15, // BEG/VEZ: binnen 15 Kalendertagen, sonst Bewertung mit 0 (HA II 2.3.1)
  sprungFaktor: 1.5, // Wert > 1,5 × Spitzenleistung × 0,25 h gilt als Sprung
  epsilonKwh: 1e-6,
  reklamationFristTage: 14, // Rückmeldefrist an den Netzbetreiber (Arbeitshypothese, zu bestätigen)
};

const STUFE = { ok: 0, erwartet: 1, warn: 2, fehler: 3 };
const schlechter = (a, b) => (STUFE[b] > STUFE[a] ? b : a);

/**
 * Plausibilität eines Zählpunkt-Tages über alle Größen (Fachkonzept 2.5): negative Werte, Eigendeckung ≤ Verbrauch × TF,
 * Eigendeckung ≤ Anteil an der Erzeugung, Verbrauch × TF ≤ Verbrauch laut Messung, Erzeugung × TF ≤ Erzeugung laut
 * Messung, Restüberschuss ≤ Erzeugung × TF, Sprünge über der Spitzenleistung.
 * @param {Object<string, {werte:number[]}>} g  Größe → Block
 * @returns {{verstoesse:{regel:string, viertelstunden:number}[]}}
 */
export function plausibilitaet(g = {}, { maxKw = null, regeln = QUALITAET_REGELN } = {}) {
  const eps = regeln.epsilonKwh;
  const v = [];
  const pruefe = (regel, a, b) => {
    if (!g[a] || !g[b]) return;
    let n = 0;
    const len = Math.min(g[a].werte.length, g[b].werte.length);
    for (let i = 0; i < len; i++) {
      const x = g[a].werte[i];
      const y = g[b].werte[i];
      if (x !== null && y !== null && x > y + eps) n++;
    }
    if (n) v.push({ regel, viertelstunden: n });
  };
  pruefe("Eigendeckung über Verbrauch × Teilnahmefaktor", "eigendeckung", "verbrauch_tf");
  pruefe("Eigendeckung über Anteil an der Erzeugung", "eigendeckung", "anteil_erzeugung");
  pruefe("Verbrauch × TF über Verbrauch laut Messung", "verbrauch_tf", "verbrauch_gemessen");
  pruefe("Erzeugung × TF über Erzeugung laut Messung", "erzeugung_tf", "erzeugung_gemessen");
  pruefe("Restüberschuss über Erzeugung × TF", "restueberschuss", "erzeugung_tf");
  for (const [groesse, b] of Object.entries(g)) {
    let neg = 0;
    let sprung = 0;
    const grenze = maxKw ? maxKw * 0.25 * regeln.sprungFaktor : null;
    for (const x of b.werte) {
      if (x === null) continue;
      if (x < -eps) neg++;
      if (grenze !== null && x > grenze) sprung++;
    }
    if (neg) v.push({ regel: `Negative Werte (${groesse})`, viertelstunden: neg });
    if (sprung) v.push({ regel: `Sprung über der Spitzenleistung (${groesse})`, viertelstunden: sprung });
  }
  return { verstoesse: v };
}

/**
 * Ampel eines Zählpunkt-Tages.
 * @param {{tag:string, bloecke:Object<string,block>, erwartet:string[], heute:string, modell?:string, maxKw?:number}} e
 */
export function tagesAmpel({ tag, bloecke = {}, erwartet = [], heute, modell = "eeg", maxKw = null, regeln = QUALITAET_REGELN }) {
  const gruende = [];
  let ampel = "ok";
  let l3 = 0;
  let l2 = 0;
  let fehlend = 0;
  let spaetTage = 0;
  const alter = tageZwischen(tag, heute);
  const vorhanden = erwartet.filter((g) => bloecke[g]);
  if (!vorhanden.length) {
    if (alter <= regeln.lieferFristTage) return { tag, ampel: "erwartet", gruende: ["Lieferung noch innerhalb der Frist"], l3: 0, l2: 0, fehlend: 0, spaetTage: 0 };
    return { tag, ampel: "fehler", gruende: ["Keine Daten geliefert"], l3: 0, l2: 0, fehlend: werteJeTag(tag), spaetTage: 0, fehlt: true };
  }
  for (const g of erwartet) {
    const b = bloecke[g];
    if (!b) {
      ampel = schlechter(ampel, alter <= regeln.lieferFristTage ? "erwartet" : "fehler");
      gruende.push(`Größe ${g} fehlt`);
      continue;
    }
    const k = blockKennzahlen(b);
    l3 += k.l3;
    l2 += k.l2;
    fehlend += k.fehlend;
    const empf = b.erstEmpfangenAm || b.empfangenAm;
    if (empf) spaetTage = Math.max(spaetTage, tageZwischen(tag, String(empf).slice(0, 10)));
  }
  if (fehlend) {
    ampel = schlechter(ampel, "fehler");
    gruende.push(`${fehlend} Viertelstunden fehlen`);
  }
  if (l3) {
    const frist = modell === "beg" ? regeln.l3FristTageBeg : regeln.l3FristTage;
    if (alter > frist) {
      ampel = schlechter(ampel, "fehler");
      gruende.push(`L3-Werte nach Ablauf der Ersatzfrist (${frist} Tage)`);
    } else {
      ampel = schlechter(ampel, "warn");
      gruende.push(`${l3} L3-Werte (nicht abrechenbar, Ersatz bis ${plusTag(tag, frist)})`);
    }
  }
  if (spaetTage > regeln.lieferFristTage) {
    ampel = schlechter(ampel, "warn");
    gruende.push(`verspätet geliefert (nach ${spaetTage} Tagen)`);
  }
  const p = plausibilitaet(bloecke, { maxKw, regeln });
  if (p.verstoesse.length) {
    ampel = schlechter(ampel, "fehler");
    for (const x of p.verstoesse) gruende.push(`${x.regel}: ${x.viertelstunden} Viertelstunden`);
  }
  if (!gruende.length && l2) gruende.push(`${l2} Ersatzwerte L2 (abrechenbar)`);
  return { tag, ampel, gruende, l3, l2, fehlend, spaetTage };
}

/**
 * Gemeinschaftsprüfung je Viertelstunde: Σ Eigendeckung ≤ Σ Erzeugung × TF (Fachkonzept 2.5).
 * @returns {{verstoesse:number, maxUeberhangKwh:number}}
 */
export function gemeinschaftPruefen(eigendeckungen = [], erzeugungenTf = [], { epsilon = 1e-6 } = {}) {
  const n = Math.max(0, ...eigendeckungen.map((a) => a.length), ...erzeugungenTf.map((a) => a.length));
  let v = 0;
  let max = 0;
  for (let q = 0; q < n; q++) {
    let ed = 0;
    let e = 0;
    for (const a of eigendeckungen) ed += a[q] || 0;
    for (const a of erzeugungenTf) e += a[q] || 0;
    if (ed > e + epsilon) {
      v++;
      max = Math.max(max, ed - e);
    }
  }
  return { verstoesse: v, maxUeberhangKwh: max };
}

/**
 * Ersatzwerte für die VORSCHAU (nie für Belege): kurze Lücken (≤ 2 h) linear interpolieren, längere aus dem Vergleichstag
 * (gleicher Wochentag der Vorwoche), sonst 0. Gibt Werte und Art je Viertelstunde zurück.
 */
export function ersatzwerte(werte = [], { vergleich = null, maxInterpolation = 8 } = {}) {
  const out = werte.slice();
  const art = werte.map((x) => (x === null || x === undefined ? "" : "messung"));
  let i = 0;
  while (i < out.length) {
    if (out[i] !== null && out[i] !== undefined) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && (out[j] === null || out[j] === undefined)) j++;
    const laenge = j - i;
    const links = i > 0 ? out[i - 1] : null;
    const rechts = j < out.length ? out[j] : null;
    for (let k = i; k < j; k++) {
      if (laenge <= maxInterpolation && links !== null && rechts !== null) {
        out[k] = links + ((rechts - links) * (k - i + 1)) / (laenge + 1);
        art[k] = "interpoliert";
      } else if (vergleich && vergleich[k] !== null && vergleich[k] !== undefined) {
        out[k] = vergleich[k];
        art[k] = "vergleichstag";
      } else {
        out[k] = 0;
        art[k] = "null";
      }
    }
    i = j;
  }
  return { werte: out, art, ersetzt: art.filter((a) => a && a !== "messung").length };
}

/**
 * Zusammenhängende Problemzeiträume je Zählpunkt (für Reklamation/Nachforderung CR_REQ_PT).
 * @param {{zaehlpunktId, tage:{tag, ampel, gruende}[]}[]} zeilen
 */
export function reklamationsFaelle(zeilen = [], { heute, regeln = QUALITAET_REGELN } = {}) {
  const faelle = [];
  for (const z of zeilen) {
    let lauf = null;
    const tage = [...z.tage].sort((a, b) => a.tag.localeCompare(b.tag));
    for (const t of tage) {
      if (t.ampel === "fehler") {
        if (lauf && plusTag(lauf.bis) === t.tag) {
          lauf.bis = t.tag;
          for (const g of t.gruende) if (!lauf.gruende.includes(g)) lauf.gruende.push(g);
        } else {
          if (lauf) faelle.push(lauf);
          lauf = { zaehlpunktId: z.zaehlpunktId, von: t.tag, bis: t.tag, gruende: [...t.gruende] };
        }
      } else if (lauf) {
        faelle.push(lauf);
        lauf = null;
      }
    }
    if (lauf) faelle.push(lauf);
  }
  return faelle.map((f) => ({ ...f, tage: tageZwischen(f.von, f.bis) + 1, fristBis: heute ? plusTag(heute, regeln.reklamationFristTage) : "", art: f.gruende.some((g) => /fehlen|Keine Daten|fehlt/.test(g)) ? "nachforderung" : "klaerung" }));
}

/** Lieferstatistik je Netzbetreiber: Verzögerung (Tage zwischen Tag und erster Lieferung) – Mittel, Median, Anteil verspätet */
export function lieferstatistik(lieferungen = [], { regeln = QUALITAET_REGELN } = {}) {
  const je = new Map();
  for (const l of lieferungen) {
    if (!l.empfangenAm) continue;
    const d = tageZwischen(l.tag, String(l.empfangenAm).slice(0, 10));
    if (!je.has(l.netzbetreiberId)) je.set(l.netzbetreiberId, []);
    je.get(l.netzbetreiberId).push(d);
  }
  return [...je.entries()].map(([netzbetreiberId, d]) => {
    const s = d.slice().sort((a, b) => a - b);
    const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    return { netzbetreiberId, lieferungen: s.length, mittelTage: s.reduce((a, b) => a + b, 0) / s.length, medianTage: median, maxTage: s[s.length - 1], verspaetetPct: (s.filter((x) => x > regeln.lieferFristTage).length / s.length) * 100 };
  }).sort((a, b) => a.netzbetreiberId.localeCompare(b.netzbetreiberId));
}

/** Monatsübersicht aus Tagesampeln: Anteile und Gesamtampel (Leitstand) */
export function qualitaetsZusammenfassung(zeilen = []) {
  const z = { ok: 0, erwartet: 0, warn: 0, fehler: 0 };
  let gesamt = "ok";
  for (const r of zeilen) for (const t of r.tage) {
    if (z[t.ampel] === undefined) continue;
    z[t.ampel]++;
    gesamt = schlechter(gesamt, t.ampel === "erwartet" ? "ok" : t.ampel);
  }
  const n = z.ok + z.erwartet + z.warn + z.fehler;
  return { zaehler: z, tage: n, quoteOk: n ? (z.ok + z.erwartet) / n : 1, ampel: gesamt, abrechenbar: z.fehler === 0 && z.warn === 0 && n > 0 };
}

/** Text einer Reklamation an den Netzbetreiber (Beschwerdeakte, Export für die E-Control-Schlichtung) */
export function reklamationsText({ zaehlpunktnummer, netzbetreiber = "", gemeinschaft = "", gemeinschaftsId = "", von, bis, gruende = [] }) {
  return [
    `Betreff: Energiedaten Energiegemeinschaft – Nachforderung bzw. Klärung ${zaehlpunktnummer} (${von} bis ${bis})`,
    "",
    `Sehr geehrte Damen und Herren${netzbetreiber ? ` der ${netzbetreiber}` : ""},`,
    "",
    `für den Zählpunkt ${zaehlpunktnummer} der Gemeinschaft ${gemeinschaft}${gemeinschaftsId ? ` (Gemeinschafts-ID ${gemeinschaftsId})` : ""} liegen für den Zeitraum ${von} bis ${bis} keine vollständigen bzw. abrechenbaren Viertelstundenwerte vor:`,
    ...gruende.map((g) => `– ${g}`),
    "",
    "Wir bitten um Lieferung bzw. Korrektur der Werte über EDA (CR_MSG). Eine Nachforderung (CR_REQ_PT) wurde gestellt. L3-Werte sind nach HA II nicht abrechenbar und spätestens nach 60 Tagen (BEG/VEZ: 15 Kalendertage) durch L1/L2 zu ersetzen.",
    "",
    "Mit freundlichen Grüßen",
  ].join("\n");
}
