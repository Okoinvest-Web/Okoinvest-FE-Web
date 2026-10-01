// src/lib/plattform/backend/demo/eg-energie.js
//
// Demo-Backend WP3 „Energiedaten, Verteilung, Simulation und Prognose“ – Referenz für plattform/api/eg_energie.py.
// Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP3). Regeln: src/lib/plattform/eg/{messwerte,qualitaet,verteilung,
// simulation,prognose,optimierung,speicher}.js.
//
// Daten: Die Demo-Gemeinschaften bekommen synthetische 15-Minuten-Werte über 13 Monate, die bei Bedarf deterministisch
// erzeugt werden (eg-energie-seed.js, nichts davon wird gespeichert). Gespeichert werden nur echte Eingänge – EDA-Lieferungen
// (enEnergiedatenEmpfangen) und CSV-/Excel-Importe – als Tagesblöcke in db.egEnergie.bloecke; sie ersetzen die
// synthetischen Werte des Tages (Historie bleibt im Block). Monatsaggregate werden im Speicher zwischengespeichert.
//
// Rechte (eg/rechte.js, je Gemeinschaft):
//   qh_aggregiert ≥ 1   Summen der Gemeinschaft, Datenqualität, Abweichungsbericht, Prognose
//   qh_einzeln ≥ 1      Viertelstundenwerte einzelner Zählpunkte – jede Einsicht wird protokolliert (Zweckbindung,
//                       DSGVO Art. 5 Abs. 1 lit. b); Mitglieder sehen eigene Zählpunkte (eigene_daten)
//   abrechnung_vorschau Periodenwerte für WP4 (System immer)
//   stammdaten 2        CSV-Import ausführen (1 = Vorschau)
//   eda_ausloesen 2     Reklamation/Nachforderung CR_REQ_PT (über WP2 edaNachforderung)
//   Simulation          mit Gemeinschaft: stammdaten ≥ 1; ohne: Backoffice Bereich „eg“ (speichern: schreiben)
//   Energiedaten-Eingang nur System bzw. Backoffice „eg“ schreiben

import { PlattformFehler, nichtGefunden, verboten } from "../../fehler";
import { darfLesen, darfSchreiben } from "../../rechte";
import { MESS_GROESSEN, TEILNAHME_ZAEHLT } from "../../eg/modell";
import { egStufe } from "../../eg/rechte";
import { netzentgeltRegel } from "../../eg/netzentgelt";
import { preisFuer, tarifAm } from "../../eg/tarif";
import { QH_MS, blockBereinigen, blockKennzahlen, bloeckeZusammenfuehren, csvParsen, csvZuBloecken, lokalZeit, monatPlus, monatVon, payloadZerlegen, plusTag, rund, tageDesMonats, tageZwischen, werteJeTag } from "../../eg/messwerte";
import { AMPEL, QUALITAET_REGELN, gemeinschaftPruefen, lieferstatistik, qualitaetsZusammenfassung, reklamationsFaelle, reklamationsText, tagesAmpel } from "../../eg/qualitaet";
import { nbAbgleich, sozialquote } from "../../eg/verteilung";
import { SIM_STANDARD, apReduziert, lastprofil, pvJahr, simulationRechnen, simulationSaat, spezErtragStandard } from "../../eg/simulation";
import { prognose } from "../../eg/prognose";
import { repraesentativeTage, tfOptimieren } from "../../eg/optimierung";
import { MitgliedFehler } from "../../mitglied/basis";
import { intern } from "../demo";
import { jetzt, neueId } from "./hilfen";
import { egIntern } from "./eg-stamm";
import * as eda from "./eg-eda";
import { demoTage, stammSignatur, synthKontext, synthTag, teilnahmeAktivAm } from "./eg-energie-seed";

const { lesenBereit, aendernBereit, zugriff, kontext, gemeinschaftVon, heute, E } = egIntern;
const { protokoll } = intern;
const LEER = { v: 1, stand: 0, bloecke: [], nachrichten: [], reklamationen: [], simulationen: [] };
const EN = (db) => db.egEnergie || LEER;
function ENw(db) {
  if (!db.egEnergie) db.egEnergie = structuredClone(LEER);
  return db.egEnergie;
}
const ERWARTET = {
  verbrauch: ["verbrauch_gemessen", "verbrauch_tf", "anteil_erzeugung", "eigendeckung"],
  erzeugung: ["erzeugung_gemessen", "erzeugung_tf", "restueberschuss"],
};
const erwartet = (richtung, modell) => (richtung === "verbrauch" && modell === "beg" ? [...ERWARTET.verbrauch, "eigendeckung_ee"] : ERWARTET[richtung] || []);

function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof MitgliedFehler) {
      const f = new PlattformFehler(e.status || 422, e.message);
      if (e.feld) f.feld = e.feld;
      throw f;
    }
    throw e;
  }
}
const pruefTag = (t, feld) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t || ""))) throw new PlattformFehler(422, `Bitte ${feld} als Datum (JJJJ-MM-TT) angeben.`);
  return String(t);
};

// ================================================================ Datenzugriff (synthetisch + gespeicherte Eingänge)

const ctxCache = new Map();
function ctxVon(db, gid) {
  const h = heute();
  const sig = `${gid}|${h}|${stammSignatur(E(db), gid)}`;
  if (ctxCache.has(gid) && ctxCache.get(gid).sig === sig) return ctxCache.get(gid).ctx;
  const g = gemeinschaftVon(db, gid);
  const ctx = g?.seedSchluessel ? synthKontext(E(db), gid, h) : null;
  ctxCache.set(gid, { sig, ctx });
  return ctx;
}
function ueberschreibungen(db, gid) {
  const m = new Map();
  for (const b of EN(db).bloecke) if (b.gemeinschaftId === gid) m.set(`${b.zaehlpunktId}|${b.tag}|${b.groesse}`, b);
  return m;
}
/** Alle Blöcke eines Tages: Map "zp|groesse" → Block + eigene Zuteilung */
function tagDaten(db, gid, tag, ov = null) {
  const ctx = ctxVon(db, gid);
  const s = synthTag(ctx, tag);
  const o = ov || ueberschreibungen(db, gid);
  const bl = new Map();
  for (const [k, b] of s.bloecke) bl.set(k, b);
  for (const [k, b] of o) {
    const [zp, t, g] = k.split("|");
    if (t === tag) bl.set(`${zp}|${g}`, b);
  }
  return { bloecke: bl, eigen: s.eigen, ctx };
}
function zpInfo(db, gid) {
  const e = E(db);
  const zaehlt = [...TEILNAHME_ZAEHLT, "beendet"];
  const tn = e.teilnahmen.filter((t) => t.gemeinschaftId === gid && zaehlt.includes(t.status));
  return [...new Set(tn.map((t) => t.zaehlpunktId))].map((id) => {
    const z = e.zaehlpunkte.find((x) => x.id === id);
    const ts = tn.filter((t) => t.zaehlpunktId === id);
    const m = e.mitglieder.find((x) => x.id === ts[0]?.mitgliedId);
    const anl = z?.anlageId ? e.anlagen.find((a) => a.id === z.anlageId) : null;
    return z ? { zp: z, teilnahmen: ts, mitglied: m, anlage: anl } : null;
  }).filter(Boolean).sort((a, b) => a.zp.zaehlpunktnummer.localeCompare(b.zp.zaehlpunktnummer));
}

