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

/*
 * Format je Land (Welle 2, Paket B1): DE/AT in Euro, CH in Franken (CHF, Rp.).
 *   fmtGeldLand(1234, "CH") → „CHF 1’234“, fmtCtLand(4.8, "CH") → „4.8 Rp./kWh“
 * Die Funktionen oben bleiben unverändert (Euro, de-DE).
 */
export { fmtGeld as fmtGeldLand, fmtKleinbetrag as fmtCtLand, fmtZahl as fmtLand, waehrungFuer, einheitFuer } from "../fakten/waehrung.js";
