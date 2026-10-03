// src/lib/land/vorschlag.js – Ländervorschlag und Länderwahl (Welle 2, Masterplan Abschnitt 4)
//
// Grundsätze (Geoblocking-VO Art. 3 Abs. 2, Google: keine IP-basierte Anpassung):
//  - Es gibt KEINE Weiterleitung nach IP oder Sprache. Der Server liefert über /api/land nur einen
//    Vorschlag; daraus entsteht ein schließbares Banner.
//  - Kein `Vary` auf Geo-Header, Antwort nie zwischenspeichern (private, no-store).
//  - Das Cookie „land“ wird erst bei aktiver Wahl gesetzt (Klick im Banner oder im Länderwechsler).
//    Schließen des Banners ist keine Länderwahl: Das merkt sich nur die Browsersitzung
//    (sessionStorage), es entsteht kein Cookie.
//  Kennzeichnung im Datenschutz-Entwurf: Prüfung Rechtsabteilung.

import { landCode } from "./laender.js";

/** Name und Laufzeit des Präferenz-Cookies (Prüfung Rechtsabteilung: Laufzeit 12 Monate). */
export const LAND_COOKIE = "land";
export const LAND_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** sessionStorage-Schlüssel für „Hinweis geschlossen“ (nur diese Browsersitzung). */
export const HINWEIS_ZU = "oi-land-hinweis-zu";

/** Geo-Header des Hostings, die als Hinweis gelesen werden (nie für eine Weiterleitung). */
export const GEO_HEADER = Object.freeze(["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]);

/**
 * Accept-Language auswerten: Sprach-Tags mit Region DE/AT/CH nach q-Wert.
 * "de-AT,de;q=0.9,en;q=0.8" → "AT"; "de" allein → null (keine Region erkennbar).
 */
export function landAusSprache(acceptLanguage) {
  if (typeof acceptLanguage !== "string" || !acceptLanguage.trim()) return null;
  const tags = acceptLanguage
    .split(",")
    .slice(0, 20)
    .map((teil, i) => {
      const [tag, ...param] = teil.trim().split(";");
      const q = param.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const wert = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(wert) ? wert : 0, i };
    })
    .filter((t) => t.tag && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const t of tags) {
    const region = t.tag.split("-")[1];
    const code = landCode(region);
    if (code) return code;
  }
  return null;
}

/**
 * Vorschlag aus Accept-Language (zuerst) bzw. Geo-Header (danach).
 * @param {{ acceptLanguage?: string|null, geo?: string|null }} e
 * @returns {{ vorschlag: "DE"|"AT"|"CH"|null, quelle: "sprache"|"geo"|null }}
 */
export function landVorschlag({ acceptLanguage, geo } = {}) {
  const aus = landAusSprache(acceptLanguage);
  if (aus) return { vorschlag: aus, quelle: "sprache" };
  const g = landCode(typeof geo === "string" ? geo : "");
  if (g) return { vorschlag: g, quelle: "geo" };
  return { vorschlag: null, quelle: null };
}

/** Land aus einem Cookie-String ("a=1; land=AT") – nur gültige Codes, sonst null. */
export function landAusCookie(cookieString) {
  if (typeof cookieString !== "string") return null;
  for (const teil of cookieString.split(";")) {
    const [k, ...v] = teil.trim().split("=");
    if (k === LAND_COOKIE) return landCode(decodeURIComponent(v.join("=")));
  }
  return null;
}

/** Cookie-Zeile für die aktive Länderwahl (nur nach Klick setzen). */
export function landCookieZeile(land, { https = true } = {}) {
  const code = landCode(land);
  if (!code) return null;
  return `${LAND_COOKIE}=${code}; Path=/; Max-Age=${LAND_COOKIE_MAX_AGE}; SameSite=Lax${https ? "; Secure" : ""}`;
}

