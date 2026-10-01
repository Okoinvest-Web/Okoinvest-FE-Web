// src/lib/plattform/backend/demo/eg-eda.js
//
// Demo-Backend WP2 „EDA-Marktkommunikation“ (Energiegemeinschaften) – Referenz für plattform/api/eg_eda.py.
// Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP2). Regeln: src/lib/plattform/eg/eda/*.js (rein, Python-Spiegel).
//
// Ablauf: Ausgehende Prozesse (Anmeldung, TF-Änderung, Abmeldung, Schlüssel, Zählpunktliste, Nachforderung) erzeugen eine
// Nachricht im kanonischen EDA-Format, die im Demo-Betrieb der Simulator-Netzbetreiber beantwortet (verzögert: 1 Simulations-
// tag = EDA_SIM_ZEITRAFFER_MS, Standard 15 s). Eingänge laufen über edaNachrichtEingang (idempotent je Absender+Message-ID),
// werden gegen den Prozess-Automaten geprüft und als Ereignisse an WP1 (egTeilnahmeUebergang – einzige Stelle, die den
// Teilnahme-Status ändert) bzw. als Energiedaten an WP3 (Ereignis eg.energiedaten.empfangen) weitergegeben.
//
// Rechte (eg/rechte.js): Lesen = eda_ausloesen ≥ 1 ODER eda_freigeben ≥ 1 ODER audit ≥ 1 (Organisator, Gründung, Vorstand,
// Kassier, Rechnungsprüfung; Backoffice „eg“ lesend). Auslösen = eda_ausloesen 2 (Organisator/Gründung mit Schreibrecht).
// Vier-Augen bei Massenabmeldung bzw. TF-Massenänderung (ab VIER_AUGEN_AB Teilnahmen): Freigabe nur durch eda_freigeben 2
// (Vorstand), nie durch die beantragende Person. Ohne jede Rolle → 404.
//
// Daten unter db.egEda (eigene Sammlung): prozesse[], nachrichten[], simulator { ausstehend[], seed }.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import {
  EDA_NACHRICHTEN, EDA_PROZESSE, MASSEN_MAX, PROZESS_OFFEN, PROZESS_STATUS, RICHTUNG_EDA, VIER_AUGEN_AB, abmeldungPruefen, alsGesendet, anmeldungPruefen, datenluecken, edaId,
  eingangAnwenden, eingangOhneProzess, energiedatenKennzahlen, energiedatenPayload, erinnerungText, fristAmpel, fristAnwenden, fristenPruefen, freigabeAnwenden, gemeinschaftEdaPruefen,
  lokalTag, nachforderungPruefen, nachrichtBauen, nachrichtLesen, plusTage, podlistAbgleich, portalAnleitung, prozessNeu, reklamationAkte, reklamationBefunde, reklamationVorlage,
  responsecodeInfo, simulatorAntworten, simulatorEnergiedaten, simulatorLiefertTag, startNachricht, tagBeginnUtc, tageZwischen, tfAenderungPruefen, vierAugenNoetig,
} from "../../eg/eda/index.js";
import { TEILNAHME_STATUS } from "../../eg/modell";
import { egRechteVon, egStufe } from "../../eg/rechte";
import { mitgliedName } from "../../eg/mitglied";
import * as stamm from "./eg-stamm";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { EDA_SEED_VERSION, edaSeed } from "./eg-eda-seed";

const { egIntern, egTeilnahmeUebergang } = stamm;
const { protokoll, benachrichtigen, nutzerById } = intern;
const SYS = { id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true }; // = egSystem() (backend/eg.js)
const ZEITRAFFER_MS = Math.max(1000, Number(process.env.EDA_SIM_ZEITRAFFER_MS) || 15000); // 1 Simulationstag im Demo-Betrieb
const ROH_MAX_CRMSG = 150; // Demo: nur die jüngsten Energiedaten-Rohinhalte behalten (Prüfsumme bleibt) – schont die Demo-DB
const heute = () => egIntern.heute();
const isoSek = (j) => `${String(j).slice(0, 19)}Z`;
const z6 = () => neueId("Z").slice(-6);
const X = (db) => db.egEda;
const EG = (db) => db.eg;

// ================================================================ Bestand

async function bereit() {
  const db = await egIntern.lesenBereit();
  const ok = (d) => (d.egEda?.v || 0) >= EDA_SEED_VERSION && d.egEda.basisV === (d.eg?.v || 0);
  if (ok(db)) return db;
  await aendern((d) => {
    if (ok(d)) return;
    try {
      d.egEda = edaSeed({ eg: d.eg, heute: heute(), jetztMs: Date.now(), neueId, sha256 });
    } catch (e) {
      console.warn("[plattform-demo] EDA-Demodaten nicht ergänzt:", e?.message);
      d.egEda = { v: EDA_SEED_VERSION, basisV: d.eg?.v || 0, prozesse: [], nachrichten: [], simulator: { ausstehend: [], seed: "oekoinvest-demo" } };
    }
  });
  return lesen();
}
async function aendernEda(fn) {
  await bereit();
  return aendern(fn);
}

// ================================================================ Rechte

function lesenZugriff(db, n, gid) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const g = egIntern.gemeinschaftVon(db, gid);
  if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  const k = egIntern.kontext(db, n, g);
  if (!k.rollen.length && !k.backofficeStufe) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  if (Math.max(egStufe(k, "eda_ausloesen"), egStufe(k, "eda_freigeben"), egStufe(k, "audit")) < 1) throw verboten("Ihre Rolle in dieser Gemeinschaft erlaubt keinen Einblick in die EDA-Kommunikation.");
  return { g, k };
}
const schreibZugriff = (db, n, gid) => egIntern.zugriff(db, n, gid, "eda_ausloesen", 2);

// ================================================================ Hilfen

const teilnahmeVon = (db, id) => EG(db).teilnahmen.find((t) => t.id === id) || null;
const zpVon = (db, id) => EG(db).zaehlpunkte.find((z) => z.id === id) || null;
const nbVon = (db, id) => EG(db).netzbetreiber.find((x) => x.id === id) || null;
const mitgliedVon = (db, id) => EG(db).mitglieder.find((m) => m.id === id) || null;
function nbFuer(db, g, zp) {
  return nbVon(db, zp?.netzbetreiberId) || nbVon(db, g.netzbetreiber?.[0]) || { id: g.netzbetreiber?.[0] || "", name: "Netzbetreiber", kurzname: "", marktpartnerId: "" };
}

/** Sicht des simulierten Netzbetreibers: kennt alle Gemeinschaften am Zählpunkt (fremde Σ TF, Anzahl) */
function nbSicht(db, g, zpnr, empfaenger) {
  const zp = EG(db).zaehlpunkte.find((z) => z.zaehlpunktnummer === zpnr);
  const fremd = zp ? EG(db).teilnahmen.filter((t) => t.zaehlpunktId === zp.id && t.gemeinschaftId !== g.id && ["angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt"].includes(t.status)) : [];
  const liste = EG(db).teilnahmen.filter((t) => t.gemeinschaftId === g.id && ["aktiv", "abmeldung_angefragt"].includes(t.status)).map((t) => {
    const z = zpVon(db, t.zaehlpunktId);
    return z ? { MeteringPoint: z.zaehlpunktnummer, ConsentId: t.consentId || "", EnergyDirection: RICHTUNG_EDA[z.richtung], ECPartFact: String(t.teilnahmefaktor), DateFrom: t.gueltigAb || undefined } : null;
  }).filter(Boolean);
  return {
    zaehlpunkte: zpnr ? { [zpnr]: { bekannt: !!zp && (!zp.nbNummer || `AT${zp.nbNummer}` === empfaenger), smartMeter: zp?.smartMeter || "unbekannt", fremdTf: fremd.reduce((s, t) => s + (Number(t.teilnahmefaktor) || 0), 0), fremdAnzahl: fremd.length } } : {},
    liste, modell: g.verteilmodell === "statisch" ? "STATIC" : "DYNAMIC",
  };
}

function nachrichtAnlegen(db, { g, p = null, richtung, code, prozesscode, xml, absender, empfaenger, messageId, conversationId, kanal = "simulator", teilnahmeId = "", zaehlpunktnummer = "", tag = "", betreff = "", fehler = "", hinweise = [], kennzahlen = null, verarbeitet = true }) {
  const m = {
    id: neueId("EDN"), gemeinschaftId: g?.id || "", prozessId: p?.id || "", teilnahmeId: teilnahmeId || p?.teilnahmeId || "", zaehlpunktnummer: zaehlpunktnummer || p?.zaehlpunktnummer || "", richtung, nachrichtencode: code, prozesscode,
    messageId, conversationId, absender, empfaenger, zeitpunkt: jetzt(), tag, kanal, versandStatus: richtung === "aus" ? (kanal === "simulator" ? "quittiert" : "wartend") : "", versuche: richtung === "aus" ? 1 : 0,
    verarbeitet, verarbeitetAm: verarbeitet ? jetzt() : "", weitergeleitet: false, fehler, hinweise, kennzahlen, sha256: sha256(xml || ""), groesse: (xml || "").length, betreff, rohinhalt: xml || "", rohinhaltArchiviert: false, schluessel: `${absender}|${messageId}`,
  };
  X(db).nachrichten.push(m);
  if (code === "DATEN_CRMSG") {
    const mitRoh = X(db).nachrichten.filter((x) => x.nachrichtencode === "DATEN_CRMSG" && x.rohinhalt);
    for (const alt of mitRoh.slice(0, Math.max(0, mitRoh.length - ROH_MAX_CRMSG))) Object.assign(alt, { rohinhalt: "", rohinhaltArchiviert: true });
  }
  return m;
}

