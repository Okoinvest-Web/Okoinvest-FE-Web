// src/lib/plattform/backend/demo/mitglied.js
//
// Mitgliederbereich (Genossenschaft, Generalversammlung, Ausschüttungen, Energiegemeinschaft) im Demo-Backend –
// Referenz für plattform/api/mitglied.py (Vertrag: docs/API.md, Abschnitt „Mitglied & Genossenschaft“).
// Regeln: src/lib/plattform/mitglied/{genossenschaft,versammlung,gemeinschaft}.js (Frappe: plattform/mitglied_kern.py).
//
// Rechte: Portal nur Rolle mitglied (eigene Mitgliedschaft/Teilnahme; Versammlungen der eigenen Genossenschaft),
// Backoffice Bereich „genossenschaft“ (rechte.js: lesen ≥ 1, schreiben = 2). Fremd → 403 bzw. 404.
// Einzelstimmen sind nur für die Auszählung gespeichert – ausgegeben werden nur Summen und die Teilnahme.
// Daten unter db.mitglied (eigene Sammlung, beim ersten Zugriff mit fiktiven Demo-Daten ergänzt).

import { PlattformFehler, nichtGefunden, ungueltig, verboten, konflikt } from "../../fehler";
import { darfLesen, darfSchreiben } from "../../rechte";
import * as G from "../../mitglied/genossenschaft";
import * as V from "../../mitglied/versammlung";
import * as E from "../../mitglied/gemeinschaft";
import { MitgliedFehler, ibanMaskiert } from "../../mitglied/basis";
import { egTeilnahmeBereinigen } from "../../fach/energie";
import { anfrageAnlegen, intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";

const SCHEMA = 1;
const BEREICH = "genossenschaft";
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const jetztLokal = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Vienna" }).slice(0, 16).replace(" ", "T");
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const protokoll = (...a) => intern.protokoll(...a);
const nutzerById = (db, id) => (id ? db.nutzer.find((u) => u.id === id) || null : null);
const nameVon = (u) => (u ? [u.vorname, u.nachname].filter(Boolean).join(" ") || u.email : "");

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function mitgliedRolle(n) {
  angemeldet(n);
  if (!istAdmin(n) && !n.rollen?.includes("mitglied")) throw verboten("Der Mitgliederbereich steht Mitgliedern zur Verfügung.");
}
function boLesen(n) {
  angemeldet(n);
  if (!istAdmin(n) || !darfLesen(n, BEREICH)) throw verboten("Nur für das Backoffice.");
}
function boSchreiben(n) {
  angemeldet(n);
  if (!istAdmin(n) || !darfSchreiben(n, BEREICH)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Genossenschaft & Energiegemeinschaften“ kein Schreiben." : "Nur für das Backoffice.");
}
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof MitgliedFehler || (e?.status === 422 && !(e instanceof PlattformFehler))) throw new PlattformFehler(e.status || 422, e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

const leer = () => ({ v: SCHEMA, genos: [], mitglieder: [], versammlungen: [], stimmen: [], ausschuettungen: [], uebertragungen: [], gemeinschaften: [], teilnahmen: [], abrechnungen: [], laeufe: [] });

let vorbereitet = false;
async function lesenBereit() {
  if (!vorbereitet) {
    await import("./fach").then((m) => m.fachBereit()).catch(() => null); // Teilnahmedaten Energiegemeinschaft (db.fach.eg)
    vorbereitet = true;
  }
  const db = await lesen();
  if (db.mitglied?.v === SCHEMA) return db;
  await aendern((d) => {
    if (d.mitglied?.v === SCHEMA) return;
    d.mitglied = leer();
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Mitglied-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
/** Demo-Daten einmalig ergänzen (auch vom Gemeindecockpit für die Beteiligungsangebote genutzt) */
export async function mitgliedBereit() {
  await lesenBereit();
}
const M = (db) => db.mitglied;

function verlauf(o, n, textInhalt, oeffentlich = true) {
  o.verlauf = o.verlauf || [];
  o.verlauf.push({ am: jetzt(), vonId: n?.id || null, text: String(textInhalt).slice(0, 300), oeffentlich });
  if (o.verlauf.length > 200) o.verlauf.splice(0, o.verlauf.length - 200);
}
function melden(db, nutzerId, titel, textInhalt, link, objektId) {
  const u = nutzerById(db, nutzerId);
  if (u) benachrichtigen(db, u, { art: "status", titel, text: textInhalt, link, objektArt: "mitglied", objektId }, { mailBetreff: `${titel} – ÖkoInvest`, mailText: `${textInhalt} Details finden Sie im Portal.` });
}
function backofficeMelden(db, titel, textInhalt, link, objektId) {
  for (const u of db.nutzer.filter((x) => x.aktiv && x.rollen.includes("admin") && darfSchreiben(x, BEREICH)).slice(0, 5)) {
    benachrichtigen(db, u, { art: "anfrage", titel, text: textInhalt, link, objektArt: "mitglied", objektId }, { mail: true });
  }
}

// ================================================================ Ausgaben

const genoLaden = (db, id) => {
  const g = M(db).genos.find((x) => x.id === id);
  if (!g) throw nichtGefunden("Genossenschaft nicht gefunden.");
  return g;
};
const mitgliedLaden = (db, id) => {
  const m = M(db).mitglieder.find((x) => x.id === id);
  if (!m) throw nichtGefunden("Mitgliedschaft nicht gefunden.");
  return m;
};
const eigeneMitgliedschaft = (db, n, genoId) => M(db).mitglieder.find((x) => x.genoId === genoId && x.nutzerId === n.id && !["abgelehnt", "zurueckgezogen"].includes(x.status)) || null;

function genoAusgabe(g) {
  return { ...g, registerLabel: G.GENO_REGISTER[g.registerStatus]?.label || g.registerStatus, registerName: G.REGISTER_NAME[g.land], verbandName: G.VERBAND_NAME[g.land], hinweise: G.beitrittHinweise(g), einladungsfrist: G.einladungsfrist(g) };
}

function mitgliedAusgabe(db, m, { admin = false } = {}) {
  const g = genoLaden(db, m.genoId);
  const u = nutzerById(db, m.nutzerId);
  const ueb = M(db).uebertragungen.filter((x) => x.vonId === m.id || x.anId === m.id).map((x) => ({
    ...x,
    richtung: x.vonId === m.id ? "aus" : "ein",
    gegenName: (() => {
      const o = M(db).mitglieder.find((y) => y.id === (x.vonId === m.id ? x.anId : x.vonId));
      return o ? (admin ? o.beitritt?.firma || `${o.beitritt?.vorname || ""} ${o.beitritt?.nachname || ""}`.trim() : `Mitglied ${o.nr || ""}`.trim()) : x.anEmail || "";
    })(),
  }));
  const beitritt = m.beitritt ? { ...m.beitritt, iban: admin ? m.beitritt.iban : ibanMaskiert(m.beitritt.iban), ipHash: undefined } : null;
  return {
    id: m.id, genoId: m.genoId, genoName: g.name, nutzerId: m.nutzerId, nr: m.nr || "", status: m.status, statusLabel: G.MITGLIED_STATUS[m.status]?.label || m.status, anteile: m.anteile,
    erklaertAm: m.erklaertAm, zugelassenAm: m.zugelassenAm || null, aktivSeit: m.aktivSeit || null, ausgeschiedenAm: m.ausgeschiedenAm || null, einzahlungFrist: m.einzahlungFrist || null, vorgangId: m.vorgangId || null,
    kennzahlen: G.mitgliedKennzahlen(m, g), verwendungszweck: G.verwendungszweck(m), beitritt,
    einzahlungen: m.einzahlungen || [], zeichnungen: m.zeichnungen || [], kuendigungen: m.kuendigungen || [], uebertragungen: ueb,
    verlauf: (m.verlauf || []).filter((x) => admin || x.oeffentlich !== false),
    ...(admin ? { name: m.beitritt?.firma || `${m.beitritt?.vorname || ""} ${m.beitritt?.nachname || ""}`.trim() || nameVon(u), email: u?.email || "", ablehnungsgrund: m.ablehnungsgrund || "" } : {}),
  };
}

function gvAusgabe(db, gv, n, { admin = false, mitglied = null } = {}) {
  const stimmen = M(db).stimmen.filter((s) => s.gvId === gv.id);
  const berechtigt = M(db).mitglieder.filter((m) => m.genoId === gv.genoId && G.MITGLIED_AKTIV.includes(m.status));
  const eigene = mitglied ? stimmen.find((s) => s.mitgliedId === mitglied.id) : null;
  const x = {
    id: gv.id, genoId: gv.genoId, titel: gv.titel, art: gv.art, form: gv.form, datum: gv.datum, ort: gv.ort, abstimmungBis: gv.abstimmungBis, einleitung: gv.einleitung || "",
    tagesordnung: gv.tagesordnung, unterlagen: gv.unterlagen, status: gv.status, statusLabel: V.GV_STATUS[gv.status]?.label || gv.status,
    eingeladenAm: gv.eingeladenAm || null, abgeschlossenAm: gv.abgeschlossenAm || null,
    zugang: gv.status !== "entwurf" ? gv.zugang || "" : "",
    ergebnis: gv.status === "abgeschlossen" ? gv.ergebnis : null, protokoll: gv.status === "abgeschlossen" ? gv.protokoll : null,
    abstimmungOffen: V.abstimmungOffen(gv, jetztLokal()),
    eigeneStimme: eigene ? { am: eigene.am, stimmen: eigene.stimmen } : null,
    darfAbstimmen: !!mitglied && G.MITGLIED_AKTIV.includes(mitglied.status) && !eigene && V.abstimmungOffen(gv, jetztLokal()),
    stimmberechtigt: berechtigt.length, abgegeben: stimmen.length,
  };
  if (admin) {
    x.teilnahme = berechtigt.map((m) => ({ mitgliedId: m.id, nr: m.nr, name: m.beitritt?.firma || `${m.beitritt?.vorname || ""} ${m.beitritt?.nachname || ""}`.trim(), abgestimmt: stimmen.some((s) => s.mitgliedId === m.id) }));
    if (gv.status === "abstimmung") x.zwischenstand = V.ergebnisRechnen(gv, stimmen, berechtigt.length);
  }
  return x;
}

function ausschuettungFuer(db, a, mitgliedIds) {
  const pos = a.positionen.filter((p) => mitgliedIds.includes(p.mitgliedId));
  return { id: a.id, genoId: a.genoId, art: a.art, artLabel: G.AUSSCHUETTUNG_ARTEN[a.art], geschaeftsjahr: a.geschaeftsjahr, satzPct: a.satzPct, ctProKwh: a.ctProKwh, stichtag: a.stichtag, status: a.status, beschlussDatum: a.beschlussDatum || null, ausgezahltAm: a.ausgezahltAm || null, positionen: pos };
}

function egStammVon(db, nutzerId) {
  return (db.fach?.eg || []).find((x) => x.nutzerId === nutzerId) || null;
}
function teilnahmeAusgabe(db, t, { admin = false } = {}) {
  const eg = M(db).gemeinschaften.find((x) => x.id === t.egId);
  const u = nutzerById(db, t.nutzerId);
  return {
    id: t.id, egId: t.egId, egName: eg?.name || "", nutzerId: t.nutzerId, status: t.status, statusLabel: E.TEILNAHME_STATUS[t.status]?.label || t.status, anteilPct: t.anteilPct ?? null,
    beantragtAm: t.beantragtAm, angemeldetAm: t.angemeldetAm || null, ab: t.ab || null, bis: t.bis || null, grund: t.grund || "",
    stamm: t.stamm ? { land: t.stamm.land, form: t.stamm.form, rolle: t.stamm.rolle, zaehlpunkt: t.stamm.zaehlpunkt, maloId: t.stamm.maloId, zaehlpunktEinspeisung: t.stamm.zaehlpunktEinspeisung, plz: t.stamm.plz, jahresverbrauchKwh: t.stamm.jahresverbrauchKwh, anlageKwp: t.stamm.anlageKwp } : null,
    verlauf: (t.verlauf || []).filter((x) => admin || x.oeffentlich !== false),
    ...(admin ? { name: t.name || nameVon(u), email: u?.email || "" } : {}),
  };
}
function egAusgabe(db, eg, { admin = false } = {}) {
  const rab = E.rabattFuer(eg.land, eg.form);
  const aktiv = M(db).teilnahmen.filter((t) => t.egId === eg.id && t.status === "aktiv");
  return {
    ...eg, statusLabel: E.GEMEINSCHAFT_STATUS[eg.status]?.label || eg.status, formLabel: E.EG_FORMEN[eg.land]?.[eg.form] || eg.form, rabatt: rab, waehrung: E.waehrung(eg.land), schluesselText: E.VERTEILSCHLUESSEL[eg.verteilschluessel]?.text || "",
    teilnehmerAktiv: aktiv.length,
    ...(admin ? { teilnehmer: M(db).teilnahmen.filter((t) => t.egId === eg.id).map((t) => teilnahmeAusgabe(db, t, { admin: true })), laeufe: M(db).laeufe.filter((l) => l.egId === eg.id).sort((a, b) => b.monat.localeCompare(a.monat)) } : {}),
  };
}

// ================================================================ Portal: Übersicht

/** Mitgliederbereich: Genossenschaften, eigene Mitgliedschaften, Versammlungen, Ausschüttungen, Energiegemeinschaft */
export async function mgUebersicht(n) {
  mitgliedRolle(n);
  const db = await lesenBereit();
  const x = M(db);
  const eigene = x.mitglieder.filter((m) => m.nutzerId === n.id);
  const ids = eigene.map((m) => m.id);
  const genoIds = eigene.filter((m) => !["abgelehnt", "zurueckgezogen"].includes(m.status)).map((m) => m.genoId);
  const eingehend = x.uebertragungen.filter((u) => u.anNutzerId === n.id && u.status === "angefragt").map((u) => {
    const von = x.mitglieder.find((m) => m.id === u.vonId);
    return { id: u.id, anteile: u.anteile, betragEur: u.betragEur, am: u.am, genoName: genoLaden(db, u.genoId).name, vonNr: von?.nr || "" };
  });
  const stamm = egStammVon(db, n.id);
  return {
    heute: heute(),
    genos: x.genos.map(genoAusgabe),
    mitgliedschaften: eigene.map((m) => mitgliedAusgabe(db, m)),
    eingehend,
    versammlungen: x.versammlungen
      .filter((v) => genoIds.includes(v.genoId) && v.status !== "entwurf")
      .sort((a, b) => b.datum.localeCompare(a.datum))
      .map((v) => gvAusgabe(db, v, n, { mitglied: eigene.find((m) => m.genoId === v.genoId) })),
    ausschuettungen: x.ausschuettungen.filter((a) => a.status !== "entwurf" && a.positionen.some((p) => ids.includes(p.mitgliedId))).map((a) => ausschuettungFuer(db, a, ids)),
    eg: {
      stamm: stamm ? { ...stamm } : null,
      gemeinschaften: x.gemeinschaften.filter((g) => g.status !== "geschlossen" || x.teilnahmen.some((t) => t.egId === g.id && t.nutzerId === n.id)).map((g) => ({ ...egAusgabe(db, g), hindernisse: E.teilnahmeHindernisse(stamm, g) })),
      teilnahmen: x.teilnahmen.filter((t) => t.nutzerId === n.id).map((t) => teilnahmeAusgabe(db, t)),
      abrechnungen: x.abrechnungen.filter((a) => a.nutzerId === n.id).sort((a, b) => b.monat.localeCompare(a.monat)).slice(0, 24),
    },
    vormerkung: (db.fach?.geno || []).find((g) => g.nutzerId === n.id) || null,
  };
}

// ================================================================ Portal: Beitritt und Aktionen des Mitglieds

export async function mgBeitritt(n, genoId, daten = {}, { ip = "" } = {}) {
  mitgliedRolle(n);
  if (istAdmin(n) && !n.rollen?.includes("mitglied")) throw verboten("Der Beitritt erfolgt über das Konto des Mitglieds.");
  const db0 = await lesenBereit();
  const g = genoLaden(db0, String(genoId || ""));
  const b = fach(() => G.beitrittBereinigen(daten, g, { heute: heute() }));
  if (eigeneMitgliedschaft(db0, n, g.id)) throw konflikt("Für diese Genossenschaft liegt bereits eine Beitrittserklärung bzw. Mitgliedschaft vor.");
  const u0 = nutzerById(db0, n.id);
  const m = await aendern((db) => {
    if (eigeneMitgliedschaft(db, n, g.id)) throw konflikt("Für diese Genossenschaft liegt bereits eine Beitrittserklärung bzw. Mitgliedschaft vor.");
    const x = { id: neueId("GM"), genoId: g.id, nutzerId: n.id, status: "erklaert", anteile: b.anteile, eingezahltEur: 0, beitritt: { ...b, email: u0?.email || "", ipHash: ip ? sha256(`mitglied:${ip}`).slice(0, 16) : "" }, erklaertAm: jetzt(), einzahlungen: [], zeichnungen: [], kuendigungen: [], verlauf: [] };
    verlauf(x, n, `Beitrittserklärung über ${b.anteile} Geschäftsanteile (${G.pflichtBetrag(x, g).toLocaleString("de-DE")} €) abgegeben`);
    M(db).mitglieder.push(x);
    protokoll(db, n, "anlegen", "mitglied", x.id, `Beitrittserklärung ${g.name}: ${b.anteile} Anteile`, ip);
    backofficeMelden(db, "Neue Beitrittserklärung", `${b.firma || `${b.vorname} ${b.nachname}`}: ${b.anteile} Anteile – Unterschrift prüfen und Beitritt zulassen.`, "/portal/admin/genossenschaft", x.id);
    return x;
  });
  // Vorgang „genossenschaft“: Rückfragen im Nachrichten-Thread, Upload der unterschriebenen Erklärung
  try {
    const vg = await anfrageAnlegen({
      typ: "genossenschaft",
      kontakt: { vorname: u0?.vorname || b.vorname || "Mitglied", nachname: u0?.nachname || b.nachname, firma: b.firma, email: u0?.email, telefon: u0?.telefon, plz: b.plz, ort: b.ort, land: b.land },
      daten: { quelle: "Beitrittserklärung im Portal", genossenschaft: g.name, mitgliedschaftId: m.id, anteile: b.anteile, betragEur: b.betragEur },
      herkunft: { quelle: "portal", kampagne: "beitritt" },
      ip,
      einwilligungText: "Beitrittserklärung aus dem Portal (angemeldetes Konto).",
      nutzer: { ...n, emailBestaetigt: true, email: u0?.email },
    });
    const vorgangId = vg?.id || vg?.vorgang?.id || vg?.vorgang;
    if (vorgangId) {
      await aendern((db) => {
        const x = M(db).mitglieder.find((y) => y.id === m.id);
        if (x) x.vorgangId = vorgangId;
        const v = db.vorgaenge.find((y) => y.id === vorgangId);
        if (v && !v.nutzerId) v.nutzerId = n.id;
      });
      m.vorgangId = vorgangId;
    }
  } catch (e) {
    console.warn("[plattform-demo] Vorgang zur Beitrittserklärung nicht angelegt:", e?.message);
  }
  const db = await lesen();
  return mitgliedAusgabe(db, M(db).mitglieder.find((y) => y.id === m.id));
}

/** Aktionen des Mitglieds: zurueckziehen · zeichnen · kuendigen · kuendigungZuruecknehmen · uebertragen · uebertragungAnnehmen · uebertragungAblehnen */
export async function mgAktion(n, id, d = {}, { ip = "" } = {}) {
  mitgliedRolle(n);
  const aktion = String(d.aktion || "");
  if (aktion === "uebertragungAnnehmen" || aktion === "uebertragungAblehnen") return uebertragungEmpfang(n, String(d.uebertragungId || ""), aktion === "uebertragungAnnehmen", { ip });
  await lesenBereit();
  const r = await aendern((db) => {
    const m = mitgliedLaden(db, String(id || ""));
    if (m.nutzerId !== n.id) throw verboten("Diese Mitgliedschaft gehört nicht zu Ihrem Konto.");
    const g = genoLaden(db, m.genoId);
    const h = heute();
    if (aktion === "zurueckziehen") {
      if (m.status !== "erklaert") throw konflikt("Zurückziehen ist nur möglich, solange der Beitritt noch nicht zugelassen ist.");
      m.status = "zurueckgezogen";
      verlauf(m, n, "Beitrittserklärung zurückgezogen");
    } else if (aktion === "zeichnen") {
      const z = fach(() => G.zeichnungBereinigen(d, m, g));
      m.zeichnungen = m.zeichnungen || [];
      m.zeichnungen.push({ id: neueId("GZ"), anteile: z.anteile, betragEur: z.betragEur, am: jetzt(), status: "beantragt" });
      verlauf(m, n, `Zeichnung weiterer ${z.anteile} Anteile beantragt`);
      backofficeMelden(db, "Weitere Anteile gezeichnet", `Mitglied ${m.nr}: ${z.anteile} weitere Anteile – Zulassung durch den Vorstand.`, "/portal/admin/genossenschaft", m.id);
    } else if (aktion === "kuendigen") {
      const k = fach(() => G.kuendigungBereinigen(d, m, g, { heute: h }));
      m.kuendigungen = m.kuendigungen || [];
      m.kuendigungen.push({ id: neueId("GK"), ...k, status: "eingereicht", betragEur: G.auseinandersetzung(m, g, k.anteile) });
      verlauf(m, n, `${k.art === "voll" ? "Kündigung der Mitgliedschaft" : `Kündigung von ${k.anteile} Anteilen`} zum ${k.wirksamZum.split("-").reverse().join(".")} eingereicht`);
      backofficeMelden(db, "Kündigung eingegangen", `Mitglied ${m.nr}: ${k.art === "voll" ? "Mitgliedschaft" : `${k.anteile} Anteile`} zum ${k.wirksamZum.split("-").reverse().join(".")}.`, "/portal/admin/genossenschaft", m.id);
    } else if (aktion === "kuendigungZuruecknehmen") {
      const k = (m.kuendigungen || []).find((x) => x.id === d.kuendigungId && x.status === "eingereicht");
      if (!k) throw konflikt("Zurücknehmen ist nur möglich, solange die Kündigung noch nicht bestätigt ist.");
      k.status = "zurueckgenommen";
      verlauf(m, n, "Kündigung zurückgenommen");
    } else if (aktion === "uebertragen") {
      const u = fach(() => G.uebertragungBereinigen(d, m, g));
      const empfKonto = db.nutzer.find((x) => x.email === u.anEmail && x.aktiv);
      const empf = empfKonto ? M(db).mitglieder.find((x) => x.genoId === g.id && x.nutzerId === empfKonto.id && x.status === "aktiv") : null;
      if (empfKonto?.id === n.id) throw ungueltig("An sich selbst kann nicht übertragen werden.");
      fach(() => G.uebertragungEmpfaengerPruefen(empf, u.anteile, g));
      if (M(db).uebertragungen.some((x) => x.vonId === m.id && ["angefragt", "angenommen"].includes(x.status))) throw konflikt("Es ist bereits eine Übertragung offen.");
      const ue = { id: neueId("GU"), genoId: g.id, vonId: m.id, anId: empf.id, anNutzerId: empfKonto.id, anEmail: u.anEmail, art: u.art, anteile: u.anteile, betragEur: u.betragEur, am: jetzt(), status: "angefragt", verlauf: [] };
      M(db).uebertragungen.push(ue);
      verlauf(m, n, `Übertragung von ${u.anteile} Anteilen an Mitglied ${empf.nr} angefragt`);
      melden(db, empfKonto.id, "Übertragung von Geschäftsanteilen", `Ein Mitglied der ${g.name} möchte Ihnen ${u.anteile} Geschäftsanteile übertragen. Bitte annehmen oder ablehnen.`, "/portal/beteiligung/genossenschaft", ue.id);
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "mitglied", m.id, `Mitglied: ${aktion}`, ip);
    return mitgliedAusgabe(db, m);
  });
  return r;
}

async function uebertragungEmpfang(n, uebId, annehmen, { ip = "" } = {}) {
  await lesenBereit();
  return aendern((db) => {
    const u = M(db).uebertragungen.find((x) => x.id === uebId);
    if (!u || u.anNutzerId !== n.id) throw nichtGefunden("Übertragung nicht gefunden.");
    if (u.status !== "angefragt") throw konflikt("Diese Übertragung wurde bereits beantwortet.");
    u.status = annehmen ? "angenommen" : "abgelehnt";
    u.beantwortetAm = jetzt();
    const von = mitgliedLaden(db, u.vonId);
    verlauf(von, null, annehmen ? "Empfänger hat die Übertragung angenommen – Zustimmung des Vorstands offen" : "Empfänger hat die Übertragung abgelehnt");
    melden(db, von.nutzerId, annehmen ? "Übertragung angenommen" : "Übertragung abgelehnt", annehmen ? "Der Empfänger hat die Übertragung Ihrer Anteile angenommen. Es fehlt noch die Zustimmung des Vorstands." : "Der Empfänger hat die Übertragung Ihrer Anteile abgelehnt.", "/portal/beteiligung/genossenschaft", u.id);
    if (annehmen) backofficeMelden(db, "Übertragung zur Zustimmung", `Übertragung von ${u.anteile} Anteilen (Mitglied ${von.nr} an ${mitgliedLaden(db, u.anId).nr}) – Zustimmung des Vorstands.`, "/portal/admin/genossenschaft", u.id);
    protokoll(db, n, "aendern", "mitglied", u.id, `Übertragung ${annehmen ? "angenommen" : "abgelehnt"}`, ip);
    return { ok: true, status: u.status };
  });
}

// ================================================================ Portal: Generalversammlung

export async function gvDetail(n, gvId) {
  angemeldet(n);
  const db = await lesenBereit();
  const gv = M(db).versammlungen.find((x) => x.id === String(gvId || ""));
  if (!gv) throw nichtGefunden("Versammlung nicht gefunden.");
  if (istAdmin(n) && darfLesen(n, BEREICH)) return { ...gvAusgabe(db, gv, n, { admin: true }), geno: genoAusgabe(genoLaden(db, gv.genoId)) };
  mitgliedRolle(n);
  const m = M(db).mitglieder.find((x) => x.genoId === gv.genoId && x.nutzerId === n.id && ["aktiv", "ausgeschieden"].includes(x.status));
  if (!m || gv.status === "entwurf") throw nichtGefunden("Versammlung nicht gefunden.");
  return { ...gvAusgabe(db, gv, n, { mitglied: m }), geno: genoAusgabe(genoLaden(db, gv.genoId)) };
}

export async function gvAbstimmen(n, gvId, stimmen = {}, { ip = "" } = {}) {
  mitgliedRolle(n);
  await lesenBereit();
  return aendern((db) => {
    const gv = M(db).versammlungen.find((x) => x.id === String(gvId || ""));
    if (!gv) throw nichtGefunden("Versammlung nicht gefunden.");
    const m = M(db).mitglieder.find((x) => x.genoId === gv.genoId && x.nutzerId === n.id && x.status === "aktiv");
    if (!m) throw verboten("Abstimmen können nur Mitglieder der Genossenschaft.");
    if (!V.abstimmungOffen(gv, jetztLokal())) throw konflikt(gv.status === "abstimmung" ? "Die Abstimmung ist beendet." : "Die Abstimmung ist nicht geöffnet.");
    if (M(db).stimmen.some((s) => s.gvId === gv.id && s.mitgliedId === m.id)) throw konflikt("Sie haben bereits abgestimmt – die Stimme kann nicht geändert werden.");
    const s = fach(() => V.stimmeBereinigen(stimmen, gv));
    const st = { id: neueId("GS"), gvId: gv.id, mitgliedId: m.id, am: jetzt(), stimmen: s };
    M(db).stimmen.push(st);
    protokoll(db, n, "anlegen", "gv_stimme", gv.id, `Stimme abgegeben (${gv.titel})`, ip);
    return { ok: true, am: st.am, stimmen: s };
  });
}

// ================================================================ Portal: Energiegemeinschaft

export async function egBeitreten(n, egId, d = {}, { ip = "" } = {}) {
  mitgliedRolle(n);
  await lesenBereit();
  return aendern((db) => {
    const eg = M(db).gemeinschaften.find((x) => x.id === String(egId || ""));
    if (!eg) throw nichtGefunden("Gemeinschaft nicht gefunden.");
    const stamm = egStammVon(db, n.id);
    const b = fach(() => E.egBeitrittBereinigen(d, stamm, eg));
    if (M(db).teilnahmen.some((t) => t.nutzerId === n.id && t.egId === eg.id && ["beantragt", "angemeldet", "aktiv"].includes(t.status))) throw konflikt("Sie nehmen an dieser Gemeinschaft bereits teil bzw. haben den Beitritt beantragt.");
    const zp = stamm.zaehlpunkt || stamm.maloId;
    if (zp && M(db).teilnahmen.some((t) => t.egId === eg.id && ["beantragt", "angemeldet", "aktiv"].includes(t.status) && (t.stamm?.zaehlpunkt || t.stamm?.maloId) === zp)) throw konflikt("Dieser Zählpunkt ist in der Gemeinschaft bereits angemeldet.");
    const t = { id: neueId("ET"), egId: eg.id, nutzerId: n.id, status: "beantragt", anteilPct: b.anteilPct, beantragtAm: jetzt(), stamm: { ...stamm }, verlauf: [] };
    verlauf(t, n, "Beitritt beantragt");
    M(db).teilnahmen.push(t);
    protokoll(db, n, "anlegen", "eg_teilnahme", t.id, `Beitritt ${eg.name} beantragt`, ip);
    backofficeMelden(db, "Beitritt Energiegemeinschaft", `${nameVon(nutzerById(db, n.id))}: Beitritt zu „${eg.name}“ – beim Netzbetreiber anmelden.`, "/portal/admin/energiegemeinschaften", t.id);
    return teilnahmeAusgabe(db, t);
  });
}

export async function egTeilnahmeAktion(n, id, d = {}, { ip = "" } = {}) {
  mitgliedRolle(n);
  await lesenBereit();
  return aendern((db) => {
    const t = M(db).teilnahmen.find((x) => x.id === String(id || ""));
    if (!t || t.nutzerId !== n.id) throw nichtGefunden("Teilnahme nicht gefunden.");
    if (d.aktion !== "kuendigen") throw ungueltig("Unbekannte Aktion.");
    if (!["beantragt", "angemeldet", "aktiv"].includes(t.status)) throw konflikt("Die Teilnahme ist bereits beendet.");
    if (t.status === "aktiv") {
      t.bis = E.teilnahmeEnde(heute());
      verlauf(t, n, `Teilnahme zum ${t.bis.split("-").reverse().join(".")} gekündigt`);
      backofficeMelden(db, "Kündigung Energiegemeinschaft", `Teilnahme ${t.id} endet zum ${t.bis.split("-").reverse().join(".")} – beim Netzbetreiber abmelden.`, "/portal/admin/energiegemeinschaften", t.id);
    } else {
      t.status = "beendet";
      t.bis = heute();
      verlauf(t, n, "Beitrittsantrag zurückgezogen");
    }
    protokoll(db, n, "aendern", "eg_teilnahme", t.id, "Teilnahme gekündigt", ip);
    return teilnahmeAusgabe(db, t);
  });
}

// ================================================================ Dokumente (PDF-Daten)

/** Daten für ein PDF: beitritt | bestaetigung | ausschuettung | einladung | protokoll | eg (Monatsabrechnung) */
export async function mgDokument(n, { art = "", id = "" } = {}, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const bo = istAdmin(n) && darfLesen(n, BEREICH);
  if (!bo) mitgliedRolle(n);
  const x = M(db);
  let daten;
  if (art === "beitritt" || art === "bestaetigung") {
    const m = mitgliedLaden(db, id);
    if (!bo && m.nutzerId !== n.id) throw nichtGefunden("Mitgliedschaft nicht gefunden.");
    if (art === "bestaetigung" && m.status !== "aktiv") throw konflikt("Die Anteilsbestätigung gibt es für aktive Mitglieder nach Eingang der Einzahlung.");
    const g = genoLaden(db, m.genoId);
    daten = { art, geno: genoAusgabe(g), mitglied: mitgliedAusgabe(db, m, { admin: bo }), stand: heute() };
  } else if (art === "ausschuettung") {
    const a = x.ausschuettungen.find((y) => y.id === id);
    if (!a || a.status === "entwurf") throw nichtGefunden("Ausschüttung nicht gefunden.");
    const ids = bo ? a.positionen.map((p) => p.mitgliedId) : x.mitglieder.filter((m) => m.nutzerId === n.id).map((m) => m.id);
    const aus = ausschuettungFuer(db, a, ids);
    if (!aus.positionen.length) throw nichtGefunden("Ausschüttung nicht gefunden.");
    const g = genoLaden(db, a.genoId);
    daten = { art, geno: genoAusgabe(g), ausschuettung: { ...aus, summe: bo ? a.summe : null, steuersatz: a.steuersatz }, empfaenger: bo ? null : mitgliedAusgabe(db, x.mitglieder.find((m) => m.id === aus.positionen[0].mitgliedId)) };
  } else if (art === "einladung" || art === "protokoll") {
    const gv = await gvDetail(n, id);
    if (art === "protokoll" && gv.status !== "abgeschlossen") throw konflikt("Das Protokoll liegt nach Abschluss der Versammlung vor.");
    daten = { art, gv };
  } else if (art === "eg") {
    const a = x.abrechnungen.find((y) => y.id === id);
    if (!a || (!bo && a.nutzerId !== n.id)) throw nichtGefunden("Abrechnung nicht gefunden.");
    const eg = x.gemeinschaften.find((y) => y.id === a.egId);
    const t = x.teilnahmen.find((y) => y.id === a.teilnahmeId);
    daten = { art, abrechnung: a, gemeinschaft: egAusgabe(db, eg), teilnahme: t ? teilnahmeAusgabe(db, t) : null, empfaenger: nameVon(nutzerById(db, a.nutzerId)) || a.name };
  } else throw ungueltig("Unbekanntes Dokument.");
  await aendern((d) => protokoll(d, n, "abruf", "mitglied_dokument", id, `PDF ${art} abgerufen`, ip));
  return { ...daten, erstelltFuer: nameVon(nutzerById(db, n.id)), demo: true };
}

// ================================================================ Backoffice: Genossenschaft

export async function boGeno(n) {
  boLesen(n);
  const db = await lesenBereit();
  const x = M(db);
  const mitglieder = x.mitglieder.map((m) => mitgliedAusgabe(db, m, { admin: true }));
  const aktiv = mitglieder.filter((m) => m.status === "aktiv");
  const kennzahlen = {
    mitglieder: aktiv.length,
    anteile: aktiv.reduce((s, m) => s + m.anteile, 0),
    guthabenEur: aktiv.reduce((s, m) => s + m.kennzahlen.guthabenEur, 0),
    offeneEinzahlungenEur: mitglieder.filter((m) => ["zugelassen", "aktiv"].includes(m.status)).reduce((s, m) => s + m.kennzahlen.offenEur, 0),
    offeneErklaerungen: mitglieder.filter((m) => m.status === "erklaert").length,
    offeneKuendigungen: mitglieder.reduce((s, m) => s + m.kuendigungen.filter((k) => ["eingereicht", "bestaetigt", "wirksam"].includes(k.status)).length, 0),
    offeneUebertragungen: x.uebertragungen.filter((u) => u.status === "angenommen").length,
  };
  return {
    heute: heute(),
    darfSchreiben: darfSchreiben(n, BEREICH),
    genos: x.genos.map(genoAusgabe),
    mitglieder,
    uebertragungen: x.uebertragungen.map((u) => ({ ...u, von: mitglieder.find((m) => m.id === u.vonId)?.name || "", an: mitglieder.find((m) => m.id === u.anId)?.name || "" })),
    versammlungen: x.versammlungen.sort((a, b) => b.datum.localeCompare(a.datum)).map((v) => gvAusgabe(db, v, n, { admin: true })),
    ausschuettungen: x.ausschuettungen.map((a) => ({ ...a, artLabel: G.AUSSCHUETTUNG_ARTEN[a.art] })),
    kennzahlen,
    rechtOffen: G.RECHT_OFFEN,
  };
}

export async function boGenoSpeichern(n, { id = null, daten = {} } = {}) {
  boSchreiben(n);
  const g = fach(() => G.genoBereinigen(daten));
  await lesenBereit();
  return aendern((db) => {
    if (id) {
      const alt = genoLaden(db, String(id));
      if (alt.land !== g.land && M(db).mitglieder.some((m) => m.genoId === alt.id)) throw konflikt("Das Land kann nach dem ersten Beitritt nicht mehr geändert werden.");
      Object.assign(alt, g, { geaendertAm: jetzt() });
      protokoll(db, n, "aendern", "genossenschaft", alt.id, `Stammdaten ${g.name} geändert`);
      return genoAusgabe(alt);
    }
    const neu = { id: neueId("GE"), ...g, erstelltAm: jetzt() };
    M(db).genos.push(neu);
    protokoll(db, n, "anlegen", "genossenschaft", neu.id, `Genossenschaft ${g.name} angelegt`);
    return genoAusgabe(neu);
  });
}

/**
 * Backoffice-Aktion an einer Mitgliedschaft: zulassen {unterschrift:true} · ablehnen {grund} · einzahlung {betragEur, am, referenz}
 * · zeichnungZulassen/zeichnungAblehnen {zeichnungId} · kuendigungBestaetigen/kuendigungVollziehen/auszahlung {kuendigungId, am}
 * · uebertragungGenehmigen/uebertragungAblehnen {uebertragungId, grund}
 */
export async function boMitgliedAktion(n, id, d = {}, { ip = "" } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const aktion = String(d.aktion || "");
    const h = heute();
    if (aktion === "uebertragungGenehmigen" || aktion === "uebertragungAblehnen") {
      const u = M(db).uebertragungen.find((x) => x.id === String(d.uebertragungId || id || ""));
      if (!u) throw nichtGefunden("Übertragung nicht gefunden.");
      if (u.status !== "angenommen") throw konflikt("Zugestimmt werden kann erst, wenn der Empfänger angenommen hat.");
      const von = mitgliedLaden(db, u.vonId);
      const an = mitgliedLaden(db, u.anId);
      const g = genoLaden(db, u.genoId);
      if (aktion === "uebertragungAblehnen") {
        u.status = "abgelehnt";
        u.grund = String(d.grund || "").slice(0, 300);
        verlauf(von, n, "Übertragung vom Vorstand nicht genehmigt");
        melden(db, von.nutzerId, "Übertragung nicht genehmigt", "Der Vorstand hat der Übertragung Ihrer Anteile nicht zugestimmt.", "/portal/beteiligung/genossenschaft", u.id);
      } else {
        if (u.anteile > von.anteile || von.status !== "aktiv" || an.status !== "aktiv") throw konflikt("Die Übertragung ist nicht mehr möglich (Anteile oder Status haben sich geändert).");
        fach(() => G.uebertragungEmpfaengerPruefen(an, u.anteile, g));
        const betrag = Math.min(u.betragEur, von.eingezahltEur);
        von.anteile -= u.anteile;
        von.eingezahltEur = Math.round((von.eingezahltEur - betrag) * 100) / 100;
        an.anteile += u.anteile;
        an.eingezahltEur = Math.round((an.eingezahltEur + betrag) * 100) / 100;
        u.status = "genehmigt";
        u.genehmigtAm = jetzt();
        verlauf(von, n, `${u.anteile} Anteile an Mitglied ${an.nr} übertragen`);
        verlauf(an, n, `${u.anteile} Anteile von Mitglied ${von.nr} übernommen`);
        if (von.anteile === 0) {
          von.status = "ausgeschieden";
          von.ausgeschiedenAm = h;
          verlauf(von, n, g.land === "DE" ? "Ausgeschieden durch Übertragung des gesamten Geschäftsguthabens (§ 76 GenG)" : "Ausgeschieden durch Übertragung des gesamten Geschäftsguthabens");
        }
        melden(db, von.nutzerId, "Übertragung durchgeführt", `Ihre ${u.anteile} Anteile wurden übertragen.`, "/portal/beteiligung/genossenschaft", u.id);
        melden(db, an.nutzerId, "Anteile übernommen", `Ihnen wurden ${u.anteile} Geschäftsanteile übertragen.`, "/portal/beteiligung/genossenschaft", u.id);
      }
      protokoll(db, n, "aendern", "mitglied", u.id, `Übertragung: ${aktion}`, ip);
      return { ok: true };
    }
    const m = mitgliedLaden(db, String(id || ""));
    const g = genoLaden(db, m.genoId);
    const link = "/portal/beteiligung/genossenschaft";
    if (aktion === "zulassen") {
      if (m.status !== "erklaert") throw konflikt("Zugelassen werden kann nur eine eingegangene Beitrittserklärung.");
      if (d.unterschrift !== true) throw ungueltig("Bitte bestätigen Sie, dass die unterschriebene Beitrittserklärung vorliegt (Form laut Satzung).");
      m.status = "zugelassen";
      m.zugelassenAm = jetzt();
      m.nr = G.naechsteNummer(M(db).mitglieder.filter((x) => x.genoId === g.id).map((x) => x.nr));
      m.einzahlungFrist = new Date(Date.now() + g.einzahlungsfristTage * 864e5).toISOString().slice(0, 10);
      verlauf(m, n, `Beitritt zugelassen – Mitgliedsnummer ${m.nr}, Einzahlung bis ${m.einzahlungFrist.split("-").reverse().join(".")}`);
      melden(db, m.nutzerId, "Beitritt zugelassen", `Willkommen in der ${g.name}. Bitte zahlen Sie ${G.offenerBetrag(m, g).toLocaleString("de-DE")} € bis ${m.einzahlungFrist.split("-").reverse().join(".")} ein (Verwendungszweck ${G.verwendungszweck(m)}).`, link, m.id);
      if (G.offenerBetrag(m, g) === 0) aktivieren(db, n, m, g);
    } else if (aktion === "ablehnen") {
      if (m.status !== "erklaert") throw konflikt("Nur eingegangene Beitrittserklärungen können abgelehnt werden.");
      const grund = String(d.grund || "").trim().slice(0, 300);
      if (grund.length < 5) throw ungueltig("Bitte geben Sie eine kurze Begründung für das Mitglied an.");
      m.status = "abgelehnt";
      m.ablehnungsgrund = grund;
      verlauf(m, n, `Beitritt nicht zugelassen: ${grund}`);
      melden(db, m.nutzerId, "Beitritt nicht zugelassen", `Der Vorstand der ${g.name} hat Ihren Beitritt nicht zugelassen. Begründung: ${grund}`, link, m.id);
    } else if (aktion === "einzahlung") {
      if (!["zugelassen", "aktiv"].includes(m.status)) throw konflikt("Einzahlungen werden erst nach der Zulassung gebucht.");
      const e = fach(() => G.einzahlungBereinigen(d, { heute: h }));
      const offen = G.offenerBetrag(m, g);
      if (e.betragEur > offen + 0.001) throw ungueltig(`Der Betrag übersteigt die offene Einzahlung (${offen.toLocaleString("de-DE")} €) – Überzahlungen bitte zurücküberweisen (kein Einlagengeschäft).`);
      m.einzahlungen = m.einzahlungen || [];
      m.einzahlungen.push({ id: neueId("GP"), ...e, vonId: n.id, gebuchtAm: jetzt() });
      m.eingezahltEur = Math.round((m.eingezahltEur + e.betragEur) * 100) / 100;
      verlauf(m, n, `Einzahlung ${e.betragEur.toLocaleString("de-DE")} € gebucht`);
      if (m.status === "zugelassen" && G.offenerBetrag(m, g) === 0) aktivieren(db, n, m, g);
      else melden(db, m.nutzerId, "Einzahlung eingegangen", `Wir haben ${e.betragEur.toLocaleString("de-DE")} € verbucht.${G.offenerBetrag(m, g) ? ` Offen: ${G.offenerBetrag(m, g).toLocaleString("de-DE")} €.` : ""}`, link, m.id);
    } else if (aktion === "zeichnungZulassen" || aktion === "zeichnungAblehnen") {
      const z = (m.zeichnungen || []).find((x) => x.id === d.zeichnungId && x.status === "beantragt");
      if (!z) throw konflikt("Keine offene Zeichnung gefunden.");
      if (aktion === "zeichnungZulassen") {
        if (m.anteile + z.anteile > g.maxAnteile) throw konflikt(`Höchstzahl von ${g.maxAnteile} Anteilen würde überschritten.`);
        z.status = "zugelassen";
        z.zugelassenAm = jetzt();
        m.anteile += z.anteile;
        verlauf(m, n, `${z.anteile} weitere Anteile zugelassen – Einzahlung offen`);
        melden(db, m.nutzerId, "Weitere Anteile zugelassen", `${z.anteile} weitere Anteile sind zugelassen. Bitte zahlen Sie ${z.betragEur.toLocaleString("de-DE")} € ein (Verwendungszweck ${G.verwendungszweck(m)}).`, link, m.id);
      } else {
        z.status = "abgelehnt";
        verlauf(m, n, "Zeichnung weiterer Anteile nicht zugelassen");
        melden(db, m.nutzerId, "Weitere Anteile nicht zugelassen", "Der Vorstand hat die Zeichnung weiterer Anteile nicht zugelassen.", link, m.id);
      }
    } else if (["kuendigungBestaetigen", "kuendigungVollziehen", "auszahlung"].includes(aktion)) {
      const k = (m.kuendigungen || []).find((x) => x.id === d.kuendigungId);
      if (!k) throw nichtGefunden("Kündigung nicht gefunden.");
      if (aktion === "kuendigungBestaetigen") {
        if (k.status !== "eingereicht") throw konflikt("Die Kündigung ist bereits bestätigt.");
        k.status = "bestaetigt";
        k.bestaetigtAm = jetzt();
        verlauf(m, n, `Kündigung zum ${k.wirksamZum.split("-").reverse().join(".")} bestätigt`);
        melden(db, m.nutzerId, "Kündigung bestätigt", `Ihre Kündigung wird zum ${k.wirksamZum.split("-").reverse().join(".")} wirksam.${k.auszahlungBis ? ` Das Auseinandersetzungsguthaben wird bis ${k.auszahlungBis.split("-").reverse().join(".")} ausgezahlt.` : ""}`, link, m.id);
      } else if (aktion === "kuendigungVollziehen") {
        if (k.status !== "bestaetigt") throw konflikt("Vollzogen werden kann nur eine bestätigte Kündigung.");
        if (h < k.wirksamZum) throw konflikt(`Die Kündigung wird erst zum ${k.wirksamZum.split("-").reverse().join(".")} wirksam.`);
        k.betragEur = G.auseinandersetzung(m, g, k.anteile);
        k.status = "wirksam";
        const betragAnteile = Math.min(k.betragEur, m.eingezahltEur);
        m.anteile -= k.anteile;
        m.eingezahltEur = Math.round((m.eingezahltEur - betragAnteile) * 100) / 100;
        if (k.art === "voll" || m.anteile <= 0) {
          m.status = "ausgeschieden";
          m.ausgeschiedenAm = k.wirksamZum;
        }
        verlauf(m, n, `Kündigung wirksam – Auseinandersetzungsguthaben ${k.betragEur.toLocaleString("de-DE")} €`);
        melden(db, m.nutzerId, "Kündigung wirksam", `Ihre Kündigung ist wirksam. Auseinandersetzungsguthaben: ${k.betragEur.toLocaleString("de-DE")} € (vorbehaltlich des festgestellten Jahresabschlusses).`, link, m.id);
      } else {
        if (k.status !== "wirksam") throw konflikt("Ausgezahlt wird nach Wirksamkeit der Kündigung.");
        k.status = "ausgezahlt";
        k.ausgezahltAm = String(d.am || h).slice(0, 10);
        verlauf(m, n, `Auseinandersetzungsguthaben ${k.betragEur.toLocaleString("de-DE")} € ausgezahlt`);
        melden(db, m.nutzerId, "Auszahlung veranlasst", `Ihr Auseinandersetzungsguthaben von ${k.betragEur.toLocaleString("de-DE")} € wurde an Ihr hinterlegtes Konto überwiesen.`, link, m.id);
      }
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "mitglied", m.id, `Backoffice: ${aktion}`, ip);
    return mitgliedAusgabe(db, m, { admin: true });
  });
}

function aktivieren(db, n, m, g) {
  m.status = "aktiv";
  m.aktivSeit = heute();
  verlauf(m, n, "Einzahlung vollständig – Mitgliedschaft aktiv, Anteilsbestätigung abrufbar");
  melden(db, m.nutzerId, "Mitgliedschaft aktiv", `Ihre Einzahlung ist vollständig. Sie sind Mitglied Nr. ${m.nr} der ${g.name}; die Anteilsbestätigung steht im Portal bereit.`, "/portal/beteiligung/genossenschaft", m.id);
}

// ---------------------------------------------------------------- Backoffice: Generalversammlung

export async function boGvSpeichern(n, { id = null, genoId = "", daten = {} } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const alt = id ? M(db).versammlungen.find((x) => x.id === String(id)) : null;
    if (id && !alt) throw nichtGefunden("Versammlung nicht gefunden.");
    if (alt && alt.status !== "entwurf") throw konflikt("Nach der Einladung können Tagesordnung und Termin nicht mehr geändert werden – ggf. absagen und neu einladen.");
    const g = genoLaden(db, alt?.genoId || String(genoId || ""));
    const gv = fach(() => V.versammlungBereinigen(daten, g));
    if (alt) {
      Object.assign(alt, gv, { geaendertAm: jetzt() });
      protokoll(db, n, "aendern", "generalversammlung", alt.id, `Versammlung „${gv.titel}“ geändert`);
      return gvAusgabe(db, alt, n, { admin: true });
    }
    const neu = { id: neueId("GV"), genoId: g.id, ...gv, status: "entwurf", erstelltAm: jetzt() };
    M(db).versammlungen.push(neu);
    protokoll(db, n, "anlegen", "generalversammlung", neu.id, `Versammlung „${gv.titel}“ angelegt`);
    return gvAusgabe(db, neu, n, { admin: true });
  });
}

/** einladen · oeffnen · abschliessen {versammlungsleiter, protokollfuehrer, anwesend, tops, notiz} · absagen {grund} */
export async function boGvAktion(n, id, d = {}, { ip = "" } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const gv = M(db).versammlungen.find((x) => x.id === String(id || ""));
    if (!gv) throw nichtGefunden("Versammlung nicht gefunden.");
    const g = genoLaden(db, gv.genoId);
    const aktiv = M(db).mitglieder.filter((m) => m.genoId === g.id && G.MITGLIED_AKTIV.includes(m.status));
    const link = `/portal/beteiligung/versammlung/${gv.id}`;
    const aktion = String(d.aktion || "");
    if (aktion === "einladen") {
      fach(() => V.einladungPruefen(gv, g, { heute: heute() }));
      gv.status = "eingeladen";
      gv.eingeladenAm = jetzt();
      for (const m of aktiv) melden(db, m.nutzerId, `Einladung: ${gv.titel}`, `Die ${g.name} lädt Sie zur Versammlung am ${gv.datum.slice(0, 10).split("-").reverse().join(".")} um ${gv.datum.slice(11, 16)} Uhr ein. Tagesordnung und Unterlagen finden Sie im Portal.`, link, gv.id);
      gv.eingeladen = aktiv.length;
    } else if (aktion === "oeffnen") {
      if (gv.status !== "eingeladen") throw konflikt("Geöffnet werden kann die Abstimmung nach der Einladung.");
      if (!V.ONLINE_FORMEN.includes(gv.form)) throw konflikt("Bei einer reinen Präsenzversammlung wird im Saal abgestimmt – Ergebnis beim Abschluss eintragen.");
      if (!gv.tagesordnung.some((t) => t.beschluss)) throw konflikt("Die Tagesordnung enthält keine Beschlusspunkte.");
      gv.status = "abstimmung";
      gv.eroeffnetAm = jetzt();
      for (const m of aktiv) melden(db, m.nutzerId, `Abstimmung geöffnet: ${gv.titel}`, `Sie können jetzt online abstimmen${gv.abstimmungBis ? ` – bis ${gv.abstimmungBis.slice(0, 10).split("-").reverse().join(".")}, ${gv.abstimmungBis.slice(11, 16)} Uhr` : ""}.`, link, gv.id);
    } else if (aktion === "abschliessen") {
      if (!["eingeladen", "abstimmung"].includes(gv.status)) throw konflikt("Abgeschlossen werden kann eine eingeladene Versammlung.");
      const stimmen = M(db).stimmen.filter((s) => s.gvId === gv.id);
      const x = fach(() => V.abschlussBereinigen(d, gv, { stimmberechtigt: aktiv.length, online: stimmen.length }));
      gv.ergebnis = V.ergebnisRechnen(gv, stimmen, aktiv.length, { anwesend: x.anwesend, tops: x.tops });
      gv.protokoll = { versammlungsleiter: x.versammlungsleiter, protokollfuehrer: x.protokollfuehrer, notiz: x.notiz, erstelltAm: jetzt(), hash: sha256(V.stimmenKanonisch(gv.id, stimmen)), anzahlStimmzettel: stimmen.length };
      gv.status = "abgeschlossen";
      gv.abgeschlossenAm = jetzt();
      for (const m of aktiv) melden(db, m.nutzerId, `Ergebnis: ${gv.titel}`, `Die Versammlung ist abgeschlossen. Ergebnis und Protokoll stehen im Portal bereit.`, link, gv.id);
    } else if (aktion === "absagen") {
      if (["abgeschlossen", "abgesagt"].includes(gv.status)) throw konflikt("Die Versammlung ist bereits abgeschlossen bzw. abgesagt.");
      const grund = String(d.grund || "").trim().slice(0, 300);
      if (grund.length < 5) throw ungueltig("Bitte geben Sie einen Grund für die Absage an.");
      const warEingeladen = gv.status !== "entwurf";
      gv.status = "abgesagt";
      gv.absageGrund = grund;
      if (warEingeladen) for (const m of aktiv) melden(db, m.nutzerId, `Abgesagt: ${gv.titel}`, `Die Versammlung wurde abgesagt. Grund: ${grund}`, link, gv.id);
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "generalversammlung", gv.id, `Versammlung: ${aktion}`, ip);
    return gvAusgabe(db, gv, n, { admin: true });
  });
}

