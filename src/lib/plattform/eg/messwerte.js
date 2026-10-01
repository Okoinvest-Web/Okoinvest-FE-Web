// src/lib/plattform/eg/messwerte.js
//
// WP3 „Energiedaten“: Viertelstunden-Messreihen je Zählpunkt als TAGESBLÖCKE (Fachkonzept 3.12) – reine Funktionen,
// client- und serverseitig. Python-Spiegel 1:1: plattform/eg_energie_kern.py (Testvektoren testdaten/energie/*.json).
//
// Regeln:
//  - Ein Block = Zählpunkt × Gemeinschaft × Lokaldatum (Europe/Vienna) × Größe. Beginn in UTC; 96 Werte, am Tag der
//    Umstellung auf Sommerzeit 92, auf Normalzeit 100 (Fachkonzept 3.12). Keine Zeilen je Viertelstunde in der Datenbank.
//  - Werte in kWh, volle Präzision wie geliefert; gerundet wird erst auf Periodenebene (Fachkonzept 4.4).
//  - Qualität je Wert: L1 Echtwert, L2 belastbarer Ersatzwert, L3 nicht belastbar und NICHT abrechenbar (HA II 2.3.1, 13.1).
//  - Spätere Lieferungen ersetzen frühere (Historie bleibt); eine L3-Nachlieferung überschreibt aber keinen L1/L2-Wert
//    (Auslegung, zu bestätigen).
//  - Maßgeblich für die Abrechnung sind die Werte des Netzbetreibers (ElWG § 71 Abs. 1 und 4); CSV/Excel-Importe aus den
//    Netzbetreiber-Portalen sind der Ausweichweg, wenn EDA (CR_MSG) fehlt.
// Zeitrechnung ohne Intl (identisch in Python): MEZ = UTC+1, MESZ = UTC+2 vom letzten Sonntag im März 01:00 UTC bis zum
// letzten Sonntag im Oktober 01:00 UTC (Richtlinie 2000/84/EG).

import { MitgliedFehler } from "../mitglied/basis.js";
import { MESS_GROESSEN, MESS_QUALITAET } from "./modell.js";

export const QH_MS = 900000;
const H_MS = 3600000;
const TAG_MS = 86400000;
export const GROESSEN = Object.keys(MESS_GROESSEN);
export const GROESSEN_VERBRAUCH = GROESSEN.filter((g) => MESS_GROESSEN[g].richtung === "verbrauch");
export const GROESSEN_ERZEUGUNG = GROESSEN.filter((g) => MESS_GROESSEN[g].richtung === "erzeugung");
export const QUALITAETEN = Object.keys(MESS_QUALITAET);
export const MAX_HISTORIE = 10;
export const CSV_MAX_ZEILEN = 45000;

export const energieFehler = (msg, feld = "", status = 422) => new MitgliedFehler(msg, status, feld);

// ---------------------------------------------------------------- Zahlen

/** Kaufmännisch runden (wie Python-Spiegel, unabhängig von Math.round-Eigenheiten bei negativen Zahlen) */
export function rund(x, stellen = 3) {
  const f = 10 ** stellen;
  const v = Number(x) || 0;
  return (v < 0 ? -1 : 1) * Math.floor(Math.abs(v) * f + 0.5 + 1e-9) / f;
}
export const summe = (a) => {
  let s = 0;
  for (const x of a || []) if (x !== null && x !== undefined) s += x;
  return s;
};

