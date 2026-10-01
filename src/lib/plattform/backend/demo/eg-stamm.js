// src/lib/plattform/backend/demo/eg-stamm.js
//
// Demo-Backend WP1 „Kern-Stammdaten, Rechte, Integration“ des Moduls Energiegemeinschaften – Referenz für
// plattform/api/eg_stamm.py. Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP1). Regeln: src/lib/plattform/eg/*.js.
//
// Rechte (jede Operation prüft Rolle UND Kontext je Gemeinschaft, eg/rechte.js):
//   Backoffice   – admin mit Bereich „eg“ (lesen ≥ 1, schreiben = 2); Kontext-Rollen organisator/gruendung; Stammdatenpflege
//                  (BACKOFFICE_PFLEGE) auch ohne Dienstleistungsvertrag, jede Änderung im Protokoll
//   Organe       – Organ-Eintrag mit eigenem Konto (Vorstand, Kassier, Schriftführung, Rechnungsprüfung) je Matrix
//   Mitglieder   – nur eigene Daten über WP6 (ptGemeinschaft); hier keine Listen
//   sonst        – 404 (keine Existenz verraten), bei bekannter Gemeinschaft ohne Recht 403
//
// Daten unter db.eg (eigene Sammlung; beim ersten Zugriff mit fiktiven Demo-Daten aus eg-stamm-seed.js befüllt).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { csvWert } from "../../csv";
import { darfLesen, darfSchreiben } from "../../rechte";
import {
  EG_MODELLE, EG_TEAMROLLEN, GEMEINSCHAFT_STATUS, MITGLIED_ARTEN, MITGLIED_STATUS, ORGAN_FUNKTIONEN, TEILNAHME_STATUS, ZONELEVEL, ZP_RICHTUNGEN, ABRECHNUNGSRHYTHMEN, RECHNUNGSWEGE,
  SMART_METER, NETZEBENEN, STEUERSTATUS_ERZEUGER,
} from "../../eg/modell";
import { egRollen, egStufe, egRechteVon, istOrgan, organWirksam } from "../../eg/rechte";
import { csvLesen, gemeinschaftBereinigen, gemeinschaftHinweise, kennzahlen, organBereinigen, organHinweise } from "../../eg/stamm";
import { mitgliedBereinigen, mitgliedName, naechsteMitgliedsnummer, teilnahmeBereinigen, teilnahmeRegeln, zaehlpunktBereinigen } from "../../eg/mitglied";
import { anlageBereinigen } from "../../eg/anlage";
import { tarifAm, tarifBereinigen, tarifVersionieren, verteilschluesselBereinigen } from "../../eg/tarif";
import { gemeinschaftUebergang, mitgliedUebergang, teilnahmeUebergang } from "../../eg/status";
import { netzentgeltRegel, regelnAm } from "../../eg/netzentgelt";
import { migrationAusPrototyp } from "../../eg/migration";
import { EG_ADMIN_REITER, EG_ORGAN_REITER } from "../../eg/navigation";
import { MitgliedFehler, ibanMaskiert } from "../../mitglied/basis";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, vorTagen } from "./hilfen";
import { DEMO_KONTEN_EG, EG_SEED_VERSION, egSeed } from "./eg-stamm-seed";

const { protokoll, nameVon, nutzerById, benachrichtigen } = intern;
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const E = (db) => db.eg;

/** Fachfehler der reinen Module → PlattformFehler */
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

// ================================================================ Datenbestand

