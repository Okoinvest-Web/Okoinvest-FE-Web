// src/components/diagramme/skala.js
//
// Reine Rechenhelfer des Chart-Systems (ohne React, server- und client-tauglich):
// „schöne“ Achsen, Skalen, Pfade, Beschriftungs-Ausdünnung ohne Überlappung, Zahlenformat, CSV.
// Keine Fachlogik – nur Geometrie und Darstellung.

import { ACHSE, fmtZahl } from "@/components/ui/datenfarben";

/** Schriftgrößen (px) – Achsen 12 px laut DESIGN.md § 7, nie kleiner. */
export const SCHRIFT = { achse: 12, wert: 12, familie: "Inter, ui-sans-serif, system-ui, sans-serif" };
export const RASTER = ACHSE.hell;

/** Grobe Textbreite in px (Inter, tabellarische Ziffern) – reicht für Kollisionsprüfung. */
export function textBreite(text, px = SCHRIFT.achse) {
  let b = 0;
  for (const z of String(text ?? "")) b += z >= "0" && z <= "9" ? 0.6 : z === " " || z === "." || z === "," ? 0.3 : z !== z.toLowerCase() || z === "m" || z === "w" ? 0.7 : 0.55;
  return b * px;
}

/** „Schöne“ Achse: { von, bis, schritt, ticks[] } – Schritte 1/2/2,5/5 × 10^n. */
export function achse(min, max, anzahl = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { von: 0, bis: 1, schritt: 1, ticks: [0, 1] };
  if (min === max) {
    if (min === 0) max = 1;
    else {
      min = Math.min(0, min);
      max = Math.max(0, max);
      if (min === max) max = min + 1;
    }
  }
  const roh = (max - min) / Math.max(1, anzahl);
  const p = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * p).find((s) => s >= roh * 0.999) || 10 * p;
  const von = Math.floor(min / schritt + 1e-9) * schritt;
  const bis = Math.ceil(max / schritt - 1e-9) * schritt;
  const ticks = [];
  for (let t = von; t <= bis + schritt / 2; t += schritt) ticks.push(Math.round(t * 1e6) / 1e6);
  return { von, bis, schritt, ticks };
}

/** Lineare Skala Daten → Pixel. */
export function linear([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  const f = (v) => r0 + ((v - d0) / span) * (r1 - r0);
  f.invers = (px) => d0 + ((px - r0) / (r1 - r0 || 1)) * span;
  return f;
}

/** Stellen für Achsenbeschriftung aus der Schrittweite. */
export const stellenFuer = (schritt) => (schritt >= 1 ? 0 : schritt >= 0.1 ? 1 : 2);

/** Kompakte Achsenzahl: 12.500 → „12,5 Tsd.“, nur wenn nötig. */
export function achsenText(v, schritt) {
  const a = Math.abs(v);
  if (a >= 1e6 && schritt >= 1e5) return `${fmtZahl(v / 1e6, schritt >= 1e6 ? 0 : 1)} Mio.`;
  if (a >= 1e4 && schritt >= 1e3) return `${fmtZahl(v / 1e3, schritt >= 1e4 || schritt % 1e3 === 0 ? 0 : 1)} Tsd.`;
  return minus(fmtZahl(v, stellenFuer(schritt)));
}

/** Echtes Minuszeichen (U+2212) statt Bindestrich. */
export const minus = (s) => String(s).replace(/^-/, "−");

/** Zahl für Tooltip/Tabelle (deutsch, Minus U+2212). */
export function wertText(v, { stellen, einheit } = {}) {
  if (v == null || !Number.isFinite(Number(v))) return "–";
  const n = Number(v);
  const s = stellen ?? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : n % 1 ? 2 : 0);
  return `${minus(fmtZahl(n, s))}${einheit ? ` ${einheit}` : ""}`;
}

/**
 * Beschriftungen ausdünnen, bis sich keine überlappen.
 * eintraege: [{ pos (px), text }] → gefilterte Liste (erstes bleibt, gleichmäßige Abstände).
 */