// ---------------------------------------------------------------- Backoffice: Ausschüttung

function berechtigteFuer(db, g, a) {
  const umsatz = {};
  if (a.art === "rueckverguetung") {
    for (const r of M(db).abrechnungen.filter((x) => x.monat.startsWith(String(a.geschaeftsjahr)))) umsatz[r.nutzerId] = (umsatz[r.nutzerId] || 0) + (r.bezugGemeinschaftKwh || 0);
  }
  return M(db).mitglieder
    .filter((m) => m.genoId === g.id && m.status === "aktiv" && m.aktivSeit && m.aktivSeit <= a.stichtag)
    .map((m) => ({ mitgliedId: m.id, nutzerId: m.nutzerId, nr: m.nr, name: m.beitritt?.firma || `${m.beitritt?.vorname || ""} ${m.beitritt?.nachname || ""}`.trim(), land: g.land, freistellung: !!m.beitritt?.freistellung, guthabenEur: G.geschaeftsguthaben(m, g), umsatzKwh: m.nutzerId ? umsatz[m.nutzerId] || 0 : 0 }));
}

export async function boAusschuettungAnlegen(n, { genoId = "", daten = {} } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const g = genoLaden(db, String(genoId || ""));
    const a = fach(() => G.ausschuettungBereinigen(daten, { heute: heute() }));
    if (M(db).ausschuettungen.some((x) => x.genoId === g.id && x.geschaeftsjahr === a.geschaeftsjahr && x.art === a.art && x.status !== "entwurf")) throw konflikt(`Für ${a.geschaeftsjahr} ist bereits eine ${G.AUSSCHUETTUNG_ARTEN[a.art]} beschlossen.`);
    M(db).ausschuettungen = M(db).ausschuettungen.filter((x) => !(x.genoId === g.id && x.geschaeftsjahr === a.geschaeftsjahr && x.art === a.art && x.status === "entwurf"));
    const r = G.ausschuettungBerechnen(a, berechtigteFuer(db, g, a), g);
    if (!r.anzahl) throw konflikt("Keine berechtigten Mitglieder bzw. keine Bemessungsgrundlage für diesen Stichtag.");
    const neu = { id: neueId("AU"), genoId: g.id, ...a, ...r, status: "entwurf", erstelltAm: jetzt(), vonId: n.id };
    M(db).ausschuettungen.push(neu);
    protokoll(db, n, "anlegen", "ausschuettung", neu.id, `${G.AUSSCHUETTUNG_ARTEN[a.art]} ${a.geschaeftsjahr} berechnet (${r.anzahl} Mitglieder)`);
    return { ...neu, artLabel: G.AUSSCHUETTUNG_ARTEN[a.art] };
  });
}

