// src/lib/rechner/agriPv.js
//
// Agri-PV-Rechner: drei Wege für Landwirte im Vergleich – reine Funktionen.
//  1. Verpachten      Investor baut und betreibt, Landwirt erhält Pacht und bewirtschaftet weiter
//  2. Eigeninvestition Landwirt investiert selbst (wir planen, bauen, vermarkten)
//  3. Genossenschaft  Investor/Genossenschaft baut, Landwirt erhält Pacht UND hält einen Anteil
//
// Vereinfachungen: vor Steuern, ohne Fremdfinanzierung (Projektrendite), nominal.

import { AGRI, BAUART, ERLOESE, FREIFLAECHE, PACHT, irr, regionById, laenderSperre, eegErloesCt } from "../invest/markt.js";

export const SYSTEME = [
  { id: "vertikal", label: "Vertikal, bifazial", sub: "Kategorie II", bauart: "agriVertikal" },
  { id: "hoch", label: "Hoch aufgeständert", sub: "Kategorie I", bauart: "agriHoch" },
];

export const kulturById = (id) => AGRI.kulturen.find((k) => k.id === id) || AGRI.kulturen[0];

/** Kulturen, für die ein System üblich ist */
export const systemPasst = (kultur, system) => kultur.ertrag[system] != null;

export function agriAnlage({ ha, system, regionId }) {
  const s = SYSTEME.find((x) => x.id === system) || SYSTEME[0];
  const b = BAUART[s.bauart];
  const region = regionById(regionId);
  const kwp = (ha / b.haProMwp) * 1000;
  const kwh = kwp * region.ertrag * b.faktor;
  const capex = kwp * AGRI.capexProKwp[s.id].mittel + (kwp / 1000) * FREIFLAECHE.netzanschlussFixProMwp + kwp * FREIFLAECHE.entwicklungProKwp.min;
  return { kwp, kwh, capex, region, system: s };
}

/**
 * eingaben: { ha, system, kulturId, regionId, dbProHa?, vermarktung (eeg|ppa), anteil (0–1), laufzeit }
 */
