// src/lib/rechner/beteiligung.js
//
// Beteiligungsrechner Genossenschaft / Bürgerbeteiligung – ILLUSTRATION, kein
// Angebot und kein Renditeversprechen. Die Genossenschaft ist im Aufbau.
//
//   node src/lib/rechner/beteiligung.js      → Selbsttest
//
// Methodik (vorsichtig, offen gelegt):
//  - Der Park wird mit dem Solarpark-Modell (./solarpark.js) gerechnet – in drei
//    Szenarien (schlecht / mittel / gut) für Preis, Investition und Betrieb.
//  - Die Genossenschaft hält einen Anteil am Eigenkapital der Parkgesellschaft
//    und erhält denselben Anteil am Cashflow nach Zins und Tilgung.
//  - Davon gehen ab: Kosten der Genossenschaft, ein Kapitalerhalt (damit die
//    Einlagen am Ende zurückgezahlt werden können – das Eigenkapital im Park
//    verzehrt sich über die Laufzeit) und die Zuführung zur Rücklage.
//  - Der Rest wäre ausschüttungsfähig. Über die Ausschüttung entscheidet die
//    Generalversammlung; negative Jahre werden vorgetragen.
//  - Vor persönlichen Steuern; Kapitalertragsteuer optional.

import { GEMEINSCHAFTEN, FREIFLAECHE, irr } from "../invest/markt.js";
import { STANDARD as PARK, rechneSolarpark } from "./solarpark.js";

const B = GEMEINSCHAFTEN.beteiligung;

export const SZENARIEN = [
  {
    id: "schlecht",
    label: "Schlecht",
    text: "Erlöse −12 % (weniger Sonne, Abregelung, negative Preise), Marktwert nach Förderende −20 % ohne Steigerung, Bau +5 %, Betrieb +15 %",
    park: (p) => ({ preisCt: p.preisCt * 0.88, merchantCt: p.merchantCt * 0.8, merchantSteigerung: 0, capexKwp: p.capexKwp * 1.05, opexKwp: p.opexKwp * 1.15 }),
  },
  { id: "mittel", label: "Mittel", text: "Standardannahmen des Solarpark-Rechners", park: () => ({}) },
  {
    id: "gut",
    label: "Gut",
    text: "Erlöse +5 %, Marktwert nach Förderende +20 %, Bau −5 %",
    park: (p) => ({ preisCt: p.preisCt * 1.05, merchantCt: p.merchantCt * 1.2, capexKwp: p.capexKwp * 0.95 }),
  },
];

export const STANDARD = {
  anteile: 4,
  anteilEur: B.anteilEur,
  parkMwp: 10,
  regionId: PARK.regionId,
  egQuote: 0.25,
  verwaltungAnteil: B.verwaltungAnteil,
  ruecklageAnteil: B.ruecklageAnteil,
  steuer: false,
};

function genossenschaft(park, e, laufzeit) {
  const egKapital = park.ek * e.egQuote;
  const kapitalerhalt = egKapital / laufzeit;
  let vortrag = 0;
  const jahre = park.jahre.map((j) => {
    const zufluss = j.cfEk * e.egQuote;
    const kosten = egKapital * e.verwaltungAnteil * Math.pow(1 + FREIFLAECHE.inflation, j.jahr - 1);
    let ueberschuss = zufluss - kosten - kapitalerhalt + vortrag;
    vortrag = 0;
    let ruecklage = 0;
    let ausschuettung = 0;
    if (ueberschuss < 0) {
      vortrag = ueberschuss;
    } else {
      ruecklage = ueberschuss * e.ruecklageAnteil;
      ausschuettung = ueberschuss - ruecklage;
    }
    return { jahr: j.jahr, zufluss, kosten, kapitalerhalt, ruecklage, ausschuettung, quote: egKapital > 0 ? ausschuettung / egKapital : 0 };
  });
  return { egKapital, jahre, vortragEnde: vortrag };
}

