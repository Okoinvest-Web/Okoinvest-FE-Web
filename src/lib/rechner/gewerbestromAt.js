// src/lib/rechner/gewerbestromAt.js – AT-Gewerbestrom: Vorbereitung SNE-VO 2027 (Welle 4, Paket ATSNE)
//
// Österreich bekommt den Rechnungs-Check erst, wenn die neuen Systemnutzungsentgelte
// (SNE-GV/SNE-TV nach dem ElWG, ab 01.01.2027) im RIS kundgemacht und am Original geprüft sind.
// Bis dahin rechnet dieses Modul NICHTS mit Entgelten:
//   - es normalisiert die Eingabemaske (Netzebene, Jahresverbrauch, Leistung),
//   - es liefert die am RIS geprüfte Struktur der Entgeltbestandteile (SNE-V 2018) und die
//     Netzebenen (§ 63 ElWOG 2010) aus dem Faktenregister,
//   - es berechnet als einzige Zahl die Benutzungsstunden aus den EIGENEN Eingaben des Nutzers
//     (Plausibilität, keine Preisaussage).
// Keine geschätzten Entgelte, keine Abgabenbeträge (befristete Sondersätze der Elektrizitäts-
// abgabe sind nicht wertmäßig erfasst – siehe fakten/daten/gewerbestrom-at.js).
// Nachtrag der Werte nach Kundmachung: scripts/at-sne-nachtrag.md.
//
// Relative Importe mit Dateiendung (node:test lädt das Modul ohne Bundler).

import { fakt, faktWert } from "../fakten/index.js";

/* ------------------------------------------------------------------ */
/* Auswahllisten aus dem Faktenregister                                */
/* ------------------------------------------------------------------ */

/** Netzebenen 1–7 (§ 63 ElWOG 2010) – Gewerbe wählt üblich 3–7, Ebenen 1–2 bleiben wählbar. */
export const NETZEBENEN_AT = Object.freeze((faktWert("netzentgelt.at.netzebenen", "AT") || []).map((e) => Object.freeze({ id: e.id, nr: e.nr, label: `NE ${e.nr} · ${e.titel}` })));

/** Entgeltbestandteile nach der geltenden SNE-V 2018 (Struktur, keine Werte). */
export const BESTANDTEILE_AT = Object.freeze(faktWert("netzentgelt.at.bestandteile", "AT") || []);

/** Elektrizitätsabgabe-Regelsatz (ct/kWh) samt Quelle – nur zur Dokumentation, kein Rechenwert. */
export const ELEKTRIZITAETSABGABE_AT = fakt("abgabe.at.elektrizitaet", "AT");

/** EAG-Förderbeitrag: Mechanik belegt, Satz offen (wert null, bis die Jahresverordnung geprüft ist). */
export const EAG_FOERDERBEITRAG_AT = fakt("abgabe.at.eagFoerderbeitrag", "AT");

export const STANDARD_AT = Object.freeze({ netzebene: "ne7", verbrauchKwh: 250000, leistungKw: 0 });

const GRENZEN = Object.freeze({
  verbrauchKwh: { min: 0, max: 500_000_000 },
  leistungKw: { min: 0, max: 500_000 },
});

const zahl = (v, { min, max }, standard) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return standard;
  return Math.min(max, Math.max(min, n));
};

/** Eingaben der AT-Maske normalisieren: bekannte Netzebene, begrenzte, endliche Zahlen. */
export function atEingaben(roh = {}) {
  const netzebene = NETZEBENEN_AT.some((e) => e.id === roh.netzebene) ? roh.netzebene : STANDARD_AT.netzebene;
  return {
    netzebene,
    verbrauchKwh: zahl(roh.verbrauchKwh, GRENZEN.verbrauchKwh, STANDARD_AT.verbrauchKwh),
    leistungKw: zahl(roh.leistungKw, GRENZEN.leistungKw, STANDARD_AT.leistungKw),
  };
}

export const STUNDEN_JAHR = 8760;

/** Benutzungsstunden = Jahresverbrauch / höchste Leistung; null ohne Leistungsangabe. */
export function benutzungsstunden(verbrauchKwh, leistungKw) {
  if (!(verbrauchKwh > 0) || !(leistungKw > 0)) return null;
  return verbrauchKwh / leistungKw;
}

/**
 * AT-Check: normalisierte Eingaben + Benutzungsstunden + Plausibilität.
 * Bewusst OHNE Entgelt- oder Abgabenbeträge (siehe Kopfkommentar).
 */
export function atCheck(roh = {}) {
  const eingaben = atEingaben(roh);
  const stunden = benutzungsstunden(eingaben.verbrauchKwh, eingaben.leistungKw);
  // Mehr als 8760 Benutzungsstunden sind physikalisch unmöglich – Leistung oder Verbrauch passen nicht zusammen.
  const plausibel = stunden === null ? null : stunden <= STUNDEN_JAHR;
  const ebene = NETZEBENEN_AT.find((e) => e.id === eingaben.netzebene) || null;
  return { eingaben, ebene, benutzungsstunden: stunden, plausibel };
}
