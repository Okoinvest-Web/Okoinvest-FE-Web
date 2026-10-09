// src/lib/land/pfad.js – Pfade, Länder- und Sprachwechsel, canonical und hreflang
//
// URL-Struktur (Ländermodell + Sprachmodell, Vorgabe des Inhabers): Sprache vor Land vor Seite.
//   /<seite>              Deutsch, gemeinsam (x-default)      /en/<seite>          Englisch, gemeinsam
//   /de|at|ch/<seite>     Deutsch, Land                       /en/de|at|ch/<seite> Englisch, Land
// Der Seitenpfad ist in allen Fassungen GLEICH (deutsche Pfade wie vor Welle 2).
//
// Schlüssel = Pfad OHNE Sprach- und Länderpräfix ("/rechner/pacht").
//   pfad("/rechner/pacht")                  → "/rechner/pacht"        (gemeinsame Seite)
//   pfad("/rechner/pacht", "AT")            → "/at/rechner/pacht"
//   pfad("/rechner/pacht", "AT", "en")      → "/en/at/rechner/pacht"
//   pfad("/", "CH")                         → "/ch"          pfad("/", null, "en") → "/en"
//   pfad("/portal", "AT", "en")             → "/portal"      (keine Länder-/Sprachfassung)
//   pfad("/wissen/ratgeber/x", "DE")        → "/de/ratgeber/x"   (Welle-2-Name aufgelöst)
//   pfad("/de/rechner/pacht", "AT")         → "/at/rechner/pacht" (Präfix wird ersetzt)
// Sprache: ohne Angabe die des übergebenen Pfades ("/en/…" → en), sonst Deutsch.
// Query und Anker bleiben erhalten. Links in Komponenten brauchen pfad() nicht: Die
// Link-Komponente src/components/Land/Link.js hängt Sprache und Land der Seite selbst an.

import { abs } from "../../data/site.js";
import { LAENDER, PRAEFIX_MUSTER, landAusPraefix, landCode } from "./laender.js";
import { eigenerInhalt, hatLandfassung, indexierbar, laenderMitInhalt } from "./seiten.js";
import { nurPfad, umbenannt } from "./zonen.js";
import { SPRACH_INFO, SPRACH_MUSTER, ohneSprache, sprachCode, spracheAusPfad } from "../sprache/sprachen.js";
import { enLandInhalt, uebersetztIndexierbar } from "../sprache/seiten.js";

const zerlege = (roh) => {
  const s = String(roh ?? "");
  const i = s.search(/[?#]/);
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i)];
};

/**
 * Pfad einer Seite in Land und Sprache, ohne Prüfung.
 * seitenPfad("/rechner/pacht", "AT", "en") → "/en/at/rechner/pacht"; seitenPfad("/", null, "de") → "/"
 */
export function seitenPfad(schluessel, land = null, sprache = "de") {
  const l = landCode(land);
  const s = sprachCode(sprache) || "de";
  const p = `${SPRACH_INFO[s].praefix}${l ? LAENDER[l].einstieg : ""}${schluessel === "/" ? "" : schluessel}`;
  return p || "/";
}

/** Pfad einer Seite in einem Land (Deutsch), ohne Prüfung ("/rechner/pacht", "AT" → "/at/rechner/pacht"). */
export const landPfad = (schluessel, land, sprache = "de") => seitenPfad(schluessel, land, sprache);

/**
 * Wo befindet sich ein Pfad?
 * @returns {{ sprache: "de"|"en", land: "DE"|"AT"|"CH"|null, schluessel: string }} schluessel ohne Präfixe ("/" = Startseite)
 */
export function landAusPfad(pathname) {
  const roh = nurPfad(pathname);
  const sprache = spracheAusPfad(roh);
  const p = nurPfad(ohneSprache(roh));
  const m = PRAEFIX_MUSTER.exec(p);
  if (m) {
    const rest = p.slice(m[0].length);
    return { sprache, land: landAusPraefix(m[1]), schluessel: rest || "/" };
  }
  return { sprache, land: null, schluessel: p };
}

/**
 * Ziel eines internen Links in Land und Sprache (land null = gemeinsame Seite).
 * Externe Links, Anker und Pfade ohne Länder-/Sprachfassung (Portal, Login …) bleiben unverändert;
 * ein vorhandenes Länderpräfix fällt dort weg.
 * @param {string} roh
 * @param {string|null} [land]
 * @param {"de"|"en"} [sprache] ohne Angabe: Sprache des Pfades
 */
export function pfad(roh, land = null, sprache) {
  if (typeof roh !== "string" || !roh.startsWith("/") || roh.startsWith("//")) return roh;
  const [p, rest] = zerlege(roh);
  const { sprache: s0, schluessel: k0 } = landAusPfad(p);
  const schluessel = umbenannt(k0) || k0;
  const s = sprachCode(sprache) || s0;
  if (!hatLandfassung(schluessel)) return (PRAEFIX_MUSTER.test(ohneSprache(p)) ? schluessel : p) + rest;
  return seitenPfad(schluessel, land, s) + rest;
}

/** Link-Ziel als Objekt (Kompatibilität mit Welle 2): { href, label }. */
export function linkFuer(schluessel, land, label) {
  return { href: pfad(schluessel, land), label, giltFuer: null };
}

/** Einstiegsseite eines Landes ("/at"); ohne Land die gemeinsame Startseite "/". */
export const einstieg = (land, sprache = "de") => pfad("/", land, sprache);

