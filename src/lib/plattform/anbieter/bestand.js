// src/lib/plattform/anbieter/bestand.js
//
// Bestandsanlage (Zweitmarkt) – reine Regeln. Python-Gegenstück: plattform/anbieter_kern.py (Abschnitt „Bestand“).
//
// Käufer bestehender PV-Anlagen bewerten nach Ist-Daten, nicht nach Prognosen: Ertragshistorie je Monat (mit Prognose,
// Einstrahlung, Verfügbarkeit), laufende Verträge (O&M, Direktvermarktung, Versicherung, Pacht …) mit Laufzeit und
// Übertragbarkeit, Förderung/Vermarktung (EEG/EAG/KEV, Anlagenregister, Förderende) und eine technische Due-Diligence-
// Checkliste. Hier werden Eingaben bereinigt und Kennzahlen/Hinweise berechnet (Performance Ratio, spezifischer Ertrag,
// Ist/Prognose, Verfügbarkeit, Datenlücken, rechnerischer Rückgang, auslaufende Verträge, Pacht vor Förderende).
// Richtwerte sind Prüfhinweise („in der Regel“), keine Bewertung – die technische DD bleibt beim Käufer.

import { AnbieterFehler, auswahl, datumOder, istDatum, mehrzeilig, monatePlus, text, zahl } from "./regeln.js";

export const BESTAND_MAX_MONATE = 360;
export const BESTAND_MAX_VERTRAEGE = 30;

export const VERTRAG_ARTEN = {
  om: "Betriebsführung / Wartung (O&M)",
  direktvermarktung: "Direktvermarktung / Stromabnahme (PPA)",
  versicherung: "Versicherung (Allgefahren, Ertragsausfall, Haftpflicht)",
  pacht: "Pacht- / Nutzungsvertrag Fläche bzw. Dach",
  netz: "Netzanschluss- / Einspeisevertrag",
  monitoring: "Fernüberwachung / Datenlogger",
  sicherheit: "Rückbausicherheit (Bürgschaft)",
  sonstiges: "Sonstiger Vertrag",
};
export const UEBERTRAGBAR = {
  ja: "frei übertragbar",
  zustimmung: "Zustimmung des Vertragspartners erforderlich",
  nein: "nicht übertragbar – Neuabschluss nötig",
  unklar: "noch zu prüfen",
};
export const VERMARKTUNG = {
  marktpraemie: "Direktvermarktung mit Marktprämie (DE EEG / AT EAG)",
  einspeiseverguetung: "Feste Einspeisevergütung / Tarifförderung",
  sonstige: "Sonstige Direktvermarktung (ohne Förderung)",
  ppa: "PPA (physisch oder virtuell)",
  eigenverbrauch: "Eigenverbrauch / Mieterstrom / ZEV",
};
/** Bezeichnung des Anlagenregisters je Land */
export const REGISTER_LABEL = {
  DE: "MaStR-Nummer der Einheit (Marktstammdatenregister)",
  AT: "Anlagen- bzw. Vertragsnummer (OeMAG / EAG-Förderstelle)",
  CH: "Projekt- bzw. Anlagennummer (Pronovo / Herkunftsnachweis)",
};

/** Technische Due Diligence Bestandsanlage – übliche Prüfpunkte */
export const BESTAND_DD = [
  { id: "doku", label: "Anlagendokumentation (As-built, Stringpläne, Datenblätter)", pflicht: true },
  { id: "abnahme", label: "Inbetriebnahme- und Abnahmeprotokoll", pflicht: true },
  { id: "netzkonform", label: "Nachweise des Netzbetreibers (z. B. Anlagenzertifikat / Konformität nach VDE-AR-N 4110/4120 in DE)", pflicht: true },
  { id: "monitoring", label: "Monitoring-Zugang bzw. Rohdatenexport der Ertragsdaten", pflicht: true },
  { id: "stoerungen", label: "Störungs- und Wartungshistorie (Tickets, Wartungsprotokolle)", pflicht: true },
  { id: "messung", label: "Thermografie und/oder IV-Kennlinienmessung (aktuell)", pflicht: false },
  { id: "wr", label: "Wechselrichter: Tauschhistorie, Garantien, Ersatzteilstrategie", pflicht: true },
  { id: "module", label: "Modul-Leistungsgarantien und Herstellerstatus", pflicht: false },
  { id: "versicherung", label: "Versicherungsnachweis und Schadenhistorie", pflicht: true },
  { id: "pruefung", label: "Wiederkehrende Prüfung der elektrischen Anlage (z. B. DGUV V3 / E-Check), Blitz- und Brandschutz", pflicht: true },
  { id: "sicherung", label: "Flächensicherung: Nutzungsvertrag, Dienstbarkeit / Servitut, Grundbuch", pflicht: true },
  { id: "rueckbau", label: "Rückbauverpflichtung und Sicherheit", pflicht: false },
  { id: "messkonzept", label: "Messkonzept, Zähler (MaLo/MeLo), Einspeisemanagement / Redispatch", pflicht: false },
];
export const DD_STATUS = { vorhanden: "vorhanden", fehlt: "fehlt", nz: "nicht zutreffend" };

