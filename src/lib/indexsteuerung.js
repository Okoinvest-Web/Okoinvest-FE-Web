// src/lib/indexsteuerung.js – Indexsteuerung (Welle 1, Paket I)
//
// Reine Funktionen ohne Importe, damit sie in site.js, robots.js, sitemap.js
// und in Unit-Tests (node:test) gleich verwendet werden können.
//
//  1. ermittleSiteUrl(): Produktions-Build OHNE NEXT_PUBLIC_SITE_URL bricht ab
//     (Masterplan Abschnitt 3, S-Minus: einzige erlaubte Build-Sperre dieser Art).
//     `next build` und `next start` laufen immer mit NODE_ENV=production; site.js
//     wird beim Sammeln der Seitendaten ausgewertet, der Fehler beendet den Build.
//  2. istIndexierbar(): Indexierung NUR, wenn alles zusammenpasst – Produktions-
//     Build, ausdrücklich NEXT_PUBLIC_SITE_ENV=production UND die Produktions-
//     domain. Alles andere (Staging, Vorschau, lokaler Build, vergessene
//     Variable) liefert noindex. Fehlertolerant in Richtung „nicht indexieren“.
//  3. robotsRegeln(): Crawler-Regeln nach Entscheidung E5.
//  4. ohneEntwuerfe(): Entwurfsseiten gehören nicht in die Sitemap.

/** Produktions-URL (Entscheidung E1, Inhaber): oekoinvest.com, mit www. */
export const PRODUKTIONS_URL = "https://www.oekoinvest.com";

/** Erlaubte Werte für NEXT_PUBLIC_SITE_ENV (nur "production" wird indexiert). */
export const UMGEBUNGEN = ["production", "staging", "preview", "development"];

/**
 * Basis-URL der Website ermitteln und prüfen.
 *
 * @param {{ siteUrl?: string, nodeEnv?: string }} e
 *   siteUrl = process.env.NEXT_PUBLIC_SITE_URL, nodeEnv = process.env.NODE_ENV
 *   (bewusst einzeln übergeben: Next.js ersetzt nur ausgeschriebene
 *   process.env.NEXT_PUBLIC_…-Zugriffe, nicht das ganze process.env-Objekt).
 * @returns {string} Origin ohne abschließenden Schrägstrich, z. B. "https://www.oekoinvest.com"
 * @throws {Error} in Produktion ohne Wert sowie bei ungültigem Wert (jede Umgebung)
 */
export function ermittleSiteUrl({ siteUrl, nodeEnv } = {}) {
  const roh = typeof siteUrl === "string" ? siteUrl.trim() : "";

  if (!roh) {
    if (nodeEnv === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL fehlt. In Produktions-Builds (next build/next start) muss die Basis-URL gesetzt sein, " +
          `z. B. NEXT_PUBLIC_SITE_URL=${PRODUKTIONS_URL} (Staging: eigene URL). Siehe .env.example.`,
      );
    }
    // Entwicklung und Tests: Produktions-URL als Vorgabe, damit Canonicals,
    // Sitemap und JSON-LD lokal genauso aussehen wie später live.
    return PRODUKTIONS_URL;
  }

  let url;
  try {
    url = new URL(roh);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL ist keine gültige absolute URL (erwartet z. B. https://www.oekoinvest.com).");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SITE_URL muss mit https:// (lokal auch http://) beginnen.");
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== "/")) {
    // abs() hängt Pfade direkt an – ein Pfadanteil oder Zugangsdaten in der
    // Basis-URL würden in Canonicals, Sitemap und robots.txt landen.
    throw new Error("NEXT_PUBLIC_SITE_URL darf nur Schema und Host enthalten (kein Pfad, keine Parameter, keine Zugangsdaten).");
  }
  return url.origin;
}

/**
 * Darf diese Auslieferung indexiert werden?
 * @param {{ nodeEnv?: string, siteEnv?: string, siteUrl?: string }} e
 */
export function istIndexierbar({ nodeEnv, siteEnv, siteUrl } = {}) {
  return nodeEnv === "production" && siteEnv === "production" && siteUrl === PRODUKTIONS_URL;
}

/**
 * Pfade, die für ALLE Crawler gesperrt sind (E5: Portal und Einladungen bleiben
 * gesperrt). /einladung/ und /angebot/ tragen persönliche Token bzw. Briefcodes
 * in der URL; sie werden nirgends öffentlich verlinkt, also ist die Sperre hier
 * richtig (die Seiten tragen zusätzlich noindex). /login, /registrieren usw.
 * bleiben abrufbar, damit Suchmaschinen deren noindex sehen.
 */
export const GESPERRT_FUER_ALLE = ["/api/", "/portal", "/einladung/", "/angebot/"];

