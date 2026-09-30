// src/lib/plattform/backend/demo/betrieb.js
//
// Betriebsführung der Anlagen im Demo-Backend – Referenz für plattform/api/betrieb.py (Vertrag: docs/API.md,
// Abschnitt „Betriebsführung“). Ergänzt „Anlagen & Monitoring“ (demo/anlagen.js) um:
//   Störung als Ticket (SLA, Ursache, Maßnahme, Ertragsausfall) · Serviceaufträge (Techniker/Dienstleister/Hersteller)
//   Versicherungsfälle · wiederkehrende Wartungspläne · Prüfprotokolle (E-Check/ÖVE/NIV, Thermografie) · Ersatzteillager
//   Einstrahlung je Monat (Performance Ratio) · Freigabe plausibilisierter Zählerstände · Fristen-Lauf (Aufgaben, Glocke)
//
// Daten unter db.betrieb (eigene Sammlung, beim ersten Zugriff mit Demo-Daten ergänzt). Anlagen, Störungen, Messpunkte,
// Komponenten und Wartungen bleiben in db.anlagen (Quelle: demo/anlagen.js).
//
// Rechte: ausschließlich Backoffice mit Bereich „anlagen“ (rechte.js): lesen ≥ 1 (Leitung, Betrieb, Buchhaltung, Lesen),
// schreiben = 2 (Leitung, Betrieb). Kunden sehen die Betriebsführung nicht (Kundensicht: /portal/anlagen, Team Kundenportal)
// – sie erhalten nur Benachrichtigungen zu Technikerterminen und behobenen Störungen.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { STOERUNG_OFFEN, WARTUNG_ARTEN } from "../../anlagen";
import {
  AUFTRAG_ARTEN, AUFTRAG_OFFEN, AUFTRAG_STATUS, BetriebFehler, ERSATZTEIL_BEWEGUNG, PRUEF_ARTEN, PRUEF_ERGEBNIS, PRUEF_PUNKTE, PRUEF_WARTUNG_ART, URSACHEN,
  VERSICHERUNG_ARTEN, VERSICHERUNG_OFFEN, VERSICHERUNG_STATUS, auftragUebergang, behebungPruefen, bestandNach, ertragsausfall, freigabePruefen, fristenErmitteln,
  meldefristBis, nachbestellung, naechsteFaelligkeit, planStand, planVorschlag, plausibilisieren, pruefungBewerten, slaStatus, versicherungUebergang,
} from "../../betrieb/kern";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import * as anlagenDemo from "./anlagen";

// Späte Bindung (Zirkelimport demo.js ↔ Teilmodule)
const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const protokoll = (...a) => intern.protokoll(...a);
const nutzerById = (...a) => intern.nutzerById(...a);
const nameVon = (...a) => intern.nameVon(...a);
const aktiveAdmins = (...a) => intern.aktiveAdmins(...a);
const BEREICH = "anlagen";
const SYSTEM_BETRIEB = Object.freeze({ id: "SYSTEM-BETRIEB", rollen: ["admin"], backofficeRollen: ["leitung"], aktiv: true, vorname: "Betriebsführung", nachname: "" });
const heute = () => new Date().toISOString().slice(0, 10);
const datumOk = (s) => (/^20\d\d-\d\d-\d\d$/.test(String(s || "")) ? String(s) : "");
const zeitOk = (s) => (/^20\d\d-\d\d-\d\dT\d\d:\d\d/.test(String(s || "")) && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : "");

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, BEREICH);
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, BEREICH);
function leseNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Betrieb).");
}
function schreibNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." : "Nur für das Backoffice (Betrieb).");
}
/** Fehler der reinen Regeln (BetriebFehler) → PlattformFehler mit gleichem Status */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof BetriebFehler) throw new PlattformFehler(e.status, e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, stoerungen: {}, auftraege: [], versicherungen: [], plaene: [], protokolle: [], ersatzteile: [], bewegungen: [], einstrahlung: [], freigaben: [], alarme: {}, laufAm: null };
}

function seed(db) {
  const B = db.betrieb;
  const A = db.anlagen;
  const t = jetzt();
  // Wartungspläne je Anlage aus der Landesvorlage, Fälligkeit aus der letzten Wartung gleicher Art
  for (const a of A.anlagen) {
    for (const p of planVorschlag(a, [])) B.plaene.push(planAusVorlage(db, a, p, t));
  }
  // Ersatzteillager (fiktive Artikel, keine realen Preise)
  const teile = [
    ["Wechselrichter-Lüftereinheit", "wechselrichter", "Beispielhersteller (Demo)", "LE-100", 2, 1, "Lager Ostermiething"],
    ["DC-Steckverbinder-Set (Stecker/Buchse, 10 Paar)", "modul", "Beispielhersteller (Demo)", "SV-10", 12, 4, "Servicefahrzeug"],
    ["Überspannungsschutz DC Typ 2", "wechselrichter", "Beispielhersteller (Demo)", "SPD-DC2", 1, 2, "Lager Ostermiething"],
    ["PV-Modul Ersatz (baugleich Demo)", "modul", "Beispielhersteller (Demo)", "MOD-430", 6, 4, "Lager Ostermiething"],
    ["Datenlogger (vorkonfiguriert)", "datenlogger", "Beispielhersteller (Demo)", "DL-4G", 1, 1, "Lager Ostermiething"],
  ];
  for (const [bezeichnung, art, hersteller, artikelnummer, bestand, mindestbestand, lagerort] of teile) {
    B.ersatzteile.push({ id: neueId("ET"), bezeichnung, art, hersteller, artikelnummer, einheit: "Stück", bestand, mindestbestand, zielbestand: null, lagerort, preisEur: null, bemerkung: "Demo-Artikel", aktiv: true, erstelltAm: t, geaendertAm: t });
  }
  // Serviceauftrag + Ticketdaten zur offenen Minderleistungs-Störung (Agri-PV, Reinigung beauftragt)
  const st = A.stoerungen.find((s) => STOERUNG_OFFEN.includes(s.status) && s.regel === "manuell") || A.stoerungen.find((s) => STOERUNG_OFFEN.includes(s.status));
  if (st) {
    B.auftraege.push({ id: neueId("SA"), anlageId: st.anlageId, stoerungId: st.id, planId: null, art: "dienstleister", dienstleister: "Service-Partner (Demo)", kontakt: "Disposition (Demo)", beschreibung: "Modulreinigung Reihe 3–7, Hubsteiger erforderlich.", termin: `${new Date(Date.now() + 3 * 86400e3).toISOString().slice(0, 10)}T08:00`, kostenEur: 1450, status: "terminiert", beauftragtAm: t, erledigtAm: null, bericht: "", verlauf: [{ am: t, text: "Beauftragt (Demo)" }, { am: t, text: "Termin vereinbart (Demo)" }], erstelltAm: t, geaendertAm: t });
  }
  // Versicherungsfall im Entwurf (Hagel, Carport)
  const carport = A.anlagen.find((a) => a.typ === "carport");
  if (carport) {
    const tag = new Date(Date.now() - 2 * 86400e3).toISOString().slice(0, 10);
    B.versicherungen.push({ id: neueId("VF"), anlageId: carport.id, stoerungId: null, art: "allgefahren", versicherer: "Beispiel-Versicherung AG (Demo)", police: "PV-DEMO-0001", schadennummer: "", schadentag: tag, meldefristBis: meldefristBis(tag), schadenbeschreibung: "Hagelschlag, zwei Module mit Glasbruch (Sichtprüfung vom Boden).", schadenEur: 1800, selbstbehaltEur: 500, ertragsausfallEur: null, erstattetEur: null, status: "entwurf", gemeldetAm: null, verspaetet: false, reguliertAm: null, abschlussGrund: "", bemerkung: "", verlauf: [{ am: t, text: "Angelegt (Demo)" }], erstelltAm: t, geaendertAm: t });
  }
}

function planAusVorlage(db, a, p, t = jetzt()) {
  const letzte = db.anlagen.wartungen.filter((w) => w.anlageId === a.id && w.art === p.art && w.status === "erledigt").sort((x, y) => String(y.datum).localeCompare(String(x.datum)))[0];
  let faellig = letzte ? naechsteFaelligkeit(letzte.datum, p.intervallMonate) : a.inbetriebnahme ? naechsteFaelligkeit(a.inbetriebnahme, p.intervallMonate) : "";
  while (faellig && faellig < heute() && !letzte) faellig = naechsteFaelligkeit(faellig, p.intervallMonate);
  return {
    id: neueId("WP"), anlageId: a.id, art: p.art, bezeichnung: p.bezeichnung, intervallMonate: p.intervallMonate, vorlaufTage: p.vorlaufTage || 30, norm: p.norm || "", hinweis: p.hinweis || "",
    dienstleister: "", naechsteFaelligkeit: faellig || heute(), letzteDurchfuehrung: letzte?.datum || "", aktiv: true, erstelltAm: t, geaendertAm: t,
  };
}

