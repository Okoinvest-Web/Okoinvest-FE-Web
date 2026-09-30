// src/lib/plattform/flaecheFach.js
//
// Fachliche Angaben zu Flächen (Fachprüfung Team A: Flächeneigentümer, Landwirt, Dach):
//  - Flurstücke je Land (DE Gemarkung/Flur/Zähler-Nenner/Grundbuch, AT KG-Nr./Grundstücksnummer/EZ,
//    CH Gemeinde/Parzelle/EGRID) mit Formatprüfung und Summenflächen-Plausibilisierung
//  - strukturierte Angaben `fach` (Boden, Bewirtschaftung, Förderbindungen, Schutzgebiete, Lage,
//    Eigentum/Belastungen, Agri-PV nach DIN SPEC 91434, Dach)
//  - Pflichtangaben beim Einreichen je Nutzung (`fachPflichtFehlt`, Teil der Bedingung flaecheVollstaendig)
//  - Prüfhinweise mit Ampel (`fachPruefung`) für Portal und Backoffice
//  - erweitertes Pachtangebot (`pachtangebotBereinigen`) und Angebotsbogen mit Ampel (`angebotsbogen`)
//
// Reine Funktionen, client- und serverseitig nutzbar (keine Node-Importe). Frappe: plattform/flaeche_fach.py
// (gleiche Regeln). Fachliche Einordnung ist Orientierung, keine Rechts- oder Steuerberatung.

import { ungueltig } from "./fehler";
import * as v from "./validierung";
import { AGRI, FREIFLAECHE, PACHT } from "../invest/markt";
import { OPTIONEN, STANDARD, STANDARDFRAGEN, pruefePachtangebot } from "../rechner/pachtangebot";

/* ------------------------------------------------------------------ */
/* Stammlisten                                                         */
/* ------------------------------------------------------------------ */

export const JNU = { ja: "Ja", nein: "Nein", unbekannt: "Weiß ich nicht" };
const JNU_IDS = Object.keys(JNU);

/** Eigentumsformen (Feld `eigentum` der Fläche) – Reihenfolge = Anzeige */
export const EIGENTUM_FORMEN = {
  eigentum: "Alleineigentum",
  miteigentum: "Miteigentum (Bruchteile, z. B. Ehepartner)",
  erbengemeinschaft: "Erbengemeinschaft",
  gesellschaft: "Gesellschaft (GbR, KG, GmbH …)",
  verwaltung: "Verwaltung / Vertretung für Eigentümer",
};
export const EIGENTUM_IDS = Object.keys(EIGENTUM_FORMEN);

/** Nutzungsarten in fachlicher Reihenfolge (Werte wie FLAECHE_NUTZUNG in konstanten.js) */
export const NUTZUNG_REIHENFOLGE = ["acker", "gruenland", "dauerkultur", "brache", "konversion", "deponie", "gewerbe", "dach", "sonstige"];

export const VERTRETUNG = {
  selbst: "Ich bin allein verfügungsberechtigt",
  alle: "Alle Eigentümer unterschreiben gemeinsam",
  vollmacht: "Vollmacht der übrigen Eigentümer liegt vor",
  gesetzlich: "Gesetzliche Vertretung / Betreuung",
  organ: "Geschäftsführung / vertretungsberechtigte Gesellschafter",
  verwalter: "Verwalter / Testamentsvollstrecker",
};

export const BEWIRTSCHAFTUNG = { selbst: "Selbst bewirtschaftet", verpachtet: "An Dritte verpachtet", keine: "Nicht bewirtschaftet" };

/** Belastungen im Grundbuch (DE Abt. II/III, AT C-Blatt, CH Dienstbarkeiten/Grundpfandrechte) */
export const BELASTUNGEN = {
  leitungsrecht: "Leitungsrecht (Strom, Gas, Wasser, Telekommunikation)",
  wegerecht: "Wege- oder Überfahrtsrecht",
  dienstbarkeit: "Sonstige Dienstbarkeit",
  niessbrauch: "Nießbrauch / Fruchtgenuss",
  altenteil: "Altenteil / Reallast / Ausgedinge",
  vorkaufsrecht: "Vorkaufsrecht",
  vormerkung: "Auflassungsvormerkung (Verkauf eingeleitet)",
  grundschuld: "Grundschuld / Hypothek / Pfandrecht",
  flurbereinigung: "Flurbereinigung bzw. Zusammenlegung anhängig",
};
export const BELASTUNG_IDS = Object.keys(BELASTUNGEN);

/** Überschrift der Grundbuchlasten je Land */
export const LASTEN_LABEL = {
  DE: "Belastungen im Grundbuch (Abteilung II und III)",
  AT: "Belastungen im Grundbuch (C-Blatt, Dienstbarkeiten)",
  CH: "Dienstbarkeiten, Grundlasten und Grundpfandrechte",
};

export const WSG = { nein: "Nein", zone3: "Zone III", zone2: "Zone II", zone1: "Zone I (Fassungsbereich)", unbekannt: "Weiß ich nicht" };
export const EXPOSITION = { eben: "Eben", s: "Süd", so: "Südost", sw: "Südwest", o: "Ost", w: "West", no: "Nordost", nw: "Nordwest", n: "Nord" };
export const ZUFAHRT = { oeffentlich: "Öffentlicher Weg grenzt an", privatweg: "Nur über Privat-/Nachbarflächen", keine: "Keine gesicherte Zufahrt", unbekannt: "Weiß ich nicht" };

export const AGRI_KATEGORIE = {
  "1": "Kategorie I – hoch aufgeständert, Bewirtschaftung unter den Modulen",
  "2": "Kategorie II – bodennah, Bewirtschaftung zwischen den Modulreihen",
  offen: "Noch offen – bitte beraten",
};
export const AGRI_SYSTEM = { hoch: "Hoch aufgeständert (Überdachung)", vertikal: "Vertikal, bifazial (Zaunsystem)", nachgefuehrt: "Nachgeführt (Tracker)", offen: "Noch offen" };
export const AGRI_KULTUREN = {
  getreide: "Getreide",
  mais: "Mais",
  raps: "Raps",
  hackfruechte: "Kartoffeln / Rüben",
  gemuese: "Feldgemüse",
  gruenland: "Grünland (Mahd, Futterbau)",
  weide: "Weide (Rinder, Schafe, Geflügel)",
  obst: "Obst",
  beeren: "Beeren",
  wein: "Wein",
  hopfen: "Hopfen",
  sonstige: "Sonstige Kultur",
};
const SONDERKULTUREN = ["obst", "beeren", "wein", "hopfen", "gemuese"];
export const REFERENZ_EINHEIT = { dt: "dt/ha", ttm: "t TM/ha", eur: "€/ha Marktleistung" };
export const REFERENZ_QUELLE = { eigen: "Eigene Aufzeichnungen (Ø 3–5 Jahre)", statistik: "Regionale Statistik / Buchführung", gutachten: "Gutachten / Beratung" };
export const NACHWEIS_66 = { vorhanden: "Konzept liegt vor", geplant: "Wird mit ÖkoInvest erstellt", offen: "Noch offen" };

export const DACHARTEN = {
  trapez: "Trapezblech",
  sandwich: "Sandwichpaneel",
  flach_folie: "Flachdach, Folie",
  flach_bitumen: "Flachdach, Bitumen",
  ziegel: "Ziegel / Betondachstein",
  faserzement: "Faserzement (Wellplatten)",
  sonstige: "Sonstige",
};
/** Grobe technische Lebensdauer der Eindeckung in Jahren (Orientierung, stark wartungsabhängig) */
const DACH_LEBENSDAUER = { trapez: 45, sandwich: 40, flach_folie: 30, flach_bitumen: 30, ziegel: 60, faserzement: 40, sonstige: 35 };
/** PV-Nutzungsdauer, die das Dach mindestens noch tragen sollte (Betrieb + Puffer) */
export const DACH_RESTNUTZUNG_MIN = 25;
/** Zusatzlast der PV in kN/m² (entspricht ca. 12–15 kg/m² aufgeständert bzw. 15–25 kg/m² mit Ballast, vgl. markt.js) */
export const DACH_LAST_KN = { aufdach: 0.15, flach: 0.25 };
export const STATIK = { reserve: "Statik-Reserve bekannt", nachweis: "Statik vorhanden, Reserve unbekannt", unbekannt: "Weiß ich nicht" };
export const DACH_NETZ = { mittelspannung: "Eigene Trafostation (Mittelspannung)", niederspannung: "Niederspannungs-Hausanschluss", unbekannt: "Weiß ich nicht" };
export const DACH_NUTZER = { eigen: "Selbst genutzt", vermietet: "Vollständig vermietet", teilweise: "Teilweise vermietet" };

/* ------------------------------------------------------------------ */
/* Flurstücke je Land                                                  */
/* ------------------------------------------------------------------ */

/**
 * Feldbeschriftungen und Formate je Land. Einheitliche Speicherfelder:
 *  gemarkung    DE Gemarkung · AT Katastralgemeinde (Name) · CH Gemeinde
 *  gemarkungNr  DE Gemarkungsschlüssel · AT KG-Nummer · CH BFS-Gemeindenummer
 *  flur         DE Flur (in Bayern gibt es keine Fluren)
 *  nummer       DE Flurstück Zähler[/Nenner] · AT Grundstücksnummer · CH Parzellennummer
 *  grundbuch    DE Grundbuchbezirk · CH Grundbuchkreis
 *  blatt        DE Grundbuchblatt · AT Einlagezahl (EZ)
 *  egrid        CH E-GRID
 *  m2           Fläche laut Kataster in m²
 */
