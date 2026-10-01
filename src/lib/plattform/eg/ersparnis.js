// src/lib/plattform/eg/ersparnis.js
//
// Netzentgelt-, Abgaben- und Energiepreisvorteil je Beleg (Fachkonzept 4.6) – INFORMATIV: Die Reduktion zieht der
// Netzbetreiber bereits auf der Netzrechnung ab (HA II 4); der Beleg weist sie nur als Schätzung aus. Dazu die
// Energieherkunft der Gemeinschaftserzeugung. Reine Funktionen; Python-Spiegel: plattform/eg_abrechnung_kern.py.
//
// Quellen: SNE-V 2018 § 5 Abs. 1a (Regeltabelle eg/netzentgelt.js, Rundung auf 2 Kommastellen), EAG § 75 Abs. 5
// (Erneuerbaren-Förderbeitrag, arbeitsbezogener Teil), Elektrizitätsabgabegesetz (Satz 2026 (zu bestätigen)),
// Elektrizitätsabgabe-Eigenstrombefreiungsverordnung; Befreiungsreichweite unter dem ElWG (zu bestätigen).

import { rund2 } from "../mitglied/basis.js";
import { netzentgeltRegel, reduzierterAp } from "./netzentgelt.js";
import { ANLAGE_ARTEN } from "./modell.js";

/** Ordnung nach Codepunkten (gleiches Ergebnis in JS und Python) */
const vgl = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Elektrizitätsabgabe in ct/kWh – Werte (zu bestätigen), Fachkonzept 4.6 */
export const ELEKTRIZITAETSABGABE = [
  { gueltigAb: "2026-01-01", gueltigBis: "2026-12-31", haushaltCt: 0.1, sonstCt: 0.82, status: "zu_bestaetigen", quelle: "Senkung der Elektrizitätsabgabe 2026 (EY Steuernachrichten) (zu bestätigen)" },
  { gueltigAb: "2027-01-01", gueltigBis: "", haushaltCt: 1.5, sonstCt: 1.5, status: "platzhalter", quelle: "Fachkonzept 9 Punkt 5: Satz 2027 offen (zu bestätigen)" },
];
export const ERSPARNIS_TEXT = "Ihr Vorteil durch die Energiegemeinschaft (Schätzung, die Abrechnung erfolgt durch Ihren Netzbetreiber)";

const imZeitraum = (x, d) => (!x.gueltigAb || x.gueltigAb <= d) && (!x.gueltigBis || x.gueltigBis >= d);

/** Arbeitspreis Netznutzung des Netzbetreibers (ct/kWh) am Tag für die Netzebene; null = nicht gepflegt */
export function netzApFuer(netzbetreiber, datum, netzebene, ersatzCt = null) {
  const d = String(datum || "").slice(0, 10);
  const ne = Number(netzebene) || 7;
  const t = (netzbetreiber?.netzentgeltAp || []).filter((x) => Number(x.netzebene) === ne && String(x.gueltigAb || "") <= d).sort((a, b) => vgl(String(b.gueltigAb), String(a.gueltigAb)))[0];
  if (t) return { ct: Number(t.ctKwh), quelle: `${netzbetreiber.kurzname || netzbetreiber.id}, gültig ab ${t.gueltigAb}` };
  if (ersatzCt !== null && ersatzCt !== undefined && ersatzCt !== "") return { ct: Number(ersatzCt), quelle: "Annahme der Gemeinschaft (Einstellungen) – bitte mit der Netzrechnung abgleichen" };
  return { ct: null, quelle: "Netznutzungs-Arbeitspreis des Netzbetreibers nicht gepflegt" };
}

/**
 * Ersparnis einer Verbrauchsposition.
 * @param {{eigendeckungKwh:number, datum:string, modell:string, zonelevel:number, netzebene:number, netzApCt:number|null,
 *          haushalt:boolean, bezugspreisCt:number, lieferantPreisCt:number|null, efbApCt:number|null}} e
 */