const monatCache = new Map();
/** Monatsaggregat einer Gemeinschaft (Summen je ZP/Größe, Tagesampeln, Tagessummen, eigene Zuteilung, Lieferungen) */
function monatsDaten(db, gid, monat) {
  const g = gemeinschaftVon(db, gid);
  const h = heute();
  const key = `${gid}|${monat}`;
  const sig = `${h}|${stammSignatur(E(db), gid)}|${EN(db).stand}`;
  const c = monatCache.get(key);
  if (c && c.sig === sig) return c.daten;
  const infos = zpInfo(db, gid);
  const ov = ueberschreibungen(db, gid);
  const zp = {};
  for (const i of infos) zp[i.zp.id] = { groessen: {}, ist: {}, l3: 0, l2: 0, soll: 0, tage: [], eigen: { eigendeckung: 0, restueberschuss: 0 }, maxKw: 0 };
  const tagesSummen = [];
  const lieferungen = [];
  let pruefVerstoesse = 0;
  let sozBasis = 0;
  let sozSchutz = 0;
  let sozAnwendbar = false;
  const tage = tageDesMonats(monat).filter((t) => t < h);
  for (const tag of tage) {
    const d = tagDaten(db, gid, tag, ov);
    const sum = { tag, erzeugungTf: 0, verbrauchTf: 0, eigendeckung: 0, restueberschuss: 0, erzeugungGemessen: 0, verbrauchGemessen: 0 };
    const eds = [];
    const ets = [];
    const sozV = [];
    const sozE = [];
    for (const i of infos) {
      const x = zp[i.zp.id];
      const aktiv = i.teilnahmen.some((t) => teilnahmeAktivAm(t, tag));
      const ew = erwartet(i.zp.richtung, g.modell);
      const bl = {};
      for (const gr of ew) {
        const b = d.bloecke.get(`${i.zp.id}|${gr}`);
        if (b) bl[gr] = b;
      }
      if (!aktiv && !Object.keys(bl).length) {
        x.tage.push({ tag, ampel: "keine", gruende: [] });
        continue;
      }
      const amp = tagesAmpel({ tag, bloecke: bl, erwartet: ew, heute: h, modell: g.modell, maxKw: i.anlage?.kwp || null });
      x.tage.push({ tag, ampel: amp.ampel, gruende: amp.gruende });
      x.soll += werteJeTag(tag);
      const kz = {};
      for (const [gr, b] of Object.entries(bl)) {
        const k = blockKennzahlen(b);
        kz[gr] = k;
        x.groessen[gr] = (x.groessen[gr] || 0) + k.summeKwh;
        x.ist[gr] = (x.ist[gr] || 0) + k.ist;
        if (gr === ew[0]) {
          x.l3 += k.l3;
          x.l2 += k.l2;
        }
        if (k.maxKw > x.maxKw) x.maxKw = k.maxKw;
      }
      const first = bl[ew[0]];
      if (first) lieferungen.push({ zaehlpunktId: i.zp.id, netzbetreiberId: i.zp.netzbetreiberId, tag, empfangenAm: first.erstEmpfangenAm || first.empfangenAm });
      const s = (gr) => (kz[gr] ? kz[gr].summeKwh : 0);
      sum.erzeugungTf += s("erzeugung_tf");
      sum.verbrauchTf += s("verbrauch_tf");
      sum.eigendeckung += s("eigendeckung");
      sum.restueberschuss += s("restueberschuss");
      sum.erzeugungGemessen += s("erzeugung_gemessen");
      sum.verbrauchGemessen += s("verbrauch_gemessen");
      const ei = d.eigen.get(i.zp.id);
      if (ei?.eigendeckung) x.eigen.eigendeckung += ei.eigendeckung.reduce((a, b) => a + b, 0);
      if (ei?.restueberschuss) x.eigen.restueberschuss += ei.restueberschuss.reduce((a, b) => a + b, 0);
      if (bl.eigendeckung) {
        eds.push(bl.eigendeckung.werte);
        sozV.push({ id: i.zp.id, eigendeckung: bl.eigendeckung.werte, schutzbeduerftig: !!i.mitglied?.schutzbeduerftig });
      }
      if (bl.erzeugung_tf) {
        ets.push(bl.erzeugung_tf.werte);
        const rest = bl.restueberschuss?.werte || [];
        sozE.push({ id: i.zp.id, erzeugungTf: bl.erzeugung_tf.werte, eingebracht: bl.erzeugung_tf.werte.map((v, q) => (v || 0) - (rest[q] || 0)), gemeinde: i.mitglied?.art === "gemeinde" });
      }
    }
    pruefVerstoesse += gemeinschaftPruefen(eds, ets).verstoesse;
    const sq = sozialquote({ verbraucher: sozV, erzeuger: sozE });
    if (sq.anwendbar) {
      sozAnwendbar = true;
      sozBasis += sq.basisKwh;
      sozSchutz += sq.anSchutzbeduerftigeKwh;
    }
    tagesSummen.push(sum);
  }
  const daten = { monat, tage, zp, tagesSummen, lieferungen, pruefVerstoesse, sozial: { anwendbar: sozAnwendbar, basisKwh: sozBasis, anSchutzbeduerftigeKwh: sozSchutz, quotePct: sozBasis > 0 ? (sozSchutz / sozBasis) * 100 : null } };
  if (monatCache.size > 80) monatCache.clear();
  monatCache.set(key, { sig, daten });
  return daten;
}
const monateBis = (h, n = 13) => Array.from({ length: n }, (_, i) => monatPlus(monatVon(h), i - n + 1));
const zpName = (i, k) => (egStufe(k, "mitgliederliste") >= 1 ? i.zp.bezeichnung || i.zp.inhaberName || "" : i.zp.bezeichnung || "");
const r3 = (x) => rund(x, 3);
/** Tage mit möglichen Daten: synthetischer Zeitraum oder gespeicherte Eingänge */
function demoTageOder(db, gid, von, bis) {
  const t = new Set(demoTage(ctxVon(db, gid), von, bis));
  for (const b of EN(db).bloecke) if (b.gemeinschaftId === gid && b.tag >= von && b.tag <= bis) t.add(b.tag);
  return [...t].sort();
}
function rundeSummen(s) {
  const q = s.verbrauchTf > 0 ? s.eigendeckung / s.verbrauchTf : 0;
  return { erzeugungTfKwh: r3(s.erzeugungTf || 0), verbrauchTfKwh: r3(s.verbrauchTf || 0), eigendeckungKwh: r3(s.eigendeckung || 0), restueberschussKwh: r3(s.restueberschuss || 0), erzeugungGemessenKwh: r3(s.erzeugungGemessen || 0), verbrauchGemessenKwh: r3(s.verbrauchGemessen || 0), eigendeckungsquote: rund(q, 4) };
}

// ================================================================ Messreihen

/**
 * Messreihen lesen.
 *  - mit zaehlpunktId: Tagesblöcke eines Zählpunkts (max. 62 Tage) – qh_einzeln oder eigener Zählpunkt; protokolliert
 *  - ohne: Summen der Gemeinschaft je Viertelstunde (max. 62 Tage) bzw. mit aufloesung "tag"/"monat" je Tag/Monat
 */
