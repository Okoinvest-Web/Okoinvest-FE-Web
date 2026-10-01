// src/lib/plattform/backend/demo/eg-gruendung.js
//
// Demo-Backend WP5 „Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check, Lieferantenpflichten“ –
// Referenz für plattform/api/eg_gruendung.py. Vertrag: docs/EG-SCHNITTSTELLEN.md Abschnitt 4 (WP5), Ergänzungen in
// docs/eg/gruendung.md. Regeln: src/lib/plattform/eg/{gruendung,wechsel,verein,statuten,vertraege,foerder,lieferantenpflichten}.js.
//
// Rechte (jede Operation prüft Rolle UND Kontext):
//   Backoffice    – admin mit Bereich „eg“: lesen ≥ 1 sieht alle Aufträge, schreiben = 2 erstellt Angebote, steuert Schritte,
//                   legt Gemeinschaften über WP1 an, führt Importe aus. Signatur über das Signatur-Modul (Bereich „signatur“).
//   Auftraggeber  – Konto, das den Auftrag angefragt hat: sieht seinen Auftrag, unterschreibt das Angebot, erledigt eigene
//                   Schritte (zuständig „Auftraggeber“) mit Nachweis, erzeugt Muster und Förder-Checks.
//   Organe        – Kontext-Rechte je Gemeinschaft (eg/rechte.js): gruendungsauftrag, gv, organe_statuten, buchhaltung.
//   sonst         – 404 (keine Existenz verraten).
// Schreiben fremder Entitäten nur über WP1-/WP2-/WP4-Operationen (eg-stamm, eg-eda, eg-abrechnung); Daten unter db.egGruendung.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { darfLesen, darfSchreiben } from "../../rechte";
import { EG_EREIGNISSE, EG_MODELLE, GEMEINSCHAFT_STATUS, MITGLIED_AKTIV, ORGAN_FUNKTIONEN, RECHTSFORMEN, ZONELEVEL } from "../../eg/modell";
import { egStufe, istOrgan, organWirksam } from "../../eg/rechte";
import { kennzahlen as stammKennzahlen } from "../../eg/stamm";
import { tarifAm } from "../../eg/tarif";
import {
  AUFTRAG_UEBERGAENGE, GR_AKTIV, GR_PAKETE, GR_STATUS, SCHRITT_STATUS, angebotBereinigen, auftraegeKennzahlen, auftragBereinigen, auftragFortschritt, auftragHinweise, auftragStatusAusSchritten,
  auftragUebergang, edaBereitPruefen, formularHilfe, rechtsformEmpfehlung, schrittAktion, schrittDefinition, schritteAnreichern, schritteErzeugen, schrittWirkung, statusPfad, gemeinschaftAusAuftrag,
} from "../../eg/gruendung";
import { IMPORT_FELDER, ANBIETER_PROFILE, anbieterErkennen, elwgAnpassung, importPlan, kontrollVergleich, plausibilitaet, probeKontrollwerte, probePeriode, tabelleLesen, umstellungsplan, wechselNachricht, zeilenAbbilden, zuordnungBereinigen, zuordnungVorschlagen } from "../../eg/wechsel";
import { BEITRAG_EINHEBUNG, aufloesungCheckliste, beitraegeVorschreiben, beitragsUebersicht, beschlussBereinigen, beschluesseAusVersammlung, gvKonfig, gvPflicht, gvTagesordnungVorlage, organCheck } from "../../eg/verein";
import { statutenEingaben, statutenPruefen } from "../../eg/statuten";
import { VORLAGEN, dokumentDaten, vorlageRendern, vorlagenFuer } from "../../eg/vertraege";
import { foerderCheck, FOERDER_PROGRAMME } from "../../eg/foerder";
import { lieferantenpflichten } from "../../eg/lieferantenpflichten";
import { GV_STATUS, ONLINE_FORMEN, abschlussBereinigen, abstimmungOffen, einladungPruefen, ergebnisRechnen, stimmeBereinigen, stimmenKanonisch, versammlungBereinigen } from "../../mitglied/versammlung";
import { MitgliedFehler, ibanMaskiert } from "../../mitglied/basis";
import { egDokumentPdf } from "../../server/eg-gruendung-pdf";
import { intern } from "../demo";
import { jetzt, neueId, sha256, vorTagen } from "./hilfen";
import { egIntern, egGemeinschaftSpeichern, egGemeinschaftStatus, egOrganSpeichern, egOrganBeenden, egCsvImport, egMassenaktion, egTarifSpeichern, egGemeinschaft } from "./eg-stamm";
import * as eda from "./eg-eda";
import * as abrechnung from "./eg-abrechnung";
import { signaturAnlegen } from "./service-signatur";
import { GR_SEED_VERSION, grSeed } from "./eg-gruendung-seed";

// lazy (Modulzyklus demo.js ↔ Teilmodule wie in betrieb.js/energie.js)
const protokoll = (...a) => intern.protokoll(...a);
const nameVon = (...a) => intern.nameVon(...a);
const nutzerById = (...a) => intern.nutzerById(...a);
const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const aktiveAdmins = (...a) => intern.aktiveAdmins(...a);
const { lesenBereit: stammLesen, aendernBereit: stammAendern, zugriff, kontext, gemeinschaftVon, heute, E } = egIntern;
const X = (db) => db.egGruendung;
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "eg");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "eg");
const SYSTEM = { id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true };
const vonId = (n) => (n?.system ? null : n?.id || null);
const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
const jetztLokal = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Vienna" }).replace(" ", "T").slice(0, 16);

/** Fachfehler der reinen Module (Error mit status/feld bzw. MitgliedFehler) → PlattformFehler */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof PlattformFehler) throw e;
    if (e instanceof MitgliedFehler || (e && typeof e.status === "number" && e.status >= 400 && e.status < 500)) {
      const f = new PlattformFehler(e.status || 422, e.message);
      if (e.feld) f.feld = e.feld;
      throw f;
    }
    throw e;
  }
}

// ================================================================ Datenbestand

