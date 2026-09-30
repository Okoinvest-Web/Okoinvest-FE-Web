// src/lib/plattform/fach/datenblatt.js
//
// Standard-Projektdatenblatt der Projektbörse (Anbieter → Börse): phasenabhängige Felder aus
// datenblatt-schema.json, Bereinigung (Positivliste), Vollständigkeit, Plausibilitätsprüfungen und
// Due-Diligence-Index (acht Kategorien mit Ampel). Reine Funktionen – Browser, Server und Node-Tests.
// Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/fach/datenblatt.py (gleiche Regeln).
//
// Speicherort: projekt.datenblatt = { feldId: wert } – vertraulich (nie in der öffentlichen Projektion).
// Felder mit `pfad: "vertraulich"` liegen weiter im bestehenden Objekt projekt.vertraulich (kein Doppelbestand).

import SCHEMA from "./datenblatt-schema.js";
import { BAUART, ERLOESE, FREIFLAECHE, PACHT, PHASEN, AGRI, CARPORT, regionById } from "../../invest/markt.js";

export { SCHEMA as DATENBLATT_SCHEMA };
export const DATENBLATT_BEREICHE = SCHEMA.bereiche;
export const DATENBLATT_FELDER = SCHEMA.bereiche.flatMap((b) => b.felder.map((f) => ({ ...f, bereich: b.id })));
export const DD_KATEGORIEN = SCHEMA.dd;
/** Felder, die im Objekt `vertraulich` liegen (im Formular-Schritt „Vertrauliches“ ausblenden) */
export const DATENBLATT_VERTRAULICH = DATENBLATT_FELDER.filter((f) => f.pfad === "vertraulich").map((f) => f.id);

const PHASE_IDX = (id) => PHASEN.findIndex((p) => p.id === id);
const DATUM = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const STEUER = /[\u0000-\u001F\u007F]/g;

// ---------------------------------------------------------------- Werte lesen/bereinigen

function zahlWert(v, f) {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < (f.min ?? -Infinity) || n > (f.max ?? Infinity)) return null;
  const s = f.stellen ?? 2;
  return Math.round(n * 10 ** s) / 10 ** s;
}

function textWert(v, laenge = 200) {
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v).replace(STEUER, " ").replace(/\s{2,}/g, " ").trim().slice(0, laenge);
}

/** Ein Feld bereinigen – liefert null/"" für ungültig oder leer */
export function feldBereinigen(f, v) {
  switch (f.typ) {
    case "zahl":
      return zahlWert(v, f);
    case "auswahl":
      return f.optionen.some(([id]) => id === v) ? v : "";
    case "datum": {
      const s = textWert(v, 10);
      if (!DATUM.test(s)) return "";
      const d = new Date(`${s}T00:00:00Z`);
      return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
    }
    case "tabelle": {
      if (!Array.isArray(v)) return [];
      return v
        .slice(0, 40)
        .map((z) => ({
          jahr: zahlWert(z?.jahr, { min: 1990, max: 2100, stellen: 0 }),
          istMwh: zahlWert(z?.istMwh, { min: 0, max: 10000000, stellen: 1 }),
          prognoseMwh: zahlWert(z?.prognoseMwh, { min: 0, max: 10000000, stellen: 1 }),
        }))
        .filter((z) => z.jahr !== null && (z.istMwh !== null || z.prognoseMwh !== null))
        .sort((a, b) => a.jahr - b.jahr);
    }
    default:
      return textWert(v, f.laenge || 200);
  }
}

/**
 * Datenblatt aus Formulardaten bereinigen (Positivliste). `roh` undefined → `basis` unverändert (PATCH ohne Datenblatt).
 * Liefert nur das Datenblatt; Felder mit pfad „vertraulich“ werden hier NICHT gespeichert (die bestehende
 * Bereinigung von `vertraulich` übernimmt sie).
 */
