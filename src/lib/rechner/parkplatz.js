// src/lib/rechner/parkplatz.js – Parkplatz-Hub (Welle 4): Schnell-Check Solarpflicht & Potenzial
//
// Reine Logik ohne UI. Drei Fragen, ehrliche Antwort:
//  1. Gilt für diesen Parkplatz eine Solarpflicht? → ja / nein / unklar, immer mit Rechtsgrundlage
//     und Quelle. Datengrundlage ist die fachlich geprüfte Übersicht aus dem Ratgeber
//     src/content/ratgeber/parkplatz-solarpflicht-bundeslaender.js (Landesrecht geprüft 09/2026,
//     Primärquellen dort je Land). NUR DACH: Deutschland je Bundesland; Österreich und Schweiz
//     ohne erfundene Regeln → Status „unklar“ mit ehrlichem Text (kein flächendeckendes
//     Parkplatz-Gesetz bekannt; Länder bzw. Kantone regeln unterschiedlich).
//  2. Potenzial in kWp: Stellplätze × CARPORT.kwpProStellplatz (belegte Flächenannahme
//     2,5 × 5 m je Stellplatz, Module ≈ 225 Wp/m² – src/lib/invest/markt.js, Stand dort).
//  3. Ladepunkte nach GEIG (nur DE): §§ 7, 8, 10 GEIG – Leitungsinfrastruktur und
//     Mindest-Ladepunkte je nach Neubau, größerer Renovierung oder Bestand.
//
// Keine Geldwerte, keine Rechtsberatung: Maßgeblich ist der Gesetzestext zum Zeitpunkt des
// Bauantrags; der Check liefert eine erste Orientierung mit Quelle.

import { CARPORT } from "../invest/markt.js";

export const PARKPLATZ_VERSION = "1.0";
/** Stand der Pflicht-Übersicht (wie Ratgeber parkplatz-solarpflicht-bundeslaender) */
export const PFLICHT_STAND = "September 2026";

/** Situationen des Parkplatzes */
export const SITUATIONEN = Object.freeze(["neubau", "erweiterung", "sanierung", "bestand"]);
/** Betreiber (Saarland und Rheinland-Pfalz unterscheiden gewerblich/öffentlich) */
export const BETREIBER = Object.freeze(["gewerblich", "oeffentlich"]);

/* ------------------------------------------------------------------ */
/* Quellen (aus dem geprüften Ratgeber übernommen, Stand 09/2026)       */
/* ------------------------------------------------------------------ */

const Q = Object.freeze({
  bw: { titel: "Umweltministerium Baden-Württemberg – FAQ Photovoltaikpflicht", url: "https://um.baden-wuerttemberg.de/de/klima-energie/energiewende/erneuerbare-energien/sonnenenergie/photovoltaik/photovoltaikpflicht/faq-photovoltaikpflicht", stand: "09/2026" },
  hh: { titel: "Freie und Hansestadt Hamburg – FAQ PV-Pflicht in Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/faq-pv-pflicht-in-hamburg-956122", stand: "09/2026" },
  ni: { titel: "NI-VORIS – § 32a NBauO Solarenergieanlagen zur Stromerzeugung", url: "https://voris.wolterskluwer-online.de/browse/document/f056c189-2143-307d-9a85-eb5d10b7fa52", stand: "09/2026" },
  nrw: { titel: "recht.nrw.de – Solaranlagen-Verordnung Nordrhein-Westfalen (SAN-VO NRW)", url: "https://recht.nrw.de/lrgv/rechtsverordnung/19062024-verordnung-zur-umsetzung-der-solaranlagen-pflicht-nach-ss-42a-und-ss/", stand: "09/2026" },
  sh: { titel: "Land Schleswig-Holstein – FAQ EWKG: Photovoltaik auf Parkplätzen", url: "https://www.schleswig-holstein.de/DE/fachinhalte/E/energiewende/_faqs_ewkg/faq_ewkg_pv/faq_ewkg_pv_parkplaetze/akkordeon_faq_ewkg_PV_parkplaetze", stand: "09/2026" },
  bb: { titel: "Ministerium für Infrastruktur und Landesplanung Brandenburg – Viertes Gesetz zur Änderung der BbgBO", url: "https://mil.brandenburg.de/mil/de/presse/detail/~19-06-2026-viertes-gesetz-zur-aenderung-der-bbgbo", stand: "09/2026" },
  gmodg: { titel: "Klimaschutz- und Energieagentur Niedersachsen – Gebäudemodernisierungsgesetz: Solarpflicht", url: "https://www.klimaschutz-niedersachsen.de/aktuelles/Neues-Gebaeudemodernisierungsgesetz-Solarpflicht-fuer-verschiedene-Gebaeude-5178", stand: "09/2026" },
  geig: { titel: "Gebäude-Elektromobilitätsinfrastruktur-Gesetz (GEIG) § 7", url: "https://www.gesetze-im-internet.de/geig/__7.html", stand: "09/2026" },
  ratgeber: { titel: "ÖkoInvest-Ratgeber: Solarpflicht für Parkplätze nach Bundesland (eigene Zusammenstellung aus Landesrecht)", url: "/ratgeber/parkplatz-solarpflicht-bundeslaender", stand: "09/2026" },
});
export const QUELLEN_PARKPLATZ = Q;

