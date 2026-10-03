// src/lib/rechner/carport.js
//
// Wirtschaftlichkeit eines Solarcarports mit Ladepunkten – reine Logik.
// Zwei Wege im Vergleich:
//  - Kauf: Das Unternehmen investiert selbst, spart den Netzstrompreis für den
//    selbst genutzten Solarstrom und verkauft den Überschuss.
//  - Contracting/PPA: Ein Contractor baut und betreibt die Anlage; das
//    Unternehmen kauft den Solarstrom vor Ort zu einem festen Preis.
//    Der Preis wird aus den Vollkosten des Contractors hergeleitet (Annuität
//    zur Renditeerwartung + Betrieb − Überschusserlöse) plus Aufschlag.
// Stand und Quellen der Werte: src/lib/invest/markt.js.

import { CARPORT, ERLOESE, FINANZIERUNG, FREIFLAECHE, STROM, regionById, laenderSperre, co2KgProKwhFuer, annuitaet } from "../invest/markt.js";

export const STROMPREIS_STANDARD = Math.round(STROM.bestandteile.reduce((s, b) => s + b.ct, 0) * 10) / 10;

export const STANDARD = {
  stellplaetze: 60,
  regionId: "de-sued",
  strompreisCt: STROMPREIS_STANDARD,
  eigenverbrauch: 0.7,
  ac: 10,
  dc: 1,
  capexKwp: CARPORT.capexProKwp.mittel,
};