export function datenblattBereinigen(roh, basis = null) {
  if (roh === undefined || roh === null || typeof roh !== "object" || Array.isArray(roh)) return basis && typeof basis === "object" ? basis : {};
  const out = {};
  for (const f of DATENBLATT_FELDER) {
    if (f.pfad === "vertraulich") continue;
    const w = feldBereinigen(f, roh[f.id]);
    if (w === null || w === "" || (Array.isArray(w) && !w.length)) continue;
    out[f.id] = w;
  }
  return out;
}

/** Wert eines Felds am Projekt (Datenblatt oder vertraulich) */
export function feldWert(p, f) {
  const quelle = f.pfad === "vertraulich" ? p?.vertraulich : p?.datenblatt;
  return quelle ? quelle[f.id] : undefined;
}

const gefuellt = (w) => !(w === undefined || w === null || w === "" || (Array.isArray(w) && w.length === 0));

// ---------------------------------------------------------------- Relevanz und Vollständigkeit

/** Ist das Feld für dieses Projekt überhaupt relevant (Typ, Land, Bestand, Bedingung)? */
export function feldRelevant(p, f) {
  const bestand = p?.phase === "cod";
  if (f.nurTypen && !f.nurTypen.includes(p?.typ)) return false;
  if (f.ohneTypen && f.ohneTypen.includes(p?.typ)) return false;
  if (f.land && f.land !== p?.land) return false;
  if (f.nurBestand && !bestand) return false;
  if (f.ohneBestand && bestand) return false;
  if (f.wenn) {
    const bezug = DATENBLATT_FELDER.find((x) => x.id === f.wenn.feld);
    const w = bezug ? feldWert(p, bezug) : undefined;
    if (f.wenn.gesetzt) return gefuellt(w);
    if (f.wenn.in && !f.wenn.in.includes(w)) return false;
  }
  return true;
}

/** Wird das Feld in der aktuellen Phase erwartet (zählt für die Vollständigkeit)? */
export function feldErwartet(p, f) {
  if (!f.pflicht || !feldRelevant(p, f)) return false;
  const phase = PHASE_IDX(p?.phase);
  if (phase < 0) return false;
  if (f.nurBestand) return true;
  if (!f.ab) return true; // bedingte Pflichtfelder (wenn …) gelten ab Relevanz
  return PHASE_IDX(f.ab) <= phase;
}

/**
 * Vollständigkeit des Datenblatts: erwartete Pflichtfelder der Phase vs. ausgefüllt.
 * @returns {{quote, erwartet, erfuellt, bereiche: [{id, titel, erwartet, erfuellt, fehlend: [label]}]}}
 */
export function datenblattVollstaendigkeit(p) {
  const bereiche = SCHEMA.bereiche.map((b) => {
    const erwartet = b.felder.filter((f) => feldErwartet(p, f));
    const fehlend = erwartet.filter((f) => !gefuellt(feldWert(p, f)));
    return { id: b.id, titel: b.titel, erwartet: erwartet.length, erfuellt: erwartet.length - fehlend.length, fehlend: fehlend.map((f) => f.label) };
  });
  const erwartet = bereiche.reduce((s, b) => s + b.erwartet, 0);
  const erfuellt = bereiche.reduce((s, b) => s + b.erfuellt, 0);
  return { quote: erwartet ? Math.round((erfuellt / erwartet) * 100) : 100, erwartet, erfuellt, bereiche };
}

// ---------------------------------------------------------------- Plausibilität

const DE_REGION = {
  "Schleswig-Holstein": "de-nord", Hamburg: "de-nord", Niedersachsen: "de-nord", Bremen: "de-nord", "Mecklenburg-Vorpommern": "de-nord",
  Brandenburg: "de-ost", Berlin: "de-ost", Sachsen: "de-ost", "Sachsen-Anhalt": "de-ost", Thüringen: "de-ost",
  "Nordrhein-Westfalen": "de-west", Hessen: "de-west", "Rheinland-Pfalz": "de-west", Saarland: "de-west",
  Bayern: "de-sued", "Baden-Württemberg": "de-sued",
};
export function regionFuerProjekt(p) {
  if (p?.land === "AT") return "at";
  if (p?.land === "CH") return "ch";
  return DE_REGION[p?.bundesland] || "de-sued";
}