/** Deterministischer Zufall (mulberry32) – identisch in Python, für Demo-Daten und Wettervariation der Simulation */
export function zufall(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Stabiler 32-Bit-Hash einer Zeichenkette (FNV-1a) */
export function hash32(s) {
  let h = 0x811c9dc5;
  const t = String(s);
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- Zeit (Europe/Vienna)

const zwei = (n) => String(n).padStart(2, "0");
const ymd = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
};
function letzterSonntagMs(jahr, monat0) {
  const letzter = Date.UTC(jahr, monat0 + 1, 0);
  const wt = new Date(letzter).getUTCDay();
  return letzter - wt * TAG_MS;
}
/** Beginn und Ende der Sommerzeit eines Jahres in UTC-Millisekunden */
export function sommerzeitUtc(jahr) {
  return [letzterSonntagMs(jahr, 2) + H_MS, letzterSonntagMs(jahr, 9) + H_MS];
}
/** Versatz Lokalzeit − UTC in Minuten (60 oder 120) */
export function versatzMin(ms) {
  const [a, b] = sommerzeitUtc(new Date(ms).getUTCFullYear());
  return ms >= a && ms < b ? 120 : 60;
}
export const gueltigerTag = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || "")) && ymd(Date.parse(`${t}T00:00:00Z`)) === t;
const tagMs = (tag) => Date.parse(`${String(tag).slice(0, 10)}T00:00:00Z`);
export const plusTag = (tag, n = 1) => ymd(tagMs(tag) + n * TAG_MS);
export const tageZwischen = (a, b) => Math.round((tagMs(b) - tagMs(a)) / TAG_MS);
/** Wochentag 0 = Montag … 6 = Sonntag */
export const wochentag = (tag) => (new Date(tagMs(tag)).getUTCDay() + 6) % 7;
export const monatVon = (tag) => String(tag).slice(0, 7);
export function tageImMonat(monat) {
  const [j, m] = String(monat).split("-").map(Number);
  return new Date(Date.UTC(j, m, 0)).getUTCDate();
}
export function tageDesMonats(monat) {
  const n = tageImMonat(monat);
  const out = [];
  for (let d = 1; d <= n; d++) out.push(`${monat}-${zwei(d)}`);
  return out;
}
export function monatPlus(monat, n) {
  const [j, m] = String(monat).split("-").map(Number);
  const x = j * 12 + (m - 1) + n;
  return `${Math.floor(x / 12)}-${zwei((x % 12) + 1)}`;
}
/** Beginn des Lokaltags (00:00 Wien) in UTC-Millisekunden */
export function tagBeginnMs(tag) {
  const mitternachtUtc = tagMs(tag);
  return mitternachtUtc - versatzMin(mitternachtUtc - 2 * H_MS) * 60000;
}
export const tagBeginnUtc = (tag) => new Date(tagBeginnMs(tag)).toISOString();
/** Viertelstunden eines Lokaltags: 96, bei Umstellung 92 bzw. 100 */
const WJT = new Map();
export function werteJeTag(tag) {
  let n = WJT.get(tag);
  if (n === undefined) {
    n = Math.round((tagBeginnMs(plusTag(tag)) - tagBeginnMs(tag)) / QH_MS);
    if (WJT.size > 5000) WJT.clear();
    WJT.set(tag, n);
  }
  return n;
}
/** Lokalzeit „JJJJ-MM-TTTHH:MM“ eines UTC-Zeitpunkts */
export function lokalZeit(ms) {
  const l = ms + versatzMin(ms) * 60000;
  const d = new Date(l);
  return `${ymd(l)}T${zwei(d.getUTCHours())}:${zwei(d.getUTCMinutes())}`;
}
export const lokalTag = (ms) => lokalZeit(ms).slice(0, 10);
/** Lokalzeit der i-ten Viertelstunde eines Tages (Beginn des Intervalls) */
export const viertelstundeLokal = (tag, i) => lokalZeit(tagBeginnMs(tag) + i * QH_MS);
/** Lokale Stunde (0–23) und Minute der i-ten Viertelstunde */
export function stundeVon(tag, i) {
  const z = viertelstundeLokal(tag, i);
  return Number(z.slice(11, 13)) + Number(z.slice(14, 16)) / 60;
}

/**
 * Lokale Wanduhrzeit → UTC-ms. `zweites`: bei doppelter Stunde (Ende der Sommerzeit) die zweite (MEZ).
 * Gibt null zurück, wenn die Uhrzeit nicht existiert (Beginn der Sommerzeit 02:00–02:59).
 */
export function lokalNachUtc(tag, stunde, minute, zweites = false) {
  const basis = tagMs(tag) + stunde * H_MS + minute * 60000;
  const kandidaten = [basis - 120 * 60000, basis - 60 * 60000].filter((u) => lokalZeit(u) === `${tag}T${zwei(stunde)}:${zwei(minute)}`);
  if (!kandidaten.length) return null;
  return kandidaten.length === 2 && zweites ? kandidaten[1] : kandidaten[0];
}

// ---------------------------------------------------------------- Tagesblöcke

const leer = (n) => Array.from({ length: n }, () => null);
const qualitaetGueltig = (q) => (QUALITAETEN.includes(q) ? q : "");

/** Kennzahlen eines Blocks: Summe, Anzahl, fehlende Werte, L3-Anteil, vollständig, abrechenbar */
export function blockKennzahlen(b) {
  const soll = werteJeTag(b.tag);
  let s = 0;
  let ist = 0;
  let l3 = 0;
  let l2 = 0;
  let max = 0;
  for (let i = 0; i < soll; i++) {
    const w = b.werte[i];
    if (w === null || w === undefined) continue;
    ist++;
    s += w;
    if (w > max) max = w;
    if (b.qualitaet[i] === "L3") l3++;
    else if (b.qualitaet[i] === "L2") l2++;
  }
  return { summeKwh: s, soll, ist, fehlend: soll - ist, l3, l2, anteilL3: soll ? l3 / soll : 0, vollstaendig: ist === soll, abrechenbar: ist === soll && l3 === 0, maxKw: max * 4 };
}