async function lesenBereit() {
  const db = await lesen();
  if ((db.eg?.v || 0) >= EG_SEED_VERSION) return db;
  await aendern(async (d) => {
    if ((d.eg?.v || 0) >= EG_SEED_VERSION) return;
    const vorlage = d.nutzer.find((u) => u.email === "mitglied@example.com") || d.nutzer.find((u) => u.demo) || null;
    const konto = (email) => d.nutzer.find((u) => u.email === email)?.id || null;
    const demoKonten = {};
    for (const k of DEMO_KONTEN_EG) {
      let u = d.nutzer.find((x) => x.email === k.email);
      if (!u && vorlage) {
        u = { ...structuredClone(vorlage), id: neueId("U"), email: k.email, vorname: k.vorname, nachname: k.nachname, firma: "", telefon: "", rollen: ["mitglied"], sitzungVersion: 0, letzterLogin: null, erstelltAm: vorTagen(400), mailEinstellungen: { ...(vorlage.mailEinstellungen || {}), aus: true }, backofficeRollen: null, demo: true };
        delete u.zweiFaktor;
        d.nutzer.push(u);
      }
      demoKonten[k.email] = u?.id || null;
    }
    const tag = (t) => new Date(Date.now() - t * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
    const iso = (t) => new Date(Date.now() - t * 864e5).toISOString();
    try {
      d.eg = egSeed({ konten: { mitglied: konto("mitglied@example.com"), landwirt: konto("landwirt@example.com"), kommune: konto("kommune@example.com"), obmann: demoKonten["eg-obmann@example.com"], kassier: demoKonten["eg-kassier@example.com"], pruefer: demoKonten["eg-pruefer@example.com"] }, tag, iso });
    } catch (e) {
      console.warn("[plattform-demo] EG-Demodaten nicht ergänzt:", e?.message);
      d.eg = { v: EG_SEED_VERSION, gemeinschaften: [], organe: [], mitglieder: [], zaehlpunkte: [], teilnahmen: [], anlagen: [], tarife: [], verteilschluessel: [], netzbetreiber: [], netzentgeltRegeln: [], migration: null, importe: [] };
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

const meta = (n) => ({ erstelltAm: jetzt(), erstelltVon: n?.system ? null : n?.id || null, geaendertAm: jetzt(), geaendertVon: n?.system ? null : n?.id || null });
const geaendert = (o, n) => Object.assign(o, { geaendertAm: jetzt(), geaendertVon: n?.system ? null : n?.id || null });
const gemeinschaftVon = (db, id) => E(db).gemeinschaften.find((g) => g.id === String(id || "")) || null;

/** Kontext-Rollen des Kontos in der Gemeinschaft */
function kontext(db, n, g) {
  if (n?.system) return { rollen: ["organisator", "gruendung"], backofficeStufe: 2, selbstverwaltung: !g?.dienstleistung?.aktiv };
  return egRollen({ nutzer: n, gemeinschaft: g, organe: E(db).organe, mitglieder: E(db).mitglieder, heute: heute() });
}

/** Gemeinschaft laden und Recht prüfen; ohne jede Rolle → 404 */
function zugriff(db, n, gid, recht, stufe = 1) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const g = gemeinschaftVon(db, gid);
  if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  const k = kontext(db, n, g);
  if (!k.rollen.length && !k.backofficeStufe) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  if (egStufe(k, recht) < stufe) throw verboten(stufe > 1 ? "Ihre Rolle in dieser Gemeinschaft erlaubt diese Änderung nicht." : "Ihre Rolle in dieser Gemeinschaft erlaubt diese Ansicht nicht.");
  return { g, k };
}

// ================================================================ Ausgabe

const nbName = (db, id) => E(db).netzbetreiber.find((x) => x.id === id)?.kurzname || id;
function gemeinschaftAusgabe(db, g, k = null) {
  const z = kennzahlen(g, E(db));
  const regel = netzentgeltRegel({ datum: heute(), modell: g.modell, zonelevel: g.zonelevel, netzebene: 7 });
  return {
    ...g, iban: k && egStufe(k, "sepa") < 1 && egStufe(k, "organe_statuten") < 1 ? ibanMaskiert(g.iban) : g.iban,
    modellLabel: EG_MODELLE[g.modell]?.label || g.modell, modellKurz: EG_MODELLE[g.modell]?.kurz || g.modell, zonelevelLabel: ZONELEVEL[g.zonelevel]?.label || "", statusLabel: GEMEINSCHAFT_STATUS[g.status]?.label || g.status,
    netzbetreiberNamen: g.netzbetreiber.map((x) => nbName(db, x)), kennzahlen: z, netzentgelt: regel, tarifAktuell: tarifAm(E(db).tarife.filter((t) => t.gemeinschaftId === g.id), heute()),
  };
}
function mitgliedAusgabe(db, m, k) {
  const voll = egStufe(k, "stammdaten") >= 1 || egStufe(k, "sepa") >= 1;
  const basis = { id: m.id, gemeinschaftId: m.gemeinschaftId, kontoId: m.kontoId, mitgliedsnummer: m.mitgliedsnummer, art: m.art, artLabel: MITGLIED_ARTEN[m.art]?.label || m.art, name: mitgliedName(m), status: m.status, statusLabel: MITGLIED_STATUS[m.status]?.label || m.status, beitrittAm: m.beitrittAm, austrittZum: m.austrittZum, portalkonto: !!m.kontoId, demo: !!m.demo };
  if (!voll) return basis;
  return { ...m, ...basis, iban: egStufe(k, "sepa") >= 2 || egStufe(k, "stammdaten") >= 2 ? m.iban : ibanMaskiert(m.iban), steuerstatusLabel: STEUERSTATUS_ERZEUGER[m.steuerstatusErzeuger]?.label || "" };
}
const zpAusgabe = (db, z) => ({ ...z, netzbetreiberName: nbName(db, z.netzbetreiberId), richtungLabel: ZP_RICHTUNGEN[z.richtung]?.label || z.richtung });
const teilnahmeAusgabe = (t) => ({ ...t, statusLabel: TEILNAHME_STATUS[t.status]?.label || t.status, ton: TEILNAHME_STATUS[t.status]?.ton || "neutral" });
const organAusgabe = (db, o) => ({ ...o, funktionLabel: ORGAN_FUNKTIONEN[o.funktion]?.label || o.funktion, personName: o.kontoId ? nameVon(db, o.kontoId) || o.name : o.name, wirksam: organWirksam(o, heute()) });

// ================================================================ Lesen (für alle Pakete)

export async function egKontext(n, { gemeinschaftId = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesenBereit();
  const liste = E(db).gemeinschaften.filter((g) => !gemeinschaftId || g.id === gemeinschaftId).map((g) => {
    const k = kontext(db, n, g);
    return { id: g.id, name: g.name, modell: g.modell, status: g.status, rollen: k.rollen, rollenLabels: k.rollen.map((r) => EG_TEAMROLLEN[r].label), backofficeStufe: k.backofficeStufe, organ: istOrgan(k), rechte: egRechteVon(k) };
  });
  return { gemeinschaften: liste.filter((x) => x.rollen.length || x.backofficeStufe) };
}

export async function egGemeinschaften(n, { status = "", modell = "", q = "" } = {}) {
  if (!istAdmin(n) || !darfLesen(n, "eg")) throw verboten("Nur für das Backoffice (Bereich „Energiegemeinschaften“).");
  const db = await lesenBereit();
  const such = String(q || "").toLowerCase().trim();
  const liste = E(db).gemeinschaften
    .filter((g) => (!status || g.status === status) && (!modell || g.modell === modell) && (!such || `${g.name} ${g.kurzname} ${g.gemeinschaftsId} ${g.marktpartnerId}`.toLowerCase().includes(such)))
    .map((g) => {
      const a = gemeinschaftAusgabe(db, g, kontext(db, n, g));
      return { ...a, hinweise: gemeinschaftHinweise(g, E(db), { heute: heute() }) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const s = (f) => liste.reduce((x, g) => x + (g.kennzahlen[f] || 0), 0);
  return {
    gemeinschaften: liste, heute: heute(), darfSchreiben: darfSchreiben(n, "eg"),
    kennzahlen: { anzahl: liste.length, aktiv: liste.filter((g) => g.status === "aktiv").length, inGruendung: liste.filter((g) => !["aktiv", "aufnahmestopp", "aufgeloest", "umgewandelt", "in_aufloesung"].includes(g.status)).length, mitgliederAktiv: s("mitgliederAktiv"), zaehlpunkteAktiv: s("zaehlpunkteAktiv"), teilnahmenOffen: s("teilnahmenOffen"), erzeugungsleistungKw: Math.round(s("erzeugungsleistungKw") * 10) / 10, mitHinweisen: liste.filter((g) => g.hinweise.some((h) => h.stufe !== "info")).length },
  };
}

export async function egGemeinschaft(n, id) {
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, id, "mitgliederliste", 1);
  const x = E(db);
  const mitglieder = x.mitglieder.filter((m) => m.gemeinschaftId === g.id).sort((a, b) => a.mitgliedsnummer - b.mitgliedsnummer);
  const teilnahmen = x.teilnahmen.filter((t) => t.gemeinschaftId === g.id);
  const zpIds = new Set(teilnahmen.map((t) => t.zaehlpunktId));
  const sichtStamm = egStufe(k, "stammdaten") >= 1;
  return {
    gemeinschaft: gemeinschaftAusgabe(db, g, k),
    organe: x.organe.filter((o) => o.gemeinschaftId === g.id).map((o) => organAusgabe(db, o)),
    mitglieder: mitglieder.map((m) => mitgliedAusgabe(db, m, k)),
    zaehlpunkte: sichtStamm ? x.zaehlpunkte.filter((z) => zpIds.has(z.id)).map((z) => zpAusgabe(db, z)) : [],
    teilnahmen: sichtStamm ? teilnahmen.map(teilnahmeAusgabe) : [],
    anlagen: sichtStamm ? x.anlagen.filter((a) => a.gemeinschaftId === g.id) : [],
    tarife: x.tarife.filter((t) => t.gemeinschaftId === g.id).sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb)),
    verteilschluessel: x.verteilschluessel.filter((v) => v.gemeinschaftId === g.id),
    netzbetreiber: x.netzbetreiber,
    rollen: k.rollen, rechte: egRechteVon(k), backofficeStufe: k.backofficeStufe,
    hinweise: [...gemeinschaftHinweise(g, x, { heute: heute() }), ...organHinweise(g, x.organe, heute())],
    reiter: EG_ADMIN_REITER, heute: heute(),
  };
}

export async function egNetzbetreiber(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesenBereit();
  return { netzbetreiber: E(db).netzbetreiber, darfSchreiben: istAdmin(n) && darfSchreiben(n, "eg") };
}

export async function egNetzentgeltRegeln(n, { stichtag = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesenBereit();
  const r = E(db).netzentgeltRegeln;
  return { regeln: stichtag ? regelnAm(stichtag, r) : r, stichtag: stichtag || "" };
}

/** Organe-Sicht /portal/eg/[id]/verwaltung: Einstieg für Vorstand, Kassier, Schriftführung, Rechnungsprüfung */
export async function egVerwaltung(n, gemeinschaftId) {
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, "mitgliederliste", 1);
  if (!istOrgan(k) && !k.backofficeStufe) throw verboten("Die Verwaltung steht den Organen der Gemeinschaft zur Verfügung.");
  const x = E(db);
  const tn = x.teilnahmen.filter((t) => t.gemeinschaftId === g.id);
  const mitglieder = x.mitglieder.filter((m) => m.gemeinschaftId === g.id).sort((a, b) => a.mitgliedsnummer - b.mitgliedsnummer);
  const offen = [
    ...mitglieder.filter((m) => ["antrag", "geprueft"].includes(m.status)).map((m) => ({ art: "aufnahme", text: `Aufnahme entscheiden: ${mitgliedName(m)}`, mitgliedId: m.id, recht: "mitglied_aufnehmen" })),
    ...tn.filter((t) => t.status === "zustimmung_offen").map((t) => ({ art: "zustimmung", text: `Zustimmung im Netzbetreiber-Portal offen: ${mitgliedName(mitglieder.find((m) => m.id === t.mitgliedId))}${t.fristBis ? ` (bis ${t.fristBis.split("-").reverse().join(".")})` : ""}`, teilnahmeId: t.id, frist: t.fristBis, recht: "mitgliederliste" })),
    ...tn.filter((t) => t.status === "wartet_technik").map((t) => ({ art: "technik", text: `Wartet auf Smart Meter: ${mitgliedName(mitglieder.find((m) => m.id === t.mitgliedId))}`, teilnahmeId: t.id, recht: "mitgliederliste" })),
  ].filter((a) => egStufe(k, a.recht) >= 1);
  return {
    gemeinschaft: gemeinschaftAusgabe(db, g, k),
    organe: x.organe.filter((o) => o.gemeinschaftId === g.id).map((o) => organAusgabe(db, o)),
    mitglieder: mitglieder.map((m) => mitgliedAusgabe(db, m, k)),
    zaehlpunkte: egStufe(k, "stammdaten") >= 1 ? x.zaehlpunkte.filter((z) => tn.some((t) => t.zaehlpunktId === z.id)).map((z) => zpAusgabe(db, z)) : [],
    teilnahmen: egStufe(k, "stammdaten") >= 1 ? tn.map(teilnahmeAusgabe) : [],
    teilnahmenStatus: Object.fromEntries(Object.keys(TEILNAHME_STATUS).map((s) => [s, tn.filter((t) => t.status === s).length]).filter(([, v]) => v)),
    tarife: x.tarife.filter((t) => t.gemeinschaftId === g.id).sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb)),
    aufgaben: offen, hinweise: [...gemeinschaftHinweise(g, x, { heute: heute() }), ...organHinweise(g, x.organe, heute())],
    rollen: k.rollen, rollenLabels: k.rollen.map((r) => EG_TEAMROLLEN[r].label), rechte: egRechteVon(k), reiter: EG_ORGAN_REITER.filter((r) => egStufe(k, r.recht) >= 1), heute: heute(),
  };
}

// ================================================================ Schreiben

export async function egGemeinschaftSpeichern(n, { id = null, daten = {} } = {}) {
  if (!id && (!istAdmin(n) || !darfSchreiben(n, "eg"))) throw verboten("Neue Gemeinschaften legt das Backoffice an (Bereich „Energiegemeinschaften“ schreiben).");
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? zugriff(db, n, id, "organe_statuten", 2).g : null;
    const g = fach(() => gemeinschaftBereinigen(daten, { alt, netzbetreiberIds: x.netzbetreiber.map((y) => y.id) }));
    if (g.gemeinschaftsId && x.gemeinschaften.some((y) => y.id !== id && y.gemeinschaftsId === g.gemeinschaftsId)) throw konflikt("Diese Gemeinschafts-ID ist bereits einer anderen Gemeinschaft zugeordnet.");
    if (alt) {
      Object.assign(alt, g);
      geaendert(alt, n);
      protokoll(db, n, "eg_aendern", "eg_gemeinschaft", alt.id, `Gemeinschaft ${alt.name} geändert`);
      return gemeinschaftAusgabe(db, alt, kontext(db, n, alt));
    }
    const neu = { id: neueId("EGG"), ...g, vorgaengerId: null, nachfolgerId: null, organisatorOrgId: null, status: "interesse", ...meta(n) };
    x.gemeinschaften.push(neu);
    protokoll(db, n, "eg_anlegen", "eg_gemeinschaft", neu.id, `Gemeinschaft ${neu.name} angelegt (${EG_MODELLE[neu.modell].kurz})`);
    return gemeinschaftAusgabe(db, neu, kontext(db, n, neu));
  });
}

export async function egGemeinschaftStatus(n, id, { nach = "", grund = "", nachfolgerId = "" } = {}) {
  return aendernBereit((db) => {
    const { g, k } = zugriff(db, n, id, "organe_statuten", 2);
    if (["aktiv", "aufnahmestopp", "eda_bereit"].includes(nach) && !k.backofficeStufe && !k.rollen.includes("vorstand")) throw verboten("Diesen Statuswechsel führt der Vorstand bzw. das Backoffice aus.");
    const r = fach(() => gemeinschaftUebergang(g, nach, { grund }));
    if (nach === "umgewandelt") {
      const nf = gemeinschaftVon(db, nachfolgerId);
      if (!nf || nf.id === g.id) throw ungueltig("Bitte die Nachfolger-Gemeinschaft angeben (Umwandlung = neue Gemeinschafts-ID).");
      g.nachfolgerId = nf.id;
      nf.vorgaengerId = g.id;
    }
    const von = g.status;
    g.status = r.status;
    geaendert(g, n);
    protokoll(db, n, "eg_status", "eg_gemeinschaft", g.id, `Status ${GEMEINSCHAFT_STATUS[von]?.label || von} → ${GEMEINSCHAFT_STATUS[g.status].label}${grund ? ` (${String(grund).slice(0, 120)})` : ""}`);
    return gemeinschaftAusgabe(db, g, k);
  });
}

export async function egOrganSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? x.organe.find((o) => o.id === id) : null;
    if (id && !alt) throw nichtGefunden("Organ nicht gefunden.");
    const { g } = zugriff(db, n, alt?.gemeinschaftId || gemeinschaftId, "organe_statuten", 2);
    const o = fach(() => organBereinigen(daten));
    if (o.kontoId && !nutzerById(db, o.kontoId)) throw ungueltig("Konto nicht gefunden.");
    if (!o.kontoId && o.email) {
      const u = db.nutzer.find((y) => y.email === o.email);
      if (u) o.kontoId = u.id;
    }
    if (!o.kontoId && !o.name) throw ungueltig("Zu dieser E-Mail gibt es kein Portalkonto – bitte den Namen angeben.");
    if (alt) {
      Object.assign(alt, o);
      geaendert(alt, n);
      protokoll(db, n, "eg_organ", "eg_gemeinschaft", g.id, `Organ geändert: ${ORGAN_FUNKTIONEN[o.funktion].label} ${o.name || nameVon(db, o.kontoId)}`);
      return organAusgabe(db, alt);
    }
    const neu = { id: neueId("EGO"), gemeinschaftId: g.id, ...o, status: "aktiv", ...meta(n) };
    x.organe.push(neu);
    if (neu.kontoId) benachrichtigen(db, nutzerById(db, neu.kontoId), { art: "system", titel: `Funktion in „${g.name}“`, text: `Sie sind als ${ORGAN_FUNKTIONEN[neu.funktion].label} eingetragen. Die Verwaltung finden Sie im Portal.`, link: `/portal/eg/${g.id}/verwaltung`, objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: false });
    protokoll(db, n, "eg_organ", "eg_gemeinschaft", g.id, `Organ eingetragen: ${ORGAN_FUNKTIONEN[neu.funktion].label} ${neu.name || nameVon(db, neu.kontoId)}`);
    return organAusgabe(db, neu);
  });
}

