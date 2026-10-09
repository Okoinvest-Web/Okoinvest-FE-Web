"use client";

// Land der Seite im Browser (Ländermodell). Das Root-Layout setzt es serverseitig:
//   src/app/(stamm)/layout.js           → null (gemeinsame Seite, keine Länderwahl in der URL)
//   src/app/(laender)/[land]/layout.js  → "DE" | "AT" | "CH"
//   src/app/(en)/layout.js              → aus dem Pfad (/en/at/… → "AT", /en/… → null)
// So stimmen Server-HTML und Hydration überein, und jede Client-Komponente kennt das Land.

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { LAND_AUS_PFAD, landAusPfad } from "@/lib/land";

const LandKontext = createContext(null);

export function LandProvider({ land = null, children }) {
  const pathname = usePathname() || "/";
  const wert = land === LAND_AUS_PFAD ? landAusPfad(pathname).land : land;
  return <LandKontext.Provider value={wert}>{children}</LandKontext.Provider>;
}

/** "DE" | "AT" | "CH" | null (gemeinsame Seite) */
export function useSeitenLand() {
  return useContext(LandKontext);
}
