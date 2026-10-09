"use client";

// Sprache der Seite im Browser (Sprachmodell). Das Root-Layout setzt sie serverseitig:
//   src/app/(stamm)/layout.js, src/app/(laender)/[land]/layout.js → "de"
//   src/app/(en)/layout.js                                       → "en"
// So stimmen Server-HTML und Hydration überein; jede Client-Komponente kennt die Sprache, ohne
// die URL selbst auszuwerten. Texte: useTexte(TEXTE) mit Wörterbuch { de, en }
// (Regeln in src/lib/sprache/woerterbuch.js).

import { createContext, useCallback, useContext } from "react";
import { sprachCookieZeile } from "@/lib/sprache/sprachen";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const SpracheKontext = createContext("de");

export function SpracheProvider({ sprache = "de", children }) {
  return <SpracheKontext.Provider value={sprache === "en" ? "en" : "de"}>{children}</SpracheKontext.Provider>;
}

/** "de" | "en" */
export function useSprache() {
  return useContext(SpracheKontext);
}

/** Wörterbuch { de, en } in der Sprache der Seite (Rückfall Deutsch). */
export function useTexte(texte) {
  return uebersetze(texte, useContext(SpracheKontext));
}

/** Aktive Sprachwahl speichern – nur aus einem Klick heraus aufrufen. */
export function spracheWaehlen(code) {
  const zeile = sprachCookieZeile(code, { https: typeof location !== "undefined" && location.protocol === "https:" });
  if (zeile) document.cookie = zeile;
}

export function useSpracheWaehlen() {
  return useCallback((code) => spracheWaehlen(code), []);
}