/** Startnachricht erzeugen, Prozess als gesendet markieren, Simulator-Antworten einplanen (innerhalb einer Änderung) */
function versenden(db, p, { wiederholung = false } = {}) {
  const g = egIntern.gemeinschaftVon(db, p.gemeinschaftId);
  const t = p.teilnahmeId ? teilnahmeVon(db, p.teilnahmeId) : null;
  const zp = p.zaehlpunktId ? zpVon(db, p.zaehlpunktId) : null;
  const j = jetzt();
  const messageId = edaId(g.marktpartnerId, j, z6());
  const { code, xml } = startNachricht(p, { gemeinschaft: g, zaehlpunkt: zp, teilnahme: t, messageId, erstellt: isoSek(j), modus: "SIMU", duplikat: wiederholung });
  nachrichtAnlegen(db, { g, p, richtung: "aus", code, prozesscode: p.prozesscode, xml, absender: g.marktpartnerId, empfaenger: p.empfaenger, messageId, conversationId: p.conversationId });
  Object.assign(p, alsGesendet(p, { jetzt: j, messageId, wiederholung }));
  const sim = X(db).simulator;
  if (wiederholung && sim.ausstehend.some((a) => a.conversationId === p.conversationId)) return;
  const antworten = simulatorAntworten(nachrichtLesen(xml), nbSicht(db, g, p.zaehlpunktnummer, p.empfaenger), { seed: sim.seed, heute: heute() });
  for (const a of antworten) sim.ausstehend.push({ id: neueId("SIM"), faelligAm: Date.now() + a.nachTagen * ZEITRAFFER_MS, gemeinschaftId: g.id, prozessId: p.id, conversationId: p.conversationId, code: a.code, prozesscode: a.prozesscode, daten: a.daten, absender: p.empfaenger, empfaenger: g.marktpartnerId });
}

function neuerProzess(db, g, { prozesscode, teilnahme = null, zaehlpunkt = null, prozessdatum, parameter = {}, freigabeNoetig = false, n, id = null, massenId = "" }) {
  const nb = nbFuer(db, g, zaehlpunkt);
  const p = prozessNeu({ prozesscode, gemeinschaft: g, teilnahme, zaehlpunkt, netzbetreiber: nb, prozessdatum, parameter, freigabeNoetig, jetzt: jetzt(), von: n?.system ? null : n?.id || null });
  Object.assign(p, { id: id || neueId("EDP"), conversationId: edaId(g.marktpartnerId || "XX000000", jetzt(), z6()), massenId, erstelltAm: jetzt(), erstelltVon: n?.system ? null : n?.id || null });
  if (!p.empfaenger && !EDA_PROZESSE[prozesscode].intern) throw konflikt(`EDA-Adresse des Netzbetreibers ${nb.kurzname || nb.id} fehlt (Marktpartner-ID in den Netzbetreiber-Stammdaten pflegen).`);
  X(db).prozesse.push(p);
  return p;
}

function prozessAusgabe(db, p, h = heute()) {
  const t = p.teilnahmeId ? teilnahmeVon(db, p.teilnahmeId) : null;
  const m = t ? mitgliedVon(db, t.mitgliedId) : null;
  return {
    ...p, statusLabel: PROZESS_STATUS[p.status]?.label || p.status, ton: PROZESS_STATUS[p.status]?.ton || "neutral", label: EDA_PROZESSE[p.prozesscode]?.label || p.prozesscode, kurz: EDA_PROZESSE[p.prozesscode]?.kurz || p.prozesscode,
    ampel: fristAmpel(p, t, h), teilnahmeStatus: t?.status || "", teilnahmeStatusLabel: t ? TEILNAHME_STATUS[t.status]?.label || t.status : "", mitgliedName: m ? mitgliedName(m) : "", mitgliedId: m?.id || "",
    response: responsecodeInfo(p.responsecode),
  };
}
function nachrichtAusgabe(m, mitRoh = false) {
  const { rohinhalt, ...rest } = m;
  return { ...rest, codeLabel: EDA_NACHRICHTEN[m.nachrichtencode]?.label || m.nachrichtencode, ...(mitRoh ? { rohinhalt } : {}) };
}

async function uebergang(n, teilnahmeId, daten, fehlerListe) {
  try {
    await egTeilnahmeUebergang(n, teilnahmeId, daten);
    return true;
  } catch (e) {
    fehlerListe?.push(`${daten.ereignis}: ${e.message}`);
    return false;
  }
}

async function fassade() {
  return import("../eg");
}

// ================================================================ Eingang (idempotent)

