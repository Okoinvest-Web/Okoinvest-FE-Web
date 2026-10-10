// Zentrale, sichere Ausgabe von strukturierten Daten (JSON-LD, schema.org).
//
// Warum: JSON.stringify escapt kein "<". Steht in einem Wert (z. B. Projekttitel aus
// Anbietereingaben) "</script><script>…", beendet der Browser den Script-Block und führt
// den Rest aus (gespeicherte XSS). Siehe docs/MASTERPLAN-DACH.md Abschnitt 3, Befund 7.
//
// Bewusst ohne JSX (React.createElement), damit die Datei auch direkt mit
// `node --test` importierbar ist. Kein "use client": Server-Komponente, rendert reines HTML.
// Test: node --test src/components/JsonLd.test.mjs

import { createElement } from "react";
import { jsonLdFuer, landDerAusgabe } from "../lib/land/schreibweise.js";

// Zeichen, die im HTML-Kontext eines <script>-Blocks gefährlich sind, als JSON-Unicode-Escapes.
// Die Escapes sind gültiges JSON und ergeben nach JSON.parse exakt den Originaltext.
// - "<" verhindert "</script>" und "<!--"
// - ">" verhindert "-->" sowie Fehlinterpretation in Parsern
// - "&" verhindert Entity-Deutung, falls der Inhalt einmal als XHTML/Attribut landet
// - U+2028/U+2029 sind in JSON erlaubt, waren in älteren JS-Engines aber Zeilenumbrüche
// Als Codepunkte notiert, damit keine unsichtbaren Zeichen im Quelltext stehen.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const ERSATZ = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LS]: "\\u2028",
  [PS]: "\\u2029",
};
const MUSTER = new RegExp(`[<>&${LS}${PS}]`, "g");

/**
 * Serialisiert Daten als JSON und escapt alle für einen `<script>`-Block gefährlichen Zeichen.
 *
 * @param {object|object[]} daten  schema.org-Objekt oder Liste von Objekten (ein `@graph`
 *                                 ist ebenfalls einfach ein Objekt).
 * @returns {string} sicherer Text für den Inhalt von `<script type="application/ld+json">`.
 * @throws {TypeError} wenn `daten` nicht als JSON darstellbar ist (z. B. `undefined`, Funktion,
 *                     zirkuläre Struktur, BigInt) – lieber laut scheitern als leeres JSON-LD.
 */
export function jsonLdText(daten) {
  const json = JSON.stringify(daten);
  if (typeof json !== "string") {
    throw new TypeError("JsonLd: daten sind nicht als JSON darstellbar");
  }
  return json.replace(MUSTER, (z) => ERSATZ[z]);
}

/**
 * Gibt strukturierte Daten als `<script type="application/ld+json">` aus – immer escapt.
 *
 * Einzige erlaubte Stelle für JSON-LD auf der Website. Keine eigenen
 * `dangerouslySetInnerHTML`-Blöcke mit `JSON.stringify` mehr anlegen.
 *
 * @example
 * import JsonLd from "@/components/JsonLd";
 *
 * <JsonLd daten={{ "@context": "https://schema.org", "@type": "Service", name: titel }} />
 * <JsonLd daten={[organisation, breadcrumb]} />          // mehrere Objekte in einem Block
 * <JsonLd daten={faq} id="faq-jsonld" />                 // optionale id
 * <JsonLd daten={faq} nonce={nonce} />                   // für eine spätere Nonce-CSP (Paket A)
 *
 * @param {object} props
 * @param {object|object[]|null|undefined} props.daten  Inhalt; `null`/`undefined` rendert nichts.
 * @param {string} [props.id]     optionales id-Attribut des Script-Elements.
 * @param {string} [props.nonce]  optionaler CSP-Nonce.
 * @param {string|null} [props.land]  Land der Seite ("CH" → Texte ohne „ß“). Ohne Angabe gilt in Server-Komponenten
 *                                 das Land der laufenden Anfrage; Client-Komponenten geben es mit (useSeitenLand()).
 * @returns {import("react").ReactElement|null}
 */
export default function JsonLd({ daten, id, nonce, land }) {
  if (daten === null || daten === undefined) return null;
  return createElement("script", {
    type: "application/ld+json",
    id,
    nonce,
    dangerouslySetInnerHTML: { __html: jsonLdText(jsonLdFuer(daten, land === undefined ? landDerAusgabe() : land)) },
  });
}

export { JsonLd };
