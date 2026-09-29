// src/lib/rechner/annahmen.js
//
// Formatierung für alle Rechner. Die fachlichen Marktannahmen stehen in
// src/lib/invest/markt.js – hier nur Zahlenformate (de-DE).

export { STAND } from "../invest/markt.js";

export const fmt = (n, stellen = 0) =>
  Number.isFinite(n) ? n.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }) : "–";
export const fmtEur = (n) => `${fmt(Math.round(n))} €`;
export const fmtMio = (n, stellen = 1) => `${fmt(n / 1e6, stellen)} Mio. €`;
export const fmtPct = (n, stellen = 1) => `${fmt(n * 100, stellen)} %`;
export const fmtCt = (n, stellen = 1) => `${fmt(n, stellen)} ct/kWh`;