/* ------------------------------------------------------------------ */
/* Pflicht-Regeln je Bundesland (Schlüssel = Regions-Slug)              */
/* ------------------------------------------------------------------ */

/**
 * schwelle/art: Pflicht ab wie vielen Stellplätzen – art "mehr" = mehr als (ab dem nächsten),
 * art "ab" = einschließlich. erweiterung/sanierung: "ja" (ausdrücklich erfasst), "unklar"
 * (Gesetz stellt auf neue Parkplätze ab, Einzelfall), "nein". umfangAnteil nur, wo das Land
 * einen Prozentsatz der geeigneten Fläche nennt.
 */
export const PFLICHT_REGELN = Object.freeze({
  "baden-wuerttemberg": { name: "Baden-Württemberg", schwelle: 35, art: "mehr", umfang: "60 % der Eignungsfläche", umfangAnteil: 0.6, seit: "01.01.2022", grundlage: "§ 23 KlimaG BW, PVPf-VO", erweiterung: "unklar", sanierung: "nein", quelle: Q.bw },
  bayern: { name: "Bayern", keine: true, grundlage: "Art. 44a BayBO (nur Dächer)" },
  berlin: { name: "Berlin", keine: true, grundlage: "Solargesetz Berlin (nur Gebäude)" },
  brandenburg: { name: "Brandenburg", keine: true, aufgehoben: true, grundlage: "§ 32a BbgBO, zum 30.06.2026 aufgehoben", quelle: Q.bb },
  bremen: { name: "Bremen", keine: true, grundlage: "BremSolarG (nur Gebäude)" },
  hamburg: { name: "Hamburg", schwelle: 35, art: "mehr", umfang: "40 % der geeigneten Fläche", umfangAnteil: 0.4, seit: "01.01.2024", grundlage: "§ 16a HmbKliSchG, PVUmsVO", erweiterung: "ja", sanierung: "nein", quelle: Q.hh },
  hessen: { name: "Hessen", schwelle: 50, art: "mehr", umfang: "Anlage über der Stellplatzfläche", seit: "Bauantrag nach 29.11.2023", grundlage: "Hessisches Energiegesetz (HEG)", hinweis: "Landeseigene Parkplätze schon ab mehr als 35 Stellplätzen.", erweiterung: "unklar", sanierung: "nein" },
  "mecklenburg-vorpommern": { name: "Mecklenburg-Vorpommern", keine: true, grundlage: "keine Parkplatzpflicht" },
  niedersachsen: { name: "Niedersachsen", schwelle: 25, art: "mehr", umfang: "Solaranlage über der Stellplatzfläche", seit: "01.01.2025 (vorher mehr als 50)", grundlage: "§ 32a Abs. 3 NBauO", erweiterung: "ja", sanierung: "ja", sanierungText: "auch bei Erneuerung von mindestens 50 % eines bestehenden Parkplatzes", quelle: Q.ni },
  "nordrhein-westfalen": { name: "Nordrhein-Westfalen", schwelle: 35, art: "mehr", umfang: "30 % der geeigneten Fläche, alternativ ein Laubbaum je 5 Stellplätze", umfangAnteil: 0.3, seit: "01.01.2022", grundlage: "§ 48 Abs. 1a BauO NRW, SAN-VO NRW", hinweis: "Gilt für notwendige Stellplätze eines Nichtwohngebäudes.", erweiterung: "unklar", sanierung: "nein", quelle: Q.nrw },
  "rheinland-pfalz": { name: "Rheinland-Pfalz", schwelle: 50, art: "ab", umfang: "60 % der geeigneten Fläche", umfangAnteil: 0.6, seit: "01.01.2023 (öffentlich 2024)", grundlage: "Landessolargesetz (LSolarG)", hinweis: "Gilt für gewerblich und öffentlich genutzte Parkplätze.", erweiterung: "unklar", sanierung: "nein" },
  saarland: { name: "Saarland", schwelle: 35, art: "ab", umfang: "60 % der geeigneten Fläche", umfangAnteil: 0.6, seit: "2025", grundlage: "§§ 12a, 12b LBO Saarland", oeffentlichOhneSchwelle: true, hinweis: "Öffentliche Parkplätze sind unabhängig von der Schwelle erfasst.", erweiterung: "unklar", sanierung: "nein" },
  sachsen: { name: "Sachsen", keine: true, grundlage: "keine Parkplatzpflicht" },
  "sachsen-anhalt": { name: "Sachsen-Anhalt", keine: true, grundlage: "keine Parkplatzpflicht" },
  "schleswig-holstein": { name: "Schleswig-Holstein", schwelle: 70, art: "mehr", umfang: "Neubau und grundlegende Sanierung", seit: "Novelle 2025, Übergangsjahr", grundlage: "§ 25 EWKG", erweiterung: "unklar", sanierung: "ja", sanierungText: "auch bei grundlegender Sanierung", quelle: Q.sh },
  thueringen: { name: "Thüringen", keine: true, grundlage: "keine Parkplatzpflicht" },
});

