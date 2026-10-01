// Datenvisualisierungs-Palette des Design-Systems 2.0 (siehe docs/DESIGN.md).
// Nur Markenskalen; Kontraste gegen Weiß bzw. navy-950 geprüft.
// Regeln: max. 4 Kategorien je Diagramm (Rest = „Sonstige“ in ink-300),
// immer direkte Beschriftung oder Legende + Tooltip-Werte, nie nur Farbe
// (Linienstil/Marker als zweites Merkmal), Sonne nie als Text auf Weiß.

/** Kategorien auf hellem Grund – Reihenfolge = Zuweisungsreihenfolge. */
export const KATEGORIE_HELL = [
  "#003473", // navy-700 · 12.1:1
  "#669933", // ov-500   ·  3.4:1 (Grafik ≥ 3:1)
  "#c98500", // sun-600  ·  3.1:1
  "#4a7cbd", // navy-400 ·  4.3:1
  "#37521e", // ov-800   ·  8.8:1
  "#6b7486", // ink-500  ·  4.7:1
];

/** Kategorien auf dunklem Grund (navy-950 / --ov-nacht-1). */
export const KATEGORIE_DUNKEL = [
  "#aed083", // ov-300   · 10.8:1
  "#7fa7d6", // navy-300 ·  7.5:1
  "#ffd873", // sun-300  · 13.6:1
  "#e8806f", // danger-300 · 6.9:1 (nur, wenn keine Fehler-Bedeutung kollidiert)
  "#c4cad5", // ink-300  · 11.3:1
];

/** Zweites Unterscheidungsmerkmal je Kategorie (Linienstil für SVG stroke-dasharray). */
export const LINIENSTIL = ["", "6 4", "2 3", "10 3 2 3", "", "4 4"];

/** Sequenziell (Menge, Dichte, Auslastung) – hell nach dunkel. */
export const SEQUENZ_GRUEN = ["#f4f9ee", "#e6f1d8", "#cde3b1", "#aed083", "#8cba58", "#669933", "#558227", "#436621", "#37521e"];
export const SEQUENZ_NAVY = ["#eef4fb", "#d9e6f5", "#b2cbe9", "#7fa7d6", "#4a7cbd", "#1f5aa1", "#0b4488", "#003473", "#03285a"];

/** Divergierend (Abweichung von Plan/Mittel): Navy ↔ Sonne – farbenblind-sicher (kein Rot-Grün). */
export const DIVERGIEREND = ["#003473", "#4a7cbd", "#b2cbe9", "#eef0f4", "#ffe49a", "#f5a70f", "#8a5a00"];

/** Feste Bedeutungen im Energiekontext – überall gleich verwenden. */
export const ENERGIE = {
  erzeugung: "#f5a70f", // PV-Erzeugung (Sonne) – als Fläche/Balken, Beschriftung in ink-900
  verbrauch: "#003473", // Last / Verbrauch
  eigenverbrauch: "#669933",
  einspeisung: "#8cba58",
  netzbezug: "#6b7486",
  speicherLaden: "#4a7cbd",
  speicherEntladen: "#7fa7d6",
  prognose: "#97a0b0", // gestrichelt
  plan: "#97a0b0", // Soll-Linie, gestrichelt
};

/** Semantik für Status-Diagramme (Ampel immer mit Text/Icon kombinieren). */
export const STATUS = {
  success: "#669933",
  warn: "#c98500",
  danger: "#b8352a",
  info: "#1f5aa1",
  neutral: "#97a0b0",
};

/** Achsen, Raster, Beschriftung. */
export const ACHSE = {
  hell: { raster: "#eef0f4", achse: "#dfe3ea", text: "#6b7486", textStark: "#151a24" },
  dunkel: { raster: "rgba(255,255,255,0.08)", achse: "rgba(255,255,255,0.18)", text: "rgba(255,255,255,0.65)", textStark: "#ffffff" },
};

/** Farbe für Index i (zyklisch) – hell oder dunkel. */
export function kategorieFarbe(i, dunkel = false) {
  const p = dunkel ? KATEGORIE_DUNKEL : KATEGORIE_HELL;
  return p[((i % p.length) + p.length) % p.length];
}

/** Zahl deutsch formatiert (für aria-Labels und Tooltips in Diagrammen). */
export function fmtZahl(v, stellen = Math.abs(v) < 10 && v % 1 ? 1 : 0) {
  return Number(v).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}
