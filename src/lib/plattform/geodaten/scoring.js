// src/lib/plattform/geodaten/scoring.js
//
// Scoring-Engine der Flächenakquise (reine Funktionen, Client + Server). Bewertet eine Kandidatenfläche –
// eine Parzelle oder einen zusammenhängenden Verbund mehrerer Parzellen/Schläge – mit 0–100 Punkten und
// Begründung. Gegenstück in Python (identische Regeln und Konstanten, gemeinsame Testfälle):
//   Backend-Import/dienste/geodaten/geodaten/scoring.py  ·  tests/faelle.json
//
// Kriterien (Höchstpunkte): Größe 20 · Form 8 · Neigung/Exposition 12 · Nutzung 8 · Siedlungsabstand 8 ·
// Netz (Trassenlänge) 22 · Netzanschlusskosten 8 · Widmungslage 10 · Einstrahlung 4 = 100.
// Abzüge: Schutzgebiete (Nähe/Überdeckung), knappe Netzkapazität. K.-o.-Kriterien deckeln den Punktwert
// (zu klein, Kern-Schutzgebiet, zu steil).
//
// Netzanschlusskosten: Logik des Netzanschluss-Rechners (src/lib/rechner/netzanschluss.js, FREIFLAECHE.netz).
// Alle Werte sind Schätzungen für die Vorauswahl – maßgeblich sind Netzbetreiber-Auskunft und Standortprüfung.

import { FREIFLAECHE, PACHT } from "../../invest/markt.js";
import { rechneNetzanschluss, ebeneFuer } from "../../rechner/netzanschluss.js";
import { distanzM } from "./geo.js";

export const SCORING_VERSION = "2026-09-30.2"; // .2: Deutschland/Schweiz (EEG-Kulisse, BauGB-Privilegierung, Richtplan, FFF)

export const GEWICHTE = { groesse: 20, form: 8, neigung: 12, nutzung: 8, siedlung: 8, netz: 22, kosten: 8, widmung: 10, einstrahlung: 4 };

/**
 * Gewichte je Land (Summe jeweils 100). Österreich = GEWICHTE. Deutschland und Schweiz erhalten das Kriterium
 * „Flächenkulisse“ (DE: EEG-Förderkulisse § 37 EEG; CH: kantonale Eignungsgebiete/vorbelastete Standorte) – die übrigen
 * Kriterien werden proportional skaliert (Punkte = Grundpunkte × Landesgewicht / Grundgewicht).
 */
export const GEWICHTE_LAND = {
  AT: GEWICHTE,
  DE: { groesse: 18, form: 7, neigung: 10, nutzung: 6, siedlung: 7, netz: 20, kosten: 7, widmung: 8, kulisse: 14, einstrahlung: 3 },
  CH: { groesse: 18, form: 7, neigung: 11, nutzung: 6, siedlung: 7, netz: 20, kosten: 7, widmung: 8, kulisse: 12, einstrahlung: 4 },
};

/**
 * Flächenkulisse (Anteile 0–1 der Kandidatenfläche, aus Geodaten des Dienstes bzw. der Demo):
 *   DE  randstreifenAnteil – ≤ 500 m längs Autobahn/Schienenweg (§ 37 Abs. 1 Nr. 2 lit. c EEG 2023) – förderfähig
 *       benachteiligtAnteil – Acker/Grünland im benachteiligten Gebiet (§ 37 Abs. 1 Nr. 3 lit. h/i, § 37c EEG; Länder-Opt-out möglich)
 *       moorAnteil         – entwässerter, landwirtschaftlich genutzter Moorboden mit Wiedervernässung (§ 37 Abs. 1 Nr. 3 lit. e EEG)
 *       konversionAnteil   – Konversions-/versiegelte Fläche (§ 37 Abs. 1 Nr. 2 lit. a/b EEG)
 *       privilegiertAnteil – ≤ 200 m längs Autobahn/zweigleisiger Hauptbahn (§ 35 Abs. 1 Nr. 8 lit. b BauGB) → Widmungslage
 *   CH  eignungAnteil      – kantonales Eignungsgebiet/Richtplan-Festsetzung für Solaranlagen
 *       vorbelastet        – an Verkehrs-/Infrastrukturanlagen (vorbelasteter Standort)
 *       fffAnteil          – Fruchtfolgefläche (Sachplan FFF) → Abzug
 * Faktor je Kulisse (Anteil × Faktor, Maximum zählt): Randstreifen/Konversion 1,0 · benachteiligt 0,85 · Moor 0,7.
 */
