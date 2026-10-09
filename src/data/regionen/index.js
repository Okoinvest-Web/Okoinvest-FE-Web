// src/data/regionen/index.js
//
// Regionalseiten /regionen/[slug]: je Region eine Datei mit eigenen, recherchierten
// Inhalten (Quellen und Stand in der Datei). Stammdaten und Kartenlage in meta.js.
// Neue Region: Datei anlegen, hier importieren und in meta.js eintragen.

import { META } from "./meta";
import { INHALT_EN, NAMEN_EN } from "./en/index.js";
import { uebersetze } from "../../lib/sprache/woerterbuch.js";
import schleswigHolstein from "./schleswig-holstein";
import bremen from "./bremen";
import hamburg from "./hamburg";
import mecklenburgVorpommern from "./mecklenburg-vorpommern";
import nordrheinWestfalen from "./nordrhein-westfalen";
import niedersachsen from "./niedersachsen";
import sachsenAnhalt from "./sachsen-anhalt";
import brandenburg from "./brandenburg";
import berlin from "./berlin";
import rheinlandPfalz from "./rheinland-pfalz";
import hessen from "./hessen";
import thueringen from "./thueringen";
import sachsen from "./sachsen";
import saarland from "./saarland";
import badenWuerttemberg from "./baden-wuerttemberg";
import bayern from "./bayern";
import vorarlberg from "./vorarlberg";
import tirol from "./tirol";
import salzburg from "./salzburg";
import oberoesterreich from "./oberoesterreich";
import niederoesterreich from "./niederoesterreich";
import wien from "./wien";
import kaernten from "./kaernten";
import steiermark from "./steiermark";
import burgenland from "./burgenland";
import schweiz from "./schweiz";

const DATEN = {
  "schleswig-holstein": schleswigHolstein,
  "bremen": bremen,
  "hamburg": hamburg,
  "mecklenburg-vorpommern": mecklenburgVorpommern,
  "nordrhein-westfalen": nordrheinWestfalen,
  "niedersachsen": niedersachsen,
  "sachsen-anhalt": sachsenAnhalt,
  "brandenburg": brandenburg,
  "berlin": berlin,
  "rheinland-pfalz": rheinlandPfalz,
  "hessen": hessen,
  "thueringen": thueringen,
  "sachsen": sachsen,
  "saarland": saarland,
  "baden-wuerttemberg": badenWuerttemberg,
  "bayern": bayern,
  "vorarlberg": vorarlberg,
  "tirol": tirol,
  "salzburg": salzburg,
  "oberoesterreich": oberoesterreich,
  "niederoesterreich": niederoesterreich,
  "wien": wien,
  "kaernten": kaernten,
  "steiermark": steiermark,
  "burgenland": burgenland,
  "schweiz": schweiz,
};

/** Alle Regionen in Kartenreihenfolge: Stammdaten (meta) + Inhalte (Datei) */
export const REGIONEN = META.map((m) => ({ ...DATEN[m.slug], ...m }));

export const regionFuer = (slug) => REGIONEN.find((r) => r.slug === slug) || null;

/** Nachbarregionen als vollständige Objekte */
export const nachbarnVon = (r) => (r?.nachbarn || []).map(regionFuer).filter(Boolean);

/* ------------------------------------------------------------------ */
/* Sprachmodell: englische Fassung (src/data/regionen/en/)             */
/* ------------------------------------------------------------------ */

/** Region in der Sprache der Seite: Englisch = deutsche Daten + Namen + englische Inhalte (uebersetze). */
export function regionInSprache(r, sprache = "de") {
  if (!r || sprache !== "en") return r;
  return uebersetze({ de: r, en: { ...NAMEN_EN[r.slug], ...(INHALT_EN[r.slug] || {}) } }, "en");
}
export const regionFuerSprache = (slug, sprache = "de") => regionInSprache(regionFuer(slug), sprache);
export const regionenInSprache = (sprache = "de") => (sprache === "en" ? REGIONEN.map((r) => regionInSprache(r, "en")) : REGIONEN);
export const nachbarnInSprache = (r, sprache = "de") => nachbarnVon(r).map((n) => regionInSprache(n, sprache));
/** Hat die Region eine vollständige englische Fassung? */
export const hatEnglisch = (slug) => Object.hasOwn(INHALT_EN, slug);
/** Name einer Region (Kachelkarte, Listen) in der Sprache der Seite */
export const regionName = (slug, sprache = "de") => (sprache === "en" ? NAMEN_EN[slug]?.name : null) ?? META.find((m) => m.slug === slug)?.name ?? slug;