/**
 * Block prüfen und normalisieren. Werte: Zahl ≥ 0 oder null (fehlend); negative Werte werden abgelehnt (Plausibilität
 * HA II), Länge muss zur Zahl der Viertelstunden des Tages passen.
 */
export function blockBereinigen(d = {}) {
  const tag = String(d.tag || "").slice(0, 10);
  if (!gueltigerTag(tag)) throw energieFehler("Ungültiger Tag (JJJJ-MM-TT).", "tag");
  if (!GROESSEN.includes(d.groesse)) throw energieFehler(`Unbekannte Größe „${d.groesse}“.`, "groesse");
  const n = werteJeTag(tag);
  const roh = Array.isArray(d.werte) ? d.werte : [];
  if (roh.length !== n) throw energieFehler(`Der ${tag} hat ${n} Viertelstunden, geliefert wurden ${roh.length}.`, "werte");
  const werte = roh.map((w, i) => {
    if (w === null || w === undefined || w === "") return null;
    const x = Number(w);
    if (!Number.isFinite(x)) throw energieFehler(`Ungültiger Wert in Viertelstunde ${i + 1}.`, "werte");
    if (x < 0) throw energieFehler(`Negativer Wert in Viertelstunde ${i + 1} (${tag}) – nicht plausibel.`, "werte");
    return x;
  });
  const q = Array.isArray(d.qualitaet) ? d.qualitaet : [];
  const qualitaet = werte.map((w, i) => (w === null ? "" : qualitaetGueltig(q[i]) || "L1"));
  const b = {
    zaehlpunktId: String(d.zaehlpunktId || ""),
    gemeinschaftId: String(d.gemeinschaftId || ""),
    tag,
    beginnUtc: tagBeginnUtc(tag),
    groesse: d.groesse,
    werte,
    qualitaet,
    quelle: { art: String(d.quelle?.art || "eda"), nachrichtId: String(d.quelle?.nachrichtId || ""), messageId: String(d.quelle?.messageId || ""), datei: String(d.quelle?.datei || "") },
    empfangenAm: String(d.empfangenAm || ""),
    version: Number(d.version) || 1,
    historie: Array.isArray(d.historie) ? d.historie.slice(-MAX_HISTORIE) : [],
  };
  return { ...b, ...blockKennzahlen(b) };
}

/**
 * Neue Lieferung in einen vorhandenen Block einarbeiten: Werte der neuen Lieferung ersetzen die alten, eine L3-Lieferung
 * überschreibt aber keinen L1/L2-Wert. Historie behält die Vorversion (Quelle, Summe, Zeitpunkt).
 * @returns {{block, geaendert:number, konflikte:number}}
 */
export function bloeckeZusammenfuehren(alt, neu, { am = "" } = {}) {
  if (!alt) return { block: { ...neu, ...blockKennzahlen(neu) }, geaendert: neu.werte.filter((w) => w !== null).length, konflikte: 0 };
  const werte = alt.werte.slice();
  const qualitaet = alt.qualitaet.slice();
  let geaendert = 0;
  let konflikte = 0;
  for (let i = 0; i < werte.length; i++) {
    const w = neu.werte[i];
    if (w === null || w === undefined) continue;
    const qa = qualitaet[i];
    const qn = neu.qualitaet[i] || "L1";
    if (qn === "L3" && (qa === "L1" || qa === "L2")) {
      konflikte++;
      continue;
    }
    if (werte[i] !== w || qa !== qn) geaendert++;
    werte[i] = w;
    qualitaet[i] = qn;
  }
  const altK = blockKennzahlen(alt);
  const historie = geaendert ? [...(alt.historie || []), { version: alt.version || 1, am: alt.empfangenAm || am, quelle: alt.quelle, summeKwh: altK.summeKwh, anteilL3: altK.anteilL3 }].slice(-MAX_HISTORIE) : alt.historie || [];
  const block = { ...alt, werte, qualitaet, quelle: geaendert ? neu.quelle : alt.quelle, empfangenAm: geaendert ? neu.empfangenAm || am : alt.empfangenAm, erstEmpfangenAm: alt.erstEmpfangenAm || alt.empfangenAm || "", version: (alt.version || 1) + (geaendert ? 1 : 0), historie };
  return { block: { ...block, ...blockKennzahlen(block) }, geaendert, konflikte };
}