export const KULISSE = {
  DE: { randstreifenM: 500, privilegiertM: 200, faktor: { konversion: 1, randstreifen: 1, benachteiligt: 0.85, moor: 0.7 } },
  CH: { faktor: { eignung: 1, vorbelastet: 0.6 }, fffAbzug: 8 },
};

/** Näherung Trassenlänge: Luftlinie × Umwegfaktor + Zuschlag je Querung (Straße ab Landesstraße, Bahn, Fluss) */
export const TRASSE = { umwegFaktor: 1.25, querungZuschlagM: 150, suchradiusKm: 25 };

/** Schwellen der Bewertung */
export const SCHWELLEN = {
  mindestHa: 2, // darunter K.-o. (Deckel)
  idealHa: [5, 50],
  maxNeigungGrad: 15, // darüber K.-o. (Deckel)
  siedlungAbstandM: [100, 300], // < 100 m kritisch, ≥ 300 m voll
  ampel: { gruen: 65, gelb: 45 },
};

/** Schutzgebietsarten: kern = Ausschluss (Deckel), sonst Abzug */
export const SCHUTZ_ARTEN = {
  nationalpark: { label: "Nationalpark", kern: true, abzugNah: 6 },
  natura2000: { label: "Natura 2000 / Europaschutzgebiet", kern: true, abzugNah: 6 },
  naturschutz: { label: "Naturschutzgebiet", kern: true, abzugNah: 5 },
  wasserschutz: { label: "Wasserschutz-/Schongebiet", kern: false, abzug: 10, abzugNah: 0 },
  landschaftsschutz: { label: "Landschaftsschutzgebiet", kern: false, abzug: 8, abzugNah: 2 },
  sonstig: { label: "sonstiges Schutzgebiet", kern: false, abzug: 5, abzugNah: 0 },
};

/** Netzknoten-Arten (aus OSM power=substation/transformer bzw. Netzbetreiber-Daten) */
export const KNOTEN_ARTEN = {
  uew: { label: "Umspannwerk Übertragungsnetz (220/380 kV)", kurz: "UW 380/220 kV" },
  uw110: { label: "Umspannwerk 110 kV / Mittelspannung", kurz: "UW 110 kV" },
  ms: { label: "Umspann-/Schaltwerk Mittelspannung", kurz: "UW MS" },
  trafo: { label: "Trafostation (MS/NS)", kurz: "Trafostation" },
};

/** Welche Knoten kommen für eine Ebene in Frage (msLeitung: Einschleifen nahe MS-Netzpunkt) */
const KNOTEN_FUER_EBENE = { msLeitung: ["trafo", "ms", "uw110"], uwMs: ["uw110"], hs: ["uw110", "uew"] };

/** Ertrag kWh/kWp je Bundesland (PVGIS, aus src/data/regionen/*.js – ertrag.kwhProKwp) */
export const ERTRAG = {
  Burgenland: 1210, Kärnten: 1240, Niederösterreich: 1190, Oberösterreich: 1130, Salzburg: 1140, Steiermark: 1220, Tirol: 1370, Vorarlberg: 1130, Wien: 1190,
  _AT: 1120, _DE: 1020, _CH: 1050,
  // Deutschland je Bundesland (PVGIS, src/data/regionen/*.js – ertrag.kwhProKwp)
  "Baden-Württemberg": 1130, Bayern: 1130, Berlin: 1050, Brandenburg: 1070, Bremen: 1000, Hamburg: 1010, Hessen: 1090, "Mecklenburg-Vorpommern": 1040,
  Niedersachsen: 980, "Nordrhein-Westfalen": 1060, "Rheinland-Pfalz": 1110, Saarland: 1080, Sachsen: 1080, "Sachsen-Anhalt": 1080, "Schleswig-Holstein": 980, Thüringen: 1070,
};

/**
 * Widmungsregeln je Bundesland (Stand der Regionaldaten 29.09.2026, src/data/regionen/*.js):
 *   art "uw_radius": Zone = Radius um Umspannwerke (OÖ Kriterienkatalog: energiewirtschaftliche Priorität 1 bis 5 km, 2 bis 7,5 km)
 *   art "zonen":     Zone = verordnete Zonen als Geodaten (NÖ SekRop PV, Bgld. Eignungszonen, Stmk. SAPRO Vorrangzonen)
 *   art "einzelfall": keine landesweite Zonierung – Einzelfallprüfung (Sbg. Kennzeichnung mit Punktesystem, Ktn. max. 4 ha …)
 *   maxHaAusserhalb: Größengrenze außerhalb der Zonen (NÖ 2 ha), maxHa: Obergrenze je Widmung (Ktn. 4 ha)
 */