export async function enMessreihen(n, { gemeinschaftId = "", zaehlpunktId = "", von = "", bis = "", groessen = null, aufloesung = "viertelstunde" } = {}) {
  const db = await lesenBereit();
  const h = heute();
  const vonT = von ? pruefTag(von, "„von“") : plusTag(h, -7);
  const bisT = bis ? pruefTag(bis, "„bis“") : plusTag(h, -1);
  if (bisT < vonT) throw new PlattformFehler(422, "„bis“ liegt vor „von“.");
  const gw = Array.isArray(groessen) && groessen.length ? groessen.filter((x) => MESS_GROESSEN[x]) : null;
  if (zaehlpunktId) {
    if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
    const g = gemeinschaftVon(db, gemeinschaftId);
    if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
    const k = kontext(db, n, g);
    const info = zpInfo(db, g.id).find((i) => i.zp.id === zaehlpunktId);
    const eigen = !!info && info.teilnahmen.some((t) => E(db).mitglieder.find((m) => m.id === t.mitgliedId)?.kontoId === n.id);
    if (!eigen && egStufe(k, "qh_einzeln") < 1) {
      if (!k.rollen.length && !k.backofficeStufe) throw nichtGefunden("Gemeinschaft nicht gefunden.");
      throw verboten("Viertelstundenwerte einzelner Mitglieder sind zweckgebunden – Ihre Rolle sieht nur Summen der Gemeinschaft.");
    }
    if (!info) throw nichtGefunden("Zählpunkt nicht gefunden.");
    if (tageZwischen(vonT, bisT) > 62) throw new PlattformFehler(422, "Höchstens 62 Tage je Abfrage.");
    const ov = ueberschreibungen(db, g.id);
    const bloecke = [];
    for (const tag of demoTageOder(db, g.id, vonT, bisT)) {
      const d = tagDaten(db, g.id, tag, ov);
      for (const gr of Object.keys(MESS_GROESSEN)) {
        if (gw && !gw.includes(gr)) continue;
        const b = d.bloecke.get(`${zaehlpunktId}|${gr}`);
        if (b) bloecke.push({ ...b, ...blockKennzahlen(b) });
      }
    }
    if (!eigen) await aendernBereit((d) => protokoll(d, n, "eg_qh_einsicht", "eg_zaehlpunkt", zaehlpunktId, `Viertelstundenwerte ${info.zp.zaehlpunktnummer} ${vonT}–${bisT} eingesehen (${g.name})`));
    return { gemeinschaftId: g.id, zaehlpunktId, zaehlpunktnummer: info.zp.zaehlpunktnummer, richtung: info.zp.richtung, von: vonT, bis: bisT, bloecke, protokolliert: !eigen };
  }
  const { g } = zugriff(db, n, gemeinschaftId, "qh_aggregiert", 1);
  if (aufloesung === "monat" || aufloesung === "tag") {
    const monate = [];
    for (let m = monatVon(vonT); m <= monatVon(bisT); m = monatPlus(m, 1)) monate.push(m);
    if (monate.length > 25) throw new PlattformFehler(422, "Höchstens 25 Monate je Abfrage.");
    const zeilen = [];
    for (const m of monate) {
      const md = monatsDaten(db, g.id, m);
      if (aufloesung === "tag") {
        for (const t of md.tagesSummen) if (t.tag >= vonT && t.tag <= bisT) zeilen.push({ tag: t.tag, ...rundeSummen(t) });
      } else {
        const s = {};
        for (const t of md.tagesSummen) for (const x of ["erzeugungTf", "verbrauchTf", "eigendeckung", "restueberschuss", "erzeugungGemessen", "verbrauchGemessen"]) s[x] = (s[x] || 0) + t[x];
        zeilen.push({ monat: m, tage: md.tagesSummen.length, ...rundeSummen(s) });
      }
    }
    return { gemeinschaftId: g.id, aggregiert: true, aufloesung, von: vonT, bis: bisT, zeilen };
  }
  if (tageZwischen(vonT, bisT) > 62) throw new PlattformFehler(422, "Höchstens 62 Tage je Abfrage.");
  const ov = ueberschreibungen(db, g.id);
  const zielG = gw || ["erzeugung_tf", "verbrauch_tf", "eigendeckung", "restueberschuss"];
  const tage = [];
  for (const tag of demoTageOder(db, g.id, vonT, bisT)) {
    const d = tagDaten(db, g.id, tag, ov);
    const n96 = werteJeTag(tag);
    const reihen = Object.fromEntries(zielG.map((x) => [x, new Array(n96).fill(0)]));
    for (const [k, b] of d.bloecke) {
      const gr = k.split("|")[1];
      if (!reihen[gr]) continue;
      for (let i = 0; i < n96; i++) reihen[gr][i] += b.werte[i] || 0;
    }
    tage.push({ tag, reihen });
  }
  return { gemeinschaftId: g.id, aggregiert: true, aufloesung: "viertelstunde", von: vonT, bis: bisT, tage };
}

// ================================================================ Eingang EDA (Ereignis eg.energiedaten.empfangen, WP2 → WP3)

export async function enEnergiedatenEmpfangen(sys, payload = {}) {
  if (!sys) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!sys.system && !(sys.rollen?.includes("admin") && darfSchreiben(sys, "eg"))) throw verboten("Energiedaten nimmt nur das System (EDA-Eingang) bzw. die Betriebsführung an.");
  let ergebnis = null;
  await aendernBereit((db) => {
    const en = ENw(db);
    const mid = String(payload.messageId || "");
    if (mid && en.nachrichten.includes(mid)) {
      ergebnis = { doppelt: true, messageId: mid, bloecke: 0 };
      return;
    }
    const g = gemeinschaftVon(db, payload.gemeinschaftId);
    if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
    const nr = String(payload.zaehlpunktnummer || "").replace(/\s/g, "").toUpperCase();
    const z = E(db).zaehlpunkte.find((x) => x.zaehlpunktnummer === nr);
    if (!z) throw nichtGefunden(`Zählpunkt ${nr} ist nicht bekannt.`);
    if (!E(db).teilnahmen.some((t) => t.zaehlpunktId === z.id && t.gemeinschaftId === g.id)) throw new PlattformFehler(409, "Der Zählpunkt nimmt an dieser Gemeinschaft nicht teil.");
    const neu = fach(() => payloadZerlegen(payload, { zaehlpunktId: z.id, gemeinschaftId: g.id, am: jetzt() }));
    ergebnis = einarbeiten(db, en, g.id, neu, jetzt());
    if (mid) en.nachrichten = [...en.nachrichten, mid].slice(-5000);
    ergebnis.messageId = mid;
    ergebnis.zaehlpunktId = z.id;
  });
  return ergebnis;
}
/** Blöcke in die gespeicherten Eingänge übernehmen (synthetischer Altwert wird Vorversion) */
function einarbeiten(db, en, gid, neu, am) {
  let geaendert = 0;
  let konflikte = 0;
  const tage = new Set();
  for (const b of neu) {
    const i = en.bloecke.findIndex((x) => x.gemeinschaftId === gid && x.zaehlpunktId === b.zaehlpunktId && x.tag === b.tag && x.groesse === b.groesse);
    let alt = i >= 0 ? en.bloecke[i] : null;
    if (!alt) {
      const s = synthTag(ctxVon(db, gid), b.tag).bloecke.get(`${b.zaehlpunktId}|${b.groesse}`);
      if (s) alt = blockBereinigen(s);
    }
    const r = bloeckeZusammenfuehren(alt, b, { am });
    const block = { ...r.block };
    delete block.demo;
    if (i >= 0) en.bloecke[i] = block;
    else en.bloecke.push(block);
    geaendert += r.geaendert;
    konflikte += r.konflikte;
    tage.add(b.tag);
  }
  if (en.bloecke.length > 4000) en.bloecke = en.bloecke.slice(-4000);
  en.stand = (en.stand || 0) + 1;
  return { bloecke: neu.length, tage: tage.size, geaendertWerte: geaendert, konflikte, hinweis: konflikte ? `${konflikte} L3-Werte nicht übernommen (vorhandene L1/L2-Werte bleiben).` : "" };
}

// ================================================================ Periodenwerte (Eingang WP4)

/**
 * Periodensummen je Zählpunkt und Größe (Netzbetreiber-Werte, ElWG § 71 Abs. 1 und 4) – gerundet wird auf Belegebene (WP4).
 * Zusätzlich je Zeitfenster des gültigen Tarifs (TOU) und je Tarif-Version, Vollständigkeit und L3-Anteil.
 */