async function eingangIntern(n, xml, quelle = "manuell") {
  const gelesen = nachrichtLesen(xml);
  const k = gelesen.kopf || {};
  const plan = await aendernEda((db) => {
    const x = X(db);
    const schluessel = `${k.absender || ""}|${k.messageId || ""}`;
    const doppelt = k.messageId && x.nachrichten.find((m) => m.schluessel === schluessel);
    if (doppelt) return { doppelt: true, ok: true, nachrichtId: doppelt.id, prozessId: doppelt.prozessId };
    const g = EG(db).gemeinschaften.find((y) => y.marktpartnerId && y.marktpartnerId === k.empfaenger) || null;
    if (!g) throw nichtGefunden("Keine Gemeinschaft mit dieser EDA-Adresse (Empfänger) gefunden.");
    if (!n?.system) schreibZugriff(db, n, g.id);
    const kanal = ["simulator", "email", "kep", "datei", "manuell", "portal"].includes(quelle) ? quelle : "manuell";
    if (!gelesen.ok) {
      const m = nachrichtAnlegen(db, { g, richtung: "ein", code: k.nachrichtencode || "EDASendError", prozesscode: k.prozesscode || "", xml, absender: k.absender || "", empfaenger: k.empfaenger || "", messageId: k.messageId || `UNGUELTIG-${neueId("X")}`, conversationId: k.conversationId || "", kanal, fehler: gelesen.fehler.join(" · "), hinweise: gelesen.hinweise, verarbeitet: false });
      protokoll(db, n?.system ? null : n, "eg_eda_eingang_fehler", "eg_gemeinschaft", g.id, `Ungültige EDA-Nachricht ${m.id}: ${gelesen.fehler[0]}`);
      return { ok: false, nachrichtId: m.id, fehler: gelesen.fehler };
    }
    let p = x.prozesse.find((y) => y.gemeinschaftId === g.id && y.conversationId === k.conversationId && y.prozesscode !== "CR_MSG") || null;
    const zpnr = gelesen.daten.MeteringPoint || "";
    let t = p?.teilnahmeId ? teilnahmeVon(db, p.teilnahmeId) : null;
    if (!t && zpnr) {
      const zp = EG(db).zaehlpunkte.find((z) => z.zaehlpunktnummer === zpnr);
      const kand = zp ? EG(db).teilnahmen.filter((y) => y.zaehlpunktId === zp.id && y.gemeinschaftId === g.id) : [];
      t = kand.find((y) => ["aktiv", "abmeldung_angefragt"].includes(y.status)) || kand.find((y) => y.status !== "verworfen") || null;
    }
    let r;
    let payload = null;
    if (p) {
      r = eingangAnwenden(p, gelesen, { teilnahme: t, jetzt: jetzt() });
      Object.assign(p, r.prozess);
    } else {
      const o = eingangOhneProzess(gelesen, { teilnahme: t });
      r = { ereignisse: o.ereignisse, energiedaten: o.energiedaten, hinweise: o.hinweise, klaerfall: o.prozesscode ? "" : o.hinweise[0] || "", verteilschluessel: "" };
      if (o.prozesscode === "CR_MSG") {
        const mon = lokalTag(gelesen.daten.Energy?.start || isoSek(jetzt())).slice(0, 7);
        const conv = `CRMSG-${g.id}-${mon}`;
        p = x.prozesse.find((y) => y.conversationId === conv);
        if (!p) {
          p = prozessNeu({ prozesscode: "CR_MSG", gemeinschaft: g, netzbetreiber: nbFuer(db, g, null), prozessdatum: `${mon}-01`, jetzt: jetzt() });
          Object.assign(p, { id: neueId("EDP"), conversationId: conv, status: "bestaetigt", erstelltAm: jetzt(), erstelltVon: null, ergebnis: { nachrichten: 0, tage: [] } });
          p.verlauf.push({ am: jetzt(), von: "entwurf", nach: "bestaetigt", nachricht: "DATEN_CRMSG", text: `Datenempfang ${mon}`, konto: null });
          x.prozesse.push(p);
        }
        p.ergebnis = { ...p.ergebnis, nachrichten: (p.ergebnis?.nachrichten || 0) + 1 };
      } else if (o.prozesscode) {
        const zp = t ? zpVon(db, t.zaehlpunktId) : null;
        p = prozessNeu({ prozesscode: o.prozesscode, gemeinschaft: g, teilnahme: t, zaehlpunkt: zp, netzbetreiber: nbFuer(db, g, zp), prozessdatum: k.prozessdatum, parameter: { zum: gelesen.daten.ConsentEnd || "" }, jetzt: jetzt() });
        Object.assign(p, { id: neueId("EDP"), conversationId: k.conversationId, status: "abgeschlossen", zaehlpunktnummer: zpnr, erstelltAm: jetzt(), erstelltVon: null });
        p.verlauf.push({ am: jetzt(), von: "entwurf", nach: "abgeschlossen", nachricht: k.nachrichtencode, text: o.text, konto: null });
        x.prozesse.push(p);
      }
    }
    const m = nachrichtAnlegen(db, { g, p, richtung: "ein", code: k.nachrichtencode, prozesscode: k.prozesscode, xml, absender: k.absender, empfaenger: k.empfaenger, messageId: k.messageId, conversationId: k.conversationId, kanal, teilnahmeId: t?.id || "", zaehlpunktnummer: zpnr, hinweise: [...gelesen.hinweise, ...(r.hinweise || [])], fehler: r.klaerfall || "" });
    if (r.energiedaten) {
      const e = energiedatenPayload(gelesen, { gemeinschaftId: g.id, nachrichtId: m.id });
      payload = e.payload;
      const kz = energiedatenKennzahlen(payload);
      Object.assign(m, { tag: e.tag, kennzahlen: { werte: kz.werte, l3: kz.l3, fehlend: kz.fehlend, von: payload?.von || "", groessen: kz.groessen }, hinweise: [...m.hinweise, ...e.hinweise] });
    }
    if (r.klaerfall && p) p.merker = [...new Set([...(p.merker || []), "klaerfall"])];
    return { ok: true, nachrichtId: m.id, prozessId: p?.id || "", gid: g.id, teilnahmeId: t?.id || "", ereignisse: r.ereignisse || [], payload, verteilschluessel: r.verteilschluessel, prozesscode: p?.prozesscode || "", parameter: p?.parameter || {} };
  });
  if (plan.doppelt || !plan.ok) return plan;
  const fehler = [];
  for (const ev of plan.ereignisse) {
    if (!plan.teilnahmeId) {
      fehler.push(`Teilnahme zum Zählpunkt nicht gefunden – Ereignis ${ev.ereignis} nicht übernommen.`);
      break;
    }
    if (!(await uebergang(SYS, plan.teilnahmeId, { ...ev, prozessId: plan.prozessId }, fehler))) break;
  }
  let weitergeleitet = false;
  if (plan.payload) {
    try {
      const { egEreignisSenden } = await fassade();
      const r = await egEreignisSenden("eg.energiedaten.empfangen", plan.payload);
      weitergeleitet = !!r?.zugestellt;
    } catch (e) {
      fehler.push(`Weitergabe an Energiedaten (WP3): ${e.status === 501 ? "noch nicht verfügbar" : e.message}`);
    }
  }
  if (plan.verteilschluessel && plan.prozesscode === "EC_PRT_CHANGE" && plan.parameter?.verteilschluesselId && typeof stamm.egVerteilschluesselStatus === "function") {
    const rest = (await bereit()).egEda.prozesse.filter((y) => y.parameter?.verteilschluesselId === plan.parameter.verteilschluesselId && PROZESS_OFFEN.includes(y.status));
    if (!rest.length) await stamm.egVerteilschluesselStatus(SYS, plan.parameter.verteilschluesselId, { status: "gueltig", edaProzessId: plan.prozessId }).catch((e) => fehler.push(`Verteilschlüssel: ${e.message}`));
  }
  await aendern((db) => {
    const m = X(db).nachrichten.find((y) => y.id === plan.nachrichtId);
    if (!m) return;
    m.weitergeleitet = weitergeleitet;
    if (fehler.length) {
      m.fehler = [m.fehler, ...fehler].filter(Boolean).join(" · ");
      const p = X(db).prozesse.find((y) => y.id === plan.prozessId);
      if (p) p.merker = [...new Set([...(p.merker || []), "klaerfall"])];
      protokoll(db, null, "eg_eda_klaerfall", "eg_gemeinschaft", plan.gid, `EDA-Klärfall ${m.nachrichtencode} (${m.id}): ${fehler[0]}`);
    }
  });
  return { ok: true, doppelt: false, nachrichtId: plan.nachrichtId, prozessId: plan.prozessId, ereignisse: plan.ereignisse.map((e) => e.ereignis), weitergeleitet, fehler };
}

// ================================================================ Simulator

async function zustellen({ gid = "", alle = false, max = 300 } = {}) {
  const db = await bereit();
  const jetztMs = Date.now();
  const faellig = X(db).simulator.ausstehend.filter((a) => (!gid || a.gemeinschaftId === gid) && (alle || a.faelligAm <= jetztMs)).sort((a, b) => a.faelligAm - b.faelligAm).slice(0, max);
  if (!faellig.length) return { zugestellt: 0, ergebnisse: [] };
  const ids = new Set(faellig.map((a) => a.id));
  await aendern((d) => {
    d.egEda.simulator.ausstehend = d.egEda.simulator.ausstehend.filter((a) => !ids.has(a.id));
  });
  const ergebnisse = [];
  for (const a of faellig) {
    try {
      let daten = a.daten;
      if (a.code === "DATEN_CRMSG" && a.daten.tag) daten = { MeteringPoint: a.daten.MeteringPoint, ECID: a.daten.ECID, Energy: energieFuer(db, a.daten.MeteringPoint, a.daten.tag, a.gemeinschaftId) };
      const j = jetzt();
      const xml = nachrichtBauen({ code: a.code, prozesscode: a.prozesscode, absender: a.absender, empfaenger: a.empfaenger, erstellt: isoSek(j), messageId: edaId(a.absender, j, z6()), conversationId: a.conversationId, prozessdatum: heute(), modus: "SIMU", daten });
      ergebnisse.push(await eingangIntern(SYS, xml, "simulator"));
    } catch (e) {
      ergebnisse.push({ ok: false, fehler: [e.message] });
    }
  }
  return { zugestellt: ergebnisse.filter((r) => r.ok).length, ergebnisse };
}

function energieFuer(db, zpnr, tag, gid) {
  const zp = EG(db).zaehlpunkte.find((z) => z.zaehlpunktnummer === zpnr);
  const t = zp ? EG(db).teilnahmen.find((y) => y.zaehlpunktId === zp.id && y.gemeinschaftId === gid) : null;
  const anlage = zp?.anlageId ? EG(db).anlagen.find((x) => x.id === zp.anlageId) : null;
  return simulatorEnergiedaten({ zaehlpunktnummer: zpnr, tag, richtung: zp?.richtung || "verbrauch", teilnahmefaktor: t?.teilnahmefaktor ?? 100, kwp: anlage?.kwp || anlage?.engpassleistungKw || 10, jahresverbrauchKwh: 3500, seed: X(db).simulator.seed });
}

// ================================================================ Lesen

function empfangeneTage(db, gid) {
  const e = {};
  for (const m of X(db).nachrichten) if (m.gemeinschaftId === gid && m.nachrichtencode === "DATEN_CRMSG" && m.tag) (e[m.zaehlpunktnummer] ||= []).push(m.tag);
  return e;
}
/** Erster Tag mit Energiedaten der Gemeinschaft über diese Plattform – davor (z. B. vor dem Wechsel) keine Lücken melden */
function empfangSeit(db, gid, standard) {
  let seit = "";
  for (const m of X(db).nachrichten) if (m.gemeinschaftId === gid && m.nachrichtencode === "DATEN_CRMSG" && m.tag && (!seit || m.tag < seit)) seit = m.tag;
  return seit && seit > standard ? seit : standard;
}
function teilnahmenMitZp(db, gid) {
  return EG(db).teilnahmen.filter((t) => t.gemeinschaftId === gid).map((t) => ({ t, zp: zpVon(db, t.zaehlpunktId) })).filter((x) => x.zp);
}

