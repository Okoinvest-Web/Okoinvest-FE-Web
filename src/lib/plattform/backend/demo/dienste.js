// src/lib/plattform/backend/demo/dienste.js
//
// Dienste „Firmen, Bonität, Identität + SPV-Gründung“ im Demo-Backend – Referenz für plattform/api/dienste.py
// (Vertrag: docs/API.md, Abschnitt „Dienste“). Daten unter db.dienste (eigene Sammlung, beim ersten Zugriff einmalig ergänzt).
//
// Rechte (jede Operation prüft selbst; Bereiche aus rechte.js):
//   Identität     – Person selbst (eigene Sitzungen, eigene MRZ-Vorprüfung); Webhook nur mit gültiger HMAC-Signatur
//   Register      – Bereich „register“: lesen = Suche, schreiben = kostenpflichtiger Abruf; Ablage im KYC-Fall nur
//                   zusätzlich mit Compliance (schreiben)
//   Bonität       – Bereich „bonitaet“ (Leitung, Transaktion, Compliance): lesen = Ergebnisse, schreiben = beauftragen,
//                   freigeben, Einstellungen. Andere Rollen sehen NIE Ergebnisse; Betroffene werden informiert (ohne Ergebnis).
//   Gesellschaften – Bereich „gesellschaften“: lesen = Verzeichnis/Organigramm/Fristen, schreiben = Gründung/Checkliste
//
// Ergebnisse externer Dienste ENTSCHEIDEN NIE über den KYC-Fall – sie werden über kycErgebnisAnhaengen() als Hinweis
// angehängt; die Entscheidung trifft die Compliance.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { stufe, unterrollen } from "../../rechte";
import { GESELLSCHAFT } from "@/data/site";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import * as kycDemo from "./kyc";
import * as entwicklungDemo from "./entwicklung";
import { bonitaetAktuell, bonitaetEinstellungenDb, bonitaetFreigabeDb, istFirma } from "./diensteRegeln";
import { IDENT_ANBIETER, IDENT_ERGEBNIS, identKonfig, sitzungStarten, webhookNormalisieren, webhookSignaturPruefen, webhookSignieren } from "../../dienste/identitaet/anbieter";
import { mrzVorpruefung, nummerMaskiert } from "../../dienste/identitaet/mrz";
import { registerAbrufen, registerKonfig, registerSuchen } from "../../dienste/register/adapter";
import { REGISTER_LAENDER, firmennamePruefen, registernummerPruefen } from "../../dienste/register/basis";
import { bonitaetAbrufen, bonitaetKonfig } from "../../dienste/bonitaet/adapter";
import { BONITAET_ANLAESSE, BONITAET_RECHTSGRUNDLAGEN, bonitaetEinstellungenStandard, bonitaetGeltung, bonitaetGueltig, bonitaetInformation } from "../../dienste/bonitaet/basis";
import {
  GESELLSCHAFT_STATUS, RECHTSFORMEN, fortschritt, fristenFuer, gegenstandVorlage, gruendungPruefen, musterprotokollMoeglich, schritteFuer, statusAusSchritten,
} from "../../dienste/gesellschaft/rechtsformen";
import { dokumentTitel, dokumentenpaket } from "../../dienste/gesellschaft/dokumente";
import { dokumentePdf } from "../../dienste/pdf";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

// ================================================================ Rechte

const istAdmin = (n) => !!n?.rollen?.includes("admin");
function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function bereichNoetig(n, bereich, st, text) {
  angemeldet(n);
  if (!istAdmin(n) || stufe(n, bereich) < st) throw verboten(istAdmin(n) ? text : "Dafür fehlt Ihnen die Berechtigung.");
}
const bonitaetLesen = (n) => bereichNoetig(n, "bonitaet", 1, "Bonitätsauskünfte sehen nur Leitung, Transaktion und Compliance.");
const bonitaetSchreiben = (n) => bereichNoetig(n, "bonitaet", 2, "Bonitätsauskünfte beauftragen nur Leitung, Transaktion und Compliance.");
const registerLesen = (n) => bereichNoetig(n, "register", 1, "Für Registerauskünfte fehlt Ihnen die Berechtigung.");
const registerSchreiben = (n) => bereichNoetig(n, "register", 2, "Registerabrufe (kostenpflichtig) dürfen nur Leitung, Transaktion und Compliance auslösen.");
const gesLesen = (n) => bereichNoetig(n, "gesellschaften", 1, "Für das Gesellschaftsverzeichnis fehlt Ihnen die Berechtigung.");
const gesSchreiben = (n) => bereichNoetig(n, "gesellschaften", 2, "Gründungen bearbeiten nur Leitung und Transaktion.");

// ================================================================ Datenbestand

function leer() {
  return { v: 1, identitaet: [], mrz: [], register: [], bonitaet: [], gesellschaften: [], ereignisse: [], einstellungen: { bonitaet: bonitaetEinstellungenStandard() } };
}

/** Bestand: ÖkoInvest GmbH und Beteiligungen (öffentliche Registerdaten aus src/data/site.js) + eine Demo-Gründung */
function seed(d) {
  const heute = jetzt();
  const oi = { id: "PG-26-OEKOIN", name: GESELLSCHAFT.name, rechtsform: "at_gmbh", land: "AT", sitz: GESELLSCHAFT.ort, anschrift: `${GESELLSCHAFT.sitz}, ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}`, status: "bestand", registernummer: GESELLSCHAFT.register, gericht: GESELLSCHAFT.gericht, stammkapital: null, einzahlung: null, gesellschafter: [], geschaeftsfuehrung: GESELLSCHAFT.geschaeftsfuehrung.map((name) => ({ name })), gegenstand: GESELLSCHAFT.gegenstand, bilanzstichtag: "12-31", gegruendetAm: "2020-09-10", schritte: [], herkunft: "stammdaten", erstelltAm: heute, geaendertAm: heute, verlauf: [] };
  const bet = GESELLSCHAFT.beteiligungen.map((b, i) => ({
    id: `PG-26-BET${i + 1}XX`, name: b.name, rechtsform: "at_gmbh", land: "AT", sitz: "", anschrift: "", status: "bestand", registernummer: b.register, gericht: "", stammkapital: null, einzahlung: null,
    gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, name: oi.name, register: oi.registernummer, anteil: Number.parseFloat(b.anteil) || 0, einlage: null }, ...(Number.parseFloat(b.anteil) < 100 ? [{ art: "extern", name: "Mitgesellschafter (siehe Firmenbuch)", anteil: 100 - Number.parseFloat(b.anteil), einlage: null }] : [])],
    geschaeftsfuehrung: [], gegenstand: b.text, bilanzstichtag: "12-31", gegruendetAm: null, schritte: [], herkunft: "stammdaten", erstelltAm: heute, geaendertAm: heute, verlauf: [],
  }));
  const demo = {
    id: "PG-26-DEMO01", name: "Solarpark Innviertel Nord GmbH (Demo)", rechtsform: "at_gmbh", land: "AT", sitz: "Ostermiething", bundesland: "Oberösterreich", anschrift: `${GESELLSCHAFT.sitz}, ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}`,
    status: "in_gruendung", registernummer: "", stammkapital: 35000, einzahlung: 17500,
    gesellschafter: [{ art: "gruppe", gesellschaftId: oi.id, name: oi.name, register: oi.registernummer, sitz: GESELLSCHAFT.ort, anteil: 100, einlage: 35000 }],
    geschaeftsfuehrung: GESELLSCHAFT.geschaeftsfuehrung.slice(0, 1).map((name) => ({ name, geburtsdatum: "", anschrift: "" })),
    gegenstand: gegenstandVorlage({ land: "AT", typ: "freiflaeche", ort: "Innviertel" }), bilanzstichtag: "12-31", projekt: null, entwicklungProjektId: null,
    namenspruefung: { ergebnis: "frei", am: heute, quelle: "demo", aehnlich: [] }, schritte: schritteFuer("at_gmbh"), herkunft: "assistent", erstelltAm: heute, geaendertAm: heute, verlauf: [], demo: true,
  };
  const tag = (t) => new Date(Date.now() - t * 86400000).toISOString().slice(0, 10);
  for (const [k, t] of [["namenspruefung", 21], ["unterlagen", 18], ["notartermin", 14], ["beurkundet", 7], ["bankkonto", 6]]) Object.assign(demo.schritte.find((s) => s.schluessel === k), { status: "erledigt", datum: tag(t) });
  demo.schritte.find((s) => s.schluessel === "notartermin").wert = JSON.stringify({ datum: tag(7), notariat: "Notariat (Demo)", art: "video" });
  demo.schritte.find((s) => s.schluessel === "einzahlung").status = "in_arbeit";
  demo.gegruendetAm = tag(7);
  d.dienste.gesellschaften.push(oi, ...bet, demo);
}

