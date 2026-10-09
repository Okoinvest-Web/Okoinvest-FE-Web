// src/lib/land/zonen.js – welche Pfade eine Länderfassung haben (Ländermodell nach Vorgabe des Inhabers)
//
// EINE Website: Jede öffentliche Seite gibt es gemeinsam ohne Präfix (wie vor Welle 2) und mit
// derselben Seitenkomponente unter /de, /at, /ch (Register: src/lib/land/seiten.js).
// Keine Länderfassung haben nur Bereiche ohne Länderinhalt: Anmeldung, Portal, Token-Strecken,
// APIs, die englischen Seiten (eigene Sprachebene) und der interne Styleguide.
//
// Relative Importe mit Dateiendung: Das Modul wird auch von next.config.mjs, der Middleware und
// node:test ohne Alias-Auflösung geladen.

/** Bereiche ohne Länderfassung (Pfad gleich oder darunter). */
export const OHNE_LAND = Object.freeze([
  "/portal",
  "/login",
  "/registrieren",
  "/passwort-vergessen",
  "/einladung",
  "/angebot",
  "/bericht",
  "/p",
  "/api",
  "/design",
  "/en",
  "/termin/verwalten",
]);

/**
 * Technische Dateien der Website (Next.js-Metadaten-Routen, Bilder, Skripte). Sie sind keine
 * Seiten; die Linkprüfung ignoriert sie.
 */
export const TECHNISCH = Object.freeze(["/_next", "/img", "/geo", "/sitemap", "/robots.txt", "/manifest.webmanifest", "/llms.txt", "/icon", "/apple-touch-icon.png", "/favicon.ico", "/portal.webmanifest", "/sw-portal.js", "/portal-offline.html"]);

/**
 * Adressen aus dem Welle-2-Zwischenstand, die es so nicht mehr gibt (308 ohne Kette, umzug.js).
 * Der Ratgeber liegt wieder unter /ratgeber wie vor Welle 2.
 */
export const UMBENANNT = Object.freeze([{ alt: "/wissen/ratgeber", neu: "/ratgeber" }]);

const unter = (pfad, basis) => (basis === "/" ? pfad === "/" : pfad === basis || pfad.startsWith(`${basis}/`));

/** Pfad ohne Query und Anker, ohne abschließenden Schrägstrich; "" → "/" */
export function nurPfad(pfad) {
  const s = String(pfad ?? "").split(/[?#]/)[0];
  if (!s) return "/";
  return s.length > 1 ? s.replace(/\/+$/, "") || "/" : s;
}

/** Gehört der (präfixlose) Pfad zu einem Bereich ohne Länderfassung? */
export const ohneLand = (pfad) => {
  const p = nurPfad(pfad);
  return OHNE_LAND.some((b) => unter(p, b)) || TECHNISCH.some((b) => p === b || p.startsWith(b));
};

/** Welle-2-Adresse mit neuem Namen ("/wissen/ratgeber/x" → "/ratgeber/x"); sonst null */
export function umbenannt(pfad) {
  const p = nurPfad(pfad);
  for (const u of UMBENANNT) if (unter(p, u.alt)) return u.neu + p.slice(u.alt.length);
  return null;
}