async function bereit() {
  const db = await stammLesen();
  if ((db.egGruendung?.v || 0) >= GR_SEED_VERSION) return db;
  await stammAendern((d) => {
    if ((d.egGruendung?.v || 0) >= GR_SEED_VERSION) return;
    const konto = (email) => d.nutzer.find((u) => u.email === email)?.id || null;
    const tag = (t) => new Date(Date.now() - t * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
    try {
      d.egGruendung = grSeed({ gemeinschaften: d.eg?.gemeinschaften || [], mitglieder: d.eg?.mitglieder || [], konten: { kommune: konto("kommune@example.com"), mitglied: konto("mitglied@example.com"), unternehmen: konto("unternehmen@example.com"), obmann: konto("eg-obmann@example.com") }, tag, iso: (t) => vorTagen(t), sha256 });
    } catch (e) {
      console.warn("[plattform-demo] WP5-Demodaten nicht ergänzt:", e?.message);
      d.egGruendung = { v: GR_SEED_VERSION, auftraege: [], importe: [], foerderchecks: [], dokumente: [], versammlungen: [], stimmen: [], beschluesse: [], beitraege: [], aufloesungen: [], statuten: [], kontrollen: [] };
    }
  });
  return stammLesen();
}
async function aendernG(fn) {
  await bereit();
  return stammAendern(fn);
}
const meta = (n) => ({ erstelltAm: jetzt(), erstelltVon: vonId(n), geaendertAm: jetzt(), geaendertVon: vonId(n) });
const geaendert = (o, n) => Object.assign(o, { geaendertAm: jetzt(), geaendertVon: vonId(n) });

/** Ereignis an das zuständige Paket (wie backend/eg.js egEreignisSenden, ohne Zyklus über die Fassade) */
async function ereignisSenden(name, payload) {
  const op = EG_EREIGNISSE[name]?.operation;
  const ziel = { ...eda, ...abrechnung }[op];
  if (!op || typeof ziel !== "function") return { zugestellt: false };
  try {
    const arg = EG_EREIGNISSE[name]?.argument;
    return { zugestellt: true, ergebnis: await ziel(SYSTEM, arg ? payload?.[arg] : payload) };
  } catch (e) {
    return { zugestellt: false, fehler: e?.status === 501 ? `${op} ist noch nicht verfügbar (Ereignis vorgemerkt).` : e?.message || "Fehler" };
  }
}

// ================================================================ Rechte am Auftrag

/** Rolle des Kontos am Auftrag: backoffice | auftraggeber | organ | null */
function auftragRolle(db, n, a) {
  if (!n) return null;
  if (boLesen(n)) return "backoffice";
  if (a.auftraggeberKontoId && a.auftraggeberKontoId === n.id) return "auftraggeber";
  const g = a.gemeinschaftId ? gemeinschaftVon(db, a.gemeinschaftId) : null;
  if (g && egStufe(kontext(db, n, g), "gruendungsauftrag") >= 1) return "organ";
  return null;
}
function auftragLaden(db, n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const a = X(db).auftraege.find((x) => x.id === String(id || ""));
  if (!a) throw nichtGefunden("Auftrag nicht gefunden.");
  const rolle = auftragRolle(db, n, a);
  if (!rolle) throw nichtGefunden("Auftrag nicht gefunden.");
  return { a, rolle };
}
/** Auftraggeber-Rechte: Konto des Auftraggebers bzw. Vorstand der Gemeinschaft mit Recht „gruendungsauftrag“ 2 */
function alsAuftraggeber(db, n, a, rolle) {
  if (rolle === "auftraggeber") return true;
  if (rolle === "organ") return egStufe(kontext(db, n, gemeinschaftVon(db, a.gemeinschaftId)), "gruendungsauftrag") >= 2;
  return false;
}

// ================================================================ Ausgabe

function gemeinschaftKurz(db, g, voll) {
  if (!g) return null;
  const k = stammKennzahlen(g, E(db));
  return {
    id: g.id, name: g.name, modell: g.modell, modellKurz: EG_MODELLE[g.modell]?.kurz || g.modell, zonelevel: g.zonelevel, rechtsform: g.rechtsform, status: g.status, statusLabel: GEMEINSCHAFT_STATUS[g.status]?.label || g.status,
    zvrZahl: g.zvrZahl, firmenbuchnummer: g.firmenbuchnummer, marktpartnerId: g.marktpartnerId, gemeinschaftsId: g.gemeinschaftsId, netzbetreiber: g.netzbetreiber, edaAnbindung: g.edaAnbindung,
    iban: voll ? g.iban : ibanMaskiert(g.iban), creditorId: g.creditorId, steuernummer: voll ? g.steuernummer : "", uid: g.uid, organisatorAngezeigtAm: g.organisatorAngezeigtAm, dienstleistung: g.dienstleistung,
    statutenVersion: g.statutenVersion, betreibervertragDatum: g.betreibervertragDatum, nahebereichRef: g.nahebereichRef, verteilmodell: g.verteilmodell, sitzAdresse: g.sitzAdresse, email: g.email, kennzahlen: k,
  };
}

function auftragKurz(a, h) {
  const f = auftragFortschritt(a.schritte, { heute: h, auftrag: a });
  return {
    id: a.id, arbeitsname: a.arbeitsname, paket: a.paket, paketLabel: GR_PAKETE[a.paket]?.label || a.paket, modell: a.modell, modellKurz: EG_MODELLE[a.modell]?.kurz || a.modell, status: a.status, statusLabel: GR_STATUS[a.status]?.label || a.status, ton: GR_STATUS[a.status]?.ton || "neutral",
    auftraggeberName: a.auftraggeber?.name || "", ort: a.ort, plz: a.plz, bundesland: a.bundesland, erstelltAm: a.erstelltAm, auftragAm: a.auftragAm, gemeinschaftId: a.gemeinschaftId, fortschritt: f, angebot: a.angebot ? { betragNetto: a.angebot.betragNetto, gueltigBis: a.angebot.gueltigBis, nummer: a.angebot.nummer } : null, bearbeiterId: a.bearbeiterId || null, demo: !!a.demo,
  };
}

function signaturStatus(db, a) {
  if (!a.signaturId) return null;
  const s = (db.service?.signaturen || []).find((x) => x.id === a.signaturId);
  if (!s) return { id: a.signaturId, status: "unbekannt", statusLabel: "unbekannt", link: `/portal/signatur/${a.signaturId}` };
  const st = s.status === "laufend" && s.frist && s.frist < heute() ? "abgelaufen" : s.status;
  return { id: s.id, status: st, statusLabel: { laufend: "Zur Unterschrift", abgeschlossen: "Unterschrieben", abgelehnt: "Abgelehnt", widerrufen: "Widerrufen", abgelaufen: "Frist abgelaufen" }[st] || st, link: `/portal/signatur/${s.id}` };
}

const dokumentKurz = (d) => ({ id: d.id, vorlage: d.vorlage, titel: d.titel, version: d.version, sha256: d.sha256, stand: d.stand, fehlend: Array.isArray(d.fehlend) ? d.fehlend.length : Number(d.fehlend) || 0, erstelltAm: d.erstelltAm, gemeinschaftId: d.gemeinschaftId, auftragId: d.auftragId, demo: !!d.demo });
const importKurz = (i) => ({ id: i.id, dateiname: i.dateiname, anbieter: i.anbieter, anbieterLabel: ANBIETER_PROFILE[i.anbieter]?.label || i.anbieter, status: i.status, zeilen: i.zeilenRoh?.length || 0, kennzahlen: i.kennzahlen, ergebnis: i.ergebnis || null, erstelltAm: i.erstelltAm, ausgefuehrtAm: i.ausgefuehrtAm || "" });

function auftragDetail(db, n, a, rolle) {
  const h = heute();
  const bo = rolle === "backoffice";
  const g = a.gemeinschaftId ? gemeinschaftVon(db, a.gemeinschaftId) : null;
  const gk = gemeinschaftKurz(db, g, bo);
  const schritte = schritteAnreichern(a.schritte, a, { heute: h });
  const organe = g ? E(db).organe.filter((o) => o.gemeinschaftId === g.id).map((o) => ({ ...o, funktionLabel: ORGAN_FUNKTIONEN[o.funktion]?.label || o.funktion, personName: o.kontoId ? nameVon(db, o.kontoId) || o.name : o.name, wirksam: organWirksam(o, h) })) : [];
  const ctx = { gemeinschaft: gk, netzbetreiber: E(db).netzbetreiber, organe, auftrag: a, zaehlpunkte: gk?.kennzahlen?.zaehlpunkteAktiv || 0 };
  const hilfen = [...new Set(schritte.map((s) => s.hilfe).filter((x) => ["vereinsanzeige", "finanzamt", "ust", "elabg", "ebutilities", "betreibervertrag", "eda_zugang", "rechtsform"].includes(x)))];
  const dokumente = X(db).dokumente.filter((d) => d.auftragId === a.id || (g && d.gemeinschaftId === g.id)).sort((p, q) => q.erstelltAm.localeCompare(p.erstelltAm)).map(dokumentKurz);
  const merkmale = { modell: g?.modell || a.modell, rechtsform: g?.rechtsform || a.rechtsform };
  const lp = g ? lieferantenpflichten({ anlagen: E(db).anlagen.filter((x) => x.gemeinschaftId === g.id), organisator: !!g.dienstleistung?.aktiv, organisatorAngezeigtAm: g.organisatorAngezeigtAm, dokumente: X(db).dokumente.filter((d) => d.gemeinschaftId === g.id), mitglieder: E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id), tarife: E(db).tarife.filter((t) => t.gemeinschaftId === g.id), heute: h }) : null;
  const sig = signaturStatus(db, a);
  const aktionen = [];
  const kunde = alsAuftraggeber(db, n, a, rolle);
  if (bo && boSchreiben(n)) {
    for (const [k, u] of Object.entries(AUFTRAG_UEBERGAENGE)) if (u.von.includes(a.status) && k !== "annehmen" && k !== "ablehnen") aktionen.push(k);
    if (a.status === "angebot" && a.angebot && !["laufend", "abgeschlossen"].includes(sig?.status)) aktionen.push("signatur");
    if (!a.gemeinschaftId && !["anfrage", "abgebrochen"].includes(a.status)) aktionen.push("gemeinschaft_anlegen", "gemeinschaft_verknuepfen");
    aktionen.push("daten", "notiz", "schritte_aktualisieren", "statuten");
    if (a.paket === "wechsel") aktionen.push("stichtag", "probeabrechnung", "mitglieder_informieren");
  } else if (kunde) {
    if (a.status === "angebot" && !a.signaturId) aktionen.push("annehmen");
    if (a.status === "angebot") aktionen.push("ablehnen");
    aktionen.push("notiz", "statuten");
    if (a.status === "anfrage") aktionen.push("daten");
  }
  return {
    ...a, auftraggeberKontoId: bo ? a.auftraggeberKontoId : undefined, bearbeiterName: a.bearbeiterId ? nameVon(db, a.bearbeiterId) : "", kontrolle: bo ? a.kontrolle : a.kontrolle ? { am: a.kontrolle.am, summe: a.kontrolle.vergleich?.summe } : null,
    paketLabel: GR_PAKETE[a.paket]?.label || a.paket, paketText: GR_PAKETE[a.paket]?.text || "", statusLabel: GR_STATUS[a.status]?.label || a.status, ton: GR_STATUS[a.status]?.ton || "neutral",
    modellLabel: EG_MODELLE[a.modell]?.label || a.modell, zonelevelLabel: ZONELEVEL[a.zonelevel]?.label || "", rechtsformLabel: RECHTSFORMEN[a.rechtsform]?.label || a.rechtsform,
    schritte, fortschritt: auftragFortschritt(a.schritte, { heute: h, auftrag: a }), hinweise: auftragHinweise(a, { heute: h }),
    gemeinschaft: gk, organe: bo || rolle === "organ" ? organe : organe.map((o) => ({ id: o.id, funktion: o.funktion, funktionLabel: o.funktionLabel, personName: o.personName, wirksam: o.wirksam })),
    organCheck: g ? organCheck(g, E(db).organe, { heute: h }) : null,
    signatur: sig, rolle, aktionen, darfSchreiben: bo && boSchreiben(n), alsAuftraggeber: kunde,
    verlauf: (a.verlauf || []).filter((v) => bo || v.oeffentlich).map((v) => ({ ...v, vonName: v.von ? nameVon(db, v.von) : "ÖkoInvest" })),
    formulare: Object.fromEntries(hilfen.map((k) => [k, formularHilfe(k, ctx)])), rechtsformHilfe: rechtsformEmpfehlung(a),
    edaBereit: edaBereitPruefen(g ? { ...g, kennzahlen: gk.kennzahlen } : null, { schritte: a.schritte, organisator: a.organisator }),
    umstellungsplan: a.paket === "wechsel" ? umstellungsplan({ stichtag: a.stichtag, heute: h }) : null,
    elwg: a.paket === "wechsel" && g ? elwgAnpassung({ ...g, kennzahlen: gk.kennzahlen }, { mitglieder: E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id), dokumente: X(db).dokumente.filter((d) => d.gemeinschaftId === g.id), stichtag: a.stichtag }) : null,
    lieferantenpflichten: lp, dokumente, vorlagen: vorlagenFuer(merkmale),
    importe: X(db).importe.filter((i) => i.auftragId === a.id || (g && i.gemeinschaftId === g.id)).map(importKurz),
    foerderchecks: X(db).foerderchecks.filter((f) => f.auftragId === a.id || (g && f.gemeinschaftId === g.id)).map((f) => ({ id: f.id, erstelltAm: f.erstelltAm, kennzahlen: f.ergebnis.kennzahlen })),
    statutenEingaben: statutenEingaben(a.statutenEingaben || {}), heute: h,
  };
}

// ================================================================ Aufträge

