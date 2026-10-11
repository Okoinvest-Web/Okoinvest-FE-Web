// src/lib/bericht/gebaeudestrom.js – Bericht-Baustein für den Gebäudestrom-Rechner (Welle 4, Paket GEBAEUDE)
//
// Feldregeln (Positivliste der Eingaben) und Zusammenfassung für die Berichtsseite. Eingebunden in
// src/lib/bericht/neuRechnen.js (RECHNER.gebaeudestrom). Rechnet nicht selbst – nur rechneGebaeudestrom().
// DE, AT und CH – der Rechner liefert NUR Energiemengen und Anteile, keine Geldwerte (geldwerte: false;
// Mieterstromzuschlag, Tarife und Netzentgelte sind noch nicht am Original geprüft, Faktenregister E6).

import { PlattformFehler } from "@/lib/plattform/fehler";
import { fmt } from "@/lib/rechner/annahmen";
import { DACHARTEN, GEBAEUDETYPEN, LAENDER, landVon, rechneGebaeudestrom, regionenFuer, standardFuer } from "@/lib/rechner/gebaeudestrom";
import { REGIONEN } from "@/lib/invest/markt";

const ids = (liste) => liste.map((x) => x.id);
const pct = (x, s = 0) => `${fmt(x * 100, s)} %`;
const mwh = (kwh) => `${fmt(kwh / 1000, 1)} MWh`;

/** Feldregeln im Format von neuRechnen.js (zahl/wahl/bool werden dort gebaut und übergeben). */
export function regelnGebaeudestrom({ zahl, wahl, jaNein }) {
  return {
    modell: wahl(LAENDER.flatMap((l) => ids(l.modelle))),
    regionId: wahl(ids(REGIONEN)),
    gebaeudetyp: wahl(ids(GEBAEUDETYPEN)),
    wohneinheiten: zahl(0, 500, { ganz: true }),
    gewerbeeinheiten: zahl(0, 200, { ganz: true }),
    verbrauchWE: zahl(500, 10000),
    verbrauchGE: zahl(1000, 200000),
    teilnahme: zahl(0.1, 1),
    dachflaecheM2: zahl(20, 20000),
    dachart: wahl(ids(DACHARTEN)),
    speicher: jaNein(),
  };
}

/** Region und Modell müssen zum Land passen. */
export function landPruefenGebaeudestrom(e, land) {
  const l = landVon(land.toLowerCase());
  if (e.regionId && !regionenFuer(l.id).some((r) => r.id === e.regionId)) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
  if (e.modell && !l.modelle.some((m) => m.id === e.modell)) throw new PlattformFehler(422, "Modell und Land passen nicht zusammen.", "eingabe");
}

/** Fehlende Felder aus den Landesstandards; Land in Kleinbuchstaben wie im Rechner. */
export function normalisierenGebaeudestrom(e, land) {
  const basis = standardFuer(land.toLowerCase());
  return { ...basis, ...e, land: land.toLowerCase() };
}

const PASSUNG = {
  passt: { titel: "Die Anlagengröße passt zum Gebäude", stufe: "gut" },
  grenzwertig: { titel: "Die Anlage ist für dieses Gebäude eher groß", stufe: "pruefen" },
  zu_gross: { titel: "Die Anlage ist für dieses Gebäude zu groß ausgelegt", stufe: "kritisch" },
  offen: { titel: "Angaben reichen für eine Einordnung nicht aus", stufe: "info" },
};

function passungText(r) {
  switch (r.passung) {
    case "passt":
      return `Rund ${pct(r.eigenverbrauch)} der Erzeugung werden rechnerisch im Gebäude genutzt – ein ausgewogenes Verhältnis von Anlagengröße und Verbrauch.`;
    case "grenzwertig":
      return `Nur rund ${pct(r.eigenverbrauch)} der Erzeugung werden rechnerisch im Gebäude genutzt. Mehr teilnehmende Einheiten, ein Speicher oder eine etwas kleinere Anlage (Richtwert ≈ ${fmt(r.ausgewogenKwp)} kWp für ≈ 50 % Nutzung) verbessern das Verhältnis.`;
    case "zu_gross":
      return `Nur rund ${pct(r.eigenverbrauch)} der Erzeugung werden rechnerisch im Gebäude genutzt – der große Rest ginge als Überschuss ins Netz. Richtwert für ein ausgewogenes Verhältnis: ≈ ${fmt(r.ausgewogenKwp)} kWp (≈ 50 % Nutzung im Haus).`;
    default:
      return "Bitte Einheiten, Verbrauch und Dachfläche angeben – ohne teilnehmenden Verbrauch lässt sich keine Energiebilanz rechnen.";
  }
}