export async function enPeriodenwerte(n, gemeinschaftId, von, bis) {
  const db = await lesenBereit();
  const vonT = pruefTag(von, "„von“");
  const bisT = pruefTag(bis, "„bis“");
  if (bisT < vonT) throw new PlattformFehler(422, "„bis“ liegt vor „von“.");
  if (tageZwischen(vonT, bisT) > 400) throw new PlattformFehler(422, "Höchstens 400 Tage je Periode.");
  let g;
  if (n?.system) {
    g = gemeinschaftVon(db, gemeinschaftId);
    if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  } else g = zugriff(db, n, gemeinschaftId, "abrechnung_vorschau", 1).g;
  const h = heute();
  const tarife = E(db).tarife.filter((t) => t.gemeinschaftId === g.id);
  const infos = zpInfo(db, g.id);
  const ov = ueberschreibungen(db, g.id);
  const acc = new Map(infos.map((i) => [i.zp.id, { groessen: {}, fenster: {}, tarif: {}, l3: 0, soll: 0, fehlend: 0, aktivTage: 0 }]));
  const add = (o, k, gr, w) => {
    o[k] ||= {};
    o[k][gr] = (o[k][gr] || 0) + w;
  };
  for (let tag = vonT; tag <= bisT; tag = plusTag(tag)) {
    const d = tag < h ? tagDaten(db, g.id, tag, ov) : { bloecke: new Map() };
    const t = tarifAm(tarife, tag);
    for (const i of infos) {
      if (!i.teilnahmen.some((tt) => teilnahmeAktivAm(tt, tag))) continue;
      const x = acc.get(i.zp.id);
      x.aktivTage++;
      const ew = erwartet(i.zp.richtung, g.modell);
      x.soll += werteJeTag(tag) * ew.length;
      for (const gr of ew) {
        const b = d.bloecke.get(`${i.zp.id}|${gr}`);
        if (!b) {
          x.fehlend += werteJeTag(tag);
          continue;
        }
        const k = blockKennzahlen(b);
        x.groessen[gr] = (x.groessen[gr] || 0) + k.summeKwh;
        x.fehlend += k.fehlend;
        x.l3 += k.l3;
        if (!t) continue;
        x.tarif[t.id] ||= {};
        if ((t.zeitfenster || []).length) {
          const beginn = Date.parse(b.beginnUtc || "") || Date.parse(`${tag}T00:00:00Z`);
          for (let q = 0; q < b.werte.length; q++) {
            const w = b.werte[q];
            if (w === null) continue;
            const zf = preisFuer(t, lokalZeit(beginn + q * QH_MS), { mitgliedId: i.teilnahmen[0]?.mitgliedId }).zeitfenster || "";
            add(x.fenster, zf, gr, w);
            add(x.tarif[t.id], zf, gr, w);
          }
        } else {
          add(x.fenster, "", gr, k.summeKwh);
          add(x.tarif[t.id], "", gr, k.summeKwh);
        }
      }
    }
  }
  const zaehlpunkte = infos.filter((i) => acc.get(i.zp.id).aktivTage).map((i) => {
    const x = acc.get(i.zp.id);
    const tn = i.teilnahmen.find((t) => t.gueltigAb && t.gueltigAb <= bisT && (!t.gueltigBis || t.gueltigBis >= vonT)) || i.teilnahmen[0];
    return {
      zaehlpunktId: i.zp.id, zaehlpunktnummer: i.zp.zaehlpunktnummer, richtung: i.zp.richtung, teilnahmeId: tn?.id || null, mitgliedId: tn?.mitgliedId || null,
      groessen: x.groessen, groessenJeZeitfenster: x.fenster, groessenJeTarif: x.tarif,
      vollstaendig: x.fehlend === 0, fehlendeWerte: x.fehlend, l3Werte: x.l3, anteilL3: x.soll ? x.l3 / x.soll : 0, abrechenbar: x.fehlend === 0 && x.l3 === 0, aktivTage: x.aktivTage,
    };
  });
  const summe = (gr) => zaehlpunkte.reduce((s, z) => s + (z.groessen[gr] || 0), 0);
  const abrechenbar = zaehlpunkte.every((z) => z.abrechenbar);
  return {
    gemeinschaftId: g.id, von: vonT, bis: bisT, quelle: "netzbetreiber", zaehlpunkte,
    summen: { eigendeckungKwh: summe("eigendeckung"), erzeugungTfKwh: summe("erzeugung_tf"), restueberschussKwh: summe("restueberschuss"), verbrauchTfKwh: summe("verbrauch_tf") },
    vollstaendig: zaehlpunkte.every((z) => z.vollstaendig), abrechenbar,
    hinweis: abrechenbar ? "" : "Nicht alle Werte sind abrechenbar (Lücken bzw. L3) – Abrechnung frühestens nach Ersatz durch L1/L2 (HA II 13.1).",
  };
}

// ================================================================ Datenqualität und Abweichungsbericht

export async function enQualitaet(n, gemeinschaftId, { monat = "", reklamation = null } = {}) {
  if (reklamation) return reklamieren(n, gemeinschaftId, reklamation);
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, "qh_aggregiert", 1);
  const h = heute();
  const m = /^\d{4}-\d{2}$/.test(monat) ? monat : monatVon(plusTag(h, -1));
  const md = monatsDaten(db, g.id, m);
  const zeilen = zpInfo(db, g.id).map((i) => {
    const x = md.zp[i.zp.id];
    return { zaehlpunktId: i.zp.id, zaehlpunktnummer: i.zp.zaehlpunktnummer, name: zpName(i, k), richtung: i.zp.richtung, netzbetreiberId: i.zp.netzbetreiberId, tage: x.tage, l3: x.l3, l2: x.l2, vollstaendig: x.soll > 0 && Object.values(x.ist).every((v) => v === x.soll) };
  }).filter((z) => z.tage.some((t) => t.ampel !== "keine"));
  const gespeichert = EN(db).reklamationen.filter((r) => r.gemeinschaftId === g.id);
  const reklamationen = reklamationsFaelle(zeilen, { heute: h }).map((f) => {
    const s = gespeichert.find((r) => r.zaehlpunktId === f.zaehlpunktId && r.von <= f.bis && r.bis >= f.von);
    const z = zeilen.find((x) => x.zaehlpunktId === f.zaehlpunktId);
    return { ...f, zaehlpunktnummer: z?.zaehlpunktnummer, name: z?.name, status: s?.status || "offen", reklamationId: s?.id || null, gestelltAm: s?.am || "", edaProzessId: s?.edaProzessId || "" };
  });
  const lief = [];
  for (let i = -2; i <= 0; i++) lief.push(...monatsDaten(db, g.id, monatPlus(m, i)).lieferungen);
  const nbNamen = Object.fromEntries(E(db).netzbetreiber.map((x) => [x.id, x.kurzname || x.name]));
  const monate = monateBis(h).map((mm) => {
    const s = qualitaetsZusammenfassung(Object.values(monatsDaten(db, g.id, mm).zp).map((x) => ({ tage: x.tage })));
    return { monat: mm, ampel: s.ampel, quoteOk: rund(s.quoteOk, 4), zaehler: s.zaehler, tage: s.tage };
  });
  return {
    gemeinschaftId: g.id, monat: m, tage: md.tage, zeilen, zusammenfassung: qualitaetsZusammenfassung(zeilen), reklamationen,
    lieferstatistik: lieferstatistik(lief).map((x) => ({ ...x, netzbetreiber: nbNamen[x.netzbetreiberId] || x.netzbetreiberId, mittelTage: rund(x.mittelTage, 1), verspaetetPct: rund(x.verspaetetPct, 1) })),
    gemeinschaftPruefung: { verstoesse: md.pruefVerstoesse, text: md.pruefVerstoesse ? `${md.pruefVerstoesse} Viertelstunden mit Σ Eigendeckung über Σ Erzeugung × TF` : "Σ Eigendeckung ≤ Σ Erzeugung × TF in jeder Viertelstunde" },
    monate, ampel: AMPEL, regeln: QUALITAET_REGELN,
    rechte: { reklamieren: egStufe(k, "eda_ausloesen") >= 2, einzeln: egStufe(k, "qh_einzeln") >= 1, importieren: egStufe(k, "stammdaten") >= 2 },
  };
}

