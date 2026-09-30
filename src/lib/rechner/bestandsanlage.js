// src/lib/rechner/bestandsanlage.js
//
// Bewertung laufender PV-Anlagen (Zweitmarkt) nach dem Ertragswert- bzw.
// DCF-Verfahren. Reine Logik ohne React; Standardwerte aus
// src/lib/invest/markt.js (BESTAND, ERLOESE, PHASEN, FREIFLAECHE).
//
// Methodik (bewusst einfach und offen gelegt):
//  - Cashflow je Kalenderjahr ab BESTAND.bewertungsjahr, unverschuldet,
//    vor Ertragsteuern
//  - Erzeugung: gemessener Ø-Ertrag der letzten Jahre (kWh/kWp) × kWp,
//    Degradation ab heute
//  - Förderphase bis Ende des Jahres IBN + Förderdauer: feste Vergütung oder
//    Marktprämie (anzulegender Wert wirkt als Untergrenze)
//  - danach Marktwert Solar (Merchant) mit Steigerung, abzüglich
//    Direktvermarktungskosten
//  - Laufzeit bis Ende der technischen Nutzungsdauer – oder bis Ende des
//    Pacht-/Dachvertrags, wenn keine Verlängerung gesichert ist
//  - Kosten: Betriebskosten und Pacht (mit Inflation), optional
//    Wechselrichtertausch, Rückbau-Rücklage im letzten Jahr
//  - Ertragswert = Barwert der Cashflows; Spanne: Diskont ±1 Prozentpunkt
//    kombiniert mit Ertrag ±5 %

import { BESTAND, ERLOESE, FREIFLAECHE, PACHT, PHASEN, REGIONEN, regionById, npv, irr } from "../invest/markt.js";

export const PHASE_BESTAND = PHASEN.find((p) => p.id === "cod");

/** Grober Richtwert der Vergütung nach IBN-Jahr (nur Vorbelegung) */
export function verguetungRichtwert(ibnJahr) {
  return (BESTAND.verguetungRichtwerte.find((v) => ibnJahr <= v.bis) || BESTAND.verguetungRichtwerte.at(-1)).ct;
}

export const STANDARD = {
  kwp: 2000,
  ibnJahr: 2012,
  modell: "fest", // fest | marktpraemie
  verguetungCt: verguetungRichtwert(2012),
  foerderJahre: BESTAND.foerderJahre,
  ertragKwhKwp: 1000,
  regionId: "de-sued",
  typ: "freiflaeche", // freiflaeche | dach (nur für den Prognosevergleich)
  degradation: BESTAND.degradation,
  opexKwp: BESTAND.opexProKwp,
  pachtJahr: 6000,
  pachtEndeJahr: 2042,
  pachtVerlaengerbar: true,
  nutzungsdauer: BESTAND.nutzungsdauer,
  wrTausch: true,
  wrJahr: 2028,
  wrProKwp: BESTAND.wechselrichterProKwp.mittel,
  diskont: BESTAND.diskont.standard,
  merchantCt: ERLOESE.merchantCt,
  merchantSteigerung: ERLOESE.merchantSteigerung,
  rueckbau: true,
  kaufpreis: 0,
};

