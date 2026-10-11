// src/lib/rechner/gebaeudestrom.js
//
// Gebäudestrom-Rechner (Welle 4, Paket GEBAEUDE): PV auf dem Mehrparteien- oder Gewerbegebäude,
// Strom an die Einheiten im Haus – DE Mieterstrom (§ 21 Abs. 3 EEG) / Gemeinschaftliche
// Gebäudeversorgung (§ 42b EnWG), AT Gemeinschaftliche Erzeugungsanlage (§ 16a ElWOG),
// CH ZEV/vZEV (Art. 17–18 EnG). Reine Funktionen ohne React:
//
//   node src/lib/rechner/gebaeudestrom.js      → Selbsttest
//
// Methodik (bewusst einfach, OHNE Geldwerte – nur Energiemengen und Anteile):
//  - Leistung = Dachfläche / m² je kWp der Dachart (dach.dacharten, wie Dachpacht-Rechner).
//  - Erzeugung = kWp × Regionsertrag × Ertragsfaktor der Dachart.
//  - Teilnehmender Verbrauch = (Wohneinheiten × Verbrauch je WE + Gewerbeeinheiten × Verbrauch
//    je GE) × Teilnahmequote (gebaeudestrom.*, Faktenregister, eigene Einschätzung Klasse C).
//  - Im Gebäude genutzt wird nur, was zeitgleich erzeugt UND verbraucht wird: Sättigungskurve
//    geteilteMenge() mit der Gleichzeitigkeitsgrenze a je Nutzungsmix – identisch mit dem
//    Energy-Sharing-Rechner (MIXE, SPEICHER_PLUS, eigene Näherung, dort dokumentiert).
//  - Ergebnis: Eigenverbrauchsanteil (genutzt/Erzeugung), Deckung (genutzt/Verbrauch),
//    Überschuss ins Netz – und daraus eine Einordnung, ob die Anlage zum Gebäude passt.
//  - Geld (Mieterstromzuschlag, Tarife, Netzentgelte) wird bewusst NICHT gerechnet: Die Werte
//    je Land sind noch nicht am Original geprüft (Faktenregister status "zu_pruefen", E6).

import { DACH, REGIONEN } from "../invest/markt.js";
import { MIXE, SPEICHER_PLUS, geteilteMenge } from "./energySharing.js";
import { faktWert } from "../fakten/index.js";

const W_WE = faktWert("gebaeudestrom.verbrauchWohneinheit");
const W_GE = faktWert("gebaeudestrom.verbrauchGewerbeeinheit");
const TEILNAHME = faktWert("gebaeudestrom.teilnahme");
export const ANNAHMEN = { W_WE, W_GE, TEILNAHME };

/** Länder mit ihren Gebäudestrom-Modellen (Rechtsrahmen: Faktenregister recht.gebaeudestrom.*) */
export const LAENDER = [
  { id: "de", label: "Deutschland", modelle: [
    { id: "mieterstrom", label: "Mieterstrom", sub: "§ 21 Abs. 3 EEG" },
    { id: "ggv", label: "Gebäudeversorgung", sub: "§ 42b EnWG" },
  ] },
  { id: "at", label: "Österreich", modelle: [
    { id: "gea", label: "Gemeinschaftliche Erzeugungsanlage", sub: "§ 16a ElWOG" },
  ] },
  { id: "ch", label: "Schweiz", modelle: [
    { id: "zev", label: "ZEV", sub: "Art. 17–18 EnG" },
    { id: "vzev", label: "Virtueller ZEV", sub: "Messung durch Netzbetreiber" },
  ] },
];

/** Gebäudetypen → Gleichzeitigkeitsgrenze a aus den Energy-Sharing-Mixen (gleiche Näherung) */
const mixA = (id) => MIXE.find((m) => m.id === id)?.a ?? MIXE[1].a;
export const GEBAEUDETYPEN = [
  { id: "wohn", label: "Wohngebäude", sub: "abends viel Verbrauch", a: mixA("haushalte") },
  { id: "gemischt", label: "Wohnen + Gewerbe", sub: "Laden, Büro im Haus", a: mixA("gemischt") },
  { id: "gewerbe", label: "Gewerbegebäude", sub: "tagsüber aktiv", a: mixA("gewerbe") },
];