/** Bauart (markt.js BAUART) zur Aufständerung */
export function bauartFuer(aufstaenderung, typ) {
  if (BAUART[aufstaenderung]) return aufstaenderung;
  if (typ === "agri") return "agriHoch";
  return "sued";
}

/** Erwarteter spezifischer Ertrag P50 (kWh/kWp) nach Region und Aufständerung – Orientierung aus markt.js */
export function erwarteterErtrag(p) {
  const db = p?.datenblatt || {};
  const region = regionById(regionFuerProjekt(p));
  if (db.aufstaenderung === "carport" || p?.typ === "carport") return Math.round(region.ertrag * CARPORT.ertragFaktor);
  if (db.aufstaenderung === "dach" || p?.typ === "dach") return Math.round(region.ertrag * 0.9);
  if (db.aufstaenderung === "schwimmend") return Math.round(region.ertrag * 0.97);
  return Math.round(region.ertrag * BAUART[bauartFuer(db.aufstaenderung, p?.typ)].faktor);
}

const heute = (jetzt) => (jetzt ? new Date(jetzt) : new Date()).toISOString().slice(0, 10);

/**
 * Plausibilitätsprüfungen. Stufen: fehler (widersprüchlich), warnung (ungewöhnlich – bitte erläutern), info.
 * @returns {[{stufe, feld, dd, text}]}
 */