/** Cashflow-Reihe und Kennzahlen für eine Eingabe */
export function rechneBestand(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const start = BESTAND.bewertungsjahr;
  const alter = start - e.ibnJahr; // Betriebsjahre bis zum Bewertungsjahr
  const foerderEnde = e.ibnJahr + e.foerderJahre; // letztes Kalenderjahr mit Förderung (DE: IBN-Jahr + 20)
  const technischEnde = e.ibnJahr + e.nutzungsdauer;
  const ende = e.pachtVerlaengerbar ? technischEnde : Math.min(technischEnde, e.pachtEndeJahr);
  const restJahre = Math.max(0, ende - start + 1);
  const foerderRest = Math.max(0, Math.min(foerderEnde, ende) - start + 1);

  const jahre = [];
  for (let i = 0; i < restJahre; i++) {
    const jahr = start + i;
    const t = i + 1;
    const kwh = e.kwp * e.ertragKwhKwp * Math.pow(1 - e.degradation, i);
    const marktCt = e.merchantCt * Math.pow(1 + e.merchantSteigerung, i);
    const gefoerdert = jahr <= foerderEnde;
    const preisCt = gefoerdert ? (e.modell === "marktpraemie" ? Math.max(e.verguetungCt, marktCt) : e.verguetungCt) : marktCt - BESTAND.direktvermarktungCt;
    const erloes = (kwh * preisCt) / 100;
    const opex = e.kwp * e.opexKwp * Math.pow(1 + FREIFLAECHE.inflation, i);
    const pacht = e.pachtJahr * Math.pow(1 + PACHT.indexierung, i);
    const wr = e.wrTausch && jahr === e.wrJahr ? e.kwp * e.wrProKwp : 0;
    const rueckbau = e.rueckbau && i === restJahre - 1 ? e.kwp * FREIFLAECHE.rueckbauProKwp : 0;
    const cf = erloes - opex - pacht - wr - rueckbau;
    jahre.push({ jahr, t, kwh, preisCt, gefoerdert, erloes, opex, pacht, wr, rueckbau, cf });
  }

  const cfs = [0, ...jahre.map((j) => j.cf)];
  const wert = npv(e.diskont, cfs);
  const wertBei = (diskont, ertragFaktor) =>
    npv(diskont, [0, ...jahre.map((j) => j.cf + (j.erloes * (ertragFaktor - 1)))]);
  const spanne = {
    min: wertBei(e.diskont + 0.01, 0.95),
    max: wertBei(Math.max(e.diskont - 0.01, 0.001), 1.05),
  };

  // Barwert-Anteil der Förderphase
  const bwFoerder = jahre.filter((j) => j.gefoerdert).reduce((s, j) => s + j.cf / Math.pow(1 + e.diskont, j.t), 0);

  // Prognosevergleich: Ertrag laut Region (Freifläche optimal bzw. Dach) im heutigen Alter
  const region = regionById(e.regionId);
  const typFaktor = e.typ === "dach" ? 0.93 : 1;
  const prognose = region.ertrag * typFaktor * Math.pow(1 - e.degradation, Math.max(alter, 0));
  const performance = prognose > 0 ? e.ertragKwhKwp / prognose : null;

  const wertProKwp = e.kwp > 0 ? wert / e.kwp : 0;
  const band = PHASE_BESTAND.preisProKwp;
  const einordnung = wertProKwp < band.min ? "unter" : wertProKwp > band.max ? "ueber" : "in";

  const kaufIrr = e.kaufpreis > 0 ? irr([-e.kaufpreis, ...jahre.map((j) => j.cf)], -0.3, 1) : null;

  return {
    eingabe: e,
    start,
    alter,
    foerderEnde,
    technischEnde,
    ende,
    restJahre,
    foerderRest,
    jahre,
    wert,
    wertProKwp,
    spanne,
    spanneProKwp: { min: spanne.min / e.kwp, max: spanne.max / e.kwp },
    anteilFoerderung: wert > 0 ? bwFoerder / wert : null,
    summeCf: jahre.reduce((s, j) => s + j.cf, 0),
    erloesJahr1: jahre[0]?.erloes || 0,
    cfJahr1: jahre[0]?.cf || 0,
    prognose,
    performance,
    einordnung,
    band,
    kaufIrr,
  };
}

/**
 * Sensitivität: Wert je kWp bei verändertem Diskontsatz (Zeilen, Prozent-
 * punkte) und Marktpreis nach Förderende (Spalten, relativ).
 */
export function sensitivitaet(eingabe = {}, schritteDiskont = [-0.015, -0.0075, 0, 0.0075, 0.015], schrittePreis = [-0.3, -0.15, 0, 0.15, 0.3]) {
  const e = { ...STANDARD, ...eingabe };
  return schritteDiskont.map((dd) => ({
    diskont: dd,
    wertDiskont: e.diskont + dd,
    zellen: schrittePreis.map((dp) => {
      const r = rechneBestand({ ...e, diskont: Math.max(e.diskont + dd, 0.001), merchantCt: e.merchantCt * (1 + dp) });
      return { preis: dp, wertProKwp: r.wertProKwp };
    }),
  }));
}

/** Tornado: Wirkung einzelner Annahmen auf den Ertragswert (€) */
export function tornado(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const basis = rechneBestand(e).wert;
  const faelle = [
    { id: "ertrag", label: "Ertrag ±10 %", tief: { ertragKwhKwp: e.ertragKwhKwp * 0.9 }, hoch: { ertragKwhKwp: e.ertragKwhKwp * 1.1 } },
    { id: "diskont", label: "Diskontsatz ±1 Pp.", tief: { diskont: e.diskont + 0.01 }, hoch: { diskont: Math.max(e.diskont - 0.01, 0.001) } },
    { id: "markt", label: "Marktpreis nach Förderung ±25 %", tief: { merchantCt: e.merchantCt * 0.75 }, hoch: { merchantCt: e.merchantCt * 1.25 } },
    { id: "opex", label: "Betriebskosten ±20 %", tief: { opexKwp: e.opexKwp * 1.2 }, hoch: { opexKwp: e.opexKwp * 0.8 } },
    { id: "laufzeit", label: "Nutzungsdauer ±5 Jahre", tief: { nutzungsdauer: e.nutzungsdauer - 5 }, hoch: { nutzungsdauer: e.nutzungsdauer + 5 } },
  ];
  return faelle
    .map((f) => {
      const tief = rechneBestand({ ...e, ...f.tief }).wert - basis;
      const hoch = rechneBestand({ ...e, ...f.hoch }).wert - basis;
      return { id: f.id, label: f.label, tief, hoch, spanne: Math.abs(hoch - tief) };
    })
    .sort((a, b) => b.spanne - a.spanne);
}

