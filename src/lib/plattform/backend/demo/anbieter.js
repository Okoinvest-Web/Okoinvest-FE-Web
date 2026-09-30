// src/lib/plattform/backend/demo/anbieter.js
//
// Anbieter / Verkäufer im Demo-Backend – Referenz für plattform/api/anbieter.py (Vertrag: docs/API.md, Abschnitt
// „Anbieter / Verkäufer“). Reine Regeln: src/lib/plattform/anbieter/{regeln,bestand}.js.
//
// Anbieter-Akte je Projekt (db.anbieter.akten[projektId]):
//   mandat        Vermittlungsauftrag (einfach | exklusiv), Erklärung per getipptem Namen, Gegenbestätigung, Kündigung
//   pruefpunkte   Rückfragen/Nachbesserung des Backoffice mit Frist → Antwort des Anbieters → erledigt/erneut/verworfen
//   voten         Stellungnahmen des Verkäufers zu LOIs (je LOI-Fassung)
//   vorkenntnis   Meldungen nach § 4 Abs. 2 Besondere Bedingungen (zehn Werktage) → anerkannt/abgelehnt
//   bestand       Bestandsanlage: Ertragshistorie, Verträge, Förderung/Vermarktung, technische DD-Checkliste
//
// Rechte: Anbieter = Eigentümer des Projekts bzw. Team (lesen ≥ Nur lesen, schreiben ≥ Mitglied, Auftrag ≥ Admin/Inhaber);
// Backoffice = Bereich „projekte“ (lesen ≥ 1, schreiben = 2); Investor = nur Bestandsdaten, nur mit freigegebenem
// Datenraum. Investoren erscheinen dem Anbieter nur als Pseudonym (wie im Deal-Room), Kontaktangaben in LOI-Texten
// werden entfernt. Fremde → 403 (Seiten 404).

import { PlattformFehler, nichtGefunden, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { BOERSE_STATUS, DATENRAUM_STATUS } from "../../prozesse";
import { PROVISION } from "@/lib/invest/markt";
import { loiZeilen } from "../../fach/loi";
import { GEBOT_STATUS, RUNDEN_ARTEN, anonymisieren, gebotGesamt, pseudonymBuchstabe } from "../../dealroom";
import {
  ANB_SCHEMA, AnbieterFehler, MANDAT_ARTEN, MANDAT_HINWEIS, MANDAT_STATUS, MANDAT_VERSION, PRUEFPUNKTE_MAX, PRUEFPUNKT_STATUS,
  aktuellesVotum, anonymitaetPruefen, gebotVotum, exklusivitaetEnde, mandatEingabe, mandatKuendigung, mandatStand, mandatText, monatePlus, pruefpunktAktion,
  pruefpunktEingabe, pruefpunkteOffen, tagVon, tagePlus, VORKENNTNIS_STATUS, VORKENNTNIS_VERMERK, VOTUM_ARTEN, vorkenntnisEingabe, vorkenntnisFrist, votumEingabe,
} from "../../anbieter/regeln.js";
import { bestandAuswertung, bestandBereinigen, ertragCsvLesen, monateBereinigen } from "../../anbieter/bestand.js";
import { intern } from "../demo";
import * as org from "./teams";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";

const { nachricht, protokoll, nutzerById, kurz, nameVon } = intern;
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const BEREICH = "projekte";

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof AnbieterFehler) throw new PlattformFehler(e.status, e.message, e.code || undefined);
    throw e;
  }
}

// ================================================================ Datenbestand

function bereit(db) {
  if (db.anbieter?.v === ANB_SCHEMA) return db.anbieter;
  db.anbieter = { v: ANB_SCHEMA, akten: db.anbieter?.akten || {} };
  return db.anbieter;
}
function akteVon(db, projektId, { anlegen = false } = {}) {
  const A = bereit(db);
  if (!A.akten[projektId] && anlegen) A.akten[projektId] = { projektId, mandat: null, pruefpunkte: [], voten: [], vorkenntnis: [], bestand: {}, erstelltAm: jetzt() };
  return A.akten[projektId] || { projektId, mandat: null, pruefpunkte: [], voten: [], vorkenntnis: [], bestand: {} };
}

function projektLaden(db, id) {
  const p = (db.projekte || []).find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  return p;
}