export function ersparnisBerechnen({ eigendeckungKwh = 0, datum, modell, zonelevel, netzebene = 7, netzApCt = null, haushalt = true, bezugspreisCt = 0, lieferantPreisCt = null, efbApCt = null } = {}) {
  const kwh = Number(eigendeckungKwh) || 0;
  const regel = netzentgeltRegel({ datum, modell, zonelevel, netzebene });
  const quellen = [regel.quelle];
  let netzEur = null;
  let reduziertCt = null;
  if (netzApCt !== null && netzApCt !== undefined) {
    reduziertCt = reduzierterAp(netzApCt, regel.reduktionPct);
    netzEur = rund2((kwh * (Number(netzApCt) - reduziertCt)) / 100);
  }
  let abgabeEur = 0;
  let efbEur = 0;
  let abgabeCt = 0;
  if (regel.abgabenBefreit) {
    const ea = ELEKTRIZITAETSABGABE.find((x) => imZeitraum(x, String(datum).slice(0, 10)));
    abgabeCt = ea ? (haushalt ? ea.haushaltCt : ea.sonstCt) : 0;
    abgabeEur = rund2((kwh * abgabeCt) / 100);
    if (ea) quellen.push(ea.quelle);
    if (efbApCt !== null && efbApCt !== undefined) efbEur = rund2((kwh * Number(efbApCt)) / 100);
  }
  const energieEur = lieferantPreisCt !== null && lieferantPreisCt !== undefined ? rund2((kwh * (Number(lieferantPreisCt) - Number(bezugspreisCt))) / 100) : null;
  const summe = rund2((netzEur || 0) + abgabeEur + efbEur + (energieEur || 0));
  return {
    regel: regel.regel, reduktionPct: regel.reduktionPct, status: regel.status, netzApCt, reduziertCt, netzEur, abgabenBefreit: regel.abgabenBefreit, abgabeCt, abgabeEur, efbEur, energieEur, summeEur: summe,
    text: ERSPARNIS_TEXT, platzhalter: regel.status === "platzhalter", quellen,
  };
}

/** Vorteil des Erzeugers gegenüber dem Marktpreis für Überschuss (Fachkonzept 4.6) */
export function erzeugervorteil({ eingebrachtKwh = 0, einspeisepreisCt = 0, marktpreisCt = null } = {}) {
  if (marktpreisCt === null || marktpreisCt === undefined || marktpreisCt === "") return null;
  return rund2(((Number(eingebrachtKwh) || 0) * (Number(einspeisepreisCt) - Number(marktpreisCt))) / 100);
}

/**
 * Energieherkunft der Gemeinschaftserzeugung im Zeitraum (Anteile je Anlagenart, eingebrachte Menge).
 * @param {{art:string, kwh:number}[]} mengen
 */
export function herkunft(mengen = []) {
  const je = {};
  for (const m of mengen) je[m.art || "pv"] = (je[m.art || "pv"] || 0) + (Number(m.kwh) || 0);
  const summe = Object.values(je).reduce((s, x) => s + x, 0);
  const anteile = Object.entries(je).filter(([, kwh]) => kwh > 0).map(([art, kwh]) => ({ art, label: ANLAGE_ARTEN[art] || art, kwh: Math.round(kwh * 1000) / 1000, pct: summe > 0 ? Math.round((kwh / summe) * 1000) / 10 : 0 })).sort((a, b) => b.kwh - a.kwh);
  const text = anteile.length
    ? `100 % erneuerbare Energie aus Anlagen der Gemeinschaft: ${anteile.map((a) => `${a.label} ${String(a.pct).replace(".", ",")} %`).join(", ")}.`
    : "100 % erneuerbare Energie aus Anlagen der Gemeinschaft (ElWG § 68: gemeinsame Nutzung nur erneuerbarer Energie).";
  return { anteile, summeKwh: Math.round(summe * 1000) / 1000, text, quelle: "ElWG §§ 66–68 (nur erneuerbare Energie); Stromkennzeichnung im Sinn der Lieferantenpflichten (zu bestätigen)" };
}