async function lesenBereit() {
  const db = await lesen();
  if (db.dienste?.v) return db;
  await aendern((d) => {
    if (d.dienste?.v) return;
    d.dienste = leer();
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Dienste-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}
const D = (db) => db.dienste;

/** KYC-Ergebnis anhängen (eigene Transaktion des KYC-Teams – NIE innerhalb von aendern() aufrufen) */
async function anKycHaengen(fall, eintrag) {
  try {
    return await kycDemo.kycErgebnisAnhaengen(fall, eintrag);
  } catch (e) {
    if (e?.status !== 404) console.warn("[plattform-dienste] KYC-Ergebnis nicht angehängt:", e?.message);
    return null;
  }
}

// ================================================================ Identität

function sitzungAusgabe(s) {
  return { id: s.id, anbieter: s.anbieter, anbieterLabel: IDENT_ANBIETER[s.anbieter]?.label || s.anbieter, status: s.status, statusLabel: IDENT_ERGEBNIS[s.status]?.label || s.status, verfahren: s.verfahren || "", erstelltAm: s.erstelltAm, abgeschlossenAm: s.abgeschlossenAm || null, kycVerknuepft: !!s.kycEintragId, url: s.status === "ausstehend" ? s.url : null };
}

/** Konfiguration + eigene Sitzungen + letzte MRZ-Vorprüfung */
export async function identStatus(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const k = identKonfig();
  const mrz = (D(db).mrz || []).filter((x) => x.kontoId === n.id).slice(-1)[0] || null;
  return {
    konfig: { anbieter: k.anbieter, label: k.label, aktiv: k.aktiv, demo: k.demo, verfahren: IDENT_ANBIETER[k.anbieter]?.verfahren || [] },
    sitzungen: D(db).identitaet.filter((s) => s.kontoId === n.id).slice(-5).reverse().map(sitzungAusgabe),
    mrz: mrz ? { am: mrz.am, ergebnis: mrz.ergebnis, dokumentart: mrz.dokumentart, gueltigBis: mrz.gueltigBis, nummer: mrz.nummerMaskiert } : null,
  };
}

/** Online-Identifizierung starten → { sitzung, url } */
export async function identStarten(n, { basisUrl = "" } = {}) {
  angemeldet(n);
  const k = identKonfig();
  if (!k.aktiv) throw new PlattformFehler(503, "Die Online-Identifizierung ist derzeit nicht verfügbar. Bitte laden Sie Ihre Ausweiskopie hoch – unser Team prüft manuell.");
  const vorhanden = await lesenBereit();
  const heute = jetzt().slice(0, 10);
  if (D(vorhanden).identitaet.filter((s) => s.kontoId === n.id && s.erstelltAm.slice(0, 10) === heute).length >= 5) throw new PlattformFehler(429, "Heute wurden bereits mehrere Identifizierungen gestartet. Bitte versuchen Sie es morgen erneut.");
  const offen = D(vorhanden).identitaet.find((s) => s.kontoId === n.id && s.status === "ausstehend" && Date.now() - Date.parse(s.erstelltAm) < 30 * 60000);
  if (offen) return { sitzung: sitzungAusgabe(offen), url: offen.url, wiederverwendet: true };
  const id = neueId("IP");
  const r = await sitzungStarten(k, { id, vorname: n.vorname, nachname: n.nachname, email: n.email, rueckUrl: `${basisUrl}/portal/verifizierung?ident=${id}` }).catch((e) => {
    throw new PlattformFehler(e.status || 502, e.message);
  });
  return aendernBereit((db) => {
    const s = { id, kontoId: n.id, anbieter: k.anbieter, status: "ausstehend", url: r.url, externeId: r.externeId || null, erstelltAm: jetzt(), ereignisse: [] };
    D(db).identitaet.push(s);
    if (D(db).identitaet.length > 5000) D(db).identitaet.splice(0, D(db).identitaet.length - 5000);
    protokoll(db, n, "ident_start", "ident", id, `Online-Identifizierung gestartet (${k.label})`);
    return { sitzung: sitzungAusgabe(s), url: r.url };
  });
}

const KYC_ERGEBNIS = { bestanden: "ok", pruefen: "auffaellig", abgelehnt: "auffaellig", abgebrochen: "hinweis" };

/**
 * Webhook verarbeiten (Systemaufruf ohne Nutzer). kopf: (name) => Wert, roh: Roh-Body.
 * Liefert { status: 200|401|400, antwort }. Signatur falsch → 401 ohne Details. Wiederholte Ereignisse → 200 (idempotent).
 */
export async function identWebhook({ anbieter, kopf, roh }) {
  const k = identKonfig();
  if (!k.anbieter || anbieter !== k.anbieter) return { status: 404, antwort: { ok: false } };
  const sig = webhookSignaturPruefen(anbieter, kopf, roh, { geheimnis: k.geheimnis });
  if (!sig.ok) return { status: 401, antwort: { ok: false, error: "Signatur ungültig." } };
  let p;
  try {
    p = JSON.parse(roh);
  } catch {
    return { status: 400, antwort: { ok: false, error: "Ungültiges JSON." } };
  }
  const e = webhookNormalisieren(anbieter, p);
  if (!e) return { status: 200, antwort: { ok: true, verarbeitet: false } };
  const r = await aendernBereit((db) => {
    const s = D(db).identitaet.find((x) => x.id === v.kennung(e.sitzungId) && x.anbieter === anbieter);
    if (!s) return { unbekannt: true };
    const ereignisId = e.ereignisId || sha256(roh).slice(0, 24);
    if ((D(db).ereignisse || []).includes(`${anbieter}:${ereignisId}`)) return { doppelt: true };
    D(db).ereignisse.push(`${anbieter}:${ereignisId}`);
    if (D(db).ereignisse.length > 5000) D(db).ereignisse.splice(0, 1000);
    s.status = e.ergebnis;
    s.verfahren = e.verfahren;
    s.grund = e.grund;
    s.externeId = e.externeId || s.externeId;
    s.abgeschlossenAm = jetzt();
    s.ereignisse = [...(s.ereignisse || []), { am: jetzt(), ergebnis: e.ergebnis, ereignisId }].slice(-20);
    s.url = null;
    protokoll(db, null, "ident_ergebnis", "ident", s.id, `Identitätsanbieter ${IDENT_ANBIETER[anbieter]?.label}: ${IDENT_ERGEBNIS[e.ergebnis]?.label}`);
    const u = nutzerById(db, s.kontoId);
    if (u) benachrichtigen(db, u, { art: "status", titel: "Online-Identifizierung abgeschlossen", text: "Das Ergebnis liegt unserem Team vor. Die abschließende Prüfung Ihrer Verifizierung erfolgt durch die Compliance.", link: "/portal/verifizierung", objektArt: "kyc", objektId: s.id }, { mail: false });
    return { sitzung: { ...s }, ereignis: e };
  });
  if (r.unbekannt) return { status: 200, antwort: { ok: true, verarbeitet: false } };
  if (r.doppelt) return { status: 200, antwort: { ok: true, verarbeitet: false, doppelt: true } };
  const eintrag = await anKycHaengen({ kontoId: r.sitzung.kontoId }, {
    quelle: `Identitätsanbieter ${IDENT_ANBIETER[anbieter]?.label || anbieter}`, art: "identitaet", ergebnis: KYC_ERGEBNIS[r.ereignis.ergebnis] || "hinweis",
    zusammenfassung: `${IDENT_ERGEBNIS[r.ereignis.ergebnis]?.label}${r.ereignis.verfahren ? ` · ${r.ereignis.verfahren}` : ""}${r.ereignis.grund ? ` · ${r.ereignis.grund}` : ""}`,
    externeId: r.ereignis.externeId || r.sitzung.id, rohdatenRef: `Sitzung ${r.sitzung.id}`, daten: { sitzung: r.sitzung.id, ...r.ereignis.daten },
  });
  if (eintrag?.id) {
    await aendern((db) => {
      const s = D(db).identitaet.find((x) => x.id === r.sitzung.id);
      if (s) s.kycEintragId = eintrag.id;
    });
  }
  return { status: 200, antwort: { ok: true, verarbeitet: true } };
}

/** Demo-Simulator: eigenes Ergebnis wählen → signierter Webhook über denselben Prüfpfad */
export async function identDemoAbschluss(n, { sitzungId, ergebnis } = {}) {
  angemeldet(n);
  const k = identKonfig();
  if (!k.demo) throw verboten("Nur im Demo-Betrieb verfügbar.");
  const db = await lesenBereit();
  const s = D(db).identitaet.find((x) => x.id === v.kennung(sitzungId));
  if (!s || s.kontoId !== n.id) throw nichtGefunden("Sitzung nicht gefunden.");
  if (s.status !== "ausstehend") throw konflikt("Diese Sitzung ist bereits abgeschlossen.");
  const e = v.auswahl(ergebnis, ["bestanden", "pruefen", "abgelehnt", "abgebrochen"], "");
  if (!e) throw ungueltig("Bitte ein Ergebnis wählen.");
  const roh = JSON.stringify({ sitzungId: s.id, externeId: `DEMO-${s.id}`, ergebnis: e, verfahren: "Simulation (Demo)", ereignisId: `demo-${s.id}-${e}`, nfc: e === "bestanden", liveness: e !== "abgebrochen" });
  const kopfWerte = webhookSignieren("demo", roh, { geheimnis: k.geheimnis });
  const r = await identWebhook({ anbieter: "demo", kopf: (h) => kopfWerte[h.toLowerCase()] ?? null, roh });
  return { ok: r.status === 200, ...r.antwort };
}

/** MRZ-Vorprüfung: Prüfziffern, Ablauf, Abgleich mit Konto/KYC-Angaben → Hinweis im KYC-Fall (keine Entscheidung) */
export async function mrzPruefen(n, { zeilen = "" } = {}) {
  angemeldet(n);
  const text = String(zeilen || "").slice(0, 400);
  if (text.replace(/\s/g, "").length < 60) throw ungueltig("Bitte geben Sie alle Zeilen der maschinenlesbaren Zone ein.");
  let fall = null;
  try {
    fall = (await kycDemo.kycFall(n))?.fall || null;
  } catch {
    fall = null;
  }
  const p = fall?.person || {};
  const soll = { vorname: p.vorname || n.vorname, nachname: p.nachname || n.nachname, geburtsdatum: p.geburtsdatum || "", ausweisNummer: p.ausweis?.nummer || "" };
  const r = mrzVorpruefung(text, soll);
  const f = r.mrz.felder || {};
  const eintrag = {
    id: neueId("MZ"), kontoId: n.id, am: jetzt(), ergebnis: r.ergebnis, format: r.mrz.format, dokumentart: f.dokumentart || "", land: f.ausstellerstaat || "",
    gueltigBis: f.gueltigBis || null, nummerMaskiert: nummerMaskiert(f.dokumentnummer), abgleich: r.abgleich, pruefziffern: `${r.mrz.pruefungen.filter((x) => x.ok).length}/${r.mrz.pruefungen.length}`,
  };
  await aendernBereit((db) => {
    D(db).mrz.push(eintrag);
    if (D(db).mrz.length > 5000) D(db).mrz.splice(0, 1000);
    protokoll(db, n, "mrz_vorpruefung", "ident", eintrag.id, `MRZ-Vorprüfung: ${r.ergebnis} (${eintrag.pruefziffern} Prüfziffern)`);
  });
  const kyc = fall
    ? await anKycHaengen({ kontoId: n.id }, {
        quelle: "MRZ-Vorprüfung (automatisch)", art: "mrz", ergebnis: r.ergebnis === "plausibel" ? "ok" : r.ergebnis === "ungueltig" ? "fehler" : "auffaellig",
        zusammenfassung: `${r.ergebnis === "plausibel" ? "Automatisch plausibel" : r.ergebnis === "ungueltig" ? "MRZ nicht stimmig" : "Abweichungen"} – ${f.dokumentart || "Dokument"} ${f.ausstellerstaat || ""}, Nr. ${eintrag.nummerMaskiert}, gültig bis ${f.gueltigBis || "–"}. ${r.hinweise.join(" ")}`.trim(),
        externeId: eintrag.id,
        daten: { format: r.mrz.format || "", pruefziffern: eintrag.pruefziffern, gueltigBis: f.gueltigBis || "", nameStimmt: r.abgleich.name ?? "", geburtsdatumStimmt: r.abgleich.geburtsdatum ?? "", nummerStimmt: r.abgleich.ausweisNummer ?? "" },
      })
    : null;
  return { ...r, kycVerknuepft: !!kyc?.id, hinweisKyc: fall ? "" : "Sie haben noch keine Verifizierung begonnen – das Ergebnis wird angehängt, sobald Sie Ihre Angaben gespeichert haben und erneut prüfen." };
}

// ================================================================ Register

const auskunftKurz = (a) => ({ id: a.id, land: a.land, nummer: a.nummer, name: a.firma?.name || "", status: a.firma?.status || (a.firma ? "" : "nicht_gefunden"), quelle: a.quelle, abrufAm: a.abrufAm, zweck: a.zweck, kycFallId: a.kycFallId || null, von: a.von || "" });

export async function registerSuche(n, { land, q } = {}) {
  registerLesen(n);
  const l = v.auswahl(land, Object.keys(REGISTER_LAENDER), "");
  if (!l) throw ungueltig("Bitte wählen Sie ein Land.");
  try {
    return { land: l, ...(await registerSuchen({ land: l, q })) };
  } catch (e) {
    throw new PlattformFehler(e.status || 502, e.message);
  }
}

export async function registerAbruf(n, { land, nummer, kycFallId = null, zweck = "" } = {}) {
  registerSchreiben(n);
  const l = v.auswahl(land, Object.keys(REGISTER_LAENDER), "");
  if (!l) throw ungueltig("Bitte wählen Sie ein Land.");
  const fallId = kycFallId ? v.kennung(kycFallId) : null;
  if (kycFallId && !fallId) throw ungueltig("Ungültige Kennung des KYC-Falls.");
  if (fallId && stufe(n, "compliance") < 2) throw verboten("Registerauszüge im KYC-Fall hinterlegt nur die Compliance.");
  let r;
  try {
    r = await registerAbrufen({ land: l, nummer });
  } catch (e) {
    throw new PlattformFehler(e.status || 502, e.message);
  }
  const a = await aendernBereit((db) => {
    const x = { id: neueId("RA"), land: l, nummer: registernummerPruefen(l, nummer).nummer, firma: r.firma, quelle: r.quelle, abrufAm: r.abrufAm, vonId: n.id, von: nameVon(db, n.id), zweck: v.text(zweck, 160), kycFallId: fallId };
    D(db).register.unshift(x);
    if (D(db).register.length > 3000) D(db).register.length = 3000;
    protokoll(db, n, "register_abruf", "register", x.id, `Registerabruf ${REGISTER_LAENDER[l].register} ${x.nummer} (${r.quelle})`);
    return x;
  });
  if (fallId) {
    const f = a.firma;
    const kritisch = !f || ["geloescht", "in_loeschung", "in_liquidation"].includes(f.status);
    const e = await anKycHaengen(fallId, {
      quelle: `${REGISTER_LAENDER[l].register}${r.quelle === "demo" ? " (Demo)" : ""}`, art: "register", ergebnis: kritisch ? "auffaellig" : "ok",
      zusammenfassung: f ? `${f.name} · ${a.nummer} · ${f.rechtsform || ""} · Status ${f.status || "–"} · Sitz ${f.sitz || "–"} · abgerufen ${a.abrufAm.slice(0, 10)}` : `Unter ${a.nummer} wurde keine Firma gefunden.`,
      externeId: a.id, rohdatenRef: `/api/admin/register/${a.id}/pdf`, daten: { nummer: a.nummer, status: f?.status || "nicht_gefunden", abrufAm: a.abrufAm, quelle: r.quelle },
    });
    if (!e) throw nichtGefunden("KYC-Fall nicht gefunden – der Abruf wurde gespeichert, aber nicht hinterlegt.");
  }
  return { auskunft: { ...auskunftKurz(a), firma: a.firma } };
}

export async function registerAuskuenfte(n, { q = "" } = {}) {
  registerLesen(n);
  const db = await lesenBereit();
  const such = v.text(q, 80).toLowerCase();
  const liste = D(db).register.filter((a) => !such || `${a.nummer} ${a.firma?.name || ""}`.toLowerCase().includes(such)).slice(0, 200);
  const k = registerKonfig();
  return { auskuenfte: liste.map(auskunftKurz), konfig: { CH: k.CH.aktiv ? "zefix" : "demo", AT: k.AT.aktiv ? "firmenbuch" : "demo", DE: k.DE.aktiv ? "handelsregister" : "demo" } };
}

export async function registerAuskunft(n, id) {
  registerLesen(n);
  const db = await lesenBereit();
  const a = D(db).register.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Registerauskunft nicht gefunden.");
  return { ...auskunftKurz(a), firma: a.firma };
}

/** Registerauskunft als PDF (Abrufdatum, Quelle) – für den KYC-Fall */
export async function registerAuskunftPdf(n, id) {
  const a = await registerAuskunft(n, id);
  const f = a.firma || {};
  const r = REGISTER_LAENDER[a.land];
  const pdf = dokumentePdf([{
    id: "register", titel: `Registerauskunft ${r.register}`, untertitel: `${f.name || "Keine Firma gefunden"} · ${a.nummer} · abgerufen am ${a.abrufAm.slice(0, 16).replace("T", " ")} UTC über ${a.quelle === "demo" ? "Demo-Daten (keine Live-Abfrage)" : a.quelle}`,
    abschnitte: [
      { tabelle: { kopf: ["Angabe", "Wert"], zeilen: [["Firma", f.name || "–"], ["Registernummer", a.nummer], ["Gericht / Amt", f.gericht || r.behoerde], ["Rechtsform", f.rechtsform || "–"], ["Sitz", f.sitz || "–"], ["Anschrift", f.anschrift || "–"], ["Status", f.status || "nicht gefunden"], ["Stammkapital", f.stammkapital ? `${Number(f.stammkapital).toLocaleString("de-DE")} ${f.waehrung || (a.land === "CH" ? "CHF" : "EUR")}` : "–"], ["Registerstand", f.stand || "–"]] } },
      ...(f.gegenstand ? [{ titel: "Gegenstand / Zweck", text: f.gegenstand }] : []),
      ...((f.organe || []).length ? [{ titel: "Organe", tabelle: { kopf: ["Funktion", "Name", "seit"], zeilen: f.organe.map((o) => [o.funktion || "", o.name || "", o.seit || ""]) } }] : []),
      ...((f.gesellschafter || []).length ? [{ titel: "Gesellschafter", tabelle: { kopf: ["Name", "Anteil"], zeilen: f.gesellschafter.map((g) => [g.name, g.anteil != null ? `${g.anteil} %` : ""]) } }] : []),
      { text: `Diese Zusammenfassung ersetzt keinen amtlichen Registerauszug. Abrufzweck: ${a.zweck || "–"}. Abgerufen von: ${a.von || "–"}.` },
    ],
  }], { titel: `Registerauskunft ${a.nummer}`, kennzeichen: "REGISTERAUSKUNFT", demo: a.quelle === "demo" });
  return { pdf, name: `registerauskunft-${a.id}.pdf` };
}

// ================================================================ Bonität

function subjektAufloesen(db, { art, id }) {
  if (art === "organisation") {
    const o = (db.organisationen || []).find((x) => x.id === v.kennung(id));
    if (!o) throw nichtGefunden("Organisation nicht gefunden.");
    const mitglieder = (db.mitgliedschaften || []).filter((m) => m.organisationId === o.id && ["inhaber", "admin"].includes(m.rolle)).map((m) => m.nutzerId);
    return { organisationId: o.id, kontoId: null, name: o.name, informieren: mitglieder };
  }
  const u = nutzerById(db, v.kennung(id));
  if (!u) throw nichtGefunden("Konto nicht gefunden.");
  return { organisationId: null, kontoId: u.id, name: u.firma?.trim() || nameVon(db, u.id), informieren: [u.id] };
}

function auskunftAusgabe(db, a, { voll = true } = {}) {
  const e = bonitaetEinstellungenDb(db);
  const g = bonitaetGueltig(a, e);
  return {
    id: a.id, subjekt: a.subjekt, anlass: a.anlass, anlassLabel: BONITAET_ANLAESSE[a.anlass] || a.anlass, status: a.status, anbieter: a.anbieter, anbieterLabel: a.anbieterLabel,
    am: a.am, auskunftAm: a.auskunftAm, von: nameVon(db, a.vonId), gueltig: g.ok, gueltigGrund: g.grund, informiertAm: a.informiertAm || null, demo: !!a.demo,
    ...(voll ? { ampel: a.ampel, score: a.score, skala: a.skala, kreditlimit: a.kreditlimit, waehrung: a.waehrung, ausfallwahrscheinlichkeit: a.ausfallwahrscheinlichkeit, zahlungsweise: a.zahlungsweise, negativmerkmale: a.negativmerkmale || [], referenz: a.referenz, rechtsgrundlage: a.rechtsgrundlage, freigabe: a.freigabe || null } : {}),
  };
}

/** Übersicht: Auskünfte, offene LOI-Voraussetzungen, Einstellungen */
export async function bonitaetUebersicht(n, { q = "" } = {}) {
  bonitaetLesen(n);
  const db = await lesenBereit();
  const e = bonitaetEinstellungenDb(db);
  const such = v.text(q, 80).toLowerCase();
  const auskuenfte = D(db).bonitaet.filter((a) => !such || `${a.subjekt?.name} ${a.id}`.toLowerCase().includes(such)).slice(0, 200).map((a) => auskunftAusgabe(db, a));
  // Offene Voraussetzungen: Interessen mit freigegebenem Datenraum (nächster Schritt LOI/Gebot), Pflicht aktiv, keine gültige Auskunft
  const offen = [];
  const gesehen = new Set();
  for (const i of db.interessen || []) {
    if (!["nda_freigegeben", "loi_abgegeben"].includes(i.status)) continue;
    const ziel = { kontoId: i.investorId, organisationId: i.organisationId || null };
    const schluessel = ziel.organisationId || ziel.kontoId;
    if (gesehen.has(schluessel)) continue;
    const f = bonitaetFreigabeDb(db, "loi", ziel);
    if (!f.aktiv || f.ok) continue;
    gesehen.add(schluessel);
    const s = subjektAufloesen(db, ziel.organisationId ? { art: "organisation", id: ziel.organisationId } : { art: "konto", id: ziel.kontoId });
    offen.push({ interesseId: i.id, projektId: i.projektId, subjekt: { art: ziel.organisationId ? "organisation" : "konto", id: schluessel, name: s.name }, grund: f.grund });
  }
  const k = bonitaetKonfig();
  const kandidaten = [
    ...(db.organisationen || []).map((o) => ({ art: "organisation", id: o.id, name: o.name })),
    ...(db.nutzer || []).filter((u) => u.aktiv && u.rollen.includes("investor")).map((u) => ({ art: "konto", id: u.id, name: u.firma?.trim() ? `${u.firma} (${nameVon(db, u.id)})` : nameVon(db, u.id) })),
  ].slice(0, 400);
  return {
    auskuenfte, offen, kandidaten,
    einstellungen: { ...e, geltungWirksam: bonitaetGeltung(e, process.env), pilotKonten: (e.pilotKonten || []).map((id) => ({ id, name: nameVon(db, id) || id })) },
    konfig: { anbieter: k.anbieter, label: k.label, aktiv: k.aktiv, demo: k.demo },
    rechtsgrundlagen: BONITAET_RECHTSGRUNDLAGEN, anlaesse: BONITAET_ANLAESSE,
    schreiben: stufe(n, "bonitaet") >= 2,
  };
}

/** Auskunft beauftragen (Leitung/Transaktion/Compliance). Betroffene werden informiert (ohne Ergebnis). */
export async function bonitaetBeauftragen(n, daten = {}) {
  bonitaetSchreiben(n);
  const art = v.auswahl(daten.subjekt?.art, ["organisation", "konto"], "");
  if (!art) throw ungueltig("Bitte wählen Sie Organisation oder Konto.");
  const anlass = v.auswahl(daten.anlass, Object.keys(BONITAET_ANLAESSE), "loi");
  const rechtsgrundlage = v.auswahl(daten.rechtsgrundlage, Object.keys(BONITAET_RECHTSGRUNDLAGEN), "berechtigtes_interesse");
  const land = v.auswahl(daten.land, ["AT", "DE", "CH"], "AT");
  const db0 = await lesenBereit();
  const s = subjektAufloesen(db0, { art, id: daten.subjekt?.id });
  const name = v.text(daten.name, 160) || s.name;
  const registernummer = v.text(daten.registernummer, 40);
  let r;
  try {
    r = await bonitaetAbrufen({ name, land, registernummer });
  } catch (e) {
    throw new PlattformFehler(e.status || 502, e.message);
  }
  return aendernBereit((db) => {
    const { pdfBase64, ...rest } = r;
    const a = { id: neueId("BA"), subjekt: { art, organisationId: s.organisationId, kontoId: s.kontoId, name, land, registernummer }, anlass, rechtsgrundlage, interesseId: v.kennung(daten.interesseId) || null, am: jetzt(), vonId: n.id, ...rest, pdfVorhanden: !!pdfBase64 };
    D(db).bonitaet.unshift(a);
    if (D(db).bonitaet.length > 3000) D(db).bonitaet.length = 3000;
    // Protokoll OHNE Ergebnis (Hash-Kette ist für mehr Rollen lesbar als die Auskunft)
    protokoll(db, n, "bonitaet_auskunft", "bonitaet", a.id, `Bonitätsauskunft ${a.anbieterLabel} zu ${name} eingeholt (${BONITAET_ANLAESSE[anlass]})`);
    if (daten.informieren !== false) {
      const text = bonitaetInformation({ anbieterLabel: a.anbieterLabel, subjekt: name, rechtsgrundlage });
      for (const id of s.informieren) {
        const u = nutzerById(db, id);
        if (u) benachrichtigen(db, u, { art: "status", titel: "Information: Bonitätsauskunft eingeholt", text: text.slice(0, 300), link: "/portal/profil", objektArt: "bonitaet", objektId: a.id }, { mailText: text, mailBetreff: "Information zur Bonitätsauskunft – ÖkoInvest" });
      }
      a.informiertAm = jetzt();
      a.informiert = s.informieren.length;
    }
    return { auskunft: auskunftAusgabe(db, a) };
  });
}

export async function bonitaetDetail(n, id, { ip = "" } = {}) {
  bonitaetLesen(n);
  await lesenBereit();
  return aendern((db) => {
    const a = D(db).bonitaet.find((x) => x.id === v.kennung(id));
    if (!a) throw nichtGefunden("Bonitätsauskunft nicht gefunden.");
    protokoll(db, n, "bonitaet_einsicht", "bonitaet", a.id, "Bonitätsauskunft eingesehen", ip);
    const zugriffe = (db.aktivitaeten || []).filter((x) => x.objektArt === "bonitaet" && x.objektId === a.id).slice(-30).reverse().map((x) => ({ am: x.am, aktion: x.aktion, text: x.text, nutzer: nameVon(db, x.nutzerId) || "System" }));
    return { auskunft: auskunftAusgabe(db, a), zugriffe };
  });
}

/** Manuelle Freigabe trotz roter Ampel / fehlender Daten (Begründung Pflicht, Vier-Augen nicht erzwungen) */
export async function bonitaetFreigeben(n, id, { begruendung = "" } = {}) {
  bonitaetSchreiben(n);
  const b = v.mehrzeilig(begruendung, 1000);
  v.pflicht(b.length >= 10, "Bitte begründen Sie die Freigabe (mindestens 10 Zeichen).");
  return aendernBereit((db) => {
    const a = D(db).bonitaet.find((x) => x.id === v.kennung(id));
    if (!a) throw nichtGefunden("Bonitätsauskunft nicht gefunden.");
    if (a.freigabe) throw konflikt("Die Auskunft ist bereits freigegeben.");
    a.freigabe = { vonId: n.id, von: nameVon(db, n.id), am: jetzt(), begruendung: b };
    protokoll(db, n, "bonitaet_freigabe", "bonitaet", a.id, "Bonitätsauskunft manuell freigegeben (Begründung dokumentiert)");
    return { auskunft: auskunftAusgabe(db, a) };
  });
}

export async function bonitaetEinstellungenSpeichern(n, daten = {}) {
  bonitaetSchreiben(n);
  return aendernBereit((db) => {
    const e = { ...bonitaetEinstellungenDb(db) };
    if ("geltung" in daten) e.geltung = daten.geltung === null || daten.geltung === "" ? null : v.auswahl(daten.geltung, ["alle", "firmen", "pilot", "aus"], e.geltung);
    if ("gueltigTage" in daten) e.gueltigTage = v.zahl(daten.gueltigTage, { min: 7, max: 730 }) ?? e.gueltigTage;
    if ("rotSperrt" in daten) e.rotSperrt = v.wahr(daten.rotSperrt);
    if (daten.schritte && typeof daten.schritte === "object") e.schritte = { loi: daten.schritte.loi !== false, gebot: daten.schritte.gebot !== false };
    if (daten.pilotKonto?.id) {
      const id = v.kennung(daten.pilotKonto.id);
      if (!nutzerById(db, id)) throw nichtGefunden("Konto nicht gefunden.");
      const set = new Set(e.pilotKonten || []);
      if (daten.pilotKonto.an) set.add(id);
      else set.delete(id);
      e.pilotKonten = [...set];
    }
    D(db).einstellungen.bonitaet = e;
    protokoll(db, n, "bonitaet_einstellungen", "bonitaet", "einstellungen", `Bonität vor LOI: Geltung ${bonitaetGeltung(e, process.env)}, gültig ${e.gueltigTage} Tage`);
    return { einstellungen: { ...e, geltungWirksam: bonitaetGeltung(e, process.env) } };
  });
}

/** Status für ein Subjekt ohne Ergebnis (für NDA/LOI-Übersicht im Backoffice mit Leserecht „interessen“) */
export async function bonitaetStatus(n, { kontoId = null, organisationId = null } = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten();
  const db = await lesenBereit();
  const f = bonitaetFreigabeDb(db, "loi", { kontoId: v.kennung(kontoId) || null, organisationId: v.kennung(organisationId) || null });
  const a = bonitaetAktuell(db, { kontoId, organisationId });
  return { pflicht: f.aktiv, ok: f.ok, grund: f.grund, firma: istFirma(db, { kontoId, organisationId }), auskunftId: stufe(n, "bonitaet") >= 1 ? a?.id || null : null };
}

// ================================================================ Gesellschaften (SPV-Gründung)

const leerText = (x, max = 160) => v.text(x, max);

function gesellschaftAusgabe(db, g, { detail = false } = {}) {
  const rf = RECHTSFORMEN[g.rechtsform];
  const status = statusAusSchritten(g);
  const out = {
    id: g.id, name: g.name, rechtsform: g.rechtsform, rechtsformLabel: rf?.label || g.rechtsform, land: g.land, sitz: g.sitz, status, statusLabel: GESELLSCHAFT_STATUS[status]?.label || status,
    registernummer: g.registernummer || "", fortschritt: fortschritt(g), fristen: fristenFuer({ ...g, status }), herkunft: g.herkunft || "assistent", demo: !!g.demo,
    gesellschafter: (g.gesellschafter || []).map((x) => ({ art: x.art, gesellschaftId: x.gesellschaftId || null, name: x.name, anteil: x.anteil, einlage: x.einlage ?? null, register: x.register || "" })),
    projekt: g.projekt || null, erstelltAm: g.erstelltAm, geaendertAm: g.geaendertAm,
  };
  if (!detail) return out;
  return {
    ...out, anschrift: g.anschrift || "", bundesland: g.bundesland || "", stammkapital: g.stammkapital, einzahlung: g.einzahlung, waehrung: rf?.waehrung || "EUR",
    geschaeftsfuehrung: g.geschaeftsfuehrung || [], komplementaer: g.komplementaer || null, gegenstand: g.gegenstand || "", bilanzstichtag: g.bilanzstichtag || "12-31",
    uid: g.uid || "", steuernummer: g.steuernummer || "", gericht: g.gericht || "", musterprotokoll: !!g.musterprotokoll, musterprotokollMoeglich: musterprotokollMoeglich(g),
    namenspruefung: g.namenspruefung || null, schritte: g.schritte || [], dokumente: dokumentTitel(g), rechtsformInfo: rf || null, gegruendetAm: g.gegruendetAm || null, eingetragenAm: g.eingetragenAm || null,
    erpnext: { installiert: false, company: g.erpCompany || null, hinweis: "ERPNext ist im Demo-Betrieb nicht angebunden. In Frappe: Aktion legt eine Company an, wenn ERPNext installiert und oekoinvest_erpnext_gesellschaften aktiv ist." },
    verlauf: (g.verlauf || []).slice(-40).reverse().map((x) => ({ ...x, von: nameVon(db, x.vonId) || "System" })),
  };
}

/** Organigramm: Knoten = Gesellschaften, Kanten = Beteiligungen an Gruppengesellschaften */
function organigramm(db) {
  const liste = D(db).gesellschaften.filter((g) => g.status !== "aufgeloest");
  const knoten = liste.map((g) => ({ id: g.id, name: g.name, status: statusAusSchritten(g), land: g.land, registernummer: g.registernummer || "" }));
  const kanten = [];
  for (const g of liste) for (const x of g.gesellschafter || []) if (x.gesellschaftId && liste.some((y) => y.id === x.gesellschaftId)) kanten.push({ von: x.gesellschaftId, nach: g.id, anteil: Number(x.anteil) || 0 });
  const extern = liste.flatMap((g) => (g.gesellschafter || []).filter((x) => !x.gesellschaftId).map((x) => ({ nach: g.id, name: x.name, anteil: Number(x.anteil) || 0 })));
  return { gruppe: "ÖKOVOLT Gruppe", knoten, kanten, extern };
}

export async function gesellschaftenListe(n, { q = "", status = "" } = {}) {
  gesLesen(n);
  const db = await lesenBereit();
  const such = v.text(q, 80).toLowerCase();
  const alle = D(db).gesellschaften.map((g) => gesellschaftAusgabe(db, g));
  const liste = alle.filter((g) => (!such || `${g.name} ${g.registernummer} ${g.sitz}`.toLowerCase().includes(such)) && (!status || g.status === status));
  const heute = jetzt().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const fristen = alle.flatMap((g) => g.fristen.filter((f) => !f.erledigt && f.faellig <= in60).map((f) => ({ ...f, gesellschaftId: g.id, gesellschaft: g.name, ueberfaellig: f.faellig < heute }))).sort((a, b) => a.faellig.localeCompare(b.faellig));
  return {
    gesellschaften: liste, organigramm: organigramm(db), fristen,
    kennzahlen: { gesamt: alle.length, inGruendung: alle.filter((g) => ["entwurf", "in_gruendung", "eingetragen"].includes(g.status)).length, aktiv: alle.filter((g) => ["aktiv", "bestand"].includes(g.status)).length, fristen: fristen.length, ueberfaellig: fristen.filter((f) => f.ueberfaellig).length },
    schreiben: stufe(n, "gesellschaften") >= 2,
  };
}

/** Auswahllisten des Assistenten: Entwicklungsprojekte (Team Projektentwicklung), Gruppengesellschaften, Rechtsformen */
export async function gesellschaftAuswahl(n) {
  gesLesen(n);
  let projekte = [];
  try {
    const p = await entwicklungDemo.entwicklungPortfolio(n, {});
    projekte = (p?.projekte || []).filter((x) => x.status !== "abgebrochen").map((x) => ({ id: x.id, titel: x.titel, typ: x.typ, land: x.land, bundesland: x.bundesland, gemeinde: x.gemeinde, mwp: x.mwp, statusLabel: x.statusLabel }));
  } catch {
    projekte = [];
  }
  const db = await lesenBereit();
  const verknuepft = new Map(D(db).gesellschaften.filter((g) => g.entwicklungProjektId).map((g) => [g.entwicklungProjektId, g.id]));
  return {
    projekte: projekte.map((p) => ({ ...p, gesellschaftId: verknuepft.get(p.id) || null })),
    gruppe: D(db).gesellschaften.filter((g) => ["bestand", "aktiv", "eingetragen"].includes(statusAusSchritten(g))).map((g) => ({ id: g.id, name: g.name, registernummer: g.registernummer || "", sitz: g.sitz || "", land: g.land })),
    rechtsformen: RECHTSFORMEN,
    geschaeftsfuehrung: GESELLSCHAFT.geschaeftsfuehrung,
  };
}

/** Firmennamen-Vorprüfung: Registersuche im Sitzland + eigene Gesellschaften */
export async function gesellschaftNamenPruefen(n, { rechtsform, name } = {}) {
  gesLesen(n);
  const rf = RECHTSFORMEN[rechtsform];
  if (!rf) throw ungueltig("Bitte wählen Sie eine Rechtsform.");
  const text = v.text(name, 160);
  let suche = { quelle: "demo", treffer: [], hinweis: "" };
  const kern = text.replace(/\b(GmbH\s?&\s?Co\.?\s?KG|GmbH|UG \(haftungsbeschränkt\)|Sàrl|Sagl)\b/gi, "").trim();
  if (kern.length >= 2) {
    try {
      suche = await registerSuchen({ land: rf.land, q: kern });
    } catch (e) {
      suche = { quelle: "fehler", treffer: [], hinweis: e.message };
    }
  }
  const db = await lesenBereit();
  const eigene = D(db).gesellschaften.filter((g) => g.land === rf.land && g.status !== "aufgeloest").map((g) => ({ name: g.name, nummer: g.registernummer || g.id, status: statusAusSchritten(g) }));
  const r = firmennamePruefen(text, rechtsform, [...suche.treffer, ...eigene]);
  return { ...r, quelle: suche.quelle, hinweisQuelle: suche.hinweis, am: jetzt() };
}

function gesellschafterBereinigen(db, liste = []) {
  return (Array.isArray(liste) ? liste : []).slice(0, 20).map((x) => {
    const art = v.auswahl(x.art, ["gruppe", "person", "extern"], "extern");
    const grp = art === "gruppe" ? D(db).gesellschaften.find((g) => g.id === v.kennung(x.gesellschaftId)) : null;
    if (art === "gruppe" && !grp) throw ungueltig("Gruppengesellschaft nicht gefunden.");
    return {
      art, gesellschaftId: grp?.id || null, name: grp?.name || leerText(x.name), register: grp?.registernummer || leerText(x.register, 60), sitz: grp?.sitz || leerText(x.sitz, 80),
      anteil: v.zahl(x.anteil, { min: 0, max: 100 }) ?? 0, einlage: v.zahl(x.einlage, { min: 0, max: 1e10 }) ?? 0,
      geburtsdatum: art === "person" && /^\d{4}-\d{2}-\d{2}$/.test(String(x.geburtsdatum || "")) ? x.geburtsdatum : "", wohnsitzLand: art === "person" ? v.auswahl(String(x.wohnsitzLand || "").toUpperCase(), ["AT", "DE", "CH", "LI", "IT", "FR", "NL", "LU", "BE"], "") : "",
    };
  });
}

const gfBereinigen = (liste = []) => (Array.isArray(liste) ? liste : []).slice(0, 6).map((x) => ({ name: leerText(x.name), geburtsdatum: /^\d{4}-\d{2}-\d{2}$/.test(String(x.geburtsdatum || "")) ? x.geburtsdatum : "", anschrift: leerText(x.anschrift, 200), wohnsitzLand: v.auswahl(String(x.wohnsitzLand || "").toUpperCase(), ["AT", "DE", "CH", "LI", "IT"], "") })).filter((x) => x.name);

function verlaufEintrag(g, n, text) {
  g.verlauf = [...(g.verlauf || []), { am: jetzt(), vonId: n?.id || null, text: v.text(text, 300) }].slice(-200);
}

export async function gesellschaftAnlegen(n, daten = {}) {
  gesSchreiben(n);
  const rechtsform = v.auswahl(daten.rechtsform, Object.keys(RECHTSFORMEN), "");
  const rf = RECHTSFORMEN[rechtsform];
  if (!rf) throw ungueltig("Bitte wählen Sie Land und Rechtsform.");
  // Projekt (Team Projektentwicklung) – nur per Kennung verknüpft, Daten als Schnappschuss
  let projekt = null;
  if (daten.entwicklungProjektId) {
    const id = v.kennung(daten.entwicklungProjektId);
    try {
      const p = await entwicklungDemo.entwicklungProjekt(n, id);
      const x = p?.projekt || p;
      projekt = { id: x.id, titel: x.titel, typ: x.typ, land: x.land, gemeinde: x.gemeinde || "", mwp: x.mwp };
    } catch {
      throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
    }
  }
  const namenspruefung = daten.namenspruefung && typeof daten.namenspruefung === "object" ? await gesellschaftNamenPruefen(n, { rechtsform, name: daten.name }) : null;
  return aendernBereit((db) => {
    if (projekt && D(db).gesellschaften.some((g) => g.entwicklungProjektId === projekt.id && g.status !== "aufgeloest")) throw konflikt("Für dieses Entwicklungsprojekt gibt es bereits eine Projektgesellschaft.");
    const g = {
      id: neueId("PG"), name: leerText(daten.name), rechtsform, land: rf.land, sitz: leerText(daten.sitz, 80), bundesland: leerText(daten.bundesland, 60), anschrift: leerText(daten.anschrift, 200),
      stammkapital: rf.kapital || rechtsform === "de_gmbh_co_kg" ? v.zahl(daten.stammkapital, { min: 0, max: 1e10 }) ?? rf.kapital : 0,
      einzahlung: v.zahl(daten.einzahlung, { min: 0, max: 1e10 }) ?? rf.einzahlung,
      gesellschafter: gesellschafterBereinigen(db, daten.gesellschafter), geschaeftsfuehrung: gfBereinigen(daten.geschaeftsfuehrung),
      komplementaer: rf.komplementaer ? { name: leerText(daten.komplementaer?.name), register: leerText(daten.komplementaer?.register, 60), gesellschaftId: v.kennung(daten.komplementaer?.gesellschaftId) || null } : null,
      gegenstand: v.mehrzeilig(daten.gegenstand, 3000) || gegenstandVorlage({ land: rf.land, typ: projekt?.typ, ort: projekt?.gemeinde }),
      bilanzstichtag: /^\d{2}-\d{2}$/.test(String(daten.bilanzstichtag || "")) ? daten.bilanzstichtag : "12-31",
      musterprotokoll: v.wahr(daten.musterprotokoll), projekt, entwicklungProjektId: projekt?.id || null, status: "entwurf", registernummer: "",
      namenspruefung: namenspruefung ? { ergebnis: namenspruefung.ergebnis, am: namenspruefung.am, quelle: namenspruefung.quelle, aehnlich: namenspruefung.aehnlich, hinweise: namenspruefung.hinweise } : null,
      schritte: schritteFuer(rechtsform), herkunft: "assistent", erstelltVon: n.id, erstelltAm: jetzt(), geaendertAm: jetzt(), verlauf: [],
    };
    if (rf.kapital === 0) g.stammkapital = g.gesellschafter.reduce((s, x) => s + (x.einlage || 0), 0);
    const fehler = gruendungPruefen(g);
    if (fehler.length) throw ungueltig(fehler.join(" "));
    if (g.namenspruefung?.ergebnis === "belegt") throw konflikt("Der Firmenname ist bereits vergeben – bitte einen anderen Namen wählen.");
    if (g.namenspruefung && ["frei", "aehnlich"].includes(g.namenspruefung.ergebnis)) Object.assign(g.schritte.find((s) => s.schluessel === "namenspruefung"), { status: "erledigt", datum: jetzt().slice(0, 10), vonId: n.id, notiz: `Registersuche: ${g.namenspruefung.ergebnis}` });
    if (g.musterprotokoll && !musterprotokollMoeglich(g)) g.musterprotokoll = false;
    verlaufEintrag(g, n, `Gründung angelegt (${rf.label})${projekt ? ` aus Entwicklungsprojekt ${projekt.id}` : ""}`);
    D(db).gesellschaften.push(g);
    protokoll(db, n, "gesellschaft_anlegen", "gesellschaft", g.id, `Projektgesellschaft ${g.name} angelegt`);
    return { gesellschaft: gesellschaftAusgabe(db, g, { detail: true }) };
  });
}

export async function gesellschaft(n, id) {
  gesLesen(n);
  const db = await lesenBereit();
  const g = D(db).gesellschaften.find((x) => x.id === v.kennung(id));
  if (!g) throw nichtGefunden("Gesellschaft nicht gefunden.");
  return { gesellschaft: gesellschaftAusgabe(db, g, { detail: true }), schreiben: stufe(n, "gesellschaften") >= 2 };
}

/** Stammdaten ändern – Kernangaben nur im Entwurf (vor Beurkundung) */
export async function gesellschaftAendern(n, id, daten = {}) {
  gesSchreiben(n);
  return aendernBereit((db) => {
    const g = D(db).gesellschaften.find((x) => x.id === v.kennung(id));
    if (!g) throw nichtGefunden("Gesellschaft nicht gefunden.");
    if (g.herkunft === "stammdaten") throw konflikt("Bestandsgesellschaften werden in den Stammdaten gepflegt.");
    const entwurf = statusAusSchritten(g) === "entwurf";
    const geaendert = [];
    const setze = (feld, wert) => {
      if (JSON.stringify(g[feld]) !== JSON.stringify(wert)) {
        g[feld] = wert;
        geaendert.push(feld);
      }
    };
    if (entwurf) {
      if ("name" in daten) setze("name", leerText(daten.name));
      if ("sitz" in daten) setze("sitz", leerText(daten.sitz, 80));
      if ("anschrift" in daten) setze("anschrift", leerText(daten.anschrift, 200));
      if ("stammkapital" in daten) setze("stammkapital", v.zahl(daten.stammkapital, { min: 0, max: 1e10 }) ?? g.stammkapital);
      if ("einzahlung" in daten) setze("einzahlung", v.zahl(daten.einzahlung, { min: 0, max: 1e10 }) ?? g.einzahlung);
      if ("gegenstand" in daten) setze("gegenstand", v.mehrzeilig(daten.gegenstand, 3000));
      if ("gesellschafter" in daten) setze("gesellschafter", gesellschafterBereinigen(db, daten.gesellschafter));
      if ("geschaeftsfuehrung" in daten) setze("geschaeftsfuehrung", gfBereinigen(daten.geschaeftsfuehrung));
      if ("musterprotokoll" in daten) setze("musterprotokoll", v.wahr(daten.musterprotokoll) && musterprotokollMoeglich(g));
      const fehler = gruendungPruefen(g);
      if (fehler.length) throw ungueltig(fehler.join(" "));
    } else if (["name", "stammkapital", "gesellschafter", "geschaeftsfuehrung", "gegenstand"].some((k) => k in daten)) {
      throw konflikt("Nach der Beurkundung sind Änderungen an Firma, Kapital, Gesellschaftern oder Gegenstand nur über das Notariat möglich.");
    }
    if ("bilanzstichtag" in daten && /^\d{2}-\d{2}$/.test(String(daten.bilanzstichtag))) setze("bilanzstichtag", daten.bilanzstichtag);
    if ("steuernummer" in daten) setze("steuernummer", leerText(daten.steuernummer, 40));
    if ("status" in daten && daten.status === "aufgeloest") setze("status", "aufgeloest");
    if (geaendert.length) {
      g.geaendertAm = jetzt();
      verlaufEintrag(g, n, `Geändert: ${geaendert.join(", ")}`);
      protokoll(db, n, "gesellschaft_aendern", "gesellschaft", g.id, `Stammdaten geändert: ${geaendert.join(", ")}`);
    }
    return { gesellschaft: gesellschaftAusgabe(db, g, { detail: true }) };
  });
}

const VORAUSSETZUNG = { beurkundet: ["unterlagen"], einzahlung: ["bankkonto"], anmeldung: ["beurkundet", "einzahlung"], eingetragen: ["anmeldung"], steuer: ["beurkundet"], transparenz: ["eingetragen"], projektrechte: ["beurkundet"] };

/** Checklisten-Schritt setzen: { schluessel, status, datum?, notiz?, wert? } – Reihenfolge und Pflichtwerte werden geprüft */
export async function gesellschaftSchritt(n, id, daten = {}) {
  gesSchreiben(n);
  return aendernBereit((db) => {
    const g = D(db).gesellschaften.find((x) => x.id === v.kennung(id));
    if (!g) throw nichtGefunden("Gesellschaft nicht gefunden.");
    if (g.status === "aufgeloest") throw konflikt("Die Gesellschaft ist aufgelöst.");
    const s = (g.schritte || []).find((x) => x.schluessel === daten.schluessel);
    if (!s) throw nichtGefunden("Schritt nicht gefunden.");
    const status = v.auswahl(daten.status, ["offen", "in_arbeit", "erledigt", "entfaellt"], "");
    if (!status) throw ungueltig("Ungültiger Status.");
    if (status === "entfaellt" && s.pflicht) throw ungueltig("Pflichtschritte können nicht entfallen.");
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.datum || "")) ? daten.datum : jetzt().slice(0, 10);
    const rf = RECHTSFORMEN[g.rechtsform];
    if (status === "erledigt") {
      const fehlt = (VORAUSSETZUNG[s.schluessel] || []).filter((k) => {
        const x = g.schritte.find((y) => y.schluessel === k);
        return x && !["erledigt", "entfaellt"].includes(x.status);
      });
      if (fehlt.length) throw konflikt(`Vorher erledigen: ${fehlt.map((k) => g.schritte.find((y) => y.schluessel === k)?.label).join(" · ")}`);
      if (s.feld === "registernummer") {
        const p = registernummerPruefen(rf.land, daten.wert);
        if (!p.ok) throw ungueltig(`Registernummer: ${p.fehler}`);
        if (g.rechtsform === "de_gmbh_co_kg" && !/^HRA/i.test(p.nummer)) throw ungueltig("Eine KG wird im Handelsregister Abteilung A (HRA) eingetragen.");
        if (["de_gmbh", "de_ug"].includes(g.rechtsform) && !/^HRB/i.test(p.nummer)) throw ungueltig("Eine GmbH wird im Handelsregister Abteilung B (HRB) eingetragen.");
        g.registernummer = p.nummer;
        g.eingetragenAm = datum;
        s.wert = p.nummer;
      } else if (s.feld === "betrag") {
        const b = v.zahl(daten.wert, { min: 0, max: 1e10 });
        if (b === null || b < (rf.einzahlung || 0)) throw ungueltig(`Eingezahlt werden müssen mindestens ${(rf.einzahlung || 0).toLocaleString("de-DE")} ${rf.waehrung}.`);
        s.wert = String(b);
      } else if (s.feld === "uid") {
        const u = v.text(daten.wert, 40).toUpperCase().replace(/\s/g, "");
        const muster = { AT: /^ATU\d{8}$/, DE: /^DE\d{9}$/, CH: /^CHE-?\d{3}\.?\d{3}\.?\d{3}(MWST)?$/ }[rf.land];
        if (u && !muster.test(u)) throw ungueltig({ AT: "UID-Nummer im Format ATU12345678.", DE: "USt-IdNr. im Format DE123456789.", CH: "UID im Format CHE-123.456.789 (MWST)." }[rf.land]);
        g.uid = u;
        s.wert = u;
      } else if (s.feld === "termin") {
        const t = daten.wert && typeof daten.wert === "object" ? daten.wert : {};
        const tdatum = /^\d{4}-\d{2}-\d{2}/.test(String(t.datum || "")) ? String(t.datum).slice(0, 16) : "";
        if (!tdatum) throw ungueltig("Bitte geben Sie Datum und Notariat des Termins an.");
        s.wert = JSON.stringify({ datum: tdatum, notariat: v.text(t.notariat, 120), art: v.auswahl(t.art, ["praesenz", "video"], "praesenz"), ort: v.text(t.ort, 120) });
      }
      if (s.schluessel === "beurkundet") g.gegruendetAm = datum;
    }
    s.status = status;
    s.datum = status === "offen" ? null : datum;
    s.notiz = v.mehrzeilig(daten.notiz ?? s.notiz, 1000);
    s.vonId = n.id;
    const alt = g.status;
    g.status = statusAusSchritten(g);
    g.geaendertAm = jetzt();
    verlaufEintrag(g, n, `${s.label}: ${status}${s.wert && s.feld !== "termin" ? ` (${s.wert})` : ""}`);
    protokoll(db, n, "gesellschaft_schritt", "gesellschaft", g.id, `${s.label}: ${status}`);
    if (alt !== g.status) protokoll(db, n, "gesellschaft_status", "gesellschaft", g.id, `${GESELLSCHAFT_STATUS[alt]?.label || alt} → ${GESELLSCHAFT_STATUS[g.status]?.label}`);
    return { gesellschaft: gesellschaftAusgabe(db, g, { detail: true }) };
  });
}