/** Rolle am Projekt: admin | anbieter | investor – sonst 403 */
function rolleAn(db, n, p) {
  angemeldet(n);
  if (istAdmin(n)) {
    if (!darfLesen(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt den Bereich „Projekte“ nicht.");
    return { rolle: "admin" };
  }
  if (p.anbieterId === n.id || org.darfTeamLesenObjekt(db, n, p)) return { rolle: "anbieter" };
  if (n.rollen?.includes("investor") && BOERSE_STATUS.concat(["verkauft"]).includes(p.status)) {
    const i = (db.interessen || []).find((x) => x.projektId === p.id && DATENRAUM_STATUS.includes(x.status) && (x.investorId === n.id || org.darfTeamLesenObjekt(db, n, x)));
    if (i) return { rolle: "investor", interesse: i };
  }
  throw verboten();
}
const anbieterSchreibt = (db, n, p) => p.anbieterId === n.id || org.darfTeamSchreibenObjekt(db, n, p);
const anbieterVerwaltet = (db, n, p) => p.anbieterId === n.id || org.darfTeamVerwaltenObjekt(db, n, p);
function boSchreibNoetig(n) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  if (!darfSchreiben(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Schreiben.");
}

/** Pseudonyme wie im Deal-Room („Investor A“ … in der Reihenfolge der NDA-Anfragen) */
function pseudonyme(db, projektId) {
  const liste = (db.interessen || [])
    .filter((i) => i.projektId === projektId && (i.nda || i.status !== "gemerkt"))
    .sort((a, b) => String(a.nda?.am || a.erstelltAm).localeCompare(String(b.nda?.am || b.erstelltAm)) || a.id.localeCompare(b.id));
  return { liste, map: new Map(liste.map((i, idx) => [i.id, `Investor ${pseudonymBuchstabe(idx)}`])) };
}

const datumDe = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");

// ================================================================ Ausgabe

function mandatAusgabe(akte, p, rolle) {
  const m = akte.mandat;
  const stand = mandatStand(m, heute());
  if (!m) return { stand, statusLabel: MANDAT_STATUS[stand.status].label, altKlick: !!p.provisionAkzeptiert?.am && !p.provisionAkzeptiert?.mandat };
  return {
    art: m.art, artLabel: MANDAT_ARTEN[m.art]?.label || m.art, dauerMonate: m.dauerMonate || null,
    vorbehalte: rolle === "admin" || rolle === "anbieter" ? m.vorbehalte || [] : undefined,
    erteiltAm: m.erteiltAm, erteiltVon: m.erteiltVonName || "", name: m.name, sha256: m.sha256, version: m.version,
    ip: rolle === "admin" ? m.ip || "" : undefined,
    bestaetigtAm: m.bestaetigtAm || null, mindestBis: m.mindestBis || "", exklusivEndetAm: m.exklusivEndetAm || "", gekuendigtAm: m.gekuendigtAm || null, endetAm: m.endetAm || "", kuendigungDurch: m.kuendigungDurch || "",
    stand, statusLabel: MANDAT_STATUS[stand.status].label,
  };
}

/** Bieterverfahren: Gebote, die der Verkäufer sehen darf (Bieterstand freigegeben bzw. Backoffice) – je Interesse */
function geboteFuerAkte(db, p, akte, rolle) {
  const dr = db.dealroom;
  if (!dr?.gebote?.length) return new Map();
  const frei = new Set((dr.verfahren || []).filter((vf) => vf.projektId === p.id && (rolle === "admin" || vf.anbieterFreigabe)).map((vf) => vf.id));
  const out = new Map();
  for (const g of dr.gebote.filter((x) => x.projektId === p.id && frei.has(x.verfahrenId) && x.status !== "zurueckgezogen")) {
    const vt = gebotVotum(akte.voten || [], g.id, g.version || 1);
    const vf = dr.verfahren.find((x) => x.id === g.verfahrenId);
    const zeile = {
      id: g.id, verfahrenId: g.verfahrenId, runde: g.runde, rundeLabel: RUNDEN_ARTEN[g.rundeArt]?.label || "", version: g.version || 1,
      preisGesamt: gebotGesamt(g, p.mwp), bedingungen: rolle === "admin" ? g.bedingungen || "" : anonymisieren(g.bedingungen || "").text,
      status: g.status, statusLabel: GEBOT_STATUS[g.status]?.label || g.status, am: g.am,
      votum: vt ? { art: vt.art, label: VOTUM_ARTEN[vt.art]?.label, kommentar: vt.kommentar, gegenvorschlag: vt.gegenvorschlag, am: vt.am, von: vt.vonName } : null,
      votumMoeglich: g.status === "abgegeben" && !!vf && !["zuschlag", "abgebrochen"].includes(vf.status),
    };
    out.set(g.interesseId, [...(out.get(g.interesseId) || []), zeile].sort((a, b) => b.runde - a.runde));
  }
  return out;
}

function interessentenAusgabe(db, p, akte, rolle) {
  const { liste, map } = pseudonyme(db, p.id);
  const h = heute();
  const gebote = geboteFuerAkte(db, p, akte, rolle);
  return liste.map((i) => {
    const angezeigtAm = i.nda?.am || i.erstelltAm || "";
    const frist = vorkenntnisFrist(angezeigtAm);
    const vk = [...(akte.vorkenntnis || [])].reverse().find((x) => x.interesseId === i.id) || null;
    const loiAm = i.loi?.am || null;
    const vt = aktuellesVotum(akte.voten || [], i.id, loiAm);
    const zeilen = i.loi ? loiZeilen(i.loi).filter((z) => z.label !== "Ansprechpartner").map((z) => (z.label === "Inhalt" && rolle !== "admin" ? { ...z, wert: anonymisieren(z.wert).text } : z)) : [];
    const out = {
      interesseId: i.id, pseudonym: map.get(i.id), status: i.status, angezeigtAm, vorkenntnisFrist: frist, vorkenntnisOffen: !vk && !!frist && h <= frist,
      vorkenntnis: vk ? { ...vk, statusLabel: VORKENNTNIS_STATUS[vk.status]?.label || vk.status } : null,
      loi: zeilen.length ? { am: loiAm, zeilen, betrag: i.loi.betrag ?? null } : null,
      votum: vt ? { art: vt.art, label: VOTUM_ARTEN[vt.art]?.label, kommentar: vt.kommentar, gegenvorschlag: vt.gegenvorschlag, am: vt.am, von: vt.vonName } : null,
      votumMoeglich: i.status === "loi_abgegeben" && !!i.loi,
      gebote: gebote.get(i.id) || [],
    };
    if (rolle === "admin") out.investor = kurz(nutzerById(db, i.investorId));
    return out;
  });
}

function pruefpunktAusgabe(pp, rolle) {
  const st = PRUEFPUNKT_STATUS[pp.status] || {};
  return { ...pp, statusLabel: rolle === "admin" ? st.labelBo : st.label, ton: st.ton, ueberfaellig: pp.status === "offen" && pp.fristAm && pp.fristAm < heute() };
}

function akteAusgabe(db, n, p, rolle) {
  const akte = akteVon(db, p.id);
  const anbieter = nutzerById(db, p.anbieterId);
  const bestand = akte.bestand || {};
  const bestandAus = { daten: bestand, auswertung: bestandAuswertung(bestand, p, heute()) };
  const kopf = { id: p.id, titel: p.titel, status: p.status, phase: p.phase, mwp: p.mwp, land: p.land, provisionSatz: p.provisionSatz ?? null, bestandsanlage: p.phase === "cod" };
  if (rolle === "investor") return { rolle, projekt: kopf, bestand: bestandAus };
  const docs = (db.dokumente || []).filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id && !d.geloescht).map((d) => ({ id: d.id, name: d.name || d.dateiname || d.id, kategorie: d.kategorie }));
  return {
    rolle,
    projekt: kopf,
    rechte: {
      schreiben: rolle === "anbieter" ? anbieterSchreibt(db, n, p) : darfSchreiben(n, BEREICH),
      auftrag: rolle === "anbieter" ? anbieterVerwaltet(db, n, p) : false,
    },
    mandat: mandatAusgabe(akte, p, rolle),
    pruefpunkte: (akte.pruefpunkte || []).map((x) => pruefpunktAusgabe(x, rolle)),
    anonymitaet: anonymitaetPruefen(p, { anbieter }),
    interessenten: interessentenAusgabe(db, p, akte, rolle),
    bestand: bestandAus,
    dokumente: docs,
    hinweis: MANDAT_HINWEIS,
  };
}

// ================================================================ Lesen

export async function anbieterAkte(n, projektId) {
  angemeldet(n);
  const db = await lesen();
  const p = projektLaden(db, projektId);
  const { rolle } = rolleAn(db, n, p);
  return akteAusgabe(db, n, p, rolle);
}

/** Daten für das PDF des Vermittlungsauftrags (Anbieter und Backoffice) */
export async function vermittlungsauftragDaten(n, projektId, { ip = "" } = {}) {
  angemeldet(n);
  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const { rolle } = rolleAn(db, n, p);
    if (rolle === "investor") throw verboten();
    const akte = akteVon(db, p.id);
    const m = akte.mandat;
    const entwurf = !m;
    const mandat = m || { art: "einfach", vorbehalte: [] };
    // Erteilter Auftrag: genau der Wortlaut, dessen Prüfsumme protokolliert wurde; sonst aktueller Entwurf
    const absaetze = m?.absaetze?.length ? m.absaetze : mandatText({ projekt: p, mandat, anbieter: kurz(nutzerById(db, p.anbieterId)) || {}, provision: PROVISION.verkaeufer });
    protokoll(db, n, "vermittlungsauftrag_pdf", "projekt", p.id, "Vermittlungsauftrag als PDF abgerufen", ip);
    return {
      titel: MANDAT_ARTEN[mandat.art]?.label || "Vermittlungsauftrag",
      untertitel: `Projekt ${p.id} · „${p.titel}“ · Version ${m?.version || MANDAT_VERSION}`,
      absaetze,
      entwurf,
      erklaerung: m ? { name: m.name, am: m.erteiltAm, sha256: m.sha256, bestaetigtAm: m.bestaetigtAm || null, gekuendigtAm: m.gekuendigtAm || null, endetAm: m.endetAm || "", exklusivEndetAm: m.exklusivEndetAm || "", satz: p.provisionSatz ?? null } : null,
      hinweis: MANDAT_HINWEIS,
    };
  });
}