async function lesenBereit(n) {
  // Anlagen-Sammlung sicherstellen (Demo-Daten der Anlagen legt demo/anlagen.js an)
  await anlagenDemo.anlagen(n && boLesen(n) ? n : SYSTEM_BETRIEB, {});
  const db = await lesen();
  if (db.betrieb?.v) return db;
  await aendern((d) => {
    if (d.betrieb?.v) return;
    d.betrieb = leer();
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Betriebsführung-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(n, fn) {
  await lesenBereit(n);
  return aendern(fn);
}

function anlageVon(db, id) {
  const a = db.anlagen.anlagen.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Anlage nicht gefunden.");
  return a;
}
const anlageKurz = (a) => (a ? { id: a.id, name: a.name, typ: a.typ, land: a.land, kwp: a.kwp } : null);
const betriebKonten = (db, schreiben = false) => db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && (schreiben ? darfSchreiben(u, BEREICH) : darfLesen(u, BEREICH)));

/** Aufgabe im Backoffice (gleiche Struktur wie aufgabeAnlegen in demo.js) */
function aufgabeAnlegen(db, { titel, beschreibung, faelligAm, zustaendigId, vonId, bezugArt = null, bezugId = null }) {
  db.aufgaben = db.aufgaben || [];
  const a = { id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.mehrzeilig(beschreibung, 2000), faelligAm, zustaendigId, bezugArt, bezugId, status: "offen", erstelltVon: vonId || zustaendigId, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null };
  db.aufgaben.push(a);
  return a;
}
function zustaendigBetrieb(db) {
  const k = betriebKonten(db, true);
  return k.find((u) => (u.backofficeRollen || []).includes("betrieb")) || k[0] || null;
}
/** Kunde und Team der Anlage (für Technikertermine) */
function kundenEmpfaenger(db, a) {
  const m = new Map();
  if (a.kundeId) m.set(a.kundeId, nutzerById(db, a.kundeId));
  for (const x of (db.mitgliedschaften || []).filter((y) => y.organisationId && y.organisationId === a.organisationId)) m.set(x.nutzerId, nutzerById(db, x.nutzerId));
  return [...m.values()].filter(Boolean);
}

// ================================================================ Ausgabe

function ticketAusgabe(db, s) {
  const d = db.betrieb.stoerungen[s.id] || {};
  const a = db.anlagen.anlagen.find((x) => x.id === s.anlageId);
  return {
    id: s.id, anlageId: s.anlageId, anlage: anlageKurz(a), titel: s.titel, text: s.text, regel: s.regel, schwere: s.schwere, status: s.status, erkanntAm: s.erkanntAm, quittiertAm: s.quittiertAm || null,
    behobenAm: s.behobenAm || null, zustaendig: s.zustaendigId ? { id: s.zustaendigId, name: nameVon(db, s.zustaendigId) } : null,
    sla: slaStatus(s),
    ursacheKategorie: d.ursacheKategorie || "", ursacheLabel: URSACHEN[d.ursacheKategorie]?.label || "", ursacheText: d.ursacheText || "", massnahme: d.massnahme || "",
    versicherbar: !!URSACHEN[d.ursacheKategorie]?.versicherbar,
    ausfallBeginn: d.ausfallBeginn || "", ausfallEnde: d.ausfallEnde || "", betroffenPct: d.betroffenPct ?? null, ertragsausfall: d.ertragsausfall || null,
    auftraege: db.betrieb.auftraege.filter((x) => x.stoerungId === s.id).map(auftragAusgabe),
    versicherungen: db.betrieb.versicherungen.filter((x) => x.stoerungId === s.id).map(versicherungAusgabe),
    entnahmen: db.betrieb.bewegungen.filter((x) => x.stoerungId === s.id).map((b) => bewegungAusgabe(db, b)),
    ursacheFehlt: s.status === "behoben" && !d.ursacheKategorie,
  };
}
const auftragAusgabe = (x) => ({ ...x, artLabel: AUFTRAG_ARTEN[x.art] || x.art, statusLabel: AUFTRAG_STATUS[x.status] || x.status, offen: AUFTRAG_OFFEN.includes(x.status) });
const versicherungAusgabe = (x) => ({ ...x, artLabel: VERSICHERUNG_ARTEN[x.art] || x.art, statusLabel: VERSICHERUNG_STATUS[x.status] || x.status, offen: VERSICHERUNG_OFFEN.includes(x.status), meldefristTage: x.status === "entwurf" && x.meldefristBis ? Math.round((Date.parse(x.meldefristBis) - Date.parse(heute())) / 86400e3) : null });
const planAusgabe = (p) => ({ ...p, artLabel: WARTUNG_ARTEN[p.art] || p.art, stand: planStand(p) });
const teilAusgabe = (t) => ({ ...t, nachbestellung: nachbestellung(t) });
function bewegungAusgabe(db, b) {
  const t = db.betrieb.ersatzteile.find((x) => x.id === b.ersatzteilId);
  return { ...b, artLabel: ERSATZTEIL_BEWEGUNG[b.art] || b.art, teil: t ? { id: t.id, bezeichnung: t.bezeichnung, einheit: t.einheit } : null, vonName: b.vonId ? nameVon(db, b.vonId) : "" };
}
const protokollAusgabe = (p) => ({ ...p, artLabel: PRUEF_ARTEN[p.art] || p.art, ergebnisLabel: PRUEF_ERGEBNIS[p.ergebnis] || p.ergebnis });

function fristenAnlage(db, a) {
  const B = db.betrieb;
  return fristenErmitteln({
    anlage: a,
    komponenten: db.anlagen.komponenten.filter((k) => k.anlageId === a.id),
    messpunkte: db.anlagen.messpunkte.filter((m) => m.anlageId === a.id),
    plaene: B.plaene.filter((p) => p.anlageId === a.id),
    versicherungen: B.versicherungen.filter((f) => f.anlageId === a.id),
  }).map((f) => ({ ...f, anlage: anlageKurz(a) }));
}

// ================================================================ Lesen

/** Übersicht der Betriebsführung: Fristen, SLA, Aufträge, Versicherungsfälle, Lager, Nacharbeiten */
export async function betriebUebersicht(n) {
  leseNoetig(n);
  const db = await lauflesen(n);
  const B = db.betrieb;
  const aktiveAnlagen = db.anlagen.anlagen.filter((a) => !["rueckbau"].includes(a.status));
  const fristen = aktiveAnlagen.flatMap((a) => fristenAnlage(db, a)).filter((f) => f.stufe !== "spaeter");
  const offen = db.anlagen.stoerungen.filter((s) => STOERUNG_OFFEN.includes(s.status));
  const tickets = offen.map((s) => ticketAusgabe(db, s)).sort((x, y) => ({ rot: 0, gelb: 1, gruen: 2 })[x.sla?.ampel] - ({ rot: 0, gelb: 1, gruen: 2 })[y.sla?.ampel]);
  const ohneUrsache = db.anlagen.stoerungen.filter((s) => s.status === "behoben" && !B.stoerungen[s.id]?.ursacheKategorie && Date.now() - Date.parse(s.behobenAm || s.erkanntAm) < 90 * 86400e3).map((s) => ticketAusgabe(db, s));
  const teile = B.ersatzteile.filter((t) => t.aktiv !== false).map(teilAusgabe);
  const jahr = String(new Date().getFullYear());
  const ausfallJahr = Object.entries(B.stoerungen).filter(([, d]) => String(d.ausfallBeginn || "").startsWith(jahr)).reduce((s, [, d]) => ({ kwh: s.kwh + (d.ertragsausfall?.ausfallKwh || 0), eur: s.eur + (d.ertragsausfall?.ausfallEur || 0) }), { kwh: 0, eur: 0 });
  return {
    zaehler: {
      slaVerletzt: tickets.filter((t) => t.sla?.ampel === "rot").length,
      slaKritisch: tickets.filter((t) => t.sla?.ampel === "gelb").length,
      fristenUeberfaellig: fristen.filter((f) => f.stufe === "ueberfaellig").length,
      fristenDringend: fristen.filter((f) => ["dringend", "fehlt"].includes(f.stufe)).length,
      auftraegeOffen: B.auftraege.filter((x) => AUFTRAG_OFFEN.includes(x.status)).length,
      versicherungOffen: B.versicherungen.filter((x) => VERSICHERUNG_OFFEN.includes(x.status)).length,
      nachbestellen: teile.filter((t) => t.nachbestellung).length,
      ohneUrsache: ohneUrsache.length,
      ausfallJahrKwh: Math.round(ausfallJahr.kwh),
      ausfallJahrEur: Math.round(ausfallJahr.eur),
    },
    tickets,
    ohneUrsache,
    fristen,
    auftraege: B.auftraege.filter((x) => AUFTRAG_OFFEN.includes(x.status)).map((x) => ({ ...auftragAusgabe(x), anlage: anlageKurz(db.anlagen.anlagen.find((a) => a.id === x.anlageId)) })).sort((x, y) => String(x.termin || "9").localeCompare(String(y.termin || "9"))),
    versicherungen: B.versicherungen.filter((x) => VERSICHERUNG_OFFEN.includes(x.status)).map((x) => ({ ...versicherungAusgabe(x), anlage: anlageKurz(db.anlagen.anlagen.find((a) => a.id === x.anlageId)) })),
    ersatzteile: teile.sort((x, y) => (y.nachbestellung ? 1 : 0) - (x.nachbestellung ? 1 : 0) || x.bezeichnung.localeCompare(y.bezeichnung, "de")),
    bewegungen: [...B.bewegungen].sort((x, y) => String(y.am).localeCompare(String(x.am))).slice(0, 30).map((b) => ({ ...bewegungAusgabe(db, b), anlage: anlageKurz(db.anlagen.anlagen.find((a) => a.id === b.anlageId)) })),
    anlagen: aktiveAnlagen.map((a) => ({ ...anlageKurz(a), plaene: B.plaene.filter((p) => p.anlageId === a.id && p.aktiv).length, faellig: B.plaene.filter((p) => p.anlageId === a.id && ["faellig", "ueberfaellig"].includes(planStand(p).stufe)).length })),
    laufAm: B.laufAm,
    darfSchreiben: boSchreiben(n),
  };
}

/** Betriebsführung einer Anlage: Pläne, Protokolle, Aufträge, Versicherungen, Fristen, Einstrahlung, Freigaben */
export async function betriebAnlage(n, anlageId) {
  leseNoetig(n);
  const db = await lesenBereit(n);
  const a = anlageVon(db, anlageId);
  const B = db.betrieb;
  const stoerungen = db.anlagen.stoerungen.filter((s) => s.anlageId === a.id).sort((x, y) => String(y.erkanntAm).localeCompare(String(x.erkanntAm)));
  return {
    anlage: { ...anlageKurz(a), bundesland: a.bundesland, inbetriebnahme: a.inbetriebnahme, status: a.status, speicherKwh: a.speicherKwh, eigentuemer: a.eigentuemer || "", betriebsfuehrer: a.betriebsfuehrer || "" },
    plaene: B.plaene.filter((p) => p.anlageId === a.id).map(planAusgabe).sort((x, y) => String(x.naechsteFaelligkeit).localeCompare(String(y.naechsteFaelligkeit))),
    vorschlag: planVorschlag(a, B.plaene.filter((p) => p.anlageId === a.id)),
    protokolle: B.protokolle.filter((p) => p.anlageId === a.id).sort((x, y) => String(y.datum).localeCompare(String(x.datum))).map(protokollAusgabe),
    auftraege: B.auftraege.filter((x) => x.anlageId === a.id).sort((x, y) => String(y.erstelltAm).localeCompare(String(x.erstelltAm))).map(auftragAusgabe),
    versicherungen: B.versicherungen.filter((x) => x.anlageId === a.id).map(versicherungAusgabe),
    tickets: stoerungen.slice(0, 100).map((s) => ticketAusgabe(db, s)),
    fristen: fristenAnlage(db, a),
    einstrahlung: B.einstrahlung.filter((x) => x.anlageId === a.id).sort((x, y) => y.monat.localeCompare(x.monat)),
    freigaben: B.freigaben.filter((x) => x.anlageId === a.id).sort((x, y) => String(y.am).localeCompare(String(x.am))).slice(0, 60),
    messpunkte: db.anlagen.messpunkte.filter((m) => m.anlageId === a.id && m.abrechnungsrelevant).map((m) => ({ id: m.id, bezeichnung: m.bezeichnung, zaehlernummer: m.zaehlernummer, art: m.art, eichgueltigBis: m.eichgueltigBis || "" })),
    wartungen: db.anlagen.wartungen.filter((w) => w.anlageId === a.id).sort((x, y) => String(y.datum).localeCompare(String(x.datum))),
    ersatzteile: B.ersatzteile.filter((t) => t.aktiv !== false).map(teilAusgabe),
    darfSchreiben: boSchreiben(n),
  };
}

/** Störung als Ticket (Backoffice) */
export async function betriebStoerung(n, stoerungId) {
  leseNoetig(n);
  const db = await lesenBereit(n);
  const s = db.anlagen.stoerungen.find((x) => x.id === v.kennung(stoerungId));
  if (!s) throw nichtGefunden("Störung nicht gefunden.");
  const a = db.anlagen.anlagen.find((x) => x.id === s.anlageId);
  return { ...ticketAusgabe(db, s), ersatzteile: db.betrieb.ersatzteile.filter((t) => t.aktiv !== false).map(teilAusgabe), vertrag: (() => { const c = db.anlagen.vertraege.find((x) => x.anlageId === a?.id); return c ? { strompreisCt: c.strompreisCt, status: c.status } : null; })(), betrieb: betriebKonten(db).map((u) => ({ id: u.id, name: nameVon(db, u.id) })), darfSchreiben: boSchreiben(n) };
}

// ================================================================ Störung: Ursache, Ertragsausfall, Beheben

/**
 * Ticketdaten speichern. kontext (vom Server berechnet, nie aus dem Browser): { jahresKwh, arbeitspreisCt, eigenverbrauchQuote }
 * Ertragsausfall wird aus Ausfallbeginn/-ende, betroffenem Anteil und Kontext berechnet.
 */
export async function betriebStoerungSpeichern(n, stoerungId, daten = {}, kontext = {}) {
  schreibNoetig(n);
  const d = {
    ursacheKategorie: v.auswahl(daten.ursacheKategorie, URSACHEN, ""),
    ursacheText: v.mehrzeilig(daten.ursacheText, 1000),
    massnahme: v.mehrzeilig(daten.massnahme, 1000),
    ausfallBeginn: zeitOk(daten.ausfallBeginn),
    ausfallEnde: zeitOk(daten.ausfallEnde),
    betroffenPct: v.zahl(daten.betroffenPct, { min: 0, max: 100, stellen: 1 }),
  };
  return aendernBereit(n, (db) => {
    const s = db.anlagen.stoerungen.find((x) => x.id === v.kennung(stoerungId));
    if (!s) throw nichtGefunden("Störung nicht gefunden.");
    const alt = db.betrieb.stoerungen[s.id] || {};
    let ea = alt.ertragsausfall || null;
    if (d.ausfallBeginn || d.ausfallEnde) {
      v.pflicht(d.ausfallBeginn && d.ausfallEnde, "Bitte Beginn und Ende des Ausfalls angeben.");
      v.pflicht(d.betroffenPct !== null, "Bitte den betroffenen Anteil der Anlage in % angeben (100 = Totalausfall).");
      ea = fach(() => ertragsausfall({ jahresKwh: Number(kontext.jahresKwh) || 0, von: d.ausfallBeginn, bis: d.ausfallEnde, betroffenPct: d.betroffenPct, arbeitspreisCt: kontext.arbeitspreisCt ?? null, eigenverbrauchQuote: kontext.eigenverbrauchQuote ?? null }));
    } else ea = null;
    db.betrieb.stoerungen[s.id] = { ...alt, ...d, ertragsausfall: ea, geaendertAm: jetzt(), geaendertVon: n.id };
    s.verlauf = [...(s.verlauf || []), { am: jetzt(), text: `Ticket gepflegt (${nameVon(db, n.id)}): ${[d.ursacheKategorie && `Ursache ${URSACHEN[d.ursacheKategorie].label}`, ea && `Ertragsausfall ${ea.ausfallKwh.toLocaleString("de-DE")} kWh`].filter(Boolean).join(", ") || "Angaben"}` }];
    protokoll(db, n, "betrieb_ticket", "anlage", s.anlageId, `Störung ${s.id}: Ursache/Ertragsausfall gespeichert`);
    return ticketAusgabe(db, s);
  });
}

/** Beheben mit Pflicht-Ursache und Maßnahme (Zustandswechsel über demo/anlagen.js inkl. Benachrichtigung von Kunde/Team) */
export async function betriebStoerungBeheben(n, stoerungId, { text = "" } = {}) {
  schreibNoetig(n);
  const db = await lesenBereit(n);
  const s = db.anlagen.stoerungen.find((x) => x.id === v.kennung(stoerungId));
  if (!s) throw nichtGefunden("Störung nicht gefunden.");
  if (s.status === "behoben") throw konflikt("Die Störung ist bereits behoben.");
  const d = db.betrieb.stoerungen[s.id] || {};
  fach(() => behebungPruefen(d));
  if (db.betrieb.auftraege.some((x) => x.stoerungId === s.id && ["beauftragt", "terminiert", "vor_ort"].includes(x.status))) throw konflikt("Es ist noch ein Serviceauftrag offen – bitte zuerst abschließen oder stornieren.");
  await anlagenDemo.stoerungAktion(n, s.id, { aktion: "status", status: "behoben", text: v.text(text || `${URSACHEN[d.ursacheKategorie].label} – ${d.massnahme}`, 200) });
  return betriebStoerung(n, s.id);
}

// ================================================================ Serviceaufträge

export async function betriebAuftragSpeichern(n, daten = {}) {
  schreibNoetig(n);
  const f = {
    art: v.auswahl(daten.art, AUFTRAG_ARTEN, ""), dienstleister: v.text(daten.dienstleister, 120), kontakt: v.text(daten.kontakt, 160), beschreibung: v.mehrzeilig(daten.beschreibung, 2000),
    termin: /^20\d\d-\d\d-\d\d(T\d\d:\d\d)?$/.test(String(daten.termin || "")) ? String(daten.termin) : "", kostenEur: v.zahl(daten.kostenEur, { min: 0, max: 10000000, stellen: 2 }), bestellnummer: v.text(daten.bestellnummer, 60),
  };
  v.pflicht(f.art, "Bitte die Art des Auftrags wählen.");
  v.pflicht(f.beschreibung.length >= 5, "Bitte den Auftrag beschreiben (mind. 5 Zeichen).");
  return aendernBereit(n, (db) => {
    const B = db.betrieb;
    if (daten.id) {
      const x = B.auftraege.find((y) => y.id === v.kennung(daten.id));
      if (!x) throw nichtGefunden("Auftrag nicht gefunden.");
      if (!AUFTRAG_OFFEN.includes(x.status)) throw konflikt("Abgeschlossene Aufträge können nicht mehr geändert werden.");
      Object.assign(x, f, { geaendertAm: jetzt() });
      protokoll(db, n, "betrieb_auftrag", "anlage", x.anlageId, `Serviceauftrag ${x.id} geändert`);
      return auftragAusgabe(x);
    }
    const a = anlageVon(db, daten.anlageId);
    const st = daten.stoerungId ? db.anlagen.stoerungen.find((s) => s.id === v.kennung(daten.stoerungId) && s.anlageId === a.id) : null;
    if (daten.stoerungId && !st) throw ungueltig("Störung gehört nicht zu dieser Anlage.");
    const plan = daten.planId ? B.plaene.find((p) => p.id === v.kennung(daten.planId) && p.anlageId === a.id) : null;
    v.pflicht(B.auftraege.filter((x) => x.anlageId === a.id).length < 500, "Zu viele Aufträge an dieser Anlage.");
    const t = jetzt();
    const x = { id: neueId("SA"), anlageId: a.id, stoerungId: st?.id || null, planId: plan?.id || null, ...f, status: "angelegt", beauftragtAm: null, erledigtAm: null, bericht: "", stornoGrund: "", verlauf: [{ am: t, text: `Angelegt von ${nameVon(db, n.id)}` }], erstelltAm: t, geaendertAm: t };
    B.auftraege.push(x);
    if (st) st.verlauf = [...(st.verlauf || []), { am: t, text: `Serviceauftrag ${x.id} angelegt (${AUFTRAG_ARTEN[x.art]})` }];
    protokoll(db, n, "betrieb_auftrag", "anlage", a.id, `Serviceauftrag ${x.id} angelegt`);
    return auftragAusgabe(x);
  });
}

/** Statuswechsel: beauftragt | terminiert {termin} | vor_ort | erledigt {bericht, erledigtAm} | storniert {grund} */
export async function betriebAuftragAktion(n, id, daten = {}) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const x = db.betrieb.auftraege.find((y) => y.id === v.kennung(id));
    if (!x) throw nichtGefunden("Auftrag nicht gefunden.");
    const neu = v.auswahl(daten.status, AUFTRAG_STATUS, "");
    const patch = fach(() => auftragUebergang(x, neu, { termin: daten.termin, bericht: v.mehrzeilig(daten.bericht, 2000), erledigtAm: datumOk(daten.erledigtAm), grund: v.text(daten.grund, 200), dienstleister: x.dienstleister }, heute()));
    if (daten.kostenEur !== undefined) patch.kostenEur = v.zahl(daten.kostenEur, { min: 0, max: 10000000, stellen: 2 });
    Object.assign(x, patch, { geaendertAm: jetzt() });
    x.verlauf.push({ am: jetzt(), text: `${AUFTRAG_STATUS[neu]} (${nameVon(db, n.id)})${patch.termin ? ` – ${patch.termin.replace("T", " ")}` : ""}` });
    const a = db.anlagen.anlagen.find((y) => y.id === x.anlageId);
    // Technikertermin: Kunde/Team informieren (Zugang zu Dach/Gelände ermöglichen) – ohne technische Details
    if (neu === "terminiert" && a) {
      const wann = new Date(patch.termin.length > 10 ? patch.termin : `${patch.termin}T08:00`).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: patch.termin.length > 10 ? "short" : undefined });
      for (const u of kundenEmpfaenger(db, a)) benachrichtigen(db, u, { art: "stoerung", titel: `Servicetermin an Ihrer Anlage: ${a.name}`, text: `Ein Techniker ist für ${wann} eingeplant. Bitte ermöglichen Sie den Zugang.`, link: `/portal/anlagen/${a.id}?tab=stoerungen`, objektArt: "anlage", objektId: a.id }, { mailBetreff: "Servicetermin an Ihrer Anlage – ÖkoInvest", mailText: "Für Ihre Anlage ist ein Servicetermin eingeplant. Details finden Sie im Portal." });
    }
    if (neu === "erledigt" && x.planId) planDurchgefuehrt(db, x.planId, patch.erledigtAm, `Serviceauftrag ${x.id}: ${patch.bericht}`, x.dienstleister, x.kostenEur);
    const st = x.stoerungId ? db.anlagen.stoerungen.find((s) => s.id === x.stoerungId) : null;
    if (st) st.verlauf = [...(st.verlauf || []), { am: jetzt(), text: `Serviceauftrag ${x.id}: ${AUFTRAG_STATUS[neu]}` }];
    protokoll(db, n, "betrieb_auftrag", "anlage", x.anlageId, `Serviceauftrag ${x.id}: ${neu}`);
    return auftragAusgabe(x);
  });
}