/** beschliessen {beschlussDatum, gvId?} · auszahlen {am} · verwerfen */
export async function boAusschuettungAktion(n, id, d = {}, { ip = "" } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const a = M(db).ausschuettungen.find((x) => x.id === String(id || ""));
    if (!a) throw nichtGefunden("Ausschüttung nicht gefunden.");
    const g = genoLaden(db, a.genoId);
    const aktion = String(d.aktion || "");
    if (aktion === "beschliessen") {
      if (a.status !== "entwurf") throw konflikt("Bereits beschlossen.");
      const bd = /^\d{4}-\d{2}-\d{2}$/.test(String(d.beschlussDatum || "")) ? d.beschlussDatum : "";
      if (!bd) throw ungueltig("Bitte geben Sie das Datum des Beschlusses der Generalversammlung an (Gewinnverwendung).");
      if (bd > heute()) throw ungueltig("Das Beschlussdatum liegt in der Zukunft.");
      const gv = d.gvId ? M(db).versammlungen.find((x) => x.id === d.gvId && x.genoId === g.id && x.status === "abgeschlossen") : null;
      if (d.gvId && !gv) throw ungueltig("Die angegebene Versammlung ist nicht abgeschlossen.");
      a.status = "beschlossen";
      a.beschlussDatum = bd;
      a.gvId = gv?.id || null;
    } else if (aktion === "auszahlen") {
      if (a.status !== "beschlossen") throw konflikt("Ausgezahlt wird nach dem Beschluss der Generalversammlung.");
      a.status = "ausgezahlt";
      a.ausgezahltAm = /^\d{4}-\d{2}-\d{2}$/.test(String(d.am || "")) ? d.am : heute();
      for (const p of a.positionen) if (p.nutzerId) melden(db, p.nutzerId, `${a.art === "dividende" ? "Dividende" : "Rückvergütung"} ${a.geschaeftsjahr}`, `Die ${g.name} hat ${p.nettoEur.toLocaleString("de-DE")} € an Ihr hinterlegtes Konto überwiesen. Die Mitteilung steht im Portal.`, "/portal/beteiligung/genossenschaft", a.id);
    } else if (aktion === "verwerfen") {
      if (a.status !== "entwurf") throw konflikt("Nur Entwürfe können verworfen werden.");
      M(db).ausschuettungen = M(db).ausschuettungen.filter((x) => x.id !== a.id);
      protokoll(db, n, "loeschen", "ausschuettung", a.id, "Entwurf verworfen", ip);
      return { ok: true, verworfen: true };
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "ausschuettung", a.id, `Ausschüttung: ${aktion}`, ip);
    return { ...a, artLabel: G.AUSSCHUETTUNG_ARTEN[a.art] };
  });
}

