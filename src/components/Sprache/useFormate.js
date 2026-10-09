"use client";

// Zahlen- und Geldformate in der Sprache der Seite (Client). Regeln: src/lib/sprache/zahlformat.js
//   const f = useFormate();  f.fmt(1234.5, 1) · f.fmtEur(1234) · f.tsd(12500) · f.fmtPct(0.05)

import { useSprache } from "./SpracheKontext";
import { formate } from "@/lib/sprache/zahlformat";

export function useFormate() {
  return formate(useSprache());
}
