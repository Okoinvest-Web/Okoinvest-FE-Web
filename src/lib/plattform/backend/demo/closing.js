// src/lib/plattform/backend/demo/closing.js
//
// Grundbuch & Dienstbarkeiten + Deal-Abschluss (Closing) im Demo-Backend – Referenz für plattform/api/closing.py
// (Vertrag: docs/API.md, Abschnitt „Grundbuch & Closing“; Recherche: docs/GRUNDBUCH-CLOSING.md).
//
// 1. Grundbuch-Akte je Grundstück/Dach: verknüpft mit Fläche (Pacht) oder Anlage (Contracting/Dachgeber), Schrittfolge je
//    Land (closing/grundbuch.js), Fristen, Nachweise (Aktenzeichen/TZ, Upload), Unterschrift über das Signatur-Modul,
//    Kostenschätzer, Muster-Dokumente. Status wirkt auf die Anlage (dienstbarkeitStatus). Eigentümer/Dachgeber sehen nur
//    ihre eigene Akte in vereinfachter Form („Was bedeutet das für Sie?“).
// 2. Closing-Raum je Deal (nach Zuschlag bzw. angenommener LOI): Struktur, SPA-Muster, Signing-Checkliste mit KYC beider
//    Seiten, CPs mit Verantwortlichen/Fristen/Nachweisen, Notartermin, Kaufpreiszahlung (Treuhand), Übergabe, Closing →
//    Projekt „verkauft“ → Provision → Provisionsrechnung (Finanzen-Modul), Abschlussbericht.
//    Beteiligte: Käufer (Investor der Interesse) und Verkäufer (Anbieter) – Gegenseite anonym bis zur Kontaktfreigabe.
//
// Rechte: Backoffice-Bereiche „grundbuch“ und „closing“ (rechte.js); Portal nur Beteiligte bzw. Eigentümer; fremd → 403.
// Daten unter db.closing (eigene Sammlung, beim ersten Zugriff mit fiktiven Demo-Daten ergänzt).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { UPLOAD } from "../../konstanten";
import {
  GB_LAENDER, GB_OBJEKTARTEN, GB_OFFEN, GB_PORTAL_EINLEITUNG, GB_RECHTE, GB_SCHRITT_STATUS, GB_STATUS, GB_VORLAGEN, GrundbuchFehler,
  akteStatus, anlagenDienstbarkeitStatus, fortschritt, fristenBerechnen, grundbuchKosten, naechsterSchritt, rechtFuer, schritteAnlegen,
  schritteFuer, schrittPruefen, zuruecksetzenErlaubt, GB_HINWEIS,
} from "../../closing/grundbuch";
import {
  CL_HINWEIS, CL_OFFEN, CL_STATUS, CL_STRUKTUREN, CL_VERANTWORTLICH, CP_STATUS, SIGNING_PUNKTE, TREUHAND_HINWEIS, UEBERGABE_PUNKTE,
  closingPruefen, cpsAnlegen, formHinweise, kaufpreisAbleiten, meilensteineBereinigen, signingAnlegen, signingPruefen, signingStand, uebergabeAnlegen,
} from "../../closing/closing";
import { gebotGesamt } from "../../dealroom";
import { intern, statusWechsel } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, vorTagen } from "./hilfen";
import { kycStatusDb } from "./kycRegeln";
import { anbieterVorkenntnisAnerkannt } from "./anbieterRegeln"; // Anbieter: anerkannte Vorkenntnis → keine Provision

const { benachrichtigen, protokoll, nutzerById, nameVon, kurz, aktiveAdmins } = intern;

