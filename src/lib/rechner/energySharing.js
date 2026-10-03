// src/lib/rechner/energySharing.js
//
// Energy-Sharing-/Energiegemeinschafts-Rechner für DE, AT und CH.
// Reine Funktionen ohne React:
//
//   node src/lib/rechner/energySharing.js      → Selbsttest
//
// Methodik (Näherung, offen gelegt):
//  - Erzeugung = kWp × spezifischer Ertrag der Region.
//  - Geteilter Strom: Nur was zeitgleich (Viertelstunde) erzeugt UND verbraucht
//    wird, zählt. Näherung über eine Sättigungskurve:
//        geteilt = Verbrauch × a · (1 − e^(−R/a)),  R = Erzeugung / Verbrauch
//    Kleine Anlagen werden fast vollständig genutzt (geteilt ≈ Erzeugung), große
//    stoßen an die Gleichzeitigkeitsgrenze a (Anteil des Verbrauchs, der
//    überhaupt in Sonnenstunden anfällt – abhängig vom Teilnehmermix, mit
//    Speicher höher).
//  - Vorteil je geteilter kWh für Teilnehmende = Energiepreis des Lieferanten −
//    Gemeinschaftspreis + Netzentgeltabschlag (AT/CH) + entfallende Abgaben (AT).
//  - Erzeuger: Gemeinschaftspreis für geteilten Strom, Überschuss zur Vergütung.
// Standardwerte je Land aus GEMEINSCHAFTEN.rechner (markt.js).

import { GEMEINSCHAFTEN, REGIONEN } from "../invest/markt.js";

export const LAENDER = [
  { id: "de", label: "Deutschland", sub: "Energy Sharing" },
  { id: "at", label: "Österreich", sub: "EEG / BEG" },
  { id: "ch", label: "Schweiz", sub: "LEG" },
];

/** Gleichzeitigkeit: Anteil des Verbrauchs, der maximal zeitgleich mit PV gedeckt werden kann – eigene Näherung */
/** Kundentyp der Teilnehmenden – in AT gilt 2026 eine nach Haushalt/sonstige getrennte Elektrizitätsabgabe */
export const KUNDENTYPEN = [
  { id: "haushalt", label: "Haushalte", sub: "überwiegend privat" },
  { id: "sonstige", label: "Betriebe", sub: "Gewerbe, Gemeinde" },
];

export const MIXE = [
  { id: "haushalte", label: "Haushalte", sub: "abends viel Verbrauch", a: 0.35 },
  { id: "gemischt", label: "Gemischt", sub: "Haushalte + Betriebe", a: 0.45 },
  { id: "gewerbe", label: "Gewerbe", sub: "tagsüber aktiv", a: 0.6 },
];
export const SPEICHER_PLUS = 0.12;

export const land = (id) => GEMEINSCHAFTEN.rechner[id] || GEMEINSCHAFTEN.rechner.de;
export const regionenFuer = (id) => REGIONEN.filter((r) => r.land === id.toUpperCase());

export function standardFuer(landId) {
  const l = land(landId);
  const regionen = regionenFuer(landId);
  return {
    land: landId,
    regionId: (regionen.find((r) => r.id === "de-sued") || regionen[0]).id,
    rabattId: l.rabatte[0].id,
    kwp: 250,
    teilnehmer: 60,
    verbrauchJe: 3500,
    mix: "gemischt",
    /** Teilnehmende überwiegend Haushalte oder Betriebe (wirkt in AT auf die Elektrizitätsabgabe) */
    kundentyp: "haushalt",
    speicher: false,
    energiepreis: l.energiepreis,
    netzAp: l.netzAp,
    gemeinschaftCt: l.gemeinschaftCt,
    ueberschussCt: l.ueberschussCt,
    verwaltung: l.verwaltung,
  };
}

export function geteilteMenge(erzeugung, verbrauch, a) {
  if (verbrauch <= 0 || erzeugung <= 0) return 0;
  const R = erzeugung / verbrauch;
  return verbrauch * a * (1 - Math.exp(-R / a));
}

