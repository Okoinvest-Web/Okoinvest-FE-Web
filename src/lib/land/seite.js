// src/lib/land/seite.js – Land einer Seite auf dem Server (nutzt react/cache und next/navigation)
//
// Getrennt von index.js, damit node:test, next.config.mjs, Middleware und Client-Komponenten die
// reine Länderlogik ohne Server-Funktionen laden können.
//
// Jede öffentliche Seite (src/app/(stamm)/…/page.js) ist zugleich ihre Länderfassung: Die Route
// src/app/(laender)/[land]/…/page.js exportiert genau diese Seite weiter, Next.js reicht dabei
// params.land ("de" | "at" | "ch") durch. Die Seite ruft am Anfang
//
//   const land = await seitenLand(params);          // "DE" | "AT" | "CH" | null (= gemeinsam)
//
// und exportiert ihre Metadaten über
//
//   export const generateMetadata = seitenMetadata("/rechner/pacht", metadata);
//
// Tiefer liegende Server-Komponenten (z. B. RechnerSeite) lesen das Land danach mit
// landDerAnfrage() – ohne es durchreichen zu müssen. Client-Komponenten nutzen useLand()
// (src/components/Land/useLand.js), das Land kommt dort aus dem Root-Layout.

import { cache } from "react";
import { notFound } from "next/navigation";
import { landAusPraefix } from "./laender.js";
import { alternates, fassungIndexierbar, ogLocale } from "./pfad.js";
import { spracheOder } from "../sprache/sprachen.js";
import { setzeLandQuelle, uebersetze } from "../sprache/woerterbuch.js";
import { schreibweiseFuer, setzeAusgabeLand } from "./schreibweise.js";

/** Speicher je Anfrage (React cache): Land und Sprache der gerade gerenderten Seite. */
const anfrage = cache(() => ({ land: null, sprache: "de", gesetzt: false }));

// Server-Komponenten rufen uebersetze(TEXTE, sprache) ohne Land: Das Land der Anfrage kommt von
// hier (Schweizer Schreibweise ohne „ß“ auf /ch und /en/ch, src/lib/land/schreibweise.js).
setzeLandQuelle(() => anfrage().land);
setzeAusgabeLand(() => anfrage().land); // JSON-LD auf /ch ohne „ß“ (src/components/JsonLd.js)

/**
 * Sprache aus den Routenparametern: Die englischen Routen (src/app/(en)/en/…, erzeugt mit
 * scripts/landfassungen.mjs) reichen params.sprache = "en" an dieselbe Seitenkomponente durch
 * (src/lib/sprache/route.js). Ohne Angabe: Deutsch.
 */
export const spracheAusParams = (p) => spracheOder(p?.sprache);

/**
 * Land aus den Routenparametern. Ohne params.land: gemeinsame Seite (null).
 * Unbekanntes Präfix → 404. Merkt sich das Land für landDerAnfrage().
 * @param {Promise<object>|object} params
 * @returns {Promise<"DE"|"AT"|"CH"|null>}
 */
export async function seitenLand(params) {
  const p = (await params) || {};
  let land = null;
  if (p.land !== undefined) {
    land = landAusPraefix(p.land);
    if (!land) notFound();
  }
  const a = anfrage();
  a.land = land;
  a.sprache = spracheAusParams(p);
  a.gesetzt = true;
  return land;
}

/**
 * Land der aktuellen Seite für Server-Komponenten unterhalb der Seite.
 * Nur gültig, nachdem die Seite seitenLand(params) aufgerufen hat (sonst null = gemeinsam).
 */
export function landDerAnfrage() {
  return anfrage().land;
}

/**
 * Sprache der aktuellen Seite ("de" | "en") für Server-Komponenten unterhalb der Seite.
 * Nur gültig, nachdem die Seite seitenLand(params) aufgerufen hat (sonst "de").
 */
export function spracheDerAnfrage() {
  return anfrage().sprache;
}

/**
 * generateMetadata für eine öffentliche Seite (gemeinsam, Länderfassung, englische Fassung):
 * übernimmt die Basis-Metadaten und setzt canonical, hreflang, og:url und og:locale.
 * Noindex bekommen Länderfassungen ohne eigenen Länderinhalt (Register src/lib/land/seiten.js)
 * und englische Fassungen, die noch nicht übersetzt sind (src/lib/sprache/seiten.js).
 * @param {string | ((p: object) => string)} schluessel Pfad ohne Präfix (bei [slug]-Routen aus params)
 * @param {object | ((land: string|null, p: object) => object|Promise<object>)} basis  p.sprache = "de" | "en"
 * @param {{ en?: object | ((de: object) => object) }} [woerterbuch] englische Metadaten (title,
 *   description, openGraph.title …), tief über die deutschen gelegt (uebersetze()).
 */
export function seitenMetadata(schluessel, basis, woerterbuch = {}) {
  return async function generateMetadata({ params }) {
    const p = (await params) || {};
    const land = p.land !== undefined ? landAusPraefix(p.land) : null;
    const sprache = spracheAusParams(p);
    const konkret = typeof schluessel === "function" ? schluessel(p) : schluessel;
    const roh = (typeof basis === "function" ? await basis(land, p) : basis) || {};
    const b = sprache === "en" && woerterbuch?.en ? uebersetze({ de: roh, en: woerterbuch.en }, "en") : roh;
    const a = alternates(konkret, land, { languages: b.alternates?.languages, sprache });
    const index = land || sprache !== "de" ? fassungIndexierbar(konkret, land, sprache) : null;
    const locale = land || sprache !== "de" ? { locale: ogLocale(land, sprache) } : {};
    return schreibweiseFuer({
      ...b,
      alternates: { ...(b.alternates || {}), ...a, ...(a.languages ? {} : { languages: undefined }) },
      ...(b.openGraph ? { openGraph: { ...b.openGraph, url: a.canonical, ...locale } } : {}),
      ...(index === false ? { robots: { index: false, follow: true } } : {}),
    }, land);
  };
}
