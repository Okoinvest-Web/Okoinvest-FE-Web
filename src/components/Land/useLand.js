"use client";

// Land im Browser: aus der Route (/de, /at, /ch) oder – auf Stammseiten – aus der aktiven
// Länderwahl (Cookie „land“, erst nach Klick gesetzt). Ohne beides: Deutschland.
// Das Cookie wird nur nach dem ersten Rendern gelesen (keine Hydration-Abweichung).

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { landAusCookie, landAusPfad, landCookieZeile } from "@/lib/land";

/** Aktive Länderwahl speichern – nur aus einem Klick heraus aufrufen. */
export function landWaehlen(code) {
  const zeile = landCookieZeile(code, { https: typeof location !== "undefined" && location.protocol === "https:" });
  if (zeile) document.cookie = zeile;
}

export default function useLand() {
  const pfad = usePathname() || "/";
  const routenLand = landAusPfad(pfad).land;
  const [gewaehlt, setGewaehlt] = useState(null);
  useEffect(() => {
    setGewaehlt(landAusCookie(document.cookie));
  }, [pfad]);
  const waehlen = useCallback((code) => {
    landWaehlen(code);
    setGewaehlt(code);
  }, []);
  return { pfad, routenLand, gewaehlt, land: routenLand || gewaehlt || "DE", waehlen };
}