/** Dokumentenpaket als PDF (alle oder ein Dokument) */
export async function gesellschaftDokumente(n, id, { dok = "" } = {}) {
  gesLesen(n);
  const r = await aendernBereit((db) => {
    const g = D(db).gesellschaften.find((x) => x.id === v.kennung(id));
    if (!g) throw nichtGefunden("Gesellschaft nicht gefunden.");
    if (g.herkunft === "stammdaten") throw konflikt("Für Bestandsgesellschaften gibt es kein Gründungspaket.");
    protokoll(db, n, "gesellschaft_dokumente", "gesellschaft", g.id, `Dokumentenpaket erzeugt${dok ? ` (${dok})` : ""}`);
    return { g: structuredClone(g) };
  });
  const alle = dokumentenpaket(r.g);
  const auswahl = dok ? alle.filter((d) => d.id === dok) : alle;
  if (!auswahl.length) throw nichtGefunden("Dokument nicht gefunden.");
  const pdf = dokumentePdf(auswahl, { titel: `Gründungspaket ${r.g.name}`, kennzeichen: "GRÜNDUNGSPAKET · MUSTER", muster: true, demo: !!r.g.demo });
  const slug = r.g.name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  return { pdf, name: `gruendungspaket-${slug}${dok ? `-${dok}` : ""}.pdf` };
}