/**
 * Öffentliche Wissensseiten, die GPTBot und Google-Extended nutzen dürfen (E5).
 * Bewusst NICHT enthalten: /energie-live (Datenlizenzen SMARD/aWATTar ungeklärt,
 * Masterplan S2), Rechner, Projektbörse, Formulare.
 *
 * Offener Inhaberpunkt (SEO-Finale, Paket GEOKI – E5-Erweiterung, NICHT ohne
 * Freigabe ändern): /quellen (Faktenregister, Export ausdrücklich CC BY 4.0 und
 * als Zitierquelle für KI-Systeme gedacht) fehlt in dieser Trainings-Freigabe.
 * Die Such-/Abrufcrawler der KI-Dienste (OAI-SearchBot, PerplexityBot, Claude-
 * SearchBot …) erreichen /quellen bereits über "*"; nur GPTBot und
 * Google-Extended (Training) sind dort gesperrt. Wenn der Inhaber die Freigabe
 * erteilt: "/quellen" (plus Länderfassungen) in diese Liste aufnehmen.
 * /marktdaten deckt als Präfix auch /marktdaten/ausschreibungen, /fristen und
 * /strompreise-schweiz ab.
 */
export const WISSENSSEITEN = [
  "/ratgeber",
  "/wissen/",
  "/regionen",
  "/faq",
  "/marktdaten",
  // Ländermodell: dieselben Seiten in den Länderfassungen /de, /at, /ch
  ...["de", "at", "ch"].flatMap((l) => [`/${l}/ratgeber`, `/${l}/wissen/`, `/${l}/regionen`, `/${l}/faq`, `/${l}/marktdaten`]),
  "/llms.txt",
];

/** Trainingscrawler mit Wissensseiten-Freigabe (E5, Antwort 2 „Ja“). */
export const TRAINING_WISSEN = ["GPTBot", "Google-Extended"];

/**
 * Vollständig gesperrt. CCBot und Bytespider laut E5; Meta-ExternalAgent und
 * cohere-ai waren schon gesperrt und sind von E5 nicht erfasst – Sperre bleibt
 * bis zur Entscheidung des Inhabers.
 */
export const GESPERRT = ["CCBot", "Bytespider", "Meta-ExternalAgent", "cohere-ai"];

/**
 * Regeln für src/app/robots.js (MetadataRoute.Robots).
 *
 * Such- und Abrufcrawler (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
 * PerplexityBot, Claude-SearchBot, Claude-User …) fallen unter "*" und sind
 * damit für alle öffentlichen Seiten erlaubt (E5, Antwort 1 „Ja“). Sie
 * bekommen bewusst keine eigene Gruppe: Eine eigene Gruppe ersetzt "*"
 * vollständig, und jede Abweichung wäre eine Fehlerquelle.
 *
 * Nicht-Produktion: alles gesperrt, keine Sitemap. Die eigentliche Absicherung
 * von Staging ist Basic-Auth auf Hosting-Ebene (W0-4); zusätzlich trägt jede
 * Seite noindex (src/app/layout.js).
 *
 * @param {{ indexierbar: boolean, siteUrl: string, sitemaps?: string[] }} e
 *   sitemaps: optionale Liste absoluter Sitemap-URLs; ohne Angabe die eine Sitemap unter
 *   /sitemap.xml (Ländermodell: eine Sitemap mit gemeinsamen Seiten und Länderfassungen)
 */
export function robotsRegeln({ indexierbar, siteUrl, sitemaps }) {
  if (!indexierbar) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/_next/image"], disallow: GESPERRT_FUER_ALLE },
      { userAgent: TRAINING_WISSEN, allow: WISSENSSEITEN, disallow: "/" },
      { userAgent: GESPERRT, disallow: "/" },
    ],
    sitemap: Array.isArray(sitemaps) && sitemaps.length ? sitemaps : `${siteUrl}/sitemap.xml`,
  };
}

/**
 * Entwurfsseiten (sichtbar als ENTWURF markiert, noch nicht rechtlich
 * freigegeben). Nach Freigabe durch Strang R hier austragen.
 *  - /nutzungsbedingungen: ENTWURF = true in src/app/nutzungsbedingungen/page.js
 *  - /datenschutz: „ENTWURF zur datenschutzrechtlichen Prüfung“, Platzhalter offen
 *  - /bedingungen/*: FREIGEGEBEN = false in src/app/bedingungen/_teile.js
 */
export const ENTWURFSSEITEN = ["/nutzungsbedingungen", "/datenschutz", "/bedingungen"];

/** true, wenn der Pfad eine Entwurfsseite oder darunter liegt. */
export function istEntwurf(pfad) {
  return ENTWURFSSEITEN.some((e) => pfad === e || pfad.startsWith(`${e}/`));
}

/** Filtert Sitemap-Einträge ({ pfad }) ohne Entwurfsseiten. */
export function ohneEntwuerfe(eintraege) {
  return eintraege.filter((e) => !istEntwurf(e.pfad));
}

/**
 * Sprache der Seite nach Pfad (wie <html lang> der Root-Layouts, Ländermodell):
 * /en… → "en", /de… → "de-DE", /at… → "de-AT", /ch… → "de-CH", sonst (gemeinsame Seite) "de".
 * Die Root-Layouts setzen lang serverseitig (src/components/Wurzel/Wurzel.js); diese Funktion
 * spiegelt das für Prüfskripte und Tests.
 */
export function spracheFuerPfad(pfad) {
  if (typeof pfad !== "string") return "de";
  if (/^\/en(\/|$)/.test(pfad)) return "en";
  const land = /^\/(de|at|ch)(\/|$)/.exec(pfad);
  return land ? `de-${land[1].toUpperCase()}` : "de";
}