export const WIDMUNG = {
  Oberösterreich: { art: "uw_radius", zoneKm: 5, angrenzendKm: 7.5, text: "Kriterienkatalog PV-FFA: energiewirtschaftliche Priorität 1 (≤ 5 km zum Umspannwerk) bzw. 2 (≤ 7,5 km); Bodenfruchtbarkeit Stufe 4–5 im Einzelfall prüfen (DORIS)." },
  Niederösterreich: { art: "zonen", angrenzendM: 200, maxHaAusserhalb: 2, text: "SekRop PV: 116 Zonen (je Zone 5 ha, mit Ökologiekonzept 10 ha); außerhalb höchstens 2 ha, Zusammenrechnung im 200-m-Umkreis." },
  Burgenland: { art: "zonen", angrenzendM: 0, maxHaAusserhalb: 0, text: "Freiflächen-PV nur in Eignungszonen (Bgld. RPG 2019 § 22d); unter 10 ha zusätzlich Widmung nötig." },
  Steiermark: { art: "zonen", angrenzendM: 500, text: "SAPRO Solarenergie: 36 Vorrangzonen (> 10 ha); außerhalb Sondernutzung im Freiland über die Gemeinde, Ausschlusszonen beachten." },
  Salzburg: { art: "einzelfall", text: "Kennzeichnung nach § 39b ROG 2009 über 200 m² mit Punktesystem der PV-Kennzeichnungsverordnung 2023 (je Bodenkategorie 20–40 Punkte)." },
  Kärnten: { art: "einzelfall", maxHa: 4, text: "Widmung „Grünland – Photovoltaikanlage“, zusammenhängend max. 4 ha, 1.000 m Abstand zwischen Widmungsflächen (K-PhV 2024)." },
  Tirol: { art: "einzelfall", text: "Sonderfläche bis 250 kWp, darüber Bewilligung nach TEG – Einzelfall." },
  Vorarlberg: { art: "einzelfall", text: "Sondergebiet in der Freifläche; Landesgrünzone Rheintal/Walgau beachten." },
  Wien: { art: "einzelfall", text: "Vorbelastete Flächen bevorzugt; Grünland-Schutzgebiet beachten." },
  // Deutschland: Bauplanungsrecht (BauGB) – privilegiert nur im 200-m-Streifen, sonst Bebauungsplan der Gemeinde
  _DE: { art: "baugb", text: "Außerhalb des privilegierten 200-m-Streifens ist ein Bebauungsplan der Gemeinde nötig (Aufstellungsbeschluss, frühzeitige Beteiligung, Satzungsbeschluss); Regionalplan und gemeindliche Kriterien beachten." },
  Bayern: { art: "baugb", text: "StMB-Hinweise: in der Regel vorhabenbezogener Bebauungsplan; Ausschluss u. a. Böden überdurchschnittlicher Bonität, Wiesenbrütergebiete, Überschwemmungsgebiete; Raumverträglichkeit ab ca. 30 ha prüfen." },
  "Baden-Württemberg": { art: "baugb", text: "Regionalpläne mit PV-Vorrang-/Vorbehaltsgebieten (0,2-%-Flächenziel), Flurbilanz beachten; außerhalb des 200-m-Streifens Bebauungsplan." },
  Brandenburg: { art: "baugb", text: "Arbeitshilfe des Landes und Freiraumverbund (LEP HR) beachten; Sonderabgabe an die Gemeinde; außerhalb des 200-m-Streifens Bebauungsplan." },
  // Schweiz: Anlagen ausserhalb der Bauzone nur ausnahmsweise – kantonaler Richtplan/Eignungsgebiete, Interessenabwägung
  _CH: { art: "richtplan", text: "Ausserhalb der Bauzone nur mit Ausnahmebewilligung bzw. Festsetzung im kantonalen Richtplan; Fruchtfolgeflächen, Landschaft und Natur in der Interessenabwägung – Einzelfall mit Kanton und Gemeinde klären." },
};

const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** Mögliche Leistung in MWp (Freifläche Süd, fest) */
export const mwpFuer = (ha) => r1((Number(ha) || 0) / FREIFLAECHE.haProMwp);