/** Serviceauftrag für das PDF (Auftragsschreiben an den Dienstleister) */
export async function betriebAuftrag(n, id) {
  leseNoetig(n);
  const db = await lesenBereit(n);
  const x = db.betrieb.auftraege.find((y) => y.id === v.kennung(id));
  if (!x) throw nichtGefunden("Auftrag nicht gefunden.");
  const a = db.anlagen.anlagen.find((y) => y.id === x.anlageId);
  const s = x.stoerungId ? db.anlagen.stoerungen.find((y) => y.id === x.stoerungId) : null;
  return { auftrag: auftragAusgabe(x), anlage: { ...anlageKurz(a), bundesland: a?.bundesland, ort: a?.ort, betriebsfuehrer: a?.betriebsfuehrer || "", eigentuemer: a?.eigentuemer || "" }, stoerung: s ? { id: s.id, titel: s.titel, schwere: s.schwere, erkanntAm: s.erkanntAm, sla: slaStatus(s) } : null, komponenten: db.anlagen.komponenten.filter((k) => k.anlageId === a?.id).map((k) => ({ art: k.art, hersteller: k.hersteller, modell: k.modell, anzahl: k.anzahl, garantieBis: k.garantieBis })), ersteller: nameVon(db, n.id) };
}

// ================================================================ Versicherungsfälle

