// src/lib/projekte/glaesernerPark.js – Gläserner Solarpark (Welle 4, Paket GLAESERN)
//
// Wiederverwendbare Vorlage: EIN Datenobjekt je Park (PARKS). Die Seite
// src/app/(stamm)/projekte/glaeserner-solarpark/page.js rendert daraus die
// Vorzeige-Projektseite (Live-Ansicht, Bautagebuch, Pachtmodell am Beispiel,
// Maßnahmenliste, Gemeinde, FAQ der Anwohner).
//
// WICHTIG (bis echte Parkdaten freigegeben sind):
//  - Erste Instanz ist ein BEISPIELPARK: demo: true, alle Zahlen sind gekennzeichnete
//    Beispielwerte, abgeleitet aus dem Faktenregister (src/lib/fakten) – keine echten Parkdaten.
//  - Die „Live“-Erzeugung ist ein deterministischer DEMO-Verlauf (demoLeistungKw) nach dem
//    Muster des Messdaten-Simulators (src/lib/plattform/messdaten/simulator.js): Glockenkurve
//    über den Tag, saisonale Tageslänge, reproduzierbares „Wetter“ je Tag. Überall als
//    Demo-Daten gekennzeichnet (Entwurfs-Badge „Beispieldaten – echte Parkdaten folgen“).
//  - Texte NEUTRAL: Maßnahmen werden benannt, ohne Umwelt-Werbeaussagen (EmpCo/§ 5 UWG,
//    qa/claim-lint.mjs). Keine Zusagen, keine Superlative.
//
// Texte zweisprachig als { de, en } (Sprachmodell; die Seite wählt über uebersetze()).

import { faktWert } from "../fakten/index.js";

/* ------------------------------------------------------------------ */
/* Beispielwerte aus dem Faktenregister (DE, geprüft)                   */
/* ------------------------------------------------------------------ */

const ERTRAG_SUED = faktWert("region.de-sued.ertrag", "DE") ?? 1100; // kWh/kWp·a, PVGIS-Mittel mit Abschlag
const HA_PRO_MWP = faktWert("freiflaeche.haProMwp", "DE") ?? 1.1; // ha/MWp, Technikwert DACH
const PACHT_HA = faktWert("pacht.freiflaecheProHa", "DE") ?? { min: 1500, mittel: 2800, max: 4500 }; // €/ha·a
const PACHT_LAUFZEIT = faktWert("pacht.laufzeit", "DE") ?? 30; // Jahre
const PACHT_INDEX = faktWert("pacht.indexierung", "DE") ?? 0.015; // Anteil/Jahr
const EEG6_CT = faktWert("kommune.beteiligungCt", "DE") ?? 0.2; // ct/kWh, § 6 EEG

const KWP = 9800; // Beispiel: 9,8 MWp
const FLAECHE_HA = Math.round(((KWP / 1000) * HA_PRO_MWP) * 10) / 10; // ≈ 10,8 ha
const ERTRAG_MWH = Math.round((KWP * ERTRAG_SUED) / 1000); // ≈ 10.780 MWh/a

/* ------------------------------------------------------------------ */
/* Parkvorlage: erste Instanz = Beispielpark                            */
/* ------------------------------------------------------------------ */

