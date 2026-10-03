// src/lib/invest/laender/regionen.js
//
// Ertragsregionen DE/AT/CH (Welle 2, Paket B1). Stammdaten (id, Land, Bezeichnung) stehen
// hier, der spezifische Ertrag kommt aus dem Faktenregister (region.<id>.ertrag, PVGIS).
// markt.js exportiert REGIONEN weiter unverändert (Fassade).

import { faktWert } from "../../fakten/index.js";

/** Stammdaten der Ertragsregionen – Reihenfolge ist Teil der Schnittstelle (REGIONEN[3] = Standard Süddeutschland) */
export const REGION_STAMM = [
  { id: "de-nord", land: "DE", label: "Norddeutschland", sub: "SH, HH, NI, HB, MV" },
  { id: "de-ost", land: "DE", label: "Ostdeutschland", sub: "BB, BE, SN, ST, TH" },
  { id: "de-west", land: "DE", label: "West- & Mitteldeutschland", sub: "NW, HE, RP, SL" },
  { id: "de-sued", land: "DE", label: "Süddeutschland", sub: "BY, BW" },
  { id: "at", land: "AT", label: "Österreich", sub: "Flach- und Hügelland" },
  { id: "ch", land: "CH", label: "Schweiz", sub: "Mittelland" },
];

/** Standardregion, wenn eine Regions-ID unbekannt ist (wie bisher regionById) */
export const STANDARD_REGION = "de-sued";

/** Standard-Ertragsregion je Land (DE: Süddeutschland wie bisher, AT/CH: die Landesregion) */
const STANDARD_JE_LAND = { DE: "de-sued", AT: "at", CH: "ch" };
export const standardRegion = (land) => STANDARD_JE_LAND[String(land || "DE").toUpperCase()] || STANDARD_REGION;

/** Alle Regionen mit Ertrag aus dem Register (neue Objekte bei jedem Aufruf) */
export function alleRegionen() {
  return REGION_STAMM.map((r) => ({ ...r, ertrag: faktWert(`region.${r.id}.ertrag`, r.land) ?? null }));
}

/** Regionen eines Landes */
export const regionenVon = (land) => alleRegionen().filter((r) => r.land === String(land || "DE").toUpperCase());