const SCHEMA = 1;
const SYSTEM = Object.freeze({ id: "SYSTEM-CLOSING", rollen: ["admin"], backofficeRollen: ["leitung"], aktiv: true, vorname: "Closing", nachname: "" });
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const lesenDarf = (n, b) => istAdmin(n) && darfLesen(n, b);
const schreibenDarf = (n, b) => istAdmin(n) && darfSchreiben(n, b);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function schreibNoetig(n, bereich, label) {
  angemeldet(n);
  if (!schreibenDarf(n, bereich)) throw verboten(istAdmin(n) ? `Ihre Backoffice-Rolle erlaubt im Bereich „${label}“ kein Schreiben.` : "Nur für das Backoffice.");
}
function leseNoetig(n, bereich) {
  angemeldet(n);
  if (!lesenDarf(n, bereich)) throw verboten("Nur für das Backoffice.");
}
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GrundbuchFehler) throw new PlattformFehler(e.status, e.message);
    if (e?.status === 422 && !(e instanceof PlattformFehler)) throw ungueltig(e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

const leer = () => ({ v: SCHEMA, akten: [], closings: [], dokumente: [] });

let vorbereitet = false;
async function lesenBereit() {
  if (!vorbereitet) {
    // Nachbarmodule einmalig befüllen lassen (eigene Transaktionen, nicht verschachteln)
    await import("./anlagen").then((m) => m.anlagen(SYSTEM)).catch(() => null);
    await import("./kyc").then((m) => m.kycStatus(null, { kontoId: "U-00-000000" })).catch(() => null);
    vorbereitet = true;
  }
  const db = await lesen();
  if (db.closing?.v === SCHEMA) return db;
  await aendern((d) => {
    if (d.closing?.v === SCHEMA) return;
    d.closing = leer();
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Grundbuch/Closing-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}
const C = (db) => db.closing;

// ================================================================ Grundbuch – Hilfen

function verlauf(o, n, text) {
  o.verlauf = o.verlauf || [];
  o.verlauf.push({ am: jetzt(), vonId: n?.id && n.id !== SYSTEM.id ? n.id : null, text: v.text(text, 300) });
}

function akteLaden(db, id) {
  const a = C(db).akten.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Grundbuch-Akte nicht gefunden.");
  return a;
}

/** Rolle an einer Akte: backoffice | eigentuemer | null */
function akteRolle(n, a) {
  if (!n || !a) return null;
  if (lesenDarf(n, "grundbuch")) return "backoffice";
  if (a.eigentuemerId && a.eigentuemerId === n.id) return "eigentuemer";
  return null;
}

function akteZugriff(db, n, id) {
  angemeldet(n);
  const a = akteLaden(db, id);
  const rolle = akteRolle(n, a);
  if (!rolle) throw verboten("Diese Grundbuch-Akte betrifft Ihr Konto nicht.");
  return { a, rolle };
}

const signaturVon = (db, id) => (id ? (db.service?.signaturen || []).find((s) => s.id === id) || null : null);

function bezugText(db, a) {
  if (a.bezugArt === "flaeche") {
    const f = db.flaechen.find((x) => x.id === a.bezugId);
    return f ? { art: "flaeche", id: f.id, titel: f.bezeichnung, status: f.status, link: `/portal/flaechen/${f.id}`, portalLink: `/portal/flaechen/${f.id}` } : null;
  }
  if (a.bezugArt === "anlage") {
    const x = (db.anlagen?.anlagen || []).find((y) => y.id === a.bezugId);
    return x ? { art: "anlage", id: x.id, titel: x.name, status: x.status, dienstbarkeitStatus: x.dienstbarkeitStatus || "", link: `/portal/admin/anlagen/${x.id}`, portalLink: `/portal/anlagen/${x.id}` } : null;
  }
  return null;
}

function akteAusgabe(db, n, a, { detail = false } = {}) {
  const rolle = akteRolle(n, a);
  const status = akteStatus(a);
  const defs = schritteFuer(a.land);
  const mitFrist = fristenBerechnen(a, { heute: heute() });
  const naechster = naechsterSchritt(a);
  const bo = rolle === "backoffice";
  const basis = {
    id: a.id, titel: a.titel, land: a.land, landLabel: GB_LAENDER[a.land], objektArt: a.objektArt, objektArtLabel: GB_OBJEKTARTEN[a.objektArt]?.kurz,
    recht: a.recht, rechtLabel: GB_RECHTE[a.land]?.[a.recht]?.label || "", status, statusLabel: GB_STATUS[status]?.label || status,
    fortschritt: fortschritt(a), naechster: naechster ? { schluessel: naechster.schluessel, label: naechster.label } : null,
    ueberfaellig: mitFrist.filter((s) => s.ueberfaellig).length,
    naechsteFrist: mitFrist.filter((s) => !["erledigt", "entfaellt"].includes(s.status) && s.fristBerechnet).map((s) => s.fristBerechnet).sort()[0] || "",
    bezug: bezugText(db, a), eigentuemerName: a.eigentuemerName, erstelltAm: a.erstelltAm, geaendertAm: a.geaendertAm, meineRolle: rolle,
  };
  if (!detail) return basis;
  const schritte = mitFrist.map((s) => {
    const d = defs.find((x) => x.schluessel === s.schluessel) || {};
    const sig = signaturVon(db, s.signaturId);
    return {
      schluessel: s.schluessel, label: d.label, status: s.status, statusLabel: GB_SCHRITT_STATUS[s.status]?.label, datum: s.datum || "", frist: s.fristBerechnet || "", ueberfaellig: s.ueberfaellig,
      optional: !!d.optional, nachweis: d.nachweis || "", nachweisLabel: d.nachweisLabel || "", nachweisWert: bo || s.schluessel === "eintragung" ? s.nachweisWert || "" : "",
      dokumentId: s.dokumentId || null, text: bo ? d.text : undefined, portal: d.portal, signaturMoeglich: bo && !!d.signatur && !!a.eigentuemerId,
      signatur: sig ? { id: sig.id, status: sig.status, titel: sig.titel } : null, notiz: bo ? s.notiz || "" : undefined,
      darfZuruecksetzen: bo && s.status === "erledigt" && zuruecksetzenErlaubt(a, s.schluessel),
    };
  });
  const kosten = grundbuchKosten({ land: a.land, entgeltJahr: a.entgeltJahr, laufzeitJahre: a.laufzeitJahre, rangruecktritt: (a.pfandglaeubiger || []).length, eigentuemer: a.eigentuemerAnzahl || 1 });
  return {
    ...basis, schritte, kosten, einleitung: GB_PORTAL_EINLEITUNG[a.land] || GB_PORTAL_EINLEITUNG.DE, hinweis: GB_HINWEIS,
    vorlagen: Object.entries(GB_VORLAGEN).filter(([, x]) => x.objektarten.includes(a.objektArt) || bo).map(([id, x]) => ({ id, label: x.label })),
    grundstueck: a.grundstueck || {}, berechtigter: a.berechtigter, entgeltJahr: a.entgeltJahr || 0, laufzeitJahre: a.laufzeitJahre || 0, laufzeitBeginn: a.laufzeitBeginn || "",
    pfandglaeubiger: bo ? a.pfandglaeubiger || [] : (a.pfandglaeubiger || []).map((g) => ({ name: g.name })),
    eigentuemerId: bo ? a.eigentuemerId || null : undefined, eigentuemerAnschrift: bo ? a.eigentuemerAnschrift || "" : undefined, eigentuemerAnzahl: a.eigentuemerAnzahl || 1,
    vertragBezug: a.vertragBezug || "", notiz: bo ? a.notiz || "" : undefined, abgebrochen: !!a.abgebrochen,
    dokumente: C(db).dokumente.filter((d) => d.aktenArt === "grundbuch" && d.akteId === a.id && (bo || d.schritt === "eintragung")).map((d) => ({ id: d.id, name: d.name, schritt: d.schritt, am: d.am, groesse: d.groesse })),
    verlauf: bo ? a.verlauf || [] : (a.verlauf || []).filter((x) => x.oeffentlich).map((x) => ({ am: x.am, text: x.text })),
    darfBearbeiten: schreibenDarf(n, "grundbuch"),
  };
}

/** Anlage (Contracting) spiegelt den Dienstbarkeitsstatus der Akte */
function anlageSpiegeln(db, a) {
  if (a.bezugArt !== "anlage") return;
  const x = (db.anlagen?.anlagen || []).find((y) => y.id === a.bezugId);
  if (!x) return;
  const st = anlagenDienstbarkeitStatus(a);
  x.dienstbarkeitStatus = st;
  const antrag = a.schritte.find((s) => s.schluessel === "antrag");
  const eintr = a.schritte.find((s) => s.schluessel === "eintragung");
  if (st === "eingetragen") x.dienstbarkeitDatum = eintr?.datum || x.dienstbarkeitDatum || heute();
  else if (st === "beantragt") x.dienstbarkeitDatum = antrag?.datum || heute();
  x.dienstbarkeitHinweis = `Grundbuch-Akte ${a.id}: ${GB_STATUS[akteStatus(a)]?.label || ""}`.slice(0, 200);
}

function stammdatenBereinigen(d = {}, alt = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(d, k);
  const o = {};
  if (has("titel")) o.titel = v.text(d.titel, 140);
  if (has("recht")) o.recht = rechtFuer(alt.land || d.land, d.recht);
  if (has("berechtigter")) o.berechtigter = v.text(d.berechtigter, 160);
  if (has("eigentuemerName")) o.eigentuemerName = v.text(d.eigentuemerName, 160);
  if (has("eigentuemerAnschrift")) o.eigentuemerAnschrift = v.text(d.eigentuemerAnschrift, 200);
  if (has("eigentuemerAnzahl")) o.eigentuemerAnzahl = Math.max(1, Math.min(20, Math.round(Number(d.eigentuemerAnzahl) || 1)));
  if (has("entgeltJahr")) o.entgeltJahr = v.zahl(d.entgeltJahr, { min: 0, max: 1e8 }) ?? 0;
  if (has("laufzeitJahre")) o.laufzeitJahre = Math.max(1, Math.min(99, Math.round(Number(d.laufzeitJahre) || 20)));
  if (has("laufzeitBeginn")) o.laufzeitBeginn = v.text(d.laufzeitBeginn, 80);
  if (has("vertragBezug")) o.vertragBezug = v.text(d.vertragBezug, 160);
  if (has("notiz")) o.notiz = v.mehrzeilig(d.notiz, 2000);
  if (has("grundstueck")) {
    const g = d.grundstueck || {};
    o.grundstueck = { bezeichnung: v.text(g.bezeichnung, 160), grundbuch: v.text(g.grundbuch, 160), flurstuecke: v.text(g.flurstuecke, 300), gebaeude: v.text(g.gebaeude, 160) };
  }
  if (has("pfandglaeubiger")) {
    o.pfandglaeubiger = (Array.isArray(d.pfandglaeubiger) ? d.pfandglaeubiger : []).slice(0, 9)
      .map((g) => ({ name: v.text(g?.name, 120), recht: v.text(g?.recht, 160), kontakt: v.text(g?.kontakt, 160) })).filter((g) => g.name.length >= 2);
  }
  return o;
}

function flurText(f) {
  return (f.flurstuecke || []).map((x) => [x.gemarkung || x.kg || x.gemeinde, x.flur, x.nummer || x.parzelle].filter(Boolean).join(" ")).join(", ");
}

// ================================================================ Grundbuch – Operationen

/** Backoffice-Liste mit Report „offene Grundbuch-Eintragungen“ */
export async function gbListe(n, { status = "", land = "", q = "" } = {}) {
  leseNoetig(n, "grundbuch");
  const db = await lesenBereit();
  const alle = C(db).akten.map((a) => akteAusgabe(db, n, a));
  const such = String(q || "").toLowerCase().slice(0, 80);
  const akten = alle
    .filter((a) => (!status || (status === "offen" ? GB_OFFEN.includes(a.status) : a.status === status)) && (!land || a.land === land))
    .filter((a) => !such || [a.id, a.titel, a.eigentuemerName, a.bezug?.titel].some((x) => String(x || "").toLowerCase().includes(such)))
    .sort((x, y) => String(x.naechsteFrist || "9999").localeCompare(String(y.naechsteFrist || "9999")));
  const offen = alle.filter((a) => GB_OFFEN.includes(a.status));
  return {
    akten,
    kennzahlen: { gesamt: alle.length, offen: offen.length, eingereicht: alle.filter((a) => a.status === "eingereicht").length, eingetragen: alle.filter((a) => a.status === "eingetragen").length, ueberfaellig: offen.filter((a) => a.ueberfaellig).length },
    bericht: offen.map((a) => ({ id: a.id, titel: a.titel, land: a.land, status: a.statusLabel, naechster: a.naechster?.label || "", frist: a.naechsteFrist, ueberfaellig: a.ueberfaellig, eigentuemer: a.eigentuemerName, bezug: a.bezug?.titel || "" })),
    schreiben: schreibenDarf(n, "grundbuch"),
  };
}

/** Eigentümer/Dachgeber: eigene Akten */
export async function gbMeine(n) {
  angemeldet(n);
  const db = await lesenBereit();
  return { akten: C(db).akten.filter((a) => a.eigentuemerId === n.id).map((a) => akteAusgabe(db, n, a)) };
}

/** Akten zu einem Bezug (Fläche/Anlage) – nur, was der Nutzer sehen darf (für Kurzanzeige an Fläche/Anlage) */
export async function gbZuBezug(n, { bezugArt, bezugId } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const id = v.kennung(bezugId);
  return { akten: C(db).akten.filter((a) => a.bezugArt === bezugArt && a.bezugId === id && akteRolle(n, a)).map((a) => akteAusgabe(db, n, a)) };
}

export async function gbAkte(n, id) {
  const db = await lesenBereit();
  const { a, rolle } = akteZugriff(db, n, id);
  // Signatur-Modul: vollständig unterschrieben → Schritt „unterschrift“ automatisch erledigen (Backoffice-Aufruf)
  const s = a.schritte.find((x) => x.schluessel === "unterschrift" && x.signaturId && x.status !== "erledigt");
  if (s && signaturVon(db, s.signaturId)?.status === "abgeschlossen" && rolle === "backoffice" && schreibenDarf(n, "grundbuch")) {
    return aendern((d) => {
      const x = akteLaden(d, id);
      const sx = x.schritte.find((y) => y.schluessel === "unterschrift");
      if (sx && sx.status !== "erledigt") {
        sx.status = "erledigt";
        sx.datum = heute();
        sx.geaendertAm = jetzt();
        verlauf(x, SYSTEM, "Unterschrift über das Signatur-Modul abgeschlossen – Schritt erledigt.");
        x.verlauf[x.verlauf.length - 1].oeffentlich = true;
        anlageSpiegeln(d, x);
      }
      return akteAusgabe(d, n, x, { detail: true });
    });
  }
  return akteAusgabe(db, n, a, { detail: true });
}

/** Auswahl für „Akte anlegen“: Flächen (ab Pachtangebot) und Anlagen mit Dienstbarkeit */
export async function gbAuswahl(n) {
  leseNoetig(n, "grundbuch");
  const db = await lesenBereit();
  const belegt = new Set(C(db).akten.filter((a) => !a.abgebrochen).map((a) => `${a.bezugArt}:${a.bezugId}`));
  const flaechen = db.flaechen.filter((f) => ["pachtangebot", "vertrag", "planung", "bau", "betrieb"].includes(f.status)).map((f) => ({
    id: f.id, titel: f.bezeichnung, land: f.land || "DE", status: f.status, eigentuemer: nameVon(db, f.nutzerId), belegt: belegt.has(`flaeche:${f.id}`), dach: f.nutzung === "dach",
  }));
  const anlagen = (db.anlagen?.anlagen || []).filter((x) => x.dienstbarkeitStatus !== "nicht_erforderlich").map((x) => ({
    id: x.id, titel: x.name, land: x.land || "DE", typ: x.typ, dienstbarkeitStatus: x.dienstbarkeitStatus || "", belegt: belegt.has(`anlage:${x.id}`), dach: ["dach", "carport"].includes(x.typ),
  }));
  return { flaechen, anlagen, laender: GB_LAENDER, rechte: GB_RECHTE, objektarten: GB_OBJEKTARTEN };
}

export async function gbAnlegen(n, daten = {}) {
  schreibNoetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten");
  const bezugArt = v.auswahl(daten.bezugArt, ["flaeche", "anlage", "frei"], "frei");
  return aendernBereit((db) => {
    let land = v.auswahl(daten.land, Object.keys(GB_LAENDER), "DE");
    let objektArt = v.auswahl(daten.objektArt, Object.keys(GB_OBJEKTARTEN), "freiflaeche");
    let eigentuemerId = null;
    let eigentuemerName = v.text(daten.eigentuemerName, 160);
    let titel = v.text(daten.titel, 140);
    let bezugId = null;
    let grundstueck = { bezeichnung: "", grundbuch: "", flurstuecke: "", gebaeude: "" };
    let ohnePfandrecht = v.wahr(daten.ohnePfandrecht);
    let entgeltJahr = v.zahl(daten.entgeltJahr, { min: 0, max: 1e8 }) ?? 0;
    let laufzeitJahre = Math.max(1, Math.min(99, Math.round(Number(daten.laufzeitJahre) || 0))) || 0;
    let vertragBezug = "";
    if (bezugArt === "flaeche") {
      const f = db.flaechen.find((x) => x.id === v.kennung(daten.bezugId));
      if (!f) throw nichtGefunden("Fläche nicht gefunden.");
      bezugId = f.id;
      land = ["DE", "AT", "CH"].includes(f.land) ? f.land : "DE";
      objektArt = f.nutzung === "dach" ? "dach" : "freiflaeche";
      eigentuemerId = f.nutzerId || null;
      eigentuemerName = eigentuemerName || nameVon(db, f.nutzerId) || "";
      titel = titel || `Dienstbarkeit ${f.bezeichnung}`;
      grundstueck = { bezeichnung: f.bezeichnung, grundbuch: f.gemarkung ? `${land === "AT" ? "KG" : "Gemarkung"} ${f.gemarkung}` : "", flurstuecke: flurText(f), gebaeude: "" };
      // Grundpfandrecht laut Fachangaben der Fläche → Rang-Schritt bleibt Pflicht
      if ((f.fach?.eigentum?.belastungen || []).includes("grundschuld")) ohnePfandrecht = false;
      const pa = f.pachtangebot || {};
      if (!entgeltJahr && pa.euroProHaJahr && f.ha) entgeltJahr = Math.round(pa.euroProHaJahr * f.ha);
      if (!laufzeitJahre && pa.laufzeitJahre) laufzeitJahre = pa.laufzeitJahre;
      const pt = (db.finanzen?.pachtvertraege || []).find((p) => p.flaecheId === f.id);
      vertragBezug = pt ? `Pachtvertrag ${pt.id}` : `Pachtangebot zur Fläche ${f.id}`;
    } else if (bezugArt === "anlage") {
      const x = (db.anlagen?.anlagen || []).find((y) => y.id === v.kennung(daten.bezugId));
      if (!x) throw nichtGefunden("Anlage nicht gefunden.");
      bezugId = x.id;
      land = ["DE", "AT", "CH"].includes(x.land) ? x.land : "DE";
      objektArt = ["dach", "carport", "speicher"].includes(x.typ) ? "dach" : "freiflaeche";
      eigentuemerId = x.dachgeberIstKunde ? x.kundeId || null : null;
      eigentuemerName = eigentuemerName || (x.dachgeberIstKunde ? (x.kundeId ? nutzerById(db, x.kundeId)?.firma || nameVon(db, x.kundeId) : "") : x.dachgeber || "");
      titel = titel || `Dienstbarkeit ${x.name}`;
      grundstueck = { bezeichnung: x.name, grundbuch: "", flurstuecke: "", gebaeude: [x.ort, x.bundesland].filter(Boolean).join(", ") };
      const cv = (db.anlagen?.vertraege || []).find((c) => c.anlageId === x.id);
      vertragBezug = cv ? `Contracting-Vertrag ${cv.id}` : "";
      if (!laufzeitJahre && cv?.laufzeitJahre) laufzeitJahre = cv.laufzeitJahre;
    } else {
      v.pflicht(titel.length >= 3, "Bitte geben Sie einen Titel an.");
      v.pflicht(eigentuemerName.length >= 2, "Bitte geben Sie den Eigentümer an.");
      if (daten.eigentuemerEmail) {
        const u = db.nutzer.find((x) => x.email === v.email(daten.eigentuemerEmail));
        if (u) eigentuemerId = u.id;
      }
    }
    if (C(db).akten.some((a) => bezugId && a.bezugArt === bezugArt && a.bezugId === bezugId && !a.abgebrochen)) throw konflikt("Für dieses Objekt gibt es bereits eine Grundbuch-Akte.");
    const st = stammdatenBereinigen(daten, { land });
    if ((st.pfandglaeubiger || []).length) ohnePfandrecht = false;
    const a = {
      id: neueId("GR"), titel, land, objektArt, recht: rechtFuer(land, daten.recht), bezugArt, bezugId, eigentuemerId, eigentuemerName, eigentuemerAnschrift: st.eigentuemerAnschrift || "", eigentuemerAnzahl: st.eigentuemerAnzahl || 1,
      grundstueck: st.grundstueck?.grundbuch || st.grundstueck?.flurstuecke ? { ...grundstueck, ...Object.fromEntries(Object.entries(st.grundstueck).filter(([, w]) => w)) } : grundstueck,
      berechtigter: st.berechtigter || "ÖkoInvest GmbH", entgeltJahr, laufzeitJahre: laufzeitJahre || 25, laufzeitBeginn: st.laufzeitBeginn || "Inbetriebnahme", vertragBezug: st.vertragBezug || vertragBezug,
      pfandglaeubiger: st.pfandglaeubiger || [], notiz: st.notiz || "", abgebrochen: false,
      schritte: schritteAnlegen(land, { ohnePfandrecht }), verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt(), erstelltVon: n.id,
    };
    verlauf(a, n, `Akte angelegt (${GB_LAENDER[land]}, ${GB_OBJEKTARTEN[objektArt].kurz}).`);
    C(db).akten.push(a);
    anlageSpiegeln(db, a);
    protokoll(db, n, "grundbuch_anlegen", "grundbuch", a.id, `Grundbuch-Akte „${a.titel}“ angelegt`);
    if (a.eigentuemerId) benachrichtigen(db, nutzerById(db, a.eigentuemerId), { art: "status", titel: "Grundbuch: Eintragung der Dienstbarkeit vorbereitet", text: `${a.titel} – Sie sehen jeden Schritt im Portal.`, link: `/portal/grundbuch/${a.id}`, objektArt: "grundbuch", objektId: a.id }, { mailText: "Für Ihre Fläche bzw. Ihr Dach wird die Eintragung der Dienstbarkeit vorbereitet. Den Stand und die nächsten Schritte sehen Sie im Portal." });
    return akteAusgabe(db, n, a, { detail: true });
  });
}

export async function gbAendern(n, id, daten = {}) {
  schreibNoetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten");
  return aendernBereit((db) => {
    const a = akteLaden(db, id);
    if (a.abgebrochen && !v.wahr(daten.wiederaufnehmen)) throw konflikt("Die Akte ist abgebrochen.");
    const o = stammdatenBereinigen(daten, a);
    Object.assign(a, o);
    if (Object.prototype.hasOwnProperty.call(daten, "abgebrochen")) {
      const ab = v.wahr(daten.abgebrochen);
      if (ab && akteStatus(a) === "eingetragen") throw konflikt("Eine eingetragene Dienstbarkeit wird über die Löschung beendet, nicht durch Abbruch.");
      if (ab) v.pflicht(v.text(daten.grund, 300).length >= 5, "Bitte geben Sie einen Grund für den Abbruch an.");
      a.abgebrochen = ab;
      verlauf(a, n, ab ? `Akte abgebrochen: ${v.text(daten.grund, 300)}` : "Akte wieder aufgenommen.");
    } else verlauf(a, n, `Stammdaten geändert (${Object.keys(o).join(", ") || "–"}).`);
    a.geaendertAm = jetzt();
    anlageSpiegeln(db, a);
    return akteAusgabe(db, n, a, { detail: true });
  });
}

/** Schritt setzen: { schluessel, status, datum?, nachweisWert?, notiz?, frist? } */
export async function gbSchritt(n, id, daten = {}) {
  schreibNoetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten");
  return aendernBereit((db) => {
    const a = akteLaden(db, id);
    if (a.abgebrochen) throw konflikt("Die Akte ist abgebrochen.");
    const schluessel = String(daten.schluessel || "");
    const alt = a.schritte.find((s) => s.schluessel === schluessel);
    if (!alt) throw ungueltig("Unbekannter Schritt.");
    if (alt.status === "erledigt" && daten.status && daten.status !== "erledigt" && !zuruecksetzenErlaubt(a, schluessel)) throw konflikt("Ein nachfolgender Schritt ist bereits erledigt – bitte zuerst diesen zurücksetzen.");
    const neu = fach(() => schrittPruefen(a, { schluessel, status: daten.status, datum: daten.datum, nachweisWert: daten.nachweisWert, notiz: daten.notiz }, { heute: heute() }));
    if (daten.frist !== undefined) neu.frist = /^20\d\d-\d\d-\d\d$/.test(String(daten.frist || "")) ? daten.frist : "";
    neu.vonId = n.id;
    neu.geaendertAm = jetzt();
    Object.assign(alt, neu);
    const def = schritteFuer(a.land).find((d) => d.schluessel === schluessel);
    verlauf(a, n, `${def.label}: ${GB_SCHRITT_STATUS[neu.status].label}${neu.nachweisWert ? ` (${neu.nachweisWert})` : ""}`);
    if (neu.status === "erledigt") a.verlauf[a.verlauf.length - 1].oeffentlich = true;
    a.geaendertAm = jetzt();
    const vorher = a.statusGemeldet || "";
    const st = akteStatus(a);
    anlageSpiegeln(db, a);
    if (st !== vorher && a.eigentuemerId && ["eingereicht", "eingetragen"].includes(st)) {
      a.statusGemeldet = st;
      benachrichtigen(db, nutzerById(db, a.eigentuemerId), { art: "status", titel: st === "eingetragen" ? "Grundbuch: Dienstbarkeit eingetragen" : "Grundbuch: Eintragung beantragt", text: a.titel, link: `/portal/grundbuch/${a.id}`, objektArt: "grundbuch", objektId: a.id }, { mailText: st === "eingetragen" ? "Die Dienstbarkeit ist im Grundbuch eingetragen. Details im Portal." : "Die Eintragung der Dienstbarkeit wurde beim Grundbuch beantragt. Details im Portal." });
    }
    protokoll(db, n, "grundbuch_schritt", "grundbuch", a.id, `${schluessel} → ${neu.status}`);
    return akteAusgabe(db, n, a, { detail: true });
  });
}

/** Unterschrift über das Signatur-Modul (Muster-PDF wird von der Website erzeugt und übergeben) */
export async function gbSignatur(n, id, { pdf, dateiname = "", ip = "" } = {}) {
  schreibNoetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten");
  const db = await lesenBereit();
  const a = akteLaden(db, id);
  if (a.abgebrochen) throw konflikt("Die Akte ist abgebrochen.");
  if (!a.eigentuemerId) throw konflikt("Für die elektronische Unterschrift braucht der Eigentümer ein Portal-Konto – sonst bitte das unterschriebene Dokument hochladen.");
  const s = a.schritte.find((x) => x.schluessel === "unterschrift");
  if (!s) throw konflikt("In diesem Land wird der Vertrag bei der öffentlichen Beurkundung unterschrieben.");
  if (s.status === "erledigt") throw konflikt("Der Vertrag ist bereits unterschrieben.");
  const vertrag = a.schritte.find((x) => x.schluessel === "vertrag");
  if (vertrag?.status !== "erledigt") throw konflikt("Zuerst den Vertrag als erstellt markieren.");
  const offen = s.signaturId ? signaturVon(db, s.signaturId) : null;
  if (offen && offen.status === "laufend") throw konflikt("Es läuft bereits ein Signaturvorgang für diesen Vertrag.");
  const service = await import("./service");
  const bezug = a.bezugArt === "flaeche" ? { bezugArt: "flaeche", bezugId: a.bezugId } : {};
  const sig = await service.signaturAnlegen(n, {
    titel: `${a.objektArt === "dach" ? "Dachnutzungs- und Servitutsvertrag" : "Dienstbarkeitsvertrag"} – ${a.titel}`.slice(0, 160), art: "sonstiges", pdf, dateiname: dateiname || `${a.id}-vertrag.pdf`,
    unterzeichner: [{ kontoId: a.eigentuemerId }], fristTage: 21, reihenfolge: true, ...bezug,
    nachricht: "Bitte prüfen und unterschreiben Sie den Vertrag. Hinweis: Für das Grundbuch ist zusätzlich eine beglaubigte Unterschrift beim Notar nötig – dazu melden wir uns.",
  }, { ip });
  return aendern((d) => {
    const x = akteLaden(d, id);
    const sx = x.schritte.find((y) => y.schluessel === "unterschrift");
    sx.signaturId = sig.id;
    sx.status = "in_arbeit";
    sx.geaendertAm = jetzt();
    verlauf(x, n, `Vertrag zur elektronischen Unterschrift gesendet (Signaturvorgang ${sig.id}).`);
    x.verlauf[x.verlauf.length - 1].oeffentlich = true;
    return { akte: akteAusgabe(d, n, x, { detail: true }), signaturId: sig.id };
  });
}

export async function gbDokumentSpeichern(n, id, { schritt = "", name = "", mime = "", daten } = {}) {
  schreibNoetig(n, "grundbuch", "Grundbuch & Dienstbarkeiten");
  if (!UPLOAD.typen[mime]) throw ungueltig("Erlaubt sind PDF, JPG und PNG.");
  if (!daten?.length || daten.length > UPLOAD.maxBytes) throw ungueltig("Die Datei ist leer oder größer als 10 MB.");
  const db = await lesenBereit();
  const a = akteLaden(db, id);
  if (!a.schritte.some((s) => s.schluessel === schritt)) throw ungueltig("Bitte wählen Sie den Schritt, zu dem der Nachweis gehört.");
  const datei = `${neueId("GD")}.${UPLOAD.typen[mime]}`;
  await uploadSchreiben(datei, daten);
  return aendern((d) => {
    const x = akteLaden(d, id);
    const dok = { id: neueId("GD"), aktenArt: "grundbuch", akteId: x.id, schritt, name: v.text(name, 120) || datei, mime, datei, groesse: daten.length, am: jetzt(), vonId: n.id };
    C(d).dokumente.push(dok);
    const s = x.schritte.find((y) => y.schluessel === schritt);
    s.dokumentId = dok.id;
    s.geaendertAm = jetzt();
    verlauf(x, n, `Nachweis hochgeladen (${dok.name}) zu „${schritt}“.`);
    protokoll(d, n, "grundbuch_dokument", "grundbuch", x.id, `Nachweis ${dok.name}`);
    return { id: dok.id, name: dok.name, schritt, am: dok.am, groesse: dok.groesse };
  });
}

export async function gbDokumentLesen(n, id, dokId, { ip = "" } = {}) {
  const db = await lesenBereit();
  const { a, rolle } = akteZugriff(db, n, id);
  const d = C(db).dokumente.find((x) => x.id === v.kennung(dokId) && x.aktenArt === "grundbuch" && x.akteId === a.id);
  if (!d || (rolle !== "backoffice" && d.schritt !== "eintragung")) throw nichtGefunden("Dokument nicht gefunden.");
  await aendern((x) => protokoll(x, n, "grundbuch_download", "grundbuch", a.id, `Download ${d.name}`, ip));
  return { name: d.name, mime: d.mime, daten: await uploadLesen(d.datei) };
}

/** Daten für ein Muster-Dokument (PDF erzeugt die Website) – Backoffice oder Eigentümer der Akte */
export async function gbMusterDaten(n, id, { vorlage = "", ip = "" } = {}) {
  const db = await lesenBereit();
  const { a } = akteZugriff(db, n, id);
  const vl = GB_VORLAGEN[vorlage] ? vorlage : a.objektArt === "dach" ? "dachnutzung_servitut" : "dienstbarkeit_freiflaeche";
  await aendern((x) => protokoll(x, n, "grundbuch_muster", "grundbuch", a.id, `Muster ${vl}`, ip));
  return { vorlage: vl, akte: { ...a, verlauf: undefined, eigentuemerId: undefined, schritte: undefined } };
}

/** Frist-Erinnerungen (Frappe: Scheduler täglich) – meldet überfällige Schritte an das Backoffice */
export async function gbFristenLauf(n) {
  if (n) leseNoetig(n, "grundbuch");
  const db = await lesenBereit();
  const faellig = [];
  for (const a of C(db).akten.filter((x) => !x.abgebrochen && GB_OFFEN.includes(akteStatus(x)))) {
    for (const s of fristenBerechnen(a, { heute: heute() }).filter((x) => x.ueberfaellig)) faellig.push({ akteId: a.id, titel: a.titel, schritt: s.schluessel, frist: s.fristBerechnet });
  }
  return { faellig, anzahl: faellig.length };
}

// ================================================================ Closing – Hilfen

function closingLaden(db, id) {
  const c = C(db).closings.find((x) => x.id === v.kennung(id));
  if (!c) throw nichtGefunden("Closing nicht gefunden.");
  return c;
}

const kontaktFrei = (db, c) => (db.dealroom?.freigaben || []).some((f) => f.projektId === c.projektId && f.interesseId === c.interesseId);

/** Rolle am Closing: backoffice | kaeufer | verkaeufer | null */
function closingRolle(db, n, c) {
  if (!n || !c) return null;
  if (lesenDarf(n, "closing")) return "backoffice";
  if (c.kaeuferId === n.id) return "kaeufer";
  if (c.verkaeuferId === n.id) return "verkaeufer";
  return null;
}

function closingZugriff(db, n, id) {
  angemeldet(n);
  const c = closingLaden(db, id);
  const rolle = closingRolle(db, n, c);
  if (!rolle) throw verboten("Dieser Deal betrifft Ihr Konto nicht.");
  return { c, rolle };
}

function kycFuer(db, c) {
  const p = db.projekte.find((x) => x.id === c.projektId);
  const i = db.interessen.find((x) => x.id === c.interesseId);
  const k = kycStatusDb(db, { kontoId: c.kaeuferId, organisationId: i?.organisationId || null });
  const vk = kycStatusDb(db, { kontoId: c.verkaeuferId, organisationId: p?.organisationId || null });
  return { kycKaeufer: !!k.verifiziert, kycVerkaeufer: !!vk.verifiziert, kaeuferStatus: k.status, verkaeuferStatus: vk.status, kontaktFrei: kontaktFrei(db, c) };
}

function parteiAnzeige(db, kontoId, { sichtbar, rolleText }) {
  const u = nutzerById(db, kontoId);
  if (!sichtbar || !u) return { anzeige: `${rolleText} (anonym bis zur Kontaktfreigabe)`, anonym: true };
  return { anzeige: [u.firma, nameVon(db, u.id)].filter(Boolean).join(" – "), name: nameVon(db, u.id), firma: u.firma || "", email: u.email, anonym: false };
}

function closingAusgabe(db, n, c, { detail = false } = {}) {
  const rolle = closingRolle(db, n, c);
  const bo = rolle === "backoffice";
  const p = db.projekte.find((x) => x.id === c.projektId);
  const kyc = kycFuer(db, c);
  const kaeufer = parteiAnzeige(db, c.kaeuferId, { sichtbar: bo || rolle === "kaeufer" || kyc.kontaktFrei, rolleText: "Käufer" });
  const verkaeufer = parteiAnzeige(db, c.verkaeuferId, { sichtbar: bo || rolle === "verkaeufer" || kyc.kontaktFrei, rolleText: "Verkäufer" });
  const cpsOffen = (c.cps || []).filter((x) => !["erfuellt", "verzichtet"].includes(x.status)).length;
  const basis = {
    id: c.id, projekt: p ? { id: p.id, titel: p.titel, mwp: p.mwp, land: p.land, typ: p.typ, status: p.status } : null, struktur: c.struktur, strukturLabel: CL_STRUKTUREN[c.struktur]?.label,
    status: c.status, statusLabel: CL_STATUS[c.status]?.label, land: c.land, kaufpreis: c.kaufpreis, kaufpreisQuelle: c.kaufpreisQuelle, herkunft: c.herkunft,
    kaeufer: bo ? { ...kaeufer, id: c.kaeuferId } : kaeufer, verkaeufer: bo ? { ...verkaeufer, id: c.verkaeuferId } : verkaeufer,
    cpsOffen, cpsGesamt: (c.cps || []).length, notarTermin: c.notar?.termin || "", signingAm: c.signingAm || "", vollzogenAm: c.vollzogenAm || "",
    meineRolle: rolle, kontaktFrei: kyc.kontaktFrei, erstelltAm: c.erstelltAm, geaendertAm: c.geaendertAm,
  };
  if (!detail) return basis;
  const verantwortlichIch = rolle === "kaeufer" ? "kaeufer" : rolle === "verkaeufer" ? "verkaeufer" : null;
  const sig = signingPruefen(c, kyc);
  const cl = closingPruefen(c, kyc);
  const provision = c.provisionId ? db.provisionen.find((x) => x.id === c.provisionId) : null;
  const beleg = c.provisionId ? (db.finanzen?.belege || []).find((b) => b.schluessel === `PV:${c.provisionId}` && b.status !== "storniert") : null;
  return {
    ...basis,
    spvName: c.spvName || "", spvGesellschaftId: bo ? c.spvGesellschaftId || null : undefined, anteilProzent: c.anteilProzent || 100,
    meilensteine: c.meilensteine || [], earnOut: c.earnOut || "",
    signingStand: signingStand(c, kyc).map((x) => ({ ...x, notiz: bo ? x.notiz : undefined })),
    kyc: { kaeufer: kyc.kycKaeufer, verkaeufer: kyc.kycVerkaeufer, kaeuferStatus: bo || rolle === "kaeufer" ? kyc.kaeuferStatus : undefined, verkaeuferStatus: bo || rolle === "verkaeufer" ? kyc.verkaeuferStatus : undefined },
    signingPruefung: bo ? sig : { ok: sig.ok, gruende: [] }, closingPruefung: bo ? cl : { ok: cl.ok, gruende: [] },
    cps: (c.cps || []).map((x) => ({ ...x, verantwortlichLabel: CL_VERANTWORTLICH[x.verantwortlich], statusLabel: CP_STATUS[x.status]?.label, darfMelden: !!verantwortlichIch && x.verantwortlich === verantwortlichIch && x.status === "offen", vonId: bo ? x.vonId : undefined, gemeldetVonId: bo ? x.gemeldetVonId : undefined })),
    notar: c.notar || {}, zahlung: { ...(c.zahlung || {}), hinweis: TREUHAND_HINWEIS[c.land] || TREUHAND_HINWEIS.DE },
    uebergabe: UEBERGABE_PUNKTE.map((u) => ({ ...u, ...((c.uebergabe || []).find((x) => x.schluessel === u.schluessel) || {}) })),
    formHinweise: formHinweise(c.struktur, c.land), hinweis: CL_HINWEIS,
    provision: provision && (bo || rolle === "verkaeufer") ? { id: provision.id, betrag: provision.betrag, satz: provision.satz, status: provision.status } : null,
    provisionEntfallen: c.provisionEntfallen && (bo || rolle === "verkaeufer") ? { grund: c.provisionEntfallen.grund } : null,
    rechnung: beleg && (bo || rolle === "verkaeufer") ? { id: beleg.id, nummer: beleg.nummer, status: beleg.status, brutto: beleg.brutto ?? beleg.betrag ?? null } : null,
    verlauf: bo ? c.verlauf || [] : (c.verlauf || []).filter((x) => x.oeffentlich).map((x) => ({ am: x.am, text: x.text })),
    notizIntern: bo ? c.notizIntern || "" : undefined,
    darfBearbeiten: schreibenDarf(n, "closing") && CL_OFFEN.includes(c.status),
    darfUebergabe: schreibenDarf(n, "closing") && c.status === "vollzogen",
  };
}

function beteiligteMelden(db, c, { titel, text }) {
  for (const id of [c.kaeuferId, c.verkaeuferId]) {
    const u = nutzerById(db, id);
    if (u) benachrichtigen(db, u, { art: "status", titel, text, link: `/portal/closing/${c.id}`, objektArt: "closing", objektId: c.id }, { mailText: `${text} Details im Portal (Closing-Raum).` });
  }
}
function oeffentlich(c, n, text) {
  verlauf(c, n, text);
  c.verlauf[c.verlauf.length - 1].oeffentlich = true;
}

// ================================================================ Closing – Operationen

/** Kandidaten: Zuschlag im Bieterverfahren bzw. angenommene LOI ohne Closing */
function kandidaten(db) {
  const belegt = new Set(C(db).closings.filter((c) => c.status !== "abgebrochen").map((c) => c.interesseId));
  const out = [];
  for (const i of db.interessen.filter((x) => x.status === "loi_angenommen" && !belegt.has(x.id))) {
    const p = db.projekte.find((x) => x.id === i.projektId);
    if (!p || !["veroeffentlicht", "reserviert"].includes(p.status)) continue;
    const vf = (db.dealroom?.verfahren || []).find((x) => x.projektId === p.id && x.zuschlag?.interesseId === i.id);
    const g = vf ? (db.dealroom?.gebote || []).find((x) => x.id === vf.zuschlag.gebotId) : null;
    const kp = kaufpreisAbleiten({ gebotGesamt: vf?.zuschlag?.preisGesamt ?? (g ? gebotGesamt(g, p.mwp) : null), loi: i.loi, mwp: p.mwp });
    out.push({ projektId: p.id, interesseId: i.id, projekt: p.titel, land: p.land, mwp: p.mwp, herkunft: vf ? "zuschlag" : "loi", kaufpreis: kp.betrag, investor: kurz(nutzerById(db, i.investorId)), struktur: i.loi?.transaktion || "" });
  }
  return out;
}

export async function clListe(n, { status = "" } = {}) {
  leseNoetig(n, "closing");
  const db = await lesenBereit();
  const alle = C(db).closings.map((c) => closingAusgabe(db, n, c));
  return {
    closings: alle.filter((c) => !status || (status === "offen" ? CL_OFFEN.includes(c.status) : c.status === status)).sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm))),
    kandidaten: kandidaten(db),
    kennzahlen: { offen: alle.filter((c) => CL_OFFEN.includes(c.status)).length, signing: alle.filter((c) => c.status === "signing").length, vollzogen: alle.filter((c) => c.status === "vollzogen").length, volumen: alle.filter((c) => c.status === "vollzogen").reduce((s, c) => s + (c.kaufpreis || 0), 0) },
    schreiben: schreibenDarf(n, "closing"),
  };
}