export const FLURSTUECK_FELDER = {
  DE: {
    gemarkung: { label: "Gemarkung", platzhalter: "z. B. Musterfeld" },
    gemarkungNr: { label: "Gemarkungsnr.", platzhalter: "optional", muster: /^\d{4,6}$/, fehler: "Gemarkungsschlüssel: 4–6 Ziffern" },
    flur: { label: "Flur", platzhalter: "z. B. 3", muster: /^\d{1,3}$/, fehler: "Flur: 1–3 Ziffern (in Bayern leer lassen)" },
    nummer: { label: "Flurstück", platzhalter: "Zähler/Nenner, z. B. 211/3", muster: /^\d{1,5}(\/\d{1,4})?$/, fehler: "Flurstück: Zähler oder Zähler/Nenner, z. B. 211 oder 211/3", pflicht: true },
    grundbuch: { label: "Grundbuch von", platzhalter: "Grundbuchbezirk" },
    blatt: { label: "Blatt", platzhalter: "Nr.", muster: /^\d{1,6}[A-Za-z]?$/, fehler: "Grundbuchblatt: bis 6 Ziffern" },
    m2: { label: "Fläche lt. Kataster (m²)" },
  },
  AT: {
    gemarkung: { label: "Katastralgemeinde", platzhalter: "Name der KG" },
    gemarkungNr: { label: "KG-Nr.", platzhalter: "5 Ziffern", muster: /^\d{5}$/, fehler: "KG-Nummer: genau 5 Ziffern (siehe Grundbuchsauszug)", pflicht: true },
    nummer: { label: "Grundstücksnr.", platzhalter: "z. B. 1234/5 oder .12", muster: /^\.?\d{1,5}(\/\d{1,4})?$/, fehler: "Grundstücksnummer: z. B. 1234, 1234/5 oder .12 (Baufläche)", pflicht: true },
    blatt: { label: "EZ", platzhalter: "Einlagezahl", muster: /^\d{1,5}$/, fehler: "Einlagezahl (EZ): bis 5 Ziffern" },
    m2: { label: "Fläche lt. Kataster (m²)" },
  },
  CH: {
    gemarkung: { label: "Gemeinde", platzhalter: "Politische Gemeinde" },
    gemarkungNr: { label: "BFS-Nr.", platzhalter: "optional", muster: /^\d{1,4}$/, fehler: "BFS-Gemeindenummer: 1–4 Ziffern" },
    nummer: { label: "Parzelle", platzhalter: "Parzellennummer", muster: /^[0-9A-Za-z]{1,8}([-./][0-9A-Za-z]{1,6})?$/, fehler: "Parzellennummer: z. B. 1234 oder 1234-1", pflicht: true },
    grundbuch: { label: "Grundbuchkreis", platzhalter: "optional" },
    egrid: { label: "E-GRID", platzhalter: "CH…", muster: /^CH[0-9A-Z]{12}$/, fehler: "E-GRID: „CH“ und 12 Zeichen, z. B. CH123456789012" },
    m2: { label: "Fläche lt. Kataster (m²)" },
  },
};
const FS_SCHLUESSEL = ["gemarkung", "gemarkungNr", "flur", "nummer", "grundbuch", "blatt", "egrid", "m2"];

/** Quadratmeter mit deutschen Tausenderpunkten („12.345“) oder Dezimalkomma */
export function m2Zahl(w) {
  if (w === undefined || w === null || w === "") return null;
  let s = String(w).replace(/\s|m²|m2/gi, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "");
  const n = v.zahl(s, { min: 1, max: 100000000, stellen: 0 });
  return n;
}

/** Ein Flurstück bereinigen (ohne Fehlerprüfung) */
function flurstueckRoh(x, land) {
  const def = FLURSTUECK_FELDER[land] || FLURSTUECK_FELDER.DE;
  const fs = {};
  for (const k of FS_SCHLUESSEL) {
    if (!def[k]) continue;
    if (k === "m2") {
      fs.m2 = m2Zahl(x?.m2);
      continue;
    }
    let w = v.text(x?.[k], k === "gemarkung" || k === "grundbuch" ? 80 : 30);
    if (k === "egrid") w = w.replace(/\s/g, "").toUpperCase();
    if (k === "nummer" || k === "gemarkungNr" || k === "blatt" || k === "flur") w = w.replace(/\s/g, "");
    fs[k] = w;
  }
  return fs;
}

const fsLeer = (fs) => !FS_SCHLUESSEL.some((k) => (k === "m2" ? fs.m2 : fs[k]));

/** Formatfehler eines bereinigten Flurstücks: [{feld, text}] */
export function flurstueckFehler(fs, land) {
  const def = FLURSTUECK_FELDER[land] || FLURSTUECK_FELDER.DE;
  const fehler = [];
  for (const [k, d] of Object.entries(def)) {
    const w = fs[k];
    if (k === "m2") {
      continue;
    }
    if (!w) {
      if (d.pflicht) fehler.push({ feld: k, text: `${d.label} fehlt` });
      continue;
    }
    if (d.muster && !d.muster.test(w)) fehler.push({ feld: k, text: d.fehler });
  }
  if (land === "DE" && !fs.gemarkung && !fs.gemarkungNr) fehler.push({ feld: "gemarkung", text: "Gemarkung (Name oder Nummer) fehlt" });
  if (land === "CH" && !fs.gemarkung && !fs.gemarkungNr && !fs.egrid) fehler.push({ feld: "gemarkung", text: "Gemeinde fehlt" });
  return fehler;
}

/**
 * Flurstücke bereinigen und prüfen. Leere Zeilen fallen weg.
 * Liefert { flurstuecke, fehler: [{index, feld, text}] } – der Server wirft bei Fehlern 422.
 */
export function flurstueckePruefen(liste, land = "DE") {
  const flurstuecke = [];
  const fehler = [];
  if (!Array.isArray(liste)) return { flurstuecke, fehler };
  liste.slice(0, 50).forEach((x) => {
    const fs = flurstueckRoh(x || {}, land);
    if (fsLeer(fs)) return;
    const i = flurstuecke.length;
    for (const f of flurstueckFehler(fs, land)) fehler.push({ index: i, ...f });
    flurstuecke.push(fs);
  });
  return { flurstuecke, fehler };
}

/** Anzeigetext eines Flurstücks je Land */
export function flurstueckText(fs, land = "DE") {
  if (!fs) return "";
  if (land === "AT") return [fs.gemarkung && `KG ${fs.gemarkung}`, fs.gemarkungNr && `(${fs.gemarkungNr})`, fs.nummer && `Gst.-Nr. ${fs.nummer}`, fs.blatt && `EZ ${fs.blatt}`].filter(Boolean).join(" ");
  if (land === "CH") return [fs.gemarkung, fs.nummer && `Parzelle ${fs.nummer}`, fs.egrid && `E-GRID ${fs.egrid}`].filter(Boolean).join(" · ");
  return [fs.gemarkung, fs.flur && `Flur ${fs.flur}`, fs.nummer && `Flst. ${fs.nummer}`, fs.blatt && `(${fs.grundbuch ? `${fs.grundbuch} ` : ""}Bl. ${fs.blatt})`].filter(Boolean).join(" ");
}

/**
 * Summenfläche der Flurstücke gegen die angegebene Größe plausibilisieren.
 * Liefert { summeHa, vollstaendig, abweichung, stufe: ok|hinweis|warnung|fehler|null, text }
 */
export function summenPruefung(flurstuecke = [], ha) {
  const mit = flurstuecke.filter((f) => Number(f?.m2) > 0);
  if (!mit.length) return { summeHa: null, vollstaendig: false, abweichung: null, stufe: null, text: "" };
  const summeHa = Math.round((mit.reduce((s, f) => s + Number(f.m2), 0) / 10000) * 10000) / 10000;
  const vollstaendig = mit.length === flurstuecke.length;
  const angabe = Number(ha) > 0 ? Number(ha) : null;
  const fmtHa = (x) => `${x.toLocaleString("de-DE", { maximumFractionDigits: 2 })} ha`;
  if (!vollstaendig) {
    return { summeHa, vollstaendig, abweichung: null, stufe: "hinweis", text: `Nur für ${mit.length} von ${flurstuecke.length} Flurstücken ist die Katasterfläche angegeben (${fmtHa(summeHa)}). Für die Plausibilisierung bitte bei allen ergänzen.` };
  }
  if (!angabe) return { summeHa, vollstaendig, abweichung: null, stufe: "hinweis", text: `Summe laut Kataster: ${fmtHa(summeHa)}.` };
  const abweichung = (angabe - summeHa) / summeHa;
  if (abweichung > 0.1) {
    return { summeHa, vollstaendig, abweichung, stufe: "fehler", text: `Die angegebene Größe (${fmtHa(angabe)}) übersteigt die Summe der Flurstücke laut Kataster (${fmtHa(summeHa)}) um mehr als 10 %. Bitte Größe oder Flurstücke korrigieren.` };
  }
  if (abweichung > 0.02) {
    return { summeHa, vollstaendig, abweichung, stufe: "warnung", text: `Die angegebene Größe liegt etwas über der Katasterfläche (${fmtHa(summeHa)}). Bitte prüfen – maßgeblich ist das Kataster.` };
  }
  if (abweichung < -0.1) {
    return { summeHa, vollstaendig, abweichung, stufe: "hinweis", text: `Sie bieten offenbar eine Teilfläche an (${fmtHa(angabe)} von ${fmtHa(summeHa)}). Bitte die Teilfläche im Lageplan markieren – sie wird später vermessen.` };
  }
  return { summeHa, vollstaendig, abweichung, stufe: "ok", text: `Größe passt zur Katasterfläche (${fmtHa(summeHa)}).` };
}

