// src/lib/rechner/pacht.js
//
// Pachtrechner für Freiflächen-PV – reine Funktionen, ohne React.
// Alle Marktannahmen aus src/lib/invest/markt.js.

import { ERLOESE, FREIFLAECHE, PACHT, regionById } from "../invest/markt.js";

/** Kurzbezeichnungen der Regionen für enge Auswahlfelder */
export const REGION_KURZ = { "de-nord": "Nord-DE", "de-ost": "Ost-DE", "de-west": "West-DE", "de-sued": "Süd-DE", at: "Österreich", ch: "Schweiz" };

export const PACHTMODELLE = [
  { id: "fest", label: "Festpacht", sub: "€/ha, gleichbleibend" },
  { id: "index", label: "Indexiert", sub: "€/ha + Inflation" },
  { id: "umsatz", label: "Umsatz", sub: "% der Stromerlöse" },
];

/** Leistung (kWp) und Jahresertrag (kWh) eines Solarparks auf `ha` Hektar */
export function parkAuf(ha, regionId) {
  const region = regionById(regionId);
  const kwp = (ha / FREIFLAECHE.haProMwp) * 1000;
  return { kwp, kwh: kwp * region.ertrag, region };
}

/**
 * Pacht über die Laufzeit.
 *
 * eingaben:
 *  ha, regionId, modell (fest|index|umsatz), proHa (€/ha·a), umsatzAnteil (0–1),
 *  mindestProHa (Mindestpacht bei Umsatzmodell, €/ha·a), laufzeit (Jahre),
 *  ackerProHa (heutige Ackerpacht €/ha·a), dbProHa (Deckungsbeitrag Eigenbewirtschaftung €/ha·a),
 *  vorlaufJahre (Jahre bis Baubeginn mit Reservierungsprämie), reservierungProHa (€/ha·a)
 *
 * Rückgabe: Jahresreihen (kumuliert) für Solarpacht, Ackerpacht, Deckungsbeitrag und Kennzahlen.
 */
export function pachtRechnung({
  ha = 10,
  regionId = "de-sued",
  modell = "fest",
  proHa = PACHT.freiflaecheProHa.mittel,
  umsatzAnteil = 0.06,
  mindestProHa = PACHT.freiflaecheProHa.min,
  laufzeit = PACHT.laufzeit,
  ackerProHa = PACHT.ackerProHa,
  dbProHa = PACHT.deckungsbeitragAcker.mittel,
  vorlaufJahre = 0,
  reservierungProHa = PACHT.reservierungProHa.min,
} = {}) {
  const { kwp, kwh, region } = parkAuf(ha, regionId);
  const jahre = [];
  let sumSolar = 0;
  let sumAcker = 0;
  let sumDb = 0;
  const gesamtJahre = vorlaufJahre + laufzeit;

  for (let j = 1; j <= gesamtJahre; j++) {
    const betrieb = j > vorlaufJahre;
    const t = j - vorlaufJahre - 1; // Betriebsjahr ab 0
    let solar;
    let strom = 0;
    if (!betrieb) {
      // Vor Baubeginn: Reservierungsprämie – die Fläche wird weiter bewirtschaftet
      solar = ha * reservierungProHa;
    } else if (modell === "umsatz") {
      const ct = t < 20 ? ERLOESE.eegFreiflaecheCt : ERLOESE.merchantCt * Math.pow(1 + (ERLOESE.merchantSteigerung || 0), t);
      strom = kwh * Math.pow(1 - FREIFLAECHE.degradation, t) * (ct / 100);
      solar = Math.max(strom * umsatzAnteil, ha * mindestProHa);
    } else if (modell === "index") {
      solar = ha * proHa * Math.pow(1 + PACHT.indexierung, t);
    } else {
      solar = ha * proHa;
    }
    // Vergleich: Ackerpacht und Deckungsbeitrag steigen vereinfacht mit derselben Indexierung
    const f = Math.pow(1 + PACHT.indexierung, j - 1);
    const acker = ha * ackerProHa * f;
    // Vor Baubeginn bewirtschaftet der Eigentümer weiter: Deckungsbeitrag kommt zur Prämie hinzu
    const db = ha * dbProHa * f;
    const solarGesamt = betrieb ? solar : solar + db;
    sumSolar += solarGesamt;
    sumAcker += acker;
    sumDb += db;
    jahre.push({ jahr: j, betrieb, solar: solarGesamt, acker, db, strom, sumSolar, sumAcker, sumDb });
  }

  const erstesBetriebsjahr = jahre.find((x) => x.betrieb) || jahre[0];
  return {
    kwp,
    kwh,
    region,
    jahre,
    ersteJahrespacht: erstesBetriebsjahr.solar,
    proHaErstesJahr: erstesBetriebsjahr.solar / ha,
    summeSolar: sumSolar,
    summeAcker: sumAcker,
    summeDb: sumDb,
    faktorAcker: sumAcker > 0 ? sumSolar / sumAcker : null,
    faktorDb: sumDb > 0 ? sumSolar / sumDb : null,
    durchschnitt: sumSolar / gesamtJahre,
    mehrGgAcker: sumSolar - sumAcker,
    mehrGgDb: sumSolar - sumDb,
  };
}