export async function edaUebersicht(n, gemeinschaftId) {
  await zustellen({ gid: gemeinschaftId }).catch(() => {});
  const db = await bereit();
  const { g, k } = lesenZugriff(db, n, gemeinschaftId);
  const h = heute();
  const prozesse = X(db).prozesse.filter((p) => p.gemeinschaftId === g.id);
  const ausg = prozesse.map((p) => prozessAusgabe(db, p, h)).sort((a, b) => String(b.verlauf.at(-1)?.am || "").localeCompare(String(a.verlauf.at(-1)?.am || "")));
  const tl = teilnahmenMitZp(db, g.id).map(({ t, zp }) => {
    const m = mitgliedVon(db, t.mitgliedId);
    const letzter = ausg.find((p) => p.teilnahmeId === t.id && p.prozesscode !== "CR_MSG");
    return { id: t.id, status: t.status, statusLabel: TEILNAHME_STATUS[t.status]?.label || t.status, ton: TEILNAHME_STATUS[t.status]?.ton || "neutral", teilnahmefaktor: t.teilnahmefaktor, consentId: t.consentId, gueltigAb: t.gueltigAb, gueltigBis: t.gueltigBis, fristBis: t.fristBis, zaehlpunktId: zp.id, zaehlpunktnummer: zp.zaehlpunktnummer, richtung: zp.richtung, smartMeter: zp.smartMeter, netzbetreiberId: zp.netzbetreiberId, mitgliedId: m?.id || "", mitgliedName: m ? mitgliedName(m) : "", mitgliedKonto: !!m?.kontoId, mitgliedEmail: !!m?.person?.email, letzterProzess: letzter ? { id: letzter.id, prozesscode: letzter.prozesscode, status: letzter.status, responsecode: letzter.responsecode, ampel: letzter.ampel } : null, anmeldungVorgemerkt: !!t.anmeldungVorgemerkt };
  });
  const luecken = datenluecken({ teilnahmen: tl.filter((t) => t.gueltigAb && ["aktiv", "abmeldung_angefragt", "beendet"].includes(t.status)).map((t) => ({ teilnahmeId: t.id, zaehlpunktnummer: t.zaehlpunktnummer, gueltigAb: t.gueltigAb, gueltigBis: t.gueltigBis })), empfangen: empfangeneTage(db, g.id), von: empfangSeit(db, g.id, plusTage(h, -14)), bis: h, heute: h });
  const nbs = [...new Set([...(g.netzbetreiber || []), ...tl.map((t) => t.netzbetreiberId).filter(Boolean)])].map((id) => nbVon(db, id)).filter(Boolean);
  const offen = ausg.filter((p) => PROZESS_OFFEN.includes(p.status) && p.prozesscode !== "CR_MSG");
  const heuteNachrichten = X(db).nachrichten.filter((m) => m.gemeinschaftId === g.id && String(m.zeitpunkt).slice(0, 10) === h).length;
  return {
    gemeinschaft: { id: g.id, name: g.name, modell: g.modell, status: g.status, marktpartnerId: g.marktpartnerId, gemeinschaftsId: g.gemeinschaftsId, verteilmodell: g.verteilmodell, edaAnbindung: g.edaAnbindung, netzbetreiber: g.netzbetreiber },
    voraussetzungen: gemeinschaftEdaPruefen(g), rechte: egRechteVon(k), rollen: k.rollen, heute: h,
    kennzahlen: {
      prozesseOffen: offen.length, freigabenOffen: ausg.filter((p) => p.status === "freigabe_offen").length, zustimmungOffen: tl.filter((t) => t.status === "zustimmung_offen").length, wartetTechnik: tl.filter((t) => t.status === "wartet_technik").length,
      fristRot: ausg.filter((p) => p.ampel.ampel === "rot").length, fristGelb: ausg.filter((p) => p.ampel.ampel === "gelb").length, abgelehnt: tl.filter((t) => ["abgelehnt", "abgelaufen"].includes(t.status)).length, entwurf: tl.filter((t) => t.status === "entwurf").length,
      aktiv: tl.filter((t) => t.status === "aktiv").length, nachrichtenHeute: heuteNachrichten, zpMitLuecken: luecken.length, lueckenTage: luecken.reduce((s, l) => s + l.anzahl, 0),
    },
    prozesse: ausg.slice(0, 400), teilnahmen: tl, luecken,
    netzbetreiber: nbs.map((x) => ({ id: x.id, name: x.name, kurzname: x.kurzname, marktpartnerId: x.marktpartnerId, kontaktEmail: x.kontaktEmail, anleitung: portalAnleitung(x.id) })),
    simulator: { aktiv: true, ausstehend: X(db).simulator.ausstehend.filter((a) => a.gemeinschaftId === g.id).length, zeitrafferSekunden: ZEITRAFFER_MS / 1000 },
    vierAugenAb: VIER_AUGEN_AB,
  };
}

export async function edaProzesse(n, gemeinschaftId, { status = "", code = "" } = {}) {
  const db = await bereit();
  const { g } = lesenZugriff(db, n, gemeinschaftId);
  return { prozesse: X(db).prozesse.filter((p) => p.gemeinschaftId === g.id && (!status || p.status === status) && (!code || p.prozesscode === code)).map((p) => prozessAusgabe(db, p)), heute: heute() };
}

export async function edaProzess(n, id) {
  const db = await bereit();
  const p = X(db).prozesse.find((y) => y.id === id);
  if (!p) throw nichtGefunden("EDA-Prozess nicht gefunden.");
  const { g, k } = lesenZugriff(db, n, p.gemeinschaftId);
  const nachrichten = X(db).nachrichten.filter((m) => m.prozessId === p.id).sort((a, b) => String(a.zeitpunkt).localeCompare(String(b.zeitpunkt)));
  const t = p.teilnahmeId ? teilnahmeVon(db, p.teilnahmeId) : null;
  let abgleich = null;
  if (p.prozesscode === "EC_PODLIST" && p.ergebnis?.liste) {
    const soll = teilnahmenMitZp(db, g.id).map(({ t: x, zp }) => ({ zaehlpunktnummer: zp.zaehlpunktnummer, teilnahmeId: x.id, status: x.status, consentId: x.consentId, teilnahmefaktor: x.teilnahmefaktor, richtung: zp.richtung, gueltigBis: x.gueltigBis }));
    abgleich = podlistAbgleich(soll, p.ergebnis.liste, heute());
  }
  return { prozess: prozessAusgabe(db, p), nachrichten: nachrichten.slice(-60).map((m) => nachrichtAusgabe(m, true)), teilnahme: t ? { ...t, statusLabel: TEILNAHME_STATUS[t.status]?.label || t.status } : null, abgleich, rechte: egRechteVon(k), gemeinschaft: { id: g.id, name: g.name } };
}

export async function edaJournal(n, gemeinschaftId, { richtung = "", code = "", q = "", nachrichtId = "", limit = 200 } = {}) {
  const db = await bereit();
  const { g } = lesenZugriff(db, n, gemeinschaftId);
  const such = String(q || "").toLowerCase().trim();
  if (nachrichtId) {
    const m = X(db).nachrichten.find((y) => y.id === nachrichtId && y.gemeinschaftId === g.id);
    if (!m) throw nichtGefunden("Nachricht nicht gefunden.");
    return { nachricht: nachrichtAusgabe(m, true) };
  }
  const liste = X(db).nachrichten.filter((m) => m.gemeinschaftId === g.id && (!richtung || m.richtung === richtung) && (!code || m.nachrichtencode === code) && (!such || `${m.messageId} ${m.conversationId} ${m.zaehlpunktnummer} ${m.nachrichtencode} ${m.sha256}`.toLowerCase().includes(such)));
  liste.sort((a, b) => String(b.zeitpunkt).localeCompare(String(a.zeitpunkt)));
  const codes = [...new Set(X(db).nachrichten.filter((m) => m.gemeinschaftId === g.id).map((m) => m.nachrichtencode))].sort();
  return { nachrichten: liste.slice(0, Math.min(1000, Math.max(1, Number(limit) || 200))).map((m) => nachrichtAusgabe(m)), gesamt: liste.length, codes, gemeinschaft: { id: g.id, name: g.name } };
}

export async function edaFreigaben(n, gemeinschaftId) {
  const db = await bereit();
  const { g, k } = egIntern.zugriff(db, n, gemeinschaftId, "eda_freigeben", 1);
  return { freigaben: X(db).prozesse.filter((p) => p.gemeinschaftId === g.id && p.status === "freigabe_offen").map((p) => prozessAusgabe(db, p)), darfFreigeben: egStufe(k, "eda_freigeben") >= 2, gemeinschaft: { id: g.id, name: g.name } };
}

// ================================================================ Auslösen

const tlIds = (ids) => {
  const l = [...new Set((Array.isArray(ids) ? ids : []).map(String))];
  if (!l.length) throw ungueltig("Bitte mindestens eine Teilnahme auswählen.");
  if (l.length > MASSEN_MAX) throw ungueltig(`Höchstens ${MASSEN_MAX} Teilnahmen je Auftrag.`);
  return l;
};