const VERS_FELDER = (d) => ({
  art: v.auswahl(d.art, VERSICHERUNG_ARTEN, "allgefahren"), versicherer: v.text(d.versicherer, 120), police: v.text(d.police, 60), schadennummer: v.text(d.schadennummer, 60),
  schadentag: datumOk(d.schadentag), schadenbeschreibung: v.mehrzeilig(d.schadenbeschreibung, 2000), schadenEur: v.zahl(d.schadenEur, { min: 0, max: 1e9, stellen: 2 }),
  selbstbehaltEur: v.zahl(d.selbstbehaltEur, { min: 0, max: 1e8, stellen: 2 }), ertragsausfallEur: v.zahl(d.ertragsausfallEur, { min: 0, max: 1e9, stellen: 2 }), bemerkung: v.mehrzeilig(d.bemerkung, 1000),
});

export async function betriebVersicherungSpeichern(n, daten = {}) {
  schreibNoetig(n);
  const f = VERS_FELDER(daten);
  if (f.schadentag && f.schadentag > heute()) throw ungueltig("Der Schadentag darf nicht in der Zukunft liegen.");
  return aendernBereit(n, (db) => {
    const B = db.betrieb;
    if (daten.id) {
      const x = B.versicherungen.find((y) => y.id === v.kennung(daten.id));
      if (!x) throw nichtGefunden("Versicherungsfall nicht gefunden.");
      if (!VERSICHERUNG_OFFEN.includes(x.status)) throw konflikt("Abgeschlossene Versicherungsfälle können nicht mehr geändert werden.");
      Object.assign(x, f, { meldefristBis: meldefristBis(f.schadentag), geaendertAm: jetzt() });
      protokoll(db, n, "betrieb_versicherung", "anlage", x.anlageId, `Versicherungsfall ${x.id} geändert`);
      return versicherungAusgabe(x);
    }
    const a = anlageVon(db, daten.anlageId);
    const st = daten.stoerungId ? db.anlagen.stoerungen.find((s) => s.id === v.kennung(daten.stoerungId) && s.anlageId === a.id) : null;
    if (daten.stoerungId && !st) throw ungueltig("Störung gehört nicht zu dieser Anlage.");
    if (st && B.versicherungen.some((x) => x.stoerungId === st.id && VERSICHERUNG_OFFEN.includes(x.status) && x.art === f.art)) throw konflikt("Zu dieser Störung gibt es bereits einen offenen Versicherungsfall dieser Art.");
    // Ertragsausfall aus dem Ticket übernehmen, wenn nicht angegeben
    if (f.ertragsausfallEur === null && st && B.stoerungen[st.id]?.ertragsausfall) f.ertragsausfallEur = B.stoerungen[st.id].ertragsausfall.ausfallEur;
    const t = jetzt();
    const x = { id: neueId("VF"), anlageId: a.id, stoerungId: st?.id || null, ...f, meldefristBis: meldefristBis(f.schadentag), erstattetEur: null, status: "entwurf", gemeldetAm: null, verspaetet: false, reguliertAm: null, abschlussGrund: "", verlauf: [{ am: t, text: `Angelegt von ${nameVon(db, n.id)}` }], erstelltAm: t, geaendertAm: t };
    B.versicherungen.push(x);
    if (st) st.verlauf = [...(st.verlauf || []), { am: t, text: `Versicherungsfall ${x.id} angelegt` }];
    protokoll(db, n, "betrieb_versicherung", "anlage", a.id, `Versicherungsfall ${x.id} angelegt`);
    return versicherungAusgabe(x);
  });
}