// ================================================================ Backoffice: Energiegemeinschaften

export async function boEg(n) {
  boLesen(n);
  const db = await lesenBereit();
  return { heute: heute(), darfSchreiben: darfSchreiben(n, BEREICH), gemeinschaften: M(db).gemeinschaften.map((g) => egAusgabe(db, g, { admin: true })) };
}

export async function boEgSpeichern(n, { id = null, daten = {} } = {}) {
  boSchreiben(n);
  const g = fach(() => E.gemeinschaftBereinigen(daten));
  await lesenBereit();
  return aendern((db) => {
    if (id) {
      const alt = M(db).gemeinschaften.find((x) => x.id === String(id));
      if (!alt) throw nichtGefunden("Gemeinschaft nicht gefunden.");
      if ((alt.land !== g.land || alt.form !== g.form) && M(db).teilnahmen.some((t) => t.egId === alt.id && t.status !== "abgelehnt")) throw konflikt("Land und Form können nach dem ersten Beitritt nicht mehr geändert werden.");
      Object.assign(alt, g, { geaendertAm: jetzt() });
      protokoll(db, n, "aendern", "energiegemeinschaft", alt.id, `Gemeinschaft ${g.name} geändert`);
      return egAusgabe(db, alt, { admin: true });
    }
    const neu = { id: neueId("EGM"), ...g, erstelltAm: jetzt() };
    M(db).gemeinschaften.push(neu);
    protokoll(db, n, "anlegen", "energiegemeinschaft", neu.id, `Gemeinschaft ${g.name} angelegt`);
    return egAusgabe(db, neu, { admin: true });
  });
}

