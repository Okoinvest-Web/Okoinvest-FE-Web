// src/lib/kommune/widmung.js – AT-Widmungskit (Welle 3, Paket B8)
//
// Ablauf und Prüfpunkte der Umwidmung für einen Solarpark je österreichischem Bundesland – NUR aus den
// recherchierten Regionsdateien (src/data/regionen/<bundesland>.js, Quellen und Stand dort):
//   ablauf.text            Verfahren in Kürze
//   ablauf.behoerden       beteiligte Stellen mit ihrer Rolle (Reihenfolge wie in der Datei)
//   recht[]                Prüfpunkte mit Quelle (nur Einträge mit Quellen-URL; befristete Fristenkästen nicht)
//   quellen[]              Quellenliste der Region
// Interne Rechercheverweise (unsicher[]) erscheinen nicht. Keine eigenen Aussagen, keine Zahlen außer denen im
// Wortlaut der Regionsdateien. Dazu gemeinsame Aussagen für alle Bundesländer, die die Website bereits trifft
// (/kommunen, Länderinhalt Österreich) – siehe GEMEINSAM.
//
// Server/node (lädt die vollständigen Regionsdaten); Client-Komponenten bekommen das Ergebnis als Props.

import { regionFuerSprache } from "../../data/regionen/index.js";
import { BUNDESLAENDER } from "../rechner/kommunePflichten.js";
import { fakt } from "../fakten/index.js";

export const WIDMUNGSKIT_VERSION = "2026-10-09";

/** Aussagen für ganz Österreich – Wortlaut wie /kommunen (Länderinhalt AT, Stand 04.10.2026) */
export const GEMEINSAM = Object.freeze({
  de: Object.freeze([
    { titel: "Widmung durch die Gemeinde", text: "Die Gemeinde ändert ihren Flächenwidmungsplan bzw. ihr örtliches Raumordnungsprogramm, etwa zu Grünland-Photovoltaik. Das Land gibt dafür Zonen, Kriterien und Größengrenzen vor und prüft die Widmung als Aufsichtsbehörde." },
    { titel: "Bewilligungen nach der Widmung", text: "Je nach Größe kommen die elektrizitätsrechtliche Bewilligung des Landes und eine naturschutzrechtliche Bewilligung, meist bei der Bezirkshauptmannschaft, hinzu." },
    { titel: "Gemeinde und Energiegemeinschaft", text: "Gemeinden können sich an Erneuerbare-Energie-Gemeinschaften beteiligen. Seit 1. Oktober 2026 regelt das ElWG die gemeinsame Energienutzung neu – mit zusätzlichen Modellen." },
  ]),
  en: Object.freeze([
    { titel: "Zoning by the municipality", text: "The municipality amends its zoning plan (Flächenwidmungsplan) or its local spatial planning programme, for example to ‘Grünland-Photovoltaik’. The state sets zones, criteria and size limits for this and reviews the zoning as the supervisory authority." },
    { titel: "Permits after zoning", text: "Depending on size, the state’s permit under electricity law and a permit under nature conservation law, usually from the district authority (Bezirkshauptmannschaft), are also required." },
    { titel: "Municipality and energy community", text: "Municipalities can participate in renewable energy communities. Since 1 October 2026, the ElWG (Electricity Industry Act) has reorganised shared energy use – with additional models." },
  ]),
});

/** Fakten (Register), auf die sich das Kit stützt – Annahmenbuch des Berichts */
export const WIDMUNG_FAKTEN = Object.freeze(["recht.elwg.gemeinschaftenAb", "recht.eag.abschlagLandwirtschaft"]);

const istFrist = (titel) => /^(Frist|Deadline)\b/i.test(String(titel || "").trim());
const ohneMarkdown = (t) => String(t || "").replace(/\*\*/g, "");

/**
 * Widmungskit eines Bundeslands.
 * @param {string} slug  AT-Bundesland (META.slug)
 * @param {"de"|"en"} sprache
 * @returns {null | { slug, name, ablauf: string, stellen: Array<{name, rolle, url?}>, pruefpunkte: Array<{titel, text, quelle}>, quellen: Array<{titel, url, stand?}>, href: string }}
 */
export function widmungskitFuer(slug, sprache = "de") {
  if (!BUNDESLAENDER.AT.some((b) => b.slug === slug)) return null;
  const r = regionFuerSprache(slug, sprache === "en" ? "en" : "de");
  if (!r) return null;
  const pruefpunkte = (r.recht || [])
    .filter((x) => x?.titel && x?.text && x?.quelle?.url && !istFrist(x.titel))
    .map((x) => ({ titel: x.titel, text: ohneMarkdown(x.text), quelle: { titel: x.quelle.titel, url: x.quelle.url } }));
  const stellen = (r.ablauf?.behoerden || []).filter((b) => b?.name && b?.rolle).map((b) => ({ name: b.name, rolle: b.rolle, ...(b.url ? { url: b.url } : {}) }));
  const quellen = (r.quellen || []).filter((q) => q?.titel && q?.url).map((q) => ({ titel: q.titel, url: q.url, ...(q.stand ? { stand: q.stand } : {}) }));
  return { slug, name: r.name, ablauf: ohneMarkdown(r.ablauf?.text || ""), stellen, pruefpunkte, quellen, href: `/regionen/${slug}` };
}

/** Alle neun Bundesländer (Reihenfolge der Stammdaten) */
export const widmungskitAlle = (sprache = "de") => BUNDESLAENDER.AT.map((b) => widmungskitFuer(b.slug, sprache)).filter(Boolean);

/** ElWG-Stand für die Energiegemeinschaft der Gemeinde (Register, eg-at.js) */
export function egStand() {
  const f = fakt("recht.elwg.gemeinschaftenAb", "AT");
  return f ? { text: f.wert, quelle: f.quelle, abruf: f.abruf, status: f.status } : null;
}