/** Geschätzte Trassenlänge in m aus Luftlinie und Anzahl Querungen */
export function trasseM(luftlinieM, querungen = 0) {
  return Math.round(luftlinieM * TRASSE.umwegFaktor + Math.max(0, querungen) * TRASSE.querungZuschlagM);
}

/** Netzanschlusskosten (Rechner-Logik) für Leistung, Trassenlänge und Kapazität */
export function netzkosten(mwp, trasseKm, { ebene = "auto", kapazitaet = "unbekannt", land = "at" } = {}) {
  const r = rechneNetzanschluss({ mwp: Math.max(0.1, mwp), km: Math.max(0, trasseKm), ebene, kapazitaet: ["frei", "knapp"].includes(kapazitaet) ? kapazitaet : "unbekannt", land });
  return { ebene: r.ebene, summe: Math.round(r.summe), min: Math.round(r.spanne.min), max: Math.round(r.spanne.max), proKwp: Math.round(r.proKwp), anteil: Math.round(r.anteil * 1000) / 1000, ampel: r.ampel, monate: r.monate };
}

/**
 * Bester Netzknoten für eine Fläche: alle geeigneten Knoten im Suchradius, Auswahl nach geschätzten
 * Anschlusskosten (nicht nur Entfernung). `knoten` = [{ id, name, art, spannungKv, kapazitaet, lon, lat }].
 * Liefert { knoten, luftlinieM, trasseM, kosten, ebene } oder null.
 */
export function besterKnoten(punkt, mwp, knoten, { querungen = () => 0, land = "at" } = {}) {
  const ebene = ebeneFuer(mwp);
  const arten = KNOTEN_FUER_EBENE[ebene];
  let best = null;
  for (const k of knoten) {
    if (!arten.includes(k.art)) continue;
    const luft = distanzM(punkt, [k.lon, k.lat]);
    if (luft > TRASSE.suchradiusKm * 1000) continue;
    const tr = trasseM(luft, querungen(k));
    const kosten = netzkosten(mwp, tr / 1000, { ebene: k.art === "trafo" || k.art === "ms" ? "msLeitung" : ebene, kapazitaet: k.kapazitaet, land });
    const strafe = k.kapazitaet === "knapp" ? 1.5 : 1; // knappe Kapazität: Umweg zum nächsten freien Knoten oft günstiger
    const wert = kosten.summe * strafe;
    if (!best || wert < best.wert || (wert === best.wert && luft < best.luftlinieM)) best = { knoten: k, luftlinieM: Math.round(luft), trasseM: tr, kosten, ebene: kosten.ebene, wert };
  }
  if (best) delete best.wert;
  return best;
}

/** Nächster Knoten einer Art (für Anzeige „nächstes Umspannwerk“) */
export function naechsterKnoten(punkt, knoten, arten = ["uw110", "uew"]) {
  let best = null;
  for (const k of knoten) {
    if (!arten.includes(k.art)) continue;
    const d = distanzM(punkt, [k.lon, k.lat]);
    if (!best || d < best.luftlinieM) best = { knoten: k, luftlinieM: Math.round(d) };
  }
  return best;
}

/**
 * Widmungslage je Bundesland. `lage` = { bundesland, uwAbstandKm (nächstes UW ≥ 110 kV), zoneAbstandM (nächste
 * verordnete Zone; 0 = innerhalb; null = keine Zonendaten) }. Liefert { status: zone|angrenzend|ausserhalb|unklar, text }.
 */