async function reklamieren(n, gemeinschaftId, { zaehlpunktId = "", von = "", bis = "", gruende = [] } = {}) {
  const db = await lesenBereit();
  const { g } = zugriff(db, n, gemeinschaftId, "eda_ausloesen", 2);
  const vonT = pruefTag(von, "„von“");
  const bisT = pruefTag(bis, "„bis“");
  const info = zpInfo(db, g.id).find((i) => i.zp.id === zaehlpunktId);
  if (!info) throw nichtGefunden("Zählpunkt nicht gefunden.");
  let edaProzessId = "";
  let status = "gestellt";
  let hinweis = "";
  try {
    const r = await eda.edaNachforderung(n, { zaehlpunktId, von: vonT, bis: bisT });
    edaProzessId = r?.prozess?.id || r?.id || "";
  } catch (e) {
    if (e instanceof PlattformFehler && e.status === 501) {
      status = "vorgemerkt";
      hinweis = "EDA-Nachforderung (CR_REQ_PT) ist noch nicht angebunden – Reklamation vorgemerkt.";
    } else throw e;
  }
  const nb = E(db).netzbetreiber.find((x) => x.id === info.zp.netzbetreiberId);
  const text = reklamationsText({ zaehlpunktnummer: info.zp.zaehlpunktnummer, netzbetreiber: nb?.name || "", gemeinschaft: g.name, gemeinschaftsId: g.gemeinschaftsId, von: vonT, bis: bisT, gruende: (Array.isArray(gruende) ? gruende : []).map((x) => String(x).slice(0, 200)).slice(0, 10) });
  const rek = { id: neueId("EMR"), gemeinschaftId: g.id, zaehlpunktId, von: vonT, bis: bisT, status, edaProzessId, text, am: jetzt(), vonKonto: n.system ? null : n.id, fristBis: plusTag(heute(), QUALITAET_REGELN.reklamationFristTage) };
  await aendernBereit((d) => {
    const en = ENw(d);
    en.reklamationen = [...en.reklamationen, rek].slice(-500);
    protokoll(d, n, "eg_reklamation", "eg_zaehlpunkt", zaehlpunktId, `Energiedaten reklamiert ${info.zp.zaehlpunktnummer} ${vonT}–${bisT} (${status})`);
  });
  return { reklamation: rek, hinweis };
}

export async function enAbweichungsbericht(n, gemeinschaftId, { monat = "", toleranzPct = 0.5, toleranzKwh = 0.1 } = {}) {
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, "qh_aggregiert", 1);
  const h = heute();
  const m = /^\d{4}-\d{2}$/.test(monat) ? monat : monatVon(plusTag(h, -1));
  const md = monatsDaten(db, g.id, m);
  const posten = zpInfo(db, g.id).filter((i) => md.zp[i.zp.id] && Object.keys(md.zp[i.zp.id].groessen).length).map((i) => {
    const x = md.zp[i.zp.id];
    const verbr = i.zp.richtung === "verbrauch";
    return { zaehlpunktId: i.zp.id, zaehlpunktnummer: i.zp.zaehlpunktnummer, name: zpName(i, k), richtung: i.zp.richtung, groesse: verbr ? "eigendeckung" : "restueberschuss", eigenKwh: verbr ? x.eigen.eigendeckung : x.eigen.restueberschuss, nbKwh: x.groessen[verbr ? "eigendeckung" : "restueberschuss"] || 0 };
  });
  const tp = Math.max(0, Math.min(10, Number(toleranzPct) || 0.5));
  const tk = Math.max(0, Math.min(100, Number(toleranzKwh) || 0.1));
  const bericht = nbAbgleich(posten, { toleranzPct: tp, toleranzKwh: tk });
  const zeilen = bericht.zeilen.map((z) => ({ ...z, eigenKwh: r3(z.eigenKwh), nbKwh: r3(z.nbKwh), abweichungKwh: r3(z.abweichungKwh), abweichungPct: rund(z.abweichungPct, 2), grenzeKwh: r3(z.grenzeKwh) }));
  const sz = md.sozial;
  return {
    gemeinschaftId: g.id, monat: m, zeilen, summeEigenKwh: r3(bericht.summeEigenKwh), summeNbKwh: r3(bericht.summeNbKwh), abweichungKwh: r3(bericht.abweichungKwh), klaerfaelle: bericht.klaerfaelle, toleranzPct: tp, toleranzKwh: tk,
    verteilmodell: g.verteilmodell,
    sozialquote: sz.anwendbar ? { anwendbar: true, basisKwh: r3(sz.basisKwh), anSchutzbeduerftigeKwh: r3(sz.anSchutzbeduerftigeKwh), quotePct: sz.quotePct === null ? null : rund(sz.quotePct, 2), zielPct: 10, erfuellt: (sz.quotePct || 0) >= 10 } : { anwendbar: false },
    hinweis: "Eigene Zuteilung aus den gemessenen Werten und den Teilnahmefaktoren (Fachkonzept 4.2/4.3) gegen die Werte des Netzbetreibers. Maßgeblich bleiben die Werte des Netzbetreibers (ElWG § 71); über der Toleranz entsteht ein Klärfall.",
  };
}

// ================================================================ CSV-/Excel-Import (Ausweichweg)

export async function enCsvImport(n, gemeinschaftId, { csv = "", zaehlpunktId = "", datei = "", ausfuehren = true } = {}) {
  const db = await lesenBereit();
  const { g } = zugriff(db, n, gemeinschaftId, "stammdaten", ausfuehren ? 2 : 1);
  if (String(csv).length > 6 * 1024 * 1024) throw new PlattformFehler(413, "Datei zu groß (höchstens 6 MB).");
  const erg = fach(() => csvParsen(csv));
  const infos = zpInfo(db, g.id);
  const info = zaehlpunktId ? infos.find((i) => i.zp.id === zaehlpunktId) : infos.find((i) => i.zp.zaehlpunktnummer === erg.zaehlpunktnummer);
  if (!info) throw new PlattformFehler(422, erg.zaehlpunktnummer && !zaehlpunktId ? `Zählpunkt ${erg.zaehlpunktnummer} nimmt an dieser Gemeinschaft nicht teil.` : "Bitte den Zählpunkt auswählen (die Datei enthält keine Zählpunktnummer).");
  if (erg.zaehlpunktnummer && erg.zaehlpunktnummer !== info.zp.zaehlpunktnummer) throw new PlattformFehler(422, `Die Datei gehört zu ${erg.zaehlpunktnummer}, ausgewählt ist ${info.zp.zaehlpunktnummer}.`);
  const falsch = erg.reihen.filter((r) => MESS_GROESSEN[r.groesse].richtung !== info.zp.richtung);
  const reihen = erg.reihen.filter((r) => MESS_GROESSEN[r.groesse].richtung === info.zp.richtung);
  if (!reihen.length) throw new PlattformFehler(422, `Keine Spalte passt zur Richtung des Zählpunkts (${info.zp.richtung}).`);
  const bloecke = fach(() => csvZuBloecken({ ...erg, reihen }, { zaehlpunktId: info.zp.id, gemeinschaftId: g.id, datei: String(datei).slice(0, 120), am: jetzt() }));
  const vorschau = {
    zaehlpunktId: info.zp.id, zaehlpunktnummer: info.zp.zaehlpunktnummer, zeilen: erg.zeilen, von: erg.von, bis: erg.bis, tage: new Set(bloecke.map((b) => b.tag)).size,
    reihen: reihen.map((r) => ({ groesse: r.groesse, label: MESS_GROESSEN[r.groesse].label, einheit: r.einheit, werte: r.punkte.length, summeKwh: r3(r.punkte.reduce((s, p) => s + p.wert, 0)) })),
    fehler: erg.fehler, fehlerAnzahl: erg.fehlerAnzahl, hinweise: [...erg.hinweise, ...(falsch.length ? [`Spalten der anderen Richtung ignoriert: ${falsch.map((r) => MESS_GROESSEN[r.groesse].label).join(", ")}.`] : [])],
    unvollstaendigeTage: [...new Set(bloecke.filter((b) => !b.vollstaendig).map((b) => b.tag))].slice(0, 31),
  };
  if (!ausfuehren) return { vorschau, ausgefuehrt: false };
  let r = null;
  await aendernBereit((d) => {
    r = einarbeiten(d, ENw(d), g.id, bloecke, jetzt());
    protokoll(d, n, "eg_energie_import", "eg_zaehlpunkt", info.zp.id, `CSV-Import ${info.zp.zaehlpunktnummer}: ${vorschau.tage} Tage, ${erg.zeilen} Zeilen`);
  });
  return { vorschau, ausgefuehrt: true, ergebnis: r };
}