/** Statuswechsel: gemeldet {gemeldetAm, schadennummer?} | in_pruefung | reguliert {erstattetEur} | abgelehnt/zurueckgezogen {grund} */
export async function betriebVersicherungAktion(n, id, daten = {}) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const x = db.betrieb.versicherungen.find((y) => y.id === v.kennung(id));
    if (!x) throw nichtGefunden("Versicherungsfall nicht gefunden.");
    const neu = v.auswahl(daten.status, VERSICHERUNG_STATUS, "");
    if (daten.schadennummer) x.schadennummer = v.text(daten.schadennummer, 60);
    const patch = fach(() => versicherungUebergang(x, neu, { gemeldetAm: datumOk(daten.gemeldetAm), erstattetEur: v.zahl(daten.erstattetEur, { min: 0, max: 1e9, stellen: 2 }), grund: v.text(daten.grund, 300) }, heute()));
    Object.assign(x, patch, { geaendertAm: jetzt() });
    x.verlauf.push({ am: jetzt(), text: `${VERSICHERUNG_STATUS[neu]} (${nameVon(db, n.id)})${patch.verspaetet ? " – nach interner Meldefrist" : ""}${patch.erstattetEur !== undefined ? ` – erstattet ${patch.erstattetEur.toLocaleString("de-DE")} €` : ""}` });
    protokoll(db, n, "betrieb_versicherung", "anlage", x.anlageId, `Versicherungsfall ${x.id}: ${neu}`);
    return versicherungAusgabe(x);
  });
}

// ================================================================ Wartungspläne

export async function betriebPlanSpeichern(n, anlageId, daten = {}) {
  schreibNoetig(n);
  const f = {
    art: v.auswahl(daten.art, WARTUNG_ARTEN, ""), bezeichnung: v.text(daten.bezeichnung, 200), intervallMonate: Math.round(v.zahl(daten.intervallMonate, { min: 1, max: 120 }) ?? 0),
    vorlaufTage: Math.round(v.zahl(daten.vorlaufTage, { min: 0, max: 365 }) ?? 30), naechsteFaelligkeit: datumOk(daten.naechsteFaelligkeit), norm: v.text(daten.norm, 200), hinweis: v.text(daten.hinweis, 300),
    dienstleister: v.text(daten.dienstleister, 120), aktiv: daten.aktiv === undefined ? true : v.wahr(daten.aktiv),
  };
  v.pflicht(f.art, "Bitte die Art der Wartung wählen.");
  v.pflicht(f.bezeichnung.length >= 3, "Bitte eine Bezeichnung angeben.");
  v.pflicht(f.intervallMonate > 0, "Bitte das Intervall in Monaten angeben (1–120).");
  v.pflicht(f.naechsteFaelligkeit, "Bitte die nächste Fälligkeit angeben.");
  return aendernBereit(n, (db) => {
    const a = anlageVon(db, anlageId);
    const B = db.betrieb;
    if (daten.id) {
      const p = B.plaene.find((x) => x.id === v.kennung(daten.id) && x.anlageId === a.id);
      if (!p) throw nichtGefunden("Wartungsplan nicht gefunden.");
      Object.assign(p, f, { geaendertAm: jetzt() });
      protokoll(db, n, "betrieb_plan", "anlage", a.id, `Wartungsplan ${p.id} geändert`);
      return planAusgabe(p);
    }
    v.pflicht(B.plaene.filter((x) => x.anlageId === a.id).length < 40, "Höchstens 40 Wartungspläne je Anlage.");
    const p = { id: neueId("WP"), anlageId: a.id, ...f, letzteDurchfuehrung: "", erstelltAm: jetzt(), geaendertAm: jetzt() };
    B.plaene.push(p);
    protokoll(db, n, "betrieb_plan", "anlage", a.id, `Wartungsplan ${p.id} angelegt`);
    return planAusgabe(p);
  });
}

export async function betriebPlanLoeschen(n, anlageId, id) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const a = anlageVon(db, anlageId);
    const idx = db.betrieb.plaene.findIndex((x) => x.id === v.kennung(id) && x.anlageId === a.id);
    if (idx < 0) throw nichtGefunden("Wartungsplan nicht gefunden.");
    if (db.betrieb.protokolle.some((p) => p.planId === db.betrieb.plaene[idx].id)) throw konflikt("Zu diesem Plan gibt es Prüfprotokolle – bitte deaktivieren statt löschen.");
    db.betrieb.plaene.splice(idx, 1);
    protokoll(db, n, "betrieb_plan", "anlage", a.id, `Wartungsplan ${id} gelöscht`);
    return { ok: true };
  });
}

