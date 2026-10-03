// src/lib/rechner/solarpark.js
//
// Renditerechnung eines Solarparks über die gesamte Laufzeit – reine Logik
// ohne React, damit Rechner, Hub-Vorschau und Selbsttest dieselben Zahlen
// liefern. Alle Standardwerte kommen aus src/lib/invest/markt.js.
//
// Methodik (bewusst einfach und offen gelegt):
//  - Jahreswerte, Jahr 0 = Investition, Jahr 1 … Laufzeit = Betrieb
//  - Erzeugung: Regionsertrag × Bauartfaktor, jährliche Degradation
//  - Erlöse: Vertragsphase und danach Marktwert (Merchant, heutiger Preis,
//    fortgeschrieben mit der Marktwert-Steigerung). EEG-Zuschlag wirkt im
//    Marktprämienmodell als Untergrenze: Liegt der Marktwert darüber, bleibt
//    der Marktwert. Ein PPA ist ein nominal fester Preis.
//  - § 51 EEG (seit Solarspitzengesetz): In Zeiträumen mit negativem Spotpreis
//    entfällt der anzulegende Wert. Im EEG-Modell wird in der Förderphase der
//    Anteil `negativAnteil` abgeregelt (nicht eingespeist, nicht gefördert); der
//    Erlös je kWh sinkt auf AW − Anteil × (AW − Marktwert) (markt.js eegErloesCt).
//    Die Verlängerung nach § 51a EEG ist nicht gerechnet.
//  - Länder-Sperre: Für AT/CH liefert `sperre` den Hinweis aus markt.js – die
//    Rechner zeigen dort keine Euro-/EEG-Werte (Rechenlogik nur DE).
//  - Kosten: Betriebskosten + Pacht (beide mit Inflation), Rückbau-Rücklage
//  - Finanzierung: Annuitätendarlehen über die Tilgungsdauer; optional wird
//    das Darlehen wie bei Banken üblich auf eine Mindest-DSCR begrenzt
//  - Renditen vor Steuern (Projekt- und Eigenkapital-IRR)
//  - LCOE nominal: konstanter Strompreis, bei dem der Kapitalwert zum WACC null ist

import { FREIFLAECHE, ERLOESE, FINANZIERUNG, PACHT, BAUART, regionById, laenderSperre, eegErloesCt, npv, irr, annuitaet } from "../invest/markt.js";

export const ERLOESMODELLE = {
  eeg: { label: "EEG-Zuschlag", kurz: "EEG", vertragJahre: 20, preisCt: ERLOESE.eegFreiflaecheCt },
  ppa: { label: "PPA", kurz: "PPA", vertragJahre: 10, preisCt: ERLOESE.ppaCt.mittel },
  merchant: { label: "Merchant", kurz: "Markt", vertragJahre: 0, preisCt: ERLOESE.merchantCt },
};

export const STANDARD = {
  mwp: 10,
  regionId: "de-sued",
  bauart: "sued",
  capexKwp: FREIFLAECHE.capexProKwp.mittel,
  entwicklungKwp: FREIFLAECHE.entwicklungProKwp.min,
  netzKm: 1,
  modell: "eeg",
  preisCt: ERLOESE.eegFreiflaecheCt,
  vertragJahre: 20,
  merchantCt: ERLOESE.merchantCt,
  merchantSteigerung: ERLOESE.merchantSteigerung,
  /** § 51 EEG: Anteil der Erzeugung in Zeiträumen mit negativem Preis (ohne Vergütung im EEG-Modell) */
  negativAnteil: ERLOESE.paragraph51.anteilNegativ,
  pachtHa: PACHT.freiflaecheProHa.mittel,
  opexKwp: FREIFLAECHE.opexProKwp,
  degradation: FREIFLAECHE.degradation,
  fkQuote: FINANZIERUNG.fremdkapitalQuote,
  zins: FINANZIERUNG.zins,
  tilgungJahre: FINANZIERUNG.tilgungJahre,
  laufzeit: FREIFLAECHE.laufzeit,
  inflation: FREIFLAECHE.inflation,
  ekRendite: FINANZIERUNG.diskont,
  /** Darlehen auf Mindest-DSCR begrenzen (Bankpraxis) */
  dscrBegrenzen: true,
  dscrZiel: FINANZIERUNG.dscrZiel,
};