/** Dacharten: Werte aus dach.dacharten (Faktenregister, wie Dachpacht-Rechner) */
const dachart = (id) => DACH.dacharten.find((d) => d.id === id);
export const DACHARTEN = [
  { id: "geneigt", label: "Geneigtes Dach", sub: "Ziegel, Trapez", m2ProKwp: dachart("trapez").m2ProKwp, ertragFaktor: dachart("trapez").ertragFaktor },
  { id: "flach", label: "Flachdach", sub: "Ost/West aufgeständert", m2ProKwp: dachart("flach").m2ProKwp, ertragFaktor: dachart("flach").ertragFaktor },
];

export const landVon = (id) => LAENDER.find((l) => l.id === id) || LAENDER[0];
export const regionenFuer = (id) => REGIONEN.filter((r) => r.land === String(id).toUpperCase());
export const dachartVon = (id) => DACHARTEN.find((d) => d.id === id) || DACHARTEN[0];
export const gebaeudetypVon = (id) => GEBAEUDETYPEN.find((g) => g.id === id) || GEBAEUDETYPEN[0];

export function standardFuer(landId = "de") {
  const l = landVon(landId);
  const regionen = regionenFuer(l.id);
  return {
    land: l.id,
    modell: l.modelle[0].id,
    regionId: (regionen.find((r) => r.id === "de-sued") || regionen[0]).id,
    gebaeudetyp: "wohn",
    wohneinheiten: 12,
    gewerbeeinheiten: 0,
    verbrauchWE: W_WE.standard,
    verbrauchGE: W_GE.standard,
    teilnahme: TEILNAHME.standard,
    dachflaecheM2: 120,
    dachart: "geneigt",
    speicher: false,
  };
}

/**
 * Energiebilanz des Gebäudestroms – ohne Geldwerte.
 * @returns {{ kwp, erzeugung, verbrauch, genutzt, ueberschuss, eigenverbrauch, deckung, … }}
 */