/* ------------------------------------------------------------------ */
/* Gemeindeschlüssel (für Kommunen-Sicht und Behördenabfragen)         */
/* ------------------------------------------------------------------ */

export const GEMEINDE_SCHLUESSEL = {
  DE: { label: "Amtlicher Gemeindeschlüssel (AGS)", muster: /^\d{8}$/, fehler: "AGS: genau 8 Ziffern, z. B. 09778123" },
  AT: { label: "Gemeindekennziffer", muster: /^\d{5}$/, fehler: "Gemeindekennziffer: genau 5 Ziffern" },
  CH: { label: "BFS-Gemeindenummer", muster: /^\d{1,4}$/, fehler: "BFS-Gemeindenummer: 1–4 Ziffern" },
};

export function gemeindeSchluessel(w, land = "DE") {
  const s = v.text(w, 12).replace(/\s/g, "");
  if (!s) return "";
  const d = GEMEINDE_SCHLUESSEL[land] || GEMEINDE_SCHLUESSEL.DE;
  if (!d.muster.test(s)) throw ungueltig(d.fehler);
  return s;
}

/* ------------------------------------------------------------------ */
/* Fachangaben bereinigen                                              */
/* ------------------------------------------------------------------ */

/** Zahl mit deutscher Schreibweise: Tausenderpunkte („2.600“, „4.700“) und Dezimalkomma („2,8“) */
export function zahlDe(w, opts) {
  if (typeof w === "string" && /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(w.trim())) w = w.trim().replace(/\./g, "");
  return v.zahl(w, opts);
}
const jnu = (w) => v.auswahl(w, JNU_IDS, "");
const jahr = (w) => zahlDe(w, { min: 1850, max: 2100, stellen: 0 });

/**
 * Positivliste der Fachangaben. Unbekannte Felder fallen weg, Formate werden geprüft (422).
 * `basis` = bisheriger Stand (Teil-Updates: fehlende Bereiche bleiben erhalten).
 */
export function fachBereinigen(roh, basis = {}, land = "DE") {
  const alt = basis && typeof basis === "object" ? basis : {};
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return alt;
  const bereich = (k, fn) => (roh[k] && typeof roh[k] === "object" && !Array.isArray(roh[k]) ? fn(roh[k]) : alt[k] || {});

  const out = {
    boden: bereich("boden", (b) => ({
      ackerzahl: zahlDe(b.ackerzahl, { min: 1, max: 120, stellen: 0 }),
      gruenlandzahl: zahlDe(b.gruenlandzahl, { min: 1, max: 100, stellen: 0 }),
      bodenklimazahl: zahlDe(b.bodenklimazahl, { min: 1, max: 100, stellen: 0 }),
      ertragsmesszahl: zahlDe(b.ertragsmesszahl, { min: 1, max: 100000000, stellen: 0 }),
      quelle: v.text(b.quelle, 120),
    })),
    bewirtschaftung: bereich("bewirtschaftung", (b) => ({
      art: v.auswahl(b.art, BEWIRTSCHAFTUNG, ""),
      paechter: v.text(b.paechter, 120),
      pachtEnde: v.monat(b.pachtEnde),
      kuendigungMonate: zahlDe(b.kuendigungMonate, { min: 0, max: 120, stellen: 0 }),
    })),
    foerderung: bereich("foerderung", (b) => ({
      gap: jnu(b.gap),
      aukm: jnu(b.aukm),
      aukmArt: v.text(b.aukmArt, 160),
      aukmEnde: zahlDe(b.aukmEnde, { min: 2000, max: 2100, stellen: 0 }),
    })),
    schutz: bereich("schutz", (b) => ({
      natura2000: jnu(b.natura2000),
      nsg: jnu(b.nsg),
      lsg: jnu(b.lsg),
      wsg: v.auswahl(b.wsg, WSG, ""),
      ueberschwemmung: jnu(b.ueberschwemmung),
      denkmal: jnu(b.denkmal),
      biotop: jnu(b.biotop),
    })),
    lage: bereich("lage", (b) => ({
      gemeindeSchluessel: gemeindeSchluessel(b.gemeindeSchluessel, land),
      hangneigung: zahlDe(b.hangneigung, { min: 0, max: 100, stellen: 1 }),
      exposition: v.auswahl(b.exposition, EXPOSITION, ""),
      zufahrt: v.auswahl(b.zufahrt, ZUFAHRT, ""),
      waldAngrenzend: jnu(b.waldAngrenzend),
      leitungen: jnu(b.leitungen),
      leitungenText: v.text(b.leitungenText, 200),
      netzKm: zahlDe(b.netzKm, { min: 0, max: 200, stellen: 1 }),
    })),
    eigentum: bereich("eigentum", (b) => ({
      anzahl: zahlDe(b.anzahl, { min: 1, max: 500, stellen: 0 }),
      vertretung: v.auswahl(b.vertretung, VERTRETUNG, ""),
      belastungen: v.mehrfach(b.belastungen, BELASTUNG_IDS),
      lastenBekannt: jnu(b.lastenBekannt),
      glaeubiger: v.text(b.glaeubiger, 120),
      hinweise: v.mehrzeilig(b.hinweise, 1000),
    })),
    agri: bereich("agri", (b) => ({
      kategorie: v.auswahl(b.kategorie, AGRI_KATEGORIE, ""),
      system: v.auswahl(b.system, AGRI_SYSTEM, ""),
      kultur: v.auswahl(b.kultur, AGRI_KULTUREN, ""),
      kulturText: v.text(b.kulturText, 120),
      arbeitsbreiteM: zahlDe(b.arbeitsbreiteM, { min: 0.5, max: 60, stellen: 1 }),
      durchfahrtshoeheM: zahlDe(b.durchfahrtshoeheM, { min: 0.5, max: 10, stellen: 2 }),
      gassenbreiteM: zahlDe(b.gassenbreiteM, { min: 1, max: 60, stellen: 1 }),
      referenzertrag: zahlDe(b.referenzertrag, { min: 0, max: 100000, stellen: 1 }),
      referenzEinheit: v.auswahl(b.referenzEinheit, REFERENZ_EINHEIT, ""),
      referenzQuelle: v.auswahl(b.referenzQuelle, REFERENZ_QUELLE, ""),
      nachweis66: v.auswahl(b.nachweis66, NACHWEIS_66, ""),
      gapWeiter: jnu(b.gapWeiter),
      hofbezug: jnu(b.hofbezug),
      hofEntfernungM: zahlDe(b.hofEntfernungM, { min: 0, max: 100000, stellen: 0 }),
    })),
    dach: bereich("dach", (b) => ({
      dachart: v.auswahl(b.dachart, DACHARTEN, ""),
      baujahrGebaeude: jahr(b.baujahrGebaeude),
      baujahrDach: jahr(b.baujahrDach),
      sanierungGeplant: jnu(b.sanierungGeplant),
      dachflaecheM2: m2Zahl(b.dachflaecheM2),
      neigungGrad: zahlDe(b.neigungGrad, { min: 0, max: 90, stellen: 0 }),
      statik: v.auswahl(b.statik, STATIK, ""),
      statikReserveKn: zahlDe(b.statikReserveKn, { min: 0, max: 10, stellen: 2 }),
      brandwaende: jnu(b.brandwaende),
      asbest: jnu(b.asbest),
      blitzschutz: jnu(b.blitzschutz),
      netz: v.auswahl(b.netz, DACH_NETZ, ""),
      trafoKva: zahlDe(b.trafoKva, { min: 0, max: 100000, stellen: 0 }),
      nutzer: v.auswahl(b.nutzer, DACH_NUTZER, ""),
      mieter: v.text(b.mieter, 120),
      dachstrom: jnu(b.dachstrom),
      denkmal: jnu(b.denkmal),
    })),
  };
  // Leere Bereiche nicht speichern (kompakte Daten, klare Änderungsprotokolle)
  for (const [k, w] of Object.entries(out)) {
    if (!Object.values(w || {}).some((x) => (Array.isArray(x) ? x.length : x !== null && x !== "" && x !== undefined))) delete out[k];
  }
  return out;
}

/**
 * Fläche bereinigen: Flurstücke (je Land geprüft) + Fachangaben. Wirft 422 bei Formatfehlern.
 * Liefert { flurstuecke, fach } (nur Felder, die in `daten` vorkommen bzw. aus `basis`).
 */
export function flaecheFachDaten(daten, basis = {}, land = "DE") {
  let flurstuecke = basis.flurstuecke || [];
  if (Array.isArray(daten?.flurstuecke)) {
    const p = flurstueckePruefen(daten.flurstuecke, land);
    if (p.fehler.length) {
      const f = p.fehler[0];
      throw ungueltig(`Flurstück ${f.index + 1}: ${f.text}${p.fehler.length > 1 ? ` (und ${p.fehler.length - 1} weitere Angabe${p.fehler.length > 2 ? "n" : ""})` : ""}.`);
    }
    flurstuecke = p.flurstuecke;
  }
  const fach = daten?.fach !== undefined ? fachBereinigen(daten.fach, basis.fach, land) : basis.fach || {};
  return { flurstuecke, fach };
}