export function datenblattPruefen(p, { jetzt } = {}) {
  const h = [];
  const add = (stufe, feld, dd, text) => h.push({ stufe, feld, dd, text });
  const db = p?.datenblatt || {};
  const vt = p?.vertraulich || {};
  const mwp = Number(p?.mwp) || 0;
  const heuteIso = heute(jetzt);
  const phase = PHASE_IDX(p?.phase);
  const bestand = p?.phase === "cod";
  const pv = p?.typ !== "speicher";

  // DC/AC-Verhältnis
  if (pv && mwp > 0 && db.mwac > 0) {
    const r = mwp / db.mwac;
    if (r < 0.95) add("warnung", "mwac", "technisch", `DC/AC-Verhältnis ${r.toFixed(2)} – AC-Leistung größer als die Modulleistung ist unüblich. Bitte prüfen.`);
    else if (r > 1.5) add("warnung", "mwac", "technisch", `DC/AC-Verhältnis ${r.toFixed(2)} – starke Überbauung, Abregelungsverluste im Ertragsgutachten ausweisen.`);
  }

  // Flächenbedarf MWp/ha
  if (pv && mwp > 0 && Number(p?.flaecheHa) > 0 && !["dach", "carport"].includes(p?.typ)) {
    const bauart = BAUART[bauartFuer(db.aufstaenderung, p?.typ)];
    const haProMwp = Number(p.flaecheHa) / mwp;
    if (haProMwp < bauart.haProMwp * 0.6) add("warnung", "flaecheHa", "technisch", `Belegung ${(mwp / p.flaecheHa).toFixed(2)} MWp/ha ist für „${bauart.label}“ sehr dicht (üblich rund ${(1 / bauart.haProMwp).toFixed(2)} MWp/ha). Fläche oder Leistung prüfen.`);
    else if (haProMwp > bauart.haProMwp * 2.5) add("info", "flaecheHa", "technisch", `Belegung nur ${(mwp / p.flaecheHa).toFixed(2)} MWp/ha – Fläche enthält vermutlich Ausgleichs-, Abstands- oder Erweiterungsflächen. Bitte kurz erläutern.`);
  }

  // Spezifischer Ertrag und P-Werte
  const p50 = Number(vt.ertragKwhKwp) || null;
  if (pv && p50) {
    const soll = erwarteterErtrag(p);
    const abw = p50 / soll - 1;
    if (abw > 0.12) add("warnung", "ertragKwhKwp", "ertrag", `P50 ${p50} kWh/kWp liegt ${Math.round(abw * 100)} % über dem regionalen Richtwert (${soll} kWh/kWp). Gutachten und Annahmen (Albedo, Bifazialgewinn, Verluste) prüfen.`);
    else if (abw < -0.2) add("warnung", "ertragKwhKwp", "ertrag", `P50 ${p50} kWh/kWp liegt deutlich unter dem regionalen Richtwert (${soll} kWh/kWp) – Verschattung oder Abregelung erläutern.`);
  }
  if (pv && p50 && db.ertragP90) {
    if (db.ertragP90 >= p50) add("fehler", "ertragP90", "ertrag", "P90 muss kleiner als P50 sein (höhere Überschreitungswahrscheinlichkeit = niedrigerer Wert).");
    else {
      const q = db.ertragP90 / p50;
      if (q > 0.97) add("warnung", "ertragP90", "ertrag", `P90/P50 = ${(q * 100).toFixed(1)} % – ungewöhnlich geringe Unsicherheit. Handelt es sich um einen 10-Jahres-P90? Für die Finanzierung zählt meist der 1-Jahres-P90.`);
      else if (q < 0.8) add("warnung", "ertragP90", "ertrag", `P90/P50 = ${(q * 100).toFixed(1)} % – sehr hohe Unsicherheit. Datenbasis und Unsicherheitsbudget des Gutachtens prüfen.`);
    }
  }
  if (pv && db.ertragP75) {
    if ((p50 && db.ertragP75 >= p50) || (db.ertragP90 && db.ertragP75 <= db.ertragP90)) add("fehler", "ertragP75", "ertrag", "Reihenfolge der P-Werte stimmt nicht: P90 < P75 < P50.");
  }
  if (pv && db.ertragDatenbasis === "eigen" && phase >= PHASE_IDX("satzung")) add("warnung", "ertragDatenbasis", "ertrag", "Nur Eigenberechnung – ab Baurecht erwarten Investoren und Banken ein unabhängiges Ertragsgutachten.");

  // Netz
  const acRef = db.mwac || (mwp || null);
  if (db.zusageMw > 0 && acRef && db.zusageMw < acRef * 0.98) {
    if (db.ueberbauung !== "ja" && !db.einspeiseLimitMw) add("warnung", "zusageMw", "netz", `Zusage ${db.zusageMw} MW liegt unter der Anlagenleistung (${acRef} MW) – Überbauung bzw. Einspeisebegrenzung angeben und im Ertrag berücksichtigen.`);
    else add("info", "zusageMw", "netz", `Anschluss überbaut (${(acRef / db.zusageMw).toFixed(2)}-fach) – Abregelungsverluste sollten im Ertragsgutachten enthalten sein.`);
  }
  if (db.zusageBefristetBis && !bestand) {
    if (db.zusageBefristetBis < heuteIso) add("fehler", "zusageBefristetBis", "netz", "Die Befristung der Netzzusage ist abgelaufen – Verlängerung oder neue Zusage nachweisen.");
    else if (p?.codGeplant && String(p.codGeplant) > db.zusageBefristetBis.slice(0, String(p.codGeplant).length)) add("warnung", "zusageBefristetBis", "netz", "Geplante Inbetriebnahme liegt nach dem Ende der Netzreservierung.");
  }
  if (Number(vt.entfernungNetzKm) > 15) add("warnung", "entfernungNetzKm", "netz", `Netzverknüpfungspunkt ${vt.entfernungNetzKm} km entfernt – Trassensicherung (Dienstbarkeiten) und Kabelkosten gesondert ausweisen.`);
  if (["zusage", "reserviert", "vorhanden"].includes(p?.netzanschluss) && pv && !db.zusageDatum && !bestand && phase >= PHASE_IDX("netz")) add("info", "zusageDatum", "netz", "Netzanschluss laut Grunddaten zugesagt – Datum der Zusage ergänzen.");
  if (phase >= PHASE_IDX("netz") && p?.netzanschluss === "offen") add("warnung", "netz", "netz", "Phase „Netzzusage“ oder später, aber Netzanschluss laut Grunddaten „noch nicht angefragt“ – Angaben widersprechen sich.");

  // Speicher
  if (db.speicherMw > 0 && db.speicherMwh > 0) {
    const dauer = db.speicherMwh / db.speicherMw;
    if (dauer < 0.5 || dauer > 8) add("warnung", "speicherMwh", "technisch", `Speicherdauer ${dauer.toFixed(1)} h ist ungewöhnlich (üblich 1–4 h).`);
  }

  // Fläche / Pacht
  if (db.pachtEurHa) {
    const sp = p?.typ === "agri" ? PACHT.agriProHa : PACHT.freiflaecheProHa;
    if (db.pachtEurHa > sp.max * 1.3) add("warnung", "pachtEurHa", "kaufmaennisch", `Pacht ${db.pachtEurHa} €/ha liegt deutlich über der Marktspanne (${sp.min}–${sp.max} €/ha) – belastet die Wirtschaftlichkeit.`);
    else if (db.pachtEurHa < sp.min * 0.5) add("info", "pachtEurHa", "kaufmaennisch", `Pacht ${db.pachtEurHa} €/ha deutlich unter Marktspanne – Nachverhandlungs- bzw. Anfechtungsrisiko prüfen.`);
  }
  if (db.pachtLaufzeitJahre !== undefined && pv) {
    const gesamt = (db.pachtLaufzeitJahre || 0) + (db.pachtVerlaengerungJahre || 0);
    if (gesamt < 25) add("warnung", "pachtLaufzeitJahre", "rechtlich", `Pacht einschließlich Optionen nur ${gesamt} Jahre – unter der üblichen Betriebsdauer (25–30+ Jahre). Finanzierung und Restwert sind eingeschränkt.`);
  }
  if (db.gesichertPct !== undefined && db.gesichertPct < 100 && phase >= PHASE_IDX("satzung")) add("warnung", "gesichertPct", "rechtlich", `Nur ${db.gesichertPct} % der Fläche gesichert – ab Baurecht sollten alle Flurstücke gesichert sein.`);
  if (db.eigentuemerAnzahl > 10) add("info", "eigentuemerAnzahl", "rechtlich", `${db.eigentuemerAnzahl} Eigentümer – höherer Aufwand bei Dienstbarkeiten und Vertragsänderungen.`);

  // Vermarktung
  if (db.eegZuschlagCt) {
    const hoechst = ERLOESE.eegBesondereCt + 1.5;
    if (db.eegZuschlagCt > hoechst) add("warnung", "eegZuschlagCt", "kaufmaennisch", `Zuschlagswert ${db.eegZuschlagCt} ct/kWh ungewöhnlich hoch (Zuschläge zuletzt um ${ERLOESE.eegFreiflaecheCt} ct/kWh) – Segment und Bescheid prüfen.`);
  }
  if (db.eegRealisierungsfrist && !bestand) {
    if (db.eegRealisierungsfrist < heuteIso) add("fehler", "eegRealisierungsfrist", "kaufmaennisch", "Realisierungsfrist des Zuschlags ist abgelaufen – Pönale bzw. Erlöschen des Zuschlags prüfen.");
    else if (p?.codGeplant && String(p.codGeplant) > db.eegRealisierungsfrist.slice(0, String(p.codGeplant).length)) add("warnung", "eegRealisierungsfrist", "kaufmaennisch", "Geplante Inbetriebnahme liegt nach der Realisierungsfrist des Zuschlags.");
  }
  if (db.ppaPreisCt && db.ppaPreisCt > ERLOESE.ppaCt.max * 1.6) add("warnung", "ppaPreisCt", "kaufmaennisch", `PPA-Preis ${db.ppaPreisCt} ct/kWh deutlich über Marktniveau (${ERLOESE.ppaCt.min}–${ERLOESE.ppaCt.max} ct/kWh) – Struktur (z. B. Baseload) erläutern.`);

  // Wirtschaftlichkeit
  if (db.capexEurKwp && pv) {
    const sp = p?.typ === "agri" ? AGRI.capexProKwp.hoch : p?.typ === "carport" ? CARPORT.capexProKwp : FREIFLAECHE.capexProKwp;
    if (db.capexEurKwp < sp.min * 0.75) add("warnung", "capexEurKwp", "kaufmaennisch", `Capex ${db.capexEurKwp} €/kWp unter der Marktspanne (${sp.min}–${sp.max} €/kWp) – Umfang (Netz, Trafo, Zaun) prüfen.`);
    else if (db.capexEurKwp > sp.max * 1.35) add("warnung", "capexEurKwp", "kaufmaennisch", `Capex ${db.capexEurKwp} €/kWp über der Marktspanne (${sp.min}–${sp.max} €/kWp).`);
  }
  if (db.opexEurKwp && pv && (db.opexEurKwp < 4 || db.opexEurKwp > 25)) add("warnung", "opexEurKwp", "kaufmaennisch", `Opex ${db.opexEurKwp} €/kWp·a außerhalb der üblichen Spanne (rund 6–15 €/kWp·a ohne Pacht).`);
  if (db.irrPct !== undefined && db.irrPct > 14) add("warnung", "irrPct", "kaufmaennisch", `Angegebene Rendite ${db.irrPct} % ist für PV im DACH-Raum sehr hoch – Basis (Projekt/Eigenkapital, vor/nach Steuern) und Annahmen offenlegen.`);

  // Genehmigung: Datumsreihenfolge
  const reihe = [["mAufstellung", "Aufstellungsbeschluss"], ["mBeteiligung", "frühzeitige Beteiligung"], ["mOffenlage", "Offenlage"], ["mSatzung", "Satzungsbeschluss"], ["mBaugenehmigung", "Baugenehmigung"]];
  let vorher = null;
  for (const [id, label] of reihe) {
    if (!db[id]) continue;
    if (db[id] > heuteIso) add("warnung", id, "genehmigung", `${label} liegt in der Zukunft (${db[id]}) – Meilensteine bitte nur mit erreichtem Datum eintragen.`);
    if (vorher && db[id] < vorher[1]) add("fehler", id, "genehmigung", `${label} liegt vor „${vorher[0]}“ – Reihenfolge prüfen.`);
    vorher = [label, db[id]];
  }
  if (phase >= PHASE_IDX("satzung") && db.genehmigungsweg === "bplan" && !db.mSatzung) add("info", "mSatzung", "genehmigung", "Phase „Baurecht“ – Datum des Satzungsbeschlusses ergänzen.");
  if (db.genehmigungsweg === "par35" && p?.land === "DE" && p?.typ === "agri" && Number(p?.flaecheHa) > AGRI.privilegierungHa) add("warnung", "genehmigungsweg", "genehmigung", `Privilegierung für Agri-PV nach § 35 Abs. 1 Nr. 9 BauGB nur bis ${AGRI.privilegierungHa} ha Grundfläche mit Hofbezug – bei ${p.flaecheHa} ha ist in der Regel ein B-Plan nötig.`);
  if (["umwidmung_at"].includes(db.genehmigungsweg) && p?.land !== "AT") add("fehler", "genehmigungsweg", "genehmigung", "Umwidmung Grünland-PV gilt nur für Österreich.");
  if (["bplan", "par35"].includes(db.genehmigungsweg) && p?.land && p.land !== "DE") add("fehler", "genehmigungsweg", "genehmigung", "B-Plan bzw. § 35 BauGB gelten nur für Deutschland.");

  // Bestand
  if (bestand) {
    const reihen = (db.ertraege || []).filter((z) => z.istMwh > 0 && z.prognoseMwh > 0);
    if (reihen.length) {
      const q = reihen.reduce((s, z) => s + z.istMwh, 0) / reihen.reduce((s, z) => s + z.prognoseMwh, 0);
      if (q < 0.92) add("warnung", "ertraege", "ertrag", `Ist-Erträge im Mittel ${Math.round(q * 100)} % der Prognose – Ursachen (Verfügbarkeit, Abregelung, Degradation) erläutern.`);
      else if (q > 1.08) add("info", "ertraege", "ertrag", `Ist-Erträge im Mittel ${Math.round(q * 100)} % der Prognose – Prognosebasis prüfen (konservatives Gutachten?).`);
    }
    if (db.verfuegbarkeitPct !== undefined && db.verfuegbarkeitPct < 97) add("warnung", "verfuegbarkeitPct", "technisch", `Verfügbarkeit ${db.verfuegbarkeitPct} % – üblich sind ≥ 98–99 %. O&M-Leistung und Garantien prüfen.`);
    if (db.eegEnde && db.pachtEnde && db.pachtEnde < db.eegEnde) add("warnung", "pachtEnde", "rechtlich", "Pacht endet vor dem Förderende – Verlängerung sichern, sonst fehlen Förderjahre.");
    if (db.wrTausch === "offen" && db.codDatum && Number(db.codDatum.slice(0, 4)) <= Number(heuteIso.slice(0, 4)) - 8) add("info", "wrTausch", "technisch", "Anlage älter als acht Jahre, Wechselrichtertausch noch nicht geplant – Rücklage einplanen.");
  }
  return h;
}

