// src/lib/plattform/fach/lastgang.js
//
// Lastgang-Import und -Analyse für Unternehmen (Reststrom-Pool, Contracting). Reine Funktionen ohne Node-Importe –
// im Browser (Vorschau) und auf dem Server (maßgeblich) identisch. Getestet in scripts/plattform-test-fach-kapital.mjs.
//
// Parser (lastgangParsen):
//  - Trennzeichen ; \t , – Dezimalkomma oder -punkt, BOM, Kopf- und Metadatenzeilen (Zählpunkt, Einheit …)
//  - Zeitstempel: „TT.MM.JJJJ hh:mm[:ss]“, „TT.MM.JJ“, „JJJJ-MM-TT[T ]hh:mm[:ss]“ mit oder ohne Offset/Z,
//    Datum und Uhrzeit in getrennten Spalten, Von-/Bis-Spalten (Beginn zählt), Zeitstempel am Intervallende
//  - Einheit aus Kopf/Metadaten: W, kW, MW (Leistungsmittelwert) bzw. Wh, kWh, MWh (Energie je Intervall), OBIS
//    1.29.x = Energie je Periode, 1.4.x/1.5.x = Leistung; sonst Vorgabe des Nutzers, sonst Annahme kW (mit Hinweis)
//  - Zeitumstellung (MEZ/MESZ, EU-Regel – gilt für DE, AT, CH): doppelte Stunde im Oktober wird der Reihe nach
//    MESZ → MEZ zugeordnet; fehlende Stunde im März ist KEINE Lücke. Enthält die Datei Zeiten aus der
//    übersprungenen Stunde, ist sie durchgehend in MEZ (Winterzeit) geführt – dann wird so gerechnet.
//  - Raster 15 min in UTC; Stundenwerte werden auf Viertelstunden verteilt (gleiche Leistung)
//  - Plausibilisierung: Lücken, doppelte Werte, negative Werte, Ausreißer, Nullphasen
//
// Analyse (lastgangAnalyse): Jahresverbrauch (bei < 12 Monaten hochgerechnet), Spitze mit Zeitpunkt,
// Benutzungsstunden, Grund-/Mittagslast, Wochenprofil (7 × 24), Monate, Lastdauerlinie, Anteil Solarstunden,
// PV-Deckungspotenzial je Anlagengröße (Viertelstundensimulation mit Regionsertrag und Monatsverteilung aus
// markt.js, Sonnenstandsprofil wie im Anlagen-Simulator) und Pool-Ersparnis (rechner/reststrom.js).

import { ALLGEMEIN, REGIONEN } from "../../invest/markt.js";
import { berechneReststrom, LASTPROFILE } from "../../rechner/reststrom.js";

const SLOT_MS = 900000;
const TAG_MS = 86400000;
const MAX_ZEILEN = 120000; // > 3 Jahre Viertelstunden

// ---------------------------------------------------------------- Zeit (MEZ/MESZ, EU-Regel)