/* ------------------------------------------------------------------ */
/* Pflichtangaben beim Einreichen (Teil von flaecheVollstaendig)        */
/* ------------------------------------------------------------------ */

/** Fehlende Pflichtangaben je Nutzung/Eigentum – Texte für „Bitte ergänzen: …“ */
export function fachPflichtFehlt(f) {
  const fehlt = [];
  const fach = f?.fach || {};
  if (f?.nutzung === "dach") {
    const d = fach.dach || {};
    if (!d.dachart) fehlt.push("Dachart");
    if (!d.asbest) fehlt.push("Angabe zu Asbest / Faserzement");
    if (!d.nutzer) fehlt.push("Nutzung des Gebäudes (selbst / vermietet)");
  }
  if (f?.agri && f?.nutzung !== "dach") {
    if (!fach.agri?.kultur) fehlt.push("Geplante Kultur (Agri-PV)");
  }
  if (f?.eigentum && f.eigentum !== "eigentum" && !fach.eigentum?.vertretung) fehlt.push("Vertretung der Eigentümer");
  const km = fach.bewirtschaftung?.kuendigungMonate;
  if (fach.bewirtschaftung?.art === "verpachtet" && !fach.bewirtschaftung.pachtEnde && (km === null || km === undefined || km === "")) {
    fehlt.push("Ende oder Kündigungsfrist der bestehenden Pacht");
  }
  if (summenPruefung(f?.flurstuecke || [], f?.ha).stufe === "fehler") fehlt.push("Größe passend zur Katasterfläche der Flurstücke");
  return fehlt;
}

/* ------------------------------------------------------------------ */
/* Prüfhinweise mit Ampel                                              */
/* ------------------------------------------------------------------ */

/**
 * stufe: fehlt (Pflicht/Einreichen blockiert) · risiko (kann das Projekt verhindern/verteuern)
 *        · hinweis (klären) · ok (positiv)
 * Jeder Punkt: { id, bereich, stufe, titel, text, begriff? }
 */