export async function egOrganBeenden(n, id, { bis = "" } = {}) {
  return aendernBereit((db) => {
    const o = E(db).organe.find((y) => y.id === id);
    if (!o) throw nichtGefunden("Organ nicht gefunden.");
    zugriff(db, n, o.gemeinschaftId, "organe_statuten", 2);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(bis)) ? bis : heute();
    if (o.von && d < o.von) throw ungueltig("Das Ende liegt vor dem Beginn der Funktionsperiode.");
    Object.assign(o, { bis: d, status: d <= heute() ? "beendet" : "aktiv" });
    geaendert(o, n);
    protokoll(db, n, "eg_organ", "eg_gemeinschaft", o.gemeinschaftId, `Funktion beendet: ${ORGAN_FUNKTIONEN[o.funktion]?.label} zum ${d}`);
    return organAusgabe(db, o);
  });
}

function mitgliedAnlegenIntern(db, n, g, daten, status = "antrag") {
  const x = E(db);
  const m = fach(() => mitgliedBereinigen(daten, { gemeinschaft: g }));
  if (m.kontoId && !nutzerById(db, m.kontoId)) throw ungueltig("Konto nicht gefunden.");
  if (!m.kontoId && m.person.email) {
    const u = db.nutzer.find((y) => y.email === m.person.email);
    if (u) m.kontoId = u.id;
  }
  if (m.kontoId && x.mitglieder.some((y) => y.gemeinschaftId === g.id && y.kontoId === m.kontoId && !["ausgeschieden", "abgelehnt"].includes(y.status))) throw konflikt("Dieses Konto ist bereits Mitglied der Gemeinschaft.");
  const vertraege = (Array.isArray(daten.vertraege) ? daten.vertraege : []).slice(0, 30).map((v) => ({ art: String(v?.art || "").slice(0, 40), dokumentId: String(v?.dokumentId || "").slice(0, 60), version: String(v?.version || "").slice(0, 40), am: /^\d{4}-\d{2}-\d{2}/.test(String(v?.am || "")) ? String(v.am).slice(0, 10) : "" })).filter((v) => v.art);
  const wunsch = Number(daten.mitgliedsnummer);
  const frei = Number.isInteger(wunsch) && wunsch > 0 && wunsch < 1e7 && !x.mitglieder.some((y) => y.gemeinschaftId === g.id && Number(y.mitgliedsnummer) === wunsch); // Wechsel: alte Nummer behalten
  const neu = { id: neueId("EMG"), gemeinschaftId: g.id, mitgliedsnummer: frei ? wunsch : naechsteMitgliedsnummer(x.mitglieder, g.id), austrittZum: "", ...m, vertraege, status: MITGLIED_STATUS[daten.status] && ["antrag", "aufgenommen", "aktiv", "interessent"].includes(daten.status) ? daten.status : status, ...meta(n) };
  x.mitglieder.push(neu);
  return neu;
}