// ---------------------------------------------------------------- Due-Diligence-Index

/**
 * Zuordnung der Checklisten-Punkte (checkliste.js) zu DD-Kategorien – ein vorhandenes Dokument stärkt die Kategorie.
 */
export const DD_CHECKLISTE = {
  rechtlich: ["pacht", "lageplan"],
  netz: ["netzzusage"],
  genehmigung: ["aufstellung", "satzung", "baugenehmigung"],
  ertrag: ["ertrag"],
  kaufmaennisch: ["eeg"],
  umwelt: ["gutachten"],
  technisch: ["betrieb"],
  steuern: [],
};

/** Typische Prüfpunkte einer Kauf-Due-Diligence je Kategorie (Anzeige im Exposé) */
export const DD_PRUEFPUNKTE = {
  technisch: ["Anlagenkonzept und Komponenten (Bankability der Hersteller)", "DC/AC-Auslegung, Layout, Verschattung", "Bestand: Verfügbarkeit, O&M-Vertrag, Garantien, Wechselrichtertausch"],
  rechtlich: ["Pacht-/Nutzungsverträge aller Flurstücke inkl. Laufzeit und Optionen", "Dingliche Sicherung (Dienstbarkeiten, Rang)", "Gesellschaftsrecht, Change-of-Control-Klauseln"],
  netz: ["Netzzusage mit Leistung, NVP und Befristung", "Kostenvoranschlag, Baukostenzuschuss", "Einspeisebegrenzung, Überbauung, Redispatch"],
  genehmigung: ["B-Plan/Widmung/Baugenehmigung und Bestandskraft", "Auflagen und Fristen", "FNP-Anpassung, Raumordnung"],
  ertrag: ["Unabhängiges Ertragsgutachten P50/P90", "Datenbasis und Unsicherheiten", "Bestand: Ist-Erträge vs. Prognose"],
  kaufmaennisch: ["Vermarktung (EEG-Zuschlag, PPA, Merchant)", "Capex/Opex-Annahmen, Pacht", "Finanzierbarkeit (DSCR auf P90)"],
  steuern: ["Deal-Struktur (Asset/Share), Grunderwerbsteuer", "Umsatzsteuer (Geschäftsveräußerung im Ganzen)", "Gewerbesteuer-Zerlegung, Verlustvorträge"],
  umwelt: ["UVP-Pflicht, Umweltbericht", "Artenschutz, CEF- und Ausgleichsmaßnahmen", "Schutzgebiete, Boden, Wasser"],
};

