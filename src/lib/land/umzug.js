// src/lib/land/umzug.js – Weiterleitungen der Welle-2-Adressen auf das Ländermodell
//
// Eingebunden über redirects() in next.config.mjs. permanent: true → HTTP 308 (Methode bleibt
// erhalten). Query-Parameter reicht Next.js unverändert weiter.
//
// Das Ländermodell nach Vorgabe des Inhabers kehrt zu den Pfaden von vor Welle 2 zurück: Jede
// öffentliche Seite gibt es wieder ohne Präfix, dazu als Länderfassung unter /de, /at, /ch.
// Die Adressen von vor Welle 2 brauchen deshalb KEINE Weiterleitung mehr. Weitergeleitet werden
// nur Adressen, die es nur im Welle-2-Zwischenstand gab:
//   /wissen/ratgeber[/…]            → /ratgeber[/…]         (Ratgeber wieder wie vor Welle 2)
//   /ch/marktzugang-check           → /ch                    (Platzhalter „in Vorbereitung“ entfernt)
//   /ch/parzellen-vorpruefung       → /ch
// Sprachmodell (Entscheidung 2): Die englischen Seiten tragen dieselben Pfade wie die deutschen
// (/en/investoren). Die alten englischen Adressen von vor Welle 2 leiten einmal per 308 um:
//   /en/investors → /en/investoren, /en/project-exchange → /en/projektboerse,
//   /en/sell-your-project → /en/projektboerse/anbieten, /en/contact → /en/kontakt
// Regeln (getestet in src/lib/land/umzug.test.mjs): keine Ketten, keine Schleifen, keine
// externen Ziele, kein Ziel ist selbst Quelle.
//
// Relative Importe mit Dateiendung: next.config.mjs lädt dieses Modul ohne Alias-Auflösung.

import { UMBENANNT } from "./zonen.js";

/** Welle-2-Platzhalter „in Vorbereitung“ ohne Inhalt → Startseite des Landes. */
export const ENTFERNT = Object.freeze([
  { source: "/ch/marktzugang-check", destination: "/ch" },
  { source: "/ch/parzellen-vorpruefung", destination: "/ch" },
]);

/** Alte englische Adressen (eigene EN-Seiten vor dem Sprachmodell) → gleiche Seite unter /en mit deutschem Pfad. */
export const EN_ALT = Object.freeze([
  { source: "/en/investors", destination: "/en/investoren" },
  { source: "/en/project-exchange", destination: "/en/projektboerse" },
  { source: "/en/sell-your-project", destination: "/en/projektboerse/anbieten" },
  { source: "/en/contact", destination: "/en/kontakt" },
]);

/** Feste Weiterleitungen alt → neu (eine Zeile je Quelle). */
export function umzugsTabelle() {
  const zeilen = [];
  for (const u of UMBENANNT) {
    zeilen.push({ source: u.alt, destination: u.neu, permanent: true });
    zeilen.push({ source: `${u.alt}/:slug`, destination: `${u.neu}/:slug`, permanent: true });
  }
  for (const e of ENTFERNT) zeilen.push({ ...e, permanent: true });
  for (const e of EN_ALT) zeilen.push({ ...e, permanent: true });
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
