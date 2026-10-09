// src/lib/sprache – Sprachen, Übersetzungs-Schnittstelle, Register der übersetzten Seiten.
//   sprachen.js     Sprachcodes, Präfix /en, Cookie „sprache“ (nur nach aktiver Wahl)
//   woerterbuch.js  uebersetze(), inhaltFuerSprache(), fehlendeTexte() – für die Übersetzer-Teams
//   seiten.js       UEBERSETZT (index/noindex der englischen Fassungen), EN_LAENDERINHALT
//   format.js       fmtZahl(), datumText()
//   route.js        Server: englische Routen (nur von den erzeugten Routen genutzt, nicht hier exportiert)
// Pfade, canonical und hreflang beider Sprachen stehen in src/lib/land/pfad.js.
export * from "./sprachen.js";
export * from "./woerterbuch.js";
export * from "./seiten.js";
export * from "./format.js";
export * from "./begriffe.js";