export async function clMeine(n) {
  angemeldet(n);
  const db = await lesenBereit();
  return { closings: C(db).closings.filter((c) => c.kaeuferId === n.id || c.verkaeuferId === n.id).map((c) => closingAusgabe(db, n, c)) };
}

export async function clAkte(n, id) {
  const db = await lesenBereit();
  const { c } = closingZugriff(db, n, id);
  return closingAusgabe(db, n, c, { detail: true });
}

/** Closing anlegen: { projektId, interesseId, struktur?, spvName?, spvGesellschaftId?, anteilProzent?, kaufpreis? } */
export async function clAnlegen(n, daten = {}) {
  schreibNoetig(n, "closing", "Deal-Abschluss (Closing)");
  return aendernBereit((db) => {
    const p = db.projekte.find((x) => x.id === v.kennung(daten.projektId));
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    const i = db.interessen.find((x) => x.id === v.kennung(daten.interesseId) && x.projektId === p.id);
    if (!i) throw nichtGefunden("Interessent nicht gefunden.");
    const vf = (db.dealroom?.verfahren || []).find((x) => x.projektId === p.id && x.zuschlag?.interesseId === i.id);
    if (i.status !== "loi_angenommen" && !vf) throw konflikt("Ein Closing setzt einen Zuschlag im Bieterverfahren oder eine angenommene LOI voraus.");
    if (!["veroeffentlicht", "reserviert"].includes(p.status)) throw konflikt("Das Projekt ist nicht mehr in der Vermarktung.");
    if (C(db).closings.some((c) => c.projektId === p.id && c.status !== "abgebrochen")) throw konflikt("Für dieses Projekt gibt es bereits einen Closing-Raum.");
    const g = vf ? (db.dealroom?.gebote || []).find((x) => x.id === vf.zuschlag.gebotId) : null;
    const kp = kaufpreisAbleiten({ gebotGesamt: vf?.zuschlag?.preisGesamt ?? (g ? gebotGesamt(g, p.mwp) : null), loi: i.loi, mwp: p.mwp });
    const eigenerPreis = v.zahl(daten.kaufpreis, { min: 1, max: 1e11 });
    const struktur = v.auswahl(daten.struktur, Object.keys(CL_STRUKTUREN), ["asset", "share"].includes(i.loi?.transaktion) ? i.loi.transaktion : "share");
    const c = {
      id: neueId("CL"), projektId: p.id, interesseId: i.id, verfahrenId: vf?.id || null, herkunft: vf ? "zuschlag" : "loi", kaeuferId: i.investorId, verkaeuferId: p.anbieterId,
      land: ["DE", "AT", "CH"].includes(p.land) ? p.land : "DE", struktur, spvName: v.text(daten.spvName, 160), spvGesellschaftId: v.kennung(daten.spvGesellschaftId) || null,
      anteilProzent: Math.max(1, Math.min(100, Number(daten.anteilProzent) || 100)), kaufpreis: eigenerPreis || kp.betrag, kaufpreisQuelle: eigenerPreis ? "vereinbart" : kp.quelle,
      meilensteine: [], earnOut: i.loi?.zahlung && i.loi.zahlung !== "einmal" ? v.text(i.loi.zahlungDetails, 400) : "",
      status: "vorbereitung", signing: { punkte: signingAnlegen() }, cps: cpsAnlegen(struktur, { loiBedingungen: i.loi?.bedingungenListe || [], heute: heute() }),
      notar: {}, zahlung: { treuhand: struktur === "asset" || p.land === "DE", betrag: null, faelligAm: "", eingangAm: "" }, uebergabe: uebergabeAnlegen(),
      provisionId: null, verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt(), erstelltVon: n.id,
    };
    oeffentlich(c, n, `Closing-Raum eröffnet (${c.herkunft === "zuschlag" ? "Zuschlag im Bieterverfahren" : "angenommene LOI"}, ${CL_STRUKTUREN[struktur].label}).`);
    C(db).closings.push(c);
    protokoll(db, n, "closing_anlegen", "projekt", p.id, `Closing ${c.id} eröffnet (Interesse ${i.id})`);
    beteiligteMelden(db, c, { titel: `Closing-Raum eröffnet: ${p.titel}`, text: "Der Deal-Abschluss wird vorbereitet – Checkliste, Bedingungen und Termine sehen Sie im Closing-Raum." });
    return closingAusgabe(db, n, c, { detail: true });
  });
}

