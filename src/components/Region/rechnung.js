// src/components/Region/rechnung.js
//
// Kennzahlen der Regionalseiten – reine Funktionen. Alle Marktwerte kommen aus
// src/lib/invest/markt.js; regional ist nur der spezifische Ertrag (PVGIS-Abfrage
// je Region, siehe Datendatei) und die Lage innerhalb der DACH-Pachtspanne.

import { ALLGEMEIN, BAUART, FREIFLAECHE, PACHT, regionById } from "@/lib/invest/markt";
import { pachtRechnung } from "@/lib/rechner/pacht";

export const BEISPIEL_HA = 10;

const auf100 = (v) => Math.round(v / 100) * 100;

/**
 * Pachtspanne je ha und Jahr innerhalb von PACHT.freiflaecheProHa.
 *  unten  – unteres Band (min … mittel)
 *  mitte  – mittleres Band (Mitte zwischen min/mittel … Mitte zwischen mittel/max)
 *  oben   – oberes Band (mittel … max)
 */
export function pachtSpanne(tendenz = "mitte") {
  const p = PACHT.freiflaecheProHa;
  if (tendenz === "unten") return { min: p.min, max: p.mittel };
  if (tendenz === "oben") return { min: p.mittel, max: p.max };
  return { min: auf100((p.min + p.mittel) / 2), max: auf100((p.mittel + p.max) / 2) };
}

export const TENDENZ_TEXT = {
  unten: "eher unteres Band der DACH-Spanne",
  mitte: "mittleres Band der DACH-Spanne",
  oben: "eher oberes Band der DACH-Spanne",
};
/** Sprachmodell: englische Fassung */
export const TENDENZ_TEXT_EN = {
  unten: "rather the lower band of the DACH range",
  mitte: "middle band of the DACH range",
  oben: "rather the upper band of the DACH range",
};

/** Kennzahlen für das Beispiel „10 ha“ einer Region */
export function kennzahlen(region, meta) {
  const markt = regionById(meta.markt);
  const ertrag = region?.ertrag?.kwhProKwp || markt.ertrag;
  const mwp = BEISPIEL_HA / FREIFLAECHE.haProMwp;
  const gwh = (mwp * ertrag) / 1000;
  const agriMwp = BEISPIEL_HA / BAUART.agriVertikal.haProMwp;
  const agriGwh = (agriMwp * ertrag * BAUART.agriVertikal.faktor) / 1000;
  const spanne = pachtSpanne(region?.pacht?.tendenz);
  const mittel = (spanne.min + spanne.max) / 2;
  const index = pachtRechnung({ ha: BEISPIEL_HA, regionId: meta.markt, modell: "index", proHa: mittel });
  // QM Welle 1 – Länder-Sperre (Masterplan Abschnitt 3, S1): €-Pacht nur für Deutschland, bis die
  // Rechenlogik für Österreich und die Schweiz steht (wie Paket E in den Rechnern).
  const land = region?.land || meta?.land || "DE";
  return {
    land,
    pachtGesperrt: land !== "DE",
    ertrag,
    mwp,
    gwh,
    agriMwp,
    agriGwh,
    spanne,
    pachtJahr: { min: spanne.min * BEISPIEL_HA, max: spanne.max * BEISPIEL_HA },
    pacht30Mittel: index.summeSolar,
    haushalte: (gwh * 1e6) / ALLGEMEIN.haushaltKwh,
    co2t: (gwh * 1e6 * ALLGEMEIN.co2KgProKwh) / 1000,
    agriPacht: { min: PACHT.agriProHa.min * BEISPIEL_HA, max: PACHT.agriProHa.max * BEISPIEL_HA },
  };
}