/** Investitionsbausteine in € */
export function investition({ mwp, capexKwp, entwicklungKwp = 0, netzKm = 0 }) {
  const kwp = mwp * 1000;
  const anlage = kwp * capexKwp;
  const netz = mwp * FREIFLAECHE.netzanschlussFixProMwp + netzKm * 1000 * FREIFLAECHE.kabelProMeter;
  const entwicklung = kwp * entwicklungKwp;
  return { anlage, netz, entwicklung, summe: anlage + netz + entwicklung };
}

/**
 * Hauptrechnung. Alle Parameter optional (Standard aus STANDARD).
 * Preise in ct/kWh, Quoten als Anteil (0,75), Zins als Anteil (0,045).
 */
export function rechneSolarpark(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const kwp = e.mwp * 1000;
  const region = regionById(e.regionId);
  const bauart = BAUART[e.bauart] || BAUART.sued;
  // Optional: spezifischer Ertrag aus einem Ertragsgutachten (z. B. P50/P90 aus dem Projektdatenblatt der Börse)
  const spezErtrag = e.spezErtrag > 0 ? e.spezErtrag : region.ertrag * bauart.faktor;
  const flaecheHa = e.mwp * bauart.haProMwp;
  const inv = investition(e);
  const vertragJahre = e.modell === "merchant" ? 0 : Math.min(e.vertragJahre, e.laufzeit);

  // Erzeugung und operativer Cashflow (unabhängig von der Finanzierung)
  const betrieb = [];
  for (let t = 1; t <= e.laufzeit; t++) {
    const erzeugung = kwp * spezErtrag * Math.pow(1 - e.degradation, t - 1); // kWh
    const indexiert = Math.pow(1 + e.inflation, t - 1);
    const marktCt = e.merchantCt * Math.pow(1 + e.merchantSteigerung, t - 1);
    const imVertrag = t <= vertragJahre;
    const preisCt = !imVertrag ? marktCt : e.modell === "eeg" ? Math.max(e.preisCt, marktCt) : e.preisCt;
    // § 51 EEG: In der EEG-Förderphase ist der Anteil in negativen Zeiträumen nicht gefördert (abgeregelt)
    const mit51 = imVertrag && e.modell === "eeg";
    const vergueteterAnteil = mit51 ? 1 - Math.min(Math.max(e.negativAnteil || 0, 0), 1) : 1;
    const preisEffCt = mit51 ? eegErloesCt(e.preisCt, marktCt, e.negativAnteil || 0) : preisCt;
    const erloes = (erzeugung * preisEffCt) / 100;
    const opex = kwp * e.opexKwp * indexiert;
    const pacht = flaecheHa * e.pachtHa * Math.pow(1 + PACHT.indexierung, t - 1);
    const rueckbau = (kwp * FREIFLAECHE.rueckbauProKwp) / e.laufzeit;
    const kosten = opex + pacht + rueckbau;
    betrieb.push({ jahr: t, erzeugung, preisCt, preisEffCt, marktCt, imVertrag, vergueteterAnteil, erloes, opex, pacht, rueckbau, kosten, ebitda: erloes - kosten });
  }

  // Fremdkapital: gewünschte Quote, ggf. begrenzt durch die Mindest-DSCR
  const tilgungJahre = Math.min(e.tilgungJahre, e.laufzeit);
  const fkWunsch = inv.summe * e.fkQuote;
  const faktor = annuitaet(1, e.zins, tilgungJahre); // Rate je 1 € Darlehen
  const minCfads = Math.min(...betrieb.slice(0, tilgungJahre).map((b) => b.ebitda));
  const fkMax = minCfads > 0 ? minCfads / e.dscrZiel / faktor : 0;
  const fkBegrenzt = e.dscrBegrenzen && fkWunsch > fkMax;
  const fk = fkBegrenzt ? fkMax : fkWunsch;
  const fkQuoteEff = inv.summe > 0 ? fk / inv.summe : 0;
  const ek = inv.summe - fk;
  const rate = fk > 0 ? fk * faktor : 0;
  // Kapitalkosten für Barwert und LCOE aus der Zielstruktur (unabhängig davon,
  // ob die Bank das Darlehen kürzt) – so bleibt die LCOE vom Erlös unabhängig.
  const wacc = e.fkQuote * e.zins + (1 - e.fkQuote) * e.ekRendite;

  const jahre = [];
  let restschuld = fk;
  for (const b of betrieb) {
    const t = b.jahr;
    const { ebitda } = b;
    let zinsen = 0;
    let tilgung = 0;
    if (restschuld > 0.5 && t <= tilgungJahre) {
      zinsen = restschuld * e.zins;
      tilgung = Math.min(rate - zinsen, restschuld);
      restschuld -= tilgung;
    }
    const schuldendienst = zinsen + tilgung;
    jahre.push({
      ...b,
      zinsen,
      tilgung,
      schuldendienst,
      cfProjekt: ebitda,
      cfEk: ebitda - schuldendienst,
      dscr: schuldendienst > 0 ? ebitda / schuldendienst : null,
      restschuld: Math.max(restschuld, 0),
    });
  }

  const cfProjekt = [-inv.summe, ...jahre.map((j) => j.cfProjekt)];
  const cfEk = [-ek, ...jahre.map((j) => j.cfEk)];
  const projektIrr = irr(cfProjekt);
  const ekIrr = ek > 0 ? irr(cfEk) : null;
  const kapitalwert = npv(wacc, cfProjekt);
  const kapitalwertEk = npv(e.ekRendite, cfEk);

  // LCOE nominal: Barwert Kosten / Barwert Erzeugung (Diskont = WACC)
  const bwKosten = inv.summe + jahre.reduce((s, j) => s + j.kosten / Math.pow(1 + wacc, j.jahr), 0);
  const bwEnergie = jahre.reduce((s, j) => s + j.erzeugung / Math.pow(1 + wacc, j.jahr), 0);
  const lcoeCt = (bwKosten / bwEnergie) * 100;

  // Amortisation (Projekt, statisch-kumuliert, mit linearer Interpolation)
  let kum = -inv.summe;
  let amortisation = null;
  for (const j of jahre) {
    const vorher = kum;
    kum += j.cfProjekt;
    if (amortisation == null && kum >= 0) amortisation = j.jahr - 1 + (-vorher / j.cfProjekt);
  }
  let kumEk = -ek;
  let amortisationEk = null;
  for (const j of jahre) {
    const vorher = kumEk;
    kumEk += j.cfEk;
    if (amortisationEk == null && kumEk >= 0 && j.cfEk > 0) amortisationEk = j.jahr - 1 + (-vorher / j.cfEk);
  }

  const mitDienst = jahre.filter((j) => j.dscr != null);
  const dscrMin = mitDienst.length ? Math.min(...mitDienst.map((j) => j.dscr)) : null;
  const dscrMittel = mitDienst.length ? mitDienst.reduce((s, j) => s + j.dscr, 0) / mitDienst.length : null;

  const summe = (k) => jahre.reduce((s, j) => s + j[k], 0);

  return {
    eingabe: e,
    sperre: laenderSperre(region.land),
    kwp,
    region,
    bauart,
    spezErtrag,
    flaecheHa,
    ertragJahr1: jahre[0]?.erzeugung || 0,
    investition: inv,
    investProKwp: inv.summe / kwp,
    fk,
    fkWunsch,
    fkQuoteEff,
    fkBegrenzt,
    ek,
    rate,
    wacc,
    vertragJahre,
    jahre,
    projektIrr,
    ekIrr,
    kapitalwert,
    kapitalwertEk,
    lcoeCt,
    amortisation,
    amortisationEk,
    dscrMin,
    dscrMittel,
    summen: { erloes: summe("erloes"), kosten: summe("kosten"), schuldendienst: summe("schuldendienst"), cfEk: summe("cfEk"), erzeugung: summe("erzeugung") },
  };
}