export const DEMO_PARK = Object.freeze({
  slug: "glaeserner-solarpark",
  /** true = Beispielpark: alle Zahlen Beispielwerte, Live-Ansicht Demo-Verlauf */
  demo: true,
  name: { de: "Beispielpark Mustertal", en: "Mustertal example park" },
  ort: { de: "Süddeutschland (fiktiver Standort)", en: "Southern Germany (fictitious site)" },
  land: "DE",

  kennzahlen: Object.freeze({
    beispiel: true,
    kwp: KWP,
    flaecheHa: FLAECHE_HA,
    ertragMwhJahr: ERTRAG_MWH,
    inbetriebnahme: "2025-07",
    module: 16800, // Beispiel: ~580 Wp je Modul
    quellen: {
      ertrag: { de: `Rechenwert ${ERTRAG_SUED} kWh/kWp·a, Region Süd (PVGIS-Mittel mit eigenem Abschlag, Faktenregister region.de-sued.ertrag)`, en: `calculation value ${ERTRAG_SUED} kWh/kWp·a, southern region (PVGIS average with our own deduction, facts register region.de-sued.ertrag)` },
      flaeche: { de: `${HA_PRO_MWP} ha je MWp (Technikwert, Faktenregister freiflaeche.haProMwp)`, en: `${HA_PRO_MWP} ha per MWp (technical value, facts register freiflaeche.haProMwp)` },
    },
  }),

  /** Bautagebuch: chronologisch, status fertig | laufend | geplant */
  bautagebuch: Object.freeze([
    { datum: "2023-03", status: "fertig", titel: { de: "Pachtvertrag unterschrieben", en: "Lease agreement signed" }, text: { de: "Vertrag mit zwei Eigentümerfamilien über die gesamte Fläche, Laufzeit mit Rückbauregelung.", en: "Agreement with two owner families covering the entire area, term with a dismantling clause." } },
    { datum: "2023-09", status: "fertig", titel: { de: "Aufstellungsbeschluss der Gemeinde", en: "Municipal planning resolution" }, text: { de: "Der Gemeinderat beschließt die Aufstellung des Bebauungsplans; Unterlagen liegen öffentlich aus.", en: "The municipal council resolves to prepare the development plan; documents are on public display." } },
    { datum: "2024-05", status: "fertig", titel: { de: "Bebauungsplan rechtskräftig", en: "Development plan legally effective" }, text: { de: "Satzungsbeschluss nach Abwägung der Stellungnahmen aus der Öffentlichkeitsbeteiligung.", en: "Adoption after weighing the comments from the public consultation." } },
    { datum: "2024-08", status: "fertig", titel: { de: "Netzanschlusszusage", en: "Grid connection commitment" }, text: { de: "Zusage des Netzbetreibers für den Anschluss an das Umspannwerk, Trassenlänge rund 3 km.", en: "Commitment from the grid operator for the connection to the substation, route length around 3 km." } },
    { datum: "2025-02", status: "fertig", titel: { de: "Baubeginn", en: "Start of construction" }, text: { de: "Rammarbeiten für die Unterkonstruktion; Baustellenverkehr über die Kreisstraße, nicht durch den Ort.", en: "Pile driving for the substructure; construction traffic via the district road, not through the village." } },
    { datum: "2025-05", status: "fertig", titel: { de: "Module und Wechselrichter montiert", en: "Modules and inverters installed" }, text: { de: "Montage der Modultische, Verkabelung, Übergabestation gesetzt.", en: "Mounting of the module tables, cabling, transfer station placed." } },
    { datum: "2025-07", status: "fertig", titel: { de: "Inbetriebnahme", en: "Commissioning" }, text: { de: "Stufenweise Inbetriebnahme mit dem Netzbetreiber, anschließend Probebetrieb.", en: "Staged commissioning with the grid operator, followed by trial operation." } },
    { datum: "2025-10", status: "fertig", titel: { de: "Einsaat und Eingrünung", en: "Seeding and perimeter greening" }, text: { de: "Ansaat der Flächen zwischen und unter den Modulreihen, Pflanzung der Heckenabschnitte am Rand.", en: "Seeding of the areas between and under the module rows, planting of the hedge sections at the edge." } },
    { datum: "2026-01", status: "laufend", titel: { de: "Regelbetrieb mit Monitoring", en: "Regular operation with monitoring" }, text: { de: "Laufender Betrieb; Erzeugung, Wartungen und besondere Ereignisse werden hier fortgeschrieben.", en: "Ongoing operation; generation, maintenance and notable events are recorded here." } },
    { datum: "2026-06", status: "geplant", titel: { de: "Erster Betriebsbericht an die Gemeinde", en: "First operating report to the municipality" }, text: { de: "Jährlicher Bericht mit Erzeugung, Zahlungen an die Gemeinde und Stand der Pflegemaßnahmen.", en: "Annual report with generation, payments to the municipality and the status of maintenance measures." } },
  ]),

  /** Pachtmodell am Beispiel – gekennzeichnete Beispielwerte (DE-Spannen aus dem Faktenregister) */
  pacht: Object.freeze({
    beispiel: true,
    land: "DE",
    proHa: PACHT_HA, // { min, mittel, max } €/ha·a
    flaecheHa: FLAECHE_HA,
    jahrMittel: Math.round(FLAECHE_HA * PACHT_HA.mittel), // Beispielrechnung
    laufzeitJahre: PACHT_LAUFZEIT,
    indexierung: PACHT_INDEX,
  }),

  /** Maßnahmen am Park – NEUTRALE Liste (was gemacht wird), ohne Wirkungs- oder Werbeaussagen */
  massnahmen: Object.freeze([
    { de: "Einzäunung mit rund 15 cm Bodenfreiheit, damit Kleintiere die Fläche queren können", en: "Fencing with around 15 cm ground clearance so small animals can cross the area" },
    { de: "Ansaat einer regionalen Saatgutmischung zwischen und unter den Modulreihen", en: "Seeding of a regional seed mixture between and under the module rows" },
    { de: "Mahd in Abschnitten, zweimal pro Jahr, ohne Dünger und ohne chemisch-synthetische Pflanzenschutzmittel", en: "Mowing in sections, twice a year, without fertiliser and without chemical-synthetic pesticides" },
    { de: "Heckenpflanzung an zwei Seiten als Sichtschutz zur Wohnbebauung", en: "Hedge planting on two sides as visual screening towards residential buildings" },
    { de: "Nistkästen und Sitzstangen am Rand der Fläche", en: "Nesting boxes and perches at the edge of the area" },
    { de: "Module auf gerammten Pfosten ohne Betonfundamente; versiegelt sind im Wesentlichen Trafostationen und Zuwege", en: "Modules on driven posts without concrete foundations; sealing is essentially limited to transformer stations and access paths" },
    { de: "Begleitung durch ein Fachbüro für Landschaftsplanung, Pflegeplan als Teil der Genehmigung", en: "Supervised by a landscape-planning consultancy, maintenance plan as part of the permit" },
    { de: "Rückbau nach Vertragsende vereinbart, Rückbausicherheit zugunsten der Eigentümer hinterlegt", en: "Dismantling after the end of the contract agreed, dismantling security deposited in favour of the owners" },
  ]),

  /** Beteiligung der Standortgemeinde (DE: § 6 EEG) – Beispielrechnung */
  gemeinde: Object.freeze({
    beispiel: true,
    land: "DE",
    eeg6CtProKwh: EEG6_CT,
    zahlungJahr: Math.round((ERTRAG_MWH * 1000 * EEG6_CT) / 100), // kWh × ct → €
  }),

  /** FAQ der Anwohner (neutral, ohne Zusagen) */
  faq: Object.freeze([
    {
      q: { de: "Blenden die Module?", en: "Do the modules cause glare?" },
      a: { de: "Solarmodule sind darauf ausgelegt, Licht aufzunehmen, nicht zu spiegeln; moderne Module haben entspiegeltes Glas. Ob an einzelnen Punkten Blendwirkung auftreten kann, wird im Genehmigungsverfahren mit einem Blendgutachten geprüft – beim Beispielpark war das Ergebnis Teil der Auslegungsunterlagen.", en: "Solar modules are designed to absorb light, not reflect it; modern modules have anti-reflective glass. Whether glare can occur at individual points is examined in the permitting procedure with a glare report – for the example park, the result was part of the publicly displayed documents." },
    },
    {
      q: { de: "Macht der Park Geräusche?", en: "Does the park make noise?" },
      a: { de: "Die Module selbst sind lautlos. Wechselrichter und Trafostation erzeugen tagsüber ein leises Summen, das in wenigen Metern Abstand im Umgebungsgeräusch untergeht; nachts erzeugt die Anlage keinen Strom und ist still. Die Stationen stehen beim Beispielpark an der von der Wohnbebauung abgewandten Seite.", en: "The modules themselves are silent. Inverters and the transformer station produce a quiet hum during the day that merges into ambient noise within a few metres; at night the plant produces no power and is silent. At the example park, the stations are on the side facing away from residential buildings." },
    },
    {
      q: { de: "Wird der Boden versiegelt?", en: "Is the soil sealed?" },
      a: { de: "Die Modultische stehen auf gerammten Stahlpfosten ohne Betonfundamente. Versiegelt werden im Wesentlichen die Trafostationen und Teile der Zuwege; der weit überwiegende Teil der Fläche bleibt offener Boden mit Bewuchs und kann nach dem Rückbau wieder landwirtschaftlich genutzt werden.", en: "The module tables stand on driven steel posts without concrete foundations. Sealing is essentially limited to the transformer stations and parts of the access paths; the vast majority of the area remains open, vegetated ground and can be farmed again after dismantling." },
    },
    {
      q: { de: "Was passiert nach dem Ende der Laufzeit?", en: "What happens at the end of the term?" },
      a: { de: "Der Rückbau ist im Pachtvertrag geregelt: Die Anlage wird vollständig entfernt, die Fläche zurückgegeben. Für die Kosten wird eine Rückbausicherheit (zum Beispiel eine Bürgschaft) zugunsten der Eigentümer hinterlegt – beim Beispielpark bereits mit Baubeginn.", en: "Dismantling is governed by the lease: the plant is removed completely and the land handed back. A dismantling security (for example a guarantee) is deposited in favour of the owners to cover the costs – at the example park, from the start of construction." },
    },
    {
      q: { de: "Was hat die Gemeinde davon?", en: "What does the municipality get out of it?" },
      a: { de: "In Deutschland kann der Betreiber der Standortgemeinde nach § 6 EEG bis zu 0,2 ct je erzeugter Kilowattstunde zahlen; dazu kommt Gewerbesteuer am Standort. Die Beispielrechnung dieser Seite zeigt die Größenordnung für den Beispielpark. In Österreich und der Schweiz gelten andere Regeln – dort nennen wir erst nach Prüfung konkrete Werte.", en: "In Germany, the operator can pay the host municipality up to 0.2 ct per kilowatt-hour generated under § 6 EEG; local trade tax comes on top. The example calculation on this page shows the order of magnitude for the example park. Different rules apply in Austria and Switzerland – we only quote concrete figures there after review." },
    },
    {
      q: { de: "Wie kann ich Fragen stellen oder den Park besichtigen?", en: "How can I ask questions or visit the park?" },
      a: { de: "Über das Formular am Ende dieser Seite oder telefonisch. Für Gemeinden und Schulklassen organisieren wir Besichtigungen am Zaun mit Erläuterung der Technik; das Betreten der Anlage selbst ist aus Sicherheitsgründen nur in Begleitung möglich.", en: "Via the form at the end of this page or by phone. For municipalities and school classes we arrange visits at the fence with an explanation of the technology; entering the plant itself is only possible accompanied, for safety reasons." },
    },
  ]),
});