export function rechneCarport(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const region = regionById(e.regionId);
  const kwp = e.stellplaetze * CARPORT.kwpProStellplatz;
  const spez = region.ertrag * CARPORT.ertragFaktor;
  const ertrag = kwp * spez; // kWh im ersten Jahr
  const eigenKwh = ertrag * e.eigenverbrauch;
  const ueberschussKwh = ertrag - eigenKwh;

  const investPv = kwp * e.capexKwp;
  const investLaden = e.ac * CARPORT.ladepunktAc + e.dc * CARPORT.ladepunktDc;
  const invest = investPv + investLaden;
  const opexPv = kwp * CARPORT.opexProKwp;

  const L = CARPORT.laufzeit;
  const deg = FREIFLAECHE.degradation;
  const infl = FREIFLAECHE.inflation;
  const einspeiseCt = ERLOESE.merchantCt;

  /* --- Kauf ---------------------------------------------------------- */
  const kaufJahre = [];
  let kum = -invest;
  let amortisation = null;
  for (let t = 1; t <= L; t++) {
    const f = Math.pow(1 - deg, t - 1);
    const p = Math.pow(1 + infl, t - 1);
    const ersparnis = (eigenKwh * f * e.strompreisCt * p) / 100;
    const einspeisung = (ueberschussKwh * f * einspeiseCt) / 100;
    const kosten = opexPv * p;
    const cf = ersparnis + einspeisung - kosten;
    const vorher = kum;
    kum += cf;
    if (amortisation == null && kum >= 0 && cf > 0) amortisation = t - 1 + -vorher / cf;
    kaufJahre.push({ jahr: t, ersparnis, einspeisung, kosten, cf, kumuliert: kum });
  }
  const kaufJahr1 = kaufJahre[0];
  const kaufSumme = kum; // Überschuss nach Laufzeit (nominal)

  /* --- Contracting --------------------------------------------------- */
  // Vollkosten des Contractors je Jahr: Annuität auf die PV-Investition +
  // Betrieb − Erlöse aus dem Überschuss. Umgelegt auf den vor Ort
  // gelieferten Strom, plus Aufschlag.
  const n = CARPORT.contractingJahre;
  // Kapitalkosten des Contractors: Mischzins aus Fremd- und Eigenkapital
  const rendite = FINANZIERUNG.fremdkapitalQuote * FINANZIERUNG.zins + (1 - FINANZIERUNG.fremdkapitalQuote) * FINANZIERUNG.diskont;
  const annu = annuitaet(investPv, rendite, n);
  const ueberschussErloes = (ueberschussKwh * einspeiseCt) / 100;
  // Mittelwerte über die Vertragslaufzeit (Degradation, Opex-Steigerung)
  let sumF = 0;
  let sumP = 0;
  for (let t = 1; t <= n; t++) {
    sumF += Math.pow(1 - deg, t - 1);
    sumP += Math.pow(1 + infl, t - 1);
  }
  const mittelF = sumF / n;
  const mittelP = sumP / n;
  const vollkosten = annu + opexPv * mittelP - ueberschussErloes * mittelF;
  const contractingCt = eigenKwh > 0 ? ((vollkosten * (1 + CARPORT.contractingMarge)) / (eigenKwh * mittelF)) * 100 : null;

  const conJahre = [];
  let conKum = -investLaden;
  for (let t = 1; t <= L; t++) {
    const f = Math.pow(1 - deg, t - 1);
    const p = Math.pow(1 + infl, t - 1);
    const imVertrag = t <= n;
    // nach Vertragsende: Anlage geht üblicherweise an den Kunden über (hier vereinfacht: kostenlose Übernahme)
    const ersparnis = imVertrag
      ? (eigenKwh * f * (e.strompreisCt * p - (contractingCt ?? 0))) / 100
      : (eigenKwh * f * e.strompreisCt * p) / 100 + (ueberschussKwh * f * einspeiseCt) / 100 - opexPv * p;
    conKum += ersparnis;
    conJahre.push({ jahr: t, ersparnis, kumuliert: conKum, imVertrag });
  }

  const co2Faktor = co2KgProKwhFuer(region.land);
  return {
    eingabe: e,
    /** Länder-Sperre AT/CH: DE-Strompreis und Einspeiseerlöse gelten nur für DE (markt.js LAENDER_SPERRE) */
    sperre: laenderSperre(region.land),
    region,
    kwp,
    spez,
    ertrag,
    eigenKwh,
    ueberschussKwh,
    flaecheM2: e.stellplaetze * CARPORT.stellplatzM2,
    invest: { pv: investPv, laden: investLaden, summe: invest },
    opexPv,
    kauf: {
      jahre: kaufJahre,
      ersparnisJahr1: kaufJahr1.ersparnis,
      einspeisungJahr1: kaufJahr1.einspeisung,
      nettoJahr1: kaufJahr1.cf,
      amortisation,
      ueberschuss: kaufSumme,
    },
    contracting: {
      preisCt: contractingCt,
      jahre: conJahre,
      ersparnisJahr1: conJahre[0].ersparnis,
      invest: investLaden,
      ueberschuss: conKum,
      lohntSich: contractingCt != null && contractingCt < e.strompreisCt,
    },
    lcoeCt: ertrag > 0 ? ((annuitaet(investPv, rendite, L) + opexPv * mittelP) / (ertrag * mittelF)) * 100 : null,
    kapitalkosten: rendite,
    // CO₂-Faktor nur für den deutschen Strommix belegt (UBA) – für AT/CH null
    co2Tonnen: co2Faktor == null ? null : (ertrag * co2Faktor) / 1000,
    ladeleistungKw: e.ac * 11 + e.dc * 100,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/carport.js                         */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };
  const r = rechneCarport({ stellplaetze: 100, regionId: "de-sued", strompreisCt: 20, eigenverbrauch: 0.7, ac: 0, dc: 0 });
  pruefe(Math.abs(r.kwp - 260) < 1e-9, "100 Stellplätze × 2,6 kWp = 260 kWp");
  pruefe(Math.abs(r.ertrag - 260 * 1100 * 0.93) < 1, "Ertrag = kWp × Regionsertrag × Carport-Faktor");
  pruefe(Math.abs(r.invest.summe - 260 * 1350) < 1, "Invest ohne Ladepunkte = kWp × Capex");
  pruefe(r.kauf.amortisation > 5 && r.kauf.amortisation < 15, `Amortisation plausibel 5–15 J. (ist ${r.kauf.amortisation?.toFixed(1)})`);
  pruefe(r.contracting.preisCt > 10 && r.contracting.preisCt < 25, `Contracting-Preis plausibel (ist ${r.contracting.preisCt?.toFixed(1)} ct)`);
  const mehrEv = rechneCarport({ stellplaetze: 100, strompreisCt: 20, eigenverbrauch: 0.95, ac: 0, dc: 0 });
  pruefe(mehrEv.kauf.amortisation < r.kauf.amortisation, "mehr Eigenverbrauch → schnellere Amortisation");
  pruefe(mehrEv.contracting.preisCt < r.contracting.preisCt, "mehr Eigenverbrauch → günstigerer Contracting-Preis");
  const lade = rechneCarport({ stellplaetze: 100, ac: 10, dc: 2 });
  pruefe(Math.abs(lade.invest.laden - (10 * 2500 + 2 * 45000)) < 1, "Ladepunkte-Invest");
  pruefe(rechneCarport({ eigenverbrauch: 0 }).contracting.preisCt == null, "ohne Eigenverbrauch kein Contracting-Preis");
  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /carport\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  console.log(
    `Beispiel 100 Stellplätze: ${Math.round(r.kwp)} kWp, ${Math.round(r.ertrag)} kWh, Invest ${Math.round(r.invest.summe)} €, ` +
      `Amortisation ${r.kauf.amortisation?.toFixed(1)} J., Contracting ${r.contracting.preisCt?.toFixed(1)} ct, LCOE ${r.lcoeCt?.toFixed(1)} ct`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest carport.js: alle Prüfungen bestanden.");
}
