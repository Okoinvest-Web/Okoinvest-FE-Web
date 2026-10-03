// src/lib/rechner/dachpacht.js
//
// Dachpacht-Rechner: Was bringt eine große Dachfläche als PV-Standort?
// Reine Logik ohne React (Rechner, Seiten-Beispiele und Selbsttest nutzen
// dieselben Zahlen). Alle Standardwerte aus src/lib/invest/markt.js.
//
// Methodik (bewusst einfach und offen gelegt):
//  - Leistung = Dachfläche / m² je kWp der Dachart (brutto inkl. Abständen)
//  - Ertrag = Regionsertrag × Dachartfaktor × Ausrichtungsfaktor (nur
//    geneigte Dächer), Degradation p. a.
//  - Pachtspanne je Jahr aus €/m² (Hauptmaß) und Plausibilisierung über
//    €/kWp sowie den Anteil an den Stromerlösen (Volleinspeisung Dach)
//  - Drei Wege über die Laufzeit, nominal und als Barwert:
//      A) Dachpacht fest (kein Kapital, kein Betriebsrisiko)
//      B) Pacht + Strombezug vom eigenen Dach (On-Site-PPA): reduzierte
//         Pacht + Ersparnis = Eigenverbrauch × (Netzstrompreis − PPA-Preis)
//      C) Eigeninvestition: Investition, Eigenverbrauch zum Netzstrompreis,
//         Überschuss zur Einspeisevergütung, Betriebskosten mit Inflation
//  - Einmalzahlung = Barwert der Jahrespacht zum Betreiber-Diskontsatz

import { DACH, FREIFLAECHE, FINANZIERUNG, STROM, regionById, laenderSperre, npv, irr } from "../invest/markt.js";

export const NETZSTROM_CT = Math.round(STROM.bestandteile.reduce((s, b) => s + b.ct, 0) * 10) / 10;

export const STANDARD = {
  m2: 5000,
  dachart: "trapez",
  ausrichtung: "sued",
  regionId: "de-sued",
  laufzeit: DACH.laufzeit,
  pachtProM2: DACH.pachtProM2.mittel,
  strompreisCt: NETZSTROM_CT,
  eigenverbrauch: DACH.eigenverbrauch.standard,
  ppaCt: DACH.ppaVorOrtCt.mittel,
  capexKwp: DACH.capexProKwp.mittel,
  opexKwp: DACH.opexProKwp,
  einspeiseCt: DACH.ueberschussCt,
  diskont: FINANZIERUNG.diskont,
  sanierung: false,
};

export const dachartById = (id) => DACH.dacharten.find((d) => d.id === id) || DACH.dacharten[0];
export const ausrichtungById = (id) => DACH.ausrichtung.find((a) => a.id === id) || DACH.ausrichtung[0];

/** Barwert einer konstanten Jahreszahlung (nachschüssig) */
export const rentenbarwert = (betrag, zins, jahre) => (zins === 0 ? betrag * jahre : (betrag * (1 - Math.pow(1 + zins, -jahre))) / zins);

