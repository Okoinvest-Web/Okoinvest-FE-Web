// src/lib/rechner/flaechenpass.js – Flächenpass Stufe 1 (Welle 3, Paket B6)
//
// Reine Funktionen (Browser + Server, ohne React): Aus einer eingezeichneten Fläche (oder einer Größenangabe) und
// wenigen Antworten des Eigentümers entsteht ein „Flächenpass“: Größe in ha, mögliche Leistung, Ertrag und eine grobe
// Eignung aus der internen Scoring-Engine (src/lib/plattform/geodaten/scoring.js, unverändert). Was der Nutzer nicht
// weiß, wird NICHT erfunden: Es bleibt „offen“ und erscheint im Pass als „wird im Gespräch geprüft“.
//
// Geometrie: als kompakte Zeichenkette "lon,lat;lon,lat;…" (WGS84, 6 Nachkommastellen, 3–60 Punkte, ohne
// Wiederholung des ersten Punkts). So passt sie unverändert in den Vorgang (Lead-Daten erlauben nur flache Werte).
// Die Fläche verlässt den Browser erst mit dem Absenden des Bericht-Formulars.
//
// Keine Geldwerte: Der Flächenpass nennt in keinem Land Pacht oder Kosten (Länder-Sperre AT/CH; für DE verweist er
// auf den Pachtrechner). Die Netzkosten gehen nur als Punkte in die Eignung ein (Logik der Scoring-Engine).

import { META } from "../../data/regionen/meta.js";
import { bewerte, mwpFuer, netzkosten, prioritaet, SCHWELLEN, trasseM, WIDMUNG, widmungslage } from "../plattform/geodaten/scoring.js";
import { flaecheM2, kompaktheit, schwerpunkt } from "../plattform/geodaten/geo.js";

export const FLAECHENPASS_VERSION = "2026-10-09.1";

/** Grenzen der Eingabe */
export const GRENZEN = Object.freeze({ haMin: 0.1, haMax: 2000, punkteMin: 3, punkteMax: 60, dach: [4.1, 44.1, 17.9, 55.9] });

/**
 * Regionen des Flächenpasses (Bundesländer DE/AT, Schweiz gesamt) mit Kartenmitte [lat, lon] und Zoom
 * für den Kartenstart – Lage grob, nur zur Orientierung beim Einzeichnen.
 */
const ZENTRUM = {
  "schleswig-holstein": [54.2, 9.8, 8], bremen: [53.08, 8.8, 11], hamburg: [53.55, 10.0, 10], "mecklenburg-vorpommern": [53.7, 12.5, 8],
  "nordrhein-westfalen": [51.5, 7.6, 8], niedersachsen: [52.7, 9.3, 8], "sachsen-anhalt": [52.0, 11.7, 8], brandenburg: [52.4, 13.4, 8],
  berlin: [52.52, 13.4, 10], "rheinland-pfalz": [49.9, 7.4, 8], hessen: [50.6, 9.0, 8], thueringen: [50.9, 11.0, 8], sachsen: [51.0, 13.3, 8],
  saarland: [49.4, 6.95, 10], "baden-wuerttemberg": [48.6, 9.0, 8], bayern: [48.9, 11.4, 7],
  vorarlberg: [47.25, 9.9, 9], tirol: [47.2, 11.4, 8], salzburg: [47.4, 13.1, 8], oberoesterreich: [48.1, 14.0, 8], niederoesterreich: [48.25, 15.7, 8],
  wien: [48.21, 16.37, 11], kaernten: [46.75, 14.0, 8], steiermark: [47.25, 15.0, 8], burgenland: [47.5, 16.5, 8],
  schweiz: [46.8, 8.2, 8],
};

export const REGIONEN = Object.freeze(META.map((m) => Object.freeze({ slug: m.slug, name: m.name, land: m.land, zentrum: ZENTRUM[m.slug] || [50, 10, 6] })));
export const regionenFuer = (land) => REGIONEN.filter((r) => r.land === land);
export const regionFuerSlug = (slug) => REGIONEN.find((r) => r.slug === slug) || null;

/** Widmungsart je Region (Scoring-Engine): uw_radius | zonen | einzelfall | baugb | richtplan */
export function widmungsart(slug) {
  const r = regionFuerSlug(slug);
  if (!r) return null;
  return (WIDMUNG[r.name] || WIDMUNG[`_${r.land}`] || { art: "einzelfall" }).art;
}

