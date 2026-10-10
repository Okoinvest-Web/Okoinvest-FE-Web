// Schweizer Schreibweise für fest geschriebenes JSX (W3-0) – ohne Hooks, also in Server- und
// Client-Komponenten nutzbar. Ergänzt src/lib/land/schreibweise.js (Texte in Wörterbüchern):
// Komponenten, die ihre Texte direkt im JSX tragen, geben ihr Ergebnis einmal hindurch:
//
//   return schreibweiseBaum(<Section>…</Section>, land);   // land "CH" → ohne „ß“, sonst unverändert
//
// Umgeschrieben werden Text-Kinder und Text-Props (title, lead, aria-label, alt …) aller Elemente im
// zurückgegebenen Baum. Was eine eingebettete Komponente selbst rendert, erreicht der Baum nicht –
// dafür gibt diese Komponente ihr Ergebnis selbst hindurch. Technische Props bleiben unberührt.
// Ganze Seiten der Schweizer Länderfassung laufen zusätzlich zentral durch schreibweiseSeite()
// (./SchweizSeite.js über ./LandSeite.js) – dort werden auch eingebettete Server-Bausteine erreicht.

import { cloneElement, isValidElement } from "react";
import { landCode } from "@/lib/land/laender";
import { ohneEszett } from "@/lib/land/schreibweise";

const TECHNISCH = new Set(["children", "href", "src", "id", "slug", "schluessel", "typ", "className", "style", "name", "value", "type", "htmlFor", "d", "key", "ref", "as", "role"]);

function liste(arr, tiefe) {
  let geaendert = false;
  const out = arr.map((k) => {
    const n = baum(k, tiefe + 1);
    if (n !== k) geaendert = true;
    return n;
  });
  return geaendert ? out : arr;
}

function baum(knoten, tiefe) {
  if (typeof knoten === "string") return ohneEszett(knoten);
  if (tiefe > 40 || knoten === null || typeof knoten !== "object") return knoten;
  if (Array.isArray(knoten)) return liste(knoten, tiefe);
  if (!isValidElement(knoten)) {
    // schlichte Objekte in Props (z. B. pill={{ text: "…" }}): Texte umschreiben
    if (knoten.$$typeof || Object.getPrototypeOf(knoten) !== Object.prototype) return knoten;
    let anders = false;
    const out = {};
    for (const k of Object.keys(knoten)) {
      out[k] = TECHNISCH.has(k) && k !== "children" ? knoten[k] : baum(knoten[k], tiefe + 1);
      if (out[k] !== knoten[k]) anders = true;
    }
    return anders ? out : knoten;
  }
  const props = knoten.props || {};
  const neu = {};
  let geaendert = false;
  for (const k of Object.keys(props)) {
    if (TECHNISCH.has(k) || typeof props[k] === "function") continue;
    const n = baum(props[k], tiefe + 1);
    if (n !== props[k]) {
      neu[k] = n;
      geaendert = true;
    }
  }
  const kinder = props.children;
  const neueKinder = kinder === undefined ? kinder : baum(kinder, tiefe + 1);
  if (!geaendert && neueKinder === kinder) return knoten;
  // Kinder als einzelne Argumente: gleiche Schlüsselprüfung wie bei statischem JSX
  if (neueKinder === kinder) return cloneElement(knoten, neu);
  return Array.isArray(neueKinder) ? cloneElement(knoten, neu, ...neueKinder) : cloneElement(knoten, neu, neueKinder);
}

/** JSX-Baum in der Schweiz (Länderfassung /ch, /en/ch) ohne „ß“; sonst unverändert. */
export function schreibweiseBaum(knoten, land) {
  return landCode(land) === "CH" ? baum(knoten, 0) : knoten;
}
