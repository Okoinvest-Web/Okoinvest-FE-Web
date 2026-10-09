// src/lib/land/vorschlag.js – Länderwahl-Cookie (Ländermodell nach Vorgabe des Inhabers)
//
// Grundsätze (Geoblocking-VO Art. 3 Abs. 2, Google: keine IP-basierte Anpassung):
//  - Es gibt KEINE Weiterleitung und keinen Vorschlag nach IP oder Sprache.
//  - Das Cookie „land“ wird erst bei aktiver Wahl gesetzt (Klick im Länderwechsler der Kopfleiste).
//  - Nur mit gesetztem Cookie leitet die Startseite „/“ auf das gewählte Land um (Middleware,
//    307, nie zwischengespeichert). Besucher ohne Cookie – auch Suchmaschinen – nie.
//  Kennzeichnung im Datenschutz-Entwurf: Prüfung Rechtsabteilung.

import { LAENDER, landCode } from "./laender.js";
import { SPRACH_INFO, sprachCode } from "../sprache/sprachen.js";

/** Name und Laufzeit des Präferenz-Cookies (Prüfung Rechtsabteilung: Laufzeit 12 Monate). */
export const LAND_COOKIE = "land";
export const LAND_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Land aus einem Cookie-String ("a=1; land=AT") – nur gültige Codes, sonst null. */
export function landAusCookie(cookieString) {
  if (typeof cookieString !== "string") return null;
  for (const teil of cookieString.split(";")) {
    const [k, ...v] = teil.trim().split("=");
    if (k === LAND_COOKIE) {
      try {
        return landCode(decodeURIComponent(v.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Cookie-Zeile für die aktive Länderwahl (nur nach Klick setzen). */
export function landCookieZeile(land, { https = true } = {}) {
  const code = landCode(land);
  if (!code) return null;
  return `${LAND_COOKIE}=${code}; Path=/; Max-Age=${LAND_COOKIE_MAX_AGE}; SameSite=Lax${https ? "; Secure" : ""}`;
}

/**
 * Ziel der Startseite „/“ aus den gespeicherten Wahlen (Middleware): land=AT → /at, sprache=en → /en,
 * beides → /en/at; ohne gültige Wahl null (keine Weiterleitung).
 */
export function startseitenZiel(landWert, spracheWert) {
  const land = landCode(landWert);
  const sprache = sprachCode(spracheWert);
  const ziel = `${sprache === "en" ? SPRACH_INFO.en.praefix : ""}${land ? LAENDER[land].einstieg : ""}`;
  return ziel || null;
}