export function ausduennen(eintraege, { px = SCHRIFT.achse, luecke = 10 } = {}) {
  if (eintraege.length < 2) return eintraege;
  const maxB = Math.max(...eintraege.map((e) => textBreite(e.text, px)));
  const abst = Math.abs(eintraege[1].pos - eintraege[0].pos) || 1;
  const jede = Math.max(1, Math.ceil((maxB + luecke) / abst));
  return eintraege.filter((_, i) => i % jede === 0);
}

/** Linienpfad aus [[x, y] | null]; Lücken (null/NaN) unterbrechen. treppe: Stufen. */
export function linienPfad(punkte, { treppe = false, stufenBreite = 0 } = {}) {
  let d = "";
  let offen = false;
  let letzteX = 0;
  for (const p of punkte) {
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      if (offen && treppe && stufenBreite) d += `H${(letzteX + stufenBreite).toFixed(1)}`;
      offen = false;
      continue;
    }
    const x = p[0].toFixed(1);
    const y = p[1].toFixed(1);
    if (!offen) d += `M${x},${y}`;
    else d += treppe ? `H${x}V${y}` : `L${x},${y}`;
    offen = true;
    letzteX = p[0];
  }
  if (offen && treppe && stufenBreite) d += `H${(letzteX + stufenBreite).toFixed(1)}`;
  return d;
}

/** Fläche zwischen oberer Linie und unterer (Basis-Zahl oder Punktliste) – je zusammenhängendem Abschnitt. */
export function flaechenPfad(oben, unten, { treppe = false, stufenBreite = 0 } = {}) {
  const abschnitte = [];
  let akt = [];
  oben.forEach((p, i) => {
    const u = Array.isArray(unten) ? unten[i] : [p?.[0], unten];
    if (p && Number.isFinite(p[1]) && u && Number.isFinite(u[1])) akt.push([p, u]);
    else if (akt.length) {
      abschnitte.push(akt);
      akt = [];
    }
  });
  if (akt.length) abschnitte.push(akt);
  return abschnitte
    .map((a) => {
      const o = linienPfad(a.map(([p]) => p), { treppe, stufenBreite });
      const ende = treppe && stufenBreite ? a[a.length - 1][0][0] + stufenBreite : a[a.length - 1][0][0];
      let rueck = `L${ende.toFixed(1)},${a[a.length - 1][1][1].toFixed(1)}`;
      for (let i = a.length - 1; i >= 0; i--) {
        const [ux, uy] = a[i][1];
        rueck += treppe ? `V${uy.toFixed(1)}H${ux.toFixed(1)}` : `L${ux.toFixed(1)},${uy.toFixed(1)}`;
      }
      return `${o}${rueck}Z`;
    })
    .join("");
}

/** Gestaffelte Einlauf-Verzögerung: höchstens ~0,7 s über alle Elemente. */
export const staffel = (i, n) => (n > 18 ? (i * 18) / n : i).toFixed(2);

/** Kreisbogen (Donut-Segment / Gauge) als Pfad; Winkel in Radiant, 0 = oben, im Uhrzeigersinn. */
export function bogen(cx, cy, rAussen, rInnen, a0, a1) {
  const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const gross = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(rAussen, a0);
  const [x1, y1] = p(rAussen, a1);
  const [x2, y2] = p(rInnen, a1);
  const [x3, y3] = p(rInnen, a0);
  const f = (n) => n.toFixed(2);
  return `M${f(x0)},${f(y0)}A${rAussen},${rAussen} 0 ${gross} 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${rInnen},${rInnen} 0 ${gross} 0 ${f(x3)},${f(y3)}Z`;
}

/** Offener Bogen (für Strich-Animation mit pathLength). */
export function bogenLinie(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/** CSV (Semikolon, Dezimalkomma, BOM für Excel) aus { kopf: [], zeilen: [[]] }. */
export function csvAus({ kopf = [], zeilen = [] }) {
  const zelle = (v) => {
    const s = typeof v === "number" ? (Number.isFinite(v) ? String(v).replace(".", ",") : "") : String(v ?? "");
    return s.includes(";") || s.includes('"') || s.includes("\n") ?`"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [kopf, ...zeilen].map((z) => z.map(zelle).join(";")).join("\r\n");
}

/** Dateiname aus Titel. */
export const dateiName = (t) =>
  String(t || "diagramm")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\W+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "diagramm";
