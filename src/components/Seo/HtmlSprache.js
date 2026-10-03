"use client";

// Setzt <html lang> passend zur Route (Paket I, Masterplan S2: lang je Sprache).
//
// Das Root-Layout rendert lang="de" für alle Seiten; ein eigenes Root-Layout
// für /en (Route Groups) gehört zum Länder-Umbau in Welle 2. Bis dahin
// korrigiert diese Komponente das Attribut im Browser – auch bei Navigation
// ohne Neuladen, weil das Root-Layout dabei nicht neu gerendert wird. Der
// englische Inhalt ist serverseitig zusätzlich per <div lang="en">
// (src/app/en/layout.js) ausgezeichnet.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { spracheFuerPfad } from "@/lib/indexsteuerung";

export default function HtmlSprache() {
  const pfad = usePathname();
  useEffect(() => {
    const lang = spracheFuerPfad(pfad);
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
  }, [pfad]);
  return null;
}
