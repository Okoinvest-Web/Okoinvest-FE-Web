// src/lib/plattform/finanzen/pacht.js
//
// Pachtabrechnung (Gutschrift an den Eigentümer) je Fälligkeit – reine Funktionen.
//
// Vertrag (Auszug, camelCase wie im Backend):
//   modell           fest | indexiert | umsatz
//   pachtJahr        Jahrespacht in € (fest/indexiert; bei Umsatzbeteiligung ohne Bedeutung)
//   index            { reihe, basisJahr, basisIndex?, schwellePct, anteilPct, nurErhoehung }   (nur indexiert)
//   umsatz           { anteil (0,04 = 4 %), erloesCtKwh, mindestJahr }                          (nur umsatz)
//   reservierungJahr Reservierungsprämie in €/Jahr bis zum Pachtbeginn
//   flaecheHa        nur für Texte (€/ha)
//
// Ergebnis { positionen[{art, artikel, text, menge, einheit, preis, betrag}], netto, erklaerung[], klaerung|null, basis{…} }

import { indexErklaerung, indexiertePacht } from "./indexierung.js";
import { INDEX_REIHEN } from "./konstanten.js";
import { datumDe, jahrVon, rund, rund2, summe, zahlDe } from "./basis.js";

const zeitraumText = (f) => `${datumDe(f.von)} – ${datumDe(f.bis)}${f.anteil < 0.9999 ? ` (anteilig ${f.tage}/${f.tageVoll} Tage)` : ""}`;

/** Umsatzbeteiligung einer Periode: max(Anteil × Erlös, Mindestpacht anteilig) */
export function umsatzbeteiligung({ ertragKwh, erloesCtKwh, anteil, mindestJahr = 0, faktorJahr = 1 }) {
  const erloesEur = rund2((Number(ertragKwh) || 0) * (Number(erloesCtKwh) || 0) / 100);
  const anteilEur = rund2(erloesEur * (Number(anteil) || 0));
  const mindestEur = rund2((Number(mindestJahr) || 0) * faktorJahr);
  const betrag = Math.max(anteilEur, mindestEur);
  return { erloesEur, anteilEur, mindestEur, betrag: rund2(betrag), mindestGreift: mindestEur > anteilEur };
}

/**
 * Positionen einer fälligen Periode.
 * f:  Fälligkeit aus faelligkeiten() { phase, von, bis, anteil, faktorJahr, … }
 * kontext: { indexTabelle: [{reihe, jahr, wert}], ertragKwh (nur umsatz: Erzeugung der Periode lt. Monatswerten), ertragFehlt: [monate] }
 */