export function rechneDach(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const dach = dachartById(e.dachart);
  const region = regionById(e.regionId);
  const sanierungKosten = e.m2 * DACH.sanierungProM2.mittel;

  if (!dach.belegbar) {
    return { eingabe: e, sperre: laenderSperre(region.land), dach, region, belegbar: false, sanierungKosten };
  }

  const geneigt = e.dachart !== "flach";
  const ausrichtung = geneigt ? ausrichtungById(e.ausrichtung) : { id: "ostWest", label: "Ost/West aufgeständert", faktor: 1 };
  const kwp = e.m2 / dach.m2ProKwp;
  const spezErtrag = region.ertrag * dach.ertragFaktor * ausrichtung.faktor;
  const kwhJahr1 = kwp * spezErtrag;
  const n = e.laufzeit;

  // Pachtspanne je Jahr
  const pachtSpanne = {
    min: e.m2 * DACH.pachtProM2.min,
    mittel: e.m2 * DACH.pachtProM2.mittel,
    max: e.m2 * DACH.pachtProM2.max,
  };
  const pachtJahr = e.m2 * e.pachtProM2;
  const pachtProKwp = pachtJahr / kwp;
  const erloesVoll = (kwhJahr1 * DACH.eegDachCt) / 100;
  const pachtAnteilErloes = erloesVoll > 0 ? pachtJahr / erloesVoll : null;
  const einmalzahlung = rentenbarwert(pachtJahr, DACH.einmalDiskont, n);

  // Jahreswerte der drei Wege
  const capex = kwp * e.capexKwp;
  const jahre = [];
  let sumA = 0;
  let sumB = 0;
  let sumC = -capex;
  for (let t = 1; t <= n; t++) {
    const kwh = kwhJahr1 * Math.pow(1 - FREIFLAECHE.degradation, t - 1);
    const eigen = kwh * e.eigenverbrauch;
    const ueberschuss = kwh - eigen;
    const a = pachtJahr;
    const bPacht = pachtJahr * DACH.ppaPachtAnteil;
    const bErsparnis = (eigen * Math.max(e.strompreisCt - e.ppaCt, 0)) / 100;
    const b = bPacht + bErsparnis;
    const cErsparnis = (eigen * e.strompreisCt) / 100;
    const cEinspeisung = (ueberschuss * e.einspeiseCt) / 100;
    const cOpex = kwp * e.opexKwp * Math.pow(1 + FREIFLAECHE.inflation, t - 1);
    const c = cErsparnis + cEinspeisung - cOpex;
    sumA += a;
    sumB += b;
    sumC += c;
    jahre.push({ jahr: t, kwh, eigen, ueberschuss, a, b, bPacht, bErsparnis, c, cErsparnis, cEinspeisung, cOpex, sumA, sumB, sumC });
  }

  const cfA = [0, ...jahre.map((j) => j.a)];
  const cfB = [0, ...jahre.map((j) => j.b)];
  const cfC = [-capex, ...jahre.map((j) => j.c)];

  let amortisation = null;
  let kum = -capex;
  for (const j of jahre) {
    const vorher = kum;
    kum += j.c;
    if (amortisation == null && kum >= 0 && j.c > 0) amortisation = j.jahr - 1 + -vorher / j.c;
  }

  const wege = {
    pacht: { id: "pacht", label: "Dachpacht", jahr1: jahre[0].a, summe: sumA, barwert: npv(e.diskont, cfA), invest: 0, irr: null },
    ppa: { id: "ppa", label: "Pacht + Dachstrom (PPA)", jahr1: jahre[0].b, summe: sumB, barwert: npv(e.diskont, cfB), invest: 0, irr: null },
    eigen: { id: "eigen", label: "Eigeninvestition", jahr1: jahre[0].c, summe: sumC, barwert: npv(e.diskont, cfC), invest: capex, irr: irr(cfC), amortisation },
  };

  return {
    eingabe: e,
    /** Länder-Sperre AT/CH: EEG-Dachzuschlag, DE-Strompreis und €-Pacht gelten nur für DE (markt.js LAENDER_SPERRE) */
    sperre: laenderSperre(region.land),
    belegbar: true,
    dach,
    region,
    ausrichtung,
    kwp,
    spezErtrag,
    kwhJahr1,
    pachtSpanne,
    pachtJahr,
    pachtProKwp,
    pachtAnteilErloes,
    erloesVoll,
    einmalzahlung,
    capex,
    jahre,
    wege,
    sanierungKosten,
    /** Wie viele Jahre Pacht entspricht die Dachsanierung? */
    sanierungInPachtjahren: pachtJahr > 0 ? sanierungKosten / pachtJahr : null,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/dachpacht.js                       */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };

  const r = rechneDach({ m2: 6000, dachart: "trapez", ausrichtung: "sued", regionId: "de-sued", pachtProM2: 2 });
  pruefe(Math.abs(r.kwp - 1000) < 1e-9, "6.000 m² Trapez / 6 m² je kWp = 1.000 kWp");
  pruefe(Math.abs(r.spezErtrag - 1100 * 0.95) < 1e-9, "Süd-Trapez in Süddeutschland = 1.045 kWh/kWp");
  pruefe(Math.abs(r.pachtJahr - 12000) < 1e-9, "Pacht 2 €/m² × 6.000 m² = 12.000 €/Jahr");
  pruefe(Math.abs(r.pachtProKwp - 12) < 1e-9, "entspricht 12 €/kWp");
  pruefe(r.pachtAnteilErloes > 0.08 && r.pachtAnteilErloes < 0.2, `Pacht als Erlösanteil plausibel (ist ${(r.pachtAnteilErloes * 100).toFixed(1)} %)`);
  pruefe(Math.abs(r.wege.pacht.summe - 12000 * DACH.laufzeit) < 1e-6, "Summe Pacht = Jahrespacht × Laufzeit");
  pruefe(r.einmalzahlung < r.wege.pacht.summe && r.einmalzahlung > 12000 * 10, "Einmalzahlung zwischen 10-facher Jahrespacht und Summe");
  pruefe(r.jahre.length === DACH.laufzeit, "Jahresreihe über die Laufzeit");
  pruefe(r.wege.eigen.irr != null && r.wege.eigen.irr > 0.03 && r.wege.eigen.irr < 0.25, `Eigeninvestition IRR plausibel (ist ${((r.wege.eigen.irr || 0) * 100).toFixed(1)} %)`);
  pruefe(r.wege.ppa.summe > r.wege.pacht.summe * DACH.ppaPachtAnteil, "PPA-Weg bringt mehr als die reduzierte Pacht");

  const flach = rechneDach({ m2: 7000, dachart: "flach", ausrichtung: "nord" });
  pruefe(Math.abs(flach.kwp - 1000) < 1e-9, "Flachdach 7 m² je kWp");
  pruefe(flach.ausrichtung.faktor === 1, "Flachdach ignoriert die Dachausrichtung (Ost/West aufgeständert)");

  const nord = rechneDach({ m2: 6000, ausrichtung: "nord" });
  pruefe(nord.kwhJahr1 < r.kwhJahr1, "Nord-Dach erzeugt weniger");

  const asbest = rechneDach({ m2: 6000, dachart: "faserzement" });
  pruefe(asbest.belegbar === false && asbest.sanierungKosten > 0, "Faserzement nicht belegbar, Sanierungskosten ausgewiesen");

  const ohneEv = rechneDach({ m2: 6000, eigenverbrauch: 0 });
  pruefe(Math.abs(ohneEv.wege.ppa.summe - ohneEv.wege.pacht.summe * DACH.ppaPachtAnteil) < 1e-6, "ohne Eigenverbrauch: PPA-Weg = reduzierte Pacht");
  const teuer = rechneDach({ m2: 6000, strompreisCt: 30 });
  pruefe(teuer.wege.eigen.barwert > r.wege.eigen.barwert, "höherer Netzstrompreis verbessert die Eigeninvestition");
  pruefe(Math.abs(rentenbarwert(100, 0, 10) - 1000) < 1e-9, "Rentenbarwert ohne Zins");

  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /dachpacht\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  const p = (x) => (x == null ? "–" : `${(x * 100).toFixed(1)} %`);
  console.log(
    `Beispiel 6.000 m² Trapez Süd, Süddeutschland: ${Math.round(r.kwp)} kWp, ${Math.round(r.kwhJahr1 / 1000)} MWh/Jahr, Pacht ${Math.round(r.pachtJahr)} €/Jahr ` +
      `(${p(r.pachtAnteilErloes)} der Erlöse), Einmalzahlung ${Math.round(r.einmalzahlung)} €, Eigeninvest IRR ${p(r.wege.eigen.irr)}, Amortisation ${r.wege.eigen.amortisation?.toFixed(1)} J.`
  );
  console.log(`Barwerte: Pacht ${Math.round(r.wege.pacht.barwert)} €, PPA ${Math.round(r.wege.ppa.barwert)} €, Eigen ${Math.round(r.wege.eigen.barwert)} €`);
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest dachpacht.js: alle Prüfungen bestanden.");
}