// ================================================================ Simulation

function simRecht(db, n, gid, speichern) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (gid) return zugriff(db, n, gid, "stammdaten", 1).g;
  if (!n.system && !(n.rollen?.includes("admin") && darfLesen(n, "eg"))) throw verboten("Simulationen ohne Gemeinschaft stehen der Gründungsberatung (Backoffice) zur Verfügung.");
  if (speichern && !n.system && !darfSchreiben(n, "eg")) throw verboten("Ihre Backoffice-Rolle erlaubt kein Speichern.");
  return null;
}
/** Netzentgelt-Regel (Regeltabelle WP1, eg/netzentgelt.js) als Simulationsparameter */
function netzParameter(modell, zonelevel, netzebene, stichtag) {
  const r = netzentgeltRegel({ datum: stichtag, modell, zonelevel, netzebene });
  return { reduktionPct: r.reduktionPct, abgabenBefreit: r.abgabenBefreit, quelle: r.quelle, status: r.status, regel: r.regel };
}
/** Zonelevel-Vergleich (Fachkonzept 6.2 Nr. 1): lokal, regional, BEG, GEA */
function varianten(stichtag, netzebene) {
  return [
    { id: "eeg3", label: "EEG lokal (Zonelevel 3)", modell: "eeg", zonelevel: 3 },
    { id: "eeg4", label: "EEG regional (Zonelevel 4)", modell: "eeg", zonelevel: 4 },
    { id: "beg6", label: "BEG ohne Nahebereich (Zonelevel 6)", modell: "beg", zonelevel: 6 },
    { id: "gea1", label: "GEA / Hauptleitung (Zonelevel 1)", modell: "gea", zonelevel: 1 },
  ].map((x) => {
    const p = netzParameter(x.modell, x.zonelevel, x.zonelevel === 1 ? 7 : netzebene, stichtag);
    const nur = x.id === "gea1" ? "Nur im selben Gebäude bzw. an derselben Hauptleitung möglich. " : x.id === "eeg3" ? "Alle Teilnehmer an derselben Trafostation. " : x.id === "eeg4" ? "Alle Teilnehmer am selben Umspannwerk. " : "";
    return { id: x.id, label: x.label, reduktionPct: p.reduktionPct, abgabenBefreit: p.abgabenBefreit, hinweis: `${nur}${p.quelle}${p.status === "platzhalter" ? " (Platzhalter, zu bestätigen)" : ""}` };
  });
}
/** Vorlage aus einer bestehenden Gemeinschaft: Teilnehmer mit gemessenem Jahresverbrauch, Anlagen mit kWp */
function vorlageAus(db, g) {
  const h = heute();
  const infos = zpInfo(db, g.id).filter((i) => i.teilnahmen.some((t) => t.status !== "beendet"));
  const jahr = {};
  for (const m of monateBis(h, 12)) for (const [id, x] of Object.entries(monatsDaten(db, g.id, m).zp)) jahr[id] = (jahr[id] || 0) + (x.groessen.verbrauch_gemessen || 0);
  const tarif = tarifAm(E(db).tarife.filter((t) => t.gemeinschaftId === g.id), h);
  const profilVon = (art, bez) => (/schule|amt/i.test(bez || "") ? "G1" : /kläranlage/i.test(bez || "") ? "BAND" : { privat: "H0", landwirt: "L0", kmu: "G0", gemeinde: "G1" }[art] || "H0");
  const teilnehmer = [];
  const genutzt = new Set();
  for (const i of infos.filter((x) => x.zp.richtung === "verbrauch")) {
    const pv = infos.find((x) => x.zp.richtung === "erzeugung" && x.anlage && x.mitglied?.id === i.mitglied?.id && !genutzt.has(x.zp.id) && x.anlage.nutzungsmodell !== "volleinspeisung");
    if (pv) genutzt.add(pv.zp.id);
    const name = i.zp.bezeichnung || i.mitglied?.person?.firma || `${i.mitglied?.person?.vorname || ""} ${i.mitglied?.person?.nachname || ""}`.trim();
    teilnehmer.push({ id: i.zp.id, name, art: i.mitglied?.art || "privat", profil: profilVon(i.mitglied?.art, i.zp.bezeichnung), jahresverbrauchKwh: Math.round(jahr[i.zp.id] || 0) || undefined, tf: i.teilnahmen[0]?.teilnahmefaktor || 100, schutzbeduerftig: !!i.mitglied?.schutzbeduerftig, pvKwp: pv ? pv.anlage.kwp || 0 : 0, pvAusrichtung: pv?.anlage.ausrichtung ?? 0, pvNeigung: pv?.anlage.neigung ?? 30, tfErzeugung: pv?.teilnahmen[0]?.teilnahmefaktor || 100 });
  }
  const anlagen = infos.filter((x) => x.zp.richtung === "erzeugung" && x.anlage && !genutzt.has(x.zp.id)).map((i) => ({ id: i.anlage.id, name: i.anlage.bezeichnung, kwp: i.anlage.kwp || i.anlage.engpassleistungKw || 0, ausrichtung: i.anlage.ausrichtung ?? 0, neigung: i.anlage.neigung ?? 30, tf: i.teilnahmen[0]?.teilnahmefaktor || 100, gemeinde: i.mitglied?.art === "gemeinde" }));
  const st = E(db).anlagen.find((a) => a.gemeinschaftId === g.id && a.standort?.lat)?.standort || { lat: 48.2, lon: 13.5 };
  return {
    titel: `${g.name} – Simulation`, gemeinschaftId: g.id, modell: g.modell, zonelevel: g.zonelevel, verteilmodell: g.verteilmodell, ustStatus: g.ustStatus,
    standort: { lat: st.lat, lon: st.lon }, preise: { ...SIM_STANDARD, ...(tarif ? { bezugCt: tarif.bezugspreisCt, einspeisCt: tarif.einspeisepreisCt, mitgliedsbeitragEur: tarif.mitgliedsbeitragJahr || 0 } : {}) },
    teilnehmer, anlagen, saat: simulationSaat(g.id),
    hinweis: "Jahresverbrauch aus den Netzbetreiber-Werten der letzten 12 Monate (bei Prosumern Netzbezug nach Eigenverbrauch).",
  };
}

