// src/lib/land/sitemaps.js – Sitemap-Einträge je Land und für den Stamm (Welle 2)
//
// Eine Sitemap je Länderzone (/sitemap/de.xml, /sitemap/at.xml, /sitemap/ch.xml) und eine für
// den Stamm (/sitemap/stamm.xml). In die Länder-Sitemaps kommt nur, was im Land freigegeben,
// mit Inhalt und indexierbar ist (stufen.js: kein „in Vorbereitung“, kein index: false).
// Jeder Eintrag trägt seinen hreflang-Cluster (alternates.languages) – derselbe wie im <head>.
//
// lastModified bewusst mit festen Daten statt `new Date()`: sonst meldet jeder Build Google,
// sämtliche Seiten hätten sich geändert. Datum nur anfassen, wenn sich der INHALT ändert.

import { abs } from "../../data/site.js";
import { LAND_CODES } from "./laender.js";
import { hreflang, landPfad } from "./pfad.js";
import { SEITEN, indexierbar, seiteFuer, seitenDesLandes } from "./stufen.js";

export const START = new Date("2026-09-29"); // Relaunch ÖkoInvest
export const LAENDERROUTING = new Date("2026-10-03"); // neue URLs der Länderzonen
export const RECHT = new Date("2026-09-29"); // letzte Überarbeitung der Rechtstexte

/** Kennungen der Sitemaps (generateSitemaps): "stamm" und je Land der Präfix. */
export const SITEMAP_IDS = Object.freeze(["stamm", ...LAND_CODES.map((c) => c.toLowerCase())]);

/** Absolute URLs der Sitemaps (für robots.txt). */
export const sitemapUrls = (siteUrl) => SITEMAP_IDS.map((id) => `${siteUrl}/sitemap/${id}.xml`);

/**
 * Stammseiten der bisherigen Sitemap (ohne Länderpräfix). Entwurfsseiten filtert sitemap.js mit
 * ohneEntwuerfe() heraus; sie bleiben hier, damit sie nach der Freigabe nur aus der
 * Entwurfsliste (src/lib/indexsteuerung.js) ausgetragen werden müssen.
 */
export const STAMM_SEITEN = Object.freeze([
  { pfad: "/", prio: 1.0, freq: "weekly" },
  { pfad: "/investoren", prio: 0.9, freq: "monthly" },
  { pfad: "/projektboerse", prio: 0.9, freq: "daily" },
  { pfad: "/projektboerse/anbieten", prio: 0.7, freq: "monthly" },
  { pfad: "/projektboerse/karte", prio: 0.7, freq: "daily" },
  { pfad: "/referenzen", prio: 0.6, freq: "monthly" },
  { pfad: "/en", prio: 0.6, freq: "monthly" },
  { pfad: "/en/investors", prio: 0.6, freq: "monthly" },
  { pfad: "/en/project-exchange", prio: 0.6, freq: "monthly" },
  { pfad: "/en/sell-your-project", prio: 0.6, freq: "monthly" },
  { pfad: "/en/contact", prio: 0.4, freq: "yearly" },
  { pfad: "/wissen/ratgeber", prio: 0.8, freq: "weekly", datum: LAENDERROUTING },
  { pfad: "/wissen/lexikon", prio: 0.7, freq: "monthly", lexikon: true },
  { pfad: "/unternehmen", prio: 0.6, freq: "monthly" },
  { pfad: "/kontakt", prio: 0.6, freq: "yearly" },
  { pfad: "/termin", prio: 0.6, freq: "monthly" },
  { pfad: "/impressum", prio: 0.2, freq: "yearly", datum: RECHT },
  { pfad: "/datenschutz", prio: 0.2, freq: "yearly", datum: RECHT },
  { pfad: "/nutzungsbedingungen", prio: 0.3, freq: "yearly", datum: RECHT },
  { pfad: "/barrierefreiheit", prio: 0.2, freq: "yearly", datum: RECHT },
]);

/** Einträge der Sitemap eines Landes ("DE" | "AT" | "CH"). */
export function landEintraege(land) {
  return seitenDesLandes(land)
    .filter(({ schluessel }) => indexierbar(schluessel, land))
    .map(({ schluessel }) => {
      const e = seiteFuer(schluessel)?.eintrag || SEITEN[schluessel];
      return {
        url: abs(landPfad(schluessel, land)),
        lastModified: LAENDERROUTING,
        changeFrequency: e.freq,
        priority: e.prio,
        alternates: { languages: hreflang(schluessel) },
      };
    });
}