export async function edaAnmelden(n, gemeinschaftId, { teilnahmeIds = [], offline = false } = {}) {
  const ids = tlIds(teilnahmeIds);
  let db = await bereit();
  schreibZugriff(db, n, gemeinschaftId);
  const prozesse = [];
  const fehler = [];
  const hinweise = [];
  for (const tid of ids) {
    db = await lesen();
    const g = egIntern.gemeinschaftVon(db, gemeinschaftId);
    const t = teilnahmeVon(db, tid);
    if (!t || t.gemeinschaftId !== g.id) {
      fehler.push({ id: tid, fehler: "Teilnahme nicht gefunden." });
      continue;
    }
    const zp = zpVon(db, t.zaehlpunktId);
    const r = anmeldungPruefen({ gemeinschaft: g, teilnahme: t, zaehlpunkt: zp, teilnahmenDesZp: EG(db).teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), offeneProzesse: X(db).prozesse.filter((p) => p.teilnahmeId === t.id), heute: heute() });
    if (!r.ok) {
      fehler.push({ id: tid, fehler: r.fehler.join(" ") });
      continue;
    }
    hinweise.push(...r.hinweise.map((x) => ({ id: tid, hinweis: x })));
    const pid = neueId("EDP");
    const fl = [];
    let ok = true;
    for (const ev of [...r.ereignisseVorher, "senden"]) if (ok) ok = await uebergang(n, tid, { ereignis: ev, prozessId: pid }, fl);
    if (!ok) {
      fehler.push({ id: tid, fehler: fl.join(" ") });
      continue;
    }
    const p = await aendern((d) => {
      const g2 = egIntern.gemeinschaftVon(d, gemeinschaftId);
      const t2 = teilnahmeVon(d, tid);
      const zp2 = zpVon(d, t2.zaehlpunktId);
      const pr = neuerProzess(d, g2, { prozesscode: offline ? "EC_REQ_OFF" : "EC_REQ_ONL", teilnahme: t2, zaehlpunkt: zp2, prozessdatum: heute(), parameter: { teilnahmefaktor: t2.teilnahmefaktor, richtung: RICHTUNG_EDA[zp2?.richtung] }, n, id: pid });
      for (const alt of X(d).prozesse) if (alt.teilnahmeId === tid && alt.id !== pid && ["abgelehnt", "zeitueberschreitung", "fehler"].includes(alt.status) && !alt.nachfolgerId) alt.nachfolgerId = pid;
      versenden(d, pr);
      protokoll(d, n?.system ? null : n, "eg_eda_anmeldung", "eg_gemeinschaft", g2.id, `${pr.prozesscode} für ${pr.zaehlpunktnummer} gesendet (${pr.id})`);
      return prozessAusgabe(d, pr);
    }).catch((e) => {
      fehler.push({ id: tid, fehler: e.message });
      return null;
    });
    if (p) prozesse.push(p);
  }
  return { prozesse, fehler, hinweise };
}

export async function edaTfAendern(n, gemeinschaftId, { aenderungen = [] } = {}) {
  const liste = Array.isArray(aenderungen) ? aenderungen.slice(0, MASSEN_MAX) : [];
  if (!liste.length) throw ungueltig("Bitte mindestens eine Änderung angeben.");
  const vier = vierAugenNoetig("tf", liste.length);
  const massenId = vier ? neueId("MSV") : "";
  const prozesse = [];
  const fehler = [];
  for (const a of liste) {
    const r = await aendernEda((db) => {
      const { g } = schreibZugriff(db, n, gemeinschaftId);
      const t = teilnahmeVon(db, String(a.teilnahmeId || ""));
      if (!t || t.gemeinschaftId !== g.id) return { fehler: "Teilnahme nicht gefunden." };
      const pr = tfAenderungPruefen({ gemeinschaft: g, teilnahme: t, teilnahmefaktor: Number(a.teilnahmefaktor), ab: String(a.ab || ""), teilnahmenDesZp: EG(db).teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), prozesse: X(db).prozesse.filter((p) => p.teilnahmeId === t.id), heute: heute() });
      if (!pr.ok) return { fehler: pr.fehler.join(" ") };
      const p = neuerProzess(db, g, { prozesscode: "EC_PRTFACT_CHG", teilnahme: t, zaehlpunkt: zpVon(db, t.zaehlpunktId), prozessdatum: String(a.ab), parameter: { teilnahmefaktor: Number(a.teilnahmefaktor), ab: String(a.ab), vorher: t.teilnahmefaktor }, freigabeNoetig: vier, n, massenId });
      if (!vier) versenden(db, p);
      protokoll(db, n?.system ? null : n, "eg_eda_tf", "eg_gemeinschaft", g.id, `TF ${t.teilnahmefaktor} → ${a.teilnahmefaktor} % ab ${a.ab} (${p.id}${vier ? ", Freigabe offen" : ""})`);
      return { prozess: prozessAusgabe(db, p) };
    }).catch((e) => ({ fehler: e.message, status: e.status }));
    if (r.status === 403 || r.status === 404) throw new PlattformFehler(r.status, r.fehler);
    if (r.fehler) fehler.push({ id: a.teilnahmeId, fehler: r.fehler });
    else prozesse.push(r.prozess);
  }
  if (vier && prozesse.length) await freigabeMelden(gemeinschaftId, prozesse.length, "TF-Änderungen");
  return { prozesse, fehler, freigabeNoetig: vier && prozesse.length > 0, massenId };
}

export async function edaAbmelden(n, gemeinschaftId, { teilnahmeIds = [], zum = "" } = {}) {
  const ids = tlIds(teilnahmeIds);
  const vier = vierAugenNoetig("abmelden", ids.length);
  const massenId = vier ? neueId("MSV") : "";
  const prozesse = [];
  const fehler = [];
  for (const tid of ids) {
    const db = await bereit();
    const { g } = schreibZugriff(db, n, gemeinschaftId);
    const t = teilnahmeVon(db, tid);
    if (!t || t.gemeinschaftId !== g.id) {
      fehler.push({ id: tid, fehler: "Teilnahme nicht gefunden." });
      continue;
    }
    const pr = abmeldungPruefen({ gemeinschaft: g, teilnahme: t, zum: String(zum || ""), prozesse: X(db).prozesse.filter((p) => p.teilnahmeId === t.id), heute: heute() });
    if (!pr.ok) {
      fehler.push({ id: tid, fehler: pr.fehler.join(" ") });
      continue;
    }
    const pid = neueId("EDP");
    if (!vier) {
      const fl = [];
      if (!(await uebergang(n, tid, { ereignis: "cm_rev_sp", datum: zum, prozessId: pid }, fl))) {
        fehler.push({ id: tid, fehler: fl.join(" ") });
        continue;
      }
    }
    const p = await aendern((d) => {
      const g2 = egIntern.gemeinschaftVon(d, gemeinschaftId);
      const t2 = teilnahmeVon(d, tid);
      const x = neuerProzess(d, g2, { prozesscode: "CM_REV_SP", teilnahme: t2, zaehlpunkt: zpVon(d, t2.zaehlpunktId), prozessdatum: zum, parameter: { zum }, freigabeNoetig: vier, n, id: pid, massenId });
      if (!vier) versenden(d, x);
      protokoll(d, n?.system ? null : n, "eg_eda_abmeldung", "eg_gemeinschaft", g2.id, `Abmeldung ${x.zaehlpunktnummer} zum ${zum} (${x.id}${vier ? ", Freigabe offen" : ""})`);
      return prozessAusgabe(d, x);
    });
    prozesse.push(p);
  }
  if (vier && prozesse.length) await freigabeMelden(gemeinschaftId, prozesse.length, "Abmeldungen");
  return { prozesse, fehler, freigabeNoetig: vier && prozesse.length > 0, massenId };
}

async function freigabeMelden(gid, anzahl, was) {
  await aendern((db) => {
    const g = egIntern.gemeinschaftVon(db, gid);
    for (const o of EG(db).organe.filter((y) => y.gemeinschaftId === gid && y.kontoId && y.status !== "beendet" && ["obmann", "obmann_stv", "vorstand", "geschaeftsfuehrer"].includes(y.funktion))) {
      benachrichtigen(db, nutzerById(db, o.kontoId), { art: "system", titel: `Freigabe nötig: ${anzahl} ${was}`, text: `Für „${g.name}“ liegen ${anzahl} ${was} zur Freigabe (Vier-Augen-Prinzip) bereit.`, link: `/portal/eg/${gid}/verwaltung`, objektArt: "eg_gemeinschaft", objektId: gid }, { mail: true });
    }
  });
}

