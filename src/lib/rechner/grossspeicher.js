// src/lib/rechner/grossspeicher.js
//
// Renditerechnung eines Batteriegroßspeichers (BESS) – Co-Location am
// Solarpark oder Stand-alone am Netzknoten. Reine Funktionen ohne React:
//
//   node src/lib/rechner/grossspeicher.js      → Selbsttest
//
// Methodik (offen gelegt, vor Steuern, ohne Finanzierung):
//  - Investition: Speichersystem (€/kWh) + Netzanschluss (€/kW) + Baukostenzuschuss
//    auf die Bezugsleistung (netzdienliche Fahrweise mit Abschlag). Paket E: BKZ auch
//    bei Co-Location – gerechnet werden Netz-Arbitrage und Regelenergie, also Laden
//    aus dem Netz; der Anschluss des Solarparks ist nur für Einspeisung ausgelegt
//    (vgl. netzanschluss.js: BKZ für Netzbezug eines Speichers; BGH EnVR 1/24).
//  - Erlöse je MW für ein 2-h-System, aufgeteilt in Arbitrage (Day-Ahead/Intraday),
//    aFRR und FCR. Die Speicherdauer skaliert nur die Arbitrage (Energie); aFRR/FCR
//    werden je MW vergütet und steigen mit längerer Dauer nicht, kürzer als 2 h
//    mindert sie (Paket E, vorher wirkte der Dauerfaktor auf alle Märkte). Co-Location mit Abschlag wegen
//    geteilter Anschlussleistung. Arbitrage sinkt mit der Kapazität (Degradation),
//    Regelleistung hängt an der Leistung und sinkt nur halb so stark. Dazu ein
//    allgemeiner Erlöstrend (mehr Speicher im Markt).
//  - Kosten: Betrieb in % der Investition (mit Inflation), Vermarktungsentgelt in %
//    der Erlöse, ggf. Netzentgelte auf Ladestrom.
//  - Kein Restwert, keine Erweiterung (Augmentation), kein Rückbau.

import { SPEICHER, FREIFLAECHE, npv, irr } from "../invest/markt.js";

export const STANDORTE = [
  { id: "colocation", label: "Co-Location", sub: "am Solarpark" },
  { id: "standalone", label: "Stand-alone", sub: "eigener Anschluss" },
];

export const EBENEN = [
  { id: "ms", label: "Mittelspannung", sub: "bis ~ 20 MW" },
  { id: "hs", label: "Hochspannung", sub: "110 kV" },
];

export const DAUERN = [1, 2, 3, 4];

const mittel = SPEICHER.erloesProMwJahr.mittel;
export const ERLOESNIVEAUS = [
  { id: "vorsichtig", label: "Vorsichtig", sub: "Floor/Tolling-Niveau", proMw: SPEICHER.erloesProMwJahr.min },
  { id: "mittel", label: "Mittel", sub: "Merchant, realistisch", proMw: mittel },
  { id: "optimistisch", label: "Optimistisch", sub: "gute Vermarktung", proMw: SPEICHER.erloesProMwJahr.max },
];

export const erloesAufteilung = (proMw) => ({
  arbitrage: Math.round((proMw * SPEICHER.erloesMix.arbitrage) / 1000) * 1000,
  afrr: Math.round((proMw * SPEICHER.erloesMix.afrr) / 1000) * 1000,
  fcr: Math.round((proMw * SPEICHER.erloesMix.fcr) / 1000) * 1000,
});

export const STANDARD = {
  mw: 10,
  dauer: 2,
  capexKwh: SPEICHER.capexProKwh.mittel,
  standort: "standalone",
  ebene: "ms",
  netzdienlich: false,
  erloese: erloesAufteilung(mittel),
  netzentgeltBefreit: true,
  lebensdauer: SPEICHER.lebensdauer,
  degradation: SPEICHER.degradation,
  erloesTrend: SPEICHER.erloesTrend,
  zyklen: SPEICHER.zyklenProJahr,
  diskont: SPEICHER.diskont,
};