/** anmelden · aktivieren {ab} · ablehnen {grund} · beenden {bis} */
export async function boTeilnahmeAktion(n, id, d = {}, { ip = "" } = {}) {
  boSchreiben(n);
  await lesenBereit();
  return aendern((db) => {
    const t = M(db).teilnahmen.find((x) => x.id === String(id || ""));
    if (!t) throw nichtGefunden("Teilnahme nicht gefunden.");
    const eg = M(db).gemeinschaften.find((x) => x.id === t.egId);
    const aktion = String(d.aktion || "");
    const link = "/portal/beteiligung/energiegemeinschaft";
    if (aktion === "anmelden") {
      if (t.status !== "beantragt") throw konflikt("Angemeldet werden kann ein beantragter Beitritt.");
      t.status = "angemeldet";
      t.angemeldetAm = jetzt();
      verlauf(t, n, eg.land === "AT" ? "Beim Netzbetreiber angemeldet (Zuordnung des Zählpunkts über EDA) – Freigabe der Viertelstundenwerte nötig" : "Beim Netz- bzw. Messstellenbetreiber angemeldet");
      melden(db, t.nutzerId, "Anmeldung beim Netzbetreiber", eg.land === "AT" ? `Ihr Zählpunkt wurde für „${eg.name}“ angemeldet. Bitte bestätigen Sie die Datenfreigabe im Webportal Ihres Netzbetreibers.` : `Ihre Teilnahme an „${eg.name}“ wurde beim Netzbetreiber angemeldet.`, link, t.id);
    } else if (aktion === "aktivieren") {
      if (t.status !== "angemeldet") throw konflikt("Aktiviert wird nach der Anmeldung beim Netzbetreiber.");
      if (eg.status !== "aktiv") throw konflikt("Die Gemeinschaft ist noch nicht aktiv.");
      t.ab = /^\d{4}-\d{2}-\d{2}$/.test(String(d.ab || "")) ? d.ab : heute();
      t.status = "aktiv";
      verlauf(t, n, `Teilnahme aktiv ab ${t.ab.split("-").reverse().join(".")}`);
      melden(db, t.nutzerId, "Energiegemeinschaft aktiv", `Ab ${t.ab.split("-").reverse().join(".")} teilen Sie Strom in „${eg.name}“. Die Abrechnung erhalten Sie monatlich im Portal.`, link, t.id);
    } else if (aktion === "ablehnen") {
      if (!["beantragt", "angemeldet"].includes(t.status)) throw konflikt("Abgelehnt werden kann nur ein offener Beitritt.");
      const grund = String(d.grund || "").trim().slice(0, 300);
      if (grund.length < 5) throw ungueltig("Bitte geben Sie eine kurze Begründung an (z. B. Zählpunkt außerhalb des Netzgebiets).");
      t.status = "abgelehnt";
      t.grund = grund;
      verlauf(t, n, `Nicht aufgenommen: ${grund}`);
      melden(db, t.nutzerId, "Energiegemeinschaft: nicht aufgenommen", `Ihr Beitritt zu „${eg.name}“ ist nicht möglich. Begründung: ${grund}`, link, t.id);
    } else if (aktion === "beenden") {
      if (!["aktiv", "angemeldet"].includes(t.status)) throw konflikt("Nur laufende Teilnahmen können beendet werden.");
      t.bis = /^\d{4}-\d{2}-\d{2}$/.test(String(d.bis || "")) ? d.bis : t.bis || heute();
      t.status = "beendet";
      verlauf(t, n, `Teilnahme beendet zum ${t.bis.split("-").reverse().join(".")}`);
      melden(db, t.nutzerId, "Energiegemeinschaft beendet", `Ihre Teilnahme an „${eg.name}“ endet zum ${t.bis.split("-").reverse().join(".")}.`, link, t.id);
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "aendern", "eg_teilnahme", t.id, `Teilnahme: ${aktion}`, ip);
    return teilnahmeAusgabe(db, t, { admin: true });
  });
}

