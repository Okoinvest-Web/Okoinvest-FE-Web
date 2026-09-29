// src/lib/hreflang.js
//
// hreflang fuer die zwei Maerkte / zwei Gesellschaften:
//   oekovolt.de  -> Oekovolt GmbH Solartechnik (Deutschland)  -> de-DE
//   oekovolt.com -> Oekovolt Solartechnik GmbH (Oesterreich)  -> de-AT
//
// WICHTIG: hreflang muss BIDIREKTIONAL sein. Nur Seiten, die auf BEIDEN
// Domains unter dem GLEICHEN Pfad existieren, duerfen annotiert werden.
// Laenderspezifische Seiten (deutsche Referenzprojekte, Landesfoerderungen,
// Jobs) bekommen bewusst KEINE Alternates - dort genuegt der Canonical.

export const BASE_DE = "https://www.oekovolt.de";
export const BASE_COM = "https://www.oekovolt.com";

// Pfade, die auf .de UND .com identisch existieren (alle 2026-09-11 mit
// HTTP 200 gegen www.oekovolt.com verifiziert).
export const SHARED_PATHS = new Set([
  "/",
  "/dienstleistungen/photovoltaik",
  "/dienstleistungen/smarthome",
  "/produkte/photovoltaikanlage",
  "/produkte/stromspeicher",
  "/produkte/warmepumpe",
  "/produkte/wallbox",
  "/produkte/smartmeter",
  "/produkte/smartenergyhome",
  "/produkte/mieterstrom",
  "/produkte/hersteller",
  "/service/finanzierung",
  "/service/repowering",
  "/service/stromtarif",
  "/service/vorteilswelt",
  "/service/direktvermarktung",
  "/referenzen/projekte",
  "/referenzen/referenzkarte",
  "/forderungen/landesforderungen",
  "/forderungen/baurecht",
  "/forderungen/steuerlich",
  "/forderungen/richtlinien",
  "/uber-uns/team",
  "/uber-uns/jobs",
  "/kontakt",
  "/faqs",
  "/impressum",
  "/datenschutz",
  "/agb",
  // Hersteller-Detailseiten
  "/produkte/stromspeicher/solis",
  "/produkte/stromspeicher/wuerth",
  "/produkte/stromspeicher/byd",
  "/produkte/stromspeicher/akcome",
  "/produkte/stromspeicher/huawei",
  "/produkte/warmepumpe/schrack",
  "/produkte/warmepumpe/schweizer",
  "/produkte/warmepumpe/trina",
  "/produkte/warmepumpe/fronius",
]);

/**
 * Nimmt einen Pfad ODER eine volle .de-URL und liefert den normalisierten
 * Pfad ("/" fuer die Startseite, sonst ohne abschliessenden Slash).
 */
export function toPath(pathOrUrl) {
  if (!pathOrUrl) return "/";
  let path = String(pathOrUrl);

  if (path.startsWith("http")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return "/";
    }
  }

  if (!path.startsWith("/")) path = `/${path}`;
  // trailingSlash ist false -> Pfade ohne abschliessenden Slash fuehren
  if (path.length > 1) path = path.replace(/\/+$/, "");

  return path || "/";
}

function href(base, path) {
  return path === "/" ? base : `${base}${path}`;
}

/**
 * languages-Objekt fuer die Next.js Metadata API.
 * Liefert undefined fuer laenderspezifische Seiten - Next laesst das Feld
 * dann weg, statt ein leeres/falsches hreflang zu rendern.
 *
 * @param {string} pathOrUrl Pfad oder volle .de-URL (z.B. der Canonical)
 */
export function hreflangLanguages(pathOrUrl) {
  const path = toPath(pathOrUrl);
  if (!SHARED_PATHS.has(path)) return undefined;

  return {
    "de-DE": href(BASE_DE, path),
    "de-AT": href(BASE_COM, path),
    "x-default": href(BASE_DE, path),
  };
}

/**
 * Alternates-Eintraege fuer die native Next.js Sitemap
 * (MetadataRoute.Sitemap -> alternates.languages).
 * Identisch zu hreflangLanguages(): die Sitemap muss die gleichen Angaben
 * machen wie die <link>-Tags, sonst sendet man Google zwei Signale.
 */
export function sitemapLanguages(pathOrUrl) {
  return hreflangLanguages(pathOrUrl);
}
