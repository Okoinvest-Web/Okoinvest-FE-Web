// src/lib/plattform/finanzierung/geschaeftsmodell.js
//
// Geschäftsmodell je Entwicklungsprojekt – Entscheidungsgrundlage für die Geschäftsführung (reine Logik):
//   verkauf      Build-to-Sell: Projektrechte/SPV verkaufen, ÖKOVOLT baut für den Investor (EPC) – Erlös heute
//   eigenbetrieb ÖkoInvest bzw. SPV betreibt selbst mit Bankfinanzierung – Barwert der Eigenkapital-Cashflows
//   contracting  Anlage im Eigentum, Strom an Kunden vor Ort (Dach-/Direktlieferung) – Barwert nach Finanzierung
//   verpachtung  Flächen-/Dachrechte an einen Betreiber weitergeben – Barwert des Nutzungsentgelts abzüglich eigener Pacht
// Vergleichsmaß: Barwert zum Eigenkapital-Diskontsatz (heutiger Wert) – dazu Kapitalbindung und Risiken.
// Orientierung, keine Beratung. Konzernsicht (EPC-Marge ÖKOVOLT) nur auf Wunsch einrechnen.

import { DACH, PACHT, PHASEN, npv } from "../../invest/markt.js";
import { cockpitBereinigen, varianteRechnen, betriebsJahre, VARIANTEN } from "./kern.js";

export const GESCHAEFTSMODELLE = {
  verkauf: { label: "Build-to-Sell (Verkauf an Investor)", kurz: "Verkauf" },
  eigenbetrieb: { label: "Eigenbetrieb mit Bankfinanzierung", kurz: "Eigenbetrieb" },
  contracting: { label: "Contracting im Eigentum (Direktlieferung)", kurz: "Contracting" },
  verpachtung: { label: "Reine Verpachtung an Betreiber", kurz: "Verpachtung" },
};
export const GESCHAEFTSMODELL_IDS = Object.keys(GESCHAEFTSMODELLE);

const rtb = PHASEN.find((p) => p.id === "rtb");

/** Standardannahmen für den Vergleich (überschreibbar) */
export function modellStandard(e) {
  return {
    verkaufspreisKwp: Math.round((rtb.preisProKwp.min + rtb.preisProKwp.max) / 2),
    epcMargePct: 0,
    finanzierung: "skulptiert",
    lieferpreisCt: DACH.ppaVorOrtCt.mittel,
    lieferAnteil: DACH.eigenverbrauch.standard,
    nutzungsentgeltJahr: Math.round((e?.mwp || 10) * 1.1 * PACHT.freiflaecheProHa.max),
  };
}

const zahl = (v, min, max, std) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return v === "" || v === null || v === undefined || !Number.isFinite(n) ? std : Math.min(max, Math.max(min, n));
};

