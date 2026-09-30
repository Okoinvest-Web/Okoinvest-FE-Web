// src/lib/plattform/kommune.js
//
// Kommunen (Gemeinden, Städte, Stadtwerke, Landkreise): strukturierte Anfrage und Gemeinde-Sicht.
//  - kommuneDaten(): Positivliste der Anfrage-Angaben (typ „kommune“), Gemeindeschlüssel je Land geprüft
//  - Gemeinde-Sicht: Projekte im Gemeindegebiet – nur für geprüfte (qualifizierte) kommunale Anliegen,
//    nur ab Planungsphase (dann ist die Gemeinde ohnehin beteiligt) und nur vereinfacht
//    (keine Eigentümer, keine Flurstücke, keine Pachtkonditionen)
//  - § 6 EEG: Schätzung der freiwilligen Zahlung (Platzhalter bis zum Finanzmodul)
// Reine Funktionen, client- und serverseitig nutzbar. Frappe: plattform/api/kommune.py.

import * as v from "./validierung";
import { GEMEINDE_SCHLUESSEL, gemeindeSchluessel } from "./flaecheFach";
import { BAUART, FREIFLAECHE, KOMMUNE, regionById } from "../invest/markt";

export const KOMMUNE_ABSENDER = { gemeinde: "Gemeinde / Stadt", stadtwerk: "Stadtwerk / kommunales Unternehmen", landkreis: "Landkreis / Verband" };
export const KOMMUNE_ROLLE = {
  buergermeister: "Bürgermeister/in bzw. Gemeindepräsident/in",
  bauamt: "Bauamt / Ortsplanung",
  kaemmerei: "Kämmerei / Finanzen",
  klimaschutz: "Klimaschutz- bzw. Energiemanagement",
  rat: "Mitglied des Gemeinderats",
  geschaeftsfuehrung: "Geschäftsführung Stadtwerk",
  sonstige: "Sonstige Funktion",
};
export const BAULEITPLANUNG_STAND = {
  keine: "Noch keine Planung für Freiflächen-PV",
  kriterien: "Kriterienkatalog bzw. Standortkonzept in Arbeit",
  fnp: "Flächennutzungsplan mit PV-Sonderbauflächen",
  aufstellung: "Aufstellungsbeschluss für ein Projekt gefasst",
  laufend: "Mehrere Verfahren laufen bereits",
};
export const KRITERIENKATALOG = { ja: "Liegt vor (beschlossen)", arbeit: "In Arbeit", nein: "Nein" };
export const BUERGERBETEILIGUNG = {
  genossenschaft: "Bürgerenergiegenossenschaft",
  darlehen: "Nachrangdarlehen / Sparbrief",
  gemeinschaft: "Energiegemeinschaft / Energy Sharing",
  stadtwerk: "Beteiligung des Stadtwerks",
  offen: "Noch offen",
};
export const KOMMUNE_THEMEN = { solarpark: "Solarpark", agri: "Agri-PV", kriterien: "Kriterienkatalog", beteiligung: "Bürgerbeteiligung", carport: "Parkplätze", speicher: "Speicher", dach: "Kommunale Dächer" };

/** Status kommunaler Anliegen, ab denen das Backoffice die Gemeinde geprüft hat */
export const KOMMUNE_GEPRUEFT = ["qualifiziert", "angebot", "abgeschlossen"];
/** Flächenstatus, die in der Gemeinde-Sicht erscheinen (Gemeinde ist ab Bauleitplanung beteiligt) */
export const KOMMUNE_SICHTBAR = ["planung", "bau", "betrieb"];
export const KOMMUNE_PHASE = { planung: "Bauleitplanung / Genehmigung", bau: "Im Bau", betrieb: "In Betrieb" };

/**
 * Anfrage-Angaben einer Kommune bereinigen (ergänzt die allgemeinen `daten`).
 * `land` aus dem Kontakt (sonst daten.land, sonst DE); ungültiger Gemeindeschlüssel → 422.
 */