export function fachPruefung(f) {
  const p = [];
  const add = (id, bereich, stufe, titel, text, begriff) => p.push({ id, bereich, stufe, titel, text, ...(begriff ? { begriff } : {}) });
  const land = f?.land || "DE";
  const fach = f?.fach || {};
  const ha = Number(f?.ha) || 0;
  const n = f?.nutzung;
  const freiflaeche = n !== "dach";

  // --- Flurstücke & Grundbuch
  const fs = f?.flurstuecke || [];
  if (!fs.length) add("flurstuecke", "Grundbuch", "hinweis", "Flurstücke fehlen", land === "AT" ? "KG-Nummer, Grundstücksnummer und Einlagezahl stehen im Grundbuchsauszug – damit prüfen wir Widmung und Lasten eindeutig." : land === "CH" ? "Parzellennummer bzw. E-GRID finden Sie im Grundbuchauszug oder im kantonalen Geoportal." : "Gemarkung, Flur und Flurstücksnummer stehen im Grundbuchauszug bzw. im Liegenschaftskataster.", land === "AT" ? "katastralgemeinde" : land === "CH" ? "egrid" : "flurstueck");
  const s = summenPruefung(fs, ha);
  if (s.stufe && s.stufe !== "ok") add("summe", "Grundbuch", s.stufe === "fehler" ? "fehlt" : s.stufe === "warnung" ? "risiko" : "hinweis", "Größe und Katasterfläche", s.text);
  if (s.stufe === "ok") add("summe", "Grundbuch", "ok", "Größe und Katasterfläche", s.text);

  // --- Eigentum & Vertretung
  const e = fach.eigentum || {};
  if (f?.eigentum && f.eigentum !== "eigentum" && !e.vertretung) add("vertretung", "Eigentum", "fehlt", "Vertretung angeben", "Bei mehreren Eigentümern oder Verwaltung müssen alle Verfügungsberechtigten den Vertrag und die Dienstbarkeit mittragen. Bitte angeben, wer unterschreibt.");
  if (f?.eigentum === "erbengemeinschaft") add("erben", "Eigentum", "hinweis", "Erbengemeinschaft", land === "DE" ? "Die Bestellung einer Dienstbarkeit ist eine Verfügung und nur gemeinschaftlich möglich (§ 2040 BGB) – praktisch unterschreiben alle Miterben oder erteilen notarielle Vollmacht. Ein Erbschein bzw. die Grundbuchberichtigung sollte vorliegen." : "Verfügungen über die Liegenschaft brauchen in der Regel die Zustimmung aller Erben – Einantwortung bzw. Erbbescheinigung sollte abgeschlossen sein.");
  if (f?.eigentum === "miteigentum") add("miteigentum", "Eigentum", "hinweis", "Miteigentum", land === "DE" ? "Über das Grundstück im Ganzen können Miteigentümer nur gemeinschaftlich verfügen (§ 747 Satz 2 BGB) – alle Miteigentümer unterschreiben bzw. bevollmächtigen." : "Alle Miteigentümer müssen dem Vertrag und der Dienstbarkeit zustimmen.");
  if (f?.eigentum === "gesellschaft") add("gesellschaft", "Eigentum", "hinweis", "Gesellschaft als Eigentümerin", land === "DE" ? "Vertretungsnachweis über Handels- bzw. Gesellschaftsregister. Grundbucheintragungen, die eine GbR betreffen, setzen seit 2024 in der Regel ihre Eintragung als eGbR im Gesellschaftsregister voraus." : "Vertretungsnachweis über Firmenbuch bzw. Handelsregister bereithalten.");
  const lasten = e.belastungen || [];
  if (lasten.includes("grundschuld")) add("rang", "Eigentum", "risiko", "Grundpfandrecht eingetragen", "Finanzierende Banken verlangen, dass die PV-Dienstbarkeit im Rang vor Grundschulden bzw. Pfandrechten steht. Dafür braucht es einen Rangrücktritt Ihrer Bank – frühzeitig ansprechen; die Kosten trägt üblicherweise der Projektierer.", "rangruecktritt");
  if (lasten.includes("niessbrauch")) add("niessbrauch", "Eigentum", "risiko", "Nießbrauch", "Der Nießbraucher muss dem Nutzungsvertrag zustimmen bzw. Vertragspartei werden und mit seinem Recht hinter die Dienstbarkeit zurücktreten.", "niessbrauch");
  if (lasten.includes("vormerkung")) add("vormerkung", "Eigentum", "risiko", "Auflassungsvormerkung", "Eine Vormerkung deutet auf einen laufenden Verkauf hin. Bitte klären, wer künftig Eigentümer ist – der Erwerber muss zustimmen.");
  if (lasten.includes("flurbereinigung")) add("flurbereinigung", "Eigentum", "risiko", "Flurbereinigung anhängig", land === "DE" ? "Während eines Flurbereinigungsverfahrens brauchen Nutzungsänderungen und die Errichtung baulicher Anlagen die Zustimmung der Flurbereinigungsbehörde (§ 34 FlurbG); die Flurstücke können sich noch ändern." : "Während eines Zusammenlegungs- bzw. Güterregulierungsverfahrens sind Veränderungen in der Regel zustimmungspflichtig.");
  if (lasten.includes("leitungsrecht") || lasten.includes("wegerecht") || lasten.includes("dienstbarkeit")) add("dienstbarkeiten", "Eigentum", "hinweis", "Bestehende Dienstbarkeiten", "Leitungs- und Wegerechte können Teilflächen blockieren (Schutzstreifen). Bitte die Lage im Lageplan markieren – wir planen darum herum.", "dienstbarkeit");
  if (lasten.includes("altenteil")) add("altenteil", "Eigentum", "hinweis", "Altenteil / Reallast", "Berechtigte aus Altenteil oder Reallast müssen je nach Ausgestaltung zustimmen bzw. im Rang zurücktreten.");
  if (lasten.includes("vorkaufsrecht")) add("vorkauf", "Eigentum", "hinweis", "Vorkaufsrecht", "Ein Vorkaufsrecht steht der Verpachtung nicht entgegen, ist aber bei einem späteren Verkauf und für den Rang der Dienstbarkeit zu beachten.");
  if (e.lastenBekannt === "unbekannt" || (!lasten.length && !e.lastenBekannt && fs.length)) add("lasten", "Eigentum", "hinweis", "Grundbuchlasten klären", "Ein aktueller Grundbuchauszug (nicht älter als drei Monate) zeigt alle Lasten. Laden Sie ihn unter „Unterlagen“ hoch.", "grundbuch-abteilungen");

  // --- Bewirtschaftung & Förderbindungen
  const b = fach.bewirtschaftung || {};
  if (b.art === "verpachtet") {
    const heute = new Date();
    const ende = b.pachtEnde ? new Date(`${b.pachtEnde.length === 4 ? `${b.pachtEnde}-12` : b.pachtEnde}-28`) : null;
    const jahre = ende ? (ende - heute) / (365.25 * 86400e3) : null;
    const rechtsText =
      land === "DE"
        ? "Unbefristete Landpachtverträge sind spätestens am dritten Werktag eines Pachtjahres zum Ende des nächsten Pachtjahres kündbar (§ 594a BGB)."
        : land === "CH"
          ? "Das Bundesgesetz über die landwirtschaftliche Pacht sieht Mindestpachtdauern vor (in der Regel 6 Jahre für einzelne Grundstücke) – eine vorzeitige Auflösung braucht die Zustimmung des Pächters."
          : "Landpachtverträge sind nach den vereinbarten Fristen bzw. dem Landpachtrecht zu beenden – eine einvernehmliche Lösung mit dem Pächter ist meist der schnellste Weg.";
    add("pacht", "Bewirtschaftung", jahre !== null && jahre > 3 ? "risiko" : "hinweis", "Bestehender Pachtvertrag", `Die Fläche muss spätestens zum Baubeginn frei sein. ${rechtsText} Bis zum Baubeginn kann der Pächter weiter wirtschaften; Ernteausfälle werden im Pachtangebot geregelt.`, "landpachtvertrag");
  }
  const fo = fach.foerderung || {};
  if (fo.aukm === "ja") {
    const t =
      land === "AT"
        ? "ÖPUL-Verpflichtungen laufen meist über die gesamte Programmperiode. Scheidet die Fläche vorzeitig aus, können Prämien – teils rückwirkend – zurückgefordert werden. Vor Vertragsschluss mit AMA bzw. Bezirksbauernkammer klären."
        : land === "CH"
          ? "Biodiversitätsförderflächen und Vernetzungsprojekte haben Mindestdauern (häufig 8 Jahre). Ein vorzeitiger Ausstieg kann zu Kürzungen oder Rückforderungen führen – mit der kantonalen Landwirtschaftsstelle klären."
          : "Agrarumwelt- und Klimamaßnahmen (AUKM) binden meist 5 Jahre. Scheidet die Fläche vorzeitig aus, drohen Rückforderungen – Ende der Verpflichtung abwarten oder vorab mit dem Landwirtschaftsamt klären.";
    add("aukm", "Förderung", "risiko", land === "AT" ? "ÖPUL-Verpflichtung" : land === "CH" ? "Biodiversitäts-/Vernetzungsbeiträge" : "AUKM-Verpflichtung", `${t}${fo.aukmEnde ? ` Angegebenes Ende: ${fo.aukmEnde}.` : ""}`, "agrarumweltmassnahmen");
  }
  if (fo.gap === "ja" && freiflaeche && n !== "konversion" && n !== "deponie") {
    add(
      "gap",
      "Förderung",
      "hinweis",
      "Direktzahlungen",
      f?.agri
        ? `Bei Agri-PV nach DIN SPEC 91434 bleibt die Fläche in Deutschland beihilfefähig; die Zahlung wird in der Regel um ${Math.round((1 - AGRI.gapFoerderfaehig) * 100)} % gekürzt (${Math.round(AGRI.gapFoerderfaehig * 100)} % bleiben). In AT und CH vorab mit der Zahlstelle klären.`
        : "Unter einer klassischen Freiflächenanlage entfällt die Beihilfefähigkeit – die Direktzahlungen für diese Fläche fallen ab dem Baujahr weg. Das ist in der Pacht einzupreisen.",
      "gap-direktzahlungen"
    );
  }

  // --- Boden & Nutzung
  const bo = fach.boden || {};
  if (land === "DE" && n === "acker" && bo.ackerzahl >= 50) add("boden", "Boden", "hinweis", `Gute Böden (Ackerzahl ${bo.ackerzahl})`, "Viele Gemeinden und Regionalpläne schließen Freiflächen-PV auf überdurchschnittlichen Böden aus. Agri-PV kann dann die bessere Lösung sein.", "bodenschaetzung");
  if (land === "DE" && n === "acker" && bo.ackerzahl && bo.ackerzahl < 35) add("boden", "Boden", "ok", `Ertragsschwache Böden (Ackerzahl ${bo.ackerzahl})`, "Ertragsschwache Standorte werden in kommunalen Kriterienkatalogen häufig bevorzugt; oft liegen sie in benachteiligten Gebieten.", "benachteiligte-gebiete");
  if (land === "AT" && bo.bodenklimazahl >= 50 && n === "acker") add("boden", "Boden", "hinweis", `Hochwertiger Boden (Bodenklimazahl ${bo.bodenklimazahl})`, "Mehrere Bundesländer schließen hochwertige Ackerböden in ihren PV-Zonierungen aus oder verlangen Agri-PV. Wir prüfen die Landesregelung.", "bodenschaetzung");
  if (land === "DE" && (n === "acker" || n === "gruenland")) add("kulisse", "Planung", "hinweis", "EEG-Flächenkulisse", "Für EEG-Ausschreibungen zählen Acker und Grünland im 500-m-Randstreifen an Autobahnen und Schienenwegen oder in benachteiligten Gebieten (abhängig von der Landesregelung). Außerhalb davon bleibt die Vermarktung über PPA.", "randstreifen");
  if (n === "gruenland") add("gruenland", "Boden", "hinweis", "Dauergrünland", land === "DE" ? "Die Umwandlung von Dauergrünland ist nach dem GAP-Konditionalitätenrecht genehmigungspflichtig; umweltsensibles Dauergrünland in FFH-Gebieten darf nicht umgewandelt werden. Auf entwässerten Moorböden gelten besondere Regeln." : "Für Grünland gelten je nach Land Einschränkungen (Umbruch, Schutzgebiete) – wir klären das in der Vorprüfung.");
  if (n === "konversion" || n === "deponie") add("konversion", "Planung", "ok", n === "deponie" ? "Deponie / Altlastenfläche" : "Konversionsfläche", `Vorbelastete Flächen sind planerisch bevorzugt${land === "DE" ? " und in der EEG-Flächenkulisse" : ""}. Zu klären sind Altlasten, Gründung (Abdichtung, Setzungen) und Kampfmittel.`);
  if (n === "dauerkultur" && !f?.agri) add("dauerkultur", "Boden", "hinweis", "Dauerkultur", "Obst, Wein oder Hopfen lassen sich oft gut mit hoch aufgeständerter Agri-PV kombinieren (Hagel- und Sonnenschutz).", "agri-pv");

  // --- Schutzgebiete & Lage
  const sc = fach.schutz || {};
  if (sc.nsg === "ja") add("nsg", "Schutzgebiete", "risiko", "Naturschutzgebiet", "In Naturschutzgebieten ist eine PV-Anlage praktisch ausgeschlossen.");
  if (sc.natura2000 === "ja") add("natura", "Schutzgebiete", "risiko", "Natura 2000 (FFH/Vogelschutz)", `Eine FFH-Verträglichkeitsprüfung ist nötig, häufig scheidet die Fläche aus.${land === "DE" ? " Für die EEG-Kulisse „benachteiligte Gebiete“ sind Natura-2000-Flächen ausgenommen." : ""}`, "natura-2000");
  if (sc.lsg === "ja") add("lsg", "Schutzgebiete", "risiko", "Landschaftsschutzgebiet", "Eine Befreiung oder Herausnahme aus der Schutzgebietsverordnung ist nötig – im Einzelfall möglich, aber zeitaufwendig.");
  if (sc.wsg === "zone1") add("wsg", "Schutzgebiete", "risiko", "Wasserschutzgebiet Zone I", "Im Fassungsbereich ist eine Anlage ausgeschlossen.");
  if (sc.wsg === "zone2") add("wsg", "Schutzgebiete", "risiko", "Wasserschutzgebiet Zone II", "In Zone II meist nur mit Befreiung und strengen Auflagen, oft ausgeschlossen.", "wasserschutzgebiet");
  if (sc.wsg === "zone3") add("wsg", "Schutzgebiete", "hinweis", "Wasserschutzgebiet Zone III", "In der Regel möglich mit Auflagen: keine wassergefährdenden Stoffe, Trafos mit Auffangwanne, Modulreinigung ohne Chemie.", "wasserschutzgebiet");
  if (sc.ueberschwemmung === "ja") add("hochwasser", "Schutzgebiete", "risiko", land === "DE" ? "Festgesetztes Überschwemmungsgebiet" : "Hochwasser-Gefahrenzone", land === "DE" ? "Die Errichtung baulicher Anlagen ist grundsätzlich untersagt (§ 78 WHG); eine Ausnahme ist mit hochwasserangepasster Bauweise möglich." : "Je nach Gefahrenzone gelten Bauverbote oder Auflagen – wir prüfen den Gefahrenzonenplan.");
  if (sc.denkmal === "ja") add("denkmal", "Schutzgebiete", "risiko", "Bau- oder Bodendenkmal", "Rammpfähle greifen in den Boden ein: Eine denkmalrechtliche Erlaubnis ist nötig, ggf. mit Voruntersuchung oder oberirdischer Gründung (Ballast, Betonfüße).");
  if (sc.biotop === "ja") add("biotop", "Schutzgebiete", "hinweis", "Geschütztes Biotop", "Gesetzlich geschützte Biotope werden ausgespart; Ausgleich und Abstand stimmen wir mit der Naturschutzbehörde ab.");
  const la = fach.lage || {};
  if (la.hangneigung > 15) add("hang", "Lage", "risiko", `Hangneigung ${String(la.hangneigung).replace(".", ",")} %`, "Über rund 15 % Neigung steigen Bau- und Wartungskosten deutlich; Erosionsschutz wird wichtig.");
  if (la.exposition && ["n", "no", "nw"].includes(la.exposition) && la.hangneigung > 5) add("exposition", "Lage", "risiko", "Nordhang", "Nordgeneigte Flächen verlieren Ertrag und brauchen größere Reihenabstände.");
  if (la.zufahrt === "keine" || la.zufahrt === "privatweg") add("zufahrt", "Lage", la.zufahrt === "keine" ? "risiko" : "hinweis", "Zufahrt", "Für Bau und Betrieb braucht es eine gesicherte Zufahrt (Schwerlast in der Bauphase). Über fremde Flächen ist ein Wegerecht als Dienstbarkeit nötig.", "dienstbarkeit");
  if (la.waldAngrenzend === "ja") add("wald", "Lage", "hinweis", "Wald angrenzend", "Verschattung und Waldabstände nach Landesrecht (teils 30 m und mehr) verkleinern die nutzbare Fläche; Brandschutz beachten.");
  if (la.leitungen === "ja") add("leitungen", "Lage", "hinweis", "Leitungen auf der Fläche", "Schutzstreifen von Freileitungen, Gas- und Wasserleitungen sind nicht bebaubar; Drainagen müssen beim Rammen geschont werden.");
  if (la.netzKm !== null && la.netzKm !== undefined && freiflaeche) add("netz", "Lage", la.netzKm <= 3 ? "ok" : la.netzKm > 10 ? "risiko" : "hinweis", `Nächstes Umspannwerk ca. ${String(la.netzKm).replace(".", ",")} km`, la.netzKm <= 3 ? "Kurze Kabeltrasse – ein Vorteil für die Wirtschaftlichkeit." : "Die Kabeltrasse kostet grob 100.000–200.000 € je km und braucht Leitungsrechte über fremde Flurstücke – bei großen Anlagen trotzdem machbar.", "netzverknuepfungspunkt");

  // --- Größe
  if (freiflaeche && !f?.agri && ha > 0 && ha < FREIFLAECHE.mindestHa) add("groesse", "Planung", "hinweis", "Kleine Fläche", `Unter ${FREIFLAECHE.mindestHa} ha ist Freiflächen-PV selten wirtschaftlich – Nachbarflächen bündeln oder Agri-PV prüfen.`);

  // --- Agri-PV
  if (f?.agri && freiflaeche) {
    const a = fach.agri || {};
    if (!a.kultur) add("agri-kultur", "Agri-PV", "fehlt", "Geplante Kultur", "Die Kultur bestimmt System, Höhe und Reihenabstand. Bitte angeben.", "din-spec-91434");
    if (land === "DE") {
      if (ha > 0 && ha <= AGRI.privilegierungHa && a.hofbezug === "ja") add("privileg", "Agri-PV", "ok", "Privilegierung möglich", `Bis ${String(AGRI.privilegierungHa).replace(".", ",")} ha Grundfläche im räumlich-funktionalen Zusammenhang mit Ihrem Betrieb ist Agri-PV im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 9 BauGB, eine Anlage je Hofstelle bzw. Betriebsstandort) – ein Bebauungsplan ist dann in der Regel nicht nötig.`, "privilegierung-aussenbereich");
      else if (ha > AGRI.privilegierungHa) add("privileg", "Agri-PV", "hinweis", "Bebauungsplan nötig", `Über ${String(AGRI.privilegierungHa).replace(".", ",")} ha greift die Agri-PV-Privilegierung nicht – außer im 200-m-Korridor an Autobahnen und zweigleisigen Schienenwegen ist ein Bebauungsplan erforderlich.`, "bebauungsplan");
      else if (a.hofbezug === "nein") add("privileg", "Agri-PV", "hinweis", "Kein Hofbezug", "Ohne räumlich-funktionalen Zusammenhang mit einer Hofstelle greift die Privilegierung nicht – dann braucht es einen Bebauungsplan.", "privilegierung-aussenbereich");
    }
    if (land === "AT") add("eag", "Agri-PV", "ok", "EAG-Marktprämie ohne Abschlag", `Bleibt die landwirtschaftliche Hauptnutzung erhalten, entfällt der Abschlag von ${Math.round(AGRI.eagAbschlagAt * 100)} % auf den Zuschlagswert für PV auf landwirtschaftlichen Flächen (§ 33 EAG).`, "eag");
    if (land === "CH") add("rpv", "Agri-PV", "hinweis", "Bewilligung außerhalb der Bauzone", "Agri-PV ist nach aktuellem Stand nur standortgebunden, wenn sie Vorteile für die landwirtschaftliche Produktion bringt (Raumplanungsverordnung) – der Nachweis ist Teil des Gesuchs.");
    if (a.kategorie === "1" && a.durchfahrtshoeheM && a.durchfahrtshoeheM < 2.1) add("hoehe", "Agri-PV", "risiko", "Lichte Höhe zu gering", `DIN SPEC 91434 verlangt für Kategorie I eine lichte Höhe von mindestens 2,10 m; angegeben sind ${String(a.durchfahrtshoeheM).replace(".", ",")} m.`, "din-spec-91434");
    if (a.arbeitsbreiteM && a.gassenbreiteM && a.kategorie !== "1" && a.gassenbreiteM < a.arbeitsbreiteM + 1) add("gasse", "Agri-PV", "risiko", "Gassenbreite knapp", `Die lichte Gasse (${String(a.gassenbreiteM).replace(".", ",")} m) sollte die größte Arbeitsbreite (${String(a.arbeitsbreiteM).replace(".", ",")} m) plus etwa 0,5 m Sicherheitsabstand je Seite abdecken.`);
    if (!a.referenzertrag) add("referenz", "Agri-PV", "hinweis", "Referenzertrag dokumentieren", `Nach DIN SPEC 91434 muss der landwirtschaftliche Ertrag mindestens ${Math.round(AGRI.mindestErtrag * 100)} % des Referenzertrags erreichen. Dafür brauchen wir Ihre Erträge der letzten Jahre (Ø 3–5 Jahre).`, "referenzertrag");
    if (a.nachweis66 === "offen" || !a.nachweis66) add("nachweis66", "Agri-PV", "hinweis", `Nachweis ${Math.round(AGRI.mindestErtrag * 100)} %-Regel`, "Das landwirtschaftliche Nutzungskonzept (Kultur, Bewirtschaftung, Ertragserwartung) ist Grundlage für Genehmigung und Förderfähigkeit – wir erstellen es mit Ihnen.");
    if (a.kultur && SONDERKULTUREN.includes(a.kultur) && a.kategorie === "2") add("sonder", "Agri-PV", "hinweis", "Sonderkultur", "Obst, Beeren, Wein und Gemüse profitieren meist von hoch aufgeständerten Systemen (Kategorie I) mit Hagel- und Sonnenschutz.");
  }

  // --- Dach
  if (n === "dach") {
    const d = fach.dach || {};
    const jahrHeute = new Date().getFullYear();
    if (!d.dachart) add("dachart", "Dach", "fehlt", "Dachart angeben", "Die Eindeckung bestimmt Befestigung, Statik und ob das Dach belegt werden kann.");
    if (d.asbest === "ja") add("asbest", "Dach", "risiko", "Asbest", "Asbestzementdächer dürfen nicht mit PV belegt oder dafür bearbeitet werden (Gefahrstoffrecht) – erst sanieren, dann belegen.");
    else if (d.dachart === "faserzement" && d.asbest !== "nein") add("asbest", "Dach", "fehlt", "Asbest ausschließen", `Faserzement vor ${land === "DE" ? "1993" : "1990"} kann Asbest enthalten. Ohne Nachweis (Baujahr, Herstellerangabe, Probe) ist keine Belegung möglich.`);
    else if (!d.asbest) add("asbest", "Dach", "fehlt", "Asbest-Frage beantworten", "Bitte angeben, ob Asbest ausgeschlossen ist.");
    const bj = d.baujahrDach || d.baujahrGebaeude;
    if (bj && d.dachart) {
      const rest = bj + (DACH_LEBENSDAUER[d.dachart] || 35) - jahrHeute;
      add("rest", "Dach", rest < DACH_RESTNUTZUNG_MIN ? "risiko" : "ok", `Restnutzungsdauer ca. ${Math.max(0, rest)} Jahre`, rest < DACH_RESTNUTZUNG_MIN ? `Eine PV-Anlage läuft 25 Jahre und länger. Bei geringerer Restnutzungsdauer lohnt es sich, die Eindeckung vorher zu sanieren – das lässt sich oft mit dem Projekt kombinieren.` : "Das Dach dürfte die Laufzeit der Anlage tragen (grobe Orientierung, ersetzt keine Begutachtung).");
    }
    const bedarf = d.dachart?.startsWith("flach") ? DACH_LAST_KN.flach : DACH_LAST_KN.aufdach;
    if (d.statik === "reserve" && d.statikReserveKn != null) add("statik", "Dach", d.statikReserveKn >= bedarf ? "ok" : "risiko", `Statik-Reserve ${String(d.statikReserveKn).replace(".", ",")} kN/m²`, d.statikReserveKn >= bedarf ? `Für PV werden bei diesem Dach etwa ${String(bedarf).replace(".", ",")} kN/m² benötigt – die Reserve reicht voraussichtlich (Nachweis durch Tragwerksplaner).` : `Für PV werden bei diesem Dach etwa ${String(bedarf).replace(".", ",")} kN/m² benötigt. Die Reserve reicht voraussichtlich nicht – leichtere Systeme oder Verstärkung prüfen.`, "dachstatik");
    else add("statik", "Dach", "hinweis", "Statik prüfen", `Ein Tragwerksplaner muss die zusätzliche Last (etwa ${String(DACH_LAST_KN.aufdach).replace(".", ",")}–${String(DACH_LAST_KN.flach).replace(".", ",")} kN/m²) nachweisen. Vorhandene Statik-Unterlagen beschleunigen das.`, "dachstatik");
    if (d.brandwaende !== "nein") add("brand", "Dach", "hinweis", "Brandschutz", "Module dürfen nicht über Brandwände hinweg verlegt werden; die Landesbauordnungen verlangen Abstände. Für Industriedächer spricht auch der Sachversicherer mit.");
    if (d.blitzschutz === "ja") add("blitz", "Dach", "hinweis", "Blitzschutzanlage vorhanden", "Trennungsabstände zur Fangeinrichtung sind einzuhalten (DIN EN 62305-3 mit Beiblatt für PV) – ggf. wird die Anlage angepasst.");
    if (!d.netz || d.netz === "unbekannt") add("netzdach", "Dach", "hinweis", "Netzanschluss am Gebäude", "Hausanschluss- bzw. Trafoleistung bestimmt, wie viel eingespeist werden kann. Die Angabe steht auf dem Netzanschlussvertrag oder der letzten Stromrechnung.");
    if (d.nutzer === "vermietet" || d.nutzer === "teilweise") add("mieter", "Dach", "hinweis", "Eigentümer und Nutzer verschieden", "Der Mieter muss Zutritt, Bauzeit und Leitungswege mittragen. Häufig lohnt ein Dachstrom-Liefervertrag (PPA) mit dem Mieter – das verbessert die Wirtschaftlichkeit.", "ppa");
    if (d.denkmal === "ja") add("denkmaldach", "Dach", "risiko", "Denkmalschutz", "Für denkmalgeschützte Gebäude ist eine denkmalrechtliche Erlaubnis nötig; Solaranlagen werden heute häufiger zugelassen, oft mit Gestaltungsauflagen.");
  }

  const zaehler = { fehlt: 0, risiko: 0, hinweis: 0, ok: 0 };
  p.forEach((x) => (zaehler[x.stufe] += 1));
  return { punkte: p, zaehler, pflichtFehlt: fachPflichtFehlt(f) };
}