export async function egMitgliedSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? x.mitglieder.find((m) => m.id === id) : null;
    if (id && !alt) throw nichtGefunden("Mitglied nicht gefunden.");
    const { g, k } = zugriff(db, n, alt?.gemeinschaftId || gemeinschaftId, "stammdaten", 2);
    if (alt) {
      const m = fach(() => mitgliedBereinigen({ ...alt, ...daten, person: { ...alt.person, ...(daten.person || {}) } }, { gemeinschaft: g }));
      Object.assign(alt, m);
      geaendert(alt, n);
      protokoll(db, n, "eg_mitglied", "eg_gemeinschaft", g.id, `Mitglied ${alt.mitgliedsnummer} geändert`);
      return mitgliedAusgabe(db, alt, k);
    }
    const neu = mitgliedAnlegenIntern(db, n, g, daten);
    protokoll(db, n, "eg_mitglied", "eg_gemeinschaft", g.id, `Mitglied ${neu.mitgliedsnummer} angelegt`);
    return mitgliedAusgabe(db, neu, k);
  });
}

export async function egMitgliedStatus(n, id, { nach = "", grund = "", zum = "" } = {}) {
  return aendernBereit((db) => {
    const m = E(db).mitglieder.find((y) => y.id === id);
    if (!m) throw nichtGefunden("Mitglied nicht gefunden.");
    const recht = ["aufgenommen", "abgelehnt", "ausgeschlossen", "geprueft"].includes(nach) ? "mitglied_aufnehmen" : "stammdaten";
    const { g, k } = zugriff(db, n, m.gemeinschaftId, recht, 2);
    const r = fach(() => mitgliedUebergang(m, nach, { grund, zum }));
    const von = m.status;
    Object.assign(m, r);
    if (nach === "aufgenommen" && !m.beitrittAm) m.beitrittAm = heute();
    geaendert(m, n);
    if (m.kontoId) benachrichtigen(db, nutzerById(db, m.kontoId), { art: "system", titel: `Energiegemeinschaft „${g.name}“`, text: `Ihr Mitgliedsstatus: ${MITGLIED_STATUS[m.status].label}.`, link: "/portal/eg", objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: false });
    protokoll(db, n, "eg_mitglied_status", "eg_gemeinschaft", g.id, `Mitglied ${m.mitgliedsnummer}: ${MITGLIED_STATUS[von]?.label} → ${MITGLIED_STATUS[m.status].label}`);
    return mitgliedAusgabe(db, m, k);
  });
}

/** Zählpunkt anlegen bzw. ändern; eine bereits bekannte Zählpunktnummer wird wiederverwendet (ein Zählpunkt, bis zu 5 Teilnahmen) */
function zaehlpunktIntern(db, n, g, daten, id = null) {
  const x = E(db);
  const { zaehlpunkt: z, hinweise } = fach(() => zaehlpunktBereinigen(daten, { netzbetreiber: x.netzbetreiber }));
  const vorhanden = x.zaehlpunkte.find((y) => y.zaehlpunktnummer === z.zaehlpunktnummer && y.id !== id);
  if (vorhanden && id) throw konflikt("Diese Zählpunktnummer ist bereits erfasst.");
  if (vorhanden) {
    if (vorhanden.richtung !== z.richtung) throw konflikt(`Der Zählpunkt ist bereits als ${ZP_RICHTUNGEN[vorhanden.richtung].label} erfasst.`);
    return { z: vorhanden, hinweise: [...hinweise, "Zählpunkt war bereits erfasst (Mehrfachteilnahme) – vorhandene Stammdaten übernommen."], neu: false };
  }
  if (z.netzbetreiberId && g.netzbetreiber.length && !g.netzbetreiber.includes(z.netzbetreiberId)) hinweise.push("Der Zählpunkt liegt im Netz eines Netzbetreibers, der für diese Gemeinschaft nicht hinterlegt ist.");
  if (id) {
    const alt = x.zaehlpunkte.find((y) => y.id === id);
    if (!alt) throw nichtGefunden("Zählpunkt nicht gefunden.");
    Object.assign(alt, z);
    geaendert(alt, n);
    return { z: alt, hinweise, neu: false };
  }
  const neu = { id: neueId("EZP"), ...z, bezeichnung: String(daten.bezeichnung || "").slice(0, 80), ...meta(n) };
  x.zaehlpunkte.push(neu);
  return { z: neu, hinweise, neu: true };
}

