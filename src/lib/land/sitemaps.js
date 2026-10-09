// src/lib/land/sitemaps.js – Sitemap-Einträge (Ländermodell)
//
// Eine Sitemap unter /sitemap.xml wie vor Welle 2 (src/app/sitemap.js):
//  - jede indexierbare gemeinsame Seite (Register src/lib/land/seiten.js, ohne Entwürfe),
//  - dazu jede Länderfassung mit eigenem Länderinhalt (LAENDERINHALT) – Länderfassungen ohne
//    eigenen Inhalt tragen noindex und stehen nicht drin,
//  - dazu jede englische Fassung (/en/…), die übersetzt ist (UEBERSETZT, src/lib/sprache/seiten.js),
//    und jede englische Länderfassung mit übersetztem Länderinhalt (EN_LAENDERINHALT) – nicht
//    übersetzte englische Fassungen tragen noindex und stehen nicht drin.
// Jeder Eintrag trägt seinen hreflang-Cluster (alternates.languages) – derselbe wie im <head>.
//
// lastModified bewusst mit festen Daten statt `new Date()`: sonst meldet jeder Build Google,
// sämtliche Seiten hätten sich geändert. Datum nur anfassen, wenn sich der INHALT ändert.

import { abs } from "../../data/site.js";
import { istEntwurf } from "../indexsteuerung.js";
import { LAND_CODES } from "./laender.js";
import { fassungIndexierbar, hreflang, landPfad, seitenPfad } from "./pfad.js";
import { SITEMAP_START, alleSchluessel, eigenerInhalt, indexierbar, seiteFuer } from "./seiten.js";

export const START = new Date(SITEMAP_START); // Relaunch ÖkoInvest
export const LAENDERMODELL = new Date("2026-10-03"); // Länderfassungen mit eigenem Inhalt
export const SPRACHMODELL = new Date("2026-10-08"); // englische Fassungen unter /en

/**
 * Sitemap-Einträge der Seiten aus dem Register (gemeinsam + Länderfassungen mit eigenem Inhalt).
 * @param {{ lexikonStand?: string }} [o]
 */
export function seitenEintraege({ lexikonStand } = {}) {
  const liste = [];
  for (const schluessel of alleSchluessel()) {
    const s = seiteFuer(schluessel);
    const e = s.eintrag;
    if (e.sitemap === false || !indexierbar(schluessel) || istEntwurf(schluessel)) continue;
    const languages = hreflang(schluessel);
    const lastModified = e.lexikon && lexikonStand ? new Date(lexikonStand) : e.datum ? new Date(e.datum) : START;
    const mit = (url, datum = lastModified) => ({
      url,
      lastModified: datum,
      changeFrequency: e.freq,
      priority: e.prio,
      ...(Object.keys(languages).length ? { alternates: { languages } } : {}),
    });
    liste.push(mit(abs(schluessel)));
    for (const land of LAND_CODES) {
      if (eigenerInhalt(schluessel, land) && indexierbar(schluessel, land)) liste.push(mit(abs(landPfad(schluessel, land)), LAENDERMODELL));
    }
    if (fassungIndexierbar(schluessel, null, "en")) liste.push(mit(abs(seitenPfad(schluessel, null, "en")), SPRACHMODELL));
    for (const land of LAND_CODES) {
      if (fassungIndexierbar(schluessel, land, "en")) liste.push(mit(abs(seitenPfad(schluessel, land, "en")), SPRACHMODELL));
    }
  }
  return liste;
}