/* ------------------------------------------------------------------ */
/* Pachtangebot (erweitert) und Angebotsbogen                          */
/* ------------------------------------------------------------------ */

export const PACHT_MODELLE = { fest: "Feste Pacht je ha", umsatz: "Umsatzbeteiligung", kombi: "Umsatzbeteiligung mit Mindestpacht" };
export const INDEX_ARTEN = { keine: "Keine Wertsicherung", vpi: "Verbraucherpreisindex (VPI)", fest: "Feste Steigerung % p. a." };
export const LAUFZEIT_BEGINN = { vertrag: "ab Vertragsschluss", baubeginn: "ab Baubeginn", inbetriebnahme: "ab Inbetriebnahme" };
export const RUECKBAU_BESTAND = { buergschaft: "Bankbürgschaft / Versicherung", konzern: "Konzernbürgschaft", ruecklage: "Rücklage im Betrieb", keine: "Keine Sicherheit" };
const opt = (liste) => Object.fromEntries(OPTIONEN[liste].map((o) => [o.id, o.sub ? `${o.label} (${o.sub})` : o.label]));
export const PACHT_OPTIONEN = {
  rueckbau: RUECKBAU_BESTAND,
  rueckbauAb: opt("rueckbauAb"),
  kuendigung: { befristet: "Rücktritt nur bis Baubeginn", unbefristet: "Rücktritt ohne Frist", jederzeit: "Kündigung jederzeit, auch im Betrieb" },
  nebenflaechen: { keine: "Keine Nebenflächen", verguetet: "Nebenflächen vergütet", teilweise: "Nebenflächen teilweise vergütet", unentgeltlich: "Nebenflächen unentgeltlich" },
  nichtbau: { entschaedigung: "Entschädigung und Rückgabe", rueckgabe: "Nur Rückgabe", nichts: "Nicht geregelt" },
  bewirtschaftung: { mitEntschaedigung: "Weiter bewirtschaften, Ernteausfall wird ersetzt", ohne: "Weiter bewirtschaften, ohne Ausgleich", nein: "Fläche ruht" },
  dienstbarkeit: { baubeginn: "Eintragung ab Finanzierung/Baubeginn", sofortLoeschung: "Sofort, mit Löschungspflicht bei Nichtbau", sofortOhne: "Sofort, ohne Löschungsregel" },
  anwalt: { voll: "Vollständig durch den Pächter", gedeckelt: "Bis zu einem Höchstbetrag", keine: "Keine Übernahme" },
};