export async function egZaehlpunktSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    let gid = gemeinschaftId;
    if (id) {
      const t = x.teilnahmen.find((y) => y.zaehlpunktId === id && (!gemeinschaftId || y.gemeinschaftId === gemeinschaftId));
      if (!t) throw nichtGefunden("Zählpunkt nicht gefunden.");
      gid = t.gemeinschaftId;
    }
    const { g } = zugriff(db, n, gid, "stammdaten", 2);
    const r = zaehlpunktIntern(db, n, g, daten, id);
    protokoll(db, n, "eg_zaehlpunkt", "eg_gemeinschaft", g.id, `Zählpunkt ${r.z.zaehlpunktnummer} ${id ? "geändert" : "erfasst"}`);
    return { zaehlpunkt: zpAusgabe(db, r.z), hinweise: r.hinweise };
  });
}

/** Teilnahme-Entwurf bzw. Änderung eines Entwurfs; Teilnahmefaktor aktiver Teilnahmen nur über EDA (edaTfAendern, WP2) */
function teilnahmeIntern(db, n, g, daten, id = null) {
  const x = E(db);
  const t = fach(() => teilnahmeBereinigen(daten, { gemeinschaft: g }));
  const z = x.zaehlpunkte.find((y) => y.id === t.zaehlpunktId);
  if (!z) throw ungueltig("Zählpunkt nicht gefunden.");
  const m = x.mitglieder.find((y) => y.id === t.mitgliedId && y.gemeinschaftId === g.id);
  if (!m) throw ungueltig("Mitglied gehört nicht zu dieser Gemeinschaft.");
  if (["ausgeschieden", "abgelehnt", "ausgeschlossen"].includes(m.status)) throw konflikt("Für dieses Mitglied sind keine neuen Teilnahmen möglich.");
  const alt = id ? x.teilnahmen.find((y) => y.id === id && y.gemeinschaftId === g.id) : null;
  if (id && !alt) throw nichtGefunden("Teilnahme nicht gefunden.");
  if (alt && alt.status !== "entwurf") throw konflikt("Nur Entwürfe sind änderbar – Teilnahmefaktor und Abmeldung laufen über die EDA-Prozesse.");
  const regel = teilnahmeRegeln(x.teilnahmen.filter((y) => y.zaehlpunktId === z.id), { id: alt?.id, gemeinschaftId: g.id, teilnahmefaktor: t.teilnahmefaktor }, { fremdTf: Number(daten.fremdTf) || 0, fremdAnzahl: Number(daten.fremdAnzahl) || 0 });
  if (!regel.ok) throw konflikt(regel.fehler);
  if (alt) {
    Object.assign(alt, t);
    geaendert(alt, n);
    return alt;
  }
  const neu = { id: neueId("ETN"), gemeinschaftId: g.id, ...t, gueltigAb: "", gueltigBis: "", tfHistorie: [], status: "entwurf", beendetGrund: "", responsecode: "", fristBis: "", verlauf: [{ am: jetzt(), von: "", nach: "entwurf", ereignis: "anlegen", prozessId: "", text: "", vonKonto: n?.system ? null : n?.id || null }], ...meta(n) };
  x.teilnahmen.push(neu);
  return neu;
}

export async function egTeilnahmeSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const t0 = id ? E(db).teilnahmen.find((y) => y.id === id) : null;
    const { g } = zugriff(db, n, t0?.gemeinschaftId || gemeinschaftId, "stammdaten", 2);
    const t = teilnahmeIntern(db, n, g, daten, id);
    protokoll(db, n, "eg_teilnahme", "eg_gemeinschaft", g.id, `Teilnahme ${t.id} ${id ? "geändert" : "angelegt"} (TF ${t.teilnahmefaktor} %)`);
    return teilnahmeAusgabe(t);
  });
}

/**
 * Teilnahme-Übergang (Zustandsautomat 3.8). Aufrufer: WP2 (EDA, Systemkonto bzw. Organisator) und dokumentierte Korrekturen
 * des Organisators (Pflicht: grund). Löst Ereignis „eg.teilnahme.geaendert“ aus (Benachrichtigung des Mitglieds).
 */
export async function egTeilnahmeUebergang(n, teilnahmeId, { ereignis = "", datum = "", consentId, teilnahmefaktor, responsecode, prozessId = "", grund = "" } = {}) {
  return aendernBereit((db) => {
    const t = E(db).teilnahmen.find((y) => y.id === teilnahmeId);
    if (!t) throw nichtGefunden("Teilnahme nicht gefunden.");
    const { g } = zugriff(db, n, t.gemeinschaftId, ereignis === "senden" || ereignis === "verwerfen" ? "stammdaten" : "eda_ausloesen", 2);
    if (!n?.system && !prozessId && !["senden", "verwerfen", "erneut"].includes(ereignis) && !String(grund || "").trim()) throw ungueltig("Manuelle Korrekturen ohne EDA-Prozess brauchen eine Begründung.");
    if (["tf_geaendert"].includes(ereignis)) {
      const regel = teilnahmeRegeln(E(db).teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), { id: t.id, gemeinschaftId: g.id, teilnahmefaktor });
      if (!regel.ok) throw konflikt(regel.fehler);
    }
    const neu = fach(() => teilnahmeUebergang(t, ereignis, { heute: heute(), datum, consentId, teilnahmefaktor, responsecode, prozessId, grund, von: n?.system ? null : n?.id || null, am: jetzt() }));
    Object.assign(t, neu);
    geaendert(t, n);
    const m = E(db).mitglieder.find((y) => y.id === t.mitgliedId);
    if (m?.kontoId && ["zustimmung_offen", "aktiv", "beendet", "abgelehnt", "abgelaufen"].includes(t.status)) {
      const texte = { zustimmung_offen: `Bitte stimmen Sie der Teilnahme im Portal Ihres Netzbetreibers zu${t.fristBis ? ` (bis ${t.fristBis.split("-").reverse().join(".")})` : ""}.`, aktiv: `Ihre Teilnahme ist aktiv${t.gueltigAb ? ` ab ${t.gueltigAb.split("-").reverse().join(".")}` : ""}.`, beendet: "Ihre Teilnahme ist beendet.", abgelehnt: "Der Netzbetreiber hat die Anmeldung abgelehnt – wir melden uns bei Ihnen.", abgelaufen: "Die Zustimmungsfrist ist abgelaufen – die Anmeldung kann erneut gestartet werden." };
      benachrichtigen(db, nutzerById(db, m.kontoId), { art: "system", titel: `Energiegemeinschaft „${g.name}“`, text: texte[t.status], link: "/portal/eg", objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: t.status === "zustimmung_offen" });
    }
    protokoll(db, n, "eg_teilnahme_status", "eg_gemeinschaft", g.id, `Teilnahme ${t.id}: ${TEILNAHME_STATUS[neu.verlauf.at(-1).von]?.label} → ${TEILNAHME_STATUS[t.status].label} (${ereignis}${prozessId ? `, ${prozessId}` : ""})`);
    return teilnahmeAusgabe(t);
  });
}