/**
 * EDA-Payload (Ereignis eg.energiedaten.empfangen, modell.js EgEnergiedatenPayload) in Tagesblöcke zerlegen.
 * `von`: UTC-Zeitpunkt des ersten Werts (Viertelstundenraster). Teilweise gelieferte Tage enthalten null an den übrigen Stellen.
 */
export function payloadZerlegen(p = {}, { zaehlpunktId = "", gemeinschaftId = "", am = "" } = {}) {
  const von = Date.parse(String(p.von || ""));
  if (!Number.isFinite(von)) throw energieFehler("Payload ohne gültigen Beginn (von).", "von");
  if (von % QH_MS !== 0) throw energieFehler("Beginn liegt nicht im Viertelstundenraster.", "von");
  const reihen = Array.isArray(p.reihen) ? p.reihen : [];
  if (!reihen.length) throw energieFehler("Payload ohne Messreihen.", "reihen");
  const tage = new Map();
  for (const r of reihen) {
    if (!GROESSEN.includes(r.groesse)) throw energieFehler(`Unbekannte Größe „${r.groesse}“.`, "reihen");
    const werte = Array.isArray(r.werte) ? r.werte : [];
    if (werte.length > 400 * 100) throw energieFehler("Zu viele Werte in einer Lieferung.", "reihen");
    for (let i = 0; i < werte.length; i++) {
      const ms = von + i * QH_MS;
      const tag = lokalTag(ms);
      const k = `${tag}|${r.groesse}`;
      if (!tage.has(k)) tage.set(k, { tag, groesse: r.groesse, werte: leer(werteJeTag(tag)), qualitaet: leer(werteJeTag(tag)).map(() => "") });
      const b = tage.get(k);
      const idx = Math.round((ms - tagBeginnMs(tag)) / QH_MS);
      b.werte[idx] = werte[i] === null || werte[i] === undefined ? null : Number(werte[i]);
      b.qualitaet[idx] = b.werte[idx] === null ? "" : qualitaetGueltig(r.qualitaet?.[i]) || "L1";
    }
  }
  const quelle = { art: "eda", nachrichtId: String(p.nachrichtId || ""), messageId: String(p.messageId || "") };
  return [...tage.values()].sort((a, b) => (a.tag + a.groesse).localeCompare(b.tag + b.groesse)).map((b) => blockBereinigen({ ...b, zaehlpunktId, gemeinschaftId, quelle, empfangenAm: am }));
}

// ---------------------------------------------------------------- Aggregation (Monatswerte, Perioden – Grundlage für WP4)

/**
 * Monatswerte je Zählpunkt, Gemeinschaft, Größe und Monat (DocType Plattform EG Messmonat).
 * @returns {Object[]} {zaehlpunktId, gemeinschaftId, groesse, monat, summeKwh, werteSoll, werteIst, l3, anteilL3, tage, vollstaendig, abrechenbar, maxKw}
 */
export function monatswerte(bloecke = []) {
  const m = new Map();
  for (const b of bloecke) {
    const monat = monatVon(b.tag);
    const k = `${b.zaehlpunktId}|${b.gemeinschaftId}|${b.groesse}|${monat}`;
    if (!m.has(k)) m.set(k, { zaehlpunktId: b.zaehlpunktId, gemeinschaftId: b.gemeinschaftId, groesse: b.groesse, monat, summeKwh: 0, werteSoll: 0, werteIst: 0, l3: 0, tage: 0, maxKw: 0 });
    const x = m.get(k);
    const kz = blockKennzahlen(b);
    x.summeKwh += kz.summeKwh;
    x.werteIst += kz.ist;
    x.l3 += kz.l3;
    x.tage += 1;
    if (kz.maxKw > x.maxKw) x.maxKw = kz.maxKw;
  }
  return [...m.values()].map((x) => {
    const soll = tageDesMonats(x.monat).reduce((s, t) => s + werteJeTag(t), 0);
    return { ...x, werteSoll: soll, anteilL3: soll ? x.l3 / soll : 0, vollstaendig: x.werteIst === soll, abrechenbar: x.werteIst === soll && x.l3 === 0 };
  }).sort((a, b) => (a.zaehlpunktId + a.groesse + a.monat).localeCompare(b.zaehlpunktId + b.groesse + b.monat));
}

/**
 * Periodensummen je Zählpunkt (Eingang für WP4, enPeriodenwerte). `preisFenster(lokalZeit)` (optional) liefert einen
 * Schlüssel (z. B. "ETF-…|Z1") je Viertelstunde – dann zusätzlich Summen je Tarif/Zeitfenster (TOU, Fachkonzept 4.5).
 * Vollständig heißt: jeder Tag der Periode liegt für jede gelieferte Größe ohne Lücke vor; L3-Anteil über alle Werte.
 */
