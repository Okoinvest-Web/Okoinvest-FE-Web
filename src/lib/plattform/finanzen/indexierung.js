// src/lib/plattform/finanzen/indexierung.js
//
// Wertsicherung (Indexierung) einer Jahrespacht über einen Verbraucherpreisindex – reine Funktionen.
//
// Regel (je Vertrag einstellbar):
//   basisBetrag   Jahrespacht bei Vertragsschluss (€)
//   basisJahr     Jahr des Basisindex (Jahresdurchschnitt), basisIndex optional (sonst aus der Tabelle)
//   reihe         Index-Reihe (VPI-AT-2020, VPI-DE-2020, LIK-CH-2020)
//   schwellePct   Anpassung erst, wenn die Änderung seit der letzten Anpassung die Schwelle erreicht (0 = jährlich)
//   anteilPct     Weitergabe der Änderung in % (100 = voll)
//   nurErhoehung  nur Erhöhungen weitergeben (Hinweis: in DE nach § 2 Abs. 3 PrKG problematisch – Klauseln müssen
//                 in der Regel in beide Richtungen wirken; mit Rechtsberatung prüfen)
//
// Anpassung zum 1.1. jedes Jahres J ab dem ersten Abrechnungsjahr nach dem Basisjahr: Vergleich Jahresdurchschnitt
// J−1 mit dem Index der letzten Anpassung. Neue Pacht = alte Pacht × (1 + Anteil × (I(J−1) / I(letzte) − 1)).
// Fehlt ein Indexwert, bleibt der letzte Betrag stehen und das Ergebnis meldet `fehlt` (→ Klärfall).

import { euro, rund, rund2, zahlDe } from "./basis.js";

/** Indexwert aus der Tabelle [{reihe, jahr, wert}] */
export function indexWert(tabelle, reihe, jahr) {
  const t = (tabelle || []).find((x) => x.reihe === reihe && Number(x.jahr) === Number(jahr));
  return t && Number.isFinite(Number(t.wert)) && Number(t.wert) > 0 ? Number(t.wert) : null;
}

/**
 * Verlauf der Wertsicherung bis einschließlich `bisJahr`.
 * Rückgabe { schritte: [{jahr, referenzJahr, index, basisIndex, aenderungPct, angepasst, betrag, text}], betrag, fehlt: [jahr…] }
 */
export function indexVerlauf({ basisBetrag, basisJahr, basisIndex, reihe, tabelle, bisJahr, schwellePct = 0, anteilPct = 100, nurErhoehung = false }) {
  const start = Number(basisIndex) > 0 ? Number(basisIndex) : indexWert(tabelle, reihe, basisJahr);
  let betrag = rund2(basisBetrag);
  const schritte = [];
  const fehlt = [];
  if (!start) {
    return { schritte, betrag, fehlt: [Number(basisJahr)], basisIndex: null };
  }
  let letzterIndex = start;
  const anteil = Math.max(0, Math.min(100, Number(anteilPct ?? 100))) / 100;
  const schwelle = Math.max(0, Number(schwellePct) || 0) / 100;
  for (let jahr = Number(basisJahr) + 1; jahr <= Number(bisJahr); jahr++) {
    const ref = jahr - 1;
    const idx = ref === Number(basisJahr) ? start : indexWert(tabelle, reihe, ref);
    if (!idx) {
      fehlt.push(ref);
      schritte.push({ jahr, referenzJahr: ref, index: null, basisIndex: letzterIndex, aenderungPct: null, angepasst: false, betrag, text: `Indexwert ${ref} fehlt – Betrag unverändert` });
      continue;
    }
    const aenderung = idx / letzterIndex - 1;
    let angepasst = false;
    let text;
    if (Math.abs(aenderung) < 1e-12) text = "keine Indexänderung";
    else if (nurErhoehung && aenderung < 0) text = "Index gesunken – vereinbart ist nur eine Erhöhung";
    else if (Math.abs(aenderung) + 1e-12 < schwelle) text = `Änderung ${zahlDe(aenderung * 100, 2)} % unter der Schwelle von ${zahlDe(schwelle * 100, 2)} %`;
    else {
      const alt = betrag;
      betrag = rund2(betrag * (1 + anteil * aenderung));
      angepasst = true;
      text = `Anpassung ${aenderung > 0 ? "+" : ""}${zahlDe(aenderung * anteil * 100, 2)} % (Index ${zahlDe(letzterIndex, 1)} → ${zahlDe(idx, 1)}${anteil < 1 ? `, ${zahlDe(anteil * 100, 0)} % weitergegeben` : ""}): ${euro(alt)} → ${euro(betrag)}`;
    }
    schritte.push({ jahr, referenzJahr: ref, index: idx, basisIndex: letzterIndex, aenderungPct: rund(aenderung * 100, 3), angepasst, betrag, text });
    if (angepasst) letzterIndex = idx;
  }
  return { schritte, betrag, fehlt, basisIndex: start };
}

/** Jahrespacht für ein Kalenderjahr (Wertsicherung bis zu diesem Jahr) */
export function indexiertePacht(regel, jahr) {
  if (Number(jahr) <= Number(regel.basisJahr)) return { betrag: rund2(regel.basisBetrag), schritte: [], fehlt: [], basisIndex: regel.basisIndex || null };
  return indexVerlauf({ ...regel, bisJahr: jahr });
}

/** Verständliche Erklärung für Eigentümer (Portal, Beleg) */
export function indexErklaerung(regel, verlauf, reiheLabel = regel.reihe) {
  const zeilen = [
    `Ihre Pacht ist wertgesichert über den ${reiheLabel} (Basisjahr ${regel.basisJahr}${verlauf.basisIndex ? `, Indexwert ${zahlDe(verlauf.basisIndex, 1)}` : ""}).`,
    Number(regel.schwellePct) > 0
      ? `Angepasst wird, sobald sich der Index seit der letzten Anpassung um mindestens ${zahlDe(regel.schwellePct, Number(regel.schwellePct) % 1 ? 1 : 0)} % verändert hat.`
      : "Angepasst wird jährlich zum 1. Januar anhand des Jahresdurchschnitts des Vorjahres.",
  ];
  if (Number(regel.anteilPct ?? 100) < 100) zeilen.push(`Weitergegeben werden ${zahlDe(regel.anteilPct, 0)} % der Indexänderung.`);
  for (const s of verlauf.schritte.filter((x) => x.angepasst || x.index === null)) zeilen.push(`${s.jahr}: ${s.text}`);
  return zeilen;
}
