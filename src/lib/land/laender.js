// src/lib/land/laender.js – die drei Länderzonen (Welle 2, Länderrouting, Masterplan Abschnitt 4)
//
// Einzige Quelle für Ländercode, URL-Präfix, Sprache (BCP 47 für <html lang> und hreflang),
// og:locale und Währung. Namen und länderbezogene Kontaktangaben kommen aus src/data/site.js
// (LAENDER_ANGABEN), die Währung aus dem Faktenregister (B1, src/lib/fakten/waehrung.js).
//
// Relative Importe mit Dateiendung: Das Modul wird auch von next.config.mjs (über umzug.js)
// und von node:test ohne Alias-Auflösung geladen.

import { LAENDER_ANGABEN } from "../../data/site.js";
import { waehrungFuer } from "../fakten/waehrung.js";

/** Reihenfolge = Anzeige im Länderwechsler. DE zuerst (größter Markt, x-default der Länderzonen). */
export const LAND_CODES = Object.freeze(["DE", "AT", "CH"]);

const BASIS = {
  DE: { praefix: "de", lang: "de-DE", ogLocale: "de_DE" },
  AT: { praefix: "at", lang: "de-AT", ogLocale: "de_AT" },
  CH: { praefix: "ch", lang: "de-CH", ogLocale: "de_CH" },
};

export const LAENDER = Object.freeze(
  Object.fromEntries(
    LAND_CODES.map((code) => [
      code,
      Object.freeze({ code, ...BASIS[code], ...LAENDER_ANGABEN[code], waehrung: waehrungFuer(code), einstieg: `/${BASIS[code].praefix}` }),
    ]),
  ),
);

/** "de" | "DE" | " at " → "DE" | "AT"; alles andere → null */
export function landCode(wert) {
  const s = typeof wert === "string" ? wert.trim().toUpperCase() : "";
  return LAND_CODES.includes(s) ? s : null;
}

/** URL-Präfix ("de") → Ländercode ("DE"); nur exakt kleingeschriebene Präfixe sind gültig. */
export function landAusPraefix(praefix) {
  if (typeof praefix !== "string") return null;
  return LAND_CODES.find((c) => BASIS[c].praefix === praefix) || null;
}

/** Länderinfo; unbekannt → null */
export const landInfo = (wert) => LAENDER[landCode(wert)] || null;

/** Einstiegsseite eines Landes ("/de"); unbekannt → null */
export const einstiegPfad = (wert) => landInfo(wert)?.einstieg || null;

/** Präfix-Muster am Pfadanfang: "/de", "/de/…", "/at…" */
export const PRAEFIX_MUSTER = /^\/(de|at|ch)(?=\/|$|\?|#)/;