export async function egAnlageSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? x.anlagen.find((a) => a.id === id) : null;
    if (id && !alt) throw nichtGefunden("Anlage nicht gefunden.");
    const { g } = zugriff(db, n, alt?.gemeinschaftId || gemeinschaftId, "stammdaten", 2);
    const a = fach(() => anlageBereinigen(daten));
    if (a.eigentuemerMitgliedId && !x.mitglieder.some((m) => m.id === a.eigentuemerMitgliedId && m.gemeinschaftId === g.id)) throw ungueltig("Eigentümer muss Mitglied der Gemeinschaft sein.");
    if (alt) {
      Object.assign(alt, a);
      geaendert(alt, n);
    }
    const r = alt || { id: neueId("EAN"), gemeinschaftId: g.id, ...a, ...meta(n) };
    if (!alt) x.anlagen.push(r);
    if (daten.zaehlpunktId) {
      const z = x.zaehlpunkte.find((y) => y.id === daten.zaehlpunktId);
      if (z && x.teilnahmen.some((t) => t.zaehlpunktId === z.id && t.gemeinschaftId === g.id)) z.anlageId = r.id;
    }
    protokoll(db, n, "eg_anlage", "eg_gemeinschaft", g.id, `Anlage ${r.bezeichnung} ${alt ? "geändert" : "angelegt"}`);
    return r;
  });
}

export async function egTarifSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? x.tarife.find((t) => t.id === id) : null;
    if (id && !alt) throw nichtGefunden("Tarif nicht gefunden.");
    const gid = alt?.gemeinschaftId || gemeinschaftId;
    const t = fach(() => tarifBereinigen(daten));
    const { g, k } = zugriff(db, n, gid, "tarife", ["beschlossen", "aktiv"].includes(t.status) ? 2 : 1);
    if (["beschlossen", "aktiv"].includes(t.status) && !k.backofficeStufe && !k.rollen.includes("vorstand")) throw verboten("Tarife beschließt der Vorstand bzw. die Generalversammlung.");
    if (t.individuell.some((i) => !x.mitglieder.some((m) => m.id === i.mitgliedId && m.gemeinschaftId === gid))) throw ungueltig("Individuelle Preise nur für Mitglieder der Gemeinschaft.");
    let r;
    if (alt) {
      if (alt.status === "abgeloest") throw konflikt("Abgelöste Tarife sind unveränderlich – bitte einen neuen Tarif anlegen.");
      Object.assign(alt, t);
      geaendert(alt, n);
      r = alt;
    } else {
      r = { id: neueId("ETF"), gemeinschaftId: gid, ...t, ...meta(n) };
      x.tarife.push(r);
    }
    if (["beschlossen", "aktiv"].includes(r.status)) {
      const neuListe = tarifVersionieren(x.tarife.filter((y) => y.gemeinschaftId === gid), r);
      for (const y of neuListe) Object.assign(x.tarife.find((z) => z.id === y.id), y);
    }
    protokoll(db, n, "eg_tarif", "eg_gemeinschaft", g.id, `Tarif ${r.bezeichnung} ${alt ? "geändert" : "angelegt"} (${r.bezugspreisCt}/${r.einspeisepreisCt} ct, ab ${r.gueltigAb})`);
    return r;
  });
}

export async function egVerteilschluesselSpeichern(n, { gemeinschaftId = "", id = null, daten = {} } = {}) {
  return aendernBereit((db) => {
    const x = E(db);
    const alt = id ? x.verteilschluessel.find((v) => v.id === id) : null;
    if (id && !alt) throw nichtGefunden("Verteilschlüssel nicht gefunden.");
    const { g } = zugriff(db, n, alt?.gemeinschaftId || gemeinschaftId, "stammdaten", 2);
    if (g.verteilmodell !== "statisch") throw konflikt("Verteilschlüssel gibt es nur im statischen Modell.");
    const v = fach(() => verteilschluesselBereinigen(daten));
    const ids = new Set(x.teilnahmen.filter((t) => t.gemeinschaftId === g.id).map((t) => t.id));
    if (v.positionen.some((p) => !ids.has(p.teilnahmeId))) throw ungueltig("Positionen nur für Teilnahmen dieser Gemeinschaft.");
    if (alt && alt.status !== "entwurf") throw konflikt("Gesendete Verteilschlüssel sind unveränderlich – bitte einen neuen anlegen.");
    const r = alt ? Object.assign(alt, v) : { id: neueId("EVS"), gemeinschaftId: g.id, ...v, edaProzessId: "", status: "entwurf", ...meta(n) };
    if (!alt) x.verteilschluessel.push(r);
    else geaendert(r, n);
    protokoll(db, n, "eg_verteilschluessel", "eg_gemeinschaft", g.id, `Verteilschlüssel ab ${r.gueltigAb} (Σ ${r.summePct} %)`);
    return r;
  });
}

/** Status eines Verteilschlüssels (WP2: EC_PRT_CHANGE gesendet bzw. bestätigt). Nur entwurf → gesendet → gueltig (bzw. zurück zu entwurf bei Ablehnung). */
export async function egVerteilschluesselStatus(n, id, { status = "", edaProzessId = "" } = {}) {
  return aendernBereit((db) => {
    const v = E(db).verteilschluessel.find((x) => x.id === id);
    if (!v) throw nichtGefunden("Verteilschlüssel nicht gefunden.");
    const { g } = zugriff(db, n, v.gemeinschaftId, "eda_ausloesen", 2);
    const erlaubt = { entwurf: ["gesendet"], gesendet: ["gueltig", "entwurf"], gueltig: [] };
    if (!(erlaubt[v.status] || []).includes(status)) throw konflikt(`Wechsel von „${v.status}“ nach „${status}“ ist nicht vorgesehen.`);
    v.status = status;
    if (edaProzessId) v.edaProzessId = String(edaProzessId).slice(0, 40);
    geaendert(v, n);
    protokoll(db, n, "eg_verteilschluessel", "eg_gemeinschaft", g.id, `Verteilschlüssel ab ${v.gueltigAb}: ${status}`);
    return v;
  });
}

// ================================================================ Massenbearbeitung und CSV

const MASSEN = {
  mitglied_status: { recht: "mitglied_aufnehmen", text: "Mitgliedsstatus" },
  rechnungsweg: { recht: "stammdaten", text: "Rechnungsweg" },
  abrechnungsrhythmus: { recht: "stammdaten", text: "Abrechnungsrhythmus" },
  schutzbeduerftig: { recht: "stammdaten", text: "Schutzbedürftiger Haushalt" },
  zp_smartmeter: { recht: "stammdaten", text: "Smart Meter" },
  zp_netzebene: { recht: "stammdaten", text: "Netzebene" },
  tf_entwurf: { recht: "stammdaten", text: "Teilnahmefaktor (Entwürfe)" },
  anmeldung_vormerken: { recht: "stammdaten", text: "Entwürfe zur EDA-Anmeldung vormerken (WP2 übernimmt)" },
};
export const EG_MASSENAKTIONEN = Object.keys(MASSEN);

