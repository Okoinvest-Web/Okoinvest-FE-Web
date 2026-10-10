// Schweizer Schreibweise für eine GANZE Seite (QM Welle 3) – nur für Server-Komponenten.
//
// schreibweiseBaum() (./SchweizerSchreibweise.js) erreicht nur, was im übergebenen Baum steht.
// schreibweiseSeite() geht tiefer: Server-Komponenten im Baum (reine Funktionen ohne Zustand) werden an
// Ort und Stelle ausgeführt und ihr Ergebnis ebenfalls umgeschrieben – so kommt die ganze Seite ohne
// „ß“ aus, auch Text in eingebetteten Bausteinen, ohne dass jeder Baustein eine eigene Zeile braucht.
// Eingebunden an EINER Stelle: landSeite() in ./LandSeite.js (alle Länderrouten).
//
// Client-Komponenten bleiben unangetastet (Client-Referenz, wird nicht ausgeführt) – nur ihre
// Text-Props und Kinder werden umgeschrieben; Text, den eine Client-Komponente selbst trägt, schreibt
// sie über useTexte() bzw. schreibweiseBaum(…, useSeitenLand()) um. Schlägt das Ausführen eines
// Bausteins fehl (Hook, notFound(), redirect() …), bleibt er unverändert im Baum und React rendert
// ihn wie gewohnt.

import { Fragment, cloneElement, createElement, isValidElement } from "react";
import { landCode } from "@/lib/land/laender";
import { ohneEszett } from "@/lib/land/schreibweise";

// wie in ./SchweizerSchreibweise.js: Props, die Adressen, Schlüssel oder Gestaltung tragen
const TECHNISCH = new Set(["children", "href", "src", "id", "slug", "schluessel", "typ", "className", "style", "name", "value", "type", "htmlFor", "d", "key", "ref", "as", "role"]);

// Der Baum wird NICHT rekursiv, sondern über einen eigenen Stapel abgearbeitet (laufe()): Die Schritte
// sind Generatoren; „yield schritt“ ruft einen Unterschritt auf, „yield { warte }“ wartet auf einen
// asynchronen Baustein. Grund: Im Entwicklungsmodus merkt sich React zu jedem Element den Aufrufstapel
// (und zu jedem „await“ einer Server-Komponente ebenso) und überträgt ihn mit der Seite. Aus einer
// tiefen Rekursion heraus wären das je Element viele lange Zeilen – die Seite würde im Dev-Server
// mehrfach so groß. So bleibt der Stapel für jedes Element gleich kurz; gewartet wird nur dort, wo
// ein Baustein selbst asynchron ist. In Produktion ohne Bedeutung.

const istServerKomponente = (typ) => typeof typ === "function" && typ.$$typeof === undefined && !typ.prototype?.isReactComponent;
const istThenable = (x) => x !== null && typeof x === "object" && typeof x.then === "function";
const istSchritt = (x) => x !== null && typeof x === "object" && typeof x.next === "function" && typeof x[Symbol.iterator] === "function";
const FEHLER = Symbol("Baustein nicht ausführbar");

function* tief(knoten, tiefe) {
  if (typeof knoten === "string") return ohneEszett(knoten);
  if (tiefe > 200 || knoten === null || typeof knoten !== "object") return knoten;
  if (Array.isArray(knoten)) {
    let geaendert = false;
    const out = [];
    for (const k of knoten) {
      const n = yield tief(k, tiefe + 1);
      if (n !== k) geaendert = true;
      out.push(n);
    }
    return geaendert ? out : knoten;
  }
  if (!isValidElement(knoten)) {
    // schlichte Objekte in Props (z. B. pill={{ text: "…" }}): Texte umschreiben
    if (knoten.$$typeof || Object.getPrototypeOf(knoten) !== Object.prototype) return knoten;
    let anders = false;
    const out = {};
    for (const k of Object.keys(knoten)) {
      out[k] = TECHNISCH.has(k) && k !== "children" ? knoten[k] : yield tief(knoten[k], tiefe + 1);
      if (out[k] !== knoten[k]) anders = true;
    }
    return anders ? out : knoten;
  }
  if (istServerKomponente(knoten.type)) {
    let ergebnis;
    try {
      ergebnis = knoten.type(knoten.props);
      if (istThenable(ergebnis)) ergebnis = yield { warte: Promise.resolve(ergebnis).catch(() => FEHLER) };
    } catch {
      ergebnis = FEHLER;
    }
    // Baustein nicht ausführbar (Hook, notFound(), redirect() …): React rendert ihn selbst und meldet den Fehler dort
    if (ergebnis === FEHLER) return yield tiefElement(knoten, tiefe);
    const neu = yield tief(ergebnis, tiefe + 1);
    // Schlüssel des Bausteins behalten (Listen), sonst das Ergebnis direkt
    return knoten.key != null ? createElement(Fragment, { key: knoten.key }, neu) : neu;
  }
  return yield tiefElement(knoten, tiefe);
}

function* tiefElement(knoten, tiefe) {
  const props = knoten.props || {};
  const neu = {};
  let geaendert = false;
  for (const k of Object.keys(props)) {
    if (TECHNISCH.has(k) || typeof props[k] === "function") continue;
    const n = yield tief(props[k], tiefe + 1);
    if (n !== props[k]) {
      neu[k] = n;
      geaendert = true;
    }
  }
  const kinder = props.children;
  const neueKinder = kinder === undefined ? kinder : yield tief(kinder, tiefe + 1);
  if (!geaendert && neueKinder === kinder) return knoten;
  // Kinder als einzelne Argumente: gleiche Schlüsselprüfung wie bei statischem JSX
  if (neueKinder === kinder) return cloneElement(knoten, neu);
  return Array.isArray(neueKinder) ? cloneElement(knoten, neu, ...neueKinder) : cloneElement(knoten, neu, neueKinder);
}

/** Schritte über einen eigenen Stapel abarbeiten (flacher Aufrufstapel, siehe oben). */
async function laufe(start) {
  const stapel = [start];
  let wert;
  while (stapel.length) {
    const { value, done } = stapel[stapel.length - 1].next(wert);
    if (done) {
      stapel.pop();
      wert = value;
    } else if (istSchritt(value)) {
      stapel.push(value);
      wert = undefined;
    } else {
      wert = await value.warte;
    }
  }
  return wert;
}

/**
 * Ganze Seite in der Schweiz (Länderfassung /ch, /en/ch) ohne „ß“ – einschließlich der eingebetteten
 * Server-Komponenten. Andere Länder: unverändert. Nur für Server-Komponenten.
 * @returns {Promise<any>}
 */
export async function schreibweiseSeite(knoten, land) {
  return landCode(land) === "CH" ? laufe(tief(knoten, 0)) : knoten;
}