export function periodenSummen(bloecke = [], { von, bis, preisFenster = null } = {}) {
  const tage = [];
  for (let t = von; t <= bis; t = plusTag(t)) tage.push(t);
  const soll = tage.reduce((s, t) => s + werteJeTag(t), 0);
  const zp = new Map();
  for (const b of bloecke) {
    if (b.tag < von || b.tag > bis) continue;
    const k = `${b.zaehlpunktId}|${b.gemeinschaftId}`;
    if (!zp.has(k)) zp.set(k, { zaehlpunktId: b.zaehlpunktId, gemeinschaftId: b.gemeinschaftId, groessen: {}, ist: {}, l3: 0, werte: 0, fenster: {} });
    const x = zp.get(k);
    const kz = blockKennzahlen(b);
    x.groessen[b.groesse] = (x.groessen[b.groesse] || 0) + kz.summeKwh;
    x.ist[b.groesse] = (x.ist[b.groesse] || 0) + kz.ist;
    x.l3 += kz.l3;
    x.werte += kz.soll;
    if (preisFenster) {
      const beginn = tagBeginnMs(b.tag);
      for (let i = 0; i < b.werte.length; i++) {
        const w = b.werte[i];
        if (w === null) continue;
        const f = preisFenster(lokalZeit(beginn + i * QH_MS)) || "";
        if (!x.fenster[f]) x.fenster[f] = {};
        x.fenster[f][b.groesse] = (x.fenster[f][b.groesse] || 0) + w;
      }
    }
  }
  return [...zp.values()].map((x) => ({
    zaehlpunktId: x.zaehlpunktId,
    gemeinschaftId: x.gemeinschaftId,
    groessen: x.groessen,
    nachFenster: preisFenster ? x.fenster : undefined,
    vollstaendig: Object.keys(x.groessen).length > 0 && Object.values(x.ist).every((n) => n === soll),
    anteilL3: x.werte ? x.l3 / x.werte : 0,
    werteSoll: soll,
  }));
}

/** Tagesblöcke zu einer Reihe über mehrere Tage (für Diagramme); fehlende Tage als null */
export function reiheAusBloecken(bloecke = [], { von, bis, groesse }) {
  const by = new Map(bloecke.filter((b) => b.groesse === groesse).map((b) => [b.tag, b]));
  const werte = [];
  const zeiten = [];
  for (let t = von; t <= bis; t = plusTag(t)) {
    const n = werteJeTag(t);
    const b = by.get(t);
    for (let i = 0; i < n; i++) {
      werte.push(b ? b.werte[i] : null);
      zeiten.push(viertelstundeLokal(t, i));
    }
  }
  return { werte, zeiten };
}

/** Viertelstunden zu Stundensummen (für Diagramme und Exporte) */
export function stundenwerte(werte = []) {
  const out = [];
  for (let i = 0; i < werte.length; i += 4) {
    let s = 0;
    let n = 0;
    for (let j = i; j < i + 4 && j < werte.length; j++) if (werte[j] !== null && werte[j] !== undefined) {
      s += werte[j];
      n++;
    }
    out.push(n ? s : null);
  }
  return out;
}

// ---------------------------------------------------------------- CSV-/Excel-Import (Netzbetreiber-Portale, Ausweichweg)