export function investitionSpeicher(e) {
  const kw = e.mw * 1000;
  const kwh = kw * e.dauer;
  const system = kwh * e.capexKwh;
  const co = e.standort === "colocation";
  const netz = kw * (co ? SPEICHER.netzanschlussProKw.coLocation : SPEICHER.netzanschlussProKw[e.ebene]);
  const bkz = kw * SPEICHER.bkzProKw[e.ebene] * (e.netzdienlich ? SPEICHER.bkzNetzdienlichFaktor : 1);
  return { system, netz, bkz, summe: system + netz + bkz, kwh };
}

export function rechneSpeicher(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe, erloese: { ...STANDARD.erloese, ...(eingabe.erloese || {}) } };
  const inv = investitionSpeicher(e);
  const dauerF = SPEICHER.dauerFaktor[e.dauer] ?? 1;
  const standortF = e.standort === "colocation" ? SPEICHER.coLocationErloesFaktor : 1;
  // Arbitrage skaliert mit der Energie (Dauer), Regelleistung je MW: höchstens Faktor 1
  const basisArbitrage = e.mw * dauerF * standortF;
  const basis = e.mw * Math.min(dauerF, 1) * standortF;

  const jahre = [];
  for (let t = 1; t <= e.lebensdauer; t++) {
    const trend = Math.pow(1 + e.erloesTrend, t - 1);
    const kap = Math.pow(1 - e.degradation, t - 1);
    const leistung = Math.pow(1 - e.degradation / 2, t - 1);
    const arbitrage = e.erloese.arbitrage * basisArbitrage * kap * trend;
    const afrr = e.erloese.afrr * basis * leistung * trend;
    const fcr = e.erloese.fcr * basis * leistung * trend;
    const erloes = arbitrage + afrr + fcr;
    const betrieb = inv.system * SPEICHER.opexAnteilCapex * Math.pow(1 + FREIFLAECHE.inflation, t - 1);
    const vermarktung = erloes * SPEICHER.vermarktungAnteil;
    const entladen = inv.kwh * e.zyklen * kap; // kWh
    const geladen = entladen / SPEICHER.wirkungsgrad;
    const netzentgelt = e.netzentgeltBefreit ? 0 : geladen * (SPEICHER.netzentgeltCt / 100);
    const kosten = betrieb + vermarktung + netzentgelt;
    jahre.push({ jahr: t, arbitrage, afrr, fcr, erloes, betrieb, vermarktung, netzentgelt, kosten, cf: erloes - kosten, entladenMwh: entladen / 1000 });
  }

  const cfs = [-inv.summe, ...jahre.map((j) => j.cf)];
  const projektIrr = irr(cfs);
  const kapitalwert = npv(e.diskont, cfs);
  let kum = -inv.summe;
  let amortisation = null;
  const kumuliert = [kum];
  for (const j of jahre) {
    const vorher = kum;
    kum += j.cf;
    kumuliert.push(kum);
    if (amortisation == null && kum >= 0 && j.cf > 0) amortisation = j.jahr - 1 + -vorher / j.cf;
  }
  const j1 = jahre[0];
  return {
    eingabe: e,
    investition: inv,
    investProKwh: inv.summe / inv.kwh,
    mwh: inv.kwh / 1000,
    jahre,
    kumuliert,
    erloesJahr1: j1.erloes,
    erloesProMwJahr1: j1.erloes / e.mw,
    cfJahr1: j1.cf,
    projektIrr,
    kapitalwert,
    amortisation,
    summeCf: jahre.reduce((s, j) => s + j.cf, 0),
    zyklenTag: e.zyklen / 365,
  };
}