export const BUNDESLAND_SLUGS = Object.freeze(Object.keys(PFLICHT_REGELN));

/** Bundesweit ab 2030: § 106 GModG – neue überdachte Parkplätze, die an ein Gebäude angrenzen */
export const GMODG_2030 = Object.freeze({
  text: "Bundesweit ab 01.01.2030: Auf neuen überdachten Parkplätzen, die physisch an ein Gebäude angrenzen, sind Solaranlagen Pflicht (§ 106 GModG, Umsetzung der EU-Gebäuderichtlinie). Offene Parkplätze erfasst die Bundesregel nicht; strengere Landesregeln bleiben zulässig.",
  quelle: Q.gmodg,
});

/* ------------------------------------------------------------------ */
/* Pflicht-Prüfung                                                     */
/* ------------------------------------------------------------------ */

const GRENZEN = Object.freeze({ stellplaetzeMin: 1, stellplaetzeMax: 20000 });
export { GRENZEN as GRENZEN_PARKPLATZ };

/**
 * Schnell-Check: Gilt eine Solarpflicht?
 * @param {{ land: "DE"|"AT"|"CH", region?: string, stellplaetze: number, situation?: string, betreiber?: string }} e
 * @returns {{ status: "ja"|"nein"|"unklar", code: string, regel: object|null, quelle: object|null }}
 */
export function pruefePflicht({ land = "DE", region = "", stellplaetze = 0, situation = "neubau", betreiber = "gewerblich" } = {}) {
  if (land === "AT") return { status: "unklar", code: "at", regel: null, quelle: null };
  if (land === "CH") return { status: "unklar", code: "ch", regel: null, quelle: null };
  const r = PFLICHT_REGELN[region];
  if (!r) return { status: "unklar", code: "region-fehlt", regel: null, quelle: null };
  const regel = { slug: region, ...r, quelle: r.quelle || Q.ratgeber };
  const quelle = regel.quelle;
  if (r.keine) return { status: "nein", code: r.aufgehoben ? "aufgehoben" : "keine-pflicht", regel, quelle };

  const erreicht = (r.art === "ab" ? stellplaetze >= r.schwelle : stellplaetze > r.schwelle) || (r.oeffentlichOhneSchwelle && betreiber === "oeffentlich");
  if (situation === "bestand") return { status: "nein", code: "bestand", regel, quelle };
  if (situation === "sanierung") {
    if (r.sanierung !== "ja") return { status: "nein", code: "sanierung-keine", regel, quelle };
    return erreicht ? { status: "ja", code: "sanierung", regel, quelle } : { status: "nein", code: "unter-schwelle", regel, quelle };
  }
  if (!erreicht) return { status: "nein", code: "unter-schwelle", regel, quelle };
  if (situation === "erweiterung" && r.erweiterung !== "ja") return { status: "unklar", code: "erweiterung-unklar", regel, quelle };
  return { status: "ja", code: situation === "erweiterung" ? "erweiterung" : "ueber-schwelle", regel, quelle };
}

