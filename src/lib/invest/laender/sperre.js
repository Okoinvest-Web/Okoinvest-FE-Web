// src/lib/invest/laender/sperre.js
//
// Länder-Sperre (Masterplan S1, „Länder-Sperre bis B1“) – aus markt.js hierher verschoben
// (Welle 2, Paket B1), damit marktFuer() sie ohne Zirkelimport nutzen kann. markt.js
// exportiert LAENDER_SPERRE, landVonRegion und laenderSperre unverändert weiter.
//
// Für Österreich und die Schweiz rechnen die öffentlichen Rechner noch mit deutscher
// Förder-, Pacht-, GAP- und Strompreislogik. Bis die Länderlogik fachlich geprüft ist
// (alle Rechenwerte des Landes im Faktenregister mit status "geprueft", siehe
// marktFuer(land).freigabe), zeigen die Rechner für diese Länder keine Geld-, EEG-, GAP-
// oder DE-Strompreiswerte, sondern den Hinweis unten. Erträge (kWh) bleiben sichtbar.
// Aufheben ist eine bewusste Entscheidung (Klasse A, zweite Prüfperson E6): Land aus
// `gesperrt` entfernen – nicht automatisch.

import { REGION_STAMM } from "./regionen.js";

export const LAENDER_SPERRE = {
  gesperrt: ["AT", "CH"],
  name: { AT: "Österreich", CH: "die Schweiz" },
  titel: { AT: "Rechenlogik für Österreich in Vorbereitung", CH: "Rechenlogik für die Schweiz in Vorbereitung" },
};

/** Land (DE/AT/CH) zu einer Regions-ID; unbekannte IDs zählen wie regionById als Süddeutschland */
export const landVonRegion = (id) => (REGION_STAMM.find((r) => r.id === id) || REGION_STAMM[3]).land;

/** "DE" | "AT" | "CH" aus Land oder Regions-ID ("AT"/"at"/"de-sued" …) */
export function landAus(landOderRegion) {
  const roh = String(landOderRegion || "DE");
  return ["DE", "AT", "CH"].includes(roh.toUpperCase()) ? roh.toUpperCase() : landVonRegion(roh);
}

/**
 * Sperrhinweis für ein Land (siehe LAENDER_SPERRE) oder null, wenn gerechnet werden darf.
 * Akzeptiert "AT"/"at" ebenso wie Regions-IDs ("at", "ch", "de-sued").
 */
export function laenderSperre(landOderRegion) {
  const land = landAus(landOderRegion);
  if (!LAENDER_SPERRE.gesperrt.includes(land)) return null;
  return {
    land,
    titel: LAENDER_SPERRE.titel[land],
    text: `Für ${LAENDER_SPERRE.name[land]} zeigen wir hier noch keine Euro-, Förder- oder Pachtwerte: Die Rechner nutzen bisher deutsche Annahmen (EEG, Pacht, GAP, Strompreis). Die Länderlogik wird gerade fachlich geprüft. Gern rechnen wir Ihr Vorhaben persönlich durch.`,
  };
}