/** Zusammenfassung für die Berichtsseite (nur Formatierung der Rechnerergebnisse, keine Geldwerte). */
export function zusammenfassungGebaeudestrom(r) {
  const e = r.eingabe;
  const p = PASSUNG[r.passung] || PASSUNG.offen;
  return {
    urteil: { titel: p.titel, text: passungText(r), stufe: p.stufe },
    kennzahlen: [
      { label: "Mögliche Anlagengröße", wert: `${fmt(r.kwp)} kWp`, zusatz: `${fmt(e.dachflaecheM2)} m² ${r.dach.label}, ${fmt(r.dach.m2ProKwp)} m² je kWp` },
      { label: "Stromerzeugung im Jahr", wert: mwh(r.erzeugung), zusatz: `${fmt(r.region.ertrag)} kWh/kWp (${r.region.label}) × Faktor ${fmt(r.dach.ertragFaktor, 2)}` },
      { label: "Im Gebäude genutzt", wert: mwh(r.genutzt), zusatz: `${pct(r.eigenverbrauch)} der Erzeugung` },
      { label: "Deckung des teilnehmenden Verbrauchs", wert: pct(r.deckung), zusatz: `${fmt(r.teilnehmende)} teilnehmende Einheiten, ${mwh(r.verbrauch)} Verbrauch` },
      { label: "Überschuss ins Netz", wert: mwh(r.ueberschuss), zusatz: "wird eingespeist bzw. vermarktet" },
    ],
    eingabenText: [
      ["Modell", `${r.modell.label} (${r.modell.sub})`],
      ["Gebäude", r.typ.label],
      ["Wohneinheiten", fmt(e.wohneinheiten)],
      ...(e.gewerbeeinheiten > 0 ? [["Gewerbeeinheiten", fmt(e.gewerbeeinheiten)]] : []),
      ["Verbrauch je Wohneinheit", `${fmt(e.verbrauchWE)} kWh/Jahr`],
      ...(e.gewerbeeinheiten > 0 ? [["Verbrauch je Gewerbeeinheit", `${fmt(e.verbrauchGE)} kWh/Jahr`]] : []),
      ["Teilnahmequote", pct(e.teilnahme)],
      ["Dachfläche für PV", `${fmt(e.dachflaecheM2)} m² (${r.dach.label})`],
      ["Region", r.region.label],
      ["Speicher", e.speicher ? "ja" : "nein"],
    ],
    rechenweg: [
      `Anlagengröße: ${fmt(e.dachflaecheM2)} m² ÷ ${fmt(r.dach.m2ProKwp)} m²/kWp = ${fmt(r.kwp)} kWp. Erzeugung: ${fmt(r.kwp)} kWp × ${fmt(r.region.ertrag)} kWh/kWp × ${fmt(r.dach.ertragFaktor, 2)} = ${mwh(r.erzeugung)}.`,
      `Teilnehmender Verbrauch: (${fmt(e.wohneinheiten)} × ${fmt(e.verbrauchWE)} kWh${e.gewerbeeinheiten > 0 ? ` + ${fmt(e.gewerbeeinheiten)} × ${fmt(e.verbrauchGE)} kWh` : ""}) × ${pct(e.teilnahme)} Teilnahme = ${mwh(r.verbrauch)}.`,
      `Im Gebäude genutzt wird nur zeitgleich erzeugter und verbrauchter Strom – Näherung über eine Sättigungskurve mit Gleichzeitigkeitsgrenze ${fmt(r.a, 2)} (${r.typ.label}${e.speicher ? ", mit Speicher" : ""}): ${mwh(r.genutzt)}.`,
      "Geldwerte (Mieterstromzuschlag, Tarife, Netzentgelte) rechnet der Bericht bewusst nicht: Die Beträge je Land sind noch nicht am Original geprüft.",
    ],
    tabelle: null,
    listen: [],
    hinweise: [
      "Orientierung über Energiemengen, kein Angebot und keine Rechts- oder Steuerberatung. Maßgeblich sind Messkonzept und Abrechnung im gewählten Modell.",
      "Die Teilnahme ist in allen Modellen (Mieterstrom, Gemeinschaftliche Gebäudeversorgung, GEA, ZEV/vZEV) freiwillig; der Reststrom kommt weiterhin vom Lieferanten.",
      "Statik, Denkmalschutz, Zählerplatz und Netzanschluss prüft die Fachplanung vor Ort.",
    ],
  };
}

/** Neuberechnung für den Bericht. */
export const rechneGebaeudestromBericht = (e) => rechneGebaeudestrom(e);