/** Co-Location und Stand-alone mit sonst gleichen Eingaben */
export function vergleichStandorte(eingabe = {}) {
  return STANDORTE.map((s) => ({ ...s, r: rechneSpeicher({ ...eingabe, standort: s.id }) }));
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/grossspeicher.js                   */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  const r = rechneSpeicher({ mw: 10, dauer: 2, capexKwh: 250, standort: "standalone", ebene: "ms", netzdienlich: false });
  pruefe(r.mwh === 20, "10 MW × 2 h = 20 MWh");
  pruefe(Math.abs(r.investition.system - 5_000_000) < 1, "System 20.000 kWh × 250 € = 5 Mio. €");
  pruefe(Math.abs(r.investition.bkz - 10000 * SPEICHER.bkzProKw.ms) < 1, "BKZ = kW × €/kW");
  pruefe(Math.abs(r.erloesJahr1 - 10 * (r.eingabe.erloese.arbitrage + r.eingabe.erloese.afrr + r.eingabe.erloese.fcr)) < 1, "Erlös Jahr 1 = MW × Summe Märkte (2 h, Stand-alone)");
  pruefe(r.projektIrr > 0.05 && r.projektIrr < 0.3, `IRR plausibel 5–30 % (ist ${(r.projektIrr * 100).toFixed(1)} %)`);
  pruefe(r.jahre[14].erloes < r.jahre[0].erloes, "Erlöse sinken über die Laufzeit");

  const nd = rechneSpeicher({ mw: 10, dauer: 2, capexKwh: 250, netzdienlich: true });
  pruefe(nd.investition.bkz < r.investition.bkz && nd.projektIrr > r.projektIrr, "netzdienlicher BKZ-Abschlag verbessert die Rendite");
  const co = rechneSpeicher({ mw: 10, dauer: 2, capexKwh: 250, standort: "colocation" });
  pruefe(Math.abs(co.investition.bkz - r.investition.bkz) < 1e-6, "Co-Location mit Netzbezug: BKZ wie Stand-alone");
  pruefe(co.erloesJahr1 < r.erloesJahr1, "Co-Location mit Erlösabschlag");
  const netz = rechneSpeicher({ mw: 10, dauer: 2, capexKwh: 250, netzentgeltBefreit: false });
  pruefe(netz.jahre[0].netzentgelt > 0 && netz.projektIrr < r.projektIrr, "Netzentgelte ohne Befreiung senken die Rendite");
  const lang = rechneSpeicher({ mw: 10, dauer: 4, capexKwh: 250 });
  pruefe(lang.investition.system === 2 * r.investition.system && lang.erloesJahr1 > r.erloesJahr1, "4 h: doppelte Kapazität, mehr Erlös");
  pruefe(Math.abs(lang.jahre[0].afrr - r.jahre[0].afrr) < 1e-6 && Math.abs(lang.jahre[0].fcr - r.jahre[0].fcr) < 1e-6, "Dauer > 2 h erhöht aFRR/FCR nicht (je MW)");
  const kurz = rechneSpeicher({ mw: 10, dauer: 1, capexKwh: 250 });
  pruefe(kurz.jahre[0].afrr < r.jahre[0].afrr, "1 h mindert auch aFRR/FCR");
  pruefe(Math.abs(r.kumuliert[r.kumuliert.length - 1] - (r.summeCf - r.investition.summe)) < 1, "kumulierter Cashflow konsistent");
  pruefe(vergleichStandorte({ mw: 10 }).length === 2, "Vergleich beider Standorte");
  return { fehler, beispiel: rechneSpeicher() };
}

if (typeof process !== "undefined" && process.argv?.[1] && /grossspeicher\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  const p = (x) => (x == null ? "–" : `${(x * 100).toFixed(1)} %`);
  console.log(
    `Beispiel 10 MW / 20 MWh Stand-alone MS: Invest ${(r.investition.summe / 1e6).toFixed(2)} Mio. €, Erlös J1 ${Math.round(r.erloesJahr1 / 1000)} T€, ` +
      `IRR ${p(r.projektIrr)}, NPV ${(r.kapitalwert / 1e6).toFixed(2)} Mio. €, Amortisation ${r.amortisation?.toFixed(1)} J.`
  );
  const co = rechneSpeicher({ standort: "colocation" });
  console.log(`Co-Location: Invest ${(co.investition.summe / 1e6).toFixed(2)} Mio. €, IRR ${p(co.projektIrr)}`);
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest grossspeicher.js: alle Prüfungen bestanden.");
}