function letzterSonntagUtc(jahr, monat) {
  const d = new Date(Date.UTC(jahr, monat + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
}
/** Beginn/Ende der Sommerzeit in UTC-ms (01:00 UTC am letzten Sonntag im März/Oktober) */
export function sommerzeitGrenzen(jahr) {
  return { beginn: Date.UTC(jahr, 2, letzterSonntagUtc(jahr, 2), 1), ende: Date.UTC(jahr, 9, letzterSonntagUtc(jahr, 9), 1) };
}
/** Versatz Ortszeit – UTC in Stunden für einen UTC-Zeitpunkt */
export function versatzH(ms) {
  const { beginn, ende } = sommerzeitGrenzen(new Date(ms).getUTCFullYear());
  return ms >= beginn && ms < ende ? 2 : 1;
}
/** Ortszeit-Bestandteile eines UTC-Zeitpunkts */
export function ortszeit(ms) {
  const d = new Date(ms + versatzH(ms) * 3600000);
  return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth(), tag: d.getUTCDate(), stunde: d.getUTCHours(), minute: d.getUTCMinutes(), wochentag: (d.getUTCDay() + 6) % 7 /* 0 = Mo */, datum: d.toISOString().slice(0, 10) };
}

/** Lokale Wandzeit → UTC. `zweite` = zweites Auftreten in der doppelten Oktober-Stunde. Liefert {ms, art} */
function ortszeitZuUtc(j, mo, t, h, mi, { zweite = false, nurMez = false } = {}) {
  const wand = Date.UTC(j, mo, t, h, mi);
  if (nurMez) return { ms: wand - 3600000, art: "normal" };
  const { beginn, ende } = sommerzeitGrenzen(j);
  // übersprungene Stunde im März: Wandzeit 02:00–02:59 existiert nicht
  const sprungVon = beginn + 3600000; // 02:00 MEZ-Wandzeit = beginn + 1 h
  if (wand >= sprungVon && wand < sprungVon + 3600000) return { ms: wand - 3600000, art: "luecke" };
  // doppelte Stunde im Oktober: Wandzeit 02:00–02:59 existiert zweimal
  const doppelVon = ende + 3600000; // 02:00 Wandzeit
  if (wand >= doppelVon && wand < doppelVon + 3600000) return { ms: wand - (zweite ? 3600000 : 7200000), art: "doppelt" };
  const sommer = wand - 7200000 >= beginn && wand - 7200000 < ende;
  return { ms: wand - (sommer ? 7200000 : 3600000), art: "normal" };
}

// ---------------------------------------------------------------- Parser

const RE_DE = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
const RE_ZEIT = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function datumLesen(s) {
  const x = s.trim().replace(/^"|"$/g, "");
  let m = RE_DE.exec(x);
  if (m) {
    const j = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return { j, mo: Number(m[2]) - 1, t: Number(m[1]), h: m[4] !== undefined ? Number(m[4]) : null, mi: m[5] !== undefined ? Number(m[5]) : null, offset: null };
  }
  m = RE_ISO.exec(x);
  if (m) {
    let offset = null;
    if (m[7]) offset = m[7].toUpperCase() === "Z" ? 0 : (m[7][0] === "-" ? -1 : 1) * (Number(m[7].slice(1, 3)) * 60 + Number(m[7].slice(-2)));
    return { j: Number(m[1]), mo: Number(m[2]) - 1, t: Number(m[3]), h: m[4] !== undefined ? Number(m[4]) : null, mi: m[5] !== undefined ? Number(m[5]) : null, offset };
  }
  return null;
}
function zeitLesen(s) {
  const m = RE_ZEIT.exec(s.trim().replace(/^"|"$/g, ""));
  return m ? { h: Number(m[1]), mi: Number(m[2]) } : null;
}
function zahlLesen(s) {
  let x = String(s).trim().replace(/^"|"$/g, "").replace(/\s/g, "");
  if (!x || !/^[+-]?[\d.,]+(e[+-]?\d+)?$/i.test(x)) return null;
  if (x.includes(",") && x.includes(".")) x = x.lastIndexOf(",") > x.lastIndexOf(".") ? x.replace(/\./g, "").replace(",", ".") : x.replace(/,/g, "");
  else if (x.includes(",")) x = x.replace(",", ".");
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Einheit aus einem Text (Kopf, Metadaten) erkennen */
export function einheitErkennen(text) {
  const t = String(text || "").toLowerCase();
  if (/1[.-]29\.\d|1-1:1\.29|\b[12]\.8\.\d\s*\(delta|energie je (periode|intervall)/.test(t)) return "kWh";
  if (/1[.-][45]\.\d|1-1:1\.[45]\b/.test(t)) return "kW";
  if (/\bmwh\b/.test(t)) return "MWh";
  if (/\bkwh\b/.test(t)) return "kWh";
  if (/(^|[^k])\bwh\b/.test(t)) return "Wh";
  if (/\bmw\b/.test(t)) return "MW";
  if (/\bkw\b/.test(t)) return "kW";
  if (/\[w\]|\(w\)|\bin w\b|\bwatt\b/.test(t)) return "W";
  return null;
}
const EINHEITEN = { W: { energie: false, faktor: 0.001 }, kW: { energie: false, faktor: 1 }, MW: { energie: false, faktor: 1000 }, Wh: { energie: true, faktor: 0.001 }, kWh: { energie: true, faktor: 1 }, MWh: { energie: true, faktor: 1000 } };
export const EINHEIT_IDS = Object.keys(EINHEITEN);

function trennzeichen(zeilen) {
  const probe = zeilen.slice(0, 40).join("\n");
  const zaehl = (c) => probe.split(c).length - 1;
  const s = zaehl(";");
  const t = zaehl("\t");
  if (s >= Math.max(t, 1)) return ";";
  if (t >= 1) return "\t";
  return ",";
}

function feldSplit(zeile, sep) {
  if (!zeile.includes('"')) return zeile.split(sep);
  const out = [];
  let akt = "";
  let inQ = false;
  for (const c of zeile) {
    if (c === '"') inQ = !inQ;
    else if (c === sep && !inQ) {
      out.push(akt);
      akt = "";
    } else akt += c;
  }
  out.push(akt);
  return out;
}

/**
 * CSV-Text eines Lastgangs parsen.
 * @param {string} text
 * @param {{einheit?: string}} optionen einheit = Vorgabe des Nutzers (W|kW|MW|Wh|kWh|MWh), überschreibt die Erkennung
 * @returns {{ok, fehler?, startMs, kw: number[] (NaN = Lücke), n, intervallMin, einheit, einheitQuelle, zeitbasis, hinweise, statistik}}
 */
export function lastgangParsen(text, { einheit: vorgabe = null } = {}) {
  const roh = String(text || "").replace(/^﻿/, "");
  const zeilen = roh.split(/\r?\n/).map((z) => z.trimEnd()).filter((z) => z.trim());
  if (zeilen.length < 10) return { ok: false, fehler: "Die Datei enthält zu wenige Zeilen für einen Lastgang." };
  if (zeilen.length > MAX_ZEILEN) return { ok: false, fehler: `Die Datei ist zu groß (mehr als ${MAX_ZEILEN.toLocaleString("de-DE")} Zeilen). Bitte höchstens drei Jahre hochladen.` };
  const sep = trennzeichen(zeilen);
  const hinweise = [];

  // Kopf- und Metadatenzeilen sammeln (alles vor der ersten Datenzeile)
  let kopf = "";
  let kopfFelder = null;
  let erste = -1;
  for (let i = 0; i < Math.min(zeilen.length, 60); i++) {
    const f = feldSplit(zeilen[i], sep);
    if (datumLesen(f[0] || "") && f.slice(1).some((x) => zahlLesen(x) !== null)) {
      erste = i;
      break;
    }
    kopf += ` ${zeilen[i]}`;
    if (f.length >= 2) kopfFelder = f.map((x) => x.trim().replace(/^"|"$/g, ""));
  }
  if (erste < 0) return { ok: false, fehler: "Keine Datenzeilen erkannt. Erwartet: Datum/Uhrzeit in der ersten Spalte und ein Messwert (z. B. „01.01.2025 00:15;12,5“)." };

  // Spaltenaufbau aus der ersten Datenzeile
  const probe = feldSplit(zeilen[erste], sep).map((x) => x.trim());
  const d0 = datumLesen(probe[0]);
  let zeitSpalte = -1;
  let endeSpalte = -1;
  let spalte = 1;
  if (d0.h === null) {
    if (zeitLesen(probe[1] || "")) {
      zeitSpalte = 1;
      spalte = 2;
      if (zeitLesen(probe[2] || "")) {
        endeSpalte = 2;
        spalte = 3;
      }
    } else return { ok: false, fehler: "Uhrzeit fehlt – erwartet wird ein Viertelstunden- oder Stundenwert je Zeile." };
  } else if (probe[1] && datumLesen(probe[1])?.h !== null && datumLesen(probe[1])) {
    endeSpalte = 1; // Von-/Bis-Zeitstempel
    spalte = 2;
  } else if (zeitLesen(probe[1] || "")) {
    endeSpalte = 1; // „01.01.2025 00:00;00:15;Wert“
    spalte = 2;
  }
  // Wertspalte: Kopf mit Einheit/Stichwort bevorzugen, sonst erste Zahl nach den Zeitspalten
  let wertSpalte = -1;
  if (kopfFelder) {
    const idx = kopfFelder.findIndex((k, i) => i >= spalte && /(kwh|kw|mwh|\bmw\b|\bwh\b|\bw\b|wert|leistung|verbrauch|energie|bezug|1\.29|1\.5\.0|1\.4\.0)/i.test(k));
    if (idx >= 0 && zahlLesen(probe[idx] ?? "") !== null) wertSpalte = idx;
  }
  if (wertSpalte < 0) wertSpalte = probe.findIndex((x, i) => i >= spalte && zahlLesen(x) !== null);
  if (wertSpalte < 0) return { ok: false, fehler: "Keine Messwert-Spalte gefunden." };

  // Einheit
  const kopfEinheit = kopfFelder?.[wertSpalte] ? einheitErkennen(kopfFelder[wertSpalte]) || einheitErkennen(kopf) : einheitErkennen(kopf);
  let einheit = kopfEinheit;
  let einheitQuelle = kopfEinheit ? "datei" : "annahme";
  if (vorgabe && EINHEITEN[vorgabe]) {
    if (kopfEinheit && kopfEinheit !== vorgabe) hinweise.push({ stufe: "warnung", text: `In der Datei steht „${kopfEinheit}“, gewählt wurde „${vorgabe}“ – es wird mit „${vorgabe}“ gerechnet.` });
    einheit = vorgabe;
    einheitQuelle = "vorgabe";
  }
  if (!einheit) {
    einheit = "kW";
    hinweise.push({ stufe: "warnung", text: "Einheit nicht erkannt – die Werte werden als Leistungsmittelwerte in kW gelesen. Wählen Sie sonst die Einheit aus (z. B. kWh je Viertelstunde)." });
  }
  const endeBeschriftet = /\b(bis|ende|intervallende|end)\b/i.test(kopfFelder?.[0] || "") && endeSpalte < 0;

  // Zeilen lesen (Ortszeit oder mit Offset)
  const roheWerte = [];
  let fehlerZeilen = 0;
  for (let i = erste; i < zeilen.length; i++) {
    const f = feldSplit(zeilen[i], sep);
    const d = datumLesen(f[0] || "");
    const w = zahlLesen(f[wertSpalte] ?? "");
    if (!d || w === null) {
      fehlerZeilen++;
      continue;
    }
    let h = d.h;
    let mi = d.mi;
    if (zeitSpalte >= 0) {
      const z = zeitLesen(f[zeitSpalte] || "");
      if (!z) {
        fehlerZeilen++;
        continue;
      }
      h = z.h;
      mi = z.mi;
    }
    if (h === 24 && mi === 0) {
      // 24:00 = Intervallende am Tagesende
      const n = new Date(Date.UTC(d.j, d.mo, d.t + 1));
      roheWerte.push({ j: n.getUTCFullYear(), mo: n.getUTCMonth(), t: n.getUTCDate(), h: 0, mi: 0, offset: d.offset, w });
    } else roheWerte.push({ j: d.j, mo: d.mo, t: d.t, h, mi, offset: d.offset, w });
  }
  if (roheWerte.length < 96) return { ok: false, fehler: "Zu wenige gültige Messwerte (mindestens ein Tag in Viertelstunden)." };
  if (fehlerZeilen > roheWerte.length * 0.05) hinweise.push({ stufe: "warnung", text: `${fehlerZeilen} Zeilen konnten nicht gelesen werden und wurden übersprungen.` });

  // Zeitbasis: Datei mit Offsets → exakt; sonst MEZ/MESZ. Zeiten aus der übersprungenen März-Stunde → durchgehend MEZ.
  const mitOffset = roheWerte.every((r) => r.offset !== null);
  let nurMez = false;
  if (!mitOffset) {
    for (const r of roheWerte) {
      const { art } = ortszeitZuUtc(r.j, r.mo, r.t, r.h, r.mi);
      if (art === "luecke") {
        nurMez = true;
        break;
      }
    }
  }

  // Intervall erkennen (Median der Abstände der Wandzeiten)
  const wand = roheWerte.slice(0, 2000).map((r) => Date.UTC(r.j, r.mo, r.t, r.h, r.mi));
  const abst = [];
  for (let i = 1; i < wand.length; i++) if (wand[i] > wand[i - 1]) abst.push(wand[i] - wand[i - 1]);
  abst.sort((a, b) => a - b);
  const median = abst[Math.floor(abst.length / 2)] || SLOT_MS;
  const intervallMin = Math.round(median / 60000);
  if (![15, 30, 60].includes(intervallMin)) return { ok: false, fehler: `Zeitraster ${intervallMin} Minuten wird nicht unterstützt (erwartet 15 oder 60 Minuten).` };
  const intervallMs = intervallMin * 60000;

  // Intervallende-Beschriftung: erster Wert eines Tages bei 00:15 (bzw. 01:00) → um ein Intervall zurück
  const tagesbeginn = roheWerte.find((r, i) => i > 0 && r.t !== roheWerte[i - 1].t);
  const endeZeit = endeBeschriftet || (tagesbeginn && tagesbeginn.h * 60 + tagesbeginn.mi === intervallMin) || (roheWerte[0].h * 60 + roheWerte[0].mi === intervallMin && roheWerte.some((r) => r.h === 0 && r.mi === 0));
  if (endeZeit) hinweise.push({ stufe: "info", text: "Zeitstempel bezeichnen das Intervallende – die Werte wurden dem jeweiligen Intervallbeginn zugeordnet." });

  // In UTC umrechnen; doppelte Oktober-Stunde der Reihe nach zuordnen
  const e = EINHEITEN[einheit];
  const umrechnung = e.energie ? e.faktor * (60 / intervallMin) : e.faktor; // → kW
  const gesehen = new Set();
  const punkte = [];
  let dstDoppelt = 0;
  let dstLuecke = 0;
  const dstTage = new Set();
  for (const r of roheWerte) {
    let ms;
    if (mitOffset) ms = Date.UTC(r.j, r.mo, r.t, r.h, r.mi) - r.offset * 60000;
    else {
      const key = `${r.j}-${r.mo}-${r.t}-${r.h}-${r.mi}`;
      const zweite = gesehen.has(key);
      gesehen.add(key);
      const u = ortszeitZuUtc(r.j, r.mo, r.t, r.h, r.mi, { zweite, nurMez });
      ms = u.ms;
      if (u.art === "doppelt") {
        dstTage.add(`${r.j}-${String(r.mo + 1).padStart(2, "0")}-${String(r.t).padStart(2, "0")}`);
        if (zweite) dstDoppelt++;
      }
    }
    if (endeZeit) ms -= intervallMs;
    punkte.push({ ms, kw: r.w * umrechnung });
  }
  punkte.sort((a, b) => a.ms - b.ms);
  // Zählerstände statt Intervallwerte? (nahezu monoton steigend und stark anwachsend)
  if (punkte.length > 200) {
    let steigend = 0;
    for (let i = 1; i < punkte.length; i++) if (punkte[i].kw > punkte[i - 1].kw) steigend++; // streng steigend (konstante Last zählt nicht)
    const erster = punkte[0].kw;
    const letzter = punkte[punkte.length - 1].kw;
    if (steigend / (punkte.length - 1) > 0.9 && letzter - erster > 100) {
      return { ok: false, fehler: "Die Datei enthält offenbar Zählerstände (fortlaufend steigend) statt Viertelstundenwerten. Bitte den Lastgang (Leistung bzw. Energie je Intervall) exportieren." };
    }
  }
  if (!mitOffset && !nurMez) {
    // Sommerzeitbeginn im Zeitraum: fehlende Stunde ist erwartet (keine Lücke)
    const jahre = new Set(punkte.map((p) => new Date(p.ms).getUTCFullYear()));
    for (const j of jahre) {
      const { beginn } = sommerzeitGrenzen(j);
      if (punkte[0].ms < beginn && punkte[punkte.length - 1].ms > beginn) {
        dstLuecke++;
        dstTage.add(new Date(beginn).toISOString().slice(0, 10));
      }
    }
  }
  const start = Math.floor(punkte[0].ms / SLOT_MS) * SLOT_MS;
  const ende = Math.floor(punkte[punkte.length - 1].ms / SLOT_MS) * SLOT_MS + intervallMs;
  const n = Math.round((ende - start) / SLOT_MS);
  if (n > 3 * 366 * 96 + 96) return { ok: false, fehler: "Zeitraum länger als drei Jahre – bitte kürzen." };
  const kw = new Array(n).fill(NaN);
  let doppelt = 0;
  const jeSlot = intervallMin / 15;
  for (const p of punkte) {
    const i0 = Math.round((p.ms - start) / SLOT_MS);
    for (let k = 0; k < jeSlot; k++) {
      const i = i0 + k;
      if (i < 0 || i >= n) continue;
      if (!Number.isNaN(kw[i])) {
        if (k === 0) doppelt++;
        continue;
      }
      kw[i] = p.kw;
    }
  }

  // Plausibilisierung
  const gueltig = kw.filter((x) => !Number.isNaN(x));
  const luecken = n - gueltig.length;
  const negativ = gueltig.filter((x) => x < 0).length;
  const sortiert = [...gueltig].sort((a, b) => a - b);
  const med = sortiert[Math.floor(sortiert.length / 2)] || 0;
  const ausreisser = med > 0 ? gueltig.filter((x) => x > med * 25).length : 0;
  let nullLauf = 0;
  let maxNull = 0;
  for (const x of kw) {
    if (x === 0) maxNull = Math.max(maxNull, ++nullLauf);
    else nullLauf = 0;
  }
  if (luecken) hinweise.push({ stufe: luecken > n * 0.02 ? "warnung" : "info", text: `${luecken.toLocaleString("de-DE")} Viertelstunden fehlen (${((luecken / n) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %) – sie werden in der Analyse nicht mitgerechnet, der Jahresverbrauch wird hochgerechnet.` });
  if (doppelt) hinweise.push({ stufe: "warnung", text: `${doppelt} doppelte Zeitstempel außerhalb der Zeitumstellung – jeweils der erste Wert wurde verwendet.` });
  if (negativ) hinweise.push({ stufe: "warnung", text: `${negativ} negative Werte – enthält die Datei Einspeisung? Für den Reststrom zählt nur der Bezug.` });
  if (ausreisser) hinweise.push({ stufe: "warnung", text: `${ausreisser} Werte über dem 25-Fachen des Medians – Einheit (W statt kW?) oder Messfehler prüfen.` });
  if (maxNull >= 96 * 3) hinweise.push({ stufe: "info", text: `Längste Phase ohne Verbrauch: ${Math.round(maxNull / 96)} Tage (Betriebsruhe oder Messausfall?).` });
  if (nurMez) hinweise.push({ stufe: "info", text: "Die Datei ist durchgehend in Winterzeit (MEZ) geführt – so wurde gerechnet." });
  if (mitOffset) hinweise.push({ stufe: "info", text: "Zeitstempel mit Zeitzonenangabe erkannt – exakte Zuordnung ohne Zeitumstellungsregel." });
  else if (!nurMez && dstTage.size) hinweise.push({ stufe: "info", text: `Zeitumstellung berücksichtigt (${[...dstTage].sort().map((t) => t.split("-").reverse().join(".")).join(", ")}).` });

  return {
    ok: true,
    startMs: start,
    n,
    kw,
    intervallMin,
    einheit,
    einheitQuelle,
    zeitbasis: mitOffset ? "offset" : nurMez ? "mez" : "mez_mesz",
    hinweise,
    statistik: { zeilen: roheWerte.length, fehlerZeilen, luecken, doppelt, dstDoppelt, dstLuecke, negativ, ausreisser, maxNullTage: Math.round(maxNull / 96) },
  };
}

// ---------------------------------------------------------------- PV-Simulation (typisches Jahr)

const REGION_GEO = { "de-nord": [53.6, 10], "de-ost": [51.8, 12.5], "de-west": [50.7, 7.5], "de-sued": [48.4, 10.9], at: [47.9, 13.8], ch: [47.2, 8.0] };
const profilCache = new Map();
/** Sonnenstandsprofil eines UTC-Tages (96 Gewichte, Summe 1) – wie im Anlagen-Simulator */
function sonnenprofil(regionId, doy) {
  const k = `${regionId}|${doy}`;
  if (profilCache.has(k)) return profilCache.get(k);
  const [lat, lon] = REGION_GEO[regionId] || REGION_GEO["de-sued"];
  const phi = (lat * Math.PI) / 180;
  const dekl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const w = new Float64Array(96);
  let s = 0;
  for (let i = 0; i < 96; i++) {
    const utcH = (i + 0.5) * 0.25;
    const ha = ((utcH + lon / 15 - 12) * 15 * Math.PI) / 180;
    const sinEl = Math.sin(phi) * Math.sin(dekl) + Math.cos(phi) * Math.cos(dekl) * Math.cos(ha);
    w[i] = sinEl > 0.02 ? sinEl : 0; // Dach/Gewerbe: breites Profil
    s += w[i];
  }
  if (s > 0) for (let i = 0; i < 96; i++) w[i] /= s;
  profilCache.set(k, w);
  return w;
}

/** PV-Leistung (kW) je Viertelstunde für das Raster eines Lastgangs; spezErtrag in kWh/kWp·a */
export function pvReihe(startMs, n, kwp, { regionId = "de-sued", spezErtrag } = {}) {
  const region = REGIONEN.find((r) => r.id === regionId) || REGIONEN[3];
  const jahr = kwp * (spezErtrag || Math.round(region.ertrag * 0.9)); // Gewerbedach: ~ 90 % des Freiflächen-Richtwerts
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ms = startMs + i * SLOT_MS;
    const d = new Date(ms);
    const tag0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const doy = Math.floor((tag0 - Date.UTC(d.getUTCFullYear(), 0, 1)) / TAG_MS) + 1;
    const tageMonat = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const tagKwh = (jahr * (ALLGEMEIN.pvMonatsanteile?.[d.getUTCMonth()] ?? 1 / 12)) / tageMonat;
    const slot = Math.floor((ms - tag0) / SLOT_MS);
    out[i] = Math.min(kwp * 0.85, (tagKwh * sonnenprofil(regionId, doy)[slot]) / 0.25);
  }
  return out;
}

// ---------------------------------------------------------------- Analyse

function quantil(sortiert, q) {
  if (!sortiert.length) return 0;
  const i = Math.min(sortiert.length - 1, Math.max(0, Math.round(q * (sortiert.length - 1))));
  return sortiert[i];
}
const rund = (x, s = 0) => Math.round(x * 10 ** s) / 10 ** s;

/**
 * Analyse eines geparsten Lastgangs.
 * @param {object} g Ergebnis von lastgangParsen (ok)
 * @param {{regionId?, pvKwp?, bestandPvKwp?, preisCt?, produzierend?}} o
 */
export function lastgangAnalyse(g, { regionId = "de-sued", pvKwp = null, bestandPvKwp = 0, preisCt = 20, produzierend = false } = {}) {
  const { kw, startMs, n } = g;
  const woche = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const wocheN = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const monate = new Array(12).fill(0);
  const monateN = new Array(12).fill(0);
  let summeKwh = 0;
  let gueltig = 0;
  let spitze = -Infinity;
  let spitzeMs = startMs;
  let solarKwh = 0;
  let wochenendeKwh = 0;
  let mittagSumme = 0;
  let mittagN = 0;
  const werte = [];
  for (let i = 0; i < n; i++) {
    const x = kw[i];
    if (Number.isNaN(x)) continue;
    const v = Math.max(0, x);
    const ms = startMs + i * SLOT_MS;
    const o = ortszeit(ms);
    gueltig++;
    summeKwh += v / 4;
    werte.push(v);
    if (v > spitze) {
      spitze = v;
      spitzeMs = ms;
    }
    woche[o.wochentag][o.stunde] += v;
    wochenN_add(wocheN, o.wochentag, o.stunde);
    monate[o.monat] += v / 4;
    monateN[o.monat]++;
    if (o.stunde >= 8 && o.stunde < 17) solarKwh += v / 4;
    if (o.wochentag >= 5) wochenendeKwh += v / 4;
    if (o.wochentag < 5 && o.stunde >= 11 && o.stunde < 14) {
      mittagSumme += v;
      mittagN++;
    }
  }
  const tageAbgedeckt = gueltig / 96;
  const faktorJahr = tageAbgedeckt > 0 ? 365 / tageAbgedeckt : 0;
  const jahresKwh = summeKwh * faktorJahr;
  werte.sort((a, b) => a - b);
  const grundlast = quantil(werte, 0.05);
  const benutzungsstunden = spitze > 0 ? jahresKwh / spitze : 0;
  const tagAnteil = summeKwh > 0 ? solarKwh / summeKwh : 0;
  const mittagslast = mittagN ? mittagSumme / mittagN : 0;
  const profil = LASTPROFILE.reduce((best, p) => (Math.abs(p.tag - tagAnteil) < Math.abs(best.tag - tagAnteil) ? p : best), LASTPROFILE[0]);
  const lastdauer = Array.from({ length: 21 }, (_, k) => rund(quantil(werte, 1 - k / 20), 1));

  // PV-Deckungspotenzial: Varianten je Anlagengröße (Vielfache der Mittagslast) plus gewünschte Größe
  const basis = Math.max(10, mittagslast);
  const groessen = [...new Set([0.5, 1, 1.5, 2].map((f) => Math.max(10, Math.round((basis * f) / 10) * 10)).concat(pvKwp > 0 ? [Math.round(pvKwp)] : []))].sort((a, b) => a - b);
  const pv = groessen.map((kwp) => {
    const reihe = pvReihe(startMs, n, kwp, { regionId });
    let erzeugt = 0;
    let ev = 0;
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(kw[i])) continue;
      erzeugt += reihe[i] / 4;
      ev += Math.min(reihe[i], Math.max(0, kw[i])) / 4;
    }
    erzeugt *= faktorJahr;
    ev *= faktorJahr;
    return { kwp, erzeugungKwh: Math.round(erzeugt), eigenverbrauchKwh: Math.round(ev), evQuote: erzeugt > 0 ? rund(ev / erzeugt, 3) : 0, autarkie: jahresKwh > 0 ? rund(ev / jahresKwh, 3) : 0 };
  });
  // Empfehlung: größte Variante mit Eigenverbrauchsquote ≥ 70 %
  const empfehlung = [...pv].reverse().find((x) => x.evQuote >= 0.7) || pv[0];
  const gewaehlt = pvKwp > 0 ? pv.find((x) => x.kwp === Math.round(pvKwp)) : empfehlung;

  // Pool-Ersparnis auf den Reststrom (nach der gewählten bzw. empfohlenen PV)
  const reststromKwh = Math.max(0, jahresKwh - (gewaehlt?.eigenverbrauchKwh || 0));
  const pool = berechneReststrom({ verbrauchMwh: reststromKwh / 1000, preisCt, profil: profil.id, pvKwp: 0, pvBestand: true, produzierend });

  return {
    zeitraum: { von: new Date(startMs).toISOString(), bis: new Date(startMs + n * SLOT_MS).toISOString(), tage: rund(tageAbgedeckt, 1), hochgerechnet: tageAbgedeckt < 360, abdeckung: rund(gueltig / n, 3) },
    verbrauchKwh: Math.round(summeKwh),
    jahresverbrauchKwh: Math.round(jahresKwh),
    spitzeKw: rund(spitze, 1),
    spitzeAm: new Date(spitzeMs).toISOString(),
    spitzeOrtszeit: (() => {
      const o = ortszeit(spitzeMs);
      return `${o.datum.split("-").reverse().join(".")} ${String(o.stunde).padStart(2, "0")}:${String(o.minute).padStart(2, "0")}`;
    })(),
    benutzungsstunden: Math.round(benutzungsstunden),
    grundlastKw: rund(grundlast, 1),
    mittagslastKw: rund(mittagslast, 1),
    mittelKw: rund(gueltig ? (summeKwh * 4) / gueltig : 0, 1),
    tagAnteil: rund(tagAnteil, 3),
    wochenendeAnteil: rund(summeKwh ? wochenendeKwh / summeKwh : 0, 3),
    lastprofil: { id: profil.id, label: profil.label },
    wochenprofil: woche.map((r, t) => r.map((s, h) => rund(wocheN[t][h] ? s / wocheN[t][h] : 0, 1))),
    monate: monate.map((m, i) => ({ monat: i + 1, kwh: Math.round(m), vollstaendig: monateN[i] >= 26 * 96 })),
    lastdauerlinie: lastdauer,
    pv: { varianten: pv, empfehlungKwp: empfehlung?.kwp || null, gewaehltKwp: gewaehlt?.kwp || null, regionId, bestandKwp: bestandPvKwp || 0 },
    pool: {
      reststromKwh: Math.round(reststromKwh),
      preisCt,
      ersparnisEurMin: Math.round(pool.gesamt.eurMin),
      ersparnisEurMax: Math.round(pool.gesamt.eurMax),
      ctMin: rund(pool.gesamt.ctMin, 2),
      ctMax: rund(pool.gesamt.ctMax, 2),
      stromsteuerEur: pool.stromsteuer ? Math.round(pool.stromsteuer.eur) : null,
      preisUnplausibel: pool.preisUnplausibel,
      klein: pool.klein,
    },
  };
}
function wochenN_add(m, t, h) {
  m[t][h]++;
}

/** Kompakte Zusammenfassung für Vorgang/Angebotsanfrage (flach, ≤ 60 Felder) */
export function analyseKurz(a) {
  return {
    jahresverbrauchKwh: a.jahresverbrauchKwh,
    spitzeKw: a.spitzeKw,
    benutzungsstunden: a.benutzungsstunden,
    grundlastKw: a.grundlastKw,
    mittagslastKw: a.mittagslastKw,
    tagAnteilPct: Math.round(a.tagAnteil * 100),
    lastprofil: a.lastprofil.label,
    pvEmpfehlungKwp: a.pv.empfehlungKwp,
    reststromKwh: a.pool.reststromKwh,
    poolErsparnisEur: `${a.pool.ersparnisEurMin}–${a.pool.ersparnisEurMax}`,
    zeitraumTage: a.zeitraum.tage,
  };
}