/** Stammdaten: { struktur?, kaufpreis?, spvName?, spvGesellschaftId?, anteilProzent?, meilensteine?, earnOut?, notar?, zahlung?, notizIntern? } */
export async function clAendern(n, id, daten = {}) {
  schreibNoetig(n, "closing", "Deal-Abschluss (Closing)");
  return aendernBereit((db) => {
    const c = closingLaden(db, id);
    if (!CL_OFFEN.includes(c.status)) throw konflikt("Der Closing-Raum ist abgeschlossen.");
    const has = (k) => Object.prototype.hasOwnProperty.call(daten, k);
    const geaendert = [];
    if (has("struktur") && daten.struktur !== c.struktur) {
      if (c.status !== "vorbereitung") throw konflikt("Die Struktur kann nach dem Signing nicht mehr geändert werden.");
      const s = v.auswahl(daten.struktur, Object.keys(CL_STRUKTUREN), "");
      if (!s) throw ungueltig("Unbekannte Struktur.");
      const i = db.interessen.find((x) => x.id === c.interesseId);
      const erledigt = new Map(c.cps.filter((x) => x.status !== "offen").map((x) => [x.schluessel, x]));
      c.struktur = s;
      c.cps = cpsAnlegen(s, { loiBedingungen: i?.loi?.bedingungenListe || [], heute: heute() }).map((x) => erledigt.get(x.schluessel) || x);
      geaendert.push("Struktur");
    }
    if (has("kaufpreis")) {
      if (c.status !== "vorbereitung") throw konflikt("Der Kaufpreis ist mit dem Signing festgelegt.");
      const kp = v.zahl(daten.kaufpreis, { min: 1, max: 1e11 });
      v.pflicht(kp, "Bitte einen gültigen Kaufpreis angeben.");
      c.kaufpreis = Math.round(kp);
      c.kaufpreisQuelle = "vereinbart";
      geaendert.push("Kaufpreis");
    }
    if (has("spvName")) c.spvName = v.text(daten.spvName, 160);
    if (has("spvGesellschaftId")) c.spvGesellschaftId = v.kennung(daten.spvGesellschaftId) || null;
    if (has("anteilProzent")) c.anteilProzent = Math.max(1, Math.min(100, Number(daten.anteilProzent) || 100));
    if (has("earnOut")) c.earnOut = v.mehrzeilig(daten.earnOut, 1000);
    if (has("meilensteine")) {
      c.meilensteine = fach(() => meilensteineBereinigen(daten.meilensteine, c.kaufpreis));
      geaendert.push("Meilensteine");
    }
    if (has("notar")) {
      const x = daten.notar || {};
      const termin = x.termin ? new Date(x.termin) : null;
      if (x.termin && Number.isNaN(termin?.getTime())) throw ungueltig("Ungültiger Notartermin.");
      c.notar = { name: v.text(x.name, 120), kanzlei: v.text(x.kanzlei, 160), email: x.email ? v.email(x.email) : "", telefon: v.text(x.telefon, 40), ort: v.text(x.ort, 200), termin: termin ? termin.toISOString() : "", notiz: v.text(x.notiz, 300) };
      if (c.notar.termin) oeffentlich(c, n, `Notartermin: ${new Date(c.notar.termin).toLocaleString("de-AT", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}${c.notar.ort ? `, ${c.notar.ort}` : ""}.`);
      geaendert.push("Notar");
    }
    if (has("zahlung")) {
      const z = daten.zahlung || {};
      c.zahlung = { ...c.zahlung, treuhand: v.wahr(z.treuhand), kontoHinweis: v.text(z.kontoHinweis, 200), faelligAm: /^20\d\d-\d\d-\d\d$/.test(String(z.faelligAm || "")) ? z.faelligAm : "" };
      geaendert.push("Zahlung");
    }
    if (has("notizIntern")) c.notizIntern = v.mehrzeilig(daten.notizIntern, 3000);
    c.geaendertAm = jetzt();
    if (geaendert.length) verlauf(c, n, `Geändert: ${geaendert.join(", ")}.`);
    return closingAusgabe(db, n, c, { detail: true });
  });
}