export async function grAuftraege(n, { status = "", paket = "", q = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await bereit();
  const h = heute();
  const such = String(q || "").toLowerCase().trim();
  const sichtbar = X(db).auftraege.filter((a) => auftragRolle(db, n, a));
  const liste = sichtbar
    .filter((a) => (!status || a.status === status || (status === "aktiv" && GR_AKTIV.includes(a.status))) && (!paket || a.paket === paket) && (!such || `${a.arbeitsname} ${a.auftraggeber?.name} ${a.ort} ${a.plz} ${a.id}`.toLowerCase().includes(such)))
    .sort((x, y) => (y.geaendertAm || "").localeCompare(x.geaendertAm || ""))
    .map((a) => auftragKurz(a, h));
  return { auftraege: liste, kennzahlen: boLesen(n) ? auftraegeKennzahlen(sichtbar, { heute: h }) : null, backoffice: boLesen(n), darfSchreiben: boSchreiben(n), pakete: GR_PAKETE, status: GR_STATUS, heute: h };
}

export async function grAuftrag(n, id) {
  let db = await bereit();
  let { a, rolle } = auftragLaden(db, n, id);
  // Signatur abgeschlossen → Auftrag erteilt (Abgleich beim Lesen)
  if (a.status === "angebot" && signaturStatus(db, a)?.status === "abgeschlossen") {
    await aendernG((d) => {
      const x = X(d).auftraege.find((y) => y.id === a.id);
      if (x?.status !== "angebot") return;
      beauftragen(d, null, x, { art: "signatur", nachweis: `Signaturvorgang ${x.signaturId}` });
    });
    db = await bereit();
    ({ a, rolle } = auftragLaden(db, n, id));
  }
  return auftragDetail(db, n, a, rolle);
}

export async function grAuftragAnlegen(n, { daten = {} } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (daten.einwilligung !== true && !boLesen(n)) throw ungueltig("Bitte bestätigen Sie die Verarbeitung Ihrer Angaben für das Angebot.");
  const b = fach(() => auftragBereinigen(daten));
  return aendernG((db) => {
    let auftraggeberKontoId = n.id;
    let auftraggeber = { name: [n.vorname, n.nachname].filter(Boolean).join(" ") || n.email || "", anschrift: "", email: n.email || "" };
    if (boSchreiben(n) && daten.auftraggeberEmail) {
      const u = db.nutzer.find((y) => y.email === String(daten.auftraggeberEmail).toLowerCase().trim());
      if (!u) throw ungueltig("Für diese E-Mail gibt es kein Portalkonto – der Auftraggeber muss sich zuerst registrieren.");
      auftraggeberKontoId = u.id;
      auftraggeber = { name: [u.vorname, u.nachname].filter(Boolean).join(" ") || u.email, anschrift: "", email: u.email };
    } else if (!boLesen(n) && X(db).auftraege.filter((x) => x.auftraggeberKontoId === n.id && ["anfrage", "angebot"].includes(x.status)).length >= 5) throw konflikt("Sie haben bereits fünf offene Anfragen – bitte warten Sie auf unser Angebot.");
    if (daten.auftraggeberName) auftraggeber.name = String(daten.auftraggeberName).slice(0, 160);
    if (daten.auftraggeberAnschrift) auftraggeber.anschrift = String(daten.auftraggeberAnschrift).slice(0, 200);
    const a = { id: neueId("EGA"), ...b, paketLabel: GR_PAKETE[b.paket].label, auftraggeberKontoId, auftraggeber, status: "anfrage", angebot: null, signaturId: null, auftragAm: "", annahme: null, stichtag: "", gemeinschaftId: null, bearbeiterId: null, statutenEingaben: {}, kontrolle: null, verlauf: [{ am: jetzt(), von: vonId(n), text: "Anfrage eingegangen", oeffentlich: true }], ...meta(n) };
    a.schritte = schritteErzeugen(a);
    X(db).auftraege.push(a);
    for (const adm of aktiveAdmins(db).slice(0, 20)) {
      const u = typeof adm === "string" ? nutzerById(db, adm) : adm;
      if (u && darfSchreiben(u, "eg")) benachrichtigen(db, u, { art: "anfrage", titel: `Gründungsauftrag: ${a.arbeitsname}`, text: `${GR_PAKETE[a.paket].label} · ${a.plz} ${a.ort}`, link: `/portal/admin/eg/gruendung/${a.id}`, objektArt: "eg_gruendungsauftrag", objektId: a.id }, { mail: false });
    }
    protokoll(db, n, "anlegen", "eg_gruendungsauftrag", a.id, `Gründungsauftrag angefragt: ${a.arbeitsname} (${GR_PAKETE[a.paket].label})`);
    return auftragDetail(db, n, a, auftragRolle(db, n, a));
  });
}

function beauftragen(db, n, a, annahme) {
  a.status = fach(() => auftragUebergang(a, annahme.art === "manuell" ? "beauftragt_manuell" : "annehmen", { heute: heute() }));
  a.auftragAm = annahme.am || heute();
  a.annahme = { ...annahme, am: a.auftragAm };
  a.schritte = schritteErzeugen(a, { vorhanden: a.schritte, gemeinschaft: a.gemeinschaftId ? gemeinschaftVon(db, a.gemeinschaftId) : null });
  a.status = auftragStatusAusSchritten(a, a.schritte);
  a.verlauf.push({ am: jetzt(), von: vonId(n), text: annahme.art === "signatur" ? "Auftrag elektronisch unterschrieben – die Gründung startet" : `Auftrag erteilt (${annahme.nachweis || "manuell"})`, oeffentlich: true });
  geaendert(a, n);
  const u = nutzerById(db, a.auftraggeberKontoId);
  if (u && u.id !== n?.id) benachrichtigen(db, u, { art: "status", titel: `Auftrag „${a.arbeitsname}“ erteilt`, text: "Vielen Dank – Ihr Gründungsfahrplan mit Fristen steht im Portal.", link: `/portal/eg/gruendung/${a.id}`, objektArt: "eg_gruendungsauftrag", objektId: a.id }, { mail: true });
  protokoll(db, n || SYSTEM, "status", "eg_gruendungsauftrag", a.id, `Auftrag erteilt (${annahme.art})`);
}

const ALT_LABEL = { eegfaktura: "EEG Faktura", energiedigital: "energiedigital", egon: "EGON", eda_portal: "EDA-Anwenderportal" };

export async function grAuftragAktion(n, id, { aktion = "", ...d } = {}) {
  const db0 = await bereit();
  const { a: a0, rolle } = auftragLaden(db0, n, id);
  const bo = rolle === "backoffice";
  const boW = bo && boSchreiben(n);
  const kunde = alsAuftraggeber(db0, n, a0, rolle);
  const nurBo = () => {
    if (!boW) throw verboten(bo ? "Ihre Backoffice-Rolle erlaubt im Bereich „Energiegemeinschaften“ kein Schreiben." : "Diese Aktion führt ÖkoInvest aus.");
  };

  // --- Aktionen mit Wirkung in anderen Paketen (außerhalb der eigenen Änderung)
  if (aktion === "signatur") {
    nurBo();
    if (a0.status !== "angebot" || !a0.angebot) throw konflikt("Unterschrieben wird ein vorliegendes Angebot.");
    if (!a0.auftraggeberKontoId) throw konflikt("Der Auftraggeber hat kein Portalkonto.");
    const dok = vorlageRendern(VORLAGEN.gruendungsauftrag, dokumentDaten({ auftrag: { ...a0, paketLabel: GR_PAKETE[a0.paket].label }, netzbetreiber: E(db0).netzbetreiber, eingaben: {}, heute: heute() }));
    const pdf = egDokumentPdf(dok, { demo: !!a0.demo, sha256: sha256(dok.text), kopfzeile: "Angebot und Auftrag" });
    const s = await signaturAnlegen(n, { titel: `Auftrag ${a0.angebot.nummer} – ${a0.arbeitsname}`, art: "sonstiges", pdfBase64: pdf.toString("base64"), dateiname: `auftrag-${a0.angebot.nummer}.pdf`, fristTage: 21, nachricht: "Bitte prüfen und unterschreiben Sie den Auftrag zur Gründungsdienstleistung.", unterzeichner: [{ kontoId: a0.auftraggeberKontoId }] });
    return aendernG((db) => {
      const a = X(db).auftraege.find((x) => x.id === a0.id);
      a.signaturId = s.id;
      a.verlauf.push({ am: jetzt(), von: vonId(n), text: "Auftrag zur elektronischen Unterschrift bereitgestellt", oeffentlich: true });
      geaendert(a, n);
      protokoll(db, n, "signatur", "eg_gruendungsauftrag", a.id, `Signaturvorgang ${s.id} angelegt`);
      return auftragDetail(db, n, a, rolle);
    });
  }
  if (aktion === "gemeinschaft_anlegen") {
    nurBo();
    if (a0.gemeinschaftId) throw konflikt("Die Gemeinschaft ist bereits angelegt.");
    const g = await egGemeinschaftSpeichern(n, { daten: gemeinschaftAusAuftrag(a0, d.daten || {}) });
    const meldungen = [];
    const ziel = a0.paket === "wechsel" ? "aktiv" : "in_gruendung";
    let status = g.status;
    for (const s of statusPfad(status, ziel)) {
      try {
        status = (await egGemeinschaftStatus(n, g.id, { nach: s, grund: `Gründungsauftrag ${a0.id}` })).status;
      } catch (e) {
        meldungen.push(`Status „${GEMEINSCHAFT_STATUS[s]?.label || s}“ noch nicht erreicht: ${e.message}`);
        break;
      }
    }
    return aendernG((db) => {
      const a = X(db).auftraege.find((x) => x.id === a0.id);
      a.gemeinschaftId = g.id;
      a.schritte = schritteErzeugen(a, { vorhanden: a.schritte, gemeinschaft: gemeinschaftVon(db, g.id) });
      a.status = auftragStatusAusSchritten(a, a.schritte);
      a.verlauf.push({ am: jetzt(), von: vonId(n), text: `Gemeinschaft „${g.name}“ angelegt (${g.id})`, oeffentlich: true });
      geaendert(a, n);
      protokoll(db, n, "aendern", "eg_gruendungsauftrag", a.id, `Gemeinschaft ${g.id} angelegt und verknüpft`);
      return { ...auftragDetail(db, n, a, rolle), meldungen };
    });
  }
  if (aktion === "probeabrechnung") {
    nurBo();
    if (!a0.gemeinschaftId) throw konflikt("Bitte zuerst die Gemeinschaft anlegen bzw. verknüpfen.");
    const plan = umstellungsplan({ stichtag: a0.stichtag, heute: heute() });
    const von = String(d.von || plan.parallelVon || "");
    const bis = String(d.bis || plan.parallelBis || "");
    const liste = (l) => (Array.isArray(l) ? l.slice(0, 5000).map((x) => ({ schluessel: String(x.schluessel || ""), name: String(x.name || ""), kwh: Number(x.kwh) || 0, betragEur: Number(x.betragEur) || 0 })).filter((x) => x.schluessel) : []);
    const alt = liste(d.alt);
    let neu = [];
    let wp4;
    try {
      const p = await abrechnung.abPeriodeAnlegen(n, a0.gemeinschaftId, probePeriode({ von, bis }));
      const pid = p?.id || p?.periode?.id;
      const v = await abrechnung.abPeriodeAktion(n, pid, { aktion: "vorschau" });
      // WP4 liefert die Vorschau als { periode: { vorschau: { belege[] } } } – Belege → Kontrollzeilen (eg/wechsel.js)
      neu = liste(probeKontrollwerte(v?.periode?.vorschau?.belege || v?.vorschau?.belege || []));
      wp4 = { ok: true, text: `Probe-Periode ${pid || ""} angelegt (${datumDe(von)} bis ${datumDe(bis)}).` };
    } catch (e) {
      wp4 = { ok: false, text: e?.status === 501 ? "Die Probe-Abrechnung (WP4) ist noch nicht verfügbar – Vergleich mit den übergebenen Werten." : `Probe-Abrechnung nicht möglich: ${e.message}` };
      neu = liste(d.neu);
    }
    const vergleich = kontrollVergleich(alt, neu, { toleranzEur: Number(d.toleranzEur) || 0.05, toleranzKwh: Number(d.toleranzKwh) || 0.5 });
    return aendernG((db) => {
      const a = X(db).auftraege.find((x) => x.id === a0.id);
      a.kontrolle = { am: jetzt(), von, bis, wp4, vergleich };
      a.verlauf.push({ am: jetzt(), von: vonId(n), text: `Kontrollabrechnung: ${vergleich.summe.gleich} gleich, ${vergleich.summe.abweichung} Abweichung(en)`, oeffentlich: true });
      geaendert(a, n);
      protokoll(db, n, "aendern", "eg_gruendungsauftrag", a.id, "Probe- bzw. Kontrollabrechnung");
      return auftragDetail(db, n, a, rolle);
    });
  }

  return aendernG((db) => {
    const a = X(db).auftraege.find((x) => x.id === a0.id);
    const g = a.gemeinschaftId ? gemeinschaftVon(db, a.gemeinschaftId) : null;
    const vl = (text, oeffentlich = true) => a.verlauf.push({ am: jetzt(), von: vonId(n), text, oeffentlich });
    switch (aktion) {
      case "angebot": {
        nurBo();
        const ang = fach(() => angebotBereinigen(d, { heute: heute(), paket: a.paket }));
        a.status = fach(() => auftragUebergang(a, "angebot"));
        const jahr = heute().slice(0, 4);
        const nr = a.angebot?.nummer || `ANG-${jahr}-${String(X(db).auftraege.filter((x) => x.angebot?.nummer?.startsWith(`ANG-${jahr}`)).length + 1).padStart(4, "0")}`;
        a.angebot = { ...ang, nummer: nr, erstelltAm: jetzt(), erstelltVon: vonId(n) };
        a.signaturId = null;
        vl(`Angebot ${nr} erstellt (${ang.betragNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € netto, gültig bis ${datumDe(ang.gueltigBis)})`);
        const u = nutzerById(db, a.auftraggeberKontoId);
        if (u) benachrichtigen(db, u, { art: "status", titel: `Angebot für „${a.arbeitsname}“`, text: `Ihr Angebot ${nr} liegt im Portal bereit.`, link: `/portal/eg/gruendung/${a.id}`, objektArt: "eg_gruendungsauftrag", objektId: a.id }, { mail: true });
        break;
      }
      case "annehmen":
        if (!kunde) throw verboten("Das Angebot nimmt der Auftraggeber an.");
        if (a.signaturId) throw konflikt("Bitte unterschreiben Sie den Auftrag elektronisch (Portal → Unterschriften).");
        if (d.bestaetigt !== true) throw ungueltig("Bitte bestätigen Sie die Beauftragung.");
        beauftragen(db, n, a, { art: "klick", nachweis: "Annahme im Portal" });
        break;
      case "beauftragt_manuell":
        nurBo();
        if (!String(d.nachweis || "").trim()) throw ungueltig("Bitte den Nachweis angeben (z. B. unterschriebenes Angebot per Post).");
        beauftragen(db, n, a, { art: "manuell", am: /^\d{4}-\d{2}-\d{2}$/.test(String(d.datum || "")) ? d.datum : heute(), nachweis: String(d.nachweis).slice(0, 200) });
        break;
      case "ablehnen":
        if (!kunde) throw verboten("Das Angebot lehnt der Auftraggeber ab.");
        a.status = fach(() => auftragUebergang(a, "ablehnen"));
        vl(`Angebot abgelehnt${d.grund ? `: ${String(d.grund).slice(0, 200)}` : ""}`);
        break;
      case "abbrechen":
        nurBo();
        if (!String(d.grund || "").trim()) throw ungueltig("Bitte einen Grund angeben.");
        a.status = fach(() => auftragUebergang(a, "abbrechen"));
        vl(`Auftrag abgebrochen: ${String(d.grund).slice(0, 200)}`);
        break;
      case "uebergeben":
        nurBo();
        a.status = fach(() => auftragUebergang(a, "uebergeben"));
        vl("Gründung abgeschlossen und übergeben");
        break;
      case "gemeinschaft_verknuepfen": {
        nurBo();
        const ziel = gemeinschaftVon(db, d.gemeinschaftId);
        if (!ziel) throw ungueltig("Gemeinschaft nicht gefunden.");
        if (X(db).auftraege.some((x) => x.id !== a.id && x.gemeinschaftId === ziel.id && !["abgebrochen", "uebergeben"].includes(x.status))) throw konflikt("Mit dieser Gemeinschaft ist bereits ein offener Auftrag verknüpft.");
        a.gemeinschaftId = ziel.id;
        a.schritte = schritteErzeugen(a, { vorhanden: a.schritte, gemeinschaft: ziel });
        a.status = auftragStatusAusSchritten(a, a.schritte);
        vl(`Gemeinschaft „${ziel.name}“ verknüpft`);
        break;
      }
      case "daten": {
        if (!boW && !(kunde && a.status === "anfrage")) throw verboten("Die Angaben ändert nach dem Angebot ÖkoInvest.");
        const neu = d.daten || {};
        const b = fach(() => auftragBereinigen({ ...a, ...neu, ansprechpartner: { ...a.ansprechpartner, ...(neu.ansprechpartner || {}) }, bestehend: neu.bestehend ? { ...(a.bestehend || {}), ...neu.bestehend } : a.bestehend }));
        Object.assign(a, b, { paketLabel: GR_PAKETE[b.paket].label });
        if (boW && neu.bearbeiterId !== undefined) a.bearbeiterId = neu.bearbeiterId || null;
        a.schritte = schritteErzeugen(a, { vorhanden: a.schritte, gemeinschaft: g });
        a.status = auftragStatusAusSchritten(a, a.schritte);
        vl("Angaben aktualisiert", false);
        break;
      }
      case "schritte_aktualisieren":
        nurBo();
        a.schritte = schritteErzeugen(a, { vorhanden: a.schritte, gemeinschaft: g ? { ...g, kennzahlen: stammKennzahlen(g, E(db)) } : null });
        a.status = auftragStatusAusSchritten(a, a.schritte);
        break;
      case "stichtag": {
        nurBo();
        if (a.paket !== "wechsel") throw konflikt("Der Stichtag gilt für einen Wechsel.");
        const p = umstellungsplan({ stichtag: d.stichtag, heute: heute() });
        if (!p.stichtag) throw ungueltig(p.warnungen[0]);
        a.stichtag = p.stichtag;
        vl(`Stichtag ${datumDe(p.stichtag)} festgelegt (letzte Abrechnung beim Altdienstleister: ${p.letzteAltabrechnung})`);
        break;
      }
      case "statuten":
        if (!boW && !kunde) throw verboten("Statuten-Angaben ändern Auftraggeber bzw. ÖkoInvest.");
        a.statutenEingaben = statutenEingaben({ ...(a.statutenEingaben || {}), ...(d.eingaben || {}) });
        vl("Angaben für die Statuten gespeichert", false);
        break;
      case "notiz": {
        const t = String(d.text || "").trim().slice(0, 1000);
        if (!t) throw ungueltig("Bitte einen Text eingeben.");
        vl(t, !(bo && d.intern === true));
        if (!bo) for (const adm of aktiveAdmins(db).slice(0, 10)) {
          const u = typeof adm === "string" ? nutzerById(db, adm) : adm;
          if (u && darfLesen(u, "eg")) benachrichtigen(db, u, { art: "anfrage", titel: `Nachricht zum Auftrag ${a.arbeitsname}`, text: t.slice(0, 140), link: `/portal/admin/eg/gruendung/${a.id}`, objektArt: "eg_gruendungsauftrag", objektId: a.id }, { mail: false });
        }
        break;
      }
      case "mitglieder_informieren": {
        nurBo();
        if (!g) throw konflikt("Bitte zuerst die Gemeinschaft anlegen bzw. verknüpfen.");
        if (!a.stichtag) throw konflikt("Bitte zuerst den Stichtag festlegen.");
        const msg = wechselNachricht({ name: g.name, stichtag: a.stichtag, altdienstleister: ALT_LABEL[a.bestehend?.altdienstleister] || "" });
        let k = 0;
        for (const m of E(db).mitglieder.filter((y) => y.gemeinschaftId === g.id && y.kontoId && MITGLIED_AKTIV.includes(y.status))) {
          const u = nutzerById(db, m.kontoId);
          if (u) { benachrichtigen(db, u, { art: "status", titel: msg.titel, text: msg.text, link: "/portal/eg", objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: true }); k++; }
        }
        vl(`Mitglieder informiert (${k} mit Portalkonto; übrige mit der Mitgliederinformation als PDF)`);
        break;
      }
      default:
        throw ungueltig("Unbekannte Aktion.");
    }
    geaendert(a, n);
    protokoll(db, n, "aendern", "eg_gruendungsauftrag", a.id, `Auftrag: ${aktion}`);
    return auftragDetail(db, n, a, auftragRolle(db, n, a));
  });
}

const BEARBEITBAR = ["beauftragt", "machbarkeit", "rechtsform_statuten", "konstituierung", "behoerde", "finanzamt_bank", "marktpartner", "nb_vertrag", "eda", "mitgliederaufnahme", "wechsel_mandat", "wechsel_daten", "wechsel_parallel", "wechsel_umstellung", "betriebsbereit"];

/**
 * Schritt-Aktion. Wirkung erledigter Schritte (Felder, Status der Gemeinschaft, Ereignis an WP2) läuft über WP1/WP2 –
 * vom Auftraggeber erledigte Schritte führt die Gründungsberatung mit dem Systemkonto aus (protokolliert).
 */
export async function grSchrittAktion(n, id, { schritt = "", aktion = "", ...d } = {}) {
  const db0 = await bereit();
  const { a: a0, rolle } = auftragLaden(db0, n, id);
  const bo = rolle === "backoffice" && boSchreiben(n);
  const kunde = alsAuftraggeber(db0, n, a0, rolle);
  if (!BEARBEITBAR.includes(a0.status)) throw konflikt("Schritte werden nach der Beauftragung bearbeitet.");
  const x0 = a0.schritte.find((s) => s.schluessel === schritt);
  if (!x0) throw nichtGefunden("Schritt nicht gefunden.");
  if (!bo) {
    if (!kunde) throw verboten("Diesen Schritt bearbeitet ÖkoInvest.");
    if (x0.zustaendig !== "auftraggeber" && aktion !== "notiz") throw verboten("Diesen Schritt bearbeitet ÖkoInvest – Sie können eine Notiz hinterlassen.");
    if (["entfaellt", "wiedereroeffnen", "frist"].includes(aktion)) throw verboten("Diese Aktion führt ÖkoInvest aus.");
  }
  const g0 = a0.gemeinschaftId ? gemeinschaftVon(db0, a0.gemeinschaftId) : null;
  const neu = fach(() => schrittAktion(x0, aktion, { ...d, heute: heute(), von: vonId(n), gemeinschaft: g0, paket: a0.paket }));
  const meldungen = [];
  // Wirkung vor dem Speichern: lehnt WP1 ab, bleibt der Schritt unverändert
  if (aktion === "erledigen") {
    const w = schrittWirkung(neu, { auftrag: a0, gemeinschaft: g0 });
    const def = schrittDefinition(neu.schluessel, a0.paket) || {};
    if (!g0 && def.feld && neu.wert) throw konflikt("Bitte zuerst die Gemeinschaft anlegen (ÖkoInvest) – dann wird der Wert in die Stammdaten übernommen.");
    const ausf = bo ? n : SYSTEM;
    if (g0 && neu.schluessel === "eda_bereit") {
      const p = edaBereitPruefen({ ...g0, kennzahlen: stammKennzahlen(g0, E(db0)) }, { schritte: a0.schritte.map((s) => (s.schluessel === neu.schluessel ? neu : s)), organisator: a0.organisator });
      if (!p.bereit) throw konflikt(`Noch nicht EDA-bereit: ${p.fehlend.join(" ")}`);
    }
    if (g0 && Object.keys(w.felder).length) {
      const voll = (await egGemeinschaft(ausf, g0.id)).gemeinschaft;
      await egGemeinschaftSpeichern(ausf, { id: g0.id, daten: { ...voll, ...w.felder, dienstleistung: w.felder.dienstleistung || voll.dienstleistung } });
    }
    if (g0 && w.statusZiel) {
      let st = gemeinschaftVon(await bereit(), g0.id).status;
      for (const s of statusPfad(st, w.statusZiel)) {
        try {
          st = (await egGemeinschaftStatus(ausf, g0.id, { nach: s, grund: `Gründungsschritt ${neu.label}` })).status;
        } catch (e) {
          meldungen.push(`Status der Gemeinschaft nicht geändert: ${e.message}`);
          break;
        }
      }
    }
    if (g0 && w.ereignis) {
      const r = await ereignisSenden(w.ereignis, { gemeinschaftId: g0.id });
      meldungen.push(r.zugestellt ? "EDA-Erstanmeldung kann starten (Ereignis an WP2 zugestellt)." : `Ereignis „${w.ereignis}“: ${r.fehler || "ohne Empfänger"}`);
    }
  }
  return aendernG((db) => {
    const a = X(db).auftraege.find((y) => y.id === a0.id);
    const i = a.schritte.findIndex((s) => s.schluessel === schritt);
    a.schritte[i] = neu;
    if (aktion === "erledigen" && schritt === "gruendungsversammlung") a.gruendungsversammlungAm = neu.datum;
    const vorher = a.status;
    a.status = auftragStatusAusSchritten(a, a.schritte);
    if (["erledigen", "entfaellt", "wiedereroeffnen"].includes(aktion)) a.verlauf.push({ am: jetzt(), von: vonId(n), text: `${neu.label}: ${SCHRITT_STATUS[neu.status].label}${neu.wert ? ` (${neu.wert})` : ""}`, oeffentlich: true });
    if (vorher !== a.status) {
      a.verlauf.push({ am: jetzt(), von: null, text: `Neuer Abschnitt: ${GR_STATUS[a.status]?.label}`, oeffentlich: true });
      const u = nutzerById(db, a.auftraggeberKontoId);
      if (u && u.id !== n.id) benachrichtigen(db, u, { art: "status", titel: `Gründung „${a.arbeitsname}“`, text: `Nächster Abschnitt: ${GR_STATUS[a.status]?.label}.`, link: `/portal/eg/gruendung/${a.id}`, objektArt: "eg_gruendungsauftrag", objektId: a.id }, { mail: false });
    }
    geaendert(a, n);
    protokoll(db, n, "aendern", "eg_gruendungsauftrag", a.id, `Schritt ${schritt}: ${aktion}`);
    return { ...auftragDetail(db, n, a, auftragRolle(db, n, a)), meldungen };
  });
}

// ================================================================ Dokumente

/** Zugriff für Dokumente: über den Auftrag bzw. als Organ/Backoffice (organe_statuten ≥ 1) der Gemeinschaft */
function dokumentKontext(db, n, { gemeinschaftId = "", auftragId = "" }) {
  if (auftragId) {
    const { a, rolle } = auftragLaden(db, n, auftragId);
    const g = a.gemeinschaftId ? gemeinschaftVon(db, a.gemeinschaftId) : null;
    return { a, g, rolle, k: g ? kontext(db, n, g) : null };
  }
  const { g, k } = zugriff(db, n, gemeinschaftId, "organe_statuten", 1);
  if (!istOrgan(k) && !k.backofficeStufe) throw verboten("Dokumente erzeugen die Organe der Gemeinschaft bzw. ÖkoInvest.");
  return { a: X(db).auftraege.find((x) => x.gemeinschaftId === g.id && x.status !== "abgebrochen") || null, g, rolle: k.backofficeStufe ? "backoffice" : "organ", k };
}

const STEUER_TEXT = { nicht_unternehmerisch: "nicht unternehmerisch", kleinunternehmer: "Kleinunternehmer", pauschalierter_landwirt: "pauschalierter Landwirt", regelbesteuert: "regelbesteuert", gemeinde_bga: "Gemeinde mit Betrieb gewerblicher Art" };

/**
 * Dokument aus einer Vorlage erzeugen (versioniert, SHA-256) bzw. gespeicherte Version laden ({dokumentId}).
 * Rückgabe { dokument, dok, pruefung } – die API-Route rendert daraus das PDF (server/eg-gruendung-pdf.js).
 */
export async function grDokumentErzeugen(n, { gemeinschaftId = "", auftragId = "", vorlage = "", daten = {}, dokumentId = "", speichern = true } = {}) {
  const db0 = await bereit();
  if (dokumentId) {
    const d = X(db0).dokumente.find((x) => x.id === String(dokumentId));
    if (!d) throw nichtGefunden("Dokument nicht gefunden.");
    dokumentKontext(db0, n, d.gemeinschaftId ? { gemeinschaftId: d.gemeinschaftId, auftragId: d.auftragId && auftragRolle(db0, n, X(db0).auftraege.find((x) => x.id === d.auftragId) || {}) ? d.auftragId : "" } : { auftragId: d.auftragId });
    return { dokument: dokumentKurz(d), dok: d.dok, pruefung: d.pruefung || null };
  }
  const v = VORLAGEN[vorlage];
  if (!v) throw ungueltig("Unbekannte Vorlage.");
  const ctx = dokumentKontext(db0, n, { gemeinschaftId, auftragId });
  const g = ctx.g;
  const x = E(db0);
  const gk = g ? { ...g, kennzahlen: stammKennzahlen(g, x) } : null;
  const eingabenRoh = daten && typeof daten === "object" ? daten : {};
  const statuten = statutenEingaben({ ...(X(db0).statuten.find((s) => s.gemeinschaftId === g?.id)?.eingaben || {}), ...(ctx.a?.statutenEingaben || {}), ...eingabenRoh });
  const darfPerson = !!g && (ctx.rolle === "backoffice" || egStufe(ctx.k, "stammdaten") >= 1);
  const mitglied = darfPerson && eingabenRoh.mitgliedId ? x.mitglieder.find((m) => m.id === eingabenRoh.mitgliedId && m.gemeinschaftId === g.id) || null : null;
  const zp = mitglied && eingabenRoh.zaehlpunktId ? x.zaehlpunkte.find((z) => z.id === eingabenRoh.zaehlpunktId) || null : null;
  const anlage = zp?.anlageId ? x.anlagen.find((y) => y.id === zp.anlageId) : null;
  const organe = g ? x.organe.filter((o) => o.gemeinschaftId === g.id).map((o) => ({ ...o, personName: o.kontoId ? nameVon(db0, o.kontoId) || o.name : o.name })) : [];
  const freie = Object.fromEntries(Object.entries(eingabenRoh).filter(([k, w]) => !["mitgliedId", "zaehlpunktId"].includes(k) && (typeof w !== "object" || w === null)).map(([k, w]) => [k, typeof w === "string" ? w.slice(0, 600) : w]));
  const dd = dokumentDaten({ gemeinschaft: gk, netzbetreiber: x.netzbetreiber, tarif: g ? tarifAm(x.tarife.filter((t) => t.gemeinschaftId === g.id), heute()) : null, mitglied, zaehlpunkt: zp, anlage, auftrag: ctx.a ? { ...ctx.a, paketLabel: GR_PAKETE[ctx.a.paket]?.label } : null, organe, eingaben: { ab: heute(), ...statuten, ...freie }, heute: heute() });
  if (mitglied && !dd.steuerstatusText) dd.steuerstatusText = STEUER_TEXT[mitglied.steuerstatusErzeuger] || "";
  const dok = vorlageRendern(v, dd);
  const pruefung = v.art === "statuten" ? statutenPruefen({ ...(gk || {}), modell: dd.modell, rechtsform: dd.rechtsform, name: dd.name, sitzOrt: dd.sitzOrt }, statuten, dok) : null;
  const hash = sha256(dok.text);
  if (!speichern) return { dokument: { id: "", vorlage, titel: dok.titel, version: 0, sha256: hash, stand: dok.stand, fehlend: dok.fehlend.length }, dok, pruefung };
  return aendernG((db) => {
    const gleiche = X(db).dokumente.filter((y) => y.vorlage === vorlage && (g ? y.gemeinschaftId === g.id : y.auftragId === ctx.a?.id) && (y.mitgliedId || "") === (mitglied?.id || ""));
    const letzte = gleiche.sort((p, q) => q.version - p.version)[0];
    if (letzte && letzte.sha256 === hash) return { dokument: dokumentKurz(letzte), dok: letzte.dok, pruefung: letzte.pruefung || null, unveraendert: true };
    const rec = { id: neueId("EGD"), vorlage, titel: dok.titel, version: (letzte?.version || 0) + 1, sha256: hash, stand: dok.stand, fehlend: dok.fehlend, dok, pruefung, gemeinschaftId: g?.id || "", auftragId: ctx.a?.id || "", mitgliedId: mitglied?.id || "", eingaben: freie, ...meta(n) };
    X(db).dokumente.push(rec);
    protokoll(db, n, "anlegen", "eg_dokument", rec.id, `Dokument erzeugt: ${rec.titel} (Version ${rec.version}, SHA-256 ${hash.slice(0, 12)}…)`);
    return { dokument: dokumentKurz(rec), dok, pruefung };
  });
}

// ================================================================ Import (Wechsel)

export async function grImportVorschau(n, gemeinschaftId, { csv = "", anbieter = "", zuordnung = null, importId = "", auftragId = "", dateiname = "" } = {}) {
  if (String(csv || "").length > 3_000_000) throw ungueltig("Die Datei ist zu groß (max. 3 MB) – bitte aufteilen.");
  return aendernG((db) => {
    const { g } = zugriff(db, n, gemeinschaftId, "stammdaten", 1);
    let rec = importId ? X(db).importe.find((i) => i.id === importId && i.gemeinschaftId === g.id) : null;
    if (importId && !rec) throw nichtGefunden("Import nicht gefunden.");
    if (rec && rec.status === "ausgefuehrt") throw konflikt("Dieser Import ist bereits übernommen.");
    let kopf;
    let kopfNorm;
    let zeilenRoh;
    if (csv) {
      const t = tabelleLesen(csv);
      if (!t.kopf.length) throw ungueltig("Die Datei ist leer bzw. ohne Kopfzeile.");
      ({ kopf, kopfNorm } = t);
      zeilenRoh = t.zeilen;
    } else if (rec) ({ kopf, kopfNorm, zeilenRoh } = rec);
    else throw ungueltig("Bitte eine CSV-Datei wählen oder Zellen aus Excel einfügen.");
    const erkannt = anbieterErkennen(kopfNorm);
    const z = zuordnung ? zuordnungBereinigen(zuordnung, kopf.length) : zuordnungVorschlagen(kopfNorm);
    const ds = zeilenAbbilden(zeilenRoh, z);
    const x = E(db);
    const bestandZp = x.zaehlpunkte.filter((zp) => x.teilnahmen.some((t) => t.zaehlpunktId === zp.id && t.gemeinschaftId === g.id)).map((zp) => zp.zaehlpunktnummer);
    const p = plausibilitaet(ds, { gemeinschaft: g, netzbetreiber: x.netzbetreiber, bestandZaehlpunkte: bestandZp });
    const daten = { gemeinschaftId: g.id, auftragId: String(auftragId || rec?.auftragId || ""), dateiname: String(dateiname || rec?.dateiname || "import.csv").slice(0, 120), anbieter: anbieter && ANBIETER_PROFILE[anbieter] ? anbieter : rec?.anbieter && !csv ? rec.anbieter : erkannt.anbieter, erkannt, kopf, kopfNorm, zeilenRoh, zuordnung: z, kennzahlen: p.kennzahlen, status: p.ok ? "geprueft" : "vorschau" };
    if (rec) Object.assign(rec, daten, { geaendertAm: jetzt(), geaendertVon: vonId(n) });
    else {
      rec = { id: neueId("EIM"), ...daten, ...meta(n) };
      X(db).importe.push(rec);
    }
    protokoll(db, n, "aendern", "eg_import", rec.id, `Import-Vorschau ${rec.dateiname}: ${p.kennzahlen.zeilen} Zeilen, ${p.fehler.length} Fehler`);
    return {
      import: importKurz(rec), kopf, zuordnung: z, felder: Object.fromEntries(Object.entries(IMPORT_FELDER).map(([k, f]) => [k, f.label])), anbieterProfile: Object.fromEntries(Object.entries(ANBIETER_PROFILE).map(([k, f]) => [k, { label: f.label, export: f.export }])),
      erkannt, plausibilitaet: p,
      vorschau: ds.slice(0, 200).map((d) => ({ zeile: d.zeile, name: d.mitglied.person.firma || [d.mitglied.person.vorname, d.mitglied.person.nachname].filter(Boolean).join(" "), mitgliedsnummer: d.mitglied.mitgliedsnummer, art: d.mitglied.art, email: d.mitglied.person.email, zaehlpunkt: d.zaehlpunkt?.nummer || "", richtung: d.zaehlpunkt?.richtung || "", teilnahmefaktor: d.teilnahme?.teilnahmefaktor ?? null, consentId: d.teilnahme?.consentId || "", kwp: d.anlage?.kwp ?? null, status: p.zeilenStatus[d.zeile] })),
    };
  });
}

export async function grImportAusfuehren(n, importId, { ohneFehlerzeilen = true, tarifUebernehmen = true } = {}) {
  const db0 = await bereit();
  const rec0 = X(db0).importe.find((i) => i.id === String(importId || ""));
  if (!rec0) throw nichtGefunden("Import nicht gefunden.");
  const { g } = zugriff(db0, n, rec0.gemeinschaftId, "stammdaten", 2);
  if (rec0.status === "ausgefuehrt") throw konflikt("Dieser Import ist bereits übernommen.");
  const x = E(db0);
  const ds = zeilenAbbilden(rec0.zeilenRoh, rec0.zuordnung);
  const bestandZp = x.zaehlpunkte.filter((zp) => x.teilnahmen.some((t) => t.zaehlpunktId === zp.id && t.gemeinschaftId === g.id)).map((zp) => zp.zaehlpunktnummer);
  const p = plausibilitaet(ds, { gemeinschaft: g, netzbetreiber: x.netzbetreiber, bestandZaehlpunkte: bestandZp });
  const fehlerZeilen = [...new Set(p.fehler.map((f) => f.zeile).filter(Boolean))];
  if (fehlerZeilen.length && !ohneFehlerzeilen) throw konflikt(`${fehlerZeilen.length} Zeile(n) mit Fehlern – bitte korrigieren oder ohne diese Zeilen übernehmen.`);
  const bereitsDa = ds.filter((d) => d.zaehlpunkt && bestandZp.includes(d.zaehlpunkt.nummer)).map((d) => d.zeile);
  const bestand = x.mitglieder.filter((m) => m.gemeinschaftId === g.id).map((m) => ({ mitgliedsnummer: m.mitgliedsnummer, email: m.person?.email || "" }));
  const plan = importPlan(ds, { bestand, ausschliessen: [...fehlerZeilen, ...bereitsDa] });
  const ergebnis = { angelegt: 0, geaendert: 0, aktiviert: 0, tarifId: "", fehlerZeilen: fehlerZeilen.length, uebersprungen: bereitsDa.length, podlist: "", meldungen: [] };
  try {
    if (plan.zeilen) {
      const r = await egCsvImport(n, g.id, { art: "mitglieder", csv: plan.csv, ausfuehren: true });
      ergebnis.angelegt = r.angelegt;
      ergebnis.geaendert = r.geaendert;
    }
    const db1 = await bereit();
    const aktivIds = plan.mitglieder.filter((m) => m.status === "aktiv").map((m) => E(db1).mitglieder.find((y) => y.gemeinschaftId === g.id && y.mitgliedsnummer === m.mitgliedsnummer && y.status === "aufgenommen")?.id).filter(Boolean);
    if (aktivIds.length) {
      const r = await egMassenaktion(n, g.id, { aktion: "mitglied_status", ids: aktivIds, werte: { nach: "aktiv" } });
      ergebnis.aktiviert = r.geaendert;
      if (r.fehler.length) ergebnis.meldungen.push(`${r.fehler.length} Mitglied(er) nicht aktiviert.`);
    }
    if (tarifUebernehmen && plan.tarif && plan.tarif.bezugspreisCt !== null && plan.tarif.einspeisepreisCt !== null) {
      const a = rec0.auftragId ? X(db1).auftraege.find((y) => y.id === rec0.auftragId) : null;
      try {
        const t = await egTarifSpeichern(n, { gemeinschaftId: g.id, daten: { bezeichnung: `Übernommen aus ${ANBIETER_PROFILE[rec0.anbieter]?.label || "Altsystem"}`, gueltigAb: a?.stichtag || heute(), bezugspreisCt: plan.tarif.bezugspreisCt, einspeisepreisCt: plan.tarif.einspeisepreisCt, status: "entwurf" } });
        ergebnis.tarifId = t.id;
      } catch (e) {
        ergebnis.meldungen.push(`Tarif nicht übernommen: ${e.message}`);
      }
    }
  } catch (e) {
    await aendernG((db) => {
      const r = X(db).importe.find((i) => i.id === rec0.id);
      Object.assign(r, { status: "fehlgeschlagen", ergebnis: { ...ergebnis, fehler: e.message }, geaendertAm: jetzt(), geaendertVon: vonId(n) });
    });
    throw e;
  }
  const ev = await ereignisSenden("eg.import.uebernommen", { gemeinschaftId: g.id });
  ergebnis.podlist = ev.zugestellt ? "EC_PODLIST angefordert – Abgleich Soll/Ist folgt (WP2)." : ev.fehler || "kein Empfänger";
  return aendernG((db) => {
    const r = X(db).importe.find((i) => i.id === rec0.id);
    Object.assign(r, { status: "ausgefuehrt", ergebnis, soll: plan.soll, zuordnungNummern: plan.mitglieder.map((m) => ({ alt: m.alteNummer, neu: m.mitgliedsnummer, saldoEur: m.saldoEur })), ausgefuehrtAm: jetzt(), geaendertAm: jetzt(), geaendertVon: vonId(n) });
    protokoll(db, n, "aendern", "eg_import", r.id, `Import übernommen: ${ergebnis.angelegt} neu, ${ergebnis.geaendert} aktualisiert, ${ergebnis.fehlerZeilen} Fehlerzeilen ausgelassen`);
    return { import: importKurz(r), ergebnis, soll: plan.soll.length };
  });
}

// ================================================================ Förder-Check

export async function grFoerdercheck(n, { gemeinschaftId = "", auftragId = "", daten = {}, speichern = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db0 = await bereit();
  let g = null;
  let a = null;
  if (auftragId) ({ a } = auftragLaden(db0, n, auftragId));
  if (gemeinschaftId) g = zugriff(db0, n, gemeinschaftId, "mitgliederliste", 1).g;
  else if (a?.gemeinschaftId) g = gemeinschaftVon(db0, a.gemeinschaftId);
  const ausGemeinschaft = g ? E(db0).anlagen.filter((y) => y.gemeinschaftId === g.id).map((y) => ({ art: y.art, kwp: y.kwp ?? y.engpassleistungKw, speicherKwh: y.speicherKwh, status: y.status === "aktiv" ? "in_betrieb" : "geplant", bezeichnung: y.bezeichnung })) : [];
  const ausAuftrag = a ? [...(a.erzeugungKwp ? [{ art: "pv", kwp: a.erzeugungKwp, status: "geplant", bezeichnung: "geplante PV (laut Anfrage)" }] : []), ...(a.speicherKwh ? [{ art: "speicher", speicherKwh: a.speicherKwh, status: "geplant", bezeichnung: "geplanter Speicher" }] : [])] : [];
  const anlagen = Array.isArray(daten.anlagen) && daten.anlagen.length ? daten.anlagen : ausGemeinschaft.length ? ausGemeinschaft : ausAuftrag;
  const eingaben = { modell: daten.modell || g?.modell || a?.modell || "eeg", bundesland: daten.bundesland || a?.bundesland || "", antragsteller: daten.antragsteller || "eg", gemeindeBeteiligt: daten.gemeindeBeteiligt ?? a?.gemeindeBeteiligt ?? false, anlagen };
  const ergebnis = foerderCheck(eingaben);
  if (!speichern || (!g && !a)) return { foerdercheck: { id: "", eingaben, ...ergebnis }, programme: FOERDER_PROGRAMME };
  return aendernG((db) => {
    const rec = { id: neueId("EFC"), gemeinschaftId: g?.id || "", auftragId: a?.id || "", eingaben, ergebnis, ...meta(n) };
    X(db).foerderchecks.push(rec);
    protokoll(db, n, "anlegen", "eg_foerdercheck", rec.id, `Förder-Check: ${ergebnis.kennzahlen.pruefen} zu prüfen, ${ergebnis.kennzahlen.geeignet} geeignet`);
    return { foerdercheck: { id: rec.id, eingaben, ...ergebnis }, programme: FOERDER_PROGRAMME };
  });
}

// ================================================================ Verein: Organe, Versammlungen, Beschlüsse, Beiträge

function gvAusgabe(db, gv, { mitglied = null, organ = false } = {}) {
  const stimmen = X(db).stimmen.filter((s) => s.gvId === gv.id);
  const berechtigt = E(db).mitglieder.filter((m) => m.gemeinschaftId === gv.gemeinschaftId && MITGLIED_AKTIV.includes(m.status)).length;
  const eigene = mitglied ? stimmen.find((s) => s.mitgliedId === mitglied.id) : null;
  const offen = abstimmungOffen(gv, jetztLokal());
  return {
    id: gv.id, gemeinschaftId: gv.gemeinschaftId, titel: gv.titel, art: gv.art, form: gv.form, datum: gv.datum, ort: gv.ort, zugang: gv.status !== "entwurf" || organ ? gv.zugang : "", abstimmungBis: gv.abstimmungBis, einleitung: gv.einleitung,
    tagesordnung: gv.tagesordnung, unterlagen: gv.unterlagen, status: gv.status, statusLabel: GV_STATUS[gv.status]?.label || gv.status, ton: GV_STATUS[gv.status]?.ton || "neutral", eingeladenAm: gv.eingeladenAm || "", abgeschlossenAm: gv.abgeschlossenAm || "", absage: gv.absage || null,
    ergebnis: gv.status === "abgeschlossen" ? gv.ergebnis : null, protokoll: gv.status === "abgeschlossen" ? gv.protokoll : null, zwischenstand: organ && gv.status === "abstimmung" ? ergebnisRechnen(gv, stimmen, berechtigt) : null,
    stimmberechtigt: berechtigt, abgegeben: organ ? stimmen.length : undefined, abstimmungOffen: offen, eigeneStimme: eigene ? { am: eigene.am, stimmen: eigene.stimmen } : null,
    darfAbstimmen: !!mitglied && !eigene && offen && ONLINE_FORMEN.includes(gv.form),
  };
}

function vereinAusgabe(db, n, g, k) {
  const h = heute();
  const x = E(db);
  const organ = istOrgan(k) || !!k.backofficeStufe;
  const mitglied = x.mitglieder.find((m) => m.gemeinschaftId === g.id && m.kontoId === n.id && MITGLIED_AKTIV.includes(m.status)) || null;
  const vers = X(db).versammlungen.filter((v) => v.gemeinschaftId === g.id && (organ || v.status !== "entwurf")).sort((p, q) => String(q.datum).localeCompare(String(p.datum)));
  const organe = x.organe.filter((o) => o.gemeinschaftId === g.id).map((o) => ({ id: o.id, funktion: o.funktion, funktionLabel: ORGAN_FUNKTIONEN[o.funktion]?.label || o.funktion, personName: o.kontoId ? nameVon(db, o.kontoId) || o.name : o.name, kontoId: organ ? o.kontoId : undefined, email: organ ? o.email : undefined, von: o.von, bis: o.bis, zeichnungsberechtigt: o.zeichnungsberechtigt, gewaehltIn: o.gewaehltIn, status: o.status, wirksam: organWirksam(o, h) }));
  const statuten = statutenEingaben(X(db).statuten.find((s) => s.gemeinschaftId === g.id)?.eingaben || {});
  const darfBeitrag = egStufe(k, "buchhaltung") >= 1;
  const beitraege = darfBeitrag ? X(db).beitraege.filter((b) => b.gemeinschaftId === g.id).map((b) => {
    const m = x.mitglieder.find((y) => y.id === b.mitgliedId);
    return { ...b, mitgliedName: m ? m.person?.firma || [m.person?.vorname, m.person?.nachname].filter(Boolean).join(" ") : "", mitgliedsnummer: m?.mitgliedsnummer || "" };
  }) : [];
  const tarif = tarifAm(x.tarife.filter((t) => t.gemeinschaftId === g.id), h);
  const aufl = X(db).aufloesungen.find((y) => y.gemeinschaftId === g.id) || null;
  return {
    gemeinschaft: { id: g.id, name: g.name, modell: g.modell, modellKurz: EG_MODELLE[g.modell]?.kurz, rechtsform: g.rechtsform, rechtsformLabel: RECHTSFORMEN[g.rechtsform]?.label || g.rechtsform, status: g.status, statusLabel: GEMEINSCHAFT_STATUS[g.status]?.label || g.status },
    versammlungen: vers.map((v) => gvAusgabe(db, v, { mitglied, organ })),
    beschluesse: X(db).beschluesse.filter((b) => b.gemeinschaftId === g.id && (organ || b.gremium === "gv")).sort((p, q) => q.datum.localeCompare(p.datum)),
    organe, organCheck: organ ? organCheck(g, x.organe, { heute: h, funktionsperiodeJahre: Number(statuten.funktionsperiodeJahre) || 3 }) : null,
    gvPflicht: gvPflicht({ rechtsform: g.rechtsform, versammlungen: X(db).versammlungen.filter((v) => v.gemeinschaftId === g.id), heute: h, turnusJahre: statuten.gvTurnusJahre, gegruendetAm: g.erstelltAm?.slice(0, 10) }),
    statuten, gvKonfig: gvKonfig(g, statuten), tagesordnungVorlage: organ ? gvTagesordnungVorlage({ art: "ordentlich", rechtsform: g.rechtsform, tarif: true, beitrag: true }) : [],
    beitraege, beitragsUebersicht: darfBeitrag ? beitragsUebersicht(beitraege, { jahr: Number(h.slice(0, 4)) }) : null, beitragTarif: tarif ? { mitgliedsbeitragJahr: tarif.mitgliedsbeitragJahr, einmalgebuehrBeitritt: tarif.einmalgebuehrBeitritt, bezeichnung: tarif.bezeichnung } : null,
    dokumente: organ ? X(db).dokumente.filter((d) => d.gemeinschaftId === g.id).sort((p, q) => q.erstelltAm.localeCompare(p.erstelltAm)).map(dokumentKurz) : [],
    vorlagen: organ ? vorlagenFuer({ modell: g.modell, rechtsform: g.rechtsform }) : [],
    aufloesung: aufl ? { ...aufl, ...aufloesungCheckliste(g, { teilnahmenAktiv: x.teilnahmen.filter((t) => t.gemeinschaftId === g.id && t.status === "aktiv").length, stand: aufl.stand || {} }) } : null,
    eigenesMitglied: mitglied ? { id: mitglied.id, mitgliedsnummer: mitglied.mitgliedsnummer } : null,
    rechte: { gv: egStufe(k, "gv"), organe: egStufe(k, "organe_statuten"), buchhaltung: egStufe(k, "buchhaltung"), organ, backoffice: k.backofficeStufe || 0 },
    rollen: k.rollen, heute: h, beitragEinhebung: BEITRAG_EINHEBUNG,
  };
}

/**
 * Verein (Lesen ohne `aktion`): Versammlungen, Beschlüsse, Organe (+ Prüfung), Beiträge, Statuten-Eingaben, Auflösung.
 * Aktionen: gv_speichern · gv_einladen · gv_oeffnen · gv_abstimmen · gv_abschliessen · gv_absagen · beschluss_speichern ·
 *           organ_speichern · organ_beenden (über WP1) · beitraege_vorschreiben · beitrag_status · statuten_speichern
 */
export async function grVersammlungen(n, gemeinschaftId, { aktion = "", id = "", daten = {} } = {}) {
  const db0 = await bereit();
  const { g, k } = zugriff(db0, n, gemeinschaftId, "gv", 1);
  if (!aktion) return vereinAusgabe(db0, n, g, k);
  const organ = istOrgan(k) || !!k.backofficeStufe;
  const recht = (r, s) => {
    if (egStufe(k, r) < s) throw verboten("Ihre Rolle in dieser Gemeinschaft erlaubt diese Aktion nicht.");
  };
  if (aktion === "organ_speichern" || aktion === "organ_beenden") {
    recht("organe_statuten", 2);
    if (aktion === "organ_speichern") await egOrganSpeichern(n, { gemeinschaftId: g.id, id: id || null, daten });
    else await egOrganBeenden(n, id, { bis: daten.bis });
    const db1 = await bereit();
    return vereinAusgabe(db1, n, gemeinschaftVon(db1, g.id), kontext(db1, n, gemeinschaftVon(db1, g.id)));
  }
  return aendernG((db) => {
    const x = X(db);
    const statuten = statutenEingaben(x.statuten.find((s) => s.gemeinschaftId === g.id)?.eingaben || {});
    const konfig = gvKonfig(g, statuten);
    const gv = id ? x.versammlungen.find((v) => v.id === id && v.gemeinschaftId === g.id) : null;
    if (aktion.startsWith("gv_") && aktion !== "gv_speichern" && !gv) throw nichtGefunden("Versammlung nicht gefunden.");
    if (aktion === "gv_speichern" && id && !gv) throw nichtGefunden("Versammlung nicht gefunden.");
    const aktiv = E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id && MITGLIED_AKTIV.includes(m.status));
    switch (aktion) {
      case "gv_speichern": {
        if (!organ) throw verboten("Versammlungen bereiten die Organe bzw. ÖkoInvest vor.");
        recht("gv", 1);
        const b = fach(() => versammlungBereinigen(daten, konfig));
        if (gv) {
          if (gv.status !== "entwurf") throw konflikt("Nur Entwürfe sind änderbar.");
          Object.assign(gv, b);
          geaendert(gv, n);
        } else x.versammlungen.push({ id: neueId("EGV"), gemeinschaftId: g.id, ...b, status: "entwurf", ...meta(n) });
        protokoll(db, n, "aendern", "eg_versammlung", gv?.id || g.id, `Versammlung „${b.titel}“ gespeichert`);
        break;
      }
      case "gv_einladen": {
        recht("gv", 2);
        fach(() => einladungPruefen(gv, konfig, { heute: heute() }));
        gv.status = "eingeladen";
        gv.eingeladenAm = jetzt();
        let k2 = 0;
        for (const m of aktiv.filter((y) => y.kontoId)) {
          const u = nutzerById(db, m.kontoId);
          if (u) { benachrichtigen(db, u, { art: "status", titel: `Einladung: ${gv.titel}`, text: `${g.name} lädt Sie am ${datumDe(gv.datum)} um ${String(gv.datum).slice(11, 16)} Uhr ein${ONLINE_FORMEN.includes(gv.form) ? " – Teilnahme und Abstimmung auch online" : ""}.`, link: `/portal/eg/${g.id}/verein`, objektArt: "eg_versammlung", objektId: gv.id }, { mail: true }); k2++; }
        }
        gv.eingeladen = aktiv.length;
        gv.eingeladenPortal = k2;
        protokoll(db, n, "status", "eg_versammlung", gv.id, `Einladung versendet (${aktiv.length} Mitglieder, ${k2} über das Portal)`);
        break;
      }
      case "gv_oeffnen":
        recht("gv", 2);
        if (gv.status !== "eingeladen") throw konflikt("Die Abstimmung wird nach der Einladung geöffnet.");
        if (!ONLINE_FORMEN.includes(gv.form)) throw konflikt("Bei einer Präsenzversammlung wird im Saal abgestimmt – Ergebnis beim Abschluss eintragen.");
        gv.status = "abstimmung";
        protokoll(db, n, "status", "eg_versammlung", gv.id, "Online-Abstimmung geöffnet");
        break;
      case "gv_abstimmen": {
        recht("gv", 1);
        const m = aktiv.find((y) => y.kontoId === n.id);
        if (!m) throw verboten("Abstimmen können stimmberechtigte Mitglieder mit eigenem Portalkonto.");
        if (!abstimmungOffen(gv, jetztLokal())) throw konflikt("Die Abstimmung ist nicht geöffnet.");
        if (x.stimmen.some((s) => s.gvId === gv.id && s.mitgliedId === m.id)) throw konflikt("Sie haben bereits abgestimmt – die Stimme kann nicht geändert werden.");
        x.stimmen.push({ id: neueId("EGS"), gvId: gv.id, mitgliedId: m.id, am: jetzt(), stimmen: fach(() => stimmeBereinigen(daten.stimmen || daten, gv)) });
        protokoll(db, n, "anlegen", "eg_stimme", gv.id, `Stimme abgegeben (${gv.titel})`);
        break;
      }
      case "gv_abschliessen": {
        recht("gv", 2);
        if (!["eingeladen", "abstimmung"].includes(gv.status)) throw konflikt("Abgeschlossen wird eine eingeladene Versammlung.");
        const stimmen = x.stimmen.filter((s) => s.gvId === gv.id);
        const ab = fach(() => abschlussBereinigen(daten, gv, { stimmberechtigt: aktiv.length, online: stimmen.length }));
        gv.ergebnis = ergebnisRechnen(gv, stimmen, aktiv.length, { anwesend: ab.anwesend, tops: ab.tops });
        gv.protokoll = { ...ab, sha256: sha256(stimmenKanonisch(gv.id, stimmen)), am: jetzt() };
        gv.status = "abgeschlossen";
        gv.abgeschlossenAm = jetzt();
        for (const b of beschluesseAusVersammlung(gv, gv.ergebnis)) x.beschluesse.push({ id: neueId("EBS"), gemeinschaftId: g.id, ...b, ...meta(n) });
        protokoll(db, n, "status", "eg_versammlung", gv.id, `Versammlung abgeschlossen, Protokoll SHA-256 ${gv.protokoll.sha256.slice(0, 12)}…`);
        break;
      }
      case "gv_absagen":
        recht("gv", 2);
        if (["abgeschlossen", "abgesagt"].includes(gv.status)) throw konflikt("Diese Versammlung kann nicht mehr abgesagt werden.");
        if (!String(daten.grund || "").trim()) throw ungueltig("Bitte einen Grund angeben.");
        gv.status = "abgesagt";
        gv.absage = { grund: String(daten.grund).slice(0, 300), am: jetzt() };
        if (gv.eingeladenAm) for (const m of aktiv.filter((y) => y.kontoId)) {
          const u = nutzerById(db, m.kontoId);
          if (u) benachrichtigen(db, u, { art: "status", titel: `Abgesagt: ${gv.titel}`, text: gv.absage.grund, link: `/portal/eg/${g.id}/verein`, objektArt: "eg_versammlung", objektId: gv.id }, { mail: true });
        }
        break;
      case "beschluss_speichern": {
        if (egStufe(k, "organe_statuten") < 2 && egStufe(k, "gv") < 2) throw verboten("Beschlüsse erfassen Vorstand und Schriftführung.");
        const b = fach(() => beschlussBereinigen(daten, { heute: heute() }));
        x.beschluesse.push({ id: neueId("EBS"), gemeinschaftId: g.id, ...b, ...meta(n) });
        protokoll(db, n, "anlegen", "eg_beschluss", g.id, `Beschluss erfasst: ${b.gegenstand} (${b.angenommen ? "angenommen" : "abgelehnt"})`);
        break;
      }
      case "beitraege_vorschreiben": {
        recht("buchhaltung", 2);
        const tarif = tarifAm(E(db).tarife.filter((t) => t.gemeinschaftId === g.id), heute());
        const jahr = Number(daten.jahr) || Number(heute().slice(0, 4));
        const neu = fach(() => beitraegeVorschreiben({ mitglieder: E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id), jahr, betragJahr: daten.betragJahr ?? tarif?.mitgliedsbeitragJahr ?? 0, beitrittsgebuehr: daten.beitrittsgebuehr ?? tarif?.einmalgebuehrBeitritt ?? 0, anteilig: daten.anteilig === true, vorhandene: x.beitraege.filter((b) => b.gemeinschaftId === g.id), faelligAm: daten.faelligAm }));
        const einhebung = daten.einhebung === "abrechnung" ? "abrechnung" : "gesondert";
        for (const b of neu) x.beitraege.push({ id: neueId("EBT"), gemeinschaftId: g.id, ...b, einhebung, ...meta(n) });
        protokoll(db, n, "anlegen", "eg_beitrag", g.id, `${neu.length} Beitragsvorschreibung(en) für ${jahr}`);
        break;
      }
      case "beitrag_status": {
        recht("buchhaltung", 2);
        const st = ["offen", "bezahlt", "erlassen"].includes(daten.status) ? daten.status : "";
        if (!st) throw ungueltig("Status: offen, bezahlt oder erlassen.");
        const ids = new Set((Array.isArray(daten.ids) ? daten.ids : []).map(String));
        let z = 0;
        for (const b of x.beitraege.filter((y) => y.gemeinschaftId === g.id && ids.has(y.id))) { b.status = st; b.bezahltAm = st === "bezahlt" ? heute() : ""; geaendert(b, n); z++; }
        protokoll(db, n, "aendern", "eg_beitrag", g.id, `${z} Beitrag/Beiträge → ${st}`);
        break;
      }
      case "statuten_speichern": {
        recht("organe_statuten", 2);
        const e = statutenEingaben({ ...statuten, ...daten });
        const s = x.statuten.find((y) => y.gemeinschaftId === g.id);
        if (s) { s.eingaben = e; geaendert(s, n); } else x.statuten.push({ gemeinschaftId: g.id, eingaben: e, ...meta(n) });
        break;
      }
      default:
        throw ungueltig("Unbekannte Aktion.");
    }
    return vereinAusgabe(db, n, g, kontext(db, n, g));
  });
}