/* ------------------------------------------------------------------ */
/* Antwortmöglichkeiten (ids; Texte in src/components/Flaeche/Flaechenpass/texte.js) */
/* ------------------------------------------------------------------ */

const U = "unbekannt";
export const OPTIONEN = Object.freeze({
  nutzung: ["acker", "gruenland", "konversion", "sonstige"],
  neigung: ["eben", "leicht", "deutlich", "steil"],
  exposition: ["sued", "ostwest", "nord"],
  schutz: ["nein", "landschaft", "wasser", "naturNah", "natur", U],
  siedlung: ["lt100", "100-300", "gt300", U],
  netz: ["lt1", "1-3", "3-5", "5-10", "gt10", U],
  // DE
  verkehr: ["bis200", "bis500", "weiter", U],
  benachteiligt: ["ja", "nein", U],
  // AT
  zone: ["ja", "angrenzend", "nein", U],
  uw: ["bis5", "bis7_5", "weiter", U],
  // CH
  eignung: ["ja", "nein", U],
  vorbelastet: ["ja", "nein", U],
  fff: ["ja", "nein", U],
});

/** Welche Zusatzfragen gelten für Land und Region? */
export function fragenFuer(land, slug) {
  if (land === "DE") return ["verkehr", "benachteiligt"];
  if (land === "CH") return ["eignung", "vorbelastet", "fff"];
  const art = widmungsart(slug);
  if (art === "zonen") return ["zone"];
  if (art === "uw_radius") return ["uw"];
  return [];
}

export const STANDARD = Object.freeze({ nutzung: "acker", neigung: "eben", exposition: "sued", schutz: U, siedlung: U, netz: U });

const NETZ_KM = { lt1: 0.7, "1-3": 2, "3-5": 4, "5-10": 7.5, gt10: 12 };
/** Vorsichtige Annahme, wenn die Netzentfernung unbekannt ist */
export const NETZ_ANNAHME_KM = 5;
const NEIGUNG_GRAD = { eben: 2, leicht: 5, deutlich: 10, steil: 18 };
const EXPOSITION = { sued: "S", ostwest: "O", nord: "N" };
const SIEDLUNG_M = { lt100: 60, "100-300": 200, gt300: 500 };
/** Kompaktheit, wenn keine Fläche eingezeichnet wurde („brauchbare Form“) */
export const KOMPAKTHEIT_ANNAHME = 0.75;

/* ------------------------------------------------------------------ */
/* Geometrie                                                           */
/* ------------------------------------------------------------------ */

const r6 = (x) => Math.round(x * 1e6) / 1e6;

/** Ring [[lon, lat], …] → "lon,lat;…" (ohne Schlusspunkt, 6 Nachkommastellen) */
export function flaecheText(ring) {
  if (!Array.isArray(ring)) return "";
  const pkt = ring.map((p) => [r6(Number(p[0])), r6(Number(p[1]))]);
  if (pkt.length > 1 && pkt[0][0] === pkt.at(-1)[0] && pkt[0][1] === pkt.at(-1)[1]) pkt.pop();
  return pkt.map((p) => `${p[0]},${p[1]}`).join(";");
}

