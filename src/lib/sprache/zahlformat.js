// src/lib/sprache/zahlformat.js – Zahlen- und Geldformate der Rechner je Sprache
//
// Gleiche Signaturen wie fmt/fmtEur/fmtMio/fmtPct/fmtCt aus src/lib/rechner/annahmen.js (die dort
// bleiben unverändert deutsch). Für Englisch gilt britische Schreibweise:
//   fmt(1234.5, 1)  "1.234,5" → "1,234.5"      fmtEur(1234)  "1.234 €"  → "€1,234"
//   fmtMio(2.4e6)   "2,4 Mio. €" → "€2.4m"     fmtPct(0.051) "5,1 %"    → "5.1%"
//   tsd(12500)      "12,5 Tsd. €" → "€12.5k"   fmtCt(4.8)    "4,8 ct/kWh" → "4.8 ct/kWh"
// Nutzung: const f = formate(sprache)  (Client: useFormate() aus src/components/Sprache/useFormate.js)

import { fmtZahl } from "./format.js";

const MINUS = "-";

function deutsch() {
  const fmt = (n, stellen = 0) => fmtZahl(n, stellen, "de");
  return {
    sprache: "de",
    fmt,
    fmtEur: (n) => `${fmt(Math.round(n))} €`,
    fmtMio: (n, stellen = 1) => `${fmt(n / 1e6, stellen)} Mio. €`,
    fmtPct: (n, stellen = 1) => `${fmt(n * 100, stellen)} %`,
    fmtCt: (n, stellen = 1) => `${fmt(n, stellen)} ct/kWh`,
    tsd: (n, stellen = 0) => `${fmt(n / 1000, stellen)} Tsd. €`,
    /** Prozentzahl, die schon in % vorliegt: 5.1 → "5,1 %" */
    pct: (n, stellen = 0) => `${fmt(n, stellen)} %`,
    /** Betrag mit Einheit nach dem Euro: eur(2400, "/ha") → "2.400 €/ha" */
    eur: (n, einheit = "", stellen = 0) => `${fmt(n, stellen)} €${einheit}`,
  };
}

function englisch() {
  const fmt = (n, stellen = 0) => fmtZahl(n, stellen, "en");
  const geld = (n, stellen = 0, einheit = "") => {
    if (!Number.isFinite(Number(n))) return "–";
    const x = Number(n);
    return `${x < 0 ? MINUS : ""}€${fmt(Math.abs(x), stellen)}${einheit}`;
  };
  return {
    sprache: "en",
    fmt,
    fmtEur: (n) => geld(Math.round(n)),
    fmtMio: (n, stellen = 1) => geld(n / 1e6, stellen, "m"),
    fmtPct: (n, stellen = 1) => `${fmt(n * 100, stellen)}%`,
    fmtCt: (n, stellen = 1) => `${fmt(n, stellen)} ct/kWh`,
    tsd: (n, stellen = 0) => geld(n / 1000, stellen, "k"),
    pct: (n, stellen = 0) => `${fmt(n, stellen)}%`,
    eur: (n, einheit = "", stellen = 0) => geld(n, stellen, einheit),
  };
}

const DE = deutsch();
const EN = englisch();

/** Formatierer für "de" | "en" (Rückfall Deutsch). */
export const formate = (sprache) => (sprache === "en" ? EN : DE);