/** Spaltenerkennung: Reihenfolge wichtig (spezifisch vor allgemein). Bezeichnungen typischer Portal-Exporte (zu bestätigen je NB) */
export const CSV_SPALTEN = [
  { groesse: "eigendeckung_ee", muster: ["eigendeckung aus erneuerbaren", "eigendeckung ee", "erneuerbar"] },
  { groesse: "eigendeckung", muster: ["eigendeckung", "gemeinschaftlich bezogen", "bezug aus der gemeinschaft", "bezug gemeinschaft", "eeg-bezug", "eg-bezug", "gemeinschaftsanteil", "anteil gemeinschaft"] },
  { groesse: "anteil_erzeugung", muster: ["anteil an der erzeugung", "anteil erzeugung", "zugeteilt", "zuteilung"] },
  { groesse: "restueberschuss", muster: ["restüberschuss", "restueberschuss", "überschuss", "ueberschuss", "netzeinspeisung"] },
  { groesse: "verbrauch_tf", muster: ["verbrauch × tf", "verbrauch x tf", "verbrauch mit teilnahmefaktor", "verbrauch tf"] },
  { groesse: "erzeugung_tf", muster: ["erzeugung × tf", "erzeugung x tf", "erzeugung mit teilnahmefaktor", "erzeugung tf"] },
  { groesse: "verbrauch_gemessen", muster: ["verbrauch", "bezug", "1.8.0", "wirkenergie +a", "+a"] },
  { groesse: "erzeugung_gemessen", muster: ["einspeisung", "erzeugung", "lieferung", "2.8.0", "wirkenergie -a", "-a"] },
];
const ZEIT_VON = ["zeit von", "von", "beginn", "start", "messzeitpunkt", "zeitstempel", "timestamp", "datum/uhrzeit", "datum uhrzeit", "zeitpunkt"];
const ZEIT_BIS = ["zeit bis", "bis", "ende"];
const DATUM = ["datum", "tag", "date"];
const UHRZEIT = ["uhrzeit", "zeit", "time"];
const ENDE_SPALTE = /(zeit|stempel|datum|timestamp).*(bis|ende)|(bis|ende).*(zeit|stempel)/;
const QUALI = ["qualität", "qualitaet", "status", "messmethode", "kennzeichen", "metering"];
const IGNORIEREN = ["restnetz", "rest-netz", "reststrom", "zählerstand", "zaehlerstand"];
const ZP_MUSTER = /AT\d{11}[0-9A-Z]{20}/;

const norm = (s) => String(s || "").replace(/^﻿/, "").trim().replace(/^"|"$/g, "").toLowerCase();
const passt = (kopf, liste) => liste.some((m) => kopf === m || kopf.startsWith(`${m} `) || kopf.startsWith(`${m}(`) || kopf.includes(m));

function trennzeichen(zeile) {
  const z = { ";": 0, "\t": 0, ",": 0 };
  let inQ = false;
  for (const c of zeile) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && c in z) z[c]++;
  }
  return z["\t"] >= z[";"] && z["\t"] > 0 ? "\t" : z[";"] > 0 ? ";" : z[","] > 0 ? "," : ";";
}
function zerlegen(zeile, t) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inQ && zeile[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === t && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}
/** Zahl mit Dezimalkomma bzw. -punkt (1.234,5 · 1234,5 · 1234.5) */
export function zahlLesen(s) {
  let t = String(s ?? "").trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",") && t.includes(".")) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.split(".").join("").replace(",", ".") : t.split(",").join("");
  else if (t.includes(",")) t = t.replace(",", ".");
  const x = Number(t);
  return Number.isFinite(x) ? x : null;
}
/** Datum und Uhrzeit lesen → {tag, h, m} (Lokalzeit) oder {utcMs} bei ISO mit Zone */
export function zeitLesen(datumText, zeitText = "") {
  const s = `${String(datumText || "").trim()} ${String(zeitText || "").trim()}`.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})\D(\d{2})(?:\D\d{2}(?:\.\d+)?)?(Z|\+\d{2}\D?\d{2}|-\d{2}\D?\d{2})$/);
  if (m) {
    const ms = Date.parse(s.replace(" ", "T"));
    return Number.isFinite(ms) ? { utcMs: ms } : null;
  }
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})\D+(\d{1,2})\D(\d{2})/) || null;
  let j;
  let mo;
  let d;
  let h;
  let mi;
  if (m) {
    d = Number(m[1]);
    mo = Number(m[2]);
    j = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    h = Number(m[4]);
    mi = Number(m[5]);
  } else {
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\D+(\d{1,2})\D(\d{2})/);
    if (!m) return null;
    j = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
    h = Number(m[4]);
    mi = Number(m[5]);
  }
  const tag = `${j}-${zwei(mo)}-${zwei(d)}`;
  if (!gueltigerTag(tag)) return null;
  if (h === 24 && mi === 0) return { tag: plusTag(tag), h: 0, m: 0 };
  if (h > 23 || mi > 59) return null;
  return { tag, h, m: mi };
}

/**
 * CSV- bzw. Excel-Export (Kopieren aus Excel = Tabulator) eines Netzbetreiber-Portals lesen.
 * Erkennt Trennzeichen, Kopfzeile (auch nach Vorspann mit Zählpunktnummer), Zeit-Spalten (Beginn bzw. Ende des
 * Intervalls), Wert-Spalten je Größe, Einheit kW (× 0,25) und Qualitätsspalte (L1/L2/L3, „Ersatzwert“, „vorläufig“).
 * Doppelte Stunde am Ende der Sommerzeit: erstes Auftreten MESZ, zweites MEZ.
 * @returns {{zaehlpunktnummer, reihen:[{groesse, spalte, einheit, punkte:[{ms, wert, qualitaet}]}], fehler:[{zeile,text}], hinweise[], zeilen, von, bis}}
 */