function monatsEnde(mon) {
  const [j, m] = mon.split("-").map(Number);
  return new Date(Date.UTC(j, m, 0, 12)).toISOString().slice(0, 10);
}

/** Monatslauf: { monat, messwerte? { [teilnahmeId]: { verbrauchKwh, erzeugungKwh } } } → Abrechnungen je Teilnehmer + Benachrichtigung */
export async function boEgAbrechnen(n, egId, { monat: mon = "", messwerte = {} } = {}) {
  boSchreiben(n);
  await lesenBereit();
  const mw = E.messwerteBereinigen(messwerte);
  return aendern((db) => {
    const eg = M(db).gemeinschaften.find((x) => x.id === String(egId || ""));
    if (!eg) throw nichtGefunden("Gemeinschaft nicht gefunden.");
    if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(String(mon))) throw ungueltig("Bitte wählen Sie den Abrechnungsmonat (JJJJ-MM).");
    if (mon >= heute().slice(0, 7)) throw ungueltig("Abgerechnet werden nur abgeschlossene Monate.");
    if (M(db).laeufe.some((l) => l.egId === eg.id && l.monat === mon)) throw konflikt(`Der Monat ${mon} ist für diese Gemeinschaft bereits abgerechnet.`);
    const ende = monatsEnde(mon);
    const tn = M(db).teilnahmen.filter((t) => t.egId === eg.id && t.ab && t.ab <= ende && (t.status === "aktiv" || (t.status === "beendet" && t.bis && t.bis >= `${mon}-01`)));
    if (!tn.length) throw konflikt("Im Monat gab es keine aktiven Teilnehmer.");
    const r = fach(() => E.monatsabrechnung(eg, mon, tn.map((t) => ({ id: t.id, nutzerId: t.nutzerId, name: t.name || nameVon(nutzerById(db, t.nutzerId)), stamm: t.stamm, anteilPct: t.anteilPct, messwerte: mw[t.id] }))));
    const lauf = { id: neueId("EL"), egId: eg.id, monat: mon, erzeugungKwh: r.erzeugungKwh, geteiltKwh: r.geteiltKwh, ueberschussKwh: r.ueberschussKwh, summe: r.summe, geschaetzt: r.geschaetzt, anzahl: r.positionen.length, am: jetzt(), vonId: n.id };
    M(db).laeufe.push(lauf);
    for (const p of r.positionen) {
      const a = { id: neueId("EA"), egId: eg.id, laufId: lauf.id, monat: mon, ...p, am: jetzt() };
      M(db).abrechnungen.push(a);
      if (p.nutzerId) melden(db, p.nutzerId, `Energiegemeinschaft: Abrechnung ${mon.split("-").reverse().join("/")}`, `Geteilter Strom ${p.bezugGemeinschaftKwh.toLocaleString("de-DE")} kWh${p.einspeisungGemeinschaftKwh ? `, eingespeist ${p.einspeisungGemeinschaftKwh.toLocaleString("de-DE")} kWh` : ""}, Saldo ${p.saldoEur.toLocaleString("de-DE")} €${p.geschaetzt ? " (geschätzt)" : ""}.`, "/portal/beteiligung/energiegemeinschaft", a.id);
    }
    protokoll(db, n, "anlegen", "eg_abrechnung", lauf.id, `Monatslauf ${eg.name} ${mon} (${r.positionen.length} Teilnehmer)`);
    return lauf;
  });
}