/** Vergleich aller Geschäftsmodelle. eingaben: Cockpit-Eingaben; annahmen: siehe modellStandard */
export function geschaeftsmodellVergleich(eingaben = {}, annahmen = {}) {
  const e = cockpitBereinigen(eingaben);
  const s = modellStandard(e);
  const a = {
    verkaufspreisKwp: zahl(annahmen.verkaufspreisKwp, 0, 1500, s.verkaufspreisKwp),
    epcMargePct: zahl(annahmen.epcMargePct, 0, 30, s.epcMargePct),
    finanzierung: VARIANTEN[annahmen.finanzierung] ? annahmen.finanzierung : s.finanzierung,
    lieferpreisCt: zahl(annahmen.lieferpreisCt, 0, 60, s.lieferpreisCt),
    lieferAnteil: zahl(annahmen.lieferAnteil, 0, 1, s.lieferAnteil),
    nutzungsentgeltJahr: zahl(annahmen.nutzungsentgeltJahr, 0, 5e7, s.nutzungsentgeltJahr),
  };
  const kwp = e.mwp * 1000;
  const epcMarge = (e.capex * a.epcMargePct) / 100;

  const verkaufErloes = a.verkaufspreisKwp * kwp;
  const eigen = varianteRechnen(a.finanzierung, e);
  const eC = { ...e, modell: "contracting", preisCt: a.lieferpreisCt, lieferAnteil: a.lieferAnteil, indexierung: 0.015, vertragJahre: Math.min(20, e.laufzeit) };
  const contr = varianteRechnen(a.finanzierung, eC);
  const netto = [];
  for (let t = 1; t <= e.laufzeit; t++) netto.push((a.nutzungsentgeltJahr - e.pachtJahr) * Math.pow(1 + PACHT.indexierung, t - 1));
  const verpachtungBw = npv(e.diskontEk, [0, ...netto]);

  const zeilen = [
    {
      id: "verkauf", ...GESCHAEFTSMODELLE.verkauf, heute: verkaufErloes + epcMarge, barwert: verkaufErloes + epcMarge, kapitalbindung: 0, irr: null,
      vorteile: ["Liquidität sofort, kein Betriebs- und Marktrisiko", "Kein Eigenkapital gebunden – Mittel für neue Flächen frei"],
      risiken: ["Käufer trägt die Rendite – kein laufender Ertrag", "Preis abhängig von Zins- und Käufermarkt"],
    },
    {
      id: "eigenbetrieb", ...GESCHAEFTSMODELLE.eigenbetrieb, heute: -eigen.kapitalbedarfEk, barwert: eigen.npvEk + epcMarge, kapitalbindung: eigen.kapitalbedarfEk, irr: eigen.ekIrrNachSteuer ?? eigen.ekIrr,
      dscrMin: eigen.dscrMin, fremdkapital: eigen.fremdkapital,
      vorteile: ["Laufende Erträge über die gesamte Laufzeit", "Vermögensaufbau, späterer Verkauf als Bestandsanlage möglich"],
      risiken: ["Eigenkapital gebunden, Covenants der Bank", "Ertrags-, Preis- und Betriebsrisiko bleiben im Haus"],
    },
    {
      id: "contracting", ...GESCHAEFTSMODELLE.contracting, heute: -contr.kapitalbedarfEk, barwert: contr.npvEk + epcMarge, kapitalbindung: contr.kapitalbedarfEk, irr: contr.ekIrrNachSteuer ?? contr.ekIrr,
      dscrMin: contr.dscrMin, fremdkapital: contr.fremdkapital,
      vorteile: ["Höherer Erlös je kWh durch Direktlieferung", "Langfristige Kundenbindung"],
      risiken: ["Bonität des Abnehmers (Ausfall/Insolvenz)", "Dienstbarkeit/Dachvertrag nötig, Abnahmemenge schwankt"],
    },
    {
      id: "verpachtung", ...GESCHAEFTSMODELLE.verpachtung, heute: 0, barwert: verpachtungBw, kapitalbindung: 0, irr: null,
      vorteile: ["Kein Kapitaleinsatz, planbare Einnahmen", "Geringer Aufwand"],
      risiken: ["Niedrigster Wert, Betreiberbonität", "Nutzungsentgelt hängt von der Verhandlung ab (Annahme)"],
    },
  ];
  const beste = [...zeilen].sort((x, y) => y.barwert - x.barwert)[0];
  const verkaufZeile = zeilen[0];
  const empfehlung = `${beste.label} hat mit rund ${Math.round(beste.barwert / 1000).toLocaleString("de-DE")} T€ den höchsten Barwert${beste.kapitalbindung > 0 ? ` bei ${Math.round(beste.kapitalbindung / 1000).toLocaleString("de-DE")} T€ Eigenkapitalbindung` : ""}. ` +
    (beste.id !== "verkauf" ? `Gegenüber dem Verkauf heute (${Math.round(verkaufZeile.barwert / 1000).toLocaleString("de-DE")} T€) ist das ein Mehrwert von ${Math.round((beste.barwert - verkaufZeile.barwert) / 1000).toLocaleString("de-DE")} T€ – abzuwägen gegen Kapitalbindung und Risiken.` : "Der Verkauf setzt zugleich Eigenkapital für neue Entwicklungen frei.");
  return { eingaben: e, annahmen: a, zeilen, beste: beste.id, empfehlung, cashflowJahre: betriebsJahre(e).length };
}