// ================================================================ Anbieter-Aktionen

/**
 * aktion: mandat_erteilen {art, dauerMonate, vorbehalte, name, zustimmung} · mandat_kuendigen ·
 *         exklusivitaet_beenden ·
 *         pruefpunkt_antworten {id, antwort} · votum {interesseId, art, kommentar, gegenvorschlag} ·
 *         gebot_votum {gebotId, art, kommentar, gegenvorschlag} (Bieterverfahren, nur bei freigegebenem Bieterstand) ·
 *         vorkenntnis_melden {interesseId, begruendung, nachweisArt, nachweisDatum, dokumentId} ·
 *         bestand_speichern {monate?, vertraege?, foerderung?, dd?} · ertrag_import {csv, ersetzen}
 */
export async function anbieterAktion(n, projektId, daten = {}, { ip = "" } = {}) {
  angemeldet(n);
  const aktion = v.auswahl(daten.aktion, ["mandat_erteilen", "mandat_kuendigen", "exklusivitaet_beenden", "pruefpunkt_antworten", "votum", "gebot_votum", "vorkenntnis_melden", "bestand_speichern", "ertrag_import"], "");
  v.pflicht(aktion, "Unbekannte Aktion.");
  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const { rolle } = rolleAn(db, n, p);
    if (rolle !== "anbieter") throw verboten("Nur der Anbieter des Projekts.");
    if (!anbieterSchreibt(db, n, p)) throw verboten("Mit der Teamrolle „Nur lesen“ können Sie nichts ändern.");
    const akte = akteVon(db, p.id, { anlegen: true });
    const h = heute();
    let zusatz = {};
    fach(() => {
      if (aktion === "mandat_erteilen") {
        if (!anbieterVerwaltet(db, n, p)) throw verboten("Den Vermittlungsauftrag erteilt der Anbieter bzw. Admin/Inhaber der Organisation.");
        if (akte.mandat && !akte.mandat.gekuendigtAm) throw new AnbieterFehler(409, "Für dieses Projekt besteht bereits ein Vermittlungsauftrag.");
        if (p.status === "verkauft") throw new AnbieterFehler(409, "Das Projekt ist bereits verkauft.");
        const e = mandatEingabe(daten, { kontoName: nameVon(db, n.id) });
        const anb = kurz(nutzerById(db, p.anbieterId)) || {};
        const absaetze = mandatText({ projekt: p, mandat: e, anbieter: anb, provision: PROVISION.verkaeufer });
        const hash = sha256(JSON.stringify({ version: MANDAT_VERSION, absaetze }));
        akte.mandat = { ...e, absaetze, version: MANDAT_VERSION, erteiltAm: jetzt(), erteiltVonId: n.id, erteiltVonName: nameVon(db, n.id), ip: ip || "", sha256: hash, bestaetigtAm: null, mindestBis: "", exklusivEndetAm: "", gekuendigtAm: null, endetAm: "" };
        // Kompatibilität: Einreichen setzt die akzeptierte Provisionsvereinbarung voraus
        p.provisionAkzeptiert = { am: akte.mandat.erteiltAm, ip: ip || "", version: MANDAT_VERSION, text: PROVISION.verkaeufer.text, mandat: true, art: e.art };
        p.geaendertAm = jetzt();
        protokoll(db, n, "vermittlungsauftrag", "projekt", p.id, `Vermittlungsauftrag erteilt (${MANDAT_ARTEN[e.art].label}${e.dauerMonate ? `, ${e.dauerMonate} Monate` : ""}, SHA-256 ${hash.slice(0, 12)}…)`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, text: `Vermittlungsauftrag erteilt: ${MANDAT_ARTEN[e.art].label}${e.art === "exklusiv" ? ` (Mindestlaufzeit ${e.dauerMonate} Monate) – bitte gegenbestätigen` : ""}.` });
      } else if (aktion === "mandat_kuendigen") {
        if (!anbieterVerwaltet(db, n, p)) throw verboten("Kündigen kann der Anbieter bzw. Admin/Inhaber der Organisation.");
        const wirkung = mandatKuendigung(akte.mandat, { heute: h, projektStatus: p.status });
        Object.assign(akte.mandat, { gekuendigtAm: jetzt(), kuendigungDurch: "anbieter", endetAm: wirkung });
        p.provisionAkzeptiert = null; // erneutes Einreichen erst mit neuem Auftrag
        p.geaendertAm = jetzt();
        protokoll(db, n, "vermittlungsauftrag", "projekt", p.id, "Vermittlungsauftrag gekündigt", ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, text: "Vermittlungsauftrag gekündigt. Ansprüche aus bereits nachgewiesenen Investoren und der Umgehungsschutz bleiben bestehen." });
      } else if (aktion === "exklusivitaet_beenden") {
        if (!anbieterVerwaltet(db, n, p)) throw verboten("Beenden kann der Anbieter bzw. Admin/Inhaber der Organisation.");
        const wirkung = exklusivitaetEnde(akte.mandat, { heute: h });
        Object.assign(akte.mandat, { exklusivEndetAm: wirkung, exklusivGekuendigtAm: jetzt() });
        protokoll(db, n, "vermittlungsauftrag", "projekt", p.id, `Exklusivität beendet zum ${datumDe(wirkung)}`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, text: `Exklusivität beendet zum ${datumDe(wirkung)}. Danach gilt der Auftrag als einfacher Vermittlungsauftrag weiter.` });
      } else if (aktion === "pruefpunkt_antworten") {
        const pp = (akte.pruefpunkte || []).find((x) => x.id === v.kennung(daten.id));
        if (!pp) throw nichtGefunden("Prüfpunkt nicht gefunden.");
        const r = pruefpunktAktion(pp, { aktion: "antworten", wer: "anbieter", antwort: daten.antwort });
        Object.assign(pp, { status: r.status, antwort: r.antwort, beantwortetAm: jetzt(), beantwortetVon: nameVon(db, n.id) });
        pp.verlauf.push({ am: jetzt(), text: "Antwort des Anbieters", status: r.status });
        protokoll(db, n, "pruefpunkt", "projekt", p.id, `Rückfrage ${pp.id} beantwortet`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, text: `Antwort auf Rückfrage „${pp.text.slice(0, 80)}${pp.text.length > 80 ? " …" : ""}“: ${r.antwort}` });
      } else if (aktion === "votum") {
        const i = (db.interessen || []).find((x) => x.id === v.kennung(daten.interesseId) && x.projektId === p.id);
        if (!i) throw nichtGefunden("Interessent nicht gefunden.");
        if (i.status !== "loi_abgegeben" || !i.loi) throw new AnbieterFehler(409, "Eine Stellungnahme ist nur zu einer offenen LOI möglich.");
        const e = votumEingabe(daten);
        const pseudo = pseudonyme(db, p.id).map.get(i.id) || "Investor";
        akte.voten.push({ id: neueId("VT"), interesseId: i.id, loiAm: i.loi.am || null, ...e, am: jetzt(), vonId: n.id, vonName: nameVon(db, n.id) });
        protokoll(db, n, "votum", "interesse", i.id, `Stellungnahme des Verkäufers: ${VOTUM_ARTEN[e.art].label}`, ip);
        nachricht(db, {
          bezugArt: "projekt", bezugId: p.id, vonId: n.id,
          text: `Stellungnahme zur LOI von ${pseudo}: ${VOTUM_ARTEN[e.art].label}.${e.gegenvorschlag ? ` Gegenvorschlag: ${e.gegenvorschlag.toLocaleString("de-DE")} €.` : ""}${e.kommentar ? ` ${e.kommentar}` : ""}`,
        });
        zusatz = { votum: e.art };
      } else if (aktion === "gebot_votum") {
        const g = (db.dealroom?.gebote || []).find((x) => x.id === v.kennung(daten.gebotId) && x.projektId === p.id);
        if (!g) throw nichtGefunden("Gebot nicht gefunden.");
        const vf = (db.dealroom.verfahren || []).find((x) => x.id === g.verfahrenId);
        if (!vf?.anbieterFreigabe) throw new AnbieterFehler(409, "Der Bieterstand ist für Sie noch nicht freigegeben.");
        if (g.status !== "abgegeben" || ["zuschlag", "abgebrochen"].includes(vf.status)) throw new AnbieterFehler(409, "Eine Stellungnahme ist nur zu einem offenen Gebot möglich.");
        const e = votumEingabe(daten);
        const pseudo = pseudonyme(db, p.id).map.get(g.interesseId) || "Investor";
        akte.voten.push({ id: neueId("VT"), interesseId: g.interesseId, gebotId: g.id, gebotVersion: g.version || 1, verfahrenId: vf.id, ...e, am: jetzt(), vonId: n.id, vonName: nameVon(db, n.id) });
        protokoll(db, n, "votum", "interesse", g.interesseId, `Stellungnahme des Verkäufers zu Gebot ${g.id}: ${VOTUM_ARTEN[e.art].label}`, ip);
        nachricht(db, {
          bezugArt: "projekt", bezugId: p.id, vonId: n.id,
          text: `Stellungnahme zum Gebot von ${pseudo} (Runde ${g.runde}): ${VOTUM_ARTEN[e.art].label}.${e.gegenvorschlag ? ` Gegenvorschlag: ${e.gegenvorschlag.toLocaleString("de-DE")} €.` : ""}${e.kommentar ? ` ${e.kommentar}` : ""}`,
        });
        zusatz = { votum: e.art };
      } else if (aktion === "vorkenntnis_melden") {
        const i = (db.interessen || []).find((x) => x.id === v.kennung(daten.interesseId) && x.projektId === p.id);
        if (!i) throw nichtGefunden("Interessent nicht gefunden.");
        if ((akte.vorkenntnis || []).some((x) => x.interesseId === i.id && x.status !== "abgelehnt")) throw new AnbieterFehler(409, "Für diesen Interessenten liegt bereits eine Meldung vor.");
        const angezeigtAm = i.nda?.am || i.erstelltAm;
        const e = vorkenntnisEingabe(daten, { angezeigtAm, heute: h });
        if (e.dokumentId && !(db.dokumente || []).some((d) => d.id === e.dokumentId && d.bezugArt === "projekt" && d.bezugId === p.id)) throw new AnbieterFehler(422, "Der Nachweis muss ein Dokument dieses Projekts sein.");
        const pseudo = pseudonyme(db, p.id).map.get(i.id) || "Investor";
        akte.vorkenntnis.push({ id: neueId("VK"), interesseId: i.id, pseudonym: pseudo, ...e, status: "gemeldet", gemeldetAm: jetzt(), vonName: nameVon(db, n.id) });
        protokoll(db, n, "vorkenntnis", "interesse", i.id, `Vorkenntnis gemeldet${e.verspaetet ? " (nach Fristablauf)" : ""}`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, text: `Vorkenntnis gemeldet für ${pseudo} (Nachweis: ${e.nachweisDatum.split("-").reverse().join(".")})${e.verspaetet ? " – nach Ablauf der Frist von zehn Werktagen" : ""}. ${e.begruendung}` });
      } else if (aktion === "bestand_speichern" || aktion === "ertrag_import") {
        if (p.status === "verkauft") throw new AnbieterFehler(409, "Das Projekt ist verkauft – Bestandsdaten sind abgeschlossen.");
        let eingabe = daten.bestand || {};
        if (aktion === "ertrag_import") {
          const r = ertragCsvLesen(daten.csv);
          if (!r.monate.length) throw new AnbieterFehler(422, r.fehler[0] || "Keine Monatswerte erkannt.");
          eingabe = { monate: daten.ersetzen ? r.monate : monateBereinigen([...(akte.bestand?.monate || []), ...r.monate]) };
          zusatz = { importiert: r.monate.length, fehler: r.fehler };
        }
        const docs = new Set((db.dokumente || []).filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id).map((d) => d.id));
        const neu = bestandBereinigen(eingabe, akte.bestand || {}, { land: p.land });
        for (const x of neu.vertraege || []) if (x.dokumentId && !docs.has(x.dokumentId)) x.dokumentId = null;
        for (const x of Object.values(neu.dd || {})) if (x.dokumentId && !docs.has(x.dokumentId)) x.dokumentId = null;
        akte.bestand = { ...neu, geaendertAm: jetzt() };
        protokoll(db, n, "bestand", "projekt", p.id, aktion === "ertrag_import" ? `Ertragshistorie importiert (${zusatz.importiert} Monate)` : `Bestandsdaten gespeichert (${Object.keys(eingabe).join(", ") || "–"})`, ip);
      }
    });
    akte.geaendertAm = jetzt();
    return { ...akteAusgabe(db, n, p, rolle), ...zusatz };
  });
}

