// src/lib/sprache/sprachen.js – Sprachen der Website (Sprachmodell nach Vorgabe des Inhabers)
//
// EINE Website, zwei Sprachen. Deutsch ist die Hauptsprache (Pfade ohne Sprachpräfix), Englisch
// liegt unter /en davor – mit DENSELBEN Seitenpfaden wie auf Deutsch:
//
//   Deutsch                         Englisch
//   /…            gemeinsam         /en/…            gemeinsam (englisch)
//   /de/…  /at/…  /ch/…  Land       /en/de/…  /en/at/…  /en/ch/…  Land (englisch)
//
// Reihenfolge: Sprache vor Land vor Seite. Beispiele: /en/rechner/pacht, /en/at/freiflaeche.
// Die Sprachwahl in der Kopfleiste (DE · EN) springt auf dieselbe Seite im selben Land und
// speichert die Wahl erst beim Klick im Cookie „sprache“. Nur die Startseite „/“ leitet mit
// gesetztem Cookie auf die gespeicherte Wahl um (Middleware); Unterseiten leiten nie um.
//
// Relative Importe mit Dateiendung: Das Modul wird auch von next.config.mjs, der Middleware
// und node:test ohne Alias-Auflösung geladen.

/** Sprachen in Anzeigereihenfolge. "de" = Hauptsprache (ohne Präfix). */
export const SPRACHEN = Object.freeze(["de", "en"]);
export const HAUPTSPRACHE = "de";

export const SPRACH_INFO = Object.freeze({
  de: Object.freeze({ code: "de", praefix: "", name: "Deutsch", kurz: "DE", lang: "de", ogLocale: "de_DE" }),
  en: Object.freeze({ code: "en", praefix: "/en", name: "English", kurz: "EN", lang: "en", ogLocale: "en_GB" }),
});

/** Sprachpräfix am Pfadanfang: "/en", "/en/…" */
export const SPRACH_MUSTER = /^\/en(?=\/|$|\?|#)/;

/** "en" | "EN" | " de " → "en" | "de"; alles andere → null */
export function sprachCode(wert) {
  const s = typeof wert === "string" ? wert.trim().toLowerCase() : "";
  return SPRACHEN.includes(s) ? s : null;
}

/** Sprache mit Rückfall auf die Hauptsprache. */
export const spracheOder = (wert) => sprachCode(wert) || HAUPTSPRACHE;

/** Sprache eines Pfades ("/en/at/x" → "en", "/at/x" → "de"). */
export const spracheAusPfad = (pathname) => (SPRACH_MUSTER.test(String(pathname ?? "")) ? "en" : "de");

/** Pfad ohne Sprachpräfix ("/en/at/x" → "/at/x", "/en" → "/"). */
export function ohneSprache(pathname) {
  const s = String(pathname ?? "");
  if (!SPRACH_MUSTER.test(s)) return s || "/";
  const rest = s.slice(3);
  return !rest || rest.startsWith("?") || rest.startsWith("#") ? "/" + rest : rest;
}

// ---------------------------------------------------------------------------------------------
// Cookie „sprache“ – nur nach aktiver Wahl (Klick in der Sprachwahl). Gleiche Regeln wie das
// Cookie „land“ (src/lib/land/vorschlag.js): keine Auswertung von Accept-Language oder IP.

export const SPRACH_COOKIE = "sprache";
export const SPRACH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Sprache aus einem Cookie-String ("a=1; sprache=en") – nur gültige Codes, sonst null. */
export function spracheAusCookie(cookieString) {
  if (typeof cookieString !== "string") return null;
  for (const teil of cookieString.split(";")) {
    const [k, ...v] = teil.trim().split("=");
    if (k === SPRACH_COOKIE) {
      try {
        return sprachCode(decodeURIComponent(v.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Cookie-Zeile für die aktive Sprachwahl (nur nach Klick setzen). */
export function sprachCookieZeile(sprache, { https = true } = {}) {
  const code = sprachCode(sprache);
  if (!code) return null;
  return `${SPRACH_COOKIE}=${code}; Path=/; Max-Age=${SPRACH_COOKIE_MAX_AGE}; SameSite=Lax${https ? "; Secure" : ""}`;
}