export function widmungslage({ bundesland, uwAbstandKm = null, zoneAbstandM = null, land = null, privilegiertAnteil = null, eignungAnteil = null } = {}) {
  const regel = WIDMUNG[bundesland] || (land && land !== "AT" ? WIDMUNG[`_${land}`] : null);
  if (!regel) return { status: "unklar", text: "Keine Widmungsregel hinterlegt – Einzelfallprüfung.", regel: null };
  if (regel.art === "baugb") {
    // § 35 Abs. 1 Nr. 8 lit. b BauGB: privilegiert auf Flächen längs Autobahnen bzw. zweigleisiger Schienenwege des übergeordneten Netzes bis 200 m
    const p = Number(privilegiertAnteil) || 0;
    if (p >= 0.5) return { status: "zone", text: `Privilegiert nach § 35 Abs. 1 Nr. 8 lit. b BauGB (${Math.round(p * 100)} % im 200-m-Streifen an Autobahn bzw. zweigleisiger Hauptbahn) – kein Bebauungsplan zwingend, öffentliche Belange und Gemeinde dennoch einbinden. ${regel.text}`, regel };
    if (p > 0) return { status: "angrenzend", text: `Teilweise privilegiert (${Math.round(p * 100)} % im 200-m-Streifen) – übrige Fläche über Bebauungsplan. ${regel.text}`, regel };
    return { status: "unklar", text: `Bebauungsplan nötig. ${regel.text}`, regel };
  }
  if (regel.art === "richtplan") {
    const e = Number(eignungAnteil) || 0;
    if (e >= 0.5) return { status: "zone", text: `Im kantonalen Eignungsgebiet (${Math.round(e * 100)} %). ${regel.text}`, regel };
    if (e > 0) return { status: "angrenzend", text: `Teilweise im Eignungsgebiet (${Math.round(e * 100)} %). ${regel.text}`, regel };
    return { status: "unklar", text: regel.text, regel };
  }
  if (regel.art === "uw_radius") {
    if (uwAbstandKm == null) return { status: "unklar", text: regel.text, regel };
    if (uwAbstandKm <= regel.zoneKm) return { status: "zone", text: `Priorität 1 (≤ ${regel.zoneKm} km zum Umspannwerk). ${regel.text}`, regel };
    if (uwAbstandKm <= regel.angrenzendKm) return { status: "angrenzend", text: `Priorität 2 (≤ ${String(regel.angrenzendKm).replace(".", ",")} km zum Umspannwerk). ${regel.text}`, regel };
    return { status: "ausserhalb", text: `Außerhalb der Prioritätsradien. ${regel.text}`, regel };
  }
  if (regel.art === "zonen") {
    if (zoneAbstandM == null) return { status: "unklar", text: `Zonendaten nicht geladen. ${regel.text}`, regel };
    if (zoneAbstandM <= 0) return { status: "zone", text: `Innerhalb einer verordneten Zone. ${regel.text}`, regel };
    if (regel.angrenzendM && zoneAbstandM <= regel.angrenzendM) return { status: "angrenzend", text: `Angrenzend an eine Zone (${Math.round(zoneAbstandM)} m). ${regel.text}`, regel };
    return { status: "ausserhalb", text: `Außerhalb der Zonen. ${regel.text}`, regel };
  }
  return { status: "unklar", text: regel.text, regel };
}

const SUED = ["S", "SO", "SW", "eben"];

/**
 * Punktwert einer Kandidatenfläche.
 * m = {
 *   ha, kompaktheit (0–1), neigungGrad, exposition (N|NO|O|SO|S|SW|W|NW|eben), nutzung: { acker, gruenland, sonstige } in ha,
 *   schutz: [{ art, anteil (0–1), abstandM }], siedlungAbstandM,
 *   netz: { knoten: { art, kapazitaet }, luftlinieM, trasseM, kosten: { anteil, … } } | null,
 *   widmung: { status, text, regel }, bundesland, land
 * }
 * Liefert { score, ampel, ko[], kriterien[{ id, label, punkte, max, text, art }], mwp }.
 */