/** Standardplan der Landesvorlage übernehmen (nur fehlende Einträge) */
export async function betriebPlaeneVorschlagen(n, anlageId) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const a = anlageVon(db, anlageId);
    const neu = planVorschlag(a, db.betrieb.plaene.filter((p) => p.anlageId === a.id)).map((p) => planAusVorlage(db, a, p));
    db.betrieb.plaene.push(...neu);
    protokoll(db, n, "betrieb_plan", "anlage", a.id, `${neu.length} Wartungspläne aus der Vorlage ${a.land} übernommen`);
    return { angelegt: neu.length };
  });
}

/** Plan fortschreiben und Wartung in der Anlagenhistorie (sichtbar im Monitoring „Technik & Wartung“) erfassen */
function planDurchgefuehrt(db, planId, datum, bericht, dienstleister = "", kostenEur = null) {
  const p = db.betrieb.plaene.find((x) => x.id === planId);
  if (!p) return null;
  p.letzteDurchfuehrung = datum;
  p.naechsteFaelligkeit = naechsteFaelligkeit(datum, p.intervallMonate);
  p.geaendertAm = jetzt();
  // geplante Wartung gleicher Art abschließen bzw. neue erledigte Wartung anlegen
  const geplant = db.anlagen.wartungen.find((w) => w.anlageId === p.anlageId && w.art === p.art && w.status === "geplant");
  const w = geplant || { id: neueId("WA"), anlageId: p.anlageId, art: p.art, erstelltAm: jetzt() };
  Object.assign(w, { datum, status: "erledigt", dienstleister: dienstleister || p.dienstleister || "", bericht: v.mehrzeilig(bericht, 2000), naechsteFaelligkeit: p.naechsteFaelligkeit, kostenEur: kostenEur ?? w.kostenEur ?? null, geaendertAm: jetzt() });
  if (!geplant) db.anlagen.wartungen.push(w);
  return w;
}

// ================================================================ Prüfprotokolle

function protokollFelder(d) {
  const strings = (Array.isArray(d.strings) ? d.strings : []).slice(0, 200).map((s) => ({
    bezeichnung: v.text(s?.bezeichnung, 40) || "String", uocV: v.zahl(s?.uocV, { min: 0, max: 2000, stellen: 1 }), uocSollV: v.zahl(s?.uocSollV, { min: 0, max: 2000, stellen: 1 }),
    iscA: v.zahl(s?.iscA, { min: 0, max: 100, stellen: 2 }), rIsoMOhm: v.zahl(s?.rIsoMOhm, { min: 0, max: 100000, stellen: 2 }),
  })).filter((s) => [s.uocV, s.iscA, s.rIsoMOhm].some((x) => x !== null));
  const punkte = Object.fromEntries(Object.keys(PRUEF_PUNKTE).filter((k) => d.punkte && Object.hasOwn(d.punkte, k) && d.punkte[k] !== null && d.punkte[k] !== "").map((k) => [k, v.wahr(d.punkte[k])]));
  const thermografie = (Array.isArray(d.thermografie) ? d.thermografie : []).slice(0, 200).map((t) => ({ ort: v.text(t?.ort, 80), deltaK: v.zahl(t?.deltaK, { min: 0, max: 200, stellen: 1 }), text: v.text(t?.text, 200) })).filter((t) => t.ort || t.deltaK !== null);
  const maengel = (Array.isArray(d.maengel) ? d.maengel : []).slice(0, 100).map((m) => ({ text: v.text(m?.text, 300), schwere: v.auswahl(m?.schwere, ["gering", "mittel", "gefahr"], "mittel") })).filter((m) => m.text.length >= 3);
  return {
    art: v.auswahl(d.art, PRUEF_ARTEN, ""), datum: datumOk(d.datum), pruefer: v.text(d.pruefer, 120), firma: v.text(d.firma, 120), norm: v.text(d.norm, 200),
    einstrahlungWm2: v.zahl(d.einstrahlungWm2, { min: 0, max: 1500, stellen: 0 }), strings, punkte, thermografie, maengel, bemerkung: v.mehrzeilig(d.bemerkung, 2000), dokumentId: v.kennung(d.dokumentId) || null,
  };
}

/** Prüfprotokoll erfassen: Bewertung serverseitig, Plan fortschreiben, Mängel → Störung (Folgeaktion) */
export async function betriebProtokollSpeichern(n, anlageId, daten = {}) {
  schreibNoetig(n);
  const f = protokollFelder(daten);
  v.pflicht(f.art, "Bitte die Art der Prüfung wählen.");
  v.pflicht(f.datum && f.datum <= heute(), "Bitte das Prüfdatum angeben (nicht in der Zukunft).");
  v.pflicht(f.pruefer.length >= 3, "Bitte die prüfende Person angeben (Elektrofachkraft).");
  if (f.art === "thermografie" && f.einstrahlungWm2 !== null && f.einstrahlungWm2 < 600) throw ungueltig("Thermografie nach IEC TS 62446-3 erfordert mindestens 600 W/m² Einstrahlung – bitte Messbedingungen prüfen.");
  if (["wiederkehrend", "erstpruefung"].includes(f.art)) v.pflicht(f.strings.length > 0 || Object.keys(f.punkte).length > 0, "Bitte Messwerte (Strings) bzw. Prüfpunkte erfassen.");
  const bewertung = pruefungBewerten(f);
  const erg = await aendernBereit(n, (db) => {
    const a = anlageVon(db, anlageId);
    const B = db.betrieb;
    const plan = daten.planId ? B.plaene.find((p) => p.id === v.kennung(daten.planId) && p.anlageId === a.id) : B.plaene.find((p) => p.anlageId === a.id && p.aktiv && p.art === PRUEF_WARTUNG_ART[f.art]) || null;
    const pk = { id: neueId("PP"), anlageId: a.id, planId: plan?.id || null, ...f, ergebnis: bewertung.ergebnis, befunde: bewertung.befunde, erstelltVon: n.id, erstelltVonName: nameVon(db, n.id), erstelltAm: jetzt() };
    B.protokolle.push(pk);
    const bericht = `${PRUEF_ARTEN[f.art]}: ${PRUEF_ERGEBNIS[bewertung.ergebnis]}${bewertung.befunde.length ? ` – ${bewertung.befunde.length} Befund(e)` : ""} (Prüfprotokoll ${pk.id})`;
    if (plan) planDurchgefuehrt(db, plan.id, f.datum, bericht, f.firma);
    else db.anlagen.wartungen.push({ id: neueId("WA"), anlageId: a.id, art: PRUEF_WARTUNG_ART[f.art], datum: f.datum, status: "erledigt", dienstleister: f.firma, bericht, naechsteFaelligkeit: "", kostenEur: null, erstelltAm: jetzt(), geaendertAm: jetzt() });
    protokoll(db, n, "betrieb_pruefung", "anlage", a.id, `Prüfprotokoll ${pk.id}: ${bewertung.ergebnis}`);
    return { protokoll: protokollAusgabe(pk), anlageId: a.id };
  });
  // Folgeaktion: Mängel/Gefahr als Störung im Leitstand (Benachrichtigung über demo/anlagen.js)
  if (bewertung.ergebnis !== "bestanden") {
    const wichtig = bewertung.befunde.filter((b) => b.stufe !== "hinweis");
    const s = await anlagenDemo.stoerungAnlegen(n, { anlageId: erg.anlageId, schwere: bewertung.ergebnis === "nicht_bestanden" ? "kritisch" : "mittel", titel: `Prüfbefund: ${bewertung.ergebnis === "nicht_bestanden" ? "Prüfung nicht bestanden" : "Mängel festgestellt"} (${PRUEF_ARTEN[f.art]})`, text: wichtig.map((b) => `• ${b.text}`).join("\n").slice(0, 1900) });
    await aendern((db) => {
      const p = db.betrieb.protokolle.find((x) => x.id === erg.protokoll.id);
      if (p) p.stoerungId = s.id;
    });
    erg.protokoll.stoerungId = s.id;
  }
  return erg.protokoll;
}

export async function betriebProtokoll(n, id) {
  leseNoetig(n);
  const db = await lesenBereit(n);
  const p = db.betrieb.protokolle.find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Prüfprotokoll nicht gefunden.");
  const a = db.anlagen.anlagen.find((x) => x.id === p.anlageId);
  return { protokoll: protokollAusgabe(p), anlage: { ...anlageKurz(a), bundesland: a?.bundesland, ort: a?.ort, eigentuemer: a?.eigentuemer || "", betriebsfuehrer: a?.betriebsfuehrer || "", inbetriebnahme: a?.inbetriebnahme || "" }, punkteLabels: PRUEF_PUNKTE };
}

// ================================================================ Ersatzteile