/* ------------------------------------------------------------------ */
/* Potenzial & GEIG                                                    */
/* ------------------------------------------------------------------ */

/**
 * PV-Potenzial des Parkplatzes bei vollständiger Überdachung.
 * Flächenannahme: CARPORT.kwpProStellplatz (2,5 × 5 m je Stellplatz, Module ≈ 225 Wp/m²).
 * mindestKwp nur als grobe Orientierung, wo das Land einen Flächenanteil nennt –
 * maßgeblich ist die geeignete Fläche, nicht die Leistung.
 */
export function potenzial({ stellplaetze = 0, umfangAnteil = null } = {}) {
  const st = Math.max(0, stellplaetze);
  const kwp = Math.round(st * CARPORT.kwpProStellplatz);
  return {
    kwp,
    kwpProStellplatz: CARPORT.kwpProStellplatz,
    mindestKwp: umfangAnteil ? Math.round(kwp * umfangAnteil) : null,
    flaecheM2: Math.round(st * CARPORT.stellplatzM2),
  };
}

/**
 * Ladepunkte nach GEIG (nur Deutschland, Nichtwohngebäude):
 *  - Neubau mit mehr als 6 Stellplätzen: Leitungsinfrastruktur für jeden 3. Stellplatz, mindestens 1 Ladepunkt (§ 7 GEIG).
 *  - Größere Renovierung mit mehr als 10 Stellplätzen: jeder 5. Stellplatz, mindestens 1 Ladepunkt (§ 8 GEIG).
 *  - Bestand mit mehr als 20 Stellplätzen: seit 01.01.2025 mindestens 1 Ladepunkt (§ 10 GEIG).
 * @returns {{ greift: boolean, paragraph: string|null, leitungJe: number|null, leitungStellplaetze: number, ladepunkteMin: number }|null}
 */
export function geigCheck({ land = "DE", stellplaetze = 0, situation = "neubau" } = {}) {
  if (land !== "DE") return null;
  const st = Math.max(0, Math.floor(stellplaetze));
  if ((situation === "neubau" || situation === "erweiterung") && st > 6) {
    return { greift: true, paragraph: "§ 7 GEIG", leitungJe: 3, leitungStellplaetze: Math.ceil(st / 3), ladepunkteMin: 1 };
  }
  if (situation === "sanierung" && st > 10) {
    return { greift: true, paragraph: "§ 8 GEIG", leitungJe: 5, leitungStellplaetze: Math.ceil(st / 5), ladepunkteMin: 1 };
  }
  if (situation === "bestand" && st > 20) {
    return { greift: true, paragraph: "§ 10 GEIG", leitungJe: null, leitungStellplaetze: 0, ladepunkteMin: 1 };
  }
  return { greift: false, paragraph: null, leitungJe: null, leitungStellplaetze: 0, ladepunkteMin: 0 };
}

/** Gesamtergebnis des Schnell-Checks (Pflicht + Potenzial + GEIG) */
export function parkplatzCheck(e = {}) {
  const pflicht = pruefePflicht(e);
  return {
    version: PARKPLATZ_VERSION,
    stand: PFLICHT_STAND,
    pflicht,
    potenzial: potenzial({ stellplaetze: e.stellplaetze, umfangAnteil: pflicht.status === "ja" ? pflicht.regel?.umfangAnteil || null : null }),
    geig: geigCheck(e),
    gmodg2030: e.land === "DE" || !e.land ? GMODG_2030 : null,
  };
}