export function rechneBeteiligung(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const einlage = e.anteile * e.anteilEur;
  const steuer = e.steuer ? B.kapitalertragsteuer : 0;
  const szenarien = SZENARIEN.map((s) => {
    const basis = { ...PARK, mwp: e.parkMwp, regionId: e.regionId };
    const park = rechneSolarpark({ ...basis, ...s.park(basis) });
    const laufzeit = park.jahre.length;
    const eg = genossenschaft(park, e, laufzeit);
    const mitglied = eg.jahre.map((j) => ({ jahr: j.jahr, quote: j.quote, brutto: j.quote * einlage, netto: j.quote * einlage * (1 - steuer) }));
    const summeNetto = mitglied.reduce((a, m) => a + m.netto, 0);
    // Rückzahlung der Einlage am Ende nur, wenn kein Fehlbetrag vorgetragen wurde
    const rueckzahlung = eg.vortragEnde < 0 ? Math.max(0, einlage + (eg.vortragEnde / eg.egKapital) * einlage) : einlage;
    const cfs = [-einlage, ...mitglied.map((m, i) => m.netto + (i === mitglied.length - 1 ? rueckzahlung : 0))];
    const quoteMittel = mitglied.reduce((a, m) => a + m.quote, 0) / mitglied.length;
    const quote10 = mitglied.slice(0, 10).reduce((a, m) => a + m.quote, 0) / Math.min(10, mitglied.length);
    const jahreOhne = mitglied.filter((m) => m.quote <= 0).length;
    return { ...s, park, eg, mitglied, summeNetto, rueckzahlung, rendite: irr(cfs), quoteMittel, quote10, jahreOhne, laufzeit };
  });
  return { eingabe: e, einlage, steuer, szenarien, mittel: szenarien[1] };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/beteiligung.js                     */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);
  const r = rechneBeteiligung({ anteile: 4, anteilEur: 250 });
  pruefe(r.einlage === 1000, "4 Anteile × 250 € = 1.000 €");
  const [s, m, g] = r.szenarien;
  pruefe(s.quoteMittel <= m.quoteMittel && m.quoteMittel <= g.quoteMittel, "Szenarien geordnet: schlecht ≤ mittel ≤ gut");
  pruefe(m.quoteMittel < 0.08, `Ausschüttung mittel vorsichtig < 8 % (ist ${(m.quoteMittel * 100).toFixed(2)} %)`);
  pruefe(m.mitglied.every((x) => x.quote >= 0), "keine negativen Ausschüttungen");
  const mitKosten = rechneBeteiligung({ verwaltungAnteil: 0.03 });
  pruefe(mitKosten.mittel.quoteMittel < m.quoteMittel, "höhere Kosten der eG senken die Ausschüttung");
  const st = rechneBeteiligung({ steuer: true });
  pruefe(Math.abs(st.mittel.summeNetto - m.summeNetto * (1 - 0.26375)) < 1e-6, "Kapitalertragsteuer 26,375 % mindert netto");
  const eg = m.eg;
  pruefe(Math.abs(eg.egKapital - m.park.ek * 0.25) < 1e-6, "eG-Kapital = 25 % des Park-Eigenkapitals");
  pruefe(Math.abs(eg.jahre.reduce((a, j) => a + j.kapitalerhalt, 0) - eg.egKapital) < 1e-6, "Kapitalerhalt summiert sich auf das eG-Kapital");
  pruefe(m.rendite == null || m.rendite < 0.1, "Rendite mittel plausibel");
  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /beteiligung\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  const p = (x) => (x == null ? "–" : `${(x * 100).toFixed(2)} %`);
  for (const s of r.szenarien)
    console.log(`${s.label}: Ø Ausschüttung ${p(s.quoteMittel)} (Jahre 1–10 ${p(s.quote10)}), ${s.jahreOhne} Jahre ohne, Rendite ${p(s.rendite)}, Park-EK-IRR ${p(s.park.ekIrr)}`);
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest beteiligung.js: alle Prüfungen bestanden.");
}
