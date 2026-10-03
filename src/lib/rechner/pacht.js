// src/lib/rechner/pacht.js
//
// Pachtrechner für Freiflächen-PV – reine Funktionen, ohne React.
// Länderfähig (Welle 2, Paket B1): Marktannahmen je Land aus dem Faktenregister über
// rechenbasisFuer({ land, regionId }) (src/lib/invest/laender/marktFuer.js). Für gesperrte
// Länder (AT/CH) rechnet er wie bisher mit der deutschen Basis und meldet `sperre`.

import { regionById, eegErloesCt } from "../invest/markt.js";
import { rechenbasisFuer, standardRegion, annahmenbuch } from "../invest/laender/marktFuer.js";

/** Fakten, auf denen pachtRechnung beruht (Annahmenbuch für Bericht B4) */
export const PACHT_FAKTEN = [
  "pacht.freiflaecheProHa",
  "pacht.ackerProHa",
  "pacht.deckungsbeitragAcker",
  "pacht.laufzeit",
  "pacht.indexierung",
  "pacht.reservierungProHa",
  "freiflaeche.haProMwp",
  "freiflaeche.degradation",
  "erloese.eegFreiflaecheCt",
  "erloese.merchantCt",
  "erloese.merchantSteigerung",
  "erloese.negativAnteilSolar",
  "recht.eeg.foerderdauerJahre",
];

/** Annahmenbuch (Wert, Quelle, Stand, Status je Fakt) zu einer Eingabe von pachtRechnung */
export const annahmenPacht = (eingabe = {}) => annahmenbuch(PACHT_FAKTEN, { land: eingabe.land, regionId: eingabe.regionId ?? standardRegion(eingabe.land) });

/** Kurzbezeichnungen der Regionen für enge Auswahlfelder */
export const REGION_KURZ = { "de-nord": "Nord-DE", "de-ost": "Ost-DE", "de-west": "West-DE", "de-sued": "Süd-DE", at: "Österreich", ch: "Schweiz" };

export const PACHTMODELLE = [
  { id: "fest", label: "Festpacht", sub: "€/ha, gleichbleibend" },
  { id: "index", label: "Indexiert", sub: "€/ha + Inflation" },
  { id: "umsatz", label: "Umsatz", sub: "% der Stromerlöse" },
];

/** Leistung (kWp) und Jahresertrag (kWh) eines Solarparks auf `ha` Hektar */
export function parkAuf(ha, regionId, markt = rechenbasisFuer({ regionId }).markt) {
  const region = regionById(regionId);
  const kwp = (ha / markt.FREIFLAECHE.haProMwp) * 1000;
  return { kwp, kwh: kwp * region.ertrag, region };
}

/**
 * Pacht über die Laufzeit.
 *
 * eingaben:
 *  land ("DE"|"AT"|"CH", Standard: Land der Region bzw. "DE"),
 *  ha, regionId (Standard: Standardregion des Landes, DE "de-sued"), modell (fest|index|umsatz), proHa (€/ha·a), umsatzAnteil (0–1),
 *  mindestProHa (Mindestpacht bei Umsatzmodell, €/ha·a), laufzeit (Jahre),
 *  ackerProHa (heutige Ackerpacht €/ha·a), dbProHa (Deckungsbeitrag Eigenbewirtschaftung €/ha·a),
 *  vorlaufJahre (Jahre bis Baubeginn mit Reservierungsprämie), reservierungProHa (€/ha·a)
 *
 * Rückgabe: Jahresreihen (kumuliert) für Solarpacht, Ackerpacht, Deckungsbeitrag und Kennzahlen.
 */
export function pachtRechnung(eingabe = {}) {
  const basis = rechenbasisFuer({ land: eingabe.land, regionId: eingabe.regionId ?? standardRegion(eingabe.land) });
  const { PACHT, ERLOESE, FREIFLAECHE, erloesmodell } = basis.markt;
  const {
    ha = 10,
    regionId = standardRegion(basis.land),
    modell = "fest",
    proHa = PACHT.freiflaecheProHa.mittel,
    umsatzAnteil = 0.06,
    mindestProHa = PACHT.freiflaecheProHa.min,
    laufzeit = PACHT.laufzeit,
    ackerProHa = PACHT.ackerProHa,
    dbProHa = PACHT.deckungsbeitragAcker.mittel,
    vorlaufJahre = 0,
    reservierungProHa = PACHT.reservierungProHa.min,
  } = eingabe;
  const foerderJahre = erloesmodell.werte.foerderJahre;
  const anteilNegativ = ERLOESE.paragraph51.anteilNegativ;
  const { kwp, kwh, region } = parkAuf(ha, regionId, basis.markt);
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
      // EEG-Phase mit § 51 EEG (negative Zeiträume ohne Marktprämie, markt.js eegErloesCt), danach Marktwert
      const markt = ERLOESE.merchantCt * Math.pow(1 + (ERLOESE.merchantSteigerung || 0), t);
      const ct = t < foerderJahre ? eegErloesCt(ERLOESE.eegFreiflaecheCt, markt, anteilNegativ) : markt;
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
    /** Länder-Sperre AT/CH: €-Pacht, DE-Ackerpacht und EEG-Umsatzmodell gelten nur für DE (laender/sperre.js) */
    sperre: basis.sperre,
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