export function bewerte(m) {
  const k = [];
  const ko = [];
  const add = (id, label, punkte, max, text, art = punkte >= max * 0.66 ? "plus" : punkte > 0 ? "neutral" : "minus") => k.push({ id, label, punkte: r1(punkte), max, text, art });
  const ha = Number(m.ha) || 0;
  const mwp = mwpFuer(ha);
  const land = GEWICHTE_LAND[m.land] ? m.land : "AT";
  const L = GEWICHTE_LAND[land];
  const sk = (id, p) => (L === GEWICHTE ? p : p * (L[id] / GEWICHTE[id])); // Grundpunkte → Landesgewicht

  // Größe
  let pg;
  if (ha < SCHWELLEN.mindestHa) pg = 0;
  else if (ha < 3) pg = 6;
  else if (ha < SCHWELLEN.idealHa[0]) pg = 6 + ((ha - 3) / 2) * 8;
  else if (ha <= SCHWELLEN.idealHa[1]) pg = 20;
  else pg = 16;
  if (ha < SCHWELLEN.mindestHa) ko.push({ id: "groesse", text: `Unter ${SCHWELLEN.mindestHa} ha – für Freiflächen-PV meist unwirtschaftlich.`, deckel: 25 });
  add("groesse", "Größe", sk("groesse", pg), L.groesse, `${r1(ha).toLocaleString("de-DE")} ha${ha > 50 ? " – sehr groß (UVP-Schwelle und Netzkapazität prüfen)" : ha >= 5 ? " – ideale Größe" : ""}`);

  // Form
  const kp = clamp(Number(m.kompaktheit) || 0);
  const pf = clamp((kp - 0.45) / 0.45) * GEWICHTE.form;
  add("form", "Form/Kompaktheit", sk("form", pf), L.form, kp >= 0.85 ? "kompakt, gut belegbar" : kp >= 0.65 ? "brauchbare Form" : "zerklüftet oder schmal – Belegung eingeschränkt");

  // Neigung/Exposition
  const n = Math.max(0, Number(m.neigungGrad) || 0);
  const exp = m.exposition || "eben";
  const sued = SUED.includes(exp) || n <= 2;
  let pn;
  if (n <= 3) pn = 12;
  else if (n <= 7) pn = sued ? 10 : 6;
  else if (n <= 12) pn = sued ? 6 : 1;
  else pn = sued ? 2 : 0;
  if (n > SCHWELLEN.maxNeigungGrad) ko.push({ id: "neigung", text: `Mittlere Neigung ${r1(n)}° – zu steil für wirtschaftliche Aufständerung.`, deckel: 20 });
  add("neigung", "Neigung/Exposition", sk("neigung", pn), L.neigung, `${r1(n).toLocaleString("de-DE")}° im Mittel, ${exp === "eben" ? "eben" : `Exposition ${exp}`}`);

  // Nutzung
  const nu = m.nutzung || {};
  const summe = (nu.acker || 0) + (nu.gruenland || 0) + (nu.sonstige || 0) || 1;
  const pn2 = ((nu.acker || 0) * 8 + (nu.gruenland || 0) * 7 + (nu.sonstige || 0) * 3) / summe;
  const hauptnutzung = (nu.acker || 0) >= (nu.gruenland || 0) ? "Acker" : "Grünland";
  const nutzungHinweis = { AT: "EAG-Abschlag 25 % auf Agrarflächen beachten", DE: "EEG: Agri-PV (DIN SPEC 91434) im besonderen Solarsegment auch außerhalb der Kulisse", CH: "Fruchtfolgeflächen nur mit Interessenabwägung" }[land];
  add("nutzung", "Nutzung", sk("nutzung", pn2), L.nutzung, `${hauptnutzung}${nu.acker && nu.gruenland ? " (gemischt)" : ""} – Agri-PV ${hauptnutzung === "Acker" ? "als Option" : "mit Beweidung möglich"}; ${nutzungHinweis}`);

  // Schutzgebiete
  for (const s of m.schutz || []) {
    const def = SCHUTZ_ARTEN[s.art] || SCHUTZ_ARTEN.sonstig;
    const anteil = clamp(Number(s.anteil) || 0);
    if (anteil > 0.05 && def.kern) {
      ko.push({ id: `schutz_${s.art}`, text: `${Math.round(anteil * 100)} % im ${def.label}${s.name ? ` „${s.name}“` : ""} – in der Regel ausgeschlossen.`, deckel: 15 });
      add(`schutz_${s.art}`, def.label, -10, 0, `überdeckt ${Math.round(anteil * 100)} %${s.name ? ` (${s.name})` : ""}`, "ko");
    } else if (anteil > 0.05) {
      add(`schutz_${s.art}`, def.label, -def.abzug * Math.min(1, anteil * 2), 0, `überdeckt ${Math.round(anteil * 100)} %${s.name ? ` (${s.name})` : ""} – Bewilligung erschwert`, "minus");
    } else if ((s.abstandM == null ? Infinity : Number(s.abstandM)) <= 200 && def.abzugNah) {
      add(`schutz_${s.art}`, `Nähe ${def.label}`, -def.abzugNah, 0, `${Math.round(s.abstandM)} m entfernt${s.name ? ` (${s.name})` : ""} – Verträglichkeitsprüfung wahrscheinlich`, "minus");
    }
  }

  // Siedlungsabstand
  const sa = m.siedlungAbstandM == null ? null : Number(m.siedlungAbstandM);
  const [sMin, sVoll] = SCHWELLEN.siedlungAbstandM;
  const ps = sa == null ? 4 : sa < sMin ? 0 : sa >= sVoll ? 8 : 4 + ((sa - sMin) / (sVoll - sMin)) * 4;
  add("siedlung", "Abstand Siedlung", sk("siedlung", ps), L.siedlung, sa == null ? "unbekannt" : `${Math.round(sa).toLocaleString("de-DE")} m zur nächsten Siedlung${sa < sMin ? " – Blendung/Akzeptanz kritisch" : ""}`);

  // Netz: Trassenlänge
  const netz = m.netz;
  if (netz) {
    const km = netz.trasseM / 1000;
    const pnetz = km <= 1 ? 22 : km <= 3 ? 22 - ((km - 1) / 2) * 4 : km <= 5 ? 18 - ((km - 3) / 2) * 5 : km <= 8 ? 13 - ((km - 5) / 3) * 6 : km <= 12 ? 7 - ((km - 8) / 4) * 4 : Math.max(0, 3 - (km - 12) / 4);
    const kn = netz.knoten || {};
    add("netz", "Netzanschluss (Trasse)", sk("netz", pnetz), L.netz, `${r1(km).toLocaleString("de-DE")} km geschätzte Trasse (Luftlinie ${r1(netz.luftlinieM / 1000).toLocaleString("de-DE")} km) zu ${kn.name || KNOTEN_ARTEN[kn.art]?.kurz || "Netzknoten"}`);
    if (kn.kapazitaet === "knapp") add("kapazitaet", "Netzkapazität", -8, 0, "Kapazität laut Netzbetreiber knapp – Ausbau/Wartezeit wahrscheinlich", "minus");
    else if (kn.kapazitaet === "frei") add("kapazitaet", "Netzkapazität", 3, 0, "freie Einspeisekapazität veröffentlicht", "plus");
    const anteil = netz.kosten?.anteil ?? 1;
    const pk = anteil < 0.08 ? 8 : anteil < 0.15 ? 8 - ((anteil - 0.08) / 0.07) * 3 : anteil < 0.25 ? 5 - ((anteil - 0.15) / 0.1) * 3 : Math.max(0, 2 - (anteil - 0.25) * 10);
    add("kosten", "Netzanschlusskosten", sk("kosten", pk), L.kosten, `≈ ${Math.round(anteil * 100)} % der Anlagenkosten (${Math.round((netz.kosten?.proKwp || 0))} €/kWp)`);
  } else {
    add("netz", "Netzanschluss (Trasse)", 0, L.netz, `kein geeigneter Netzknoten im Umkreis von ${TRASSE.suchradiusKm} km`, "minus");
    add("kosten", "Netzanschlusskosten", 0, L.kosten, "nicht bestimmbar", "minus");
  }

  // Widmung
  const w = m.widmung || { status: "unklar" };
  const pw = { zone: 10, angrenzend: 6, unklar: 4, ausserhalb: 2 }[w.status] ?? 4;
  const widmungText = {
    AT: { zone: "in Zone/Priorität 1", angrenzend: "angrenzend/Priorität 2", ausserhalb: "außerhalb der Zonen", unklar: "Einzelfallprüfung" },
    DE: { zone: "privilegiert (§ 35 BauGB, 200-m-Streifen)", angrenzend: "teilweise privilegiert", ausserhalb: "außerhalb", unklar: "Bebauungsplan der Gemeinde nötig" },
    CH: { zone: "im kantonalen Eignungsgebiet", angrenzend: "teilweise im Eignungsgebiet", ausserhalb: "ausserhalb", unklar: "Ausnahmebewilligung/Richtplan – Einzelfall" },
  }[land];
  add("widmung", land === "DE" ? "Planungsrecht (BauGB)" : land === "CH" ? "Raumplanung (Kanton)" : "Widmungslage", sk("widmung", pw), L.widmung, widmungText[w.status] || widmungText.unklar);
  const regel = w.regel || WIDMUNG[m.bundesland] || (land !== "AT" ? WIDMUNG[`_${land}`] : null);
  if (regel?.maxHaAusserhalb !== undefined && w.status !== "zone" && ha > regel.maxHaAusserhalb) {
    ko.push({ id: "widmung", text: regel.maxHaAusserhalb > 0 ? `Außerhalb der Zonen nur bis ${regel.maxHaAusserhalb} ha widmungsfähig.` : "Außerhalb der Eignungszonen nicht zulässig.", deckel: regel.maxHaAusserhalb > 0 ? 45 : 20 });
  }
  if (regel?.maxHa && ha > regel.maxHa) add("widmung_max", "Widmungsgrenze", -3, 0, `je Widmung höchstens ${regel.maxHa} ha – Teilfläche oder Ausnahme`, "minus");

  // Flächenkulisse (DE: EEG-Förderkulisse, CH: kantonale Eignung) – großer Pluspunkt, fehlt sie: kein EEG-Freiflächengebot
  const ku = m.kulisse || {};
  if (land === "DE") {
    const f = KULISSE.DE.faktor;
    const teile = [
      ["konversion", clamp(Number(ku.konversionAnteil) || 0), "Konversionsfläche"],
      ["randstreifen", clamp(Number(ku.randstreifenAnteil) || 0), "Randstreifen 500 m (Autobahn/Schiene)"],
      ["benachteiligt", clamp(Number(ku.benachteiligtAnteil) || 0), "benachteiligtes Gebiet"],
      ["moor", clamp(Number(ku.moorAnteil) || 0), "Moorboden (nur mit Wiedervernässung)"],
    ];
    let best = 0;
    for (const [id, a] of teile) best = Math.max(best, a * f[id]);
    const namen = teile.filter((t) => t[1] > 0).map((t) => `${t[2]} ${Math.round(t[1] * 100)} %`);
    add("kulisse", "EEG-Flächenkulisse", best * L.kulisse, L.kulisse, namen.length ? `${namen.join(" · ")} – förderfähig im Freiflächen-Segment (§ 37 EEG)` : "keine EEG-Flächenkulisse – nur Agri-PV (besonderes Solarsegment) oder Vermarktung ohne EEG (PPA)", best > 0 ? undefined : "minus");
  } else if (land === "CH") {
    const e = clamp(Number(ku.eignungAnteil) || 0);
    const vb = ku.vorbelastet ? 1 : 0;
    const best = Math.max(e * KULISSE.CH.faktor.eignung, vb * KULISSE.CH.faktor.vorbelastet);
    add("kulisse", "Eignung (Richtplan)", best * L.kulisse, L.kulisse, e > 0 ? `kantonales Eignungsgebiet ${Math.round(e * 100)} %` : vb ? "vorbelasteter Standort (Verkehrs-/Infrastrukturanlage)" : "kein Eignungsgebiet – Standortgebundenheit schwer nachweisbar", best > 0 ? undefined : "minus");
    const fff = clamp(Number(ku.fffAnteil) || 0);
    if (fff > 0.05) add("fff", "Fruchtfolgefläche", -KULISSE.CH.fffAbzug * fff, 0, `${Math.round(fff * 100)} % Fruchtfolgefläche (Sachplan FFF) – Kompensation bzw. Interessenabwägung nötig`, "minus");
  }

  // Einstrahlung
  const ertrag = ERTRAG[m.bundesland] || ERTRAG[`_${land}`] || ERTRAG._AT;
  const pe = clamp((ertrag - 1000) / 200) * GEWICHTE.einstrahlung;
  add("einstrahlung", "Einstrahlung", sk("einstrahlung", pe), L.einstrahlung, `≈ ${ertrag.toLocaleString("de-DE")} kWh/kWp und Jahr`);

  let score = k.reduce((s, x) => s + x.punkte, 0);
  score = Math.max(0, Math.min(100, score));
  for (const x of ko) score = Math.min(score, x.deckel);
  score = Math.round(score);
  const ampel = score >= SCHWELLEN.ampel.gruen ? "gruen" : score >= SCHWELLEN.ampel.gelb ? "gelb" : "rot";
  return { score, ampel, ko, kriterien: k, mwp, ertragKwhProKwp: ertrag };
}

/** Kennzahlen für den Steckbrief (Ertrag, Pacht, Netzkosten) */
export function kennzahlen(ha, { ertragKwhProKwp = ERTRAG._AT, agri = false } = {}) {
  const mwp = mwpFuer(ha);
  const p = agri ? PACHT.agriProHa : PACHT.freiflaecheProHa;
  return {
    mwp,
    ertragMwh: Math.round(mwp * ertragKwhProKwp),
    pachtJahr: { min: Math.round(ha * p.min), mittel: Math.round(ha * p.mittel), max: Math.round(ha * p.max) },
    pachtProHa: p,
    capex: { min: Math.round(mwp * 1000 * FREIFLAECHE.capexProKwp.min), max: Math.round(mwp * 1000 * FREIFLAECHE.capexProKwp.max) },
  };
}

/** Priorität A/B/C (wie Akquise-Pipeline) */
export function prioritaet(score, ha) {
  if (score >= 65 && (Number(ha) || 0) >= 5) return "A";
  if (score >= 45) return "B";
  return "C";
}