/**
 * Aktion im Closing-Raum (Backoffice):
 *   signing_punkt { schluessel, erledigt, notiz } · signing · cp { schluessel, status, nachweis } · cp_neu { label, verantwortlich, frist, text }
 *   zahlung_eingang { datum, betrag } · closing · uebergabe { schluessel, erledigt, notiz } · abbrechen { grund }
 */
export async function clAktion(n, id, daten = {}) {
  schreibNoetig(n, "closing", "Deal-Abschluss (Closing)");
  const aktion = v.auswahl(daten.aktion, ["signing_punkt", "signing", "cp", "cp_neu", "zahlung_eingang", "closing", "uebergabe", "abbrechen"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  if (aktion === "closing") return closingVollziehen(n, id, daten);
  return aendernBereit((db) => {
    const c = closingLaden(db, id);
    const p = db.projekte.find((x) => x.id === c.projektId);
    if (aktion === "uebergabe") {
      if (c.status !== "vollzogen") throw konflikt("Die Übergabe folgt nach dem Closing.");
      const u = c.uebergabe.find((x) => x.schluessel === daten.schluessel);
      if (!u) throw ungueltig("Unbekannter Punkt.");
      u.erledigt = v.wahr(daten.erledigt);
      u.am = u.erledigt ? heute() : "";
      u.vonId = n.id;
      u.notiz = v.text(daten.notiz, 300);
      verlauf(c, n, `Übergabe: ${UEBERGABE_PUNKTE.find((x) => x.schluessel === u.schluessel)?.label} ${u.erledigt ? "erledigt" : "offen"}.`);
    } else {
      if (!CL_OFFEN.includes(c.status)) throw konflikt("Der Closing-Raum ist abgeschlossen.");
      if (aktion === "signing_punkt") {
        const def = SIGNING_PUNKTE.find((x) => x.schluessel === daten.schluessel);
        if (!def) throw ungueltig("Unbekannter Punkt.");
        if (def.auto) throw konflikt("Dieser Punkt wird automatisch aus dem KYC-Modul gesetzt.");
        if (c.status !== "vorbereitung") throw konflikt("Das Signing ist bereits erfolgt.");
        const s = c.signing.punkte.find((x) => x.schluessel === def.schluessel);
        s.erledigt = v.wahr(daten.erledigt);
        s.am = s.erledigt ? heute() : "";
        s.vonId = n.id;
        s.notiz = v.text(daten.notiz, 300);
        verlauf(c, n, `Signing-Checkliste: ${def.label} ${s.erledigt ? "erledigt" : "offen"}.`);
      } else if (aktion === "signing") {
        const kyc = kycFuer(db, c);
        const pr = signingPruefen(c, kyc);
        if (!kyc.kontaktFrei) pr.gruende.push("Kontaktfreigabe (Deal-Room) fehlt – vor dem Signing müssen sich die Parteien namentlich kennen.");
        if (pr.gruende.length) throw new PlattformFehler(409, `Signing nicht möglich: ${pr.gruende.join(" ")}`, kyc.kycKaeufer && kyc.kycVerkaeufer ? "signing" : "kyc");
        c.status = "signing";
        c.signingAm = /^20\d\d-\d\d-\d\d$/.test(String(daten.datum || "")) && daten.datum <= heute() ? daten.datum : heute();
        oeffentlich(c, n, "Signing bestätigt – Kaufvertrag unterzeichnet. Jetzt folgen die Closing Conditions.");
        beteiligteMelden(db, c, { titel: `Signing bestätigt: ${p?.titel || ""}`, text: "Der Kaufvertrag ist unterzeichnet. Offene Bedingungen und Fristen sehen Sie im Closing-Raum." });
      } else if (aktion === "cp") {
        const x = c.cps.find((y) => y.schluessel === daten.schluessel);
        if (!x) throw ungueltig("Unbekannte Bedingung.");
        const st = v.auswahl(daten.status, Object.keys(CP_STATUS), "");
        if (!st) throw ungueltig("Unbekannter Status.");
        const nachweis = v.text(daten.nachweis ?? x.nachweis, 300);
        if (st === "erfuellt") v.pflicht(nachweis.length >= 3, "Bitte einen Nachweis angeben (z. B. Dokument, Datum, Aktenzeichen).");
        if (st === "verzichtet") v.pflicht(v.text(daten.nachweis, 300).length >= 5, "Bitte den Verzicht begründen (wer hat verzichtet, Datum).");
        x.status = st;
        x.nachweis = nachweis;
        x.erfuelltAm = ["erfuellt", "verzichtet"].includes(st) ? heute() : "";
        x.vonId = n.id;
        if (daten.frist && /^20\d\d-\d\d-\d\d$/.test(daten.frist)) x.frist = daten.frist;
        oeffentlich(c, n, `Bedingung „${x.label}“: ${CP_STATUS[st].label}.`);
      } else if (aktion === "cp_neu") {
        const label = v.text(daten.label, 160);
        v.pflicht(label.length >= 5, "Bitte die Bedingung beschreiben (mind. 5 Zeichen).");
        const ver = v.auswahl(daten.verantwortlich, Object.keys(CL_VERANTWORTLICH), "oekoinvest");
        c.cps.push({ schluessel: `eigen_${c.cps.length + 1}`, reihenfolge: c.cps.length + 1, label, text: v.text(daten.text, 300), verantwortlich: ver, frist: /^20\d\d-\d\d-\d\d$/.test(String(daten.frist || "")) ? daten.frist : "", status: "offen", nachweis: "", erfuelltAm: "", vonId: n.id, gemeldetVonId: null });
        oeffentlich(c, n, `Neue Bedingung: ${label}.`);
      } else if (aktion === "zahlung_eingang") {
        if (c.status !== "signing") throw konflikt("Der Kaufpreis wird nach dem Signing gezahlt.");
        const datum = /^20\d\d-\d\d-\d\d$/.test(String(daten.datum || "")) ? daten.datum : heute();
        if (datum > heute()) throw ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.");
        const betrag = v.zahl(daten.betrag, { min: 1, max: 1e11 }) ?? c.kaufpreis;
        const faelligJetzt = (c.meilensteine || []).length ? c.kaufpreis - c.meilensteine.filter((m) => !m.bezahltAm).reduce((s, m) => s + m.betrag, 0) : c.kaufpreis;
        if (betrag + 1 < Math.max(0, faelligJetzt)) throw ungueltig(`Eingegangen sind ${Math.round(betrag).toLocaleString("de-DE")} € – zum Closing fällig sind ${Math.round(faelligJetzt).toLocaleString("de-DE")} €.`);
        c.zahlung = { ...c.zahlung, eingangAm: datum, betrag: Math.round(betrag), bestaetigtVonId: n.id };
        oeffentlich(c, n, `Zahlungseingang bestätigt${c.zahlung.treuhand ? " (Treuhand-/Notaranderkonto)" : ""}.`);
      } else if (aktion === "abbrechen") {
        const grund = v.text(daten.grund, 300);
        v.pflicht(grund.length >= 5, "Bitte einen Grund angeben.");
        c.status = "abgebrochen";
        oeffentlich(c, n, `Closing abgebrochen: ${grund}`);
        beteiligteMelden(db, c, { titel: `Deal-Abschluss abgebrochen: ${p?.titel || ""}`, text: "Der Closing-Raum wurde geschlossen." });
      }
    }
    c.geaendertAm = jetzt();
    protokoll(db, n, `closing_${aktion}`, "closing", c.id, `${aktion}${daten.schluessel ? ` ${daten.schluessel}` : ""}`);
    return closingAusgabe(db, n, c, { detail: true });
  });
}

/** Closing vollziehen: Prüfung → Projekt „verkauft“ (Provision) → Provisionsrechnung (Finanzen) → Status vollzogen */
async function closingVollziehen(n, id, { ip = "" } = {}) {
  let db = await lesenBereit();
  const c0 = closingLaden(db, id);
  const kyc0 = kycFuer(db, c0);
  const pr = closingPruefen(c0, kyc0);
  if (!pr.ok) throw new PlattformFehler(409, `Closing nicht möglich: ${pr.gruende.join(" ")}`, kyc0.kycKaeufer && kyc0.kycVerkaeufer ? "closing" : "kyc");
  const p0 = db.projekte.find((x) => x.id === c0.projektId);
  // 1. Projekt → verkauft (Automat im Kern-Backend legt die Provision an)
  if (p0 && p0.status !== "verkauft") await statusWechsel(n, { art: "projekt", id: p0.id, nach: "verkauft", als: "admin", extra: { interesseId: c0.interesseId, kaufpreis: c0.kaufpreis }, ip });
  // 2. Provisionsrechnung über das Finanzen-Modul (Lauf „provision“)
  let rechnungFehler = "";
  try {
    const fin = await import("./finanzen");
    const kern = await import("./finanzen-kern");
    await fin.abrechnungslauf(kern.SYSTEM_FINANZEN, { art: "provision" });
  } catch (e) {
    rechnungFehler = e?.message || "unbekannt";
    console.warn("[plattform-demo] Provisionsrechnung beim Closing nicht erzeugt:", rechnungFehler);
  }
  // 3. Closing abschließen
  return aendern((d) => {
    const c = closingLaden(d, id);
    if (c.status === "vollzogen") return closingAusgabe(d, n, c, { detail: true });
    const pv = d.provisionen.filter((x) => x.projektId === c.projektId && x.interesseId === c.interesseId).sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm)))[0];
    c.provisionId = pv?.id || null;
    const vk = pv ? null : anbieterVorkenntnisAnerkannt(d, c.projektId, c.interesseId);
    if (vk) c.provisionEntfallen = { grund: "Vorkenntnis anerkannt", vorkenntnisId: vk.id };
    c.status = "vollzogen";
    c.vollzogenAm = heute();
    const beleg = pv ? (d.finanzen?.belege || []).find((b) => b.schluessel === `PV:${pv.id}` && b.status !== "storniert") : null;
    oeffentlich(c, n, "Closing vollzogen – Kaufgegenstand übergeht auf den Käufer. Übergabe-Checkliste ist offen.");
    verlauf(c, n, pv ? `Provision ${pv.id} (${pv.betrag} €) angelegt${beleg ? `, Provisionsrechnung ${beleg.nummer}` : rechnungFehler ? ` – Rechnung beim nächsten Lauf (${rechnungFehler})` : " – Rechnung folgt im nächsten Abrechnungslauf"}.` : vk ? "Keine Provision: Vorkenntnis anerkannt (§ 4 Abs. 2 der Besonderen Bedingungen) – keine Provisionsrechnung." : "Keine Provision gefunden (Projekt bereits vorher verkauft?).");
    c.geaendertAm = jetzt();
    const p = d.projekte.find((x) => x.id === c.projektId);
    beteiligteMelden(d, c, { titel: `Closing vollzogen: ${p?.titel || ""}`, text: "Der Deal ist abgeschlossen. Übergabe und Abschlussbericht finden Sie im Closing-Raum." });
    for (const a of aktiveAdmins(d).filter((x) => darfLesen(x, "provisionen")).slice(0, 5)) benachrichtigen(d, a, { art: "status", titel: `Closing vollzogen: ${p?.titel || ""}`, text: beleg ? `Provisionsrechnung ${beleg.nummer} erzeugt.` : vk ? "Keine Provision – Vorkenntnis anerkannt." : "Provisionsrechnung prüfen.", link: `/portal/admin/closing/${c.id}`, objektArt: "closing", objektId: c.id }, { mail: false });
    protokoll(d, n, "closing_vollzogen", "closing", c.id, `Closing ${c.id} vollzogen (${c.kaufpreis} €)`, ip);
    return closingAusgabe(d, n, c, { detail: true });
  });
}

