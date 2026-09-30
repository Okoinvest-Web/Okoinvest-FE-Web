// src/lib/plattform/energie/los.js
//
// Los einer Ausschreibung (ein Kunde oder Pool): Stundenreihe, Normierungskontext (Stundenpreiskurve aus der
// Terminkurve, Peak/Offpeak je Monat) und anonymisiertes Profil für Lieferanten. Reine Funktionen mit kleinem
// Zwischenspeicher (gleiche Eingaben → gleiches Ergebnis, auch im Frappe-Nachbau plattform/energie_kern.py).
//
// Los-Eintrag (Schnappschuss bei Anlage der Ausschreibung, je Kunde):
//   { kundeId, jahresKwh, profilId, analyse: {wochenprofil, monate, jahresverbrauchKwh} | null, pvKwp, speicherKwh,
//     land, spannungsebene, messart, abnahmestellen }

import { kundenReihe, reihenSumme, profilKennzahlen } from "./beschaffung.js";
import { naechsterMonat, ortszeit, stundenpreiskurve } from "./markt.js";
import { normierungKontext, profilAnonymisieren } from "./ausschreibung.js";

const CACHE = new Map();
const MAX = 40;
function gemerkt(key, fn) {
  if (CACHE.has(key)) return CACHE.get(key);
  const w = fn();
  CACHE.set(key, w);
  if (CACHE.size > MAX) CACHE.delete(CACHE.keys().next().value);
  return w;
}

/** Bis-Monat für 12 Monate ab `von` („JJJJ-MM“) */
export function zwoelfMonate(von) {
  let m = von;
  for (let i = 0; i < 11; i++) m = naechsterMonat(m);
  return m;
}

function eintragReihe(e, von, zone) {
  return kundenReihe({ von, bis: zwoelfMonate(von), jahresKwh: e.jahresKwh || 0, profilId: e.profilId || "einschicht", analyse: e.analyse || null, pvKwp: e.pvKwp || 0, speicherKwh: e.speicherKwh || 0, zone });
}

/** Stundenreihe des Loses (erstes Lieferjahr) */
export function losReihe(lose = [], von, zone = "DE") {
  const key = `r|${von}|${zone}|${JSON.stringify(lose.map((e) => [e.kundeId, e.jahresKwh, e.profilId, e.pvKwp, e.speicherKwh, !!e.analyse]))}`;
  return gemerkt(key, () => reihenSumme(lose.map((e) => eintragReihe(e, von, zone))));
}

/** Kurven-Schlüssel (für den Zwischenspeicher): jüngster Handelstag + Anzahl Einträge */
const kurvenKey = (kurve) => {
  const w = Object.values(kurve);
  return `${w.length}|${w.reduce((m, e) => (e.handelstag > m ? e.handelstag : m), "")}|${w.reduce((s, e) => s + e.preisEurMwh, 0).toFixed(2)}`;
};

/**
 * Normierungskontext des Loses: {reihe, hpfc, ctx {kwh, lastgewichtetEurMwh, baseEurMwh}, kennzahlen, fehlend}
 * Normierung auf die Peak-/Offpeak-Terminpreise je Monat (ohne Stundenform) – nachvollziehbar und in Frappe gleich.
 */
export function losKontext({ id, lose, lieferbeginn, zone = "DE" }, kurve) {
  const key = `k|${id}|${lieferbeginn}|${zone}|${kurvenKey(kurve)}|${JSON.stringify(lose.map((e) => [e.kundeId, e.jahresKwh, e.profilId, e.pvKwp]))}`;
  return gemerkt(key, () => {
    const reihe = losReihe(lose, lieferbeginn, zone);
    const hpfc = stundenpreiskurve({ kurve, zone, von: lieferbeginn, bis: zwoelfMonate(lieferbeginn), form: null });
    const ctx = normierungKontext(reihe, hpfc);
    return { reihe, hpfc, ctx, kennzahlen: profilKennzahlen(reihe, hpfc), fehlend: hpfc.fehlend };
  });
}

/** Anonymisiertes Profil für Lieferanten (nur gerundete Kennzahlen, Anteile, Häufigkeiten) */
export function losAnonym({ lose, lieferbeginn, zone = "DE" }) {
  const reihe = losReihe(lose, lieferbeginn, zone);
  const einzel = lose.map((e) => ({ reihe: { startMs: reihe.startMs, werte: new Float64Array(0) }, land: e.land, spannungsebene: e.spannungsebene, messart: e.messart, abnahmestellen: e.abnahmestellen }));
  // Summenreihe als ein „Kunde“ übergeben, Metadaten aus den Einträgen
  const anonym = profilAnonymisieren([{ reihe }], { ortszeitFn: ortszeit });
  const meta = profilAnonymisieren(einzel, {});
  return { ...anonym, anzahlKunden: lose.length > 1 ? `${lose.length} Kunden (Pool)` : "1 Kunde", abnahmestellen: meta.abnahmestellen, laender: meta.laender, spannungsebenen: meta.spannungsebenen, messarten: meta.messarten };
}