// ---------------------------------------------------------------- Ertragshistorie

const monatOk = (m) => /^(19|20)\d\d-(0[1-9]|1[0-2])$/.test(String(m || ""));

function zahlDe(s, dezimalKomma) {
  let t = String(s ?? "").trim().replace(/\s|%/g, "");
  if (!t) return null;
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (dezimalKomma) t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
function monatDe(s) {
  const t = String(s || "").trim();
  let m = t.match(/^((?:19|20)\d\d)[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/.]((?:19|20)\d\d)$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = t.match(/^((?:19|20)\d\d)-(\d\d)-\d\d$/);
  if (m) return `${m[1]}-${m[2]}`;
  return "";
}

/**
 * CSV/Excel-Text einlesen: Spalten Monat; Ertrag kWh; [Prognose kWh; Einstrahlung kWh/m²; Verfügbarkeit %].
 * Trennzeichen ; oder Tab (dann Dezimalkomma erlaubt) bzw. , (dann Dezimalpunkt). Kopfzeile wird erkannt.
 * Liefert { monate: [...], fehler: ["Zeile 3: …"] }
 */
export function ertragCsvLesen(roh) {
  const zeilen = String(roh || "").replace(/\r\n?/g, "\n").split("\n").map((z) => z.trim()).filter(Boolean).slice(0, BESTAND_MAX_MONATE + 5);
  const monate = [];
  const fehler = [];
  zeilen.forEach((z, i) => {
    const trenner = z.includes(";") ? ";" : z.includes("\t") ? "\t" : ",";
    const sp = z.split(trenner).map((x) => x.trim().replace(/^"|"$/g, ""));
    const monat = monatDe(sp[0]);
    if (!monat) {
      if (i === 0 && /[a-zä]/i.test(z)) return; // Kopfzeile
      fehler.push(`Zeile ${i + 1}: Monat nicht erkannt („${text(sp[0], 20)}“) – erwartet z. B. 2024-05 oder 05.2024`);
      return;
    }
    const dk = trenner !== ",";
    const [ertrag, prognose, einstrahlung, verfuegbarkeit] = sp.slice(1, 5).map((x) => zahlDe(x, dk));
    if (ertrag === null || Number.isNaN(ertrag) || ertrag < 0) {
      fehler.push(`Zeile ${i + 1}: Ertrag (kWh) fehlt oder ist ungültig`);
      return;
    }
    if ([prognose, einstrahlung, verfuegbarkeit].some((x) => Number.isNaN(x))) {
      fehler.push(`Zeile ${i + 1}: Zahl nicht lesbar`);
      return;
    }
    monate.push({ monat, ertragKwh: ertrag, prognoseKwh: prognose ?? null, einstrahlungKwhM2: einstrahlung ?? null, verfuegbarkeitPct: verfuegbarkeit ?? null });
  });
  return { monate: monateBereinigen(monate), fehler: fehler.slice(0, 20) };
}

/** Monatswerte bereinigen, doppelte Monate: letzter Wert gilt; sortiert */
export function monateBereinigen(liste = []) {
  const map = new Map();
  for (const m of Array.isArray(liste) ? liste : []) {
    if (!m || !monatOk(m.monat)) continue;
    const ertrag = zahl(m.ertragKwh, 0, 1e9, 1);
    if (ertrag === null) continue;
    map.set(m.monat, {
      monat: m.monat,
      ertragKwh: ertrag,
      prognoseKwh: zahl(m.prognoseKwh, 0, 1e9, 1),
      einstrahlungKwhM2: zahl(m.einstrahlungKwhM2, 0, 400, 1),
      verfuegbarkeitPct: zahl(m.verfuegbarkeitPct, 0, 100, 2),
    });
  }
  return [...map.values()].sort((a, b) => a.monat.localeCompare(b.monat)).slice(-BESTAND_MAX_MONATE);
}

function monatFolge(von, bis) {
  const out = [];
  let [y, m] = von.split("-").map(Number);
  const [yb, mb] = bis.split("-").map(Number);
  while (y < yb || (y === yb && m <= mb)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (out.length > BESTAND_MAX_MONATE + 12) break;
  }
  return out;
}
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Kennzahlen und Hinweise aus der Ertragshistorie.
 * PR = Ertrag / (kWp × Einstrahlung in Modulebene [kWh/m²]) – nur für Monate mit Einstrahlung.
 */
export function ertragAuswerten(monate = [], { kwp = 0, heute = "" } = {}) {
  const liste = monateBereinigen(monate);
  const hinweise = [];
  if (!liste.length) return { jahre: [], gesamt: null, luecken: [], rueckgangPctJahr: null, hinweise: [{ stufe: "info", text: "Noch keine Ertragshistorie erfasst – Investoren bewerten Bestandsanlagen nach Ist-Daten." }] };
  const vorhanden = new Set(liste.map((m) => m.monat));
  const luecken = monatFolge(liste[0].monat, liste[liste.length - 1].monat).filter((m) => !vorhanden.has(m));
  const jahreMap = new Map();
  for (const m of liste) {
    const j = Number(m.monat.slice(0, 4));
    if (!jahreMap.has(j)) jahreMap.set(j, []);
    jahreMap.get(j).push(m);
  }
  const summe = (arr, f) => arr.reduce((s, x) => s + (x[f] || 0), 0);
  const jahre = [...jahreMap.entries()].map(([jahr, ms]) => {
    const ertrag = summe(ms, "ertragKwh");
    const mitPrognose = ms.filter((x) => x.prognoseKwh);
    const mitStrahlung = ms.filter((x) => x.einstrahlungKwhM2);
    const mitVerf = ms.filter((x) => x.verfuegbarkeitPct !== null && x.verfuegbarkeitPct !== undefined);
    const ertragMitPrognose = summe(mitPrognose, "ertragKwh");
    return {
      jahr,
      monate: ms.length,
      voll: ms.length === 12,
      ertragKwh: r1(ertrag),
      spezErtrag: kwp > 0 ? r1(ertrag / kwp) : null,
      istZuPrognose: mitPrognose.length ? r3(ertragMitPrognose / summe(mitPrognose, "prognoseKwh")) : null,
      pr: kwp > 0 && mitStrahlung.length ? r3(summe(mitStrahlung, "ertragKwh") / (kwp * summe(mitStrahlung, "einstrahlungKwhM2"))) : null,
      verfuegbarkeitPct: mitVerf.length ? Math.round((summe(mitVerf, "verfuegbarkeitPct") / mitVerf.length) * 100) / 100 : null,
    };
  });
  const volle = jahre.filter((j) => j.voll);
  // Rechnerischer Rückgang: lineare Regression des spezifischen Ertrags voller Jahre (ab 3 Jahren), bezogen auf den Mittelwert
  let rueckgangPctJahr = null;
  if (kwp > 0 && volle.length >= 3) {
    const xs = volle.map((j) => j.jahr);
    const ys = volle.map((j) => (j.pr ? j.pr : j.spezErtrag));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const steigung = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    rueckgangPctJahr = my > 0 ? Math.round((-steigung / my) * 1000) / 10 : null;
  }
  const gesamtErtrag = summe(liste, "ertragKwh");
  const mitP = liste.filter((x) => x.prognoseKwh);
  const mitV = liste.filter((x) => x.verfuegbarkeitPct !== null && x.verfuegbarkeitPct !== undefined);
  const mitS = liste.filter((x) => x.einstrahlungKwhM2);
  const gesamt = {
    von: liste[0].monat,
    bis: liste[liste.length - 1].monat,
    monate: liste.length,
    ertragKwh: r1(gesamtErtrag),
    istZuPrognose: mitP.length ? r3(summe(mitP, "ertragKwh") / summe(mitP, "prognoseKwh")) : null,
    pr: kwp > 0 && mitS.length ? r3(summe(mitS, "ertragKwh") / (kwp * summe(mitS, "einstrahlungKwhM2"))) : null,
    verfuegbarkeitPct: mitV.length ? Math.round((summe(mitV, "verfuegbarkeitPct") / mitV.length) * 100) / 100 : null,
    spezErtragVollJahr: kwp > 0 && volle.length ? r1(volle.reduce((s, j) => s + j.spezErtrag, 0) / volle.length) : null,
  };
  const pct = (x) => `${(x * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (!(kwp > 0)) hinweise.push({ stufe: "warnung", text: "Leistung (MWp) im Projekt fehlt – spezifischer Ertrag und Performance Ratio können nicht berechnet werden." });
  if (liste.length < 12) hinweise.push({ stufe: "warnung", text: `Nur ${liste.length} Monate erfasst – für eine belastbare Bewertung sind in der Regel mindestens 12, besser 24–36 Monate üblich.` });
  if (luecken.length) hinweise.push({ stufe: "warnung", text: `Datenlücken: ${luecken.length} Monat(e) ohne Wert (${luecken.slice(0, 6).join(", ")}${luecken.length > 6 ? " …" : ""}) – Ausfälle bitte erläutern.` });
  if (gesamt.istZuPrognose !== null && gesamt.istZuPrognose < 0.92) hinweise.push({ stufe: "warnung", text: `Ist-Ertrag bei ${pct(gesamt.istZuPrognose)} der Prognose – Ursachen (Ausfälle, Abregelung, Verschattung, Prognosegrundlage) erläutern.` });
  if (gesamt.verfuegbarkeitPct !== null && gesamt.verfuegbarkeitPct < 97) hinweise.push({ stufe: "warnung", text: `Mittlere technische Verfügbarkeit ${gesamt.verfuegbarkeitPct.toLocaleString("de-DE")} % – O&M-Verträge sehen üblicherweise 97–99 % vor.` });
  if (gesamt.pr !== null && gesamt.pr < 0.75) hinweise.push({ stufe: "warnung", text: `Performance Ratio ${pct(gesamt.pr)} – für neuere Anlagen liegen Werte in der Regel über 75–80 %. Messort der Einstrahlung (Modulebene?) prüfen.` });
  if (gesamt.pr !== null && gesamt.pr > 1) hinweise.push({ stufe: "fehler", text: `Performance Ratio über 100 % (${pct(gesamt.pr)}) ist physikalisch unplausibel – Einheit der Einstrahlung (kWh/m²) oder Leistung prüfen.` });
  for (const j of volle) {
    if (j.spezErtrag !== null && (j.spezErtrag > 1450 || j.spezErtrag < 550)) hinweise.push({ stufe: "warnung", text: `${j.jahr}: spezifischer Ertrag ${j.spezErtrag.toLocaleString("de-DE")} kWh/kWp liegt außerhalb der für DACH üblichen Spanne – Einheit (kWh) und Leistung prüfen.` });
  }
  if (rueckgangPctJahr !== null && rueckgangPctJahr > 1) hinweise.push({ stufe: "warnung", text: `Rechnerischer Rückgang ${rueckgangPctJahr.toLocaleString("de-DE")} % pro Jahr – deutlich über üblicher Moduldegradation; Ursachen (Wetter, Ausfälle, Verschattung) erläutern.` });
  if (heute && istDatum(heute) && gesamt.bis < monatePlus(heute, -4).slice(0, 7)) hinweise.push({ stufe: "info", text: `Letzter Monatswert ${gesamt.bis} – bitte aktuelle Monate nachtragen.` });
  return { jahre, gesamt, luecken, rueckgangPctJahr, hinweise };
}

// ---------------------------------------------------------------- Verträge, Förderung, DD

function fehler(msg) {
  throw new AnbieterFehler(422, msg);
}

export function vertragBereinigen(d = {}) {
  const art = auswahl(d.art, VERTRAG_ARTEN, "");
  if (!art) fehler("Bitte wählen Sie die Vertragsart.");
  const beginn = datumOder(d.beginn);
  const ende = datumOder(d.ende);
  if (beginn && ende && ende < beginn) fehler(`${VERTRAG_ARTEN[art]}: Ende liegt vor dem Beginn.`);
  return {
    id: text(d.id, 40) || null,
    art,
    partner: text(d.partner, 120),
    beginn,
    ende,
    kuendigungsfristMonate: zahl(d.kuendigungsfristMonate, 0, 120, 0),
    kostenJahr: zahl(d.kostenJahr, 0, 1e9, 0),
    uebertragbar: auswahl(d.uebertragbar, UEBERTRAGBAR, "unklar"),
    changeOfControl: d.changeOfControl === true,
    dokumentId: text(d.dokumentId, 40) || null,
    bemerkung: mehrzeilig(d.bemerkung, 600),
  };
}

/** Förderende: DE-EEG – 20 Jahre, verlängert bis 31.12. des 20. Jahres nach Inbetriebnahme (§ 25 Abs. 1 EEG 2023); sonst manuell */
export function foerderEnde(foerderung = {}, land = "DE") {
  if (foerderung.foerderEndeManuell) return { datum: foerderung.foerderEndeManuell, quelle: "Angabe des Anbieters" };
  if (land === "DE" && istDatum(foerderung.inbetriebnahme) && ["marktpraemie", "einspeiseverguetung"].includes(foerderung.vermarktung)) {
    return { datum: `${Number(foerderung.inbetriebnahme.slice(0, 4)) + 20}-12-31`, quelle: "berechnet: 20 Jahre zzgl. Inbetriebnahmejahr (§ 25 Abs. 1 EEG 2023 bzw. Vorgängerfassungen) – bitte prüfen" };
  }
  return { datum: "", quelle: land === "DE" ? "" : "bitte angeben (Förderdauer je Programm verschieden)" };
}

export function foerderungBereinigen(d = {}, land = "DE") {
  const reg = text(d.register, 40).toUpperCase();
  return {
    inbetriebnahme: datumOder(d.inbetriebnahme),
    register: reg,
    vermarktung: auswahl(d.vermarktung, VERMARKTUNG, ""),
    anzulegenderWertCt: zahl(d.anzulegenderWertCt, 0, 100, 3),
    zuschlagNr: text(d.zuschlagNr, 60),
    direktvermarkter: text(d.direktvermarkter, 120),
    foerderEndeManuell: datumOder(d.foerderEndeManuell),
    redispatch: auswahl(d.redispatch, { ja: 1, nein: 1, nz: 1 }, ""),
    bemerkung: mehrzeilig(d.bemerkung, 600),
    registerFormatOk: land !== "DE" || !reg || /^SEE\d{12}$/.test(reg),
  };
}

export function ddBereinigen(d = {}) {
  const out = {};
  for (const p of BESTAND_DD) {
    const e = d?.[p.id];
    const status = auswahl(e?.status, DD_STATUS, "");
    if (!status) continue;
    out[p.id] = { status, dokumentId: text(e?.dokumentId, 40) || null, bemerkung: text(e?.bemerkung, 200) };
  }
  return out;
}

export function ddStand(dd = {}) {
  const pflichtPunkte = BESTAND_DD.filter((p) => p.pflicht);
  const erfuellt = BESTAND_DD.filter((p) => ["vorhanden", "nz"].includes(dd[p.id]?.status));
  const offenPflicht = pflichtPunkte.filter((p) => !["vorhanden", "nz"].includes(dd[p.id]?.status)).map((p) => p.label);
  return { quote: Math.round((erfuellt.length / BESTAND_DD.length) * 100), offenPflicht, gesamt: BESTAND_DD.length, erfuellt: erfuellt.length };
}

/** Eingabe der Bestands-Akte bereinigen (Teilaktualisierung: nicht übergebene Bereiche bleiben) */
export function bestandBereinigen(eingabe = {}, basis = {}, { land = "DE" } = {}) {
  const out = { ...basis };
  if (eingabe.monate !== undefined) out.monate = monateBereinigen(eingabe.monate);
  if (eingabe.vertraege !== undefined) {
    const l = Array.isArray(eingabe.vertraege) ? eingabe.vertraege.slice(0, BESTAND_MAX_VERTRAEGE) : [];
    out.vertraege = l.map((x, i) => ({ ...vertragBereinigen(x), id: text(x?.id, 40) || `V${i + 1}` }));
  }
  if (eingabe.foerderung !== undefined) out.foerderung = foerderungBereinigen(eingabe.foerderung || {}, land);
  if (eingabe.dd !== undefined) out.dd = ddBereinigen(eingabe.dd || {});
  return out;
}

export function vertraegeHinweise(vertraege = [], { foerderEndeDatum = "", heute = "" } = {}) {
  const h = [];
  const arten = new Set(vertraege.map((v) => v.art));
  if (!arten.has("om")) h.push({ stufe: "warnung", text: "Kein O&M-/Wartungsvertrag erfasst – Käufer fragen Betriebsführung, Reaktionszeiten und Verfügbarkeitsgarantie ab." });
  if (!arten.has("versicherung")) h.push({ stufe: "warnung", text: "Keine Versicherung erfasst." });
  if (!arten.has("pacht")) h.push({ stufe: "info", text: "Kein Pacht-/Nutzungsvertrag erfasst (entfällt nur bei Eigentumsfläche)." });
  for (const v of vertraege) {
    const name = `${VERTRAG_ARTEN[v.art]}${v.partner ? ` (${v.partner})` : ""}`;
    if (heute && v.ende && v.ende < heute) h.push({ stufe: "warnung", text: `${name}: bereits ausgelaufen (${v.ende}).` });
    else if (heute && v.ende && v.ende < monatePlus(heute, 12)) h.push({ stufe: "warnung", text: `${name}: läuft innerhalb von 12 Monaten aus (${v.ende}) – Verlängerung oder Nachfolge klären.` });
    if (v.art === "pacht" && foerderEndeDatum && v.ende && v.ende < foerderEndeDatum) h.push({ stufe: "warnung", text: `${name}: endet vor dem Förderende (${foerderEndeDatum}) – Verlängerungsoption prüfen.` });
    if (v.uebertragbar === "zustimmung" || v.changeOfControl) h.push({ stufe: "info", text: `${name}: Zustimmung des Vertragspartners bzw. Change-of-Control-Klausel – als Vollzugsbedingung (CP) vorsehen.` });
    if (v.uebertragbar === "nein") h.push({ stufe: "warnung", text: `${name}: nicht übertragbar – Neuabschluss vor dem Closing einplanen.` });
  }
  return h;
}

/** Gesamtauswertung für Anzeige und Cockpit */
export function bestandAuswertung(bestand = {}, projekt = {}, heute = "") {
  const kwp = (Number(projekt?.mwp) || 0) * 1000;
  const land = projekt?.land || "DE";
  const fe = foerderEnde(bestand.foerderung || {}, land);
  const f = bestand.foerderung || {};
  const foerderHinweise = [];
  if (!f.inbetriebnahme) foerderHinweise.push({ stufe: "warnung", text: "Inbetriebnahmedatum fehlt." });
  if (!f.vermarktung) foerderHinweise.push({ stufe: "warnung", text: "Vermarktungsform (Marktprämie, Einspeisevergütung, PPA …) fehlt." });
  if (f.register && f.registerFormatOk === false) foerderHinweise.push({ stufe: "warnung", text: "MaStR-Nummer der Einheit hat üblicherweise das Format SEE + 12 Ziffern – bitte prüfen." });
  if (f.vermarktung === "marktpraemie" && !f.direktvermarkter) foerderHinweise.push({ stufe: "info", text: "Direktvermarkter nicht angegeben." });
  if (land === "DE" && kwp >= 100 && !f.redispatch) foerderHinweise.push({ stufe: "info", text: "Redispatch 2.0: Umsetzung für Anlagen ab 100 kW angeben." });
  if (fe.datum && heute && fe.datum < monatePlus(heute, 36)) foerderHinweise.push({ stufe: "warnung", text: `Förderende ${fe.datum} in weniger als drei Jahren – Anschlussvermarktung (PPA, Direktvermarktung) ist wertbestimmend.` });
  return {
    ertrag: ertragAuswerten(bestand.monate || [], { kwp, heute }),
    foerderEnde: fe,
    foerderHinweise,
    vertraegeHinweise: vertraegeHinweise(bestand.vertraege || [], { foerderEndeDatum: fe.datum, heute }),
    dd: ddStand(bestand.dd || {}),
  };
}