export function pachtPositionen(vertrag, f, { indexTabelle = [], ertragKwh = null, ertragFehlt = [] } = {}) {
  const positionen = [];
  const erklaerung = [];
  let klaerung = null;
  const ha = Number(vertrag.flaecheHa) || 0;
  const jahr = jahrVon(f.von);

  if (f.phase === "reservierung") {
    const betrag = rund2(Number(vertrag.reservierungJahr) * f.faktorJahr);
    positionen.push({ art: "reservierung", artikel: "PACHT-RES", text: `Reservierungsprämie ${zeitraumText(f)}`, menge: rund(f.faktorJahr, 4), einheit: "Jahr", preis: rund2(vertrag.reservierungJahr), betrag });
    erklaerung.push(`Bis zum Pachtbeginn erhalten Sie eine Reservierungsprämie von ${zahlDe(vertrag.reservierungJahr, 2)} € pro Jahr${ha ? ` (${zahlDe(vertrag.reservierungJahr / ha, 2)} €/ha)` : ""}, abgerechnet nach Ablauf jedes Zeitraums.`);
    return { positionen, netto: summe(positionen, "betrag"), erklaerung, klaerung, basis: { jahresbetrag: rund2(vertrag.reservierungJahr) } };
  }

  if (vertrag.modell === "umsatz") {
    const u = vertrag.umsatz || {};
    if (ertragKwh === null || ertragFehlt.length) {
      klaerung = `Ertragsdaten der Anlage fehlen für ${ertragFehlt.length ? ertragFehlt.join(", ") : "den Zeitraum"} – Umsatzbeteiligung kann nicht berechnet werden.`;
      return { positionen, netto: 0, erklaerung, klaerung, basis: {} };
    }
    const r = umsatzbeteiligung({ ertragKwh, erloesCtKwh: u.erloesCtKwh, anteil: u.anteil, mindestJahr: u.mindestJahr, faktorJahr: f.faktorJahr });
    positionen.push({
      art: "umsatz", artikel: "PACHT-UMSATZ",
      text: `Umsatzbeteiligung ${rund(u.anteil * 100, 2)} % ${zeitraumText(f)} – Erlös ${zahlDe(r.erloesEur, 2)} € (${zahlDe(ertragKwh)} kWh × ${zahlDe(u.erloesCtKwh, 3)} ct/kWh)`,
      menge: 1, einheit: "Pauschale", preis: r.anteilEur, betrag: r.anteilEur,
    });
    if (r.mindestGreift) positionen.push({ art: "mindest", artikel: "PACHT-UMSATZ", text: `Aufstockung auf die Mindestpacht (${zahlDe(u.mindestJahr, 2)} €/Jahr, anteilig ${zahlDe(r.mindestEur, 2)} €)`, menge: 1, einheit: "Pauschale", preis: rund2(r.mindestEur - r.anteilEur), betrag: rund2(r.mindestEur - r.anteilEur) });
    erklaerung.push(`Sie erhalten ${rund(u.anteil * 100, 2)} % der Stromerlöse der Anlage, mindestens ${zahlDe(u.mindestJahr, 2)} € pro Jahr. Grundlage sind die geeichten Zählerstände (Erzeugung) und ein vereinbarter Erlös von ${zahlDe(u.erloesCtKwh, 3)} ct/kWh.`);
    if (r.mindestGreift) erklaerung.push("In diesem Zeitraum lag der Erlösanteil unter der Mindestpacht – ausgezahlt wird die Mindestpacht.");
    return { positionen, netto: summe(positionen, "betrag"), erklaerung, klaerung, basis: { ...r, ertragKwh } };
  }

  // fest bzw. indexiert: Jahrespacht × Anteil der Periode
  let jahresbetrag = rund2(vertrag.pachtJahr);
  if (vertrag.modell === "indexiert") {
    const regel = { ...vertrag.index, basisBetrag: vertrag.pachtJahr, tabelle: indexTabelle };
    const verlauf = indexiertePacht(regel, jahr);
    if (verlauf.fehlt?.length) klaerung = `Indexwert fehlt (${INDEX_REIHEN[regel.reihe]?.label || regel.reihe}, ${verlauf.fehlt.join(", ")}) – bitte unter „Index (VPI)“ nachtragen.`;
    jahresbetrag = verlauf.betrag;
    erklaerung.push(...indexErklaerung(regel, verlauf, INDEX_REIHEN[regel.reihe]?.label));
    erklaerung.push(`Jahrespacht ${jahr}: ${zahlDe(jahresbetrag, 2)} € (Ausgangswert ${zahlDe(vertrag.pachtJahr, 2)} €).`);
  } else {
    erklaerung.push(`Feste Jahrespacht ${zahlDe(jahresbetrag, 2)} €${ha ? ` (${zahlDe(jahresbetrag / ha, 2)} €/ha bei ${zahlDe(ha, 2)} ha)` : ""}.`);
  }
  const betrag = rund2(jahresbetrag * f.faktorJahr);
  positionen.push({ art: vertrag.modell === "indexiert" ? "index" : "pacht", artikel: "PACHT", text: `${vertrag.modell === "indexiert" ? "Pacht (wertgesichert)" : "Pacht"} ${zeitraumText(f)}`, menge: rund(f.faktorJahr, 4), einheit: "Jahr", preis: jahresbetrag, betrag });
  return { positionen, netto: summe(positionen, "betrag"), erklaerung, klaerung, basis: { jahresbetrag } };
}