export function agriVergleich({
  ha = 10,
  system = "vertikal",
  kulturId = "acker",
  regionId = "de-sued",
  dbProHa,
  vermarktung = "eeg",
  anteil = AGRI.beteiligungAnteil.standard,
  laufzeit = FREIFLAECHE.laufzeit,
} = {}) {
  const kultur = kulturById(kulturId);
  const sys = systemPasst(kultur, system) ? system : "hoch";
  const anlage = agriAnlage({ ha, system: sys, regionId });
  const land = anlage.region.land;
  const eeg = vermarktung === "eeg" && land === "DE";
  // EEG: Agri-PV bietet (Stand markt.js) im ersten Segment mit; nur hoch aufgeständerte
  // Anlagen erhalten den Bonus → eegBesondereCt. Vertikale Systeme: Zuschlag Freifläche.
  const ctFoerder = eeg ? (sys === "hoch" ? ERLOESE.eegBesondereCt : ERLOESE.eegFreiflaecheCt) : ERLOESE.ppaCt.mittel;
  const db = dbProHa ?? kultur.db;
  const ertragLw = kultur.ertrag[sys];

  // Landwirtschaft läuft in allen drei Wegen weiter
  const dbJahr = ha * db * ertragLw;
  const dbOhneAnlage = ha * db;
  // GAP: in DE bleibt die Fläche zu 85 % förderfähig (GAPDZV § 12). AT (eigener GAP-Strategieplan, AMA-Regeln)
  // und CH (Direktzahlungen nach DZV) werden nicht mit dem DE-Satz gerechnet – Länder-Sperre (Paket E).
  const gapJahr = land === "DE" ? ha * AGRI.direktzahlungProHa * AGRI.gapFoerderfaehig : 0;
  const pachtJahr0 = ha * PACHT.agriProHa.mittel;

  // Projekt-Cashflows (Jahr 0 = Investition)
  const projekt = (mitPacht) => {
    const cf = [-anlage.capex];
    const jahre = [];
    for (let t = 0; t < laufzeit; t++) {
      const markt = ERLOESE.merchantCt * Math.pow(1 + (ERLOESE.merchantSteigerung || 0), t);
      // EEG-Phase mit § 51 EEG (markt.js eegErloesCt); PPA ohne Abzug
      const ct = t < 20 ? (eeg ? eegErloesCt(ctFoerder, markt) : ctFoerder) : markt;
      const erloes = anlage.kwh * Math.pow(1 - FREIFLAECHE.degradation, t) * (ct / 100);
      const opex = anlage.kwp * AGRI.opexProKwp * Math.pow(1 + FREIFLAECHE.inflation, t);
      const pacht = mitPacht ? pachtJahr0 * Math.pow(1 + PACHT.indexierung, t) : 0;
      // Rückbau-Rücklage wird über die Laufzeit angespart
      const rueckbau = (anlage.kwp * FREIFLAECHE.rueckbauProKwp) / laufzeit;
      const netto = erloes - opex - pacht - rueckbau;
      cf.push(netto);
      jahre.push({ erloes, opex, pacht, netto });
    }
    return { cf, jahre };
  };

  const lwReihe = (t) => (dbJahr + gapJahr) * Math.pow(1 + PACHT.indexierung, t);
  const summeLw = Array.from({ length: laufzeit }, (_, t) => lwReihe(t)).reduce((a, b) => a + b, 0);

  // 1) Verpachten
  const pachtSumme = Array.from({ length: laufzeit }, (_, t) => pachtJahr0 * Math.pow(1 + PACHT.indexierung, t)).reduce((a, b) => a + b, 0);
  const pachten = {
    id: "pacht",
    invest: 0,
    energieJahr: pachtJahr0,
    energieSumme: pachtSumme,
    gesamtSumme: pachtSumme + summeLw,
    irr: null,
    amortisation: null,
    risiko: "gering",
  };

  // 2) Eigeninvestition (eigene Fläche, keine Pacht)
  const eigen = projekt(false);
  const eigenSumme = eigen.cf.slice(1).reduce((a, b) => a + b, 0);
  const eigenInv = {
    id: "eigen",
    invest: anlage.capex,
    energieJahr: eigen.cf[1],
    energieSumme: eigenSumme - anlage.capex,
    gesamtSumme: eigenSumme - anlage.capex + summeLw,
    irr: irr(eigen.cf, -0.5, 1),
    amortisation: amortisation(eigen.cf),
    risiko: "höher",
    erloesJahr: eigen.jahre[0].erloes,
    opexJahr: eigen.jahre[0].opex,
  };

  // 3) Genossenschaft / Beteiligung: Pacht + Anteil am Projekt (das Pacht zahlt)
  const gen = projekt(true);
  const genCf = gen.cf.map((x) => x * anteil);
  const genSumme = genCf.slice(1).reduce((a, b) => a + b, 0);
  const beteiligung = {
    id: "genossenschaft",
    invest: anlage.capex * anteil,
    energieJahr: pachtJahr0 + genCf[1],
    energieSumme: pachtSumme + genSumme + genCf[0],
    gesamtSumme: pachtSumme + genSumme + genCf[0] + summeLw,
    irr: irr(genCf, -0.5, 1),
    amortisation: amortisation(genCf),
    risiko: "mittel",
    anteil,
  };

  return {
    /** Länder-Sperre AT/CH: GAP, EEG und €-Pacht gelten nur für DE (markt.js LAENDER_SPERRE) */
    sperre: laenderSperre(land),
    anlage,
    kultur,
    system: sys,
    systemGewechselt: sys !== system,
    eeg,
    ctFoerder,
    land,
    landwirtschaft: { dbJahr, dbOhneAnlage, gapJahr, ertragLw, summe: summeLw },
    pachtJahr0,
    wege: [pachten, eigenInv, beteiligung],
    laufzeit,
  };
}

/** Jahr, in dem der kumulierte Cashflow erstmals ≥ 0 ist (linear interpoliert) */
export function amortisation(cf) {
  let kum = cf[0];
  for (let t = 1; t < cf.length; t++) {
    const vorher = kum;
    kum += cf[t];
    if (kum >= 0 && vorher < 0) return t - 1 + -vorher / cf[t];
  }
  return null;
}
