// src/lib/newsletter/themen.js – Themen und Eingabeprüfung des Newsletters je Land (Welle 3, Paket NL)
//
// Reine Funktionen ohne Server- oder React-Abhängigkeiten: genutzt vom Baustein (Browser), vom Dienst (Server)
// und von den Tests. Relative Importe mit Dateiendung (node:test lädt das Modul ohne Alias).
//
// Regeln (Masterplan Abschnitt 5 und 7, Inhaber):
//  - Themen sind frei wählbar, keines ist vorausgewählt; mindestens eines ist nötig (sonst gäbe es nichts zu senden).
//  - Jedes Abo gehört zu genau EINEM Land (DE, AT, CH): Inhalte, Recht und Zahlen bleiben je Land getrennt.
//  - Das Land kommt aus der Länderwahl der Seite (/de, /at, /ch bzw. gespeicherte Wahl); ohne Wahl wählt man es selbst.

export const NEWSLETTER_LAENDER = Object.freeze(["DE", "AT", "CH"]);
export const NEWSLETTER_SPRACHEN = Object.freeze(["de", "en"]);

/** Themen (ID → Texte). Reihenfolge = Anzeige. */
export const THEMEN = Object.freeze([
  Object.freeze({
    id: "fristen_foerderung",
    de: "Fristen & Förderung",
    en: "Deadlines & funding",
    textDe: "Gebotstermine, Förderaufrufe und Fristen, sobald sie amtlich bekannt sind.",
    textEn: "Bidding dates, funding calls and deadlines as soon as they are officially announced.",
  }),
  Object.freeze({
    id: "marktdaten",
    de: "Marktdaten",
    en: "Market data",
    textDe: "Zuschlagswerte, Marktwerte und Zubau – mit Quelle und Stand.",
    textEn: "Award values, market values and additions – with source and date.",
  }),
  Object.freeze({
    id: "flaechen_pacht",
    de: "Flächen & Pacht",
    en: "Land & leases",
    textDe: "Was sich für Eigentümer und Landwirte bei Pacht, Planung und Genehmigung ändert.",
    textEn: "What changes for landowners and farmers in leases, planning and permits.",
  }),
  Object.freeze({
    id: "energiegemeinschaften",
    de: "Energiegemeinschaften",
    en: "Energy communities",
    textDe: "Regeln, Fristen und Praxis für gemeinsam genutzten Strom.",
    textEn: "Rules, deadlines and practice for shared electricity.",
  }),
]);

export const THEMEN_IDS = Object.freeze(THEMEN.map((t) => t.id));

/** Thema in der Sprache ("de" | "en") → { id, titel, text } */
export function themaIn(t, sprache = "de") {
  const en = sprache === "en";
  return { id: t.id, titel: en ? t.en : t.de, text: en ? t.textEn : t.textDe };
}

/** Themenliste prüfen: nur bekannte IDs, ohne Doppel, in fester Reihenfolge. Unbekanntes wird verworfen. */
export function themenNormal(roh) {
  if (!Array.isArray(roh)) return [];
  const gewaehlt = new Set(roh.filter((x) => typeof x === "string"));
  return THEMEN_IDS.filter((id) => gewaehlt.has(id));
}

/** "at" → "AT"; unbekannt → "" */
export function newsletterLand(wert) {
  const s = typeof wert === "string" ? wert.trim().toUpperCase() : "";
  return NEWSLETTER_LAENDER.includes(s) ? s : "";
}

/** "en" → "en", alles andere → "de" */
export const newsletterSprache = (wert) => (wert === "en" ? "en" : "de");
