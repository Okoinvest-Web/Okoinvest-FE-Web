// src/lib/sprache/begriffe.js – englische Fachbegriffe für Daten, die an mehreren Stellen erscheinen
// (Projektbörse, Phasen, Netzanschluss …). Gleiche Schlüssel wie die deutschen Konstanten
// (src/lib/plattform/konstanten.js, src/lib/invest/markt.js). Für die Übersetzer-Teams: hier
// ergänzen statt in jeder Komponente neu übersetzen. Fehlt ein Begriff → deutscher Text.
//
// Glossar (verbindlich für alle englischen Texte):
//   Freiflächen-PV → ground-mounted PV · Agri-PV → agrivoltaics · Projektbörse → project exchange
//   Pacht → lease · Flächencheck → land check · Projektrechte → project rights · baureif → ready-to-build
//   Bestandsanlage → operating asset · Reststrom → residual power · Großspeicher → battery storage
//   Virtuelles Kraftwerk → virtual power plant · Energiegemeinschaft → energy community
//   Kommune/Gemeinde → municipality · Netzanschluss → grid connection · Dienstbarkeit → easement
//   Bebauungsplan (B-Plan) → development plan · Widmung → zoning · Exposé → exposé
//   Gesetze und Programme bleiben im Original (EEG, EAG, ElWG, RPG, BauGB), beim ersten Auftreten
//   mit kurzer Erklärung („EEG (German Renewable Energy Sources Act)“).

import { fmtZahl } from "./format.js";

export const BEGRIFFE_EN = Object.freeze({
  projektTyp: {
    freiflaeche: "Ground-mounted PV",
    agri: "Agrivoltaics",
    carport: "Solar carport / car park",
    speicher: "Battery storage",
    hybrid: "PV with storage",
    dach: "Rooftop PV (commercial/warehouse)",
  },
  land: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
  netzanschluss: {
    offen: "Not yet requested",
    angefragt: "Grid request submitted",
    zusage: "Grid connection commitment in place",
    reserviert: "Capacity reserved",
    vorhanden: "Connection in place (operating)",
  },
  preisModus: { gesamt: "Total purchase price", proKwp: "Price per kWp", anfrage: "On request" },
  phaseKurz: { flaeche: "Land secured", netz: "Grid commitment", aufstellung: "Zoning resolution", satzung: "Building rights", rtb: "Ready-to-build", cod: "Operating" },
  phase: {
    flaeche: "Land secured",
    netz: "Grid connection commitment",
    aufstellung: "Development plan resolution (B-Plan)",
    satzung: "Adopted plan / building rights",
    rtb: "Ready-to-build (RTB)",
    cod: "In operation (COD / operating asset)",
  },
  projektStatus: { reserviert: "Reserved" },
});

/** Englischer Begriff mit Rückfall auf den deutschen. */
export const begriffEn = (gruppe, schluessel, deutsch) => BEGRIFFE_EN[gruppe]?.[schluessel] ?? deutsch;

/** MWp im englischen Zahlenformat ("12.5 MWp"). */
export const mwpEn = (n) => (Number.isFinite(Number(n)) ? `${fmtZahl(Number(n), Number(n) < 10 ? 1 : 0, "en")} MWp` : "–");

/** Preisindikation eines Projekts auf Englisch (wie preisText() in src/lib/plattform/format.js). */
export function preisTextEn(p) {
  if (!p || p.preisModus === "anfrage" || (!p.preis && !p.preisProKwp)) return BEGRIFFE_EN.preisModus.anfrage;
  if (p.preisModus === "proKwp" && p.preisProKwp) return `€${fmtZahl(p.preisProKwp, 0, "en")}/kWp`;
  if (p.preis) return p.preis >= 1e6 ? `€${fmtZahl(p.preis / 1e6, 2, "en")}m` : `€${fmtZahl(p.preis, 0, "en")}`;
  return BEGRIFFE_EN.preisModus.anfrage;
}

/* ------------------------------------------------------------------ */
/* Rechner (Gruppe 3): Ertragsregionen und Länder-Sperre               */
/* ------------------------------------------------------------------ */

/** Ertragsregionen (src/lib/invest/laender/regionen.js) – Langform, Kurzform, Zusatz. */
export const REGIONEN_EN = Object.freeze({
  "de-nord": { label: "Northern Germany", kurz: "North DE" },
  "de-ost": { label: "Eastern Germany", kurz: "East DE" },
  "de-west": { label: "Western & central Germany", kurz: "West DE" },
  "de-sued": { label: "Southern Germany", kurz: "South DE" },
  at: { label: "Austria", kurz: "Austria", sub: "Lowlands and hills" },
  ch: { label: "Switzerland", kurz: "Switzerland", sub: "Swiss Plateau" },
});

/** Region auf Englisch: feld "label" | "kurz" | "sub" (Rückfall deutscher Wert). */
export const regionEn = (id, feld, deutsch) => REGIONEN_EN[id]?.[feld] ?? deutsch;

/** Länder-Sperre der Rechner (src/lib/invest/laender/sperre.js) auf Englisch. */
export function laenderSperreEn(sperre) {
  if (!sperre) return sperre;
  const name = sperre.land === "AT" ? "Austria" : "Switzerland";
  return {
    ...sperre,
    titel: `Calculation logic for ${name} in preparation`,
    text: `For ${name} we do not yet show any euro, subsidy or lease figures here: the calculators currently use German assumptions (EEG, lease, CAP, electricity price). The country-specific logic is being reviewed by our specialists. We are happy to work through your project with you personally.`,
  };
}