/** Auflösung (Fachkonzept 2.7): lesen · starten {grund} · punkt {punkt, erledigt, notiz} · abschliessen {grund} */
export async function grAufloesung(n, gemeinschaftId, { aktion = "lesen", punkt = "", erledigt = true, notiz = "", grund = "" } = {}) {
  const db0 = await bereit();
  const { g } = zugriff(db0, n, gemeinschaftId, "organe_statuten", aktion === "lesen" ? 1 : 2);
  const ausgabe = (db, gg) => {
    const aufl = X(db).aufloesungen.find((y) => y.gemeinschaftId === gg.id) || { gemeinschaftId: gg.id, stand: {}, gestartetAm: "" };
    return { gemeinschaft: { id: gg.id, name: gg.name, status: gg.status, statusLabel: GEMEINSCHAFT_STATUS[gg.status]?.label }, ...aufl, ...aufloesungCheckliste(gg, { teilnahmenAktiv: E(db).teilnahmen.filter((t) => t.gemeinschaftId === gg.id && ["aktiv", "abmeldung_angefragt"].includes(t.status)).length, stand: aufl.stand || {} }) };
  };
  if (aktion === "lesen") return ausgabe(db0, g);
  if (!["starten", "punkt", "abschliessen"].includes(aktion)) throw ungueltig("Unbekannte Aktion.");
  if (aktion === "starten") {
    if (!String(grund).trim()) throw ungueltig("Bitte den Auflösungsbeschluss angeben (Datum, Gremium, Mehrheit).");
    await egGemeinschaftStatus(n, g.id, { nach: "in_aufloesung", grund });
  }
  if (aktion === "abschliessen") {
    const db1 = await bereit();
    const c = ausgabe(db1, gemeinschaftVon(db1, g.id));
    if (!c.abschliessbar) throw konflikt(`Noch ${c.offen} Pflichtpunkt(e) offen.`);
    await egGemeinschaftStatus(n, g.id, { nach: "aufgeloest", grund: grund || "Auflösung abgeschlossen (Checkliste vollständig)" });
  }
  return aendernG((db) => {
    let aufl = X(db).aufloesungen.find((y) => y.gemeinschaftId === g.id);
    if (!aufl) {
      aufl = { gemeinschaftId: g.id, stand: {}, gestartetAm: "", ...meta(n) };
      X(db).aufloesungen.push(aufl);
    }
    if (aktion === "starten") Object.assign(aufl, { gestartetAm: heute(), beschluss: String(grund).slice(0, 300), stand: { ...aufl.stand, beschluss: { erledigt: true, am: heute(), notiz: String(grund).slice(0, 300) } } });
    if (aktion === "punkt") {
      if (!aufl.gestartetAm) throw konflikt("Bitte zuerst die Auflösung starten (Beschluss).");
      aufl.stand = { ...aufl.stand, [String(punkt).slice(0, 40)]: { erledigt: erledigt !== false, am: heute(), notiz: String(notiz || "").slice(0, 300) } };
    }
    if (aktion === "abschliessen") aufl.abgeschlossenAm = heute();
    geaendert(aufl, n);
    protokoll(db, n, "aendern", "eg_gemeinschaft", g.id, `Auflösung: ${aktion}${punkt ? ` ${punkt}` : ""}`);
    return ausgabe(db, gemeinschaftVon(db, g.id));
  });
}
