"use client";

// Text in der Sprache der Seite – für Bausteine, die in Server- UND Client-Komponenten laufen
// (ohne eigenen Hook): <T de="Persönlich anfragen" en="Ask us directly" />.
// Fehlt "en", bleibt der deutsche Text (Rückfall wie in src/lib/sprache/woerterbuch.js).
// Nur für sichtbaren Text; Attribute (aria-label …) brauchen eine Client-Komponente mit useTexte().

import { useSprache } from "./SpracheKontext";

export default function T({ de, en }) {
  return useSprache() === "en" && en != null ? en : de;
}