export async function enSimulation(n, { daten = {} } = {}) {
  const db = await lesenBereit();
  const gid = String(daten.gemeinschaftId || "");
  const g = simRecht(db, n, gid, !!daten.speichern);
  if (daten.nurVorlage) {
    if (!g) throw new PlattformFehler(422, "Vorlage nur aus einer Gemeinschaft.");
    return { vorlage: vorlageAus(db, g) };
  }
  const h = heute();
  const stichtag = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.stichtag || "")) ? daten.stichtag : h;
  const modell = String(daten.modell || g?.modell || "eeg");
  const zonelevel = Number(daten.zonelevel || g?.zonelevel || 3);
  const netzebene = Number(daten.netzebene || 7);
  const netz = daten.netz && daten.netz.reduktionPct !== undefined && daten.netz.reduktionPct !== "" ? daten.netz : netzParameter(modell, zonelevel, netzebene, stichtag);
  const eingabe = { ...daten, modell, zonelevel, netz, varianten: varianten(stichtag, netzebene), sensitivitaet: daten.sensitivitaet || { haushalte: [5, 10] }, saat: daten.saat || simulationSaat(gid || daten.titel || "sim") };
  const ergebnis = fach(() => simulationRechnen(eingabe));
  ergebnis.stichtag = stichtag;
  ergebnis.netzRegel = netz;
  if (daten.speichern) {
    const rec = {
      id: neueId("ESI"), gemeinschaftId: g?.id || null, titel: ergebnis.eingabe.titel, stichtag, kennzahlen: ergebnis.kennzahlen,
      eingabe: { ...ergebnis.eingabe, teilnehmer: ergebnis.eingabe.teilnehmer.map((t) => ({ ...t, lastgang: null })) },
      ergebnis: { monate: ergebnis.monate, teilnehmer: ergebnis.teilnehmer, anlagen: ergebnis.anlagen, varianten: ergebnis.varianten, hinweise: ergebnis.hinweise, speicher: ergebnis.speicher, sensitivitaet: ergebnis.sensitivitaet, typischerTag: ergebnis.typischerTag },
      status: "gespeichert", erstelltAm: jetzt(), erstelltVon: n.system ? null : n.id, demo: true,
    };
    await aendernBereit((d) => {
      const en = ENw(d);
      en.simulationen = [rec, ...en.simulationen].slice(0, 200);
      protokoll(d, n, "eg_simulation", "eg_simulation", rec.id, `Simulation „${rec.titel}“ gespeichert`);
    });
    ergebnis.id = rec.id;
  }
  return ergebnis;
}

export async function enSimulationen(n, { gemeinschaftId = "" } = {}) {
  const db = await lesenBereit();
  const g = simRecht(db, n, gemeinschaftId, false);
  const simulationen = EN(db).simulationen.filter((s) => (g ? s.gemeinschaftId === g.id : true)).map((s) => ({ id: s.id, titel: s.titel, gemeinschaftId: s.gemeinschaftId, gemeinschaft: s.gemeinschaftId ? gemeinschaftVon(db, s.gemeinschaftId)?.name || "" : "", stichtag: s.stichtag, kennzahlen: s.kennzahlen, erstelltAm: s.erstelltAm, status: s.status, teilnehmer: s.eingabe?.teilnehmer?.length || 0, ergebnis: s.ergebnis, eingabe: s.eingabe }));
  return { simulationen };
}

// ================================================================ Prognose

export async function enPrognose(n, gemeinschaftId, { tage = 7, wetter = [] } = {}) {
  const db = await lesenBereit();
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const g = gemeinschaftVon(db, gemeinschaftId);
  if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  const k = kontext(db, n, g);
  if (egStufe(k, "qh_aggregiert") < 1 && egStufe(k, "eigene_daten") < 1) {
    if (!k.rollen.length && !k.backofficeStufe) throw nichtGefunden("Gemeinschaft nicht gefunden.");
    throw verboten("Ihre Rolle erlaubt diese Ansicht nicht.");
  }
  const h = heute();
  const ov = ueberschreibungen(db, g.id);
  const historie = [];
  for (const tag of demoTageOder(db, g.id, plusTag(h, -35), plusTag(h, -1))) {
    const d = tagDaten(db, g.id, tag, ov);
    const e = new Array(96).fill(0);
    const v = new Array(96).fill(0);
    for (const [key, b] of d.bloecke) {
      const gr = key.split("|")[1];
      const ziel = gr === "erzeugung_tf" ? e : gr === "verbrauch_tf" ? v : null;
      if (!ziel) continue;
      const n96 = b.werte.length;
      for (let i = 0; i < 96; i++) {
        // Umstellungstage auf 96 Werte abbilden (fehlende Stunde 0, doppelte Stunde einmal)
        const j = n96 === 96 ? i : n96 === 92 ? (i < 8 ? i : i >= 12 ? i - 4 : -1) : i < 12 ? i : i + 4;
        if (j >= 0 && j < n96) ziel[i] += b.werte[j] || 0;
      }
    }
    historie.push({ tag, erzeugung: e, verbrauch: v });
  }
  const gestern = plusTag(h, -1);
  const anlagen = zpInfo(db, g.id).filter((i) => i.zp.richtung === "erzeugung" && i.anlage && i.teilnahmen.some((t) => teilnahmeAktivAm(t, gestern))).map((i) => ({ kwp: i.anlage.kwp || i.anlage.engpassleistungKw || 0, ausrichtung: i.anlage.ausrichtung ?? 0, neigung: i.anlage.neigung ?? 30 }));
  const st = E(db).anlagen.find((a) => a.gemeinschaftId === g.id && a.standort?.lat)?.standort || { lat: 48.2, lon: 13.5 };
  const p = prognose({ heute: h, historie, anlagen, standort: { lat: st.lat, lon: st.lon }, tage: Math.max(1, Math.min(7, Number(tage) || 7)), wetter: Array.isArray(wetter) ? wetter.slice(0, 7) : [] });
  return { gemeinschaftId: g.id, ...p };
}

// ================================================================ Mehrfachteilnahme-Optimierer

const schaetzCache = new Map();
function cache(k, fn) {
  if (!schaetzCache.has(k)) {
    if (schaetzCache.size > 30) schaetzCache.clear();
    schaetzCache.set(k, fn());
  }
  return schaetzCache.get(k);
}
function tagImJahr(t) {
  const [j, m, d] = t.split("-").map(Number);
  return { j, d: Math.round((Date.UTC(j, m - 1, d) - Date.UTC(j, 0, 1)) / 864e5) };
}
const pvProfil = (j, a) => cache(`pv|${j}|${a?.ausrichtung ?? 0}|${a?.neigung ?? 30}`, () => pvJahr({ jahr: j, lat: a?.standort?.lat ?? 48.2, lon: a?.standort?.lon ?? 13.5, ausrichtung: a?.ausrichtung ?? 0, neigung: a?.neigung ?? 30, spezErtrag: spezErtragStandard(a?.standort?.lat ?? 48.2), saat: 7 }));
function schaetzReihe(z, anlage, tag) {
  const { j, d } = tagImJahr(tag);
  if (z.richtung === "erzeugung") return pvProfil(j, anlage).slice(d * 96, d * 96 + 96).map((x) => x * (anlage?.kwp || 10));
  return cache(`H0|${j}`, () => lastprofil("H0", j)).slice(d * 96, d * 96 + 96).map((x) => x * 3500);
}
/** Gemeinschaft ohne Messdaten (z. B. in Gründung): Verbrauch der Mitglieder nach Standardlastprofil, Erzeugung der Anlagen */
function schaetzGemeinschaft(db, g, tag, ohneZp) {
  const { j, d } = tagImJahr(tag);
  const v = new Array(96).fill(0);
  const e = new Array(96).fill(0);
  const ART = { privat: ["H0", 3500], landwirt: ["L0", 12000], kmu: ["G0", 30000], grossunternehmen: ["G0", 1500000], gemeinde: ["G1", 30000], oeffentlich: ["G1", 30000], verein: ["G0", 8000] };
  for (const m of E(db).mitglieder.filter((x) => x.gemeinschaftId === g.id && !["abgelehnt", "ausgeschieden", "ausgeschlossen"].includes(x.status))) {
    const [p, kwh] = ART[m.art] || ART.privat;
    const prof = cache(`${p}|${j}`, () => lastprofil(p, j));
    for (let q = 0; q < 96; q++) v[q] += prof[d * 96 + q] * kwh;
  }
  for (const a of E(db).anlagen.filter((x) => x.gemeinschaftId === g.id && x.art === "pv" && x.status !== "stillgelegt")) {
    if (E(db).zaehlpunkte.find((x) => x.anlageId === a.id)?.id === ohneZp) continue;
    const pv = pvProfil(j, a);
    for (let q = 0; q < 96; q++) e[q] += pv[d * 96 + q] * (a.kwp || 0);
  }
  return { e, v };
}
const auf96 = (w) => (w.length === 96 ? w : w.length === 92 ? [...w.slice(0, 8), 0, 0, 0, 0, ...w.slice(8)] : [...w.slice(0, 12), ...w.slice(16)]);