/**
 * Due-Diligence-Index je Kategorie mit Ampel.
 * ampel: gruen (erwartete Angaben und Unterlagen vollständig, keine Warnung) · gelb (Lücken oder Warnungen) ·
 *        rot (wesentliche Lücken ≥ 50 % oder Widerspruch) · grau (in dieser Phase noch nicht relevant)
 * @param p Projekt mit datenblatt/vertraulich
 * @param checkliste Ausgabe von checklisteProjekt (optional; nur `punkte` mit id/erwartet/vorhanden)
 */
export function ddIndex(p, checkliste = null, { jetzt } = {}) {
  const pruef = datenblattPruefen(p, { jetzt });
  const punkte = checkliste?.punkte || [];
  const out = {};
  for (const [kat, meta] of Object.entries(SCHEMA.dd)) {
    const felder = DATENBLATT_FELDER.filter((f) => f.dd === kat && feldErwartet(p, f));
    const fehlend = felder.filter((f) => !gefuellt(feldWert(p, f)));
    const doks = punkte.filter((x) => DD_CHECKLISTE[kat].includes(x.id) && x.erwartet && x.pflicht !== false);
    const doksFehlend = doks.filter((x) => !x.vorhanden);
    const hinweise = pruef.filter((x) => x.dd === kat);
    const erwartet = felder.length + doks.length;
    const erfuellt = erwartet - fehlend.length - doksFehlend.length;
    const quote = erwartet ? Math.round((erfuellt / erwartet) * 100) : null;
    let ampel = "grau";
    if (erwartet || hinweise.length) {
      if (hinweise.some((x) => x.stufe === "fehler") || (quote !== null && quote < 50)) ampel = "rot";
      else if (hinweise.some((x) => x.stufe === "warnung") || (quote !== null && quote < 100)) ampel = "gelb";
      else ampel = "gruen";
    }
    out[kat] = {
      id: kat,
      label: meta.label,
      text: meta.text,
      ampel,
      quote,
      fehlend: [...fehlend.map((f) => f.label), ...doksFehlend.map((x) => `Unterlage: ${x.label}`)],
      hinweise: hinweise.map((x) => ({ stufe: x.stufe, text: x.text })),
      pruefpunkte: DD_PRUEFPUNKTE[kat],
    };
  }
  const liste = Object.values(out);
  const relevant = liste.filter((k) => k.ampel !== "grau");
  return {
    kategorien: liste,
    gesamt: relevant.length ? (relevant.some((k) => k.ampel === "rot") ? "rot" : relevant.some((k) => k.ampel === "gelb") ? "gelb" : "gruen") : "grau",
    rot: liste.filter((k) => k.ampel === "rot").length,
    gelb: liste.filter((k) => k.ampel === "gelb").length,
    gruen: liste.filter((k) => k.ampel === "gruen").length,
  };
}