export function rechneGebaeudestrom(eingabe = {}) {
  const e = { ...standardFuer(eingabe.land || "de"), ...eingabe };
  const l = landVon(e.land);
  const modell = l.modelle.find((m) => m.id === e.modell) || l.modelle[0];
  const region = REGIONEN.find((r) => r.id === e.regionId) || regionenFuer(e.land)[0];
  const typ = gebaeudetypVon(e.gebaeudetyp);
  const dach = dachartVon(e.dachart);
  const a = Math.min(0.9, typ.a + (e.speicher ? SPEICHER_PLUS : 0));

  const kwp = e.dachflaecheM2 / dach.m2ProKwp;
  const erzeugung = kwp * region.ertrag * dach.ertragFaktor;
  const einheiten = e.wohneinheiten + e.gewerbeeinheiten;
  const verbrauchGesamt = e.wohneinheiten * e.verbrauchWE + e.gewerbeeinheiten * e.verbrauchGE;
  const verbrauch = verbrauchGesamt * e.teilnahme;
  const genutzt = geteilteMenge(erzeugung, verbrauch, a);
  const ueberschuss = Math.max(0, erzeugung - genutzt);
  const eigenverbrauch = erzeugung > 0 ? genutzt / erzeugung : 0;
  const deckung = verbrauch > 0 ? genutzt / verbrauch : 0;

  // Einordnung: passt die Anlagengröße zum Gebäude? (reine Mengenbetrachtung; Schwellen an der
  // Sättigungskurve orientiert – mehr als ~a × Verbrauch kann nie im Haus genutzt werden)
  const passung = erzeugung <= 0 || verbrauch <= 0 ? "offen" : eigenverbrauch >= 0.3 ? "passt" : eigenverbrauch >= 0.18 ? "grenzwertig" : "zu_gross";

  // Ausgewogene Anlagengröße: größte Anlage, bei der noch rund die Hälfte der Erzeugung im
  // Gebäude genutzt wird (Bisektion über kWp; rein informativ, kein Geldwert)
  let ausgewogenKwp = 0;
  if (verbrauch > 0) {
    let lo = 0.5;
    let hi = Math.max(kwp, 1);
    const evVon = (k) => {
      const erz = k * region.ertrag * dach.ertragFaktor;
      return erz > 0 ? geteilteMenge(erz, verbrauch, a) / erz : 1;
    };
    if (evVon(hi) >= 0.5) ausgewogenKwp = hi;
    else {
      for (let i = 0; i < 40; i++) {
        const mitte = (lo + hi) / 2;
        if (evVon(mitte) >= 0.5) lo = mitte;
        else hi = mitte;
      }
      ausgewogenKwp = lo;
    }
  }

  return {
    eingabe: e,
    land: l,
    modell,
    region,
    typ,
    dach,
    a,
    kwp,
    erzeugung,
    einheiten,
    verbrauchGesamt,
    verbrauch,
    genutzt,
    ueberschuss,
    eigenverbrauch,
    deckung,
    genutztJeEinheit: einheiten > 0 ? genutzt / Math.max(1, Math.round(einheiten * e.teilnahme)) : 0,
    teilnehmende: Math.max(0, Math.round(einheiten * e.teilnahme)),
    passung,
    ausgewogenKwp,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/gebaeudestrom.js                   */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  const de = rechneGebaeudestrom({ land: "de" });
  pruefe(de.kwp > 0 && de.erzeugung > 0, "DE: Leistung und Erzeugung positiv");
  pruefe(de.genutzt <= de.erzeugung + 1e-9 && de.genutzt <= de.verbrauch + 1e-9, "genutzt ≤ Erzeugung und ≤ Verbrauch");
  pruefe(Math.abs(de.genutzt + de.ueberschuss - de.erzeugung) < 1e-6, "Bilanz: genutzt + Überschuss = Erzeugung");
  pruefe(de.modell.id === "mieterstrom", "DE: Standardmodell Mieterstrom");

  const at = rechneGebaeudestrom({ land: "at" });
  pruefe(at.region.land === "AT" && at.modell.id === "gea", "AT: Region und Modell GEA");
  const ch = rechneGebaeudestrom({ land: "ch", modell: "vzev" });
  pruefe(ch.region.land === "CH" && ch.modell.id === "vzev", "CH: Region und Modell vZEV");

  const klein = rechneGebaeudestrom({ land: "de", dachflaecheM2: 60 });
  pruefe(klein.eigenverbrauch > de.eigenverbrauch, "kleinere Anlage → höherer Eigenverbrauchsanteil");
  const gross = rechneGebaeudestrom({ land: "de", dachflaecheM2: 5000, wohneinheiten: 6 });
  pruefe(gross.passung === "zu_gross", "sehr große Anlage auf kleinem Gebäude → zu groß");
  const sp = rechneGebaeudestrom({ land: "de", speicher: true });
  pruefe(sp.genutzt > de.genutzt, "Speicher erhöht den genutzten Anteil");
  const gewerbe = rechneGebaeudestrom({ land: "de", gebaeudetyp: "gewerbe", gewerbeeinheiten: 4 });
  pruefe(gewerbe.a > de.a, "Gewerbe: höhere Gleichzeitigkeit als Wohnen");
  const flach = rechneGebaeudestrom({ land: "de", dachart: "flach" });
  pruefe(flach.kwp < de.kwp, "Flachdach: weniger kWp je m² als geneigtes Dach");
  pruefe(de.teilnehmende <= de.einheiten, "Teilnehmende ≤ Einheiten");
  pruefe(de.ausgewogenKwp > 0, "ausgewogene Größe wird berechnet");
  const beiAusgewogen = rechneGebaeudestrom({ land: "de", dachflaecheM2: de.ausgewogenKwp * de.dach.m2ProKwp });
  pruefe(Math.abs(beiAusgewogen.eigenverbrauch - 0.5) < 0.02 || beiAusgewogen.eigenverbrauch > 0.5, "bei ausgewogener Größe ≈ 50 % Eigenverbrauch");

  return { fehler, beispiel: { de, at, ch } };
}

if (typeof process !== "undefined" && process.argv?.[1] && /gebaeudestrom\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel } = selbsttest();
  for (const [k, r] of Object.entries(beispiel))
    console.log(
      `${k.toUpperCase()}: ${r.kwp.toFixed(0)} kWp, Erzeugung ${(r.erzeugung / 1000).toFixed(1)} MWh, genutzt ${(r.eigenverbrauch * 100).toFixed(0)} %, Deckung ${(r.deckung * 100).toFixed(0)} % (${r.modell.label})`
    );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest gebaeudestrom.js: alle Prüfungen bestanden.");
}