/** Alle Parks der Vorlage (weitere echte Parks werden hier ergänzt). */
export const PARKS = Object.freeze([DEMO_PARK]);

export function parkBySlug(slug) {
  return PARKS.find((p) => p.slug === slug) || null;
}

/* ------------------------------------------------------------------ */
/* Demo-Erzeugung: deterministischer Tagesverlauf                        */
/* ------------------------------------------------------------------ */

/** Tageslänge je Monat (0–11): [Aufgang, Untergang] in Stunden, grob für Süddeutschland. */
const SONNE = [
  [8, 16.8], [7.3, 17.7], [6.3, 18.5], [6.3, 20.3], [5.5, 21], [5.1, 21.4],
  [5.4, 21.2], [6.1, 20.4], [6.9, 19.3], [7.6, 18.2], [7.4, 16.6], [8.1, 16.3],
];

/** Deterministische Pseudozufallszahl 0..1 aus einem Ganzzahl-Samen (mulberry32, eine Runde). */
function rausch(saat) {
  let t = (saat + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Tages-Samen aus dem Datum (UTC-unabhängig: lokale Datumsteile). */
function tagSaat(d) {
  return d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
}

/**
 * Demo-Leistung des Parks in kW zu einem Zeitpunkt (deterministisch, reproduzierbar).
 * Glockenkurve zwischen Auf- und Untergang, saisonale Spitze, „Wetter“ je Tag und
 * leichte Bewölkungswellen über den Tag. KEINE echten Messdaten.
 */
export function demoLeistungKw(park, datum = new Date()) {
  const d = datum instanceof Date ? datum : new Date(datum);
  const [auf, unter] = SONNE[d.getMonth()];
  const h = d.getHours() + d.getMinutes() / 60;
  if (h <= auf || h >= unter) return 0;
  const x = (h - auf) / (unter - auf); // 0..1 über den Tag
  const glocke = Math.sin(Math.PI * x) ** 1.6;
  // saisonale Spitze: Sommer ~88 % von kWp, Winter ~45 %
  const saison = 0.45 + 0.43 * Math.sin((Math.PI * (d.getMonth() + 0.5)) / 12) ** 2;
  // Tageswetter: 0,45 (trüb) .. 1,0 (klar), je Tag fest
  const wetter = 0.45 + 0.55 * rausch(tagSaat(d));
  // Bewölkungswellen über den Tag (deterministisch je Viertelstunde)
  const slot = Math.floor(h * 4);
  const welle = 0.9 + 0.1 * Math.sin(h * 1.7 + rausch(tagSaat(d) * 7) * 6) + 0.06 * (rausch(tagSaat(d) * 97 + slot) - 0.5);
  const kw = park.kennzahlen.kwp * glocke * saison * wetter * welle;
  return Math.max(0, Math.round(kw));
}

/**
 * Demo-Tagesverlauf: Werte ab Mitternacht bis `bis` (Standard: ganzer Tag) im Raster schrittMin.
 * Liefert [{ h, kw }], gleiche Kurve wie demoLeistungKw.
 */
export function demoTagesverlauf(park, datum = new Date(), { schrittMin = 30, bisJetzt = false } = {}) {
  const d = datum instanceof Date ? new Date(datum) : new Date(datum);
  const ende = bisJetzt ? d.getHours() + d.getMinutes() / 60 : 24;
  const punkte = [];
  for (let m = 0; m <= 24 * 60; m += schrittMin) {
    const h = m / 60;
    if (h > ende) break;
    const t = new Date(d);
    t.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    punkte.push({ h, kw: demoLeistungKw(park, t) });
  }
  return punkte;
}

/** Demo-Tagessumme in MWh bis zum Zeitpunkt (Integral über den Demo-Verlauf). */
export function demoTagesMwh(park, datum = new Date()) {
  const schrittMin = 15;
  const punkte = demoTagesverlauf(park, datum, { schrittMin, bisJetzt: true });
  const kwh = punkte.reduce((s, p) => s + (p.kw * schrittMin) / 60, 0);
  return Math.round(kwh / 100) / 10; // MWh mit einer Nachkommastelle
}