export async function betriebErsatzteilSpeichern(n, daten = {}) {
  schreibNoetig(n);
  const f = {
    bezeichnung: v.text(daten.bezeichnung, 160), art: v.auswahl(daten.art, ["wechselrichter", "modul", "speicher", "zaehler", "datenlogger", "sonstiges"], "sonstiges"), hersteller: v.text(daten.hersteller, 80),
    artikelnummer: v.text(daten.artikelnummer, 60), einheit: v.text(daten.einheit, 20) || "Stück", mindestbestand: v.zahl(daten.mindestbestand, { min: 0, max: 1e6, stellen: 3 }) ?? 0,
    zielbestand: v.zahl(daten.zielbestand, { min: 0, max: 1e6, stellen: 3 }), lagerort: v.text(daten.lagerort, 80), preisEur: v.zahl(daten.preisEur, { min: 0, max: 1e7, stellen: 2 }), bemerkung: v.text(daten.bemerkung, 300),
    aktiv: daten.aktiv === undefined ? true : v.wahr(daten.aktiv),
  };
  v.pflicht(f.bezeichnung.length >= 3, "Bitte eine Bezeichnung angeben.");
  return aendernBereit(n, (db) => {
    const B = db.betrieb;
    if (daten.id) {
      const t = B.ersatzteile.find((x) => x.id === v.kennung(daten.id));
      if (!t) throw nichtGefunden("Ersatzteil nicht gefunden.");
      Object.assign(t, f, { geaendertAm: jetzt() });
      protokoll(db, n, "betrieb_lager", "ersatzteil", t.id, `Ersatzteil ${t.id} geändert`);
      return teilAusgabe(t);
    }
    if (f.artikelnummer && B.ersatzteile.some((x) => x.artikelnummer === f.artikelnummer && x.hersteller === f.hersteller)) throw konflikt("Dieser Artikel ist bereits angelegt.");
    v.pflicht(B.ersatzteile.length < 2000, "Zu viele Artikel.");
    const bestand = v.zahl(daten.bestand, { min: 0, max: 1e6, stellen: 3 }) ?? 0;
    const t = { id: neueId("ET"), ...f, bestand, erstelltAm: jetzt(), geaendertAm: jetzt() };
    B.ersatzteile.push(t);
    if (bestand > 0) B.bewegungen.push({ id: neueId("EB"), ersatzteilId: t.id, art: "zugang", menge: bestand, bestandNach: bestand, anlageId: null, stoerungId: null, auftragId: null, bemerkung: "Anfangsbestand", vonId: n.id, am: jetzt() });
    protokoll(db, n, "betrieb_lager", "ersatzteil", t.id, `Ersatzteil ${t.id} angelegt`);
    return teilAusgabe(t);
  });
}

/** Lagerbewegung: zugang | entnahme (mit Anlage/Störung) | korrektur (gezählter Bestand) */
export async function betriebErsatzteilBewegung(n, id, daten = {}) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const B = db.betrieb;
    const t = B.ersatzteile.find((x) => x.id === v.kennung(id));
    if (!t) throw nichtGefunden("Ersatzteil nicht gefunden.");
    const art = v.auswahl(daten.art, ERSATZTEIL_BEWEGUNG, "");
    const menge = v.zahl(daten.menge, { min: 0, max: 1e6, stellen: 3 });
    const neu = fach(() => bestandNach(t, { art, menge }));
    let anlageId = null;
    let stoerungId = null;
    if (art === "entnahme") {
      const s = daten.stoerungId ? db.anlagen.stoerungen.find((x) => x.id === v.kennung(daten.stoerungId)) : null;
      if (daten.stoerungId && !s) throw ungueltig("Störung nicht gefunden.");
      anlageId = s?.anlageId || (daten.anlageId ? anlageVon(db, daten.anlageId).id : null);
      v.pflicht(anlageId, "Bei einer Entnahme bitte Anlage bzw. Störung angeben (Nachweis, Garantie, Kosten).");
      stoerungId = s?.id || null;
    }
    if (art === "korrektur") v.pflicht(v.text(daten.bemerkung, 300).length >= 3, "Bitte die Inventurkorrektur begründen.");
    const b = { id: neueId("EB"), ersatzteilId: t.id, art, menge, bestandVor: t.bestand, bestandNach: neu, anlageId, stoerungId, auftragId: v.kennung(daten.auftragId) || null, bemerkung: v.text(daten.bemerkung, 300), vonId: n.id, am: jetzt() };
    t.bestand = neu;
    t.geaendertAm = jetzt();
    B.bewegungen.push(b);
    if (B.bewegungen.length > 20000) B.bewegungen.splice(0, B.bewegungen.length - 20000);
    if (stoerungId) {
      const s = db.anlagen.stoerungen.find((x) => x.id === stoerungId);
      s.verlauf = [...(s.verlauf || []), { am: jetzt(), text: `Ersatzteil entnommen: ${menge} × ${t.bezeichnung}` }];
    }
    protokoll(db, n, "betrieb_lager", "ersatzteil", t.id, `${ERSATZTEIL_BEWEGUNG[art]}: ${menge} (Bestand ${neu})`);
    return { teil: teilAusgabe(t), bewegung: bewegungAusgabe(db, b) };
  });
}

// ================================================================ Einstrahlung (Performance Ratio)

export async function betriebEinstrahlungSpeichern(n, anlageId, daten = {}) {
  schreibNoetig(n);
  const monat = v.monat(daten.monat);
  const kwhM2 = v.zahl(daten.kwhM2, { min: 0, max: 300, stellen: 1 });
  v.pflicht(/^20\d\d-\d\d$/.test(monat), "Bitte den Monat angeben.");
  v.pflicht(kwhM2 !== null && kwhM2 > 0, "Bitte die Einstrahlung in Modulebene in kWh/m² angeben (0–300 je Monat).");
  const quelle = v.text(daten.quelle, 120);
  v.pflicht(quelle.length >= 3, "Bitte die Quelle angeben (Pyranometer/Referenzzelle vor Ort, Satellitendaten mit Anbieter).");
  return aendernBereit(n, (db) => {
    const a = anlageVon(db, anlageId);
    const B = db.betrieb;
    const alt = B.einstrahlung.find((x) => x.anlageId === a.id && x.monat === monat);
    if (alt) Object.assign(alt, { kwhM2, quelle, geaendertAm: jetzt(), vonId: n.id });
    else B.einstrahlung.push({ id: neueId("KZ"), anlageId: a.id, monat, kwhM2, quelle, vonId: n.id, erstelltAm: jetzt(), geaendertAm: jetzt() });
    protokoll(db, n, "betrieb_einstrahlung", "anlage", a.id, `Einstrahlung ${monat}: ${kwhM2} kWh/m²`);
    return { ok: true };
  });
}

// ================================================================ Zählerstände freigeben (vor der Contracting-Abrechnung)

/**
 * Monatswert als geprüft freigeben. befund: vom Server (betrieb/auswertung.js) aus Monitoring und Prognose berechnet –
 * die Eichfrist prüft das Backend selbst. Eichfehler blockiert (409), sonstige Fehler nur mit Begründung (422).
 * Speicherung über demo/anlagen.js (Monotonie-Prüfung, Upsert je Messpunkt/Register/Monat).
 */
export async function betriebMonatswertFreigeben(n, anlageId, { messpunktId, register, monat, stand, befund = {}, begruendung = "" } = {}) {
  schreibNoetig(n);
  const db = await lesenBereit(n);
  const a = anlageVon(db, anlageId);
  const mp = db.anlagen.messpunkte.find((m) => m.id === v.kennung(messpunktId) && m.anlageId === a.id);
  if (!mp || !mp.abrechnungsrelevant) throw ungueltig("Abrechnungsrelevanter Messpunkt nicht gefunden.");
  const eigen = plausibilisieren({ monat: v.monat(monat), menge: 0, eichgueltigBis: mp.eichgueltigBis || "" });
  const gesamt = { ...befund, eichFehler: eigen.eichFehler || !!befund.eichFehler, stufe: eigen.eichFehler ? "fehler" : v.auswahl(befund.stufe, ["ok", "hinweis", "warnung", "fehler"], "ok") };
  fach(() => freigabePruefen(gesamt, begruendung));
  const vorhanden = db.anlagen.monatswerte.find((x) => x.messpunktId === mp.id && x.register === register && x.monat === monat);
  const st = vorhanden?.stand ?? v.zahl(stand, { min: 0, max: 1e12, stellen: 3 });
  v.pflicht(st !== null && st !== undefined, "Zählerstand fehlt.");
  const e = await anlagenDemo.anlageEintragSpeichern(n, a.id, { art: "monatswert", id: vorhanden?.id || null, daten: { messpunktId: mp.id, register, monat, stand: st, quelle: vorhanden?.quelle || "Messstellenbetreiber (Demo – aus Simulation übernommen)", geprueft: true } });
  await aendern((d) => {
    d.betrieb.freigaben.push({ id: neueId("ZF"), anlageId: a.id, monatswertId: e.id, messpunktId: mp.id, zaehlernummer: mp.zaehlernummer, register, monat, stand: st, stufe: gesamt.stufe, befunde: (befund.befunde || []).slice(0, 10).map((b) => v.text(b?.text, 300)), begruendung: v.mehrzeilig(begruendung, 1000), vonId: n.id, vonName: nameVon(d, n.id), am: jetzt() });
    protokoll(d, n, "betrieb_zaehler", "anlage", a.id, `Monatswert ${mp.zaehlernummer}/${register} ${monat} freigegeben (${gesamt.stufe})`);
  });
  return { ok: true, monatswert: e };
}

