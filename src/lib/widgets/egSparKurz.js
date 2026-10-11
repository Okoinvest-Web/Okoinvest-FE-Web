// src/lib/widgets/egSparKurz.js
//
// EG-Spar-Kurzrechner (Welle 4, Paket WIDGETS): vereinfachte Fassade über den Rechenkern des
// Energiegemeinschafts-Rechners (src/lib/plattform/eg/interesse.js → rechnerOeffentlich).
//
//  - KEINE eigene Rechenlogik: nur drei Eingaben (Jahresverbrauch, Verbrauchsprofil, Modell),
//    alles andere bleibt auf den geprüften Standardannahmen des großen Rechners (AT, Jahr 2026,
//    Rolle „Ich verbrauche“, Deckung „ausgewogen“). Das Ergebnis ist dieselbe Jahres-Näherung,
//    die auch /energiegemeinschaften/rechner zeigt.
//  - Gilt für ÖSTERREICH (Regeltabellen SNE-V/ElWG) – andere Länder bekommen im Widget einen
//    ehrlichen Hinweis statt Zahlen (Vorgabe: keine ungeprüften Werte).
//  - Reine Funktionen ohne I/O; Feinheiten (Hinweise, Annahmen) reicht das Widget sichtbar durch.

import { RECHNER_MODELLE, RECHNER_PROFILE, RECHNER_STANDARD, rechnerOeffentlich } from "../plattform/eg/interesse.js";

/** Auswahl im Kurzrechner (Teilmenge des großen Rechners; GEA weggelassen – zu speziell für ein Embed). */
export const KURZ_PROFILE = Object.freeze(["haushalt", "haushalt_flex", "gewerbe", "landwirtschaft"]);
export const KURZ_MODELLE = Object.freeze(["eeg_lokal", "eeg_regional", "beg"]);

export const KURZ_STANDARD = Object.freeze({
  verbrauchKwh: RECHNER_STANDARD.verbrauchKwh,
  profil: RECHNER_STANDARD.profil,
  modell: RECHNER_STANDARD.modell,
});

const zahl = (v, min, max, std) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : std;
};

/** Rohwerte (z. B. aus der Query) → geprüfte Kurzrechner-Eingaben. Unbekanntes fällt auf den Standard. */
export function kurzEingaben(roh = {}) {
  return {
    verbrauchKwh: Math.round(zahl(roh.verbrauchKwh, 100, 1_000_000, KURZ_STANDARD.verbrauchKwh)),
    profil: KURZ_PROFILE.includes(roh.profil) ? roh.profil : KURZ_STANDARD.profil,
    modell: KURZ_MODELLE.includes(roh.modell) ? roh.modell : KURZ_STANDARD.modell,
  };
}

/**
 * Kurzrechnung (Österreich, 2026, Rolle Verbraucher, Deckung ausgewogen) über den gemeinsamen Rechenkern.
 * @returns {{ eingaben, nettoEur, vorteilEur, gebuehrenEur, quotePct, bezugKwh, teile, hinweise, regel, annahmen }}
 */
export function egKurzRechnen(roh = {}) {
  const eingaben = kurzEingaben(roh);
  const r = rechnerOeffentlich({ rolle: "verbraucher", deckung: "ausgewogen", jahr: 2026, ...eingaben });
  return {
    eingaben,
    nettoEur: r.nettoEur,
    vorteilEur: r.vorteilEur,
    gebuehrenEur: r.gebuehrenEur,
    quotePct: r.quotePct,
    bezugKwh: r.bezugKwh,
    teile: r.teile,
    hinweise: r.hinweise,
    regel: r.regel,
    annahmen: r.annahmen,
  };
}

/** Anzeige-Label der Auswahloptionen (de/en) – Texte eigenständig, damit das Widget ohne React-Wörterbuch auskommt. */
export const KURZ_TEXTE = Object.freeze({
  de: Object.freeze({
    profile: Object.freeze(Object.fromEntries(KURZ_PROFILE.map((p) => [p, `${RECHNER_PROFILE[p].label} (${RECHNER_PROFILE[p].sub})`]))),
    modelle: Object.freeze(Object.fromEntries(KURZ_MODELLE.map((m) => [m, `${RECHNER_MODELLE[m].label} – ${RECHNER_MODELLE[m].sub}`]))),
  }),
  en: Object.freeze({
    profile: Object.freeze({
      haushalt: "Household (often away during the day)",
      haushalt_flex: "Flexible household (heat pump, EV, home office)",
      gewerbe: "Business (daytime consumption on weekdays)",
      landwirtschaft: "Farm (milking, cooling, drying)",
    }),
    modelle: Object.freeze({
      eeg_lokal: "REC local – same transformer station",
      eeg_regional: "REC regional – same substation",
      beg: "CEC – Austria-wide",
    }),
  }),
});
