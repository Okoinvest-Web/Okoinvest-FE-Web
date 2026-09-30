// src/lib/plattform/finanzen/afa.js
//
// Anlagenbuchhaltung: lineare Abschreibung (AfA) eigener Contracting-Anlagen und Projektcontrolling – reine Funktionen.
// Maßgeblich im Betrieb ist der Abschreibungsplan des ERPNext-Assets; diese Funktionen liefern Vorschau und Demo.

import { AFA } from "./konstanten.js";
import { istDatum, jahrVon, monatVon, rund2 } from "./basis.js";

/**
 * AfA-Plan linear.
 * { anschaffungswert, nutzungsdauerJahre, inbetriebnahme (JJJJ-MM-TT), regel: AT | DE | CH, restwert = 0 }
 *   AT: Halbjahresregel – Inbetriebnahme nach dem 30.6. → im ersten Jahr halbe Jahres-AfA, Rest im Jahr nach Ablauf
 *   DE/CH: monatsgenau – im ersten Jahr (13 − Monat)/12 der Jahres-AfA
 * Rückgabe [{ jahr, afa, restbuchwert }]
 */
export function afaPlan({ anschaffungswert, nutzungsdauerJahre, inbetriebnahme, regel = "AT", restwert = 0 }) {
  const basis = rund2(Number(anschaffungswert) - Number(restwert || 0));
  const nd = Math.round(Number(nutzungsdauerJahre) || 0);
  if (!(basis > 0) || !(nd > 0) || !istDatum(inbetriebnahme)) return [];
  const jahres = basis / nd;
  const j0 = jahrVon(inbetriebnahme);
  const m0 = monatVon(inbetriebnahme);
  const ersterAnteil = regel === "AT" ? (m0 > 6 ? 0.5 : 1) : (13 - m0) / 12;
  const plan = [];
  let rest = basis;
  for (let i = 0; rest > 0.004 && i <= nd + 1; i++) {
    const soll = i === 0 ? jahres * ersterAnteil : jahres;
    const afa = rund2(Math.min(rest, soll));
    rest = rund2(rest - afa);
    plan.push({ jahr: j0 + i, afa, restbuchwert: rund2(rest + Number(restwert || 0)) });
  }
  return plan;
}

/** Buchwert zum Jahresende eines Jahres */
export function buchwert(plan, jahr, anschaffungswert) {
  const z = plan.filter((p) => p.jahr <= jahr).pop();
  return z ? z.restbuchwert : rund2(anschaffungswert);
}

export const standardNutzungsdauer = (typ) => (typ === "speicher" ? AFA.nutzungsdauerSpeicher : AFA.nutzungsdauerPv);

/**
 * Projektcontrolling: Budget vs. Ist eines Entwicklungsprojekts.
 * kosten [{kostenart, betrag}], budget (Gesamt oder {kostenart: betrag}), mwp
 */
export function budgetVergleich({ kosten = [], budget = null, mwp = null }) {
  const ist = rund2(kosten.reduce((s, k) => s + (Number(k.betrag) || 0), 0));
  const jeArt = {};
  for (const k of kosten) jeArt[k.kostenart || "sonstiges"] = rund2((jeArt[k.kostenart || "sonstiges"] || 0) + (Number(k.betrag) || 0));
  const budgetGesamt = budget === null ? null : typeof budget === "number" ? budget : rund2(Object.values(budget).reduce((s, x) => s + (Number(x) || 0), 0));
  const quote = budgetGesamt ? ist / budgetGesamt : null;
  return {
    ist, jeArt, budget: budgetGesamt,
    abweichung: budgetGesamt === null ? null : rund2(ist - budgetGesamt),
    quote: quote === null ? null : Math.round(quote * 1000) / 1000,
    ampel: quote === null ? "offen" : quote > 1 ? "rot" : quote > 0.85 ? "gelb" : "gruen",
    jeMwp: Number(mwp) > 0 ? rund2(ist / Number(mwp)) : null,
  };
}