// ================================================================ Backoffice-Aktionen

/**
 * aktion: pruefpunkt_anlegen {bereich, text, pflicht, fristTage} · pruefpunkt {id, schritt: erledigt|erneut|verwerfen, kommentar} ·
 *         mandat_bestaetigen · vorkenntnis_entscheiden {id, entscheidung: anerkannt|abgelehnt, grund}
 */
export async function anbieterAdminAktion(n, projektId, daten = {}, { ip = "" } = {}) {
  boSchreibNoetig(n);
  const aktion = v.auswahl(daten.aktion, ["pruefpunkt_anlegen", "pruefpunkt", "mandat_bestaetigen", "vorkenntnis_entscheiden"], "");
  v.pflicht(aktion, "Unbekannte Aktion.");
  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const akte = akteVon(db, p.id, { anlegen: true });
    const h = heute();
    fach(() => {
      if (aktion === "pruefpunkt_anlegen") {
        if (p.status === "verkauft") throw new AnbieterFehler(409, "Das Projekt ist verkauft.");
        if ((akte.pruefpunkte || []).length >= PRUEFPUNKTE_MAX) throw new AnbieterFehler(409, `Höchstens ${PRUEFPUNKTE_MAX} Prüfpunkte je Projekt.`);
        const e = pruefpunktEingabe(daten, { heute: h });
        const pp = { id: neueId("PP"), ...e, status: "offen", erstelltAm: jetzt(), erstelltVon: nameVon(db, n.id), antwort: "", kommentar: "", verlauf: [{ am: jetzt(), text: "Rückfrage angelegt", status: "offen" }] };
        akte.pruefpunkte.push(pp);
        protokoll(db, n, "pruefpunkt", "projekt", p.id, `Rückfrage ${pp.id} angelegt (${e.bereich}${e.pflicht ? ", Pflicht" : ""})`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, vonAdmin: true, text: `Rückfrage des Backoffice (Antwort bis ${datumDe(e.fristAm)}): ${e.text}` });
      } else if (aktion === "pruefpunkt") {
        const pp = (akte.pruefpunkte || []).find((x) => x.id === v.kennung(daten.id));
        if (!pp) throw nichtGefunden("Prüfpunkt nicht gefunden.");
        const schritt = v.auswahl(daten.schritt, { erledigt: 1, erneut: 1, verwerfen: 1 }, "");
        const r = pruefpunktAktion(pp, { aktion: schritt, wer: "backoffice", kommentar: daten.kommentar });
        pp.status = r.status;
        pp.kommentar = r.kommentar || "";
        if (schritt === "erneut") pp.fristAm = tagePlus(h, 5);
        pp.verlauf.push({ am: jetzt(), text: schritt === "erledigt" ? "Erledigt" : schritt === "erneut" ? "Erneut geöffnet" : "Entfällt", status: r.status, kommentar: r.kommentar || "" });
        protokoll(db, n, "pruefpunkt", "projekt", p.id, `Rückfrage ${pp.id}: ${PRUEFPUNKT_STATUS[r.status].labelBo}`, ip);
        if (schritt === "erneut") nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, vonAdmin: true, text: `Rückfrage erneut offen (Antwort bis ${datumDe(pp.fristAm)}): ${r.kommentar}` });
        else nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, vonAdmin: true, melden: "ohneMail", text: `Rückfrage „${pp.text.slice(0, 80)}${pp.text.length > 80 ? " …" : ""}“: ${schritt === "erledigt" ? "erledigt" : "entfällt"}.${r.kommentar ? ` ${r.kommentar}` : ""}` });
      } else if (aktion === "mandat_bestaetigen") {
        const m = akte.mandat;
        if (!m || m.gekuendigtAm) throw new AnbieterFehler(409, "Es liegt kein wirksamer Vermittlungsauftrag vor.");
        if (m.art !== "exklusiv") throw new AnbieterFehler(409, "Nur eine Exklusivität bedarf der Gegenbestätigung.");
        if (m.bestaetigtAm) throw new AnbieterFehler(409, "Die Exklusivität ist bereits bestätigt.");
        m.bestaetigtAm = jetzt();
        m.bestaetigtVon = nameVon(db, n.id);
        m.mindestBis = monatePlus(h, m.dauerMonate);
        protokoll(db, n, "vermittlungsauftrag", "projekt", p.id, `Exklusivität gegenbestätigt (Mindestlaufzeit bis ${datumDe(m.mindestBis)})`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, vonAdmin: true, text: `ÖkoInvest hat die Exklusivität bestätigt. Mindestlaufzeit bis ${datumDe(m.mindestBis)}; danach kündbar zum Monatsende. Wir sprechen passende Investoren aktiv an und berichten regelmäßig.` });
      } else if (aktion === "vorkenntnis_entscheiden") {
        const vk = (akte.vorkenntnis || []).find((x) => x.id === v.kennung(daten.id));
        if (!vk) throw nichtGefunden("Meldung nicht gefunden.");
        if (vk.status !== "gemeldet") throw new AnbieterFehler(409, "Die Meldung ist bereits entschieden.");
        const ent = v.auswahl(daten.entscheidung, { anerkannt: 1, abgelehnt: 1 }, "");
        v.pflicht(ent, "Bitte wählen Sie die Entscheidung.");
        const grund = v.mehrzeilig(daten.grund, 1000);
        v.pflicht(ent === "anerkannt" || grund.length >= 10, "Bitte begründen Sie die Ablehnung (mind. 10 Zeichen).");
        Object.assign(vk, { status: ent, entschiedenAm: jetzt(), entschiedenVon: nameVon(db, n.id), grund });
        protokoll(db, n, "vorkenntnis", "interesse", vk.interesseId, `Vorkenntnis ${ent === "anerkannt" ? "anerkannt" : "nicht anerkannt"}`, ip);
        nachricht(db, { bezugArt: "projekt", bezugId: p.id, vonId: n.id, vonAdmin: true, text: `Ihre Vorkenntnis-Meldung zu ${vk.pseudonym} wurde ${ent === "anerkannt" ? "anerkannt – für diesen Interessenten entsteht keine Provision aus diesem Projekt" : `nicht anerkannt: ${grund}`}.` });
        // Anerkennung nach dem Verkauf: noch nicht abgerechnete Provision zum Käufer stornieren (in Rechnung → Storno über die Buchhaltung)
        if (ent === "anerkannt") {
          for (const pv of (db.provisionen || []).filter((x) => x.projektId === p.id && x.interesseId === vk.interesseId && x.status === "offen")) {
            pv.status = "storniert";
            pv.ablehnGrund = VORKENNTNIS_VERMERK;
            pv.statusVerlauf = [...(pv.statusVerlauf || []), { status: "storniert", am: jetzt(), vonId: n.id, vonRolle: "admin", kommentar: VORKENNTNIS_VERMERK }];
            pv.geaendertAm = jetzt();
            protokoll(db, n, "provision", "provision", pv.id, `Provision storniert: ${VORKENNTNIS_VERMERK}`, ip);
          }
        }
      }
    });
    akte.geaendertAm = jetzt();
    return akteAusgabe(db, n, p, "admin");
  });
}