export function rechneEnergySharing(eingabe = {}) {
  const e = { ...standardFuer(eingabe.land || "de"), ...eingabe };
  const l = land(e.land);
  const region = REGIONEN.find((r) => r.id === e.regionId) || regionenFuer(e.land)[0];
  const rabatt = l.rabatte.find((r) => r.id === e.rabattId) || l.rabatte[0];
  const mix = MIXE.find((m) => m.id === e.mix) || MIXE[1];
  const a = Math.min(0.9, mix.a + (e.speicher ? SPEICHER_PLUS : 0));

  const erzeugung = e.kwp * region.ertrag;
  const verbrauch = e.teilnehmer * e.verbrauchJe;
  const geteilt = geteilteMenge(erzeugung, verbrauch, a);
  const ueberschuss = Math.max(0, erzeugung - geteilt);

  // Vorteil je geteilter kWh (ct bzw. Rp.)
  const teile = [
    { id: "energie", label: "Günstigerer Energiepreis", ct: e.energiepreis - e.gemeinschaftCt },
    { id: "netz", label: "Abschlag Netzentgelt", ct: e.netzAp * rabatt.anteil },
    // AT: Elektrizitätsabgabe 2026 je nach Kundentyp (Haushalt 0,1 ct, sonstige 0,82 ct; markt.js)
    { id: "abgaben", label: "Entfallende Abgaben", ct: l.abgabenCtNachTyp?.[e.kundentyp] ?? l.abgabenCt },
  ];
  const vorteilCt = teile.reduce((s, t) => s + t.ct, 0);
  const vorteilBrutto = (geteilt * vorteilCt) / 100;
  const verwaltungGesamt = e.teilnehmer * e.verwaltung;
  const vorteilNetto = vorteilBrutto - verwaltungGesamt;

  const erloesGeteilt = (geteilt * e.gemeinschaftCt) / 100;
  const erloesUeberschuss = (ueberschuss * e.ueberschussCt) / 100;
  const erloesErzeuger = erloesGeteilt + erloesUeberschuss;
  const referenzErzeuger = (erzeugung * e.ueberschussCt) / 100;

  return {
    eingabe: e,
    land: l,
    region,
    rabatt,
    a,
    erzeugung,
    verbrauch,
    geteilt,
    ueberschuss,
    deckung: verbrauch > 0 ? geteilt / verbrauch : 0,
    nutzung: erzeugung > 0 ? geteilt / erzeugung : 0,
    teile,
    vorteilCt,
    vorteilBrutto,
    verwaltungGesamt,
    vorteilNetto,
    jeTeilnehmer: e.teilnehmer > 0 ? vorteilNetto / e.teilnehmer : 0,
    geteiltJeTeilnehmer: e.teilnehmer > 0 ? geteilt / e.teilnehmer : 0,
    erloesErzeuger,
    erloesGeteilt,
    erloesUeberschuss,
    mehrerloesErzeuger: erloesErzeuger - referenzErzeuger,
    referenzErzeuger,
    lohntSich: vorteilNetto > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/energySharing.js                   */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  pruefe(Math.abs(geteilteMenge(1000, 1e6, 0.4) - 1000) < 20, "kleine Anlage: fast alles wird geteilt");
  pruefe(geteilteMenge(1e7, 1e5, 0.4) <= 0.4 * 1e5 + 1e-6, "große Anlage: Deckel bei a × Verbrauch");

  const de = rechneEnergySharing({ land: "de" });
  const at = rechneEnergySharing({ land: "at", rabattId: "lokal" });
  const atBeg = rechneEnergySharing({ land: "at", rabattId: "beg" });
  const ch = rechneEnergySharing({ land: "ch", rabattId: "leg40" });
  pruefe(de.teile.find((t) => t.id === "netz").ct === 0, "DE: kein Netzentgeltabschlag");
  pruefe(Math.abs(at.teile.find((t) => t.id === "netz").ct - 7 * 0.57) < 1e-9, "AT lokal: 57 % von 7 ct");
  pruefe(at.vorteilCt > atBeg.vorteilCt, "AT lokal günstiger als BEG");
  pruefe(Math.abs(ch.teile.find((t) => t.id === "netz").ct - 4) < 1e-9, "CH LEG: 40 % von 10 Rp.");
  const atBetrieb = rechneEnergySharing({ land: "at", rabattId: "lokal", kundentyp: "sonstige" });
  pruefe(Math.abs(at.teile.find((t) => t.id === "abgaben").ct - 0.1) < 1e-9, "AT Haushalte: Elektrizitätsabgabe 2026 0,1 ct");
  pruefe(Math.abs(atBetrieb.teile.find((t) => t.id === "abgaben").ct - 0.82) < 1e-9, "AT Betriebe: Elektrizitätsabgabe 2026 0,82 ct");
  pruefe(ch.teile.find((t) => t.id === "energie").ct >= 0, "CH: Gemeinschaftspreis nicht über dem Energietarif");
  pruefe(de.geteilt <= de.erzeugung && de.geteilt <= de.verbrauch, "geteilt ≤ Erzeugung und ≤ Verbrauch");
  const sp = rechneEnergySharing({ land: "de", speicher: true, kwp: 800 });
  const ohneSp = rechneEnergySharing({ land: "de", speicher: false, kwp: 800 });
  pruefe(sp.geteilt > ohneSp.geteilt, "Speicher erhöht den geteilten Anteil");
  pruefe(Math.abs(de.erloesErzeuger - (de.erloesGeteilt + de.erloesUeberschuss)) < 1e-9, "Erzeugererlös konsistent");
  pruefe(de.mehrerloesErzeuger > 0, "Gemeinschaftspreis über Überschussvergütung → Mehrerlös für Erzeuger");
  return { fehler, beispiel: { de, at, ch } };
}

if (typeof process !== "undefined" && process.argv?.[1] && /energySharing\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel } = selbsttest();
  for (const [k, r] of Object.entries(beispiel))
    console.log(`${k.toUpperCase()}: geteilt ${Math.round(r.geteilt / 1000)} MWh (${(r.nutzung * 100).toFixed(0)} % der Erzeugung), Vorteil ${r.vorteilCt.toFixed(2)} ct/kWh, je Teilnehmer ${Math.round(r.jeTeilnehmer)} ${r.land.waehrung}/a`);
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest energySharing.js: alle Prüfungen bestanden.");
}
