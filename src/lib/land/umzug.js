// src/lib/land/umzug.js – Weiterleitungen der alten Pfade auf die Länderzonen (Welle 2)
//
// Eingebunden über redirects() in next.config.mjs. permanent: true → HTTP 308 (Methode bleibt
// erhalten). Query-Parameter reicht Next.js unverändert weiter.
//
// Regeln (getestet in src/lib/land/umzug.test.mjs):
//  - Jeder alte öffentliche Pfad (bisherige Sitemap) hat GENAU EINE Weiterleitung oder bleibt im Stamm.
//  - Keine Ketten: Kein Ziel ist selbst wieder Quelle einer Weiterleitung.
//  - Keine Schleifen, keine externen Ziele.
//  - Ziel ist die Fassung des Landes, für das die Seite gilt (in der Regel /de/…); Regionsseiten
//    gehen in ihr Land, nicht freigegebene (CH im gestuften Start) auf den Einstieg ihres Landes.
// Der Middleware-Matcher bleibt unverändert (Masterplan Abschnitt 4).
//
// Relative Importe mit Dateiendung: next.config.mjs lädt dieses Modul ohne Alias-Auflösung.

import { ziel } from "./pfad.js";
import { SEITEN, alleSchluessel } from "./stufen.js";
import { UMBENANNT } from "./zonen.js";

const ziel1 = (schluessel) => ziel(schluessel, "DE").href;

/** Feste Weiterleitungen alt → neu (eine Zeile je alter Seite). */
export function umzugsTabelle() {
  const zeilen = [];
  for (const schluessel of alleSchluessel()) {
    const muster = schluessel.startsWith("/regionen/") ? "/regionen/[slug]" : schluessel;
    if (SEITEN[muster]?.neu) continue;
    zeilen.push({ source: schluessel, destination: ziel1(schluessel), permanent: true });
  }
  // Umbenannt im Stamm: /ratgeber → /wissen/ratgeber, Artikel per Muster (ein Eintrag je Ebene)
  for (const u of UMBENANNT) {
    zeilen.push({ source: u.alt, destination: u.neu, permanent: true });
    zeilen.push({ source: `${u.alt}/:slug`, destination: `${u.neu}/:slug`, permanent: true });
  }
  return zeilen;
}

export const UMZUG = Object.freeze(umzugsTabelle());

/**
 * Welche Regel trifft einen Pfad? (Nachbildung der Next.js-Auswertung für die Tests:
 * exakte Quellen und das einfache Muster ":slug" = genau ein Pfadsegment.)
 * @returns {Array<{ source: string, destination: string }>} alle passenden Regeln
 */
export function treffer(pfad, tabelle = UMZUG) {
  const p = String(pfad).split(/[?#]/)[0];
  return tabelle.filter((r) => {
    if (!r.source.includes(":")) return r.source === p;
    const basis = r.source.slice(0, r.source.indexOf("/:"));
    if (!p.startsWith(`${basis}/`)) return false;
    const rest = p.slice(basis.length + 1);
    return rest.length > 0 && !rest.includes("/");
  });
}

/** Ziel einer Regel für einen konkreten Pfad (":slug" eingesetzt). */
export function zielFuer(regel, pfad) {
  if (!regel.source.includes(":")) return regel.destination;
  const basis = regel.source.slice(0, regel.source.indexOf("/:"));
  const slug = String(pfad).split(/[?#]/)[0].slice(basis.length + 1);
  return regel.destination.replace(":slug", slug);
}