/** Kennzahlen für die Anzeige (DC/AC, MWp/ha, P90/P50) */
export function datenblattKennzahlen(p) {
  const db = p?.datenblatt || {};
  const mwp = Number(p?.mwp) || 0;
  const p50 = Number(p?.vertraulich?.ertragKwhKwp) || null;
  return {
    dcAc: mwp && db.mwac ? Math.round((mwp / db.mwac) * 100) / 100 : null,
    mwpProHa: mwp && Number(p?.flaecheHa) ? Math.round((mwp / p.flaecheHa) * 100) / 100 : null,
    p90ZuP50: p50 && db.ertragP90 ? Math.round((db.ertragP90 / p50) * 1000) / 1000 : null,
    ertragRichtwert: p?.typ !== "speicher" ? erwarteterErtrag(p) : null,
    jahresertragP50Mwh: p50 && mwp ? Math.round(p50 * mwp) : null,
    speicherDauerH: db.speicherMw && db.speicherMwh ? Math.round((db.speicherMwh / db.speicherMw) * 10) / 10 : null,
  };
}

/** Anzeige-Wert eines Felds (für Exposé/Datenraum) */
export function feldAnzeige(f, w) {
  if (!gefuellt(w)) return "";
  if (f.typ === "auswahl") return f.optionen.find(([id]) => id === w)?.[1] || String(w);
  if (f.typ === "datum") return `${w.slice(8, 10)}.${w.slice(5, 7)}.${w.slice(0, 4)}`;
  if (f.typ === "zahl") return `${Number(w).toLocaleString("de-DE", { maximumFractionDigits: f.stellen ?? 2 })}${f.einheit ? ` ${f.einheit}` : ""}`;
  if (f.typ === "tabelle") return w.map((z) => `${z.jahr}: ${z.istMwh ?? "–"} / ${z.prognoseMwh ?? "–"} MWh`).join(" · ");
  return String(w);
}