export async function enOptimierung(n, { zaehlpunktId = "" } = {}) {
  const db = await lesenBereit();
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const z = E(db).zaehlpunkte.find((x) => x.id === zaehlpunktId);
  const tns = z ? E(db).teilnahmen.filter((t) => t.zaehlpunktId === z.id && TEILNAHME_ZAEHLT.includes(t.status)) : [];
  if (!z || !tns.length) throw nichtGefunden("Zählpunkt nicht gefunden.");
  const eigen = tns.some((t) => E(db).mitglieder.find((m) => m.id === t.mitgliedId)?.kontoId === n.id);
  const berechtigt = n.system || eigen || tns.some((t) => {
    const g = gemeinschaftVon(db, t.gemeinschaftId);
    return g && egStufe(kontext(db, n, g), "qh_einzeln") >= 1;
  });
  if (!berechtigt) throw nichtGefunden("Zählpunkt nicht gefunden.");
  const h = heute();
  const richtung = z.richtung;
  const mess = richtung === "verbrauch" ? "verbrauch_gemessen" : "erzeugung_gemessen";
  const mitDaten = tns.map((t) => gemeinschaftVon(db, t.gemeinschaftId)).find((g) => g && ctxVon(db, g.id));
  const alleTage = [];
  for (let t = `${monatPlus(monatVon(h), -12)}-01`; t < `${monatVon(h)}-01`; t = plusTag(t)) alleTage.push(t);
  const { tage, hochrechnung } = repraesentativeTage(alleTage);
  const anlage = z.anlageId ? E(db).anlagen.find((a) => a.id === z.anlageId) : null;
  const werte = [];
  const tagCache = new Map();
  const tagVon = (gid, t) => {
    const k = `${gid}|${t}`;
    if (!tagCache.has(k)) tagCache.set(k, tagDaten(db, gid, t));
    return tagCache.get(k);
  };
  let gemessen = 0;
  for (const t of tage) {
    const b = mitDaten ? tagVon(mitDaten.id, t).bloecke.get(`${z.id}|${mess}`) : null;
    const reihe = b ? auf96(b.werte.map((x) => x || 0)) : schaetzReihe(z, anlage, t);
    if (b) gemessen++;
    for (let q = 0; q < 96; q++) werte.push(reihe[q] || 0);
  }
  const kandidaten = tns.map((t) => {
    const g = gemeinschaftVon(db, t.gemeinschaftId);
    const tarif = tarifAm(E(db).tarife.filter((x) => x.gemeinschaftId === g.id), h);
    const regel = netzentgeltRegel({ datum: h, modell: g.modell, zonelevel: g.zonelevel, netzebene: z.netzebene || 7 });
    const bezug = tarif?.bezugspreisCt ?? SIM_STANDARD.bezugCt;
    const einspeis = tarif?.einspeisepreisCt ?? SIM_STANDARD.einspeisCt;
    const vorteil = richtung === "verbrauch" ? SIM_STANDARD.lieferantCt - bezug + (SIM_STANDARD.netzApCt - apReduziert(SIM_STANDARD.netzApCt, regel.reduktionPct)) + (regel.abgabenBefreit ? SIM_STANDARD.elAbgSonstCt : 0) : einspeis - SIM_STANDARD.marktwertCt;
    const ctx = ctxVon(db, g.id);
    const E1 = [];
    const D1 = [];
    for (const tg of tage) {
      let e = new Array(96).fill(0);
      let dd = new Array(96).fill(0);
      if (ctx) {
        for (const [key, b] of tagVon(g.id, tg).bloecke) {
          const [zpId, gr] = key.split("|");
          if (zpId === z.id || (gr !== "erzeugung_tf" && gr !== "verbrauch_tf")) continue;
          const w = auf96(b.werte.map((x) => x || 0));
          const ziel = gr === "erzeugung_tf" ? e : dd;
          for (let q = 0; q < 96; q++) ziel[q] += w[q];
        }
      } else {
        const s = schaetzGemeinschaft(db, g, tg, z.id);
        e = s.e;
        dd = s.v;
      }
      E1.push(...e);
      D1.push(...dd);
    }
    return { gemeinschaftId: g.id, label: g.name, vorteilCtKwh: rund(vorteil, 2), erzeugung: E1, verbrauch: D1, aktuellTf: t.teilnahmefaktor, status: t.status, datenbasis: ctx ? "Messwerte des Netzbetreibers" : "Schätzung aus der Mitgliederliste (Standardlastprofile)", tarif: tarif ? tarif.bezeichnung : "Standardannahme (kein gültiger Tarif)", netz: regel.text };
  });
  const erg = fach(() => tfOptimieren({ richtung, werte, kandidaten, hochrechnung }));
  return {
    zaehlpunktId: z.id, zaehlpunktnummer: z.zaehlpunktnummer, richtung, datenbasis: gemessen === tage.length ? "Messwerte (repräsentative Wochen je Monat)" : gemessen ? "teilweise Messwerte, Rest Standardprofil" : "Standardprofil (keine Messwerte)", stichprobeTage: tage.length, hochrechnung: rund(hochrechnung, 3),
    ...erg,
    empfehlung: erg.empfehlung.map((x) => {
      const k = kandidaten.find((c) => c.gemeinschaftId === x.gemeinschaftId);
      return { ...x, status: k.status, datenbasis: k.datenbasis, tarif: k.tarif, netz: k.netz };
    }),
    eigen,
  };
}

// ================================================================ Übersicht für Seiten (Zusatz, nicht im Vertrag)

/** Dashboard-Daten (Seite /portal/admin/eg/[id]/energiedaten und Organ-Reiter): 13 Monate, 30 Tage, 7 Tage Viertelstunden */
export async function enDashboard(n, gemeinschaftId) {
  const h = heute();
  const monate = await enMessreihen(n, { gemeinschaftId, von: `${monatPlus(monatVon(h), -13)}-01`, bis: plusTag(h, -1), aufloesung: "monat" });
  const tage = await enMessreihen(n, { gemeinschaftId, von: plusTag(h, -30), bis: plusTag(h, -1), aufloesung: "tag" });
  const woche = await enMessreihen(n, { gemeinschaftId, von: plusTag(h, -7), bis: plusTag(h, -1) });
  return { monate: monate.zeilen, tage: tage.zeilen, woche: woche.tage, heute: h };
}