/**
 * Pachtangebot bereinigen (Backoffice sendet es mit dem Übergang „Pachtangebot senden“).
 * Pflicht: Laufzeit und – je Modell – Pacht je ha bzw. Umsatzanteil. Wirft 422.
 */
export function pachtangebotBereinigen(pa, { am } = {}) {
  const x = pa && typeof pa === "object" ? pa : {};
  const modell = v.auswahl(x.modell, PACHT_MODELLE, "fest");
  const euro = zahlDe(x.euroProHaJahr, { min: 50, max: 50000, stellen: 0 });
  const umsatz = zahlDe(x.umsatzProzent, { min: 0.5, max: 30, stellen: 2 });
  const mindest = zahlDe(x.mindestProHa, { min: 0, max: 50000, stellen: 0 });
  const jahre = zahlDe(x.laufzeitJahre, { min: 1, max: 60, stellen: 0 });
  if (modell === "fest") {
    if (euro === null || jahre === null) throw ungueltig("Pachtangebot: Pacht je ha und Laufzeit angeben.");
  } else {
    if (umsatz === null || jahre === null) throw ungueltig("Pachtangebot: Umsatzanteil in % und Laufzeit angeben.");
    if (modell === "kombi" && mindest === null) throw ungueltig("Pachtangebot: Mindestpacht je ha angeben.");
  }
  const w = (liste, k) => v.auswahl(x[k], PACHT_OPTIONEN[liste], "");
  const aus = {
    modell,
    euroProHaJahr: modell === "fest" ? euro : modell === "kombi" ? mindest : euro,
    umsatzProzent: modell === "fest" ? null : umsatz,
    mindestProHa: modell === "kombi" ? mindest : null,
    indexierung: v.auswahl(x.indexierung, INDEX_ARTEN, ""),
    indexSatzProzent: zahlDe(x.indexSatzProzent, { min: 0, max: 10, stellen: 2 }),
    reservierungProHaJahr: zahlDe(x.reservierungProHaJahr, { min: 0, max: 5000, stellen: 0 }),
    laufzeitJahre: jahre,
    laufzeitBeginn: v.auswahl(x.laufzeitBeginn, LAUFZEIT_BEGINN, ""),
    verlaengerungJahre: zahlDe(x.verlaengerungJahre, { min: 0, max: 40, stellen: 0 }),
    verlaengerung: v.text(x.verlaengerung, 80),
    optionsfristJahre: zahlDe(x.optionsfristJahre, { min: 0, max: 15, stellen: 0 }),
    vorlaufJahre: zahlDe(x.vorlaufJahre, { min: 0, max: 10, stellen: 0 }),
    bewirtschaftung: w("bewirtschaftung", "bewirtschaftung"),
    nichtbau: w("nichtbau", "nichtbau"),
    nichtbauEuroProHa: zahlDe(x.nichtbauEuroProHa, { min: 0, max: 50000, stellen: 0 }),
    kuendigung: w("kuendigung", "kuendigung"),
    rueckbau: w("rueckbau", "rueckbau"),
    rueckbauAb: w("rueckbauAb", "rueckbauAb"),
    rueckbauEuro: zahlDe(x.rueckbauEuro, { min: 0, max: 100000000, stellen: 0 }),
    dienstbarkeit: w("dienstbarkeit", "dienstbarkeit"),
    rangruecktritt: x.rangruecktritt === undefined || x.rangruecktritt === "" || x.rangruecktritt === null ? null : v.wahr(x.rangruecktritt),
    nebenflaechen: w("nebenflaechen", "nebenflaechen"),
    nebenflaechenText: v.text(x.nebenflaechenText, 200),
    anwalt: w("anwalt", "anwalt"),
    anwaltEuro: zahlDe(x.anwaltEuro, { min: 0, max: 100000, stellen: 0 }),
    steuerhinweis: v.mehrzeilig(x.steuerhinweis, 1000),
    gueltigBis: /^\d{4}-\d{2}-\d{2}$/.test(String(x.gueltigBis || "")) ? String(x.gueltigBis) : "",
    text: v.mehrzeilig(x.text, 2000),
    am: am || new Date().toISOString(),
  };
  // Nur gesetzte Werte speichern (ältere Angebote bleiben lesbar, fehlende Punkte = „nicht angegeben“)
  return Object.fromEntries(Object.entries(aus).filter(([, w2]) => w2 !== null && w2 !== ""));
}

/** Region für den Pachtangebot-Check aus Land/Bundesland */
export function regionFuer(land, bundesland) {
  if (land === "AT") return "at";
  if (land === "CH") return "ch";
  const b = String(bundesland || "");
  if (["Bayern", "Baden-Württemberg"].includes(b)) return "de-sued";
  if (["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"].includes(b)) return "de-ost";
  if (["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"].includes(b)) return "de-nord";
  return b ? "de-west" : "de-sued";
}