function schneiden(a, b, c, d) {
  const k = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = k(c, d, a);
  const d2 = k(c, d, b);
  const d3 = k(a, b, c);
  const d4 = k(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Überschneidet sich der (geschlossene) Ring selbst? */
export function selbstueberschneidend(ring) {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (schneiden(a, b, ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}

/**
 * Zeichenkette prüfen und lesen. Liefert { ring, geometrie, text } oder { fehler } (Schlüssel für Meldungen):
 * format | punkte | ausserhalb | ueberschneidung | klein | gross
 */
export function flaecheLesen(text) {
  if (typeof text !== "string" || text.length > 2000) return { fehler: "format" };
  const teile = text.split(";").filter(Boolean);
  if (teile.length < GRENZEN.punkteMin || teile.length > GRENZEN.punkteMax) return { fehler: "punkte" };
  const ring = [];
  for (const t of teile) {
    const m = /^(-?\d{1,3}(?:\.\d{1,8})?),(-?\d{1,3}(?:\.\d{1,8})?)$/.exec(t.trim());
    if (!m) return { fehler: "format" };
    const p = [r6(Number(m[1])), r6(Number(m[2]))];
    const [w, s, o, n] = GRENZEN.dach;
    if (!(p[0] >= w && p[0] <= o && p[1] >= s && p[1] <= n)) return { fehler: "ausserhalb" };
    ring.push(p);
  }
  if (selbstueberschneidend(ring)) return { fehler: "ueberschneidung" };
  const geometrie = { type: "Polygon", coordinates: [[...ring, ring[0]]] };
  const ha = flaecheM2(geometrie) / 1e4;
  if (ha < GRENZEN.haMin) return { fehler: "klein" };
  if (ha > GRENZEN.haMax) return { fehler: "gross" };
  return { ring, geometrie, text: flaecheText(ring) };
}

/** Kennzahlen einer gelesenen Fläche: ha (2 Nachkommastellen), Kompaktheit 0–1, Schwerpunkt [lon, lat] */
export function flaecheKennzahlen(geometrie) {
  const m2 = flaecheM2(geometrie);
  return { ha: Math.round(m2 / 100) / 100, kompaktheit: kompaktheit([geometrie], m2), schwerpunkt: schwerpunkt(geometrie)?.map(r6) || null };
}

/* ------------------------------------------------------------------ */
/* Flächenpass                                                         */
/* ------------------------------------------------------------------ */

const wert = (liste, x, standard) => (OPTIONEN[liste].includes(x) ? x : standard);

/**
 * Normalisierte Eingaben: Region passt zum Land, unbekannte Felder fallen weg, ha aus der Fläche (falls gezeichnet).
 * e = { region, ha?, flaeche?, nutzung, neigung, exposition, schutz, siedlung, netz, verkehr?, benachteiligt?, zone?, uw?,
 *       eignung?, vorbelastet?, fff? }
 */
export function normalisieren(e = {}, land = "DE") {
  const regionen = regionenFuer(land);
  const region = regionen.find((r) => r.slug === e.region)?.slug || (regionen.length === 1 ? regionen[0].slug : null);
  const out = { region };
  let flaeche = null;
  if (e.flaeche) {
    const g = flaecheLesen(e.flaeche);
    if (!g.fehler) flaeche = g;
  }
  if (flaeche) {
    out.flaeche = flaeche.text;
    out.ha = flaecheKennzahlen(flaeche.geometrie).ha;
  } else {
    const ha = Number(e.ha);
    out.ha = Number.isFinite(ha) ? Math.min(GRENZEN.haMax, Math.max(GRENZEN.haMin, Math.round(ha * 100) / 100)) : 10;
  }
  for (const k of ["nutzung", "neigung", "exposition", "schutz", "siedlung", "netz"]) out[k] = wert(k, e[k], STANDARD[k]);
  for (const k of fragenFuer(land, region)) out[k] = wert(k, e[k], U);
  return out;
}

/**
 * Flächenpass rechnen. Liefert:
 * { land, region, ha, mwp, ertragKwhProKwp, ertragMwh, kompaktheit, kompaktheitAngenommen, gezeichnet, schwerpunkt,
 *   score, ampel, prioritaet, ko[{ id, deckel }], kriterien[{ id, punkte, max, art }], offen[], netzKm, netzAngenommen,
 *   widmung: { art, status }, kulisse, eingaben }
 * `ertragKwhProKwp` (optional): spezifischer Ertrag der Region aus den Regionsdaten (PVGIS); sonst der Wert der Scoring-Engine.
 */
export function flaechenpass(eingaben = {}, land = "DE", { ertragKwhProKwp = null } = {}) {
  const L = ["DE", "AT", "CH"].includes(land) ? land : "DE";
  const e = normalisieren(eingaben, L);
  const region = regionFuerSlug(e.region) || regionenFuer(L)[0];
  const offen = [];

  // Fläche
  let kp = KOMPAKTHEIT_ANNAHME;
  let gezeichnet = false;
  let sp = null;
  if (e.flaeche) {
    const g = flaecheLesen(e.flaeche);
    const k = flaecheKennzahlen(g.geometrie);
    kp = k.kompaktheit;
    sp = k.schwerpunkt;
    gezeichnet = true;
  }
  const ha = e.ha;
  const mwp = mwpFuer(ha);

  // Nutzung (Scoring: acker / gruenland / sonstige in ha)
  const nutzung = e.nutzung === "acker" ? { acker: ha } : e.nutzung === "gruenland" ? { gruenland: ha } : { sonstige: ha };

  // Schutzgebiete
  const schutz =
    e.schutz === "landschaft" ? [{ art: "landschaftsschutz", anteil: 1 }]
      : e.schutz === "wasser" ? [{ art: "wasserschutz", anteil: 1 }]
        : e.schutz === "natur" ? [{ art: "naturschutz", anteil: 1 }]
          : e.schutz === "naturNah" ? [{ art: "natura2000", anteil: 0, abstandM: 150 }]
            : [];
  if (e.schutz === U) offen.push("schutz");

  // Siedlung
  const siedlungAbstandM = SIEDLUNG_M[e.siedlung] ?? null;
  if (e.siedlung === U) offen.push("siedlung");

  // Netz: Entfernung des Nutzers oder vorsichtige Annahme (5 km), Kapazität immer unbekannt
  const netzAngenommen = e.netz === U;
  if (netzAngenommen) offen.push("netz");
  const netzKm = NETZ_KM[e.netz] ?? NETZ_ANNAHME_KM;
  const tr = trasseM(netzKm * 1000, 0);
  const kosten = netzkosten(mwp, tr / 1000, { land: L.toLowerCase() });
  const netz = { knoten: { art: kosten.ebene === "hs" ? "uw110" : "ms", kapazitaet: "unbekannt", name: null }, luftlinieM: netzKm * 1000, trasseM: tr, kosten };
  offen.push("kapazitaet");

  // Widmung / Planungsrecht und Flächenkulisse je Land
  const kulisse = {};
  const lage = { bundesland: region.name, land: L };
  if (L === "DE") {
    const v = e.verkehr;
    lage.privilegiertAnteil = v === "bis200" ? 1 : 0;
    kulisse.randstreifenAnteil = v === "bis200" || v === "bis500" ? 1 : 0;
    kulisse.benachteiligtAnteil = e.benachteiligt === "ja" ? 1 : 0;
    kulisse.konversionAnteil = e.nutzung === "konversion" ? 1 : 0;
    if (v === U) offen.push("verkehr");
    if (e.benachteiligt === U) offen.push("benachteiligt");
  } else if (L === "CH") {
    kulisse.eignungAnteil = e.eignung === "ja" ? 1 : 0;
    kulisse.vorbelastet = e.vorbelastet === "ja";
    kulisse.fffAnteil = e.fff === "ja" ? 1 : 0;
    lage.eignungAnteil = kulisse.eignungAnteil;
    for (const k of ["eignung", "vorbelastet", "fff"]) if (e[k] === U) offen.push(k);
  } else {
    const art = widmungsart(region.slug);
    if (art === "zonen") {
      lage.zoneAbstandM = { ja: 0, angrenzend: Math.max(1, (WIDMUNG[region.name]?.angrenzendM || 0) / 2), nein: 5000 }[e.zone] ?? null;
      if (e.zone === U) offen.push("zone");
    } else if (art === "uw_radius") {
      lage.uwAbstandKm = { bis5: 3, bis7_5: 6, weiter: 10 }[e.uw] ?? null;
      if (e.uw === U) offen.push("uw");
    } else offen.push("widmung");
  }
  const widmung = widmungslage(lage);

  const neigungGrad = NEIGUNG_GRAD[e.neigung];
  const b = bewerte({
    ha,
    kompaktheit: kp,
    neigungGrad,
    exposition: e.neigung === "eben" ? "eben" : EXPOSITION[e.exposition] || "eben",
    nutzung,
    schutz,
    siedlungAbstandM,
    netz,
    widmung,
    bundesland: region.name,
    land: L,
    kulisse,
  });
  const ertrag = Number(ertragKwhProKwp) > 0 ? Number(ertragKwhProKwp) : b.ertragKwhProKwp;
  return {
    version: FLAECHENPASS_VERSION,
    land: L,
    region: { slug: region.slug, name: region.name },
    ha,
    mwp,
    ertragKwhProKwp: ertrag,
    ertragMwh: Math.round(mwp * ertrag),
    kompaktheit: Math.round(kp * 100) / 100,
    kompaktheitAngenommen: !gezeichnet,
    gezeichnet,
    schwerpunkt: sp,
    score: b.score,
    ampel: b.ampel,
    prioritaet: prioritaet(b.score, ha),
    ko: b.ko.map((k) => ({ id: k.id, deckel: k.deckel })),
    kriterien: b.kriterien.map((k) => ({ id: k.id, punkte: k.punkte, max: k.max, art: k.art })),
    offen,
    netzKm,
    netzAngenommen,
    widmung: { art: widmungsart(region.slug), status: widmung.status },
    eingaben: e,
  };
}

/* ------------------------------------------------------------------ */
/* Checkliste (Restriktionen je Land)                                  */
/* ------------------------------------------------------------------ */

/**
 * Checkliste der Restriktionen. Quellen sind ausschließlich (a) die veröffentlichten, recherchierten Regionsdaten
 * (src/data/regionen/*.js – Rechtsrahmen mit Quelle, Ausschluss- und Restriktionskriterien) und (b) die Antworten
 * des Nutzers. Was nicht belegt oder nicht beantwortet ist, steht als „wird im Gespräch geprüft“.
 *
 * `regionDaten` = Regionsobjekt in der Sprache der Seite (regionFuerSprache) – wird vom Server übergeben.
 * Liefert { angaben: [{ id, stufe: gut|pruefen|kritisch|offen }], recht: [{ titel, quelle }], restriktionen: [text] }.
 */
export function checkliste(pass, regionDaten = null) {
  const e = pass.eingaben;
  const angaben = [];
  const stufe = (feld, map) => (e[feld] === U ? "offen" : map[e[feld]] || "offen");
  if (pass.land === "DE") {
    const inKulisse = e.verkehr === "bis200" || e.verkehr === "bis500" || e.benachteiligt === "ja" || e.nutzung === "konversion";
    const keine = e.verkehr === "weiter" && e.benachteiligt === "nein" && e.nutzung !== "konversion";
    angaben.push({ id: "kulisseDE", stufe: inKulisse ? "gut" : keine ? "pruefen" : "offen" });
    angaben.push({ id: "privilegiert", stufe: stufe("verkehr", { bis200: "gut", bis500: "pruefen", weiter: "pruefen" }) });
  } else if (pass.land === "AT") {
    const art = pass.widmung.art;
    if (art === "zonen") angaben.push({ id: "zoneAT", stufe: stufe("zone", { ja: "gut", angrenzend: "pruefen", nein: "kritisch" }) });
    else if (art === "uw_radius") angaben.push({ id: "uwAT", stufe: stufe("uw", { bis5: "gut", bis7_5: "pruefen", weiter: "kritisch" }) });
    else angaben.push({ id: "einzelfallAT", stufe: "offen" });
  } else {
    angaben.push({ id: "standortCH", stufe: e.eignung === "ja" || e.vorbelastet === "ja" ? "gut" : e.eignung === "nein" && e.vorbelastet === "nein" ? "pruefen" : "offen" });
    angaben.push({ id: "fffCH", stufe: stufe("fff", { ja: "kritisch", nein: "gut" }) });
    angaben.push({ id: "parzelleCH", stufe: "offen" });
  }
  angaben.push({ id: "schutz", stufe: stufe("schutz", { nein: "gut", landschaft: "pruefen", wasser: "kritisch", naturNah: "pruefen", natur: "kritisch" }) });
  angaben.push({ id: "siedlung", stufe: stufe("siedlung", { lt100: "kritisch", "100-300": "pruefen", gt300: "gut" }) });
  angaben.push({ id: "netz", stufe: pass.netzAngenommen ? "offen" : pass.netzKm <= 3 ? "gut" : "pruefen" });
  angaben.push({ id: "kapazitaet", stufe: "offen" });
  if (pass.ha < SCHWELLEN.mindestHa) angaben.push({ id: "klein", stufe: "kritisch" });

  const recht = (regionDaten?.recht || [])
    .filter((x) => x?.titel && x?.quelle?.url)
    .slice(0, 8)
    .map((x) => ({ titel: x.titel, quelle: { titel: x.quelle.titel, url: x.quelle.url } }));
  const restriktionen = (regionDaten?.kulisse?.schwierig || []).filter((x) => typeof x === "string").slice(0, 8);
  return { angaben, recht, restriktionen };
}

/** Kurzfassung für den Vorgang (keine Personendaten): Größe, Lage, Eignung */
export function vorgangKurz(pass) {
  return {
    ha: pass.ha,
    mwp: pass.mwp,
    region: pass.region.slug,
    score: pass.score,
    ampel: pass.ampel,
    prioritaet: pass.prioritaet,
    gezeichnet: pass.gezeichnet,
    schwerpunkt: pass.schwerpunkt ? pass.schwerpunkt.join(",") : null,
  };
}