/** Beteiligte melden eine CP in ihrer Verantwortung als erfüllt: { schluessel, nachweis } */
export async function clPortalAktion(n, id, daten = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const { c, rolle } = closingZugriff(db, n, id);
    if (!["kaeufer", "verkaeufer"].includes(rolle)) throw verboten("Nur für Käufer und Verkäufer.");
    if (!CL_OFFEN.includes(c.status)) throw konflikt("Der Closing-Raum ist abgeschlossen.");
    if (daten.aktion !== "cp_melden") throw ungueltig("Unbekannte Aktion.");
    const x = c.cps.find((y) => y.schluessel === daten.schluessel);
    if (!x) throw nichtGefunden("Bedingung nicht gefunden.");
    if (x.verantwortlich !== rolle) throw verboten("Diese Bedingung liegt nicht in Ihrer Verantwortung.");
    if (x.status !== "offen") throw konflikt("Die Bedingung ist nicht mehr offen.");
    const nachweis = v.text(daten.nachweis, 300);
    v.pflicht(nachweis.length >= 5, "Bitte beschreiben Sie den Nachweis (mind. 5 Zeichen).");
    x.status = "gemeldet";
    x.nachweis = nachweis;
    x.gemeldetVonId = n.id;
    oeffentlich(c, n, `${rolle === "kaeufer" ? "Käufer" : "Verkäufer"} meldet „${x.label}“ als erfüllt – Prüfung durch ÖkoInvest.`);
    c.geaendertAm = jetzt();
    for (const a of aktiveAdmins(db).filter((u) => darfSchreiben(u, "closing")).slice(0, 5)) benachrichtigen(db, a, { art: "status", titel: "Closing: Bedingung gemeldet", text: x.label, link: `/portal/admin/closing/${c.id}`, objektArt: "closing", objektId: c.id }, { mail: false });
    protokoll(db, n, "closing_cp_gemeldet", "closing", c.id, x.schluessel);
    return closingAusgabe(db, n, c, { detail: true });
  });
}