export async function egMassenaktion(n, gemeinschaftId, { aktion = "", ids = [], werte = {} } = {}) {
  const def = MASSEN[aktion];
  if (!def) throw ungueltig("Unbekannte Massenaktion.");
  const liste = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 2000);
  if (!liste.length) throw ungueltig("Bitte mindestens einen Eintrag auswählen.");
  return aendernBereit((db) => {
    const { g } = zugriff(db, n, gemeinschaftId, def.recht, 2);
    const x = E(db);
    const fehler = [];
    let anzahl = 0;
    for (const id of liste) {
      try {
        if (["mitglied_status", "rechnungsweg", "abrechnungsrhythmus", "schutzbeduerftig"].includes(aktion)) {
          const m = x.mitglieder.find((y) => y.id === id && y.gemeinschaftId === g.id);
          if (!m) throw ungueltig("nicht gefunden");
          if (aktion === "mitglied_status") Object.assign(m, fach(() => mitgliedUebergang(m, werte.nach, { grund: werte.grund, zum: werte.zum })));
          if (aktion === "rechnungsweg") { if (!RECHNUNGSWEGE[werte.wert]) throw ungueltig("Rechnungsweg ungültig"); m.rechnungsweg = werte.wert; }
          if (aktion === "abrechnungsrhythmus") { if (werte.wert && !ABRECHNUNGSRHYTHMEN[werte.wert]) throw ungueltig("Rhythmus ungültig"); m.abrechnungsrhythmus = werte.wert || ""; }
          if (aktion === "schutzbeduerftig") m.schutzbeduerftig = werte.wert === true;
          geaendert(m, n);
        } else if (["zp_smartmeter", "zp_netzebene"].includes(aktion)) {
          const z = x.zaehlpunkte.find((y) => y.id === id && x.teilnahmen.some((t) => t.zaehlpunktId === y.id && t.gemeinschaftId === g.id));
          if (!z) throw ungueltig("nicht gefunden");
          if (aktion === "zp_smartmeter") { if (!SMART_METER[werte.wert]) throw ungueltig("Wert ungültig"); z.smartMeter = werte.wert; }
          if (aktion === "zp_netzebene") { if (!NETZEBENEN[Number(werte.wert)]) throw ungueltig("Netzebene ungültig"); z.netzebene = Number(werte.wert); }
          geaendert(z, n);
        } else {
          const t = x.teilnahmen.find((y) => y.id === id && y.gemeinschaftId === g.id);
          if (!t) throw ungueltig("nicht gefunden");
          if (t.status !== "entwurf") throw konflikt("nur Entwürfe");
          if (aktion === "tf_entwurf") {
            const r = teilnahmeRegeln(x.teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), { id: t.id, gemeinschaftId: g.id, teilnahmefaktor: Number(werte.teilnahmefaktor) });
            if (!Number.isInteger(Number(werte.teilnahmefaktor)) || Number(werte.teilnahmefaktor) < 1 || Number(werte.teilnahmefaktor) > 100) throw ungueltig("TF 1–100");
            if (!r.ok) throw konflikt(r.fehler);
            t.teilnahmefaktor = Number(werte.teilnahmefaktor);
          } else t.anmeldungVorgemerkt = werte.wert !== false;
          geaendert(t, n);
        }
        anzahl++;
      } catch (e) {
        fehler.push({ id, fehler: e.message });
      }
    }
    protokoll(db, n, "eg_massenaktion", "eg_gemeinschaft", g.id, `Massenaktion ${def.text}: ${anzahl} geändert, ${fehler.length} Fehler`);
    return { geaendert: anzahl, fehler };
  });
}

/** CSV-Vorlage (Spalten) für den Import von Mitgliedern mit Zählpunkten */
export const EG_CSV_SPALTEN = ["mitgliedsnummer", "art", "vorname", "nachname", "firma", "strasse", "plz", "ort", "email", "iban", "sepa_referenz", "sepa_datum", "steuerstatus", "uid", "zaehlpunkt", "richtung", "teilnahmefaktor", "kwp"];

/**
 * CSV-Import (Mitglieder + Zählpunkte + Teilnahme-Entwürfe) mit Vorschau. `ausfuehren: false` → nur Vorschau.
 * Abgleich vorhandener Mitglieder über Mitgliedsnummer oder E-Mail; Zählpunkte werden wiederverwendet.
 */
export async function egCsvImport(n, gemeinschaftId, { art = "mitglieder", csv = "", ausfuehren = false } = {}) {
  if (art !== "mitglieder") throw ungueltig("Import-Art: mitglieder (Mitglieder mit Zählpunkten).");
  if (String(csv || "").length > 2_000_000) throw ungueltig("Die Datei ist zu groß (max. 2 MB).");
  const lauf = async (db) => {
    const { g } = zugriff(db, n, gemeinschaftId, "stammdaten", ausfuehren ? 2 : 1);
    const x = E(db);
    const { kopf, zeilen } = csvLesen(csv);
    if (!kopf.length) throw ungueltig("Die Datei ist leer.");
    const fehlend = ["art", "nachname"].filter((k) => !kopf.includes(k)) ;
    if (fehlend.length && !kopf.includes("firma")) throw ungueltig(`Pflichtspalten fehlen: ${fehlend.join(", ")} (Vorlage: ${EG_CSV_SPALTEN.join(";")}).`);
    const vorschau = [];
    let angelegt = 0;
    let geaendertN = 0;
    const artMap = { privat: "privat", landwirt: "landwirt", kmu: "kmu", unternehmen: "kmu", gemeinde: "gemeinde", verein: "verein", oeffentlich: "oeffentlich", grossunternehmen: "grossunternehmen" };
    for (const [i, r] of zeilen.entries()) {
      const zeile = i + 2;
      try {
        const daten = {
          art: artMap[String(r.art || "").toLowerCase()] || "", person: { vorname: r.vorname, nachname: r.nachname, firma: r.firma, strasse: r.strasse, plz: r.plz, ort: r.ort, email: r.email },
          iban: r.iban, steuerstatusErzeuger: r.steuerstatus || undefined, uid: r.uid, sepaMandat: r.sepa_referenz ? { referenz: r.sepa_referenz, datum: /^\d{2}\.\d{2}\.\d{4}$/.test(r.sepa_datum || "") ? r.sepa_datum.split(".").reverse().join("-") : r.sepa_datum, status: "aktiv" } : undefined,
        };
        const vorh = x.mitglieder.find((m) => m.gemeinschaftId === g.id && ((r.mitgliedsnummer && String(m.mitgliedsnummer) === String(r.mitgliedsnummer)) || (r.email && m.person?.email === String(r.email).toLowerCase())));
        const m = fach(() => mitgliedBereinigen(vorh ? { ...vorh, ...Object.fromEntries(Object.entries(daten).filter(([, v]) => v !== undefined && v !== "")), person: { ...vorh.person, ...Object.fromEntries(Object.entries(daten.person).filter(([, v]) => v)) } } : daten, { gemeinschaft: g }));
        let zp = null;
        if (r.zaehlpunkt) {
          zp = fach(() => zaehlpunktBereinigen({ zaehlpunktnummer: r.zaehlpunkt, richtung: { verbrauch: "verbrauch", bezug: "verbrauch", erzeugung: "erzeugung", einspeisung: "erzeugung" }[String(r.richtung || "verbrauch").toLowerCase()] || "" }, { netzbetreiber: x.netzbetreiber }));
        }
        const eintrag = { zeile, aktion: vorh ? "aktualisieren" : "neu", name: mitgliedName(m), zaehlpunkt: zp?.zaehlpunkt.zaehlpunktnummer || "", hinweise: zp?.hinweise || [], fehler: "" };
        if (ausfuehren) {
          let mg = vorh;
          if (vorh) { Object.assign(vorh, m); geaendert(vorh, n); geaendertN++; }
          else { mg = mitgliedAnlegenIntern(db, n, g, { ...daten, mitgliedsnummer: r.mitgliedsnummer, status: "aufgenommen" }, "aufgenommen"); angelegt++; }
          if (zp) {
            const zr = zaehlpunktIntern(db, n, g, zp.zaehlpunkt);
            if (r.kwp && zr.z.richtung === "erzeugung" && !zr.z.anlageId) {
              const a = { id: neueId("EAN"), gemeinschaftId: g.id, ...fach(() => anlageBereinigen({ bezeichnung: `PV ${mitgliedName(mg)}`, art: "pv", kwp: r.kwp, eigentuemerMitgliedId: mg.id, haushalt: mg.art === "privat" })), ...meta(n) };
              x.anlagen.push(a);
              zr.z.anlageId = a.id;
            }
            if (!x.teilnahmen.some((t) => t.zaehlpunktId === zr.z.id && t.gemeinschaftId === g.id && !["beendet", "abgelehnt", "abgelaufen", "verworfen"].includes(t.status))) teilnahmeIntern(db, n, g, { zaehlpunktId: zr.z.id, mitgliedId: mg.id, teilnahmefaktor: r.teilnahmefaktor || 100 });
          }
        }
        vorschau.push(eintrag);
      } catch (e) {
        vorschau.push({ zeile, aktion: "fehler", name: [r.vorname, r.nachname, r.firma].filter(Boolean).join(" "), zaehlpunkt: r.zaehlpunkt || "", hinweise: [], fehler: e.message });
      }
    }
    if (ausfuehren) protokoll(db, n, "eg_import", "eg_gemeinschaft", g.id, `CSV-Import: ${angelegt} neu, ${geaendertN} aktualisiert, ${vorschau.filter((v) => v.aktion === "fehler").length} Fehler`);
    return { vorschau, fehler: vorschau.filter((v) => v.aktion === "fehler"), angelegt, geaendert: geaendertN, spalten: EG_CSV_SPALTEN, ausgefuehrt: !!ausfuehren };
  };
  if (!ausfuehren) return lauf(structuredClone(await lesenBereit()));
  return aendernBereit(async (db) => {
    const probe = await lauf(structuredClone(db)); // Vorprüfung ohne Wirkung
    if (probe.fehler.length) throw konflikt(`Import abgebrochen: ${probe.fehler.length} fehlerhafte Zeile(n) – bitte zuerst die Vorschau prüfen.`);
    return lauf(db);
  });
}