export { REGIONEN };

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/bestandsanlage.js                  */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };

  const r = rechneBestand();
  pruefe(r.foerderEnde === 2032, "IBN 2012 + 20 Jahre Förderung → letztes Förderjahr 2032");
  pruefe(r.foerderRest === 2032 - BESTAND.bewertungsjahr + 1, "Förder-Restlaufzeit ab Bewertungsjahr");
  pruefe(r.ende === 2042, "Nutzungsdauer 30 Jahre → Ende 2042");
  pruefe(r.jahre.length === 2042 - BESTAND.bewertungsjahr + 1, "Anzahl Restjahre");
  pruefe(r.jahre[0].preisCt === STANDARD.verguetungCt, "Förderphase mit fester Vergütung");
  pruefe(!r.jahre.at(-1).gefoerdert, "am Ende Merchant");
  pruefe(r.wert > 0 && r.spanne.min < r.wert && r.wert < r.spanne.max, "Wert liegt in der Spanne");
  pruefe(r.jahre.find((j) => j.jahr === STANDARD.wrJahr).wr > 0, "Wechselrichtertausch im gewählten Jahr");

  const cfs = [0, ...r.jahre.map((j) => j.cf)];
  pruefe(Math.abs(npv(STANDARD.diskont, cfs) - r.wert) < 1e-6, "Ertragswert = npv der Cashflows");

  const kauf = rechneBestand({ kaufpreis: r.wert });
  pruefe(Math.abs(kauf.kaufIrr - STANDARD.diskont) < 0.001, "Kaufpreis = Ertragswert → Käufer-IRR = Diskontsatz");

  const teurer = rechneBestand({ diskont: 0.08 });
  pruefe(teurer.wert < r.wert, "höherer Diskont senkt den Wert");
  const pachtKurz = rechneBestand({ pachtVerlaengerbar: false, pachtEndeJahr: 2035 });
  pruefe(pachtKurz.ende === 2035 && pachtKurz.wert < r.wert, "kurzer Pachtvertrag ohne Verlängerung begrenzt Laufzeit und Wert");
  const mp = rechneBestand({ modell: "marktpraemie", verguetungCt: 3, merchantCt: 6, merchantSteigerung: 0 });
  pruefe(Math.abs(mp.jahre[0].preisCt - 6) < 1e-9, "Marktprämie: höherer Marktwert bleibt");
  const alt = rechneBestand({ ibnJahr: 1995, nutzungsdauer: 30 });
  pruefe(alt.restJahre === 0 && alt.wert === 0, "Anlage jenseits der Nutzungsdauer hat keinen Ertragswert");

  pruefe(verguetungRichtwert(2010) === 27 && verguetungRichtwert(2024) === 5, "Richtwerte Vergütung");
  const m = sensitivitaet();
  pruefe(m.length === 5 && m[0].zellen.length === 5, "Sensitivitätsmatrix 5 × 5");
  pruefe(m[0].zellen[4].wertProKwp > m[4].zellen[0].wertProKwp, "niedriger Diskont + hoher Preis schlägt das Gegenteil");
  const tor = tornado();
  pruefe(tor.length === 5 && tor[0].spanne >= tor[4].spanne, "Tornado sortiert");

  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /bestandsanlage\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  console.log(
    `Beispiel 2 MWp, IBN 2012, ${r.eingabe.verguetungCt} ct bis ${r.foerderEnde}: Ertragswert ${Math.round(r.wert)} € ` +
      `(${Math.round(r.wertProKwp)} €/kWp, Spanne ${Math.round(r.spanneProKwp.min)}–${Math.round(r.spanneProKwp.max)} €/kWp), ` +
      `Förderanteil ${(r.anteilFoerderung * 100).toFixed(0)} %, Performance ${(r.performance * 100).toFixed(0)} %, Einordnung ${r.einordnung}`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest bestandsanlage.js: alle Prüfungen bestanden.");
}