// ================================================================ Berichtsdaten (Monats-/Jahresbericht je Anlage)

/** Stammdaten und Betriebsereignisse eines Zeitraums – Messdaten ergänzt betrieb/auswertung.js */
export async function betriebBerichtDaten(n, anlageId, { von, bis } = {}) {
  leseNoetig(n);
  const db = await lesenBereit(n);
  const a = anlageVon(db, anlageId);
  const B = db.betrieb;
  const imZeitraum = (x) => !!x && x >= von && x < bis;
  const stoerungen = db.anlagen.stoerungen.filter((s) => s.anlageId === a.id && (imZeitraum(s.erkanntAm) || imZeitraum(s.behobenAm) || (s.erkanntAm < von && (!s.behobenAm || s.behobenAm >= von))));
  return {
    anlage: { ...anlageKurz(a), bundesland: a.bundesland, ort: a.ort, inbetriebnahme: a.inbetriebnahme, status: a.status, speicherKwh: a.speicherKwh, eigentuemer: a.eigentuemer || "", betriebsfuehrer: a.betriebsfuehrer || "", organisation: (db.organisationen || []).find((o) => o.id === a.organisationId)?.name || "" },
    tickets: stoerungen.map((s) => ticketAusgabe(db, s)),
    wartungen: db.anlagen.wartungen.filter((w) => w.anlageId === a.id && w.datum >= von.slice(0, 10) && w.datum < bis.slice(0, 10)),
    protokolle: B.protokolle.filter((p) => p.anlageId === a.id && p.datum >= von.slice(0, 10) && p.datum < bis.slice(0, 10)).map(protokollAusgabe),
    auftraege: B.auftraege.filter((x) => x.anlageId === a.id && (imZeitraum(x.erstelltAm) || imZeitraum(x.erledigtAm ? `${x.erledigtAm}T12:00:00Z` : null))).map(auftragAusgabe),
    versicherungen: B.versicherungen.filter((x) => x.anlageId === a.id && (imZeitraum(x.erstelltAm) || VERSICHERUNG_OFFEN.includes(x.status))).map(versicherungAusgabe),
    einstrahlung: B.einstrahlung.filter((x) => x.anlageId === a.id),
    fristen: fristenAnlage(db, a).filter((f) => f.stufe !== "spaeter"),
    vertrag: (() => { const c = db.anlagen.vertraege.find((x) => x.anlageId === a.id); return c ? { strompreisCt: c.strompreisCt, grundgebuehrMonat: c.grundgebuehrMonat, status: c.status } : null; })(),
    ersteller: nameVon(db, n.id),
  };
}

// ================================================================ Lauf (Fristen, SLA, Lager) – Frappe: Scheduler täglich

function laufDb(db, n = null) {
  const B = db.betrieb;
  const erg = { fristen: 0, sla: 0, lager: 0 };
  const z = zustaendigBetrieb(db);
  const einmal = (key) => {
    if (B.alarme[key]) return false;
    B.alarme[key] = jetzt();
    return true;
  };
  for (const a of db.anlagen.anlagen.filter((x) => x.status !== "rueckbau")) {
    for (const f of fristenAnlage(db, a).filter((x) => ["ueberfaellig", "dringend", "fehlt"].includes(x.stufe) || (x.art === "wartung" && x.tage !== null && x.tage <= (B.plaene.find((p) => p.id === x.bezug.id)?.vorlaufTage || 30)))) {
      if (!einmal(`frist|${f.bezug.art}|${f.bezug.id}|${f.datum}|${f.stufe === "ueberfaellig" ? "u" : "v"}`)) continue;
      erg.fristen++;
      if (z) aufgabeAnlegen(db, { titel: `${a.name}: ${f.titel}${f.datum ? ` (${f.datum.split("-").reverse().join(".")})` : ""}`, beschreibung: `Frist ${f.art} – Stand: ${f.stufe}.\nBetriebsführung: /portal/admin/anlagen/betrieb/${a.id}`, faelligAm: f.datum && f.datum > heute() ? f.datum : heute(), zustaendigId: z.id, vonId: n?.id, bezugArt: null, bezugId: null });
    }
  }
  for (const s of db.anlagen.stoerungen.filter((x) => STOERUNG_OFFEN.includes(x.status))) {
    const sla = slaStatus(s);
    if (sla?.ampel !== "rot") continue;
    const teil = sla.reaktion?.verletzt && !sla.reaktion.erledigt ? "reaktion" : "loesung";
    if (!einmal(`sla|${s.id}|${teil}`)) continue;
    erg.sla++;
    const a = db.anlagen.anlagen.find((x) => x.id === s.anlageId);
    const empf = s.zustaendigId ? [nutzerById(db, s.zustaendigId)] : betriebKonten(db, true);
    for (const u of empf.filter(Boolean)) benachrichtigen(db, u, { art: "stoerung", titel: `SLA verletzt: ${a?.name || s.anlageId}`, text: `${teil === "reaktion" ? "Reaktionszeit" : "Lösungszeit"} überschritten – ${s.titel}`, link: `/portal/admin/anlagen/betrieb/stoerung/${s.id}`, objektArt: "anlage", objektId: s.anlageId }, { mail: false });
    for (const u of aktiveAdmins(db).filter((x) => (x.backofficeRollen || []).includes("leitung"))) benachrichtigen(db, u, { art: "aufgabe", titel: `SLA verletzt: ${a?.name || s.anlageId}`, text: s.titel, link: `/portal/admin/anlagen/betrieb/stoerung/${s.id}`, objektArt: "anlage", objektId: s.anlageId }, { mail: false });
  }
  for (const t of B.ersatzteile.filter((x) => x.aktiv !== false)) {
    const nb = nachbestellung(t);
    if (!nb || !einmal(`lager|${t.id}|${t.bestand}`)) continue;
    erg.lager++;
    if (z) aufgabeAnlegen(db, { titel: `Ersatzteil nachbestellen: ${t.bezeichnung}`, beschreibung: `${nb.grund}. Vorschlag: ${nb.menge} ${t.einheit || "Stück"}${t.artikelnummer ? ` (Art.-Nr. ${t.artikelnummer})` : ""}.`, faelligAm: heute(), zustaendigId: z.id, vonId: n?.id });
  }
  const schluessel = Object.keys(B.alarme);
  if (schluessel.length > 5000) for (const k of schluessel.slice(0, schluessel.length - 5000)) delete B.alarme[k];
  B.laufAm = jetzt();
  return erg;
}

async function lauflesen(n) {
  let db = await lesenBereit(n);
  if (!db.betrieb.laufAm || Date.now() - Date.parse(db.betrieb.laufAm) > 86400e3) {
    await aendern((d) => void laufDb(d, null));
    db = await lesen();
  }
  return db;
}

/** Lauf auslösen (Backoffice-Knopf) */
export async function betriebLauf(n) {
  schreibNoetig(n);
  return aendernBereit(n, (db) => {
    const erg = laufDb(db, n);
    protokoll(db, n, "betrieb_lauf", "anlage", "lauf", `Betriebsführung: ${erg.fristen} Fristen, ${erg.sla} SLA-Verletzungen, ${erg.lager} Nachbestellungen`);
    return erg;
  });
}
/** Systemlauf ohne Nutzer (Scheduler-Ersatz im Demo-Betrieb) */
export async function betriebSystemLauf() {
  await lesenBereit(null);
  return aendern((db) => laufDb(db, null));
}