/**
 * Sensitivität: Projekt- und EK-IRR bei veränderten Investitionskosten
 * (Zeilen) und Strompreisen (Spalten, wirkt auf Vertrags- und Marktpreis).
 */
export function sensitivitaet(eingabe = {}, schritteCapex = [-0.1, -0.05, 0, 0.05, 0.1], schrittePreis = [-0.1, -0.05, 0, 0.05, 0.1]) {
  const e = { ...STANDARD, ...eingabe };
  return schritteCapex.map((dc) => ({
    capex: dc,
    capexKwp: e.capexKwp * (1 + dc),
    zellen: schrittePreis.map((dp) => {
      const r = rechneSolarpark({ ...e, capexKwp: e.capexKwp * (1 + dc), preisCt: e.preisCt * (1 + dp), merchantCt: e.merchantCt * (1 + dp) });
      return { preis: dp, projektIrr: r.projektIrr, ekIrr: r.ekIrr, dscrMin: r.dscrMin };
    }),
  }));
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/solarpark.js                       */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };

  // Grundfall ohne § 51-Abschlag (negativAnteil 0), damit die Plausibilitätsgrenzen die Mechanik prüfen;
  // der Abschlag wird unten eigens geprüft.
  const r = rechneSolarpark({ mwp: 10, regionId: "de-sued", bauart: "sued", capexKwp: 530, modell: "eeg", preisCt: 5, vertragJahre: 20, negativAnteil: 0 });
  pruefe(r.kwp === 10000, "10 MWp = 10.000 kWp");
  pruefe(Math.abs(r.ertragJahr1 - 11_000_000) < 1, "Ertrag Jahr 1: 10.000 kWp × 1.100 kWh/kWp = 11 GWh");
  pruefe(r.lcoeCt > 4.5 && r.lcoeCt < 6.5, `LCOE plausibel 4,5–6,5 ct (ist ${r.lcoeCt.toFixed(2)})`);
  pruefe(r.projektIrr > 0.02 && r.projektIrr < 0.09, `Projekt-IRR plausibel 2–9 % (ist ${(r.projektIrr * 100).toFixed(2)} %)`);
  pruefe(r.jahre.length === 30, "30 Betriebsjahre");
  pruefe(r.jahre[19].imVertrag && !r.jahre[20].imVertrag, "EEG endet nach Jahr 20");
  pruefe(Math.abs(r.jahre[r.eingabe.tilgungJahre - 1].restschuld) < 1, "Darlehen am Ende der Tilgungsdauer getilgt");
  pruefe(r.jahre[r.eingabe.tilgungJahre].schuldendienst === 0, "nach Tilgung kein Schuldendienst");
  pruefe(Math.abs(r.fk + r.ek - r.investition.summe) < 1, "FK + EK = Investition");

  // § 51 EEG: Anteil in negativen Zeiträumen ohne Vergütung – nur EEG-Förderphase
  const p51 = rechneSolarpark({ mwp: 10, regionId: "de-sued", bauart: "sued", capexKwp: 530, modell: "eeg", preisCt: 5, vertragJahre: 20, negativAnteil: 0.2, merchantSteigerung: 0 });
  const o51 = rechneSolarpark({ mwp: 10, regionId: "de-sued", bauart: "sued", capexKwp: 530, modell: "eeg", preisCt: 5, vertragJahre: 20, negativAnteil: 0, merchantSteigerung: 0 });
  // AW 5 ct, Marktwert 4 ct: verloren geht nur die Prämie (1 ct) auf 20 % → 4,8 ct statt 5 ct
  pruefe(Math.abs(p51.jahre[0].erloes - o51.jahre[0].erloes * (4.8 / 5)) < 1, "§ 51: 20 % negativ → Erlös = AW − 0,2 × (AW − Marktwert)");
  const hochMarkt = rechneSolarpark({ negativAnteil: 0.2, preisCt: 4, merchantCt: 6, merchantSteigerung: 0 });
  pruefe(Math.abs(hochMarkt.jahre[0].preisEffCt - 6) < 1e-9, "§ 51: Marktwert über AW → kein Abzug");
  pruefe(Math.abs(p51.jahre[25].erloes - o51.jahre[25].erloes) < 1e-6, "§ 51: nach Förderende kein Abzug");
  pruefe(p51.projektIrr < o51.projektIrr, "§ 51 senkt die Rendite");
  const ppa51 = rechneSolarpark({ mwp: 10, modell: "ppa", preisCt: 5, vertragJahre: 10, negativAnteil: 0.2 });
  pruefe(ppa51.jahre[0].vergueteterAnteil === 1, "§ 51 wirkt nicht auf das PPA-Modell");
  pruefe(rechneSolarpark().eingabe.negativAnteil > 0, "Standard rechnet mit § 51-Abschlag");
  pruefe(rechneSolarpark({ regionId: "at" }).sperre?.land === "AT" && rechneSolarpark().sperre === null, "Länder-Sperre: AT gesperrt, DE frei");

  const teurer = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 600, preisCt: 5 });
  pruefe(teurer.projektIrr < r.projektIrr, "höhere Capex senken den IRR");
  const besser = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 530, preisCt: 6 });
  pruefe(besser.projektIrr > r.projektIrr, "höherer Preis erhöht den IRR");
  pruefe(Math.abs(besser.lcoeCt - r.lcoeCt) < 1e-9, "LCOE unabhängig vom Erlös");
  pruefe(r.dscrMin >= r.eingabe.dscrZiel - 1e-6, "Darlehen auf Mindest-DSCR begrenzt");
  const frei = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 530, preisCt: 5, dscrBegrenzen: false });
  pruefe(Math.abs(frei.fkQuoteEff - 0.75) < 1e-9, "ohne Begrenzung gilt die gewünschte FK-Quote");
  const eegBoden = rechneSolarpark({ negativAnteil: 0, mwp: 10, preisCt: 3, merchantCt: 5, merchantSteigerung: 0 });
  pruefe(Math.abs(eegBoden.jahre[0].preisCt - 5) < 1e-9, "EEG wirkt als Untergrenze: höherer Marktwert bleibt");
  const ppaFest = rechneSolarpark({ negativAnteil: 0, mwp: 10, modell: "ppa", preisCt: 3, vertragJahre: 10, merchantCt: 5, merchantSteigerung: 0 });
  pruefe(Math.abs(ppaFest.jahre[0].preisCt - 3) < 1e-9 && Math.abs(ppaFest.jahre[10].preisCt - 5) < 1e-9, "PPA fest, danach Marktwert");

  const ohneFk = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 530, preisCt: 5, fkQuote: 0 });
  pruefe(Math.abs(ohneFk.ekIrr - ohneFk.projektIrr) < 1e-4, "ohne Fremdkapital: EK-IRR = Projekt-IRR");
  pruefe(ohneFk.dscrMin == null, "ohne Fremdkapital kein DSCR");

  const lcoePreis = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 530, preisCt: 5, modell: "ppa", vertragJahre: 30 });
  const lcoeFall = rechneSolarpark({ negativAnteil: 0, mwp: 10, capexKwp: 530, modell: "ppa", preisCt: lcoePreis.lcoeCt, vertragJahre: 30 });
  pruefe(Math.abs(lcoeFall.projektIrr - lcoeFall.wacc) < 0.001, "Preis = LCOE über die ganze Laufzeit → Projekt-IRR = WACC");

  const m = sensitivitaet({ negativAnteil: 0, mwp: 10, capexKwp: 530, preisCt: 5 });
  pruefe(m.length === 5 && m[0].zellen.length === 5, "Sensitivitätsmatrix 5 × 5");
  pruefe(m[0].zellen[4].projektIrr > m[4].zellen[0].projektIrr, "günstig + teurer Strom schlägt teuer + billiger Strom");

  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /solarpark\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  const p = (x) => (x == null ? "–" : `${(x * 100).toFixed(2)} %`);
  console.log(
    `Beispiel 10 MWp Süd, 530 €/kWp, EEG 5 ct: Invest ${Math.round(r.investProKwp)} €/kWp, LCOE ${r.lcoeCt.toFixed(2)} ct, ` +
      `Projekt-IRR ${p(r.projektIrr)}, EK-IRR ${p(r.ekIrr)}, DSCR min ${r.dscrMin?.toFixed(2)}, Amortisation ${r.amortisation?.toFixed(1)} J., WACC ${p(r.wacc)}`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest solarpark.js: alle Prüfungen bestanden.");
}