export function kommuneDaten(d = {}, land = "DE", kontakt = {}) {
  const x = d && typeof d === "object" ? d : {};
  const l = ["DE", "AT", "CH"].includes(land) ? land : ["DE", "AT", "CH"].includes(x.land) ? x.land : "DE";
  return {
    land: l,
    absender: v.auswahl(x.absender, KOMMUNE_ABSENDER, "gemeinde"),
    gemeinde: v.text(x.gemeinde, 120) || v.text(kontakt.firma, 120),
    gemeindeSchluessel: gemeindeSchluessel(x.gemeindeSchluessel, l),
    rolle: v.auswahl(x.rolle, KOMMUNE_ROLLE, ""),
    gemeindeFlaechenHa: v.zahl(x.gemeindeFlaechenHa, { min: 0, max: 100000, stellen: 1 }),
    interesse6: l === "DE" ? v.auswahl(x.interesse6, ["ja", "nein", "unbekannt"], "") : "",
    buergerbeteiligung: v.mehrfach(x.buergerbeteiligung, BUERGERBETEILIGUNG),
    bauleitplanung: v.auswahl(x.bauleitplanung, BAULEITPLANUNG_STAND, ""),
    kriterienkatalog: v.auswahl(x.kriterienkatalog, KRITERIENKATALOG, ""),
    themen: v.mehrfach(x.themen, KOMMUNE_THEMEN),
  };
}

const normName = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\((demo|fiktiv)\)/g, "")
    .replace(/^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde|ortsgemeinde|große kreisstadt|kreisstadt|hansestadt)\s+/, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Gehört die Fläche zum Gebiet der Gemeinde? (Gemeindeschlüssel, sonst Name + Land) */
export function flaecheImGebiet(f, gemeinde) {
  if (!f || !gemeinde || (gemeinde.land && f.land && gemeinde.land !== f.land)) return false;
  const gs = f.fach?.lage?.gemeindeSchluessel;
  if (gemeinde.schluessel && gs) return gs === gemeinde.schluessel;
  return !!gemeinde.name && normName(f.ort) === normName(gemeinde.name);
}

/** § 6 EEG: freiwillige Zahlung bis 0,2 ct/kWh – grobe Schätzung je Jahr (nur DE, Freiflächen) */
export function paragraph6Schaetzung(ha, land = "DE", bundesland = "", agri = false) {
  if (land !== "DE" || !(Number(ha) > 0)) return null;
  const regionId = ["Bayern", "Baden-Württemberg"].includes(bundesland) ? "de-sued" : ["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"].includes(bundesland) ? "de-ost" : ["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"].includes(bundesland) ? "de-nord" : "de-west";
  const kwp = (Number(ha) / (agri ? BAUART.agriHoch.haProMwp : FREIFLAECHE.haProMwp)) * 1000;
  const kwh = kwp * regionById(regionId).ertrag;
  return { kwp: Math.round(kwp), kwh: Math.round(kwh), euroProJahr: Math.round((kwh * KOMMUNE.beteiligungCt) / 100) };
}

/** Vereinfachte Projektsicht für die Gemeinde – ohne personenbezogene oder vertrauliche Angaben */
export function projektFuerGemeinde(f, i) {
  const ha = Number(f.ha) || 0;
  const letzte = (f.statusVerlauf || []).filter((x) => x.status === f.status).at(-1);
  return {
    nr: i + 1,
    art: f.nutzung === "dach" ? "Dach-PV" : f.agri ? "Agri-PV" : "Freiflächen-PV",
    ha: Math.round(ha * 2) / 2,
    status: f.status,
    phase: KOMMUNE_PHASE[f.status] || f.status,
    seit: letzte?.am || f.geaendertAm || null,
    par6: f.nutzung === "dach" ? null : paragraph6Schaetzung(ha, f.land, f.bundesland, f.agri),
  };
}

export const gemeindeSchluesselInfo = (land) => GEMEINDE_SCHLUESSEL[land] || GEMEINDE_SCHLUESSEL.DE;