export async function edaFreigeben(n, gemeinschaftId, { prozessIds = [], entscheidung = "erteilen", grund = "" } = {}) {
  if (!["erteilen", "ablehnen"].includes(entscheidung)) throw ungueltig("Entscheidung: erteilen oder ablehnen.");
  const ids = [...new Set((Array.isArray(prozessIds) ? prozessIds : []).map(String))].slice(0, MASSEN_MAX);
  if (!ids.length) throw ungueltig("Bitte Prozesse auswählen.");
  egIntern.zugriff(await bereit(), n, gemeinschaftId, "eda_freigeben", 2);
  let freigegeben = 0;
  let abgelehnt = 0;
  const fehler = [];
  for (const pid of ids) {
    const r = await aendern((db) => {
      const p = X(db).prozesse.find((y) => y.id === pid);
      if (!p || p.gemeinschaftId !== gemeinschaftId) return { fehler: "Prozess nicht gefunden." };
      try {
        Object.assign(p, freigabeAnwenden(p, { entscheidung, von: n.id, jetzt: jetzt(), grund: String(grund || "").slice(0, 300) }));
      } catch (e) {
        return { fehler: e.message };
      }
      protokoll(db, n, "eg_eda_freigabe", "eg_gemeinschaft", gemeinschaftId, `${p.prozesscode} ${p.zaehlpunktnummer}: Freigabe ${entscheidung === "erteilen" ? "erteilt" : "abgelehnt"} (${p.id})`);
      return { p: { ...p } };
    });
    if (r.fehler) {
      fehler.push({ id: pid, fehler: r.fehler });
      continue;
    }
    if (entscheidung !== "erteilen") {
      abgelehnt++;
      continue;
    }
    if (r.p.prozesscode === "CM_REV_SP") {
      const fl = [];
      if (!(await uebergang(SYS, r.p.teilnahmeId, { ereignis: "cm_rev_sp", datum: r.p.parameter.zum, prozessId: r.p.id }, fl))) {
        await aendern((db) => {
          const p = X(db).prozesse.find((y) => y.id === pid);
          Object.assign(p, fristAnwenden(p, "zeitueberschreitung", { jetzt: jetzt(), text: `Nach Freigabe nicht sendbar: ${fl[0]}` }), { status: "fehler" });
        });
        fehler.push({ id: pid, fehler: fl.join(" ") });
        continue;
      }
    }
    await aendern((db) => versenden(db, X(db).prozesse.find((y) => y.id === pid)));
    freigegeben++;
  }
  return { freigegeben, abgelehnt, fehler };
}

export async function edaVerteilschluesselSenden(n, verteilschluesselId) {
  const db = await bereit();
  const vs = EG(db).verteilschluessel.find((v) => v.id === verteilschluesselId);
  if (!vs) throw nichtGefunden("Verteilschlüssel nicht gefunden.");
  const { g } = schreibZugriff(db, n, vs.gemeinschaftId);
  if (g.verteilmodell !== "statisch") throw konflikt("Aufteilungsschlüssel gibt es nur im statischen Modell.");
  if (vs.status !== "entwurf") throw konflikt("Dieser Verteilschlüssel wurde bereits gesendet.");
  const ab = vs.gueltigAb > heute() ? vs.gueltigAb : heute();
  const r = await aendern((d) => {
    const prozesse = [];
    const fehler = [];
    for (const pos of vs.positionen) {
      const t = teilnahmeVon(d, pos.teilnahmeId);
      if (!t || t.status !== "aktiv") {
        fehler.push({ id: pos.teilnahmeId, fehler: "Teilnahme nicht aktiv." });
        continue;
      }
      if (X(d).prozesse.some((p) => p.teilnahmeId === t.id && PROZESS_OFFEN.includes(p.status))) {
        fehler.push({ id: t.id, fehler: "Für diese Teilnahme läuft bereits ein EDA-Prozess." });
        continue;
      }
      const p = neuerProzess(d, g, { prozesscode: "EC_PRT_CHANGE", teilnahme: t, zaehlpunkt: zpVon(d, t.zaehlpunktId), prozessdatum: ab, parameter: { pct: pos.pct, ab, verteilschluesselId: vs.id }, n });
      versenden(d, p);
      prozesse.push(prozessAusgabe(d, p));
    }
    protokoll(d, n?.system ? null : n, "eg_eda_schluessel", "eg_gemeinschaft", g.id, `Aufteilungsschlüssel ${vs.id} gesendet (${prozesse.length} Zählpunkte, Σ ${vs.summePct} %)`);
    return { prozesse, fehler };
  });
  if (r.prozesse.length && typeof stamm.egVerteilschluesselStatus === "function") await stamm.egVerteilschluesselStatus(SYS, vs.id, { status: "gesendet", edaProzessId: r.prozesse[0].id }).catch((e) => r.fehler.push({ id: vs.id, fehler: e.message }));
  return r;
}

export async function edaPodlistAnfordern(n, gemeinschaftId) {
  const gid = typeof gemeinschaftId === "object" ? gemeinschaftId?.gemeinschaftId : gemeinschaftId; // auch als Ereignis eg.import.uebernommen ({gemeinschaftId})
  return aendernEda((db) => {
    const { g } = schreibZugriff(db, n, gid);
    const v = gemeinschaftEdaPruefen(g);
    if (v.length) throw konflikt(v[0]);
    const offen = X(db).prozesse.find((p) => p.gemeinschaftId === g.id && p.prozesscode === "EC_PODLIST" && PROZESS_OFFEN.includes(p.status));
    if (offen) return { prozess: prozessAusgabe(db, offen), bereitsOffen: true };
    const p = neuerProzess(db, g, { prozesscode: "EC_PODLIST", prozessdatum: heute(), n });
    versenden(db, p);
    protokoll(db, n?.system ? null : n, "eg_eda_podlist", "eg_gemeinschaft", g.id, `Zählpunktliste angefordert (${p.id})`);
    return { prozess: prozessAusgabe(db, p) };
  });
}

export async function edaNachforderung(n, { zaehlpunktId = "", teilnahmeId = "", gemeinschaftId = "", von = "", bis = "" } = {}) {
  return aendernEda((db) => {
    let t = teilnahmeId ? teilnahmeVon(db, teilnahmeId) : null;
    if (!t && zaehlpunktId) {
      const kand = EG(db).teilnahmen.filter((y) => y.zaehlpunktId === zaehlpunktId && (!gemeinschaftId || y.gemeinschaftId === gemeinschaftId) && ["aktiv", "abmeldung_angefragt", "beendet"].includes(y.status));
      if (kand.length > 1) throw ungueltig("Der Zählpunkt nimmt an mehreren Gemeinschaften teil – bitte die Gemeinschaft angeben.");
      t = kand[0] || null;
    }
    if (!t) throw nichtGefunden("Teilnahme nicht gefunden.");
    const { g } = schreibZugriff(db, n, t.gemeinschaftId);
    const r = nachforderungPruefen({ gemeinschaft: g, teilnahme: t, von, bis, heute: heute() });
    if (!r.ok) throw ungueltig(r.fehler.join(" "));
    const p = neuerProzess(db, g, { prozesscode: "CR_REQ_PT", teilnahme: t, zaehlpunkt: zpVon(db, t.zaehlpunktId), prozessdatum: heute(), parameter: { von, bis, vonUtc: tagBeginnUtc(von), bisUtc: tagBeginnUtc(plusTage(bis, 1)) }, n });
    versenden(db, p);
    protokoll(db, n?.system ? null : n, "eg_eda_nachforderung", "eg_gemeinschaft", g.id, `Nachforderung ${p.zaehlpunktnummer} ${von}–${bis} (${p.id})`);
    return { prozess: prozessAusgabe(db, p) };
  });
}