export async function egCsvExport(n, gemeinschaftId, { art = "mitglieder" } = {}) {
  return aendernBereit((db) => csvExportIntern(db, n, gemeinschaftId, art));
}
function csvExportIntern(db, n, gemeinschaftId, art) {
  const { g, k } = zugriff(db, n, gemeinschaftId, "mitgliederliste", 1);
  const x = E(db);
  const zeilen = [];
  const voll = egStufe(k, "stammdaten") >= 1;
  for (const m of x.mitglieder.filter((y) => y.gemeinschaftId === g.id).sort((a, b) => a.mitgliedsnummer - b.mitgliedsnummer)) {
    const tn = x.teilnahmen.filter((t) => t.mitgliedId === m.id);
    const basis = [m.mitgliedsnummer, m.art, m.person.vorname, m.person.nachname, m.person.firma, voll ? m.person.strasse : "", voll ? m.person.plz : "", voll ? m.person.ort : "", voll ? m.person.email : "", voll ? ibanMaskiert(m.iban) : "", voll ? m.sepaMandat?.referenz : "", voll ? m.sepaMandat?.datum : "", m.steuerstatusErzeuger, voll ? m.uid : ""];
    if (art === "mitglieder" || !tn.length || !voll) zeilen.push([...basis, "", "", "", "", MITGLIED_STATUS[m.status]?.label]);
    if (art !== "mitglieder" && voll) for (const t of tn) {
      const z = x.zaehlpunkte.find((y) => y.id === t.zaehlpunktId);
      const an = z?.anlageId ? x.anlagen.find((a) => a.id === z.anlageId) : null;
      zeilen.push([...basis, z?.zaehlpunktnummer || "", z?.richtung || "", t.teilnahmefaktor, an?.kwp ?? "", TEILNAHME_STATUS[t.status]?.label]);
    }
  }
  const kopf = [...EG_CSV_SPALTEN, "status"];
  const text = "﻿" + [kopf.join(";"), ...zeilen.map((z) => z.map(csvWert).join(";"))].join("\r\n") + "\r\n";
  protokoll(db, n, "export", "eg_gemeinschaft", g.id, `CSV-Export ${art}`);
  return { dateiname: `${(g.kurzname || g.name).replace(/\W+/g, "-").toLowerCase()}-${art}-${heute()}.csv`, csv: text };
}

// ================================================================ Migration aus dem Prototyp

function migrationLauf(db) {
  const alt = db.mitglied || { gemeinschaften: [], teilnahmen: [] };
  return migrationAusPrototyp({ gemeinschaften: alt.gemeinschaften || [], teilnahmen: alt.teilnahmen || [] }, {
    neueId, heute: heute(), vorhanden: E(db), netzbetreiber: E(db).netzbetreiber,
    namen: (id) => {
      const u = nutzerById(db, id);
      return u ? { vorname: u.vorname || "", nachname: u.nachname || "", email: u.email || "" } : null;
    },
  });
}

export async function egMigrationVorschau(n) {
  if (!istAdmin(n) || !darfSchreiben(n, "eg")) throw verboten("Die Migration startet das Backoffice (Bereich „Energiegemeinschaften“ schreiben).");
  const db = await lesenBereit();
  const r = migrationLauf(structuredClone(db));
  return { anzahl: { gemeinschaften: r.gemeinschaften.length, mitglieder: r.mitglieder.length, zaehlpunkte: r.zaehlpunkte.length, teilnahmen: r.teilnahmen.length, anlagen: r.anlagen.length, tarife: r.tarife.length }, gemeinschaften: r.gemeinschaften.map((g) => ({ name: g.name, modell: g.modell, zonelevel: g.zonelevel, status: g.status, migriertAus: g.migriertAus })), warnungen: r.warnungen, uebersprungen: r.uebersprungen, letzteMigration: E(db).migration };
}

export async function egMigrationAusfuehren(n) {
  if (!istAdmin(n) || !darfSchreiben(n, "eg")) throw verboten("Die Migration startet das Backoffice (Bereich „Energiegemeinschaften“ schreiben).");
  return aendernBereit((db) => {
    const r = migrationLauf(db);
    const x = E(db);
    for (const k of ["gemeinschaften", "mitglieder", "anlagen", "tarife", "teilnahmen"]) x[k].push(...r[k]);
    for (const z of r.zaehlpunkte) {
      const vorh = x.zaehlpunkte.find((y) => y.zaehlpunktnummer === z.zaehlpunktnummer);
      if (vorh) for (const t of r.teilnahmen.filter((t2) => t2.zaehlpunktId === z.id)) Object.assign(x.teilnahmen.find((t3) => t3.id === t.id), { zaehlpunktId: vorh.id });
      else x.zaehlpunkte.push(z);
    }
    x.migration = { am: jetzt(), von: n?.id || null, anzahl: r.gemeinschaften.length, warnungen: r.warnungen.length };
    protokoll(db, n, "eg_migration", "eg_gemeinschaft", r.gemeinschaften[0]?.id || "", `Migration Prototyp: ${r.gemeinschaften.length} Gemeinschaft(en), ${r.mitglieder.length} Mitglieder, ${r.teilnahmen.length} Teilnahmen`);
    return { anzahl: { gemeinschaften: r.gemeinschaften.length, mitglieder: r.mitglieder.length, zaehlpunkte: r.zaehlpunkte.length, teilnahmen: r.teilnahmen.length }, warnungen: r.warnungen, uebersprungen: r.uebersprungen };
  });
}

// ================================================================ Intern für andere Pakete (nur Demo-Backend, gleiche Rechte)

/** Für WP2–WP6 im Demo-Backend: Datenbestand bereitstellen und Kontext prüfen, ohne eigene Kopien des Schemas */
export const egIntern = { lesenBereit, aendernBereit, zugriff, kontext, gemeinschaftVon, heute, E };