/** ERPNext-Company anlegen – im Demo-Backend nicht angebunden */
export async function gesellschaftErp(n, id) {
  gesSchreiben(n);
  const db = await lesenBereit();
  if (!D(db).gesellschaften.some((x) => x.id === v.kennung(id))) throw nichtGefunden("Gesellschaft nicht gefunden.");
  throw new PlattformFehler(501, "ERPNext ist im Demo-Betrieb nicht angebunden. Im Frappe-Betrieb legt diese Aktion eine Company an, wenn ERPNext installiert und in der site_config aktiviert ist.");
}

/** Fristen aller Gesellschaften (Scheduler; Backoffice-Glocke für fällige Fristen ≤ 14 Tage) */
export async function gesellschaftFristen(n) {
  gesSchreiben(n);
  return aendernBereit((db) => {
    const heute = jetzt().slice(0, 10);
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const empfaenger = db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && stufe(u, "gesellschaften") >= 2 && unterrollen(u).some((r) => ["leitung", "transaktion"].includes(r)));
    let gemeldet = 0;
    D(db).fristenGemeldet = D(db).fristenGemeldet || [];
    for (const g of D(db).gesellschaften) {
      for (const f of fristenFuer({ ...g, status: statusAusSchritten(g) }, heute)) {
        if (f.erledigt || f.faellig > in14) continue;
        const key = `${g.id}:${f.art}:${f.schritt || ""}:${f.faellig}`;
        if (D(db).fristenGemeldet.includes(key)) continue;
        D(db).fristenGemeldet.push(key);
        for (const u of empfaenger) benachrichtigen(db, u, { art: "aufgabe", titel: `Frist ${f.faellig < heute ? "überschritten" : "fällig"}: ${g.name}`, text: `${f.label} – fällig am ${f.faellig.split("-").reverse().join(".")}`, link: `/portal/admin/gesellschaften/${g.id}`, objektArt: "gesellschaft", objektId: g.id });
        gemeldet++;
      }
    }
    if (D(db).fristenGemeldet.length > 2000) D(db).fristenGemeldet.splice(0, 500);
    return { gemeldet };
  });
}