export async function edaNachrichtEingang(n, { xml = "", quelle = "manuell" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (typeof xml !== "string" || !xml.trim()) throw ungueltig("Bitte die EDA-Nachricht (XML) angeben.");
  if (xml.length > 4 * 1024 * 1024) throw new PlattformFehler(413, "Nachricht zu groß.");
  return eingangIntern(n, xml, quelle);
}

export async function edaGemeinschaftBereit(n, { gemeinschaftId = "" } = {}) {
  const db = await bereit();
  const ids = EG(db).teilnahmen.filter((t) => t.gemeinschaftId === gemeinschaftId && t.status === "entwurf" && t.anmeldungVorgemerkt).map((t) => t.id);
  if (!ids.length) return { prozesse: [], fehler: [], hinweise: [], text: "Keine zur Anmeldung vorgemerkten Teilnahmen." };
  return edaAnmelden(n, gemeinschaftId, { teilnahmeIds: ids });
}

// ================================================================ Fristen, Erinnerungen, Massenaktionen

async function erinnernIntern(n, gid, teilnahmeIds = null, stufeVorgabe = 0) {
  return aendernEda((db) => {
    const { g } = n?.system ? { g: egIntern.gemeinschaftVon(db, gid) } : schreibZugriff(db, n, gid);
    const liste = [];
    for (const { t, zp } of teilnahmenMitZp(db, g.id)) {
      if (t.status !== "zustimmung_offen" || (teilnahmeIds && !teilnahmeIds.includes(t.id))) continue;
      const p = X(db).prozesse.filter((y) => y.teilnahmeId === t.id && ["EC_REQ_ONL", "EC_REQ_OFF"].includes(y.prozesscode) && y.status === "bestaetigt").at(-1);
      if (!p) continue;
      const m = mitgliedVon(db, t.mitgliedId);
      const nb = nbFuer(db, g, zp);
      const stufe = stufeVorgabe || (p.erinnerungen || []).length + 1;
      const txt = erinnerungText({ name: m ? mitgliedName(m) : "", gemeinschaftName: g.name, gemeinschaftsId: g.gemeinschaftsId, zaehlpunktnummer: zp.zaehlpunktnummer, teilnahmefaktor: t.teilnahmefaktor, fristBis: p.fristBis, netzbetreiberId: nb.id, netzbetreiberName: nb.kurzname || nb.name, stufe, heute: heute() });
      let kanal = "vorbereitet";
      if (m?.kontoId) {
        const u = nutzerById(db, m.kontoId);
        if (u && benachrichtigen(db, u, { art: "system", titel: txt.betreff, text: `Bitte stimmen Sie bis ${String(p.fristBis).split("-").reverse().join(".")} im Portal Ihres Netzbetreibers zu – Anleitung in der E-Mail.`, link: "/portal/eg", objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: true, mailBetreff: txt.betreff, mailText: txt.text })) kanal = "portal";
      } else if (m?.person?.email) kanal = "email_vorbereitet";
      p.erinnerungen = [...(p.erinnerungen || []), { am: jetzt(), stufe, kanal, an: m?.person?.email || (m?.kontoId ? "Portalkonto" : "") }];
      liste.push({ teilnahmeId: t.id, prozessId: p.id, name: m ? mitgliedName(m) : "", kanal, stufe, betreff: txt.betreff, text: txt.text, email: m?.person?.email || "" });
    }
    if (liste.length) protokoll(db, n?.system ? null : n, "eg_eda_erinnerung", "eg_gemeinschaft", g.id, `${liste.length} Erinnerung(en) zur Zustimmung im Netzbetreiber-Portal`);
    return { erinnert: liste.length, perPortal: liste.filter((x) => x.kanal === "portal").length, vorbereitet: liste.filter((x) => x.kanal !== "portal").length, liste };
  });
}

export async function edaErinnern(n, gemeinschaftId, { teilnahmeIds = null } = {}) {
  return erinnernIntern(n, gemeinschaftId, Array.isArray(teilnahmeIds) && teilnahmeIds.length ? teilnahmeIds.map(String) : null);
}

export async function edaErneutAnstossen(n, gemeinschaftId, { teilnahmeIds = null } = {}) {
  const db = await bereit();
  schreibZugriff(db, n, gemeinschaftId);
  const nur = Array.isArray(teilnahmeIds) && teilnahmeIds.length ? new Set(teilnahmeIds.map(String)) : null;
  const neu = [];
  const uebersprungen = [];
  for (const { t } of teilnahmenMitZp(db, gemeinschaftId)) {
    if (!["abgelehnt", "abgelaufen"].includes(t.status) || (nur && !nur.has(t.id))) continue;
    const letzter = X(db).prozesse.filter((p) => p.teilnahmeId === t.id).at(-1);
    const info = responsecodeInfo(letzter?.responsecode || t.responsecode);
    if (info.code && !info.erneut) uebersprungen.push({ id: t.id, grund: `${info.code} ${info.text} – ${info.loesung}` });
    else neu.push(t.id);
  }
  const anm = neu.length ? await edaAnmelden(n, gemeinschaftId, { teilnahmeIds: neu }) : { prozesse: [], fehler: [] };
  const er = await erinnernIntern(n, gemeinschaftId, nur ? [...nur] : null);
  return { erneut: anm.prozesse.length, erinnert: er.erinnert, uebersprungen, fehler: anm.fehler, prozesse: anm.prozesse, erinnerungen: er.liste };
}

export async function edaFristenLauf(n, { gemeinschaftId = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!n.system) {
    if (!gemeinschaftId) throw verboten("Fristenlauf über alle Gemeinschaften nur durch das System.");
    schreibZugriff(await bereit(), n, gemeinschaftId);
  }
  await zustellen({ gid: gemeinschaftId }).catch(() => {});
  const db = await bereit();
  const h = heute();
  const prozesse = X(db).prozesse.filter((p) => !gemeinschaftId || p.gemeinschaftId === gemeinschaftId);
  const teilnahmen = Object.fromEntries(EG(db).teilnahmen.map((t) => [t.id, t]));
  const aktionen = fristenPruefen({ prozesse, teilnahmen, heute: h });
  const erinnern = new Map();
  for (const a of aktionen) {
    try {
      if (a.art === "erinnern") {
        const gid = prozesse.find((p) => p.id === a.prozessId)?.gemeinschaftId;
        if (!erinnern.has(gid)) erinnern.set(gid, []);
        erinnern.get(gid).push(a.teilnahmeId);
        a.ergebnis = "Erinnerung";
        continue;
      }
      if (a.art === "wiederholen") {
        await aendern((d) => versenden(d, X(d).prozesse.find((p) => p.id === a.prozessId), { wiederholung: true }));
        a.ergebnis = "erneut gesendet";
        continue;
      }
      if (a.art === "frist_abgelaufen") await uebergang(SYS, a.teilnahmeId, { ereignis: "frist_abgelaufen", prozessId: a.prozessId, grund: a.text });
      if (a.art === "zeitueberschreitung" && a.teilnahmeId && teilnahmen[a.teilnahmeId]?.status === "angefragt") await uebergang(SYS, a.teilnahmeId, { ereignis: "fehler", prozessId: a.prozessId, grund: a.text });
      await aendern((d) => {
        const p = X(d).prozesse.find((y) => y.id === a.prozessId);
        Object.assign(p, fristAnwenden(p, a.art, { jetzt: jetzt(), text: a.text }));
        protokoll(d, null, "eg_eda_frist", "eg_gemeinschaft", p.gemeinschaftId, `${p.prozesscode} ${p.zaehlpunktnummer || ""}: ${a.text}`);
      });
      a.ergebnis = "vermerkt";
    } catch (e) {
      a.ergebnis = `Fehler: ${e.message}`;
    }
  }
  for (const [gid, ids] of erinnern) await erinnernIntern(SYS, gid, ids).catch(() => {});
  return { aktionen, heute: h };
}

// ================================================================ Reklamation an den Netzbetreiber

function reklamationDaten(db, g, nbId) {
  const h = heute();
  const nb = nbVon(db, nbId) || nbFuer(db, g, null);
  const tl = teilnahmenMitZp(db, g.id).filter(({ zp }) => !nbId || zp.netzbetreiberId === nb.id);
  const zps = new Set(tl.map((x) => x.zp.zaehlpunktnummer));
  const luecken = datenluecken({ teilnahmen: tl.filter(({ t }) => t.gueltigAb && ["aktiv", "abmeldung_angefragt", "beendet"].includes(t.status)).map(({ t, zp }) => ({ teilnahmeId: t.id, zaehlpunktnummer: zp.zaehlpunktnummer, gueltigAb: t.gueltigAb, gueltigBis: t.gueltigBis })), empfangen: empfangeneTage(db, g.id), von: empfangSeit(db, g.id, plusTage(h, -60)), bis: h, heute: h });
  const prozesse = X(db).prozesse.filter((p) => p.gemeinschaftId === g.id && (!p.zaehlpunktnummer || zps.has(p.zaehlpunktnummer)) && p.prozesscode !== "REKLAMATION");
  const pl = X(db).prozesse.filter((p) => p.gemeinschaftId === g.id && p.prozesscode === "EC_PODLIST" && p.status === "abgeschlossen").at(-1);
  const soll = tl.map(({ t, zp }) => ({ zaehlpunktnummer: zp.zaehlpunktnummer, teilnahmeId: t.id, status: t.status, consentId: t.consentId, teilnahmefaktor: t.teilnahmefaktor, richtung: zp.richtung, gueltigBis: t.gueltigBis }));
  const podlist = pl ? podlistAbgleich(soll, pl.ergebnis?.liste || [], h) : [];
  const q = {};
  for (const m of X(db).nachrichten) {
    if (m.gemeinschaftId !== g.id || m.nachrichtencode !== "DATEN_CRMSG" || !zps.has(m.zaehlpunktnummer) || !m.kennzahlen || !m.tag || tageZwischen(m.tag, h) > 60) continue;
    const x = (q[m.zaehlpunktnummer] ||= { zaehlpunktnummer: m.zaehlpunktnummer, werte: 0, l3: 0, aeltesterL3: "" });
    x.werte += m.kennzahlen.werte || 0;
    x.l3 += m.kennzahlen.l3 || 0;
    if (m.kennzahlen.l3 && (!x.aeltesterL3 || m.tag < x.aeltesterL3)) x.aeltesterL3 = m.tag;
  }
  const qualitaet = Object.values(q).filter((x) => x.l3 > 0).map((x) => ({ ...x, anteilL3: Math.round((x.l3 / x.werte) * 10000) / 10000, monat: x.aeltesterL3.slice(0, 7) }));
  const befunde = reklamationBefunde({ luecken, prozesse, podlist, qualitaet, heute: h });
  return { nb, befunde, luecken, vorlage: reklamationVorlage({ gemeinschaft: g, netzbetreiber: nb, befunde, heute: h }) };
}

export async function edaReklamation(n, gemeinschaftId, { reklamationAktion = "vorschau", netzbetreiberId = "", betreff = "", text = "", prozessId = "", antwortText = "" } = {}) {
  const aktion = String(reklamationAktion);
  if (aktion === "vorschau" || aktion === "akte") {
    const db = await bereit();
    const { g } = lesenZugriff(db, n, gemeinschaftId);
    if (aktion === "akte") {
      const p = X(db).prozesse.find((y) => y.id === prozessId && y.gemeinschaftId === g.id && y.prozesscode === "REKLAMATION");
      if (!p) throw nichtGefunden("Reklamation nicht gefunden.");
      const nachrichten = X(db).nachrichten.filter((m) => m.prozessId === p.id);
      return { text: reklamationAkte(p, nachrichten), dateiname: `beschwerdeakte-${p.id}.txt` };
    }
    const r = reklamationDaten(db, g, netzbetreiberId);
    const reklamationen = X(db).prozesse.filter((p) => p.gemeinschaftId === g.id && p.prozesscode === "REKLAMATION").map((p) => prozessAusgabe(db, p)).reverse();
    return { netzbetreiber: { id: r.nb.id, name: r.nb.name, kurzname: r.nb.kurzname, kontaktEmail: r.nb.kontaktEmail || "" }, befunde: r.befunde, luecken: r.luecken, vorlage: r.vorlage, reklamationen };
  }
  return aendernEda((db) => {
    const { g } = schreibZugriff(db, n, gemeinschaftId);
    if (aktion === "anlegen") {
      const r = reklamationDaten(db, g, netzbetreiberId);
      const b = String(betreff || r.vorlage.betreff).slice(0, 200);
      const t = String(text || r.vorlage.text).slice(0, 20000);
      const p = neuerProzess(db, g, { prozesscode: "REKLAMATION", prozessdatum: heute(), parameter: { netzbetreiberId: r.nb.id }, n, zaehlpunkt: null });
      Object.assign(p, { netzbetreiberId: r.nb.id, empfaenger: r.nb.marktpartnerId || "", ergebnis: { netzbetreiberName: r.nb.name, gemeinschaftName: g.name, befunde: r.befunde.length, betreff: b, an: r.nb.kontaktEmail || "" } });
      const roh = `Betreff: ${b}\n\n${t}\n\n--- Befundliste (CSV) ---\n${r.vorlage.csv}`;
      nachrichtAnlegen(db, { g, p, richtung: "aus", code: "REKLAMATION_NB", prozesscode: "REKLAMATION", xml: roh, absender: g.marktpartnerId || "PLATTFORM", empfaenger: r.nb.kontaktEmail || r.nb.marktpartnerId || "", messageId: `REK-${p.id}`, conversationId: p.conversationId, kanal: "email", betreff: b });
      Object.assign(p, alsGesendet(p, { jetzt: jetzt(), messageId: `REK-${p.id}` }));
      p.fristBis = r.vorlage.antwortBis;
      protokoll(db, n, "eg_eda_reklamation", "eg_gemeinschaft", g.id, `Reklamation an ${r.nb.kurzname || r.nb.name} (${r.befunde.length} Befunde, ${p.id})`);
      return { prozess: prozessAusgabe(db, p), mailto: r.nb.kontaktEmail ? `mailto:${r.nb.kontaktEmail}?subject=${encodeURIComponent(b)}` : "" };
    }
    const p = X(db).prozesse.find((y) => y.id === prozessId && y.gemeinschaftId === g.id && y.prozesscode === "REKLAMATION");
    if (!p) throw nichtGefunden("Reklamation nicht gefunden.");
    if (aktion === "antwort") {
      const roh = String(antwortText || "").trim().slice(0, 20000);
      if (!roh) throw ungueltig("Bitte die Antwort des Netzbetreibers einfügen.");
      nachrichtAnlegen(db, { g, p, richtung: "ein", code: "ANTWORT_NB", prozesscode: "REKLAMATION", xml: roh, absender: p.ergebnis?.an || p.netzbetreiberId, empfaenger: g.marktpartnerId || "", messageId: `REK-ANT-${neueId("X").slice(-6)}`, conversationId: p.conversationId, kanal: "manuell" });
      p.verlauf.push({ am: jetzt(), von: p.status, nach: "bestaetigt", nachricht: "ANTWORT_NB", text: "Antwort des Netzbetreibers erfasst", konto: n.id });
      p.status = "bestaetigt";
    } else if (aktion === "erledigt") {
      p.verlauf.push({ am: jetzt(), von: p.status, nach: "abgeschlossen", nachricht: "", text: "Reklamation erledigt", konto: n.id });
      p.status = "abgeschlossen";
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "eg_eda_reklamation", "eg_gemeinschaft", g.id, `Reklamation ${p.id}: ${aktion}`);
    return { prozess: prozessAusgabe(db, p) };
  });
}

// ================================================================ Simulator und Gateway

export async function edaSimulator(n, gemeinschaftId, { simulatorAktion = "status", alle = false } = {}) {
  const db = await bereit();
  const { g } = schreibZugriff(db, n, gemeinschaftId);
  if (simulatorAktion === "zustellen") return zustellen({ gid: g.id, alle: !!alle });
  if (simulatorAktion === "energiedaten") {
    const tag = plusTage(heute(), -1);
    const empfangen = empfangeneTage(db, g.id);
    const seed = X(db).simulator.seed;
    let nachrichten = 0;
    let luecken = 0;
    let weitergeleitet = 0;
    const nb = nbFuer(db, g, null);
    for (const { zp } of teilnahmenMitZp(db, g.id).filter(({ t }) => t.status === "aktiv").slice(0, 80)) {
      if ((empfangen[zp.zaehlpunktnummer] || []).includes(tag)) continue;
      if (!simulatorLiefertTag(zp.zaehlpunktnummer, tag, seed)) {
        luecken++;
        continue;
      }
      const absender = (nbVon(db, zp.netzbetreiberId) || nb).marktpartnerId;
      const j = jetzt();
      const xml = nachrichtBauen({ code: "DATEN_CRMSG", prozesscode: "CR_MSG", absender, empfaenger: g.marktpartnerId, erstellt: isoSek(j), messageId: edaId(absender, j, z6()), conversationId: edaId(absender, j, z6()), prozessdatum: tag, modus: "SIMU", daten: { MeteringPoint: zp.zaehlpunktnummer, ECID: g.gemeinschaftsId, Energy: energieFuer(db, zp.zaehlpunktnummer, tag, g.id) } });
      const r = await eingangIntern(SYS, xml, "simulator");
      if (r.ok) nachrichten++;
      if (r.weitergeleitet) weitergeleitet++;
    }
    return { tag, nachrichten, luecken, weitergeleitet };
  }
  return { ausstehend: X(db).simulator.ausstehend.filter((a) => a.gemeinschaftId === g.id).map((a) => ({ code: a.code, prozessId: a.prozessId, faelligAm: new Date(a.faelligAm).toISOString() })) };
}

/** Gateway-Ausgang (Frappe: eg_eda.ausgang) – im Demo-Betrieb sendet der Simulator direkt, daher meist leer */
export async function edaAusgang(n, { limit = 50 } = {}) {
  if (!n?.system) throw verboten("Nur für das System bzw. den Gateway-Dienst.");
  const db = await bereit();
  return { nachrichten: X(db).nachrichten.filter((m) => m.richtung === "aus" && m.versandStatus === "wartend").slice(0, Math.min(200, Number(limit) || 50)).map((m) => nachrichtAusgabe(m, true)) };
}

export async function edaAusgangQuittung(n, { nachrichtId = "", status = "gesendet", fehler = "" } = {}) {
  if (!n?.system) throw verboten("Nur für den Gateway-Dienst.");
  if (!["gesendet", "quittiert", "fehler"].includes(status)) throw ungueltig("Status: gesendet, quittiert oder fehler.");
  return aendernEda((db) => {
    const m = X(db).nachrichten.find((y) => y.id === nachrichtId && y.richtung === "aus");
    if (!m) throw nichtGefunden("Nachricht nicht gefunden.");
    Object.assign(m, { versandStatus: status, fehler: String(fehler || "").slice(0, 500), versuche: (m.versuche || 0) + (status === "fehler" ? 1 : 0) });
    return { ok: true };
  });
}