// ================================================================ Demo-Daten (fiktiv)

const ZP_MITGLIED = "AT0030000000000000000000000012345";

function seed(db) {
  const x = M(db);
  const u = (email) => db.nutzer.find((y) => y.email === email);
  const mg = u("mitglied@example.com");
  const lw = u("landwirt@example.com");
  const t0 = (tage) => new Date(Date.now() - tage * 864e5);
  const iso = (tage) => t0(tage).toISOString();
  const tag = (tage) => t0(tage).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const gAt = {
    id: neueId("GE"), name: "Bürgerenergie Innviertel eGen (Demo)", land: "AT", rechtsform: "eGen", registerStatus: "eingetragen", registerNr: "FN 000001a (Demo)", registergericht: "Landesgericht (Demo)",
    pruefungsverband: "Revisionsverband (Demo)", sitz: "Innviertel (Demo)", vorstand: "Vorstand (Demo)", anteilEur: 250, minAnteile: 2, maxAnteile: 200, eintrittsgeldEur: 0, einzahlungsfristTage: 14,
    kuendigungsfristMonate: 6, geschaeftsjahrEnde: "12-31", nachschusspflicht: "ausgeschlossen", haftsummeEur: 0, iban: "AT611904300234573201", bic: "DEMOATW1", kontoinhaber: "Bürgerenergie Innviertel eGen (Demo)",
    satzungStand: "2025-01-20", onlineGv: true, einladungsfristTage: 14, info: "Fiktive Genossenschaft für die Vorführung. Alle Angaben sind Beispiele.", demo: true, erstelltAm: iso(700),
  };
  const gDe = {
    id: neueId("GE"), name: "Bürgerenergie Unterallgäu eG i. G. (Demo)", land: "DE", rechtsform: "eG", registerStatus: "aufbau", registerNr: "", registergericht: "", pruefungsverband: "", sitz: "Unterallgäu (Demo)", vorstand: "",
    anteilEur: 250, minAnteile: 1, maxAnteile: 100, eintrittsgeldEur: 0, einzahlungsfristTage: 14, kuendigungsfristMonate: 3, geschaeftsjahrEnde: "12-31", nachschusspflicht: "ausgeschlossen", haftsummeEur: 0,
    iban: "", bic: "", kontoinhaber: "", satzungStand: "", onlineGv: false, einladungsfristTage: null, info: "In Gründung – derzeit nur unverbindliche Vormerkung.", demo: true, erstelltAm: iso(60),
  };
  x.genos.push(gAt, gDe);
  const mitglied = (nutzer, nr, anteile, b, seitTage) => ({
    id: neueId("GM"), genoId: gAt.id, nutzerId: nutzer?.id || null, nr, status: "aktiv", anteile, eingezahltEur: anteile * 250,
    beitritt: { art: "privat", anrede: "", vorname: b.vorname, nachname: b.nachname, firma: b.firma || "", vertretung: "", strasse: b.strasse, plz: b.plz, ort: b.ort, land: "AT", geburtsdatum: "", kontoinhaber: `${b.vorname} ${b.nachname}`, iban: "AT611904300234573201", freistellung: false, anteile, bestaetigt: Object.fromEntries(G.beitrittBestaetigungen(gAt).map((k) => [k, true])), betragEur: anteile * 250, eintrittsgeldEur: 0, email: nutzer?.email || "" },
    erklaertAm: iso(seitTage + 20), zugelassenAm: iso(seitTage + 10), aktivSeit: tag(seitTage), einzahlungFrist: tag(seitTage - 4),
    einzahlungen: [{ id: neueId("GP"), betragEur: anteile * 250, am: tag(seitTage), referenz: "Demo-Überweisung", gebuchtAm: iso(seitTage) }], zeichnungen: [], kuendigungen: [],
    verlauf: [{ am: iso(seitTage + 20), vonId: nutzer?.id || null, text: `Beitrittserklärung über ${anteile} Anteile abgegeben`, oeffentlich: true }, { am: iso(seitTage), vonId: null, text: "Einzahlung vollständig – Mitgliedschaft aktiv", oeffentlich: true }],
    demo: true,
  });
  const liste = [
    mg && mitglied(mg, "0003", 8, { vorname: mg.vorname, nachname: mg.nachname, strasse: "Musterweg 3 (Demo)", plz: "5121", ort: "Ostermiething" }, 560),
    lw && mitglied(lw, "0001", 20, { vorname: lw.vorname, nachname: lw.nachname, strasse: "Hofstraße 1 (Demo)", plz: "5121", ort: "Ostermiething" }, 640),
    mitglied(null, "0002", 4, { vorname: "Anna", nachname: "Beispiel (Demo)", strasse: "Dorfplatz 2 (Demo)", plz: "5120", ort: "St. Pantaleon" }, 600),
    mitglied(null, "0004", 12, { vorname: "Josef", nachname: "Muster (Demo)", strasse: "Feldweg 7 (Demo)", plz: "5122", ort: "Ach" }, 400),
  ].filter(Boolean);
  x.mitglieder.push(...liste);
  const aktive = liste.length;

  // Abgeschlossene ordentliche GV (Juni) mit Protokoll
  const gv1 = {
    id: neueId("GV"), genoId: gAt.id, titel: "Ordentliche Generalversammlung 2026 (Geschäftsjahr 2025)", art: "ordentlich", form: "hybrid", datum: `${tag(110)}T18:30`, ort: "Gemeindesaal (Demo)", zugang: "Zugangsdaten per E-Mail (Demo)",
    abstimmungBis: `${tag(110)}T21:00`, einleitung: "Beispiel einer ordentlichen Generalversammlung.", tagesordnung: V.TAGESORDNUNG_VORLAGE.map((t, i) => ({ id: `T${i + 1}`, titel: t.titel, text: "", beschluss: t.beschluss, mehrheit: t.beschluss ? t.mehrheit : null, satzung: false })),
    unterlagen: [{ id: "U1", titel: "Jahresabschluss 2025 (Kurzfassung, Demo)", text: "Umsatzerlöse aus Stromverkauf 118.400 € (Demo), Jahresüberschuss 9.800 € (Demo). Vorschlag: 2 % Dividende auf das Geschäftsguthaben, Rest in die Rücklage." }],
    status: "abgeschlossen", eingeladenAm: iso(135), eroeffnetAm: iso(125), abgeschlossenAm: iso(110), erstelltAm: iso(140), demo: true,
  };
  const stimmen1 = liste.slice(1).map((m, i) => ({ id: neueId("GS"), gvId: gv1.id, mitgliedId: m.id, am: iso(115 - i), stimmen: Object.fromEntries(gv1.tagesordnung.filter((t) => t.beschluss).map((t) => [t.id, i === 2 && t.id === "T4" ? "enthaltung" : "ja"])) }));
  gv1.ergebnis = V.ergebnisRechnen(gv1, stimmen1, aktive, { anwesend: 0, tops: {} });
  gv1.protokoll = { versammlungsleiter: "Vorsitz Aufsichtsrat (Demo)", protokollfuehrer: "Schriftführung (Demo)", notiz: "Alle Beschlüsse wurden gefasst. Fiktives Beispiel.", erstelltAm: iso(110), hash: sha256(V.stimmenKanonisch(gv1.id, stimmen1)), anzahlStimmzettel: stimmen1.length };
  // Laufende außerordentliche GV mit Online-Abstimmung
  const gv2 = {
    id: neueId("GV"), genoId: gAt.id, titel: "Außerordentliche Generalversammlung Herbst 2026", art: "ausserordentlich", form: "hybrid", datum: `${tag(-20)}T18:00`, ort: "Gemeindesaal (Demo)", zugang: "Online-Teilnahme: Link folgt per E-Mail (Demo)",
    abstimmungBis: `${tag(-20)}T20:00`, einleitung: "Vorab-Stimmabgabe online möglich (Satzung § 14, Demo).",
    tagesordnung: [
      { id: "T1", titel: "Bericht des Vorstands zum Projekt „Solarpark Innviertel-Süd (Demo)“", text: "", beschluss: false, mehrheit: null, satzung: false },
      { id: "T2", titel: "Zustimmung zur Beteiligung an der Projektgesellschaft Solarpark Innviertel-Süd (Demo)", text: "Die Genossenschaft beteiligt sich mit bis zu 150.000 € (Demo) an der Projektgesellschaft.", beschluss: true, mehrheit: "einfach", satzung: false },
      { id: "T3", titel: "Satzungsänderung: Höchstzahl der Geschäftsanteile je Mitglied von 200 auf 400", text: "Änderung § 5 Abs. 2 der Satzung (Demo).", beschluss: true, mehrheit: "zweidrittel", satzung: true },
    ],
    unterlagen: [{ id: "U1", titel: "Projektsteckbrief Solarpark Innviertel-Süd (Demo)", text: "Freiflächenanlage 4,8 MWp (Demo), Inbetriebnahme geplant 2027, Beteiligung der Genossenschaft bis 150.000 € (Demo). Chancen und Risiken: siehe Vorstandsbericht." }, { id: "U2", titel: "Synopse Satzungsänderung (Demo)", text: "§ 5 Abs. 2 alt: höchstens 200 Anteile. Neu: höchstens 400 Anteile." }],
    status: "abstimmung", eingeladenAm: iso(3), eroeffnetAm: iso(2), erstelltAm: iso(6), demo: true,
  };
  const stimmen2 = liste.slice(1, 3).map((m) => ({ id: neueId("GS"), gvId: gv2.id, mitgliedId: m.id, am: iso(1), stimmen: { T2: "ja", T3: "ja" } }));
  x.versammlungen.push(gv1, gv2);
  x.stimmen.push(...stimmen1, ...stimmen2);

  // Dividende GJ 2025 (2 %), ausgezahlt
  const jahr = Number(tag(0).slice(0, 4)) - 1;
  const a = { art: "dividende", geschaeftsjahr: jahr, stichtag: `${jahr}-12-31`, satzPct: 2, ctProKwh: null, notiz: "Beschluss der ordentlichen GV (Demo)" };
  const ber = liste.filter((m) => m.aktivSeit <= a.stichtag).map((m) => ({ mitgliedId: m.id, nutzerId: m.nutzerId, nr: m.nr, name: `${m.beitritt.vorname} ${m.beitritt.nachname}`, land: "AT", freistellung: false, guthabenEur: G.geschaeftsguthaben(m, gAt), umsatzKwh: 0 }));
  const r = G.ausschuettungBerechnen(a, ber, gAt);
  if (r.anzahl) x.ausschuettungen.push({ id: neueId("AU"), genoId: gAt.id, ...a, ...r, status: "ausgezahlt", beschlussDatum: tag(110), gvId: gv1.id, ausgezahltAm: tag(95), erstelltAm: iso(105), demo: true });

  // Energiegemeinschaften
  const egAt = { id: neueId("EGM"), name: "EEG Innviertel Sonnenstrom (Demo)", land: "AT", form: "eeg_regional", status: "aktiv", rechtsform: "Verein (Demo)", netzbetreiber: "Netzbetreiber Oberösterreich (Demo)", gebiet: "Umspannwerk Innviertel-Süd (Demo)", plzListe: ["5120", "5121", "5122", "5131"], tarifBezugCt: 11, tarifEinspeisungCt: 9, grundgebuehrMonat: 1.5, verteilschluessel: "dynamisch", gemeinschaftsId: "AT00300000RC100000000000000000001 (Demo)", info: "Fiktive regionale EEG für die Vorführung.", demo: true, erstelltAm: iso(500) };
  const egDe = { id: neueId("EGM"), name: "Energy Sharing Unterallgäu (Demo)", land: "DE", form: "energy_sharing", status: "aufbau", rechtsform: "eG i. G. (Demo)", netzbetreiber: "Verteilnetz Unterallgäu (Demo)", gebiet: "Netzgebiet Unterallgäu (Demo)", plzListe: [], tarifBezugCt: 20, tarifEinspeisungCt: 10, grundgebuehrMonat: 2.5, verteilschluessel: "dynamisch", gemeinschaftsId: "", info: "In Vorbereitung – Energy Sharing nach § 42c EnWG.", demo: true, erstelltAm: iso(30) };
  x.gemeinschaften.push(egAt, egDe);
  db.fach = db.fach || { v: 1, abnahmestellen: [], lastgaenge: [], szenarien: [], eg: [], geno: [] };
  const stammFuer = (nutzer, daten) => {
    if (!nutzer) return { ...egTeilnahmeBereinigen(daten) };
    let s = db.fach.eg.find((y) => y.nutzerId === nutzer.id);
    if (!s) {
      s = { id: neueId("EG"), nutzerId: nutzer.id, status: "vorgemerkt", erstelltAm: iso(200), ...egTeilnahmeBereinigen(daten), geaendertAm: iso(200) };
      db.fach.eg.push(s);
    }
    return { ...s };
  };
  const basis = { land: "AT", form: "eeg_regional", netzbetreiber: "Netzbetreiber Oberösterreich (Demo)", smartMeter: "ja", datenfreigabe: "ja" };
  const tn = [
    mg && { nutzer: mg, stamm: stammFuer(mg, { ...basis, rolle: "bezug", zaehlpunkt: ZP_MITGLIED, plz: "5121", ort: "Ostermiething", jahresverbrauchKwh: 3800 }), ab: `${tag(150).slice(0, 7)}-01` },
    lw && { nutzer: lw, stamm: stammFuer(lw, { ...basis, rolle: "beides", zaehlpunkt: "AT0030000000000000000000000054321", zaehlpunktEinspeisung: "AT0030000000000000000000000054322", plz: "5121", ort: "Ostermiething", jahresverbrauchKwh: 12000, anlageKwp: 60 }), ab: `${tag(200).slice(0, 7)}-01` },
    { name: "Bäckerei Beispiel (Demo)", stamm: stammFuer(null, { ...basis, rolle: "bezug", zaehlpunkt: "AT0030000000000000000000000077701", plz: "5120", jahresverbrauchKwh: 24000 }), ab: `${tag(200).slice(0, 7)}-01` },
    { name: "Hofladen Demo (Demo)", stamm: stammFuer(null, { ...basis, rolle: "beides", zaehlpunkt: "AT0030000000000000000000000077702", zaehlpunktEinspeisung: "AT0030000000000000000000000077703", plz: "5122", jahresverbrauchKwh: 6000, anlageKwp: 30 }), ab: `${tag(200).slice(0, 7)}-01` },
  ].filter(Boolean);
  for (const t of tn) {
    x.teilnahmen.push({ id: neueId("ET"), egId: egAt.id, nutzerId: t.nutzer?.id || null, name: t.nutzer ? "" : t.name, status: "aktiv", anteilPct: null, beantragtAm: iso(230), angemeldetAm: iso(220), ab: t.ab, stamm: t.stamm, verlauf: [{ am: iso(230), vonId: null, text: "Beitritt beantragt", oeffentlich: true }, { am: iso(220), vonId: null, text: "Beim Netzbetreiber angemeldet", oeffentlich: true }, { am: `${t.ab}T08:00:00.000Z`, vonId: null, text: `Teilnahme aktiv ab ${t.ab.split("-").reverse().join(".")}`, oeffentlich: true }], demo: true });
  }
  // Monatsläufe der letzten vier abgeschlossenen Monate (Schätzwerte aus den Stammdaten)
  const aktuell = tag(0).slice(0, 7);
  for (let i = 4; i >= 1; i--) {
    const d = new Date(`${aktuell}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    const mon = d.toISOString().slice(0, 7);
    const ende = monatsEnde(mon);
    const teil = x.teilnahmen.filter((t) => t.egId === egAt.id && t.ab <= ende);
    if (!teil.length) continue;
    const ab = E.monatsabrechnung(egAt, mon, teil.map((t) => ({ id: t.id, nutzerId: t.nutzerId, name: t.name || nameVon(nutzerById(db, t.nutzerId)), stamm: t.stamm, anteilPct: t.anteilPct })));
    const lauf = { id: neueId("EL"), egId: egAt.id, monat: mon, erzeugungKwh: ab.erzeugungKwh, geteiltKwh: ab.geteiltKwh, ueberschussKwh: ab.ueberschussKwh, summe: ab.summe, geschaetzt: ab.geschaetzt, anzahl: ab.positionen.length, am: `${monatsEnde(mon)}T20:00:00.000Z`, vonId: null };
    x.laeufe.push(lauf);
    for (const p of ab.positionen) x.abrechnungen.push({ id: neueId("EA"), egId: egAt.id, laufId: lauf.id, monat: mon, ...p, am: lauf.am });
  }
}
