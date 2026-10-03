// src/lib/invest/laender/erloesmodelle.js
//
// Erlösmodell je Land (Welle 2, Paket B1) – aus dem Faktenregister, nichts erfunden:
//  DE  EEG-Marktprämie aus der Ausschreibung, § 51 EEG (negative Preise), 20 Jahre (§ 25 EEG)
//  AT  EAG-Marktprämie (Ausschreibung) oder Investitionszuschuss, § 33-Abschlag auf Agrarflächen
//  CH  Hohe Einmalvergütung (HEIV) oder gleitende Marktprämie (GMP), Auktionen bei Pronovo
// Was im Register fehlt (Förderdauer AT/CH, Negativpreis-Regeln AT/CH …), steht als Lücke
// in `luecken`; `freigabeBereit` ist nur true, wenn alle Rechenwerte vorhanden und geprüft sind.

import { fakt } from "../../fakten/index.js";

const MODELLE = {
  DE: {
    id: "eeg-marktpraemie",
    titel: "EEG-Marktprämie aus der Ausschreibung",
    kurz: "EEG § 51",
    felder: {
      beschreibung: "recht.eeg.paragraph51",
      foerderJahre: "recht.eeg.foerderdauerJahre",
      anteilNegativ: "erloese.negativAnteilSolar",
      anzulegenderWertCt: "erloese.eegFreiflaecheCt",
    },
    rechenwerte: ["foerderJahre", "anteilNegativ", "anzulegenderWertCt"],
  },
  AT: {
    id: "eag-marktpraemie",
    titel: "EAG-Marktprämie oder Investitionszuschuss",
    kurz: "EAG",
    felder: {
      beschreibung: "recht.eag.marktpraemie",
      investitionszuschuss: "recht.eag.investitionszuschuss",
      abschlagLandwirtschaft: "recht.eag.abschlagLandwirtschaft",
      foerderJahre: "recht.eag.foerderdauerJahre",
      anzulegenderWertCt: "erloese.eagZuschlagswertCt",
    },
    rechenwerte: ["foerderJahre", "anzulegenderWertCt", "abschlagLandwirtschaft"],
  },
  CH: {
    id: "heiv-gmp",
    titel: "Hohe Einmalvergütung (HEIV) oder gleitende Marktprämie (GMP)",
    kurz: "HEIV/GMP",
    felder: {
      beschreibung: "recht.ch.gmp",
      heivMaxAnteil: "recht.ch.heiv.maxAnteil",
      auktionAbKw: "recht.ch.auktion.abKw",
      heivHoechstgebotChfKw: "recht.ch.heiv.hoechstgebotChfKw",
      gmpHoechstgebotRp: "recht.ch.gmp.hoechstgebotRp",
      foerderJahre: "recht.ch.gmp.foerderdauerJahre",
    },
    rechenwerte: ["foerderJahre", "heivMaxAnteil", "gmpHoechstgebotRp"],
  },
};

/**
 * Erlösmodell eines Landes.
 * @returns {{ id, land, titel, kurz, werte: object, fakten: object[], luecken: string[], status: string, freigabeBereit: boolean }}
 */
export function erloesmodellFuer(land = "DE", { stichtag } = {}) {
  const l = String(land || "DE").toUpperCase();
  const m = MODELLE[l] || MODELLE.DE;
  const werte = {};
  const fakten = [];
  const luecken = [];
  for (const [feld, id] of Object.entries(m.felder)) {
    const f = fakt(id, l, stichtag ? { stichtag } : undefined);
    if (!f) {
      werte[feld] = null;
      luecken.push(id);
      continue;
    }
    werte[feld] = f.wert;
    fakten.push(f);
  }
  const rechen = m.rechenwerte.map((feld) => m.felder[feld]);
  const rechenFakten = fakten.filter((f) => rechen.includes(f.id));
  const alleGeprueft = rechenFakten.length === rechen.length && rechenFakten.every((f) => f.status === "geprueft");
  return {
    id: m.id,
    land: MODELLE[l] ? l : "DE",
    titel: m.titel,
    kurz: m.kurz,
    werte,
    fakten,
    luecken,
    status: luecken.length === 0 && fakten.every((f) => f.status === "geprueft") ? "geprueft" : "zu_pruefen",
    /** alle Rechenwerte vorhanden und am Original geprüft – Voraussetzung, um eine Länder-Sperre aufzuheben */
    freigabeBereit: alleGeprueft,
  };
}