// ================================================================ Cockpit „Was ist zu tun?“

const aufgabe = (art, text, link, { frist = "", ton = "warn" } = {}) => ({ art, text, link, frist, ton, ueberfaellig: !!frist && frist < heute() });

/** Anbieter: je eigenem Projekt die offenen Schritte. Backoffice: Punkte, die auf das Backoffice warten. */
export async function anbieterCockpit(n) {
  angemeldet(n);
  const db = await lesen();
  const h = heute();
  if (istAdmin(n)) {
    if (!darfLesen(n, BEREICH)) throw verboten("Ihre Backoffice-Rolle erlaubt den Bereich „Projekte“ nicht.");
    const liste = [];
    for (const [pid, akte] of Object.entries(db.anbieter?.akten || {})) {
      const p = (db.projekte || []).find((x) => x.id === pid);
      if (!p) continue;
      const link = `/portal/projekte/${p.id}#anbieter`;
      const auf = [];
      for (const pp of akte.pruefpunkte || []) if (pp.status === "beantwortet") auf.push(aufgabe("pruefpunkt", `Antwort prüfen: ${pp.text.slice(0, 70)}`, link, { ton: "info" }));
      for (const vk of akte.vorkenntnis || []) if (vk.status === "gemeldet") auf.push(aufgabe("vorkenntnis", `Vorkenntnis-Meldung zu ${vk.pseudonym} entscheiden`, link));
      if (akte.mandat?.art === "exklusiv" && !akte.mandat.bestaetigtAm && !akte.mandat.gekuendigtAm) auf.push(aufgabe("mandat", "Exklusivität gegenbestätigen", link));
      for (const i of (db.interessen || []).filter((x) => x.projektId === p.id && x.status === "loi_abgegeben")) {
        const vt = aktuellesVotum(akte.voten || [], i.id, i.loi?.am);
        if (vt) auf.push(aufgabe("votum", `Verkäufer-Stellungnahme zur LOI: ${VOTUM_ARTEN[vt.art].label}`, link, { ton: vt.art === "ablehnung" ? "neutral" : "ok" }));
      }
      if (auf.length) liste.push({ projekt: { id: p.id, titel: p.titel, status: p.status }, aufgaben: auf });
    }
    return { rolle: "admin", projekte: liste, summe: liste.reduce((s, x) => s + x.aufgaben.length, 0) };
  }
  if (!n.rollen?.includes("anbieter")) throw verboten("Nur für Projektanbieter.");
  const eigene = (db.projekte || []).filter(org.listenFilter(db, n, "anbieterId"));
  const liste = [];
  for (const p of eigene) {
    const akte = akteVon(db, p.id);
    const link = `/portal/projekte/${p.id}`;
    const auf = [];
    const stand = mandatStand(akte.mandat, h);
    if (p.status === "entwurf") {
      if (!p.provisionAkzeptiert?.am) auf.push(aufgabe("mandat", "Vermittlungsauftrag erteilen (Voraussetzung für das Einreichen)", `${link}#anbieter`));
      else auf.push(aufgabe("einreichen", "Entwurf vervollständigen und zur Prüfung einreichen", link, { ton: "info" }));
    }
    if (stand.status === "wartet") auf.push(aufgabe("mandat", "Exklusivität wartet auf Gegenbestätigung durch ÖkoInvest", `${link}#anbieter`, { ton: "info" }));
    if (stand.exklusivAktiv && stand.mindestBis && stand.mindestBis >= h && stand.mindestBis <= tagePlus(h, 30)) auf.push(aufgabe("mandat", `Mindestlaufzeit der Exklusivität endet am ${datumDe(stand.mindestBis)}`, `${link}#anbieter`, { ton: "info" }));
    for (const pp of pruefpunkteOffen(akte.pruefpunkte)) auf.push(aufgabe("pruefpunkt", `Rückfrage beantworten: ${pp.text.slice(0, 70)}${pp.text.length > 70 ? " …" : ""}`, `${link}#anbieter`, { frist: pp.fristAm }));
    if (["entwurf", "pruefung"].includes(p.status)) {
      const an = anonymitaetPruefen(p, { anbieter: nutzerById(db, p.anbieterId) });
      if (!an.ok) auf.push(aufgabe("anonymitaet", `Teaser enthält ${an.kritisch} identifizierende Angabe(n) – vor der Veröffentlichung entfernen`, `${link}#anbieter`));
    }
    const { liste: ints, map } = pseudonyme(db, p.id);
    for (const i of ints) {
      if (i.status === "loi_abgegeben" && i.loi && !aktuellesVotum(akte.voten || [], i.id, i.loi.am)) auf.push(aufgabe("votum", `LOI von ${map.get(i.id)}: Stellungnahme abgeben`, `${link}#anbieter`));
      const frist = vorkenntnisFrist(i.nda?.am || i.erstelltAm);
      if (frist && h <= frist && !(akte.vorkenntnis || []).some((x) => x.interesseId === i.id)) auf.push(aufgabe("vorkenntnis", `${map.get(i.id)} neu angezeigt – Vorkenntnis ggf. melden`, `${link}#anbieter`, { frist, ton: "info" }));
    }
    const fragen = (db.dealroom?.fragen || []).filter((f) => f.projektId === p.id && f.status === "freigegeben");
    if (fragen.length) {
      const fr = fragen.map((f) => (f.fristAm ? tagVon(f.fristAm) : "")).filter(Boolean).sort()[0] || "";
      auf.push(aufgabe("qa", `${fragen.length} Frage(n) im Deal-Room beantworten`, `/portal/dealroom/${p.id}?tab=qa`, { frist: fr }));
    }
    for (const c of (db.closing?.closings || []).filter((x) => x.projektId === p.id && ["vorbereitung", "signing"].includes(x.status))) {
      const cps = (c.cps || []).filter((x) => x.verantwortlich === "verkaeufer" && x.status === "offen");
      if (cps.length) auf.push(aufgabe("closing", `${cps.length} Vollzugsbedingung(en) im Closing melden`, `/portal/closing/${c.id}`));
    }
    const prov = (db.provisionen || []).find((x) => x.projektId === p.id);
    if (prov?.status === "in_rechnung") auf.push(aufgabe("provision", "Provisionsrechnung offen – bitte begleichen", "/portal/abrechnungen"));
    if (p.phase === "cod" && p.status !== "verkauft") {
      const aw = bestandAuswertung(akte.bestand || {}, p, h);
      if ((aw.ertrag.gesamt?.monate || 0) < 12) auf.push(aufgabe("bestand", "Ertragshistorie (mind. 12 Monate) hochladen", `${link}#bestand`, { ton: "info" }));
      if (aw.dd.offenPflicht.length) auf.push(aufgabe("bestand", `Technische DD: ${aw.dd.offenPflicht.length} Pflichtunterlage(n) offen`, `${link}#bestand`, { ton: "info" }));
    }
    liste.push({ projekt: { id: p.id, titel: p.titel, status: p.status, phase: p.phase }, aufgaben: auf });
  }
  const summe = liste.reduce((s, x) => s + x.aufgaben.length, 0);
  const ueberfaellig = liste.reduce((s, x) => s + x.aufgaben.filter((a) => a.ueberfaellig).length, 0);
  return { rolle: "anbieter", projekte: liste, summe, ueberfaellig };
}

// ================================================================ Frist-Lauf (täglich; Demo: beim Cockpit-Aufruf nicht nötig)

/** Erinnerung an überfällige Rückfragen – liefert Anzahl. Frappe: scheduler_events → anbieter.frist_lauf */
export async function anbieterFristLauf(n) {
  boSchreibNoetig(n);
  return aendern((db) => {
    const h = heute();
    let anzahl = 0;
    for (const [pid, akte] of Object.entries(db.anbieter?.akten || {})) {
      for (const pp of akte.pruefpunkte || []) {
        if (pp.status !== "offen" || !pp.fristAm || pp.fristAm >= h || pp.erinnertAm === h) continue;
        pp.erinnertAm = h;
        nachricht(db, { bezugArt: "projekt", bezugId: pid, vonId: n.id, vonAdmin: true, text: `Erinnerung: Die Rückfrage „${pp.text.slice(0, 80)}“ ist seit ${datumDe(pp.fristAm)} überfällig.` });
        anzahl++;
      }
    }
    return { erinnert: anzahl };
  });
}
