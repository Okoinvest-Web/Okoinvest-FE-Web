// src/lib/land/seite.js – Bausteine für Seiten der Länderzonen (Server, nutzt next/navigation)
//
// Getrennt von index.js, damit node:test, next.config.mjs und Client-Komponenten die reine
// Länderlogik ohne Next-Server-Funktionen laden können.
//
// Jede Seite unter src/app/(laender)/[land]/… ruft am Anfang
//   const { land } = await landDerSeite(params, "/rechner/pacht");
// und exportiert
//   export const generateMetadata = landMetadata("/rechner/pacht", metadata);
// Nicht freigegebene Kombinationen (stufen.js) enden in notFound() → 404.
// Ein Test (src/lib/land/routen.test.mjs) prüft, dass jede Route genau ihren Schlüssel nutzt.

import { notFound } from "next/navigation";
import { landAusPraefix } from "./laender.js";
import { alternates, ogLocale } from "./pfad.js";
import { stufe } from "./stufen.js";

/**
 * Land aus der Route prüfen. 404, wenn das Präfix unbekannt oder die Seite im Land nicht
 * freigegeben ist.
 * @param {Promise<{land: string}>|{land: string}} params
 * @param {string | ((p: object) => string)} schluessel Pfad ohne Präfix (bei dynamischen Routen aus params)
 * @returns {Promise<{ land: "DE"|"AT"|"CH", stufe: "frei"|"vorbereitung", schluessel: string }>}
 */
export async function landDerSeite(params, schluessel) {
  const p = (await params) || {};
  const land = landAusPraefix(p.land);
  const konkret = typeof schluessel === "function" ? schluessel(p) : schluessel;
  const st = land ? stufe(konkret, land) : null;
  if (!st) notFound();
  return { land, stufe: st, schluessel: konkret };
}

/**
 * generateMetadata für eine Seite der Länderzonen: übernimmt die Basis-Metadaten der Seite und
 * setzt canonical, hreflang (alternates), og:url und og:locale je Land. „In Vorbereitung“ → noindex.
 * @param {string | ((p: object) => string)} schluessel
 * @param {object | ((land: string, p: object) => object|Promise<object>)} basis
 */
export function landMetadata(schluessel, basis) {
  return async function generateMetadata({ params }) {
    const p = (await params) || {};
    const land = landAusPraefix(p.land) || "DE";
    const konkret = typeof schluessel === "function" ? schluessel(p) : schluessel;
    const b = (typeof basis === "function" ? await basis(land, p) : basis) || {};
    const a = alternates(konkret, land);
    const st = stufe(konkret, land);
    return {
      ...b,
      alternates: { ...(b.alternates || {}), ...a },
      ...(b.openGraph ? { openGraph: { ...b.openGraph, url: a.canonical, locale: ogLocale(land) } } : {}),
      ...(st === "vorbereitung" ? { robots: { index: false, follow: true } } : {}),
    };
  };
}