/** Daten für SPA-Muster bzw. Abschlussbericht (PDF erzeugt die Website) */
export async function clDokumentDaten(n, id, { art = "spa", ip = "" } = {}) {
  const db = await lesenBereit();
  const { c } = closingZugriff(db, n, id);
  if (art === "bericht" && c.status !== "vollzogen") throw konflikt("Der Abschlussbericht steht nach dem Closing bereit.");
  await aendern((x) => protokoll(x, n, `closing_${art === "bericht" ? "bericht" : "spa"}`, "closing", c.id, `PDF ${art}`, ip));
  return { art: art === "bericht" ? "bericht" : "spa", closing: closingAusgabe(db, n, c, { detail: true }) };
}

/** Notartermin als Kalenderdatei (Beteiligte und Backoffice) */
export async function clTermin(n, id) {
  const db = await lesenBereit();
  const { c } = closingZugriff(db, n, id);
  if (!c.notar?.termin) throw nichtGefunden("Kein Notartermin eingetragen.");
  const p = db.projekte.find((x) => x.id === c.projektId);
  return { id: c.id, titel: `Notartermin ${CL_STRUKTUREN[c.struktur]?.label || ""}: ${p?.titel || c.id}`, start: c.notar.termin, dauerMinuten: 120, ort: c.notar.ort || "", beschreibung: [c.notar.name, c.notar.kanzlei].filter(Boolean).join(", ") };
}

// ================================================================ Demo-Daten (fiktiv)