export function csvParsen(text, { zaehlpunktnummer = "" } = {}) {
  const zeilen = String(text || "").replace(/^﻿/, "").split(/\r\n|\n|\r/);
  if (zeilen.length > CSV_MAX_ZEILEN + 50) throw energieFehler(`Die Datei hat mehr als ${CSV_MAX_ZEILEN} Zeilen – bitte in Monatsdateien aufteilen.`, "csv");
  const hinweise = [];
  const fehler = [];
  let zpNr = String(zaehlpunktnummer || "").replace(/\s/g, "").toUpperCase();
  let kopfIdx = -1;
  let t = ";";
  let kopf = [];
  for (let i = 0; i < Math.min(zeilen.length, 40); i++) {
    const z = zeilen[i];
    if (!zpNr) {
      const m = z.replace(/\s/g, "").toUpperCase().match(ZP_MUSTER);
      if (m) zpNr = m[0];
    }
    const tt = trennzeichen(z);
    const zellen = zerlegen(z, tt).map(norm);
    const hatZeit = zellen.some((c) => passt(c, ZEIT_VON) || passt(c, DATUM) || passt(c, ZEIT_BIS));
    const hatWert = zellen.some((c) => CSV_SPALTEN.some((s) => passt(c, s.muster)) || c.includes("kwh") || c === "wert" || c.startsWith("wert"));
    if (hatZeit && hatWert && zellen.length >= 2) {
      kopfIdx = i;
      t = tt;
      kopf = zellen;
      break;
    }
  }
  if (kopfIdx < 0) throw energieFehler("Keine Kopfzeile mit Zeit- und Wertspalte gefunden (z. B. „Datum;Zeit von;Verbrauch (kWh)“).", "csv");
  // Spalten zuordnen
  const genutzt = new Set();
  const finde = (liste, ausser = []) => kopf.findIndex((c, i) => !genutzt.has(i) && !ausser.some((a) => c.includes(a)) && passt(c, liste));
  const iVon = kopf.findIndex((c) => ZEIT_VON.some((m) => c === m || c.startsWith(m)) && !c.includes("bis"));
  const iBis = kopf.findIndex((c, i) => i !== iVon && (ZEIT_BIS.some((m) => c === m || c.startsWith(m)) || ENDE_SPALTE.test(c)));
  const iDatum = kopf.findIndex((c, i) => i !== iVon && i !== iBis && DATUM.some((m) => c === m || c.startsWith(m)) && !c.includes("uhr"));
  const iUhr = kopf.findIndex((c, i) => i !== iVon && i !== iBis && i !== iDatum && UHRZEIT.some((m) => c === m || c.startsWith(m)));
  [iVon, iBis, iDatum, iUhr].forEach((i) => i >= 0 && genutzt.add(i));
  const iQ = finde(QUALI);
  if (iQ >= 0) genutzt.add(iQ);
  const reihen = [];
  for (const s of CSV_SPALTEN) {
    const i = kopf.findIndex((c, j) => !genutzt.has(j) && !IGNORIEREN.some((x) => c.includes(x)) && passt(c, s.muster));
    if (i < 0) continue;
    genutzt.add(i);
    const kopfText = kopf[i];
    const einheit = /kwh/.test(kopfText) ? "kWh" : /\bkw\b|\(kw\)/.test(kopfText) ? "kW" : "kWh";
    reihen.push({ groesse: s.groesse, spalte: i, einheit, punkte: [] });
  }
  if (!reihen.length) {
    const i = kopf.findIndex((c, j) => !genutzt.has(j) && (c.includes("kwh") || c.startsWith("wert")));
    if (i >= 0) {
      reihen.push({ groesse: "verbrauch_gemessen", spalte: i, einheit: "kWh", punkte: [] });
      hinweise.push("Spalte ohne erkennbare Größe – als „Verbrauch laut Messung“ übernommen. Bitte prüfen.");
    }
  }
  if (!reihen.length) throw energieFehler("Keine Wertspalte erkannt.", "csv");
  if (reihen.some((r) => r.einheit === "kW")) hinweise.push("Leistungswerte (kW) wurden in Viertelstunden-Energie (kWh = kW × 0,25) umgerechnet.");
  const endeStempel = iVon < 0 && iBis >= 0 && iDatum < 0 ? true : iVon < 0 && iDatum >= 0 && iUhr < 0 && iBis >= 0;
  if (endeStempel) hinweise.push("Zeitstempel bezeichnen das Ende des Intervalls – auf den Beginn umgerechnet.");
  const gesehen = new Map();
  let von = null;
  let bis = null;
  let n = 0;
  for (let z = kopfIdx + 1; z < zeilen.length; z++) {
    const roh = zeilen[z];
    if (!roh.trim()) continue;
    const c = zerlegen(roh, t);
    let zt = null;
    if (iVon >= 0) zt = zeitLesen(c[iVon]) || (iDatum >= 0 ? zeitLesen(c[iDatum], c[iVon]) : null);
    else if (iDatum >= 0 && iUhr >= 0) zt = zeitLesen(c[iDatum], c[iUhr]);
    else if (iBis >= 0) zt = zeitLesen(c[iBis]) || (iDatum >= 0 ? zeitLesen(c[iDatum], c[iBis]) : null);
    else if (iDatum >= 0) zt = zeitLesen(c[iDatum]);
    if (!zt) {
      if (n === 0 && z < kopfIdx + 3) continue; // Einheitenzeile o. Ä.
      fehler.push({ zeile: z + 1, text: "Zeitpunkt nicht lesbar." });
      continue;
    }
    let ms;
    if (zt.utcMs !== undefined) ms = zt.utcMs;
    else {
      const k = `${zt.tag}T${zwei(zt.h)}:${zwei(zt.m)}`;
      const zweites = gesehen.has(k);
      ms = lokalNachUtc(zt.tag, zt.h, zt.m, zweites);
      gesehen.set(k, true);
      if (ms === null) {
        fehler.push({ zeile: z + 1, text: `Uhrzeit ${zwei(zt.h)}:${zwei(zt.m)} existiert am ${zt.tag} nicht (Beginn der Sommerzeit).` });
        continue;
      }
    }
    if (endeStempel) ms -= QH_MS;
    if (ms % QH_MS !== 0) {
      fehler.push({ zeile: z + 1, text: "Zeitpunkt liegt nicht im Viertelstundenraster." });
      continue;
    }
    const qText = iQ >= 0 ? norm(c[iQ]) : "";
    const q = /l3|vorläufig|vorlaeufig|nicht belastbar|ungültig/.test(qText) ? "L3" : /l2|ersatz|geschätzt|geschaetzt|schätz/.test(qText) ? "L2" : "L1";
    let ok = false;
    for (const r of reihen) {
      const w = zahlLesen(c[r.spalte]);
      if (w === null) continue;
      if (w < 0) {
        fehler.push({ zeile: z + 1, text: `Negativer Wert (${MESS_GROESSEN[r.groesse].label}).` });
        continue;
      }
      r.punkte.push({ ms, wert: r.einheit === "kW" ? w * 0.25 : w, qualitaet: q });
      ok = true;
    }
    if (ok) {
      n++;
      if (von === null || ms < von) von = ms;
      if (bis === null || ms > bis) bis = ms;
    }
  }
  if (!n) throw energieFehler("Keine Messwerte gefunden.", "csv");
  if (iQ < 0) hinweise.push("Keine Qualitätsspalte – Werte als L1 (Echtwert) übernommen. Maßgeblich bleiben die EDA-Daten des Netzbetreibers.");
  return { zaehlpunktnummer: zpNr, reihen, fehler: fehler.slice(0, 200), fehlerAnzahl: fehler.length, hinweise, zeilen: n, von: von === null ? "" : new Date(von).toISOString(), bis: bis === null ? "" : new Date(bis + QH_MS).toISOString() };
}

/** Ergebnis von csvParsen in Tagesblöcke (Quelle „csv“) */
export function csvZuBloecken(erg, { zaehlpunktId = "", gemeinschaftId = "", datei = "", am = "" } = {}) {
  const tage = new Map();
  for (const r of erg.reihen) {
    for (const p of r.punkte) {
      const tag = lokalTag(p.ms);
      const k = `${tag}|${r.groesse}`;
      if (!tage.has(k)) tage.set(k, { tag, groesse: r.groesse, werte: leer(werteJeTag(tag)), qualitaet: leer(werteJeTag(tag)).map(() => "") });
      const b = tage.get(k);
      const idx = Math.round((p.ms - tagBeginnMs(tag)) / QH_MS);
      b.werte[idx] = (b.werte[idx] || 0) + p.wert;
      b.qualitaet[idx] = p.qualitaet;
    }
  }
  return [...tage.values()].sort((a, b) => (a.tag + a.groesse).localeCompare(b.tag + b.groesse)).map((b) => blockBereinigen({ ...b, zaehlpunktId, gemeinschaftId, quelle: { art: "csv", datei }, empfangenAm: am }));
}