/** Welche Angebotsfelder treiben welche Klausel des Pachtangebot-Checks */
const KLAUSEL_FELDER = {
  index: ["indexierung"],
  reservierung: ["reservierungProHaJahr"],
  optionsfrist: ["optionsfristJahre"],
  rueckbau: ["rueckbau"],
  kuendigung: ["kuendigung"],
  nebenflaechen: ["nebenflaechen"],
  nichtbau: ["nichtbau"],
  bewirtschaftung: ["bewirtschaftung"],
  dienstbarkeit: ["dienstbarkeit"],
  anwalt: ["anwalt"],
};

/**
 * Angebotsbogen: Pachtangebot einer Fläche mit der Logik von /rechner/pachtangebot-check einordnen.
 * Punkte, die das Angebot nicht regelt, erscheinen als „offen“ mit der passenden Frage.
 */
export function angebotsbogen(f) {
  const pa = f?.pachtangebot;
  if (!pa) return null;
  const ha = Number(f.ha) > 0 ? Number(f.ha) : 10;
  const gesetzt = (k) => pa[k] !== undefined && pa[k] !== null && pa[k] !== "";
  const idx = pa.indexierung || "keine";
  const opt2 = /(\d+)\s*[×x]\s*(\d+)/.exec(pa.verlaengerung || ""); // Altangebote: „2 × 5 Jahre Option“
  const e = {
    ...STANDARD,
    ha,
    regionId: regionFuer(f.land, f.bundesland),
    flaechenart: f.agri ? "agri" : "freiflaeche",
    modell: pa.modell || "fest",
    proHa: Number(pa.euroProHaJahr) || 0,
    umsatzAnteil: (Number(pa.umsatzProzent) || 0) / 100,
    mindestProHa: Number(pa.mindestProHa) || 0,
    laufzeit: Number(pa.laufzeitJahre) || PACHT.laufzeit,
    verlaengerungJahre: gesetzt("verlaengerungJahre") ? Number(pa.verlaengerungJahre) : opt2 ? Number(opt2[1]) * Number(opt2[2]) : 0,
    indexArt: idx,
    indexSatz: (Number(pa.indexSatzProzent) || 1.5) / 100,
    reservierungProHa: Number(pa.reservierungProHaJahr) || 0,
    vorlaufJahre: gesetzt("vorlaufJahre") ? Number(pa.vorlaufJahre) : PACHT.reservierungJahre.ueblich,
    optionsfrist: gesetzt("optionsfristJahre") ? Number(pa.optionsfristJahre) : 0,
    rueckbau: pa.rueckbau || "keine",
    rueckbauAb: pa.rueckbauAb || "spaeter",
    kuendigung: pa.kuendigung || "unbefristet",
    nebenflaechen: pa.nebenflaechen || "keine",
    nichtbau: pa.nichtbau || "nichts",
    bewirtschaftung: pa.bewirtschaftung || "nein",
    dienstbarkeit: pa.dienstbarkeit || "sofortOhne",
    rangruecktritt: pa.rangruecktritt === true,
    anwalt: pa.anwalt || "keine",
    anwaltBetrag: Number(pa.anwaltEuro) || 0,
  };
  const r = pruefePachtangebot(e);
  const klauseln = r.klauseln.map((k) => {
    const felder = KLAUSEL_FELDER[k.id];
    if (felder && !felder.some(gesetzt) && !(k.id === "index" && e.modell === "umsatz")) {
      return { ...k, ampel: "offen", wert: "im Angebot nicht angegeben", text: `Dieser Punkt ist im Angebot noch nicht geregelt. ${k.text}` };
    }
    return k;
  });
  const zaehler = { gut: 0, pruefen: 0, kritisch: 0, offen: 0 };
  klauseln.forEach((k) => (zaehler[k.ampel] += 1));
  const urteil =
    zaehler.offen > 3
      ? { id: "pruefen", titel: "Angebot unvollständig", text: "Mehrere wichtige Punkte sind noch nicht geregelt. Stellen Sie die Fragen unten, bevor Sie annehmen – die Antworten gehören schriftlich in den Vertrag." }
      : r.urteil;
  const fragen = [
    ...klauseln.filter((k) => k.ampel !== "gut").map((k) => ({ thema: k.titel, frage: k.frage, ampel: k.ampel })),
    ...(f.fach?.eigentum?.belastungen?.includes("grundschuld") && !pa.rangruecktritt ? [{ thema: "Rang im Grundbuch", frage: "Auf meiner Fläche lastet eine Grundschuld. Wer holt den Rangrücktritt der Bank ein und wer trägt die Kosten?", ampel: "pruefen" }] : []),
    ...(f.fach?.bewirtschaftung?.art === "verpachtet" ? [{ thema: "Bestehende Pacht", frage: "Wer verhandelt mit meinem Pächter über die vorzeitige Beendigung, und wer übernimmt eine etwaige Entschädigung?", ampel: "pruefen" }] : []),
    ...(f.fach?.foerderung?.aukm === "ja" ? [{ thema: "Förderbindung", frage: "Übernimmt der Pächter mögliche Rückforderungen aus meiner laufenden Agrarumwelt-Verpflichtung?", ampel: "kritisch" }] : []),
    ...STANDARDFRAGEN.map((q) => ({ thema: "Allgemein", frage: q, ampel: "standard" })),
  ];
  const jahrespacht = e.modell === "fest" ? e.proHa * ha : null;
  return {
    eingabe: e,
    klauseln,
    zaehler,
    urteil,
    fragen,
    summe: r.summe,
    barwert: r.barwert,
    spanne: r.spanne,
    jahrespacht,
    reservierungGesamt: e.reservierungProHa * ha,
    rueckbauKostenSchaetzung: r.rueckbauKosten,
    steuerhinweis:
      pa.steuerhinweis ||
      (f.land === "AT"
        ? "Pachteinnahmen sind in Österreich in der Regel Einkünfte aus Vermietung und Verpachtung; bei land- und forstwirtschaftlichem Vermögen können sich Einheitswert und Pauschalierung ändern. Bitte mit Ihrer Steuerberatung klären."
        : f.land === "CH"
          ? "Pachtzinsen sind in der Schweiz steuerbares Einkommen; bei Grundstücken im landwirtschaftlichen Betriebsvermögen kann sich die Bewertung ändern. Bitte mit Ihrer Steuerberatung klären."
          : "Pachteinnahmen sind einkommensteuerpflichtig. Verpachtete PV-Flächen können aus dem land- und forstwirtschaftlichen Vermögen ausscheiden – mit Folgen für Grund- und Erbschaftsteuer (§ 158 BewG erfasst nach Wortlaut nur die Pflanzen- und Tiererzeugung). Bitte vor Unterschrift mit Ihrer Steuerberatung klären."),
  };
}

/* ------------------------------------------------------------------ */
/* Aus einer öffentlichen Anfrage (Dachflächen-Formular)               */
/* ------------------------------------------------------------------ */

/** Fachangaben aus den Chips von /dachflaeche-verpachten (daten.art = "dach") */
export function fachAusAnfrage(typ, daten = {}) {
  if (!daten || typeof daten !== "object") return {};
  if (daten.art === "dach") {
    const dachart = { trapez: "trapez", sandwich: "sandwich", flach: "flach_folie", faserzement: "faserzement" }[daten.dachart] || "";
    const m2 = { "1000-3000": 2000, "3000-10000": 6000, "10000+": 10000, "unter-1000": 800 }[daten.groesse] || null;
    const dach = {};
    if (dachart) dach.dachart = dachart;
    if (m2) dach.dachflaecheM2 = m2;
    if (Array.isArray(daten.interesse) && daten.interesse.includes("ppa")) dach.dachstrom = "ja";
    return Object.keys(dach).length ? { dach } : {};
  }
  return {};
}

/** Vorschlag für das Backoffice-Formular „Pachtangebot senden“ (marktübliche Eckwerte aus markt.js) */
export function pachtVorschlag(f) {
  const spanne = f?.agri ? PACHT.agriProHa : PACHT.freiflaecheProHa;
  const belastet = f?.fach?.eigentum?.belastungen?.includes("grundschuld");
  return {
    modell: "fest",
    euroProHaJahr: spanne.mittel,
    indexierung: "vpi",
    reservierungProHaJahr: Math.round((PACHT.reservierungProHa.min + PACHT.reservierungProHa.max) / 2),
    laufzeitJahre: PACHT.laufzeit,
    laufzeitBeginn: "inbetriebnahme",
    verlaengerungJahre: PACHT.verlaengerungMax,
    verlaengerung: PACHT.verlaengerung,
    optionsfristJahre: PACHT.reservierungJahre.max,
    vorlaufJahre: PACHT.reservierungJahre.ueblich,
    bewirtschaftung: "mitEntschaedigung",
    nichtbau: "rueckgabe",
    kuendigung: "befristet",
    rueckbau: "buergschaft",
    rueckbauAb: "baubeginn",
    dienstbarkeit: "sofortLoeschung",
    rangruecktritt: belastet ? true : "",
    nebenflaechen: "verguetet",
    anwalt: "gedeckelt",
    anwaltEuro: PACHT.anwaltskosten.max,
  };
}
