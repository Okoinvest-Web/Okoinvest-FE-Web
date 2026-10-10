// src/lib/land/schreibweise.js – Schweizer Schreibweise (W3-0, QM-Rest Ländermodell)
//
// In der Schweiz gibt es kein „ß“: Auf /ch/… und /en/ch/… wird es zentral durch „ss“ ersetzt
// (ẞ → SS). Die Texte bleiben in den Komponenten unverändert (eine Seite, ein Text); die
// Umschreibung passiert dort, wo Texte ausgegeben werden:
//   - useTexte() und <T> (Client, src/components/Sprache/…) mit dem Land aus dem Root-Layout
//   - uebersetze() / inhaltFuer() (Server und Client, src/lib/sprache/woerterbuch.js, ./inhalte.js)
//   - Navigation und Footer (navigationFuer() über schreibweiseFuer())
//   - Metadaten der Länderfassungen (seitenMetadata(), ./seite.js)
// Technische Felder (href, id, slug, Bilder, Icons, Schlüssel) bleiben unberührt, ebenso
// React-Elemente und Funktionen.
//
// Relative Importe mit Dateiendung (node:test ohne Alias-Auflösung).

import { landCode } from "./laender.js";

const TECHNISCH = new Set(["href", "id", "slug", "bild", "src", "icon", "ton", "typ", "key", "schluessel", "url", "pfad"]);

/** "Straße" → "Strasse", "GROẞ" → "GROSS"; andere Werte unverändert. */
export function ohneEszett(text) {
  return typeof text === "string" && /[ßẞ]/.test(text) ? text.replace(/ß/g, "ss").replace(/ẞ/g, "SS") : text;
}

const istSchlicht = (x) => x !== null && typeof x === "object" && !x.$$typeof && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);

// Textfunktionen (z. B. lead: (n) => `… ${n} …`) bekommen eine Hülle, die ihr Ergebnis umschreibt.
// Je Funktion genau eine Hülle (stabile Identität). Komponenten (Name mit Großbuchstaben) bleiben.
const HUELLEN = new WeakMap();
function textFunktion(fn) {
  if (/^[A-Z]/.test(fn.name || "")) return fn;
  if (!HUELLEN.has(fn)) HUELLEN.set(fn, (...args) => schweizerSchreibweise(fn(...args)));
  return HUELLEN.get(fn);
}

/**
 * Tief: alle Strings in schlichten Objekten und Listen ohne „ß“; Textfunktionen liefern ihr Ergebnis
 * ohne „ß“. Unverändert bleiben technische Felder, React-Elemente, Komponenten, Klasseninstanzen
 * (Date, Map …) und Zahlen. Gibt dasselbe Objekt zurück, wenn nichts zu ändern ist.
 */
export function schweizerSchreibweise(wert, tiefe = 0) {
  if (typeof wert === "string") return ohneEszett(wert);
  if (typeof wert === "function") return textFunktion(wert);
  if (tiefe > 12) return wert;
  if (Array.isArray(wert)) {
    let geaendert = false;
    const out = wert.map((w) => {
      const n = schweizerSchreibweise(w, tiefe + 1);
      if (n !== w) geaendert = true;
      return n;
    });
    return geaendert ? out : wert;
  }
  if (istSchlicht(wert)) {
    let geaendert = false;
    const out = {};
    for (const k of Object.keys(wert)) {
      const n = TECHNISCH.has(k) ? wert[k] : schweizerSchreibweise(wert[k], tiefe + 1);
      if (n !== wert[k]) geaendert = true;
      out[k] = n;
    }
    return geaendert ? out : wert;
  }
  return wert;
}

/** Nur in der Schweiz (Länderfassung /ch und /en/ch) umschreiben, sonst unverändert. */
export function schreibweiseFuer(wert, land) {
  return landCode(land) === "CH" ? schweizerSchreibweise(wert) : wert;
}

// Land der laufenden Server-Anfrage für Ausgabestellen ohne Wörterbuch (JSON-LD, src/components/JsonLd.js):
// src/lib/land/seite.js meldet landDerAnfrage() an. Ohne Anmeldung (node:test, Browser) → kein Land.
let ausgabeLand = null;
/** Nur für src/lib/land/seite.js: Funktion, die das Land der laufenden Anfrage liefert. */
export function setzeAusgabeLand(fn) {
  ausgabeLand = typeof fn === "function" ? fn : null;
}
/** Land der laufenden Server-Anfrage ("DE" | "AT" | "CH") oder null. Wirft nie. */
export function landDerAusgabe() {
  try {
    return ausgabeLand ? ausgabeLand() : null;
  } catch {
    return null;
  }
}

// Adressen und Verweise bleiben, wie sie sind (ein „ß“ in einer URL wäre eine andere Adresse).
const ADRESSE = /^(https?:|mailto:|tel:|\/|#)/;

/**
 * Strukturierte Daten (JSON-LD) in der Schweiz ohne „ß“: alle Texte tief umschreiben, Adressen und
 * Schlüssel bleiben. Anders als schweizerSchreibweise() kennt JSON-LD keine „technischen“ Feldnamen
 * (name, url, text … sind schema.org-Begriffe) – entschieden wird am Wert. Sonst unverändert.
 */
export function jsonLdFuer(daten, land) {
  if (landCode(land) !== "CH") return daten;
  const um = (w) => {
    if (typeof w === "string") return ADRESSE.test(w) ? w : ohneEszett(w);
    if (Array.isArray(w)) return w.map(um);
    if (istSchlicht(w)) return Object.fromEntries(Object.keys(w).map((k) => [k, um(w[k])]));
    return w;
  };
  return um(daten);
}
