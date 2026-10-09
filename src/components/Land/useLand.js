"use client";

// Land im Browser (Ländermodell):
//   land      Land der Seite aus dem Root-Layout ("DE" | "AT" | "CH") oder null = gemeinsame Seite
//   gewaehlt  aktive Länderwahl aus dem Cookie „land“ (erst nach dem ersten Rendern gelesen,
//             keine Hydration-Abweichung) – nur für Anzeige, nie für Inhalte
//   waehlen   Länderwahl speichern (nur aus einem Klick heraus)
// Inhalte richten sich IMMER nach `land` (der URL), nie nach dem Cookie.

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { landAusCookie, landCookieZeile } from "@/lib/land";
import { useSeitenLand } from "./LandKontext";

/** Aktive Länderwahl speichern – nur aus einem Klick heraus aufrufen. */
export function landWaehlen(code) {
  const zeile = landCookieZeile(code, { https: typeof location !== "undefined" && location.protocol === "https:" });
  if (zeile) document.cookie = zeile;
}

/**
 * Startwerte eines Rechners für das Land der Seite: AT/CH wählen die Region bzw. das Land vor
 * (die Länder-Engine sperrt dann ungeprüfte Werte, src/lib/invest/laender/sperre.js).
 * Gemeinsame Seite und DE: Startwerte unverändert (wie vor Welle 2).
 * @param {object} standard z. B. { regionId: "de-sued", … } oder { land: "DE" | "de", … }
 * @param {string|null} land
 */
export function landStart(standard, land) {
  if (!standard || !land || land === "DE") return standard;
  const s = { ...standard };
  if (typeof s.regionId === "string") s.regionId = land.toLowerCase();
  if (typeof s.land === "string") s.land = s.land === s.land.toLowerCase() ? land.toLowerCase() : land;
  return s;
}

export default function useLand() {
  const pfad = usePathname() || "/";
  const land = useSeitenLand();
  const [gewaehlt, setGewaehlt] = useState(null);
  useEffect(() => {
    setGewaehlt(landAusCookie(document.cookie));
  }, [pfad]);
  const waehlen = useCallback((code) => {
    landWaehlen(code);
    setGewaehlt(code);
  }, []);
  return { pfad, land, routenLand: land, gewaehlt, waehlen };
}