function seed(db) {
  const u = (email) => db.nutzer.find((x) => x.email === email);
  const admin = u("admin@example.com");
  const fl = u("flaeche@example.com");
  const lw = u("landwirt@example.com");
  const un = u("unternehmen@example.com");
  const tag = (t) => vorTagen(t).slice(0, 10);
  const akte = (d) => {
    const a = {
      id: neueId("GR"), recht: rechtFuer(d.land, d.recht), eigentuemerAnschrift: "", eigentuemerAnzahl: 1, berechtigter: "ÖkoInvest GmbH", entgeltJahr: 0, laufzeitJahre: 25, laufzeitBeginn: "Inbetriebnahme",
      vertragBezug: "", pfandglaeubiger: [], notiz: "", abgebrochen: false, verlauf: [], erstelltAm: vorTagen(d.alter || 30), geaendertAm: vorTagen(1), erstelltVon: admin?.id || null, ...d,
    };
    a.schritte = schritteAnlegen(a.land, { ohnePfandrecht: !a.pfandglaeubiger.length });
    for (const [k, st, t, wert] of d.stand || []) {
      const s = a.schritte.find((x) => x.schluessel === k);
      if (!s) continue;
      s.status = st;
      s.datum = st === "erledigt" ? tag(t) : "";
      s.nachweisWert = wert || "";
      s.vonId = admin?.id || null;
      a.verlauf.push({ am: vorTagen(t), vonId: admin?.id || null, text: `${schritteFuer(a.land).find((x) => x.schluessel === k)?.label}: ${GB_SCHRITT_STATUS[st].label}${wert ? ` (${wert})` : ""}`, oeffentlich: st === "erledigt" });
    }
    delete a.stand;
    delete a.alter;
    C(db).akten.push(a);
    anlageSpiegeln(db, a);
    return a;
  };
  const muehl = db.flaechen.find((f) => f.bezeichnung === "Acker am Mühlweg (Demo)" && f.nutzerId === fl?.id);
  if (muehl) {
    akte({
      titel: "Dienstbarkeit Acker am Mühlweg (Demo)", land: "DE", objektArt: "freiflaeche", bezugArt: "flaeche", bezugId: muehl.id, eigentuemerId: fl.id, eigentuemerName: `${fl.vorname} ${fl.nachname}`,
      grundstueck: { bezeichnung: muehl.bezeichnung, grundbuch: "Grundbuch von Musterfeld, Blatt 1234 (Demo)", flurstuecke: flurText(muehl), gebaeude: "" },
      entgeltJahr: Math.round((muehl.pachtangebot?.euroProHaJahr || 1500) * (muehl.ha || 1)), laufzeitJahre: muehl.pachtangebot?.laufzeitJahre || 30, vertragBezug: `Pachtangebot zur Fläche ${muehl.id}`,
      pfandglaeubiger: [{ name: "Demo Raiffeisenbank eG (fiktiv)", recht: "Grundschuld 150.000 €, Abt. III Nr. 1 (Demo)", kontakt: "" }], alter: 12,
      stand: [["vertrag", "erledigt", 6], ["unterschrift", "in_arbeit", 2], ["rang", "in_arbeit", 2]],
    });
  }
  const agri = db.flaechen.find((f) => f.bezeichnung === "Agri-PV Schlag Nord (Demo)" && f.nutzerId === lw?.id);
  if (agri) {
    akte({
      titel: "Servitut Agri-PV Schlag Nord (Demo)", land: "AT", objektArt: "freiflaeche", bezugArt: "flaeche", bezugId: agri.id, eigentuemerId: lw.id, eigentuemerName: `${lw.vorname} ${lw.nachname}`,
      grundstueck: { bezeichnung: agri.bezeichnung, grundbuch: "KG 46101 Demo-Gemeinde, EZ 87 (Demo)", flurstuecke: "Gst.-Nr. 512/1, 512/2 (Demo)", gebaeude: "" },
      entgeltJahr: 11760, laufzeitJahre: 25, vertragBezug: "Pachtvertrag Agri-PV Schlag Nord (Demo)", laufzeitBeginn: "Baubeginn",
      pfandglaeubiger: [{ name: "Demo Landesbank AG (fiktiv)", recht: "Höchstbetragspfandrecht C-LNr. 3 (Demo)", kontakt: "" }], alter: 70,
      stand: [["vertrag", "erledigt", 60], ["unterschrift", "erledigt", 52], ["beglaubigung", "erledigt", 40], ["rang", "erledigt", 30, "Vorrangseinräumung vom " + tag(30).split("-").reverse().join(".")], ["antrag", "erledigt", 12, "TZ 2841/2026 (Demo)"]],
    });
  }
  const dach = (db.anlagen?.anlagen || []).find((x) => x.typ === "dach" && x.kundeId === un?.id);
  if (dach) {
    akte({
      titel: `Dachnutzung ${dach.name}`, land: ["DE", "AT", "CH"].includes(dach.land) ? dach.land : "DE", objektArt: "dach", bezugArt: "anlage", bezugId: dach.id, eigentuemerId: un.id, eigentuemerName: un.firma || `${un.vorname} ${un.nachname}`,
      grundstueck: { bezeichnung: dach.name, grundbuch: "Grundbuch von Augsburg, Blatt 5678 (Demo)", flurstuecke: "Flst. 901/3 (Demo)", gebaeude: "Lagerhalle Nord, Dachfläche West (Demo)" },
      laufzeitJahre: 20, vertragBezug: "Contracting-Vertrag (Demo)", alter: 400,
      stand: [["vertrag", "erledigt", 390], ["unterschrift", "erledigt", 385], ["beglaubigung", "erledigt", 370], ["antrag", "erledigt", 365, "Az. GBA 2025/0815 (Demo)"], ["eintragung", "erledigt", 330, "Abt. II lfd. Nr. 4 (Demo)"]],
    });
  }
  akte({
    titel: "Baurecht Gewerbedach Winterthur (Demo)", land: "CH", objektArt: "dach", bezugArt: "frei", bezugId: null, eigentuemerId: null, eigentuemerName: "Demo Immobilien AG (fiktiv)", recht: "baurecht",
    grundstueck: { bezeichnung: "Gewerbedach Winterthur (Demo)", grundbuch: "Grundbuch Winterthur (Demo)", flurstuecke: "Parzelle 4711, EGRID CH0000000000 (Demo)", gebaeude: "Halle 2 (Demo)" },
    entgeltJahr: 6000, laufzeitJahre: 30, alter: 5, stand: [],
  });

  // Closing-Raum: reserviertes Demo-Projekt „Innviertel“ mit angenommener LOI (investor@example.com, Kontakt freigegeben)
  const inv = u("investor@example.com");
  const p4 = db.projekte.find((p) => p.demo && p.titel?.includes("Innviertel") && p.status === "reserviert");
  const i4 = p4 && inv ? db.interessen.find((x) => x.projektId === p4.id && x.investorId === inv.id && x.status === "loi_angenommen") : null;
  if (p4 && i4) {
    const kp = kaufpreisAbleiten({ loi: i4.loi, mwp: p4.mwp });
    const betrag = kp.betrag || Math.round((p4.preisProKwp || 90) * (p4.mwp || 1) * 1000);
    const c = {
      id: neueId("CL"), projektId: p4.id, interesseId: i4.id, verfahrenId: null, herkunft: "loi", kaeuferId: inv.id, verkaeuferId: p4.anbieterId, land: ["DE", "AT", "CH"].includes(p4.land) ? p4.land : "AT",
      struktur: "share", spvName: "Demo Solar Innviertel GmbH (fiktiv)", spvGesellschaftId: null, anteilProzent: 100, kaufpreis: betrag, kaufpreisQuelle: kp.quelle || "loi",
      meilensteine: [{ label: "Kaufpreis bei Closing (Demo)", betrag: Math.round(betrag * 0.8), bedingung: "Closing", faelligAm: "", bezahltAm: "" }, { label: "Rate bei COD (Demo)", betrag: Math.round(betrag * 0.2), bedingung: "Inbetriebnahme (COD) bis 09/2027", faelligAm: "", bezahltAm: "" }],
      earnOut: "", status: "vorbereitung", signing: { punkte: signingAnlegen() }, cps: cpsAnlegen("share", { loiBedingungen: ["gremien", "netz"], heute: tag(5) }),
      notar: { name: "Dr. Demo Notarin (fiktiv)", kanzlei: "Notariat Demo-Stadt (fiktiv)", email: "", telefon: "", ort: "Hauptplatz 1, 4910 Demo-Stadt (fiktiv)", termin: new Date(Date.now() + 21 * 86400e3).toISOString().slice(0, 10) + "T08:00:00.000Z", notiz: "Notariatsakt Anteilsabtretung (Demo)" },
      zahlung: { treuhand: true, kontoHinweis: "Treuhandkonto Notariat (Demo)", faelligAm: "", eingangAm: "", betrag: null }, uebergabe: uebergabeAnlegen(),
      provisionId: null, verlauf: [], erstelltAm: vorTagen(5), geaendertAm: vorTagen(1), erstelltVon: admin?.id || null,
    };
    for (const k of ["bonitaet", "finanzierung", "dd"]) Object.assign(c.signing.punkte.find((x) => x.schluessel === k), { erledigt: true, am: tag(3), vonId: admin?.id || null });
    const cp = c.cps.find((x) => x.schluessel === "zustimmung_anteile");
    if (cp) Object.assign(cp, { status: "erfuellt", nachweis: "Gesellschafterbeschluss vom " + tag(4).split("-").reverse().join(".") + " (Demo)", erfuelltAm: tag(4) });
    const cp2 = c.cps.find((x) => x.schluessel === "netz");
    if (cp2) Object.assign(cp2, { status: "gemeldet", nachweis: "Bestätigung Netz OÖ zur Übertragung der Zusage (Demo)", gemeldetVonId: p4.anbieterId });
    c.verlauf.push({ am: vorTagen(5), vonId: admin?.id || null, text: "Closing-Raum eröffnet (angenommene LOI, Share Deal).", oeffentlich: true }, { am: vorTagen(1), vonId: admin?.id || null, text: "Notartermin eingetragen (Notariatsakt, Demo).", oeffentlich: true });
    C(db).closings.push(c);
  }
}