/**
 * Zahlungsaufteilung aus der Pachtakte (mehrere Eigentümer/Erben, Anteile in %): Positionen je Empfänger, centgenau –
 * je Position erhält der letzte Empfänger den Rundungsrest, die Summe bleibt exakt. Weniger als zwei Empfänger → null.
 * Rückgabe [{ nr, empfaenger, anteilProzent, positionen, netto }]
 */
export function pachtAufteilen(positionen = [], empfaenger = []) {
  const liste = (empfaenger || []).filter((e) => Number(e?.anteilProzent) > 0);
  if (liste.length < 2) return null;
  const gesamt = liste.reduce((s, e) => s + Number(e.anteilProzent), 0);
  const teile = liste.map((e, i) => ({ nr: i + 1, empfaenger: e, anteilProzent: Number(e.anteilProzent), positionen: [], netto: 0 }));
  for (const p of positionen) {
    // in ganzen Cent rechnen (gleiches Ergebnis in JS und Python)
    const cent = Math.floor(Number(p.betrag) * 100 + 0.5);
    let rest = cent;
    teile.forEach((t, i) => {
      const quote = t.anteilProzent / gesamt;
      const c = i === teile.length - 1 ? rest : Math.floor((cent * t.anteilProzent) / gesamt + 0.5);
      rest -= c;
      t.positionen.push({ ...p, text: `${p.text} – Anteil ${zahlDe(t.anteilProzent, 2)} %`, menge: rund(Number(p.menge || 0) * quote, 4), betrag: c / 100 });
    });
  }
  for (const t of teile) t.netto = summe(t.positionen, "betrag");
  return teile;
}

/** Aufteilung gilt für Zeiträume, die am Stichtag `ab` noch nicht abgelaufen sind (ohne `ab`: sofort) */
export const aufteilungGilt = (aufteilung, f) => !!aufteilung?.empfaenger?.length && (!aufteilung.ab || String(f.bis) >= String(aufteilung.ab));

/** Monate („JJJJ-MM“) eines Zeitraums – für die Ertragssumme der Umsatzbeteiligung */
export function monateImZeitraum(von, bis) {
  const liste = [];
  let [j, m] = [jahrVon(von), Number(String(von).slice(5, 7))];
  const [jb, mb] = [jahrVon(bis), Number(String(bis).slice(5, 7))];
  while (j < jb || (j === jb && m <= mb)) {
    liste.push(`${j}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      j += 1;
    }
  }
  return liste;
}

/**
 * Erzeugung (kWh) einer Periode aus Zählerstand-Monatswerten (nur Register 2.8.0 der Erzeugungszähler).
 * Teilmonate am Rand werden taggenau anteilig gerechnet. Rückgabe { kwh, fehlt: [monat…] }
 */
export function ertragAusMonatswerten(zeilen, messpunkte, von, bis) {
  const erz = new Set((messpunkte || []).filter((m) => m.art === "erzeugung" && m.abrechnungsrelevant).map((m) => m.id));
  const fehlt = [];
  let kwh = 0;
  if (!erz.size) return { kwh: null, fehlt: ["kein abrechnungsrelevanter Erzeugungszähler"] };
  for (const monat of monateImZeitraum(von, bis)) {
    const werte = (zeilen || []).filter((z) => z.monat === monat && erz.has(z.messpunktId) && z.register === "2.8.0");
    if (werte.length < erz.size || werte.some((w) => w.menge === null || w.menge === undefined)) {
      fehlt.push(monat);
      continue;
    }
    const [j, mm] = monat.split("-").map(Number);
    const tageMonat = new Date(Date.UTC(j, mm, 0)).getUTCDate();
    const start = monat === String(von).slice(0, 7) ? Number(String(von).slice(8)) : 1;
    const ende = monat === String(bis).slice(0, 7) ? Number(String(bis).slice(8)) : tageMonat;
    kwh += werte.reduce((s, w) => s + Number(w.menge), 0) * ((ende - start + 1) / tageMonat);
  }
  return { kwh: fehlt.length ? null : Math.round(kwh), fehlt };
}