/**
 * Länderwechsler: dieselbe Seite im anderen Land, in derselben Sprache.
 * Von Seiten ohne Länderfassung (Login …) führt die Wahl auf die Startseite des Landes.
 * @returns {{ href: string, art: "entsprechung"|"einstieg" }}
 */
export function entsprechung(pathname, zielLand) {
  const l = landCode(zielLand) || "DE";
  const { sprache, schluessel } = landAusPfad(pathname);
  if (!hatLandfassung(schluessel)) return { href: seitenPfad("/", l, sprache), art: "einstieg" };
  return { href: seitenPfad(schluessel, l, sprache), art: "entsprechung" };
}

/**
 * Sprachwechsler: dieselbe Seite im selben Land in der anderen Sprache.
 * Von Seiten ohne Sprachfassung (Login, Portal …) auf die Startseite der Sprache.
 * @returns {{ href: string, art: "entsprechung"|"einstieg" }}
 */
export function sprachEntsprechung(pathname, zielSprache) {
  const s = sprachCode(zielSprache) || "de";
  const { land, schluessel } = landAusPfad(pathname);
  if (!hatLandfassung(schluessel)) return { href: seitenPfad("/", null, s), art: "einstieg" };
  return { href: seitenPfad(schluessel, land, s), art: "entsprechung" };
}

/** Englische Fassung indexierbar und im Cluster? (übersetzt; Länderfassung nur mit EN-Länderinhalt) */
const enImCluster = (schluessel, land) => (land ? enLandInhalt(schluessel, land) : uebersetztIndexierbar(schluessel));

/**
 * hreflang-Cluster einer Seite: die gemeinsame deutsche Seite als x-default, jede deutsche
 * Länderfassung mit eigenem Inhalt (de-DE, de-AT, de-CH) und – sobald übersetzt – die englische
 * Fassung ("en"; Länderfassungen "en-AT" … erst mit EN_LAENDERINHALT). Bidirektional: Alle
 * Mitglieder liefern dieselbe Tabelle. Ohne weitere Mitglieder: {} (die gemeinsame Seite steht allein).
 * @param {string} schluessel
 * @param {Record<string,string>} [weitere] zusätzliche Einträge (Altbestand)
 */
export function hreflang(schluessel, weitere = {}) {
  const laender = laenderMitInhalt(schluessel);
  const extra = Object.entries(weitere || {}).filter(([k]) => k !== "x-default");
  const en = enImCluster(schluessel, null);
  const enLaender = laender.filter((l) => enImCluster(schluessel, l));
  if (!laender.length && !extra.length && !en) return {};
  const tabelle = {};
  if (en) tabelle.de = abs(schluessel);
  for (const l of laender) tabelle[LAENDER[l].lang] = abs(seitenPfad(schluessel, l));
  if (en) tabelle.en = abs(seitenPfad(schluessel, null, "en"));
  for (const l of enLaender) tabelle[`en-${l}`] = abs(seitenPfad(schluessel, l, "en"));
  for (const [k, v] of extra) tabelle[k] = v;
  tabelle["x-default"] = abs(schluessel);
  return tabelle;
}

/** Ist diese Fassung Mitglied ihres hreflang-Clusters (eigener Inhalt bzw. übersetzt)? */
export function imCluster(schluessel, land = null, sprache = "de") {
  const l = landCode(land);
  if (sprache === "en") return enImCluster(schluessel, l);
  return l ? eigenerInhalt(schluessel, l) : true;
}

/**
 * Indexierbar in Land und Sprache? Gemeinsame deutsche Seite: laut Register (index: false = nie);
 * deutsche Länderfassung: nur mit eigenem Länderinhalt; englische Fassung: nur übersetzt
 * (englische Länderfassung zusätzlich mit EN_LAENDERINHALT).
 */
export function fassungIndexierbar(schluessel, land = null, sprache = "de") {
  return indexierbar(schluessel) && imCluster(schluessel, land, sprache);
}

/**
 * Metadaten-Feld `alternates` (Next.js) für eine Seite.
 *  - canonical immer auf sich selbst
 *  - Mitglied des Clusters (gemeinsame Seite, Länderfassung mit eigenem Inhalt, übersetzte
 *    englische Fassung): languages = hreflang-Cluster
 *  - sonst nur canonical (die Fassung trägt noindex)
 * @param {string} schluessel Pfad ohne Präfix
 * @param {string|null} land
 * @param {{ languages?: Record<string,string>, sprache?: "de"|"en" }} [o]
 */
export function alternates(schluessel, land = null, { languages, sprache = "de" } = {}) {
  const p = nurPfad(schluessel);
  const l = landCode(land);
  const s = sprachCode(sprache) || "de";
  const canonical = abs(seitenPfad(p, l, s));
  if (!imCluster(p, l, s)) return { canonical };
  const tabelle = hreflang(p, languages);
  return Object.keys(tabelle).length ? { canonical, languages: tabelle } : { canonical };
}

/** og:locale je Land und Sprache ("de_AT", Englisch "en_GB"); gemeinsame Seite "de_DE" wie vor Welle 2. */
export const ogLocale = (land, sprache = "de") => (sprache === "en" ? SPRACH_INFO.en.ogLocale : LAENDER[landCode(land) || "DE"].ogLocale);

/** <html lang> je Land und Sprache ("de-AT"; gemeinsame Seite "de"; Englisch "en"). */
export const htmlLang = (land, sprache = "de") => (sprache === "en" ? "en" : landCode(land) ? LAENDER[landCode(land)].lang : "de");

export { SPRACH_MUSTER };
