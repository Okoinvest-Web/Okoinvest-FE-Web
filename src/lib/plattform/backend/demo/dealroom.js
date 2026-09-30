// src/lib/plattform/backend/demo/dealroom.js
//
// Deal-Room im Demo-Backend: Q&A mit Moderation, strukturiertes Bieterverfahren (verdeckte Gebote,
// Runden, Fristen, Zuschlag), Datenraum 2.0 (Ordner, Versionen, Freigabestufen, Zugriffsprotokoll,
// Wasserzeichen-Dateiname), Investor-Pipeline (Kanban, private Notizen/Tags, mehrere Suchprofile,
// Kennzahlen), Anbieter-Cockpit (Trichter, Aufrufe über Zeit, offene Fragen, Bieterstand) und
// Kontaktfreigabe (Umgehungsschutz).
//
// Referenz für die Frappe-Methoden in plattform/api/{qa,bieter,dealroom}.py (docs/API.md, Abschnitt 7).
// Daten liegen unter db.dealroom (eigene Sammlung, beim ersten Zugriff mit Demo-Daten ergänzt) –
// die übrige Demo-Datenbank bleibt unberührt.
//
// Rechte: jede Operation prüft Rolle UND Eigentum selbst:
//   admin    – alles, sieht Klarnamen
//   anbieter – nur eigene Projekte; Investoren nur als Pseudonym (bis Kontaktfreigabe)
//   investor – nur Projekte mit freigegebenem Datenraum (DATENRAUM_STATUS); nie fremde Gebote,
//              nie fremde Fragen (außer freigegebene Antworten „für alle“), Anbieter anonym

import { BOERSE_STATUS, DATENRAUM_STATUS, statusLabel } from "../../prozesse";
import { LAENDER, PROJEKT_TYPEN, SUCHPROFIL_SCHWELLE } from "../../konstanten";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { projektOeffentlich } from "../../oeffentlich";
import { darfLesen } from "../../rechte";
import { matching } from "../../matching";
import { PHASEN } from "@/lib/invest/markt";
import {
  AKTIVE_SPALTEN, DATENRAUM_ORDNER, DATENRAUM_ORDNER_IDS, ERINNERUNG_STUNDEN, FRAGE_STATUS, GEBOT_PFLICHT, NOTIZ_TAGS_MAX,
  PIPELINE_SPALTEN_IDS, QA_FRIST_TAGE, QA_KATEGORIEN, RUNDEN_ARTEN, SUCHPROFILE_MAX, anonymisieren, gebotGesamt, gebotProKwp,
  investorStufe, ordnerVorschlag, pipelineSpalte, pseudonymBuchstabe, qaOeffentlicherStatus, wasserzeichenName,
} from "../../dealroom";
import { intern } from "../demo";
import { aendern, lesen, uploadLesen } from "./speicher";
import { jetzt, neueId, vorTagen } from "./hilfen";
import { datenraumStufeOk, dokumentStufe, tagHeute, verbindlichZugelassen } from "./dealroomRegeln";
import { kycSperre } from "./kycRegeln"; // KYC/KYB: Gebot und Zuschlag nur verifiziert
import { bonitaetSperre } from "./diensteRegeln"; // Dienste: Gebot nur mit gültiger Bonitätsauskunft, wenn Pflicht
import { anbieterZuschlagPruefen } from "./anbieterRegeln"; // Anbieter: kein Zuschlag auf ein vom Verkäufer abgelehntes Gebot (409)

const { nachricht, benachrichtigen, protokoll, systemWechsel, darfDokument, dokumentMeta, nutzerById, kurz, nameVon, aktiveAdmins } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const hatRolle = (n, r) => istAdmin(n) || r.some((x) => n?.rollen?.includes(x));
const MAIL_DEAL = "Im Deal-Room eines Projekts gibt es Neuigkeiten. Details finden Sie im Portal.";
const dealLink = (projektId, tab = "") => `/portal/dealroom/${projektId}${tab ? `?tab=${tab}` : ""}`;

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, fragen: [], verfahren: [], gebote: [], dokMeta: {}, zugriffe: [], notizen: [], suchprofile: {}, freigaben: [] };
}

/** Sammlung sicherstellen; beim ersten Mal Demo-Daten ergänzen (nur Demo-Projekte, alles fiktiv) */
function bereit(db) {
  if (db.dealroom?.v) return db.dealroom;
  db.dealroom = leer();
  try {
    demoErgaenzen(db);
  } catch (e) {
    console.warn("[plattform-demo] Deal-Room-Demodaten nicht ergänzt:", e?.message);
  }
  return db.dealroom;
}

async function lesenBereit() {
  const db = await lesen();
  if (db.dealroom?.v) return db;
  await aendern((d) => void bereit(d));
  return lesen();
}

const aendernBereit = (fn) =>
  aendern((db) => {
    bereit(db);
    return fn(db);
  });

// ================================================================ Rollen & Anonymität

function projektLaden(db, id) {
  const p = db.projekte.find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  return p;
}

const interesseVon = (db, projektId, investorId) => db.interessen.find((i) => i.projektId === projektId && i.investorId === investorId) || null;

/** Rolle im Deal-Room eines Projekts: admin | anbieter | investor – sonst 403/404 */
function rolleIm(db, n, p, { investorFehler = true } = {}) {
  angemeldet(n);
  if (istAdmin(n)) return { rolle: "admin", interesse: null };
  if (p.anbieterId === n.id) return { rolle: "anbieter", interesse: null };
  if (n.rollen?.includes("investor")) {
    const i = interesseVon(db, p.id, n.id);
    if (i && DATENRAUM_STATUS.includes(i.status)) return { rolle: "investor", interesse: i };
    if (!investorFehler) return { rolle: null, interesse: i };
    throw verboten("Der Deal-Room öffnet sich nach Freigabe Ihrer NDA.");
  }
  throw verboten();
}

/** Pseudonyme je Projekt („Investor A“, „Investor B“ …) in der Reihenfolge der NDA-Anfragen – stabil */
function pseudonyme(db, projektId) {
  const liste = db.interessen
    .filter((i) => i.projektId === projektId && (i.nda || i.status !== "gemerkt"))
    .sort((a, b) => String(a.nda?.am || a.erstelltAm).localeCompare(String(b.nda?.am || b.erstelltAm)) || a.id.localeCompare(b.id));
  return new Map(liste.map((i, idx) => [i.id, `Investor ${pseudonymBuchstabe(idx)}`]));
}

const freigabe = (db, projektId, interesseId) => (db.dealroom.freigaben || []).find((f) => f.projektId === projektId && f.interesseId === interesseId) || null;

/** Wie sieht `rolle` den Investor hinter `interesseId`? */
function investorAnzeige(db, rolle, projektId, interesseId, pseudo) {
  const i = db.interessen.find((x) => x.id === interesseId);
  const name = pseudo.get(interesseId) || "Investor";
  if (!i) return { pseudonym: name };
  if (rolle === "admin") return { pseudonym: name, investor: kurz(nutzerById(db, i.investorId)), kontaktFrei: !!freigabe(db, projektId, interesseId) };
  if (rolle === "anbieter" && freigabe(db, projektId, interesseId)) {
    const u = nutzerById(db, i.investorId);
    return { pseudonym: name, name: nameVon(db, i.investorId), firma: u?.firma || "", kontaktFrei: true };
  }
  return { pseudonym: name };
}

/** Wie sieht der Investor den Anbieter? */
function anbieterAnzeige(db, p, interesse) {
  if (interesse && freigabe(db, p.id, interesse.id)) {
    const u = nutzerById(db, p.anbieterId);
    return { anonym: false, name: nameVon(db, p.anbieterId), firma: u?.firma || "" };
  }
  return { anonym: true, name: "Anbieter (anonym bis zur Kontaktfreigabe)" };
}

// ================================================================ Deal-Room-Kopf

/** Rahmen-Infos für die Deal-Room-Seite (Rolle, Projekt, Stufe, Kontaktfreigabe) */
export async function dealroomKopf(n, projektId) {
  angemeldet(n);
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle, interesse } = rolleIm(db, n, p);
  if (rolle === "investor" && !BOERSE_STATUS.concat(["verkauft"]).includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
  const out = {
    rolle,
    projekt: rolle === "investor" ? projektOeffentlich(p) : { ...projektOeffentlich(p), anbieterId: p.anbieterId, provisionSatz: p.provisionSatz },
    interesse: interesse ? { id: interesse.id, status: interesse.status } : null,
    stufe: rolle === "investor" ? investorStufe(interesse, { verbindlichZugelassen: verbindlichZugelassen(db, interesse) }) : 2,
    anbieter: rolle === "investor" ? anbieterAnzeige(db, p, interesse) : rolle === "admin" ? kurz(nutzerById(db, p.anbieterId)) : null,
    kontaktFrei: rolle === "investor" ? !!freigabe(db, p.id, interesse.id) : undefined,
  };
  if (rolle === "admin") {
    const pseudo = pseudonyme(db, p.id);
    out.interessenten = db.interessen
      .filter((i) => i.projektId === p.id && DATENRAUM_STATUS.concat(["abgelehnt"]).includes(i.status))
      .map((i) => ({ id: i.id, status: i.status, pseudonym: pseudo.get(i.id) || "Investor", investor: kurz(nutzerById(db, i.investorId)), kontaktFrei: !!freigabe(db, p.id, i.id) }));
  }
  return out;
}

/** Kontaktfreigabe je Interesse (nur Backoffice) – danach sehen sich Anbieter und Investor namentlich */
export async function kontaktFreigabe(n, { projektId, interesseId, an = true } = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const i = db.interessen.find((x) => x.id === v.kennung(interesseId) && x.projektId === p.id);
    if (!i) throw nichtGefunden("Interessent nicht gefunden.");
    const vorhanden = freigabe(db, p.id, i.id);
    if (an && !vorhanden) {
      v.pflicht(DATENRAUM_STATUS.includes(i.status), "Kontakte können erst nach Datenraum-Freigabe freigegeben werden.");
      db.dealroom.freigaben.push({ projektId: p.id, interesseId: i.id, investorId: i.investorId, am: jetzt(), vonId: n.id });
      const inv = nutzerById(db, i.investorId);
      const anb = nutzerById(db, p.anbieterId);
      benachrichtigen(db, inv, { art: "nda", titel: `Kontaktfreigabe: ${p.titel}`, text: "ÖkoInvest hat den direkten Kontakt zum Anbieter freigegeben.", link: dealLink(p.id), objektArt: "interesse", objektId: i.id }, { mailText: MAIL_DEAL });
      benachrichtigen(db, anb, { art: "nachricht", titel: `Kontaktfreigabe: ${p.titel}`, text: "ÖkoInvest hat den Kontakt zu einem Interessenten freigegeben.", link: dealLink(p.id), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
      protokoll(db, n, "kontaktfreigabe", "interesse", i.id, `Kontaktfreigabe Anbieter ↔ Investor für ${p.id}`);
    } else if (!an && vorhanden) {
      db.dealroom.freigaben = db.dealroom.freigaben.filter((f) => f !== vorhanden);
      protokoll(db, n, "kontaktfreigabe", "interesse", i.id, `Kontaktfreigabe zurückgenommen für ${p.id}`);
    }
    return { projektId: p.id, interesseId: i.id, kontaktFrei: !!an };
  });
}

// ================================================================ Q&A

const heutePlusTage = (tage) => new Date(Date.now() + tage * 86400e3).toISOString();

function frageAusgabe(db, f, rolle, n, pseudo) {
  const basis = {
    id: f.id,
    projektId: f.projektId,
    kategorie: f.kategorie,
    kategorieLabel: QA_KATEGORIEN[f.kategorie] || f.kategorie,
    text: f.text,
    erstelltAm: f.erstelltAm,
    antwort: f.status === "veroeffentlicht" || rolle !== "investor" ? f.antwort || "" : "",
    antwortAm: f.status === "veroeffentlicht" || rolle !== "investor" ? f.antwortAm || null : null,
    oeffentlich: !!f.oeffentlich,
  };
  if (rolle === "investor") {
    const eigen = f.investorId === n.id;
    return {
      ...basis,
      eigen,
      status: qaOeffentlicherStatus(f.status),
      statusIntern: eigen ? f.status : undefined,
      von: eigen ? "Sie" : "Anderer Interessent",
      antwortVon: "Anbieter (über ÖkoInvest)",
      ablehnGrund: eigen && f.status === "abgelehnt" ? f.ablehnGrund : undefined,
    };
  }
  const ueberfaellig = f.status === "freigegeben" && f.fristAm && new Date(f.fristAm) < new Date();
  const out = { ...basis, status: f.status, statusLabel: FRAGE_STATUS[f.status]?.label || f.status, fristAm: f.fristAm || null, ueberfaellig, rueckfrage: f.rueckfrage || "", von: investorAnzeige(db, rolle, f.projektId, f.interesseId, pseudo) };
  if (rolle === "admin") {
    out.textOriginal = f.textOriginal || "";
    out.bereinigt = !!f.bereinigt;
    out.antwortOriginal = f.antwortOriginal || "";
    out.oeffentlichVorschlag = !!f.oeffentlichVorschlag;
    out.ablehnGrund = f.ablehnGrund || "";
    out.verlauf = f.verlauf || [];
  }
  return out;
}

/** Fragen zu einem Projekt – je Rolle gefiltert und anonymisiert */
export async function qaListe(n, projektId) {
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle } = rolleIm(db, n, p);
  const pseudo = pseudonyme(db, p.id);
  let liste = db.dealroom.fragen.filter((f) => f.projektId === p.id);
  if (rolle === "anbieter") liste = liste.filter((f) => ["freigegeben", "beantwortet", "veroeffentlicht"].includes(f.status));
  if (rolle === "investor") liste = liste.filter((f) => f.investorId === n.id || (f.status === "veroeffentlicht" && f.oeffentlich));
  const reihenfolge = { eingereicht: 0, beantwortet: 1, freigegeben: 2, veroeffentlicht: 3, abgelehnt: 4 };
  liste.sort((a, b) => (reihenfolge[a.status] ?? 9) - (reihenfolge[b.status] ?? 9) || String(b.erstelltAm).localeCompare(String(a.erstelltAm)));
  const fragen = liste.map((f) => frageAusgabe(db, f, rolle, n, pseudo));
  return {
    rolle,
    fragen,
    zaehler: {
      gesamt: fragen.length,
      offen: fragen.filter((f) => (rolle === "investor" ? f.status === "offen" : ["eingereicht", "freigegeben", "beantwortet"].includes(f.status))).length,
      ueberfaellig: fragen.filter((f) => f.ueberfaellig).length,
      moderation: rolle === "admin" ? fragen.filter((f) => ["eingereicht", "beantwortet"].includes(f.status)).length : undefined,
    },
  };
}

/** Investor stellt eine Frage (Datenraum frei). Kontaktangaben werden automatisch entfernt. */
export async function qaFrageStellen(n, { projektId, kategorie, text } = {}) {
  angemeldet(n);
  if (!hatRolle(n, ["investor"]) || istAdmin(n)) throw verboten("Fragen stellen Investoren mit freigegebenem Datenraum.");
  const roh = v.mehrzeilig(text, 3000);
  v.pflicht(roh.length >= 10, "Bitte formulieren Sie Ihre Frage (mind. 10 Zeichen).");
  const kat = v.auswahl(kategorie, QA_KATEGORIEN, "");
  v.pflicht(kat, "Bitte wählen Sie eine Kategorie.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const { rolle, interesse } = rolleIm(db, n, p);
    if (rolle !== "investor") throw verboten("Fragen stellen Investoren mit freigegebenem Datenraum.");
    if (!BOERSE_STATUS.includes(p.status)) throw konflikt("Für dieses Projekt sind keine Fragen mehr möglich.");
    const offen = db.dealroom.fragen.filter((f) => f.investorId === n.id && f.projektId === p.id && ["eingereicht", "freigegeben", "beantwortet"].includes(f.status)).length;
    if (offen >= 25) throw konflikt("Sie haben bereits 25 offene Fragen zu diesem Projekt.");
    const a = anonymisieren(roh);
    const f = {
      id: neueId("FR"),
      projektId: p.id,
      interesseId: interesse.id,
      investorId: n.id,
      kategorie: kat,
      text: a.text,
      textOriginal: a.bereinigt ? roh : "",
      bereinigt: a.bereinigt,
      status: "eingereicht",
      antwort: "",
      antwortOriginal: "",
      oeffentlich: false,
      oeffentlichVorschlag: false,
      fristAm: null,
      erstelltAm: jetzt(),
      verlauf: [{ status: "eingereicht", am: jetzt(), vonId: n.id, kommentar: a.bereinigt ? "Kontaktangaben automatisch entfernt." : "" }],
    };
    db.dealroom.fragen.push(f);
    for (const adm of aktiveAdmins(db)) {
      benachrichtigen(db, adm, { art: "nachricht", titel: `Neue Frage zur Moderation: ${p.titel}`, text: `${QA_KATEGORIEN[kat]} · ${a.text.slice(0, 140)}`, link: dealLink(p.id, "qa"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
    }
    protokoll(db, n, "qa_frage", "projekt", p.id, `Frage gestellt (${QA_KATEGORIEN[kat]})${a.bereinigt ? ", Kontaktangaben entfernt" : ""}`);
    return frageAusgabe(db, f, "investor", n, pseudonyme(db, p.id));
  });
}

/**
 * Aktionen an einer Frage.
 *   Anbieter (bzw. Backoffice): antworten {antwort, oeffentlich?}
 *   Backoffice: freigeben {text?, fristTage?} · ablehnen {grund} · antwortFreigeben {antwort?, oeffentlich} ·
 *               zurueckgeben {kommentar} (Antwort an den Anbieter zurück) · frist {fristTage}
 */
export async function qaAktion(n, id, daten = {}) {
  angemeldet(n);
  const aktion = v.auswahl(daten.aktion, ["antworten", "freigeben", "ablehnen", "antwortFreigeben", "zurueckgeben", "frist"], "");
  v.pflicht(aktion, "Unbekannte Aktion.");
  return aendernBereit((db) => {
    const f = db.dealroom.fragen.find((x) => x.id === v.kennung(id));
    if (!f) throw nichtGefunden("Frage nicht gefunden.");
    const p = projektLaden(db, f.projektId);
    const { rolle } = rolleIm(db, n, p, { investorFehler: true });
    const admin = rolle === "admin";
    if (aktion !== "antworten" && !admin) throw verboten("Nur für das Backoffice.");
    if (aktion === "antworten" && !["admin", "anbieter"].includes(rolle)) throw verboten("Antworten gibt der Anbieter des Projekts.");
    const investor = nutzerById(db, f.investorId);
    const anbieter = nutzerById(db, p.anbieterId);
    const schritt = (status, kommentar = "") => {
      f.status = status;
      f.verlauf = f.verlauf || [];
      f.verlauf.push({ status, am: jetzt(), vonId: n.id, kommentar: v.mehrzeilig(kommentar, 500) });
    };
    const fristTage = v.zahl(daten.fristTage, { min: QA_FRIST_TAGE.min, max: QA_FRIST_TAGE.max }) ?? QA_FRIST_TAGE.standard;

    if (aktion === "freigeben") {
      if (f.status !== "eingereicht") throw konflikt("Die Frage wurde bereits moderiert.");
      if (daten.text !== undefined) {
        const t = v.mehrzeilig(daten.text, 3000);
        v.pflicht(t.length >= 10, "Der Fragetext ist zu kurz.");
        f.text = anonymisieren(t).text;
      }
      f.fristAm = heutePlusTage(fristTage);
      f.freigegebenAm = jetzt();
      schritt("freigegeben", `Anonymisiert an den Anbieter weitergegeben, Antwortfrist ${fristTage} Tage.`);
      benachrichtigen(db, anbieter, { art: "nachricht", titel: `Neue Frage eines Interessenten: ${p.titel}`, text: `${QA_KATEGORIEN[f.kategorie]} · Antwort bis ${new Date(f.fristAm).toLocaleDateString("de-DE", { timeZone: "Europe/Vienna" })}`, link: dealLink(p.id, "qa"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
    } else if (aktion === "ablehnen") {
      if (!["eingereicht", "freigegeben", "beantwortet"].includes(f.status)) throw konflikt("Die Frage ist bereits abgeschlossen.");
      const grund = v.mehrzeilig(daten.grund, 500);
      v.pflicht(grund.length >= 3, "Bitte geben Sie eine Begründung an.");
      f.ablehnGrund = grund;
      schritt("abgelehnt", grund);
      benachrichtigen(db, investor, { art: "nda", titel: `Frage nicht zugelassen: ${p.titel}`, text: grund, link: dealLink(p.id, "qa"), objektArt: "interesse", objektId: f.interesseId }, { mailText: MAIL_DEAL });
    } else if (aktion === "antworten") {
      if (!["freigegeben", "beantwortet"].includes(f.status)) throw konflikt(f.status === "eingereicht" ? "Die Frage ist noch in der Moderation." : "Die Frage ist bereits abgeschlossen.");
      const roh = v.mehrzeilig(daten.antwort, 5000);
      v.pflicht(roh.length >= 5, "Bitte geben Sie eine Antwort ein (mind. 5 Zeichen).");
      const a = anonymisieren(roh);
      f.antwort = a.text;
      f.antwortOriginal = a.bereinigt ? roh : "";
      f.antwortAm = jetzt();
      f.antwortVon = n.id;
      f.oeffentlichVorschlag = v.wahr(daten.oeffentlich);
      f.rueckfrage = "";
      schritt("beantwortet", a.bereinigt ? "Kontaktangaben automatisch entfernt." : "");
      if (!admin) {
        for (const adm of aktiveAdmins(db)) {
          benachrichtigen(db, adm, { art: "nachricht", titel: `Antwort zur Freigabe: ${p.titel}`, text: `${QA_KATEGORIEN[f.kategorie]} · ${a.text.slice(0, 140)}`, link: dealLink(p.id, "qa"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
        }
      }
    } else if (aktion === "antwortFreigeben") {
      if (f.status !== "beantwortet") throw konflikt("Es liegt keine Antwort zur Freigabe vor.");
      if (daten.antwort !== undefined) {
        const t = v.mehrzeilig(daten.antwort, 5000);
        v.pflicht(t.length >= 5, "Die Antwort ist zu kurz.");
        f.antwort = anonymisieren(t).text;
      }
      f.oeffentlich = daten.oeffentlich === undefined ? !!f.oeffentlichVorschlag : v.wahr(daten.oeffentlich);
      f.veroeffentlichtAm = jetzt();
      schritt("veroeffentlicht", f.oeffentlich ? "Antwort für alle Interessenten mit NDA sichtbar." : "Antwort nur für den Fragenden sichtbar.");
      benachrichtigen(db, investor, { art: "nda", titel: `Antwort auf Ihre Frage: ${p.titel}`, text: `${QA_KATEGORIEN[f.kategorie]} · beantwortet`, link: dealLink(p.id, "qa"), objektArt: "interesse", objektId: f.interesseId }, { mailText: MAIL_DEAL });
      if (f.oeffentlich) {
        for (const i of db.interessen.filter((x) => x.projektId === p.id && x.investorId !== f.investorId && DATENRAUM_STATUS.includes(x.status))) {
          benachrichtigen(db, nutzerById(db, i.investorId), { art: "nda", titel: `Neue Antwort im Q&A: ${p.titel}`, text: `${QA_KATEGORIEN[f.kategorie]} · für alle Interessenten freigegeben`, link: dealLink(p.id, "qa"), objektArt: "interesse", objektId: i.id }, { mail: false });
        }
      }
    } else if (aktion === "zurueckgeben") {
      if (f.status !== "beantwortet") throw konflikt("Es liegt keine Antwort vor.");
      const kommentar = v.mehrzeilig(daten.kommentar, 500);
      v.pflicht(kommentar.length >= 3, "Bitte begründen Sie die Rückgabe.");
      f.rueckfrage = kommentar;
      f.fristAm = heutePlusTage(fristTage);
      schritt("freigegeben", `Antwort zurückgegeben: ${kommentar}`);
      benachrichtigen(db, anbieter, { art: "nachricht", titel: `Rückfrage zu Ihrer Antwort: ${p.titel}`, text: kommentar.slice(0, 200), link: dealLink(p.id, "qa"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
    } else if (aktion === "frist") {
      if (f.status !== "freigegeben") throw konflikt("Eine Frist gibt es nur für offene Fragen beim Anbieter.");
      f.fristAm = heutePlusTage(fristTage);
      schritt("freigegeben", `Antwortfrist neu: ${fristTage} Tage.`);
    }
    protokoll(db, n, "qa", "projekt", p.id, `Frage ${f.id}: ${aktion}`);
    return frageAusgabe(db, f, rolle, n, pseudonyme(db, p.id));
  });
}

// ================================================================ Bieterverfahren

const aktivesVerfahren = (db, projektId) => db.dealroom.verfahren.find((x) => x.projektId === projektId && ["laufend", "auswertung", "zuschlag"].includes(x.status)) || null;
const aktuelleRunde = (vf) => vf.runden[vf.runden.length - 1];
const rundeOffen = (r) => !!r && !r.beendetAm && new Date(r.frist).getTime() > Date.now();

/** Effektiver Status (Fristablauf wird beim Lesen erkannt) */
function verfahrenStatus(db, vf) {
  const p = db.projekte.find((x) => x.id === vf.projektId);
  if (vf.status === "zuschlag" && p?.status === "verkauft") return "abgeschlossen";
  if (vf.status === "laufend" && !rundeOffen(aktuelleRunde(vf))) return "auswertung";
  return vf.status;
}

function fristPruefen(wert) {
  const s = v.text(wert, 40);
  const d = new Date(s);
  v.pflicht(s && !Number.isNaN(d.getTime()), "Bitte geben Sie eine gültige Frist an.");
  v.pflicht(d.getTime() > Date.now() + 5 * 60e3, "Die Frist muss in der Zukunft liegen.");
  v.pflicht(d.getTime() < Date.now() + 180 * 86400e3, "Die Frist darf höchstens 180 Tage in der Zukunft liegen.");
  return d.toISOString();
}

function gebotAusgabe(db, g, rolle, pseudo, p) {
  const basis = {
    id: g.id,
    runde: g.runde,
    rundeArt: g.rundeArt,
    preisModus: g.preisModus,
    preis: g.preis,
    preisProKwp: g.preisProKwp,
    preisGesamt: gebotGesamt(g, p.mwp),
    proKwp: gebotProKwp(g, p.mwp),
    bedingungen: g.bedingungen,
    finanzierung: g.finanzierung,
    finanzierungDokumentId: g.finanzierungDokumentId || null,
    zeitplan: g.zeitplan,
    gueltigBis: g.gueltigBis || "",
    status: g.status,
    am: g.am,
    version: g.version,
  };
  if (rolle === "investor") return basis;
  return { ...basis, interesseId: rolle === "admin" ? g.interesseId : undefined, von: investorAnzeige(db, rolle, g.projektId, g.interesseId, pseudo), historie: rolle === "admin" ? g.historie || [] : undefined };
}

function verfahrenAusgabe(db, vf, rolle, n, p) {
  const r = aktuelleRunde(vf);
  const status = verfahrenStatus(db, vf);
  const out = {
    id: vf.id,
    projektId: vf.projektId,
    status,
    pflicht: vf.pflicht,
    hinweis: vf.hinweis || "",
    erstelltAm: vf.erstelltAm,
    runde: { nr: r.nr, art: r.art, label: RUNDEN_ARTEN[r.art]?.label, start: r.start, frist: r.frist, offen: rundeOffen(r), beendetAm: r.beendetAm || null },
    runden: vf.runden.map((x) => ({ nr: x.nr, art: x.art, label: RUNDEN_ARTEN[x.art]?.label, start: x.start, frist: x.frist, beendetAm: x.beendetAm || null, teilnehmerAnzahl: rolle === "investor" ? undefined : x.teilnehmer.length })),
    anbieterFreigabe: !!vf.anbieterFreigabe,
    zuschlag: null,
  };
  const pseudo = pseudonyme(db, p.id);
  const gebote = db.dealroom.gebote.filter((g) => g.verfahrenId === vf.id && g.status !== "zurueckgezogen");
  if (rolle === "investor") {
    const i = interesseVon(db, p.id, n.id);
    out.zugelassen = !!i && r.teilnehmer.includes(i.id) && ["laufend"].includes(status);
    out.eigeneGebote = db.dealroom.gebote.filter((g) => g.verfahrenId === vf.id && g.investorId === n.id).sort((a, b) => b.am.localeCompare(a.am)).map((g) => gebotAusgabe(db, g, rolle, pseudo, p));
    out.zuschlagEigen = vf.zuschlag ? vf.zuschlag.interesseId === i?.id : null;
    return out;
  }
  if (vf.zuschlag) out.zuschlag = { am: vf.zuschlag.am, preisGesamt: vf.zuschlag.preisGesamt, von: investorAnzeige(db, rolle, p.id, vf.zuschlag.interesseId, pseudo), gebotId: rolle === "admin" ? vf.zuschlag.gebotId : undefined, interesseId: rolle === "admin" ? vf.zuschlag.interesseId : undefined };
  const zeigen = rolle === "admin" || vf.anbieterFreigabe;
  out.matrix = zeigen
    ? gebote
        .map((g) => gebotAusgabe(db, g, rolle, pseudo, p))
        .sort((a, b) => b.runde - a.runde || (b.preisGesamt || 0) - (a.preisGesamt || 0))
    : null;
  out.geboteAnzahl = rolle === "admin" || vf.anbieterFreigabe ? gebote.filter((g) => g.runde === r.nr).length : undefined;
  if (rolle === "admin") {
    out.teilnehmer = r.teilnehmer.map((iid) => {
      const g = gebote.find((x) => x.interesseId === iid && x.runde === r.nr);
      return { ...investorAnzeige(db, "admin", p.id, iid, pseudo), interesseId: iid, geboten: !!g, gebotAm: g?.am || null };
    });
    out.erinnertAm = r.erinnertAm || null;
    out.verlauf = vf.verlauf || [];
  }
  return out;
}

function erinnern(db, vf, p, { sofort = false } = {}) {
  const r = aktuelleRunde(vf);
  if (!rundeOffen(r)) return 0;
  const bis = new Date(r.frist).getTime() - Date.now();
  if (!sofort && (r.erinnertAm || bis > ERINNERUNG_STUNDEN * 3600e3)) return 0;
  let anzahl = 0;
  for (const iid of r.teilnehmer) {
    const hat = db.dealroom.gebote.some((g) => g.verfahrenId === vf.id && g.runde === r.nr && g.interesseId === iid && g.status === "abgegeben");
    if (hat) continue;
    const i = db.interessen.find((x) => x.id === iid);
    if (!i) continue;
    benachrichtigen(db, nutzerById(db, i.investorId), { art: "nda", titel: `Erinnerung Angebotsfrist: ${p.titel}`, text: `${RUNDEN_ARTEN[r.art].label} bis ${new Date(r.frist).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}`, link: dealLink(p.id, "bieter"), objektArt: "interesse", objektId: i.id }, { mailText: "Eine Angebotsfrist im Deal-Room eines Projekts läuft bald ab. Details finden Sie im Portal." });
    anzahl++;
  }
  r.erinnertAm = jetzt();
  return anzahl;
}

/** Bieterverfahren eines Projekts (aktuellstes) in der Sicht der Rolle – oder null */
export async function bieterverfahren(n, projektId) {
  let db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle } = rolleIm(db, n, p);
  let vf = [...db.dealroom.verfahren].reverse().find((x) => x.projektId === p.id) || null;
  if (vf && vf.status === "laufend" && !aktuelleRunde(vf).erinnertAm && rundeOffen(aktuelleRunde(vf)) && new Date(aktuelleRunde(vf).frist).getTime() - Date.now() <= ERINNERUNG_STUNDEN * 3600e3) {
    await aendernBereit((d) => {
      const x = d.dealroom.verfahren.find((y) => y.id === vf.id);
      if (x) erinnern(d, x, projektLaden(d, p.id));
    });
    db = await lesen();
    vf = db.dealroom.verfahren.find((x) => x.id === vf.id);
  }
  return { rolle, verfahren: vf ? verfahrenAusgabe(db, vf, rolle, n, projektLaden(db, p.id)) : null, projekt: { id: p.id, mwp: p.mwp, status: p.status, titel: p.titel } };
}

/** Alle Verfahren (Backoffice-Übersicht) */
export async function bieterverfahrenListe(n) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  const db = await lesenBereit();
  return db.dealroom.verfahren
    .slice()
    .sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm))
    .map((vf) => {
      const p = db.projekte.find((x) => x.id === vf.projektId);
      const r = aktuelleRunde(vf);
      const gebote = db.dealroom.gebote.filter((g) => g.verfahrenId === vf.id && g.runde === r.nr && g.status !== "zurueckgezogen");
      const bester = gebote.map((g) => gebotGesamt(g, p?.mwp)).filter(Boolean).sort((a, b) => b - a)[0] || null;
      return { id: vf.id, projektId: vf.projektId, projektTitel: p?.titel || vf.projektId, status: verfahrenStatus(db, vf), runde: { nr: r.nr, art: r.art, frist: r.frist, offen: rundeOffen(r) }, teilnehmer: r.teilnehmer.length, gebote: gebote.length, bester };
    });
}

/** Backoffice startet ein Bieterverfahren */
export async function bieterStarten(n, daten = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  const frist = fristPruefen(daten.frist);
  const art = v.auswahl(daten.art, RUNDEN_ARTEN, "indikativ");
  const pflicht = v.mehrfach(daten.pflicht, GEBOT_PFLICHT);
  return aendernBereit((db) => {
    const p = projektLaden(db, daten.projektId);
    if (p.status !== "veroeffentlicht") throw konflikt("Ein Bieterverfahren ist nur für veröffentlichte (nicht reservierte) Projekte möglich.");
    if (aktivesVerfahren(db, p.id)) throw konflikt("Für dieses Projekt läuft bereits ein Bieterverfahren.");
    const berechtigt = db.interessen.filter((i) => i.projektId === p.id && ["nda_freigegeben", "loi_abgegeben"].includes(i.status));
    let teilnehmer = berechtigt.map((i) => i.id);
    if (Array.isArray(daten.teilnehmer) && daten.teilnehmer.length) teilnehmer = teilnehmer.filter((id) => daten.teilnehmer.includes(id));
    v.pflicht(teilnehmer.length >= 1, "Es gibt noch keine Interessenten mit freigegebenem Datenraum.");
    const vf = {
      id: neueId("BV"),
      projektId: p.id,
      status: "laufend",
      pflicht,
      hinweis: v.mehrzeilig(daten.hinweis, 1500),
      anbieterFreigabe: false,
      zuschlag: null,
      erstelltAm: jetzt(),
      erstelltVon: n.id,
      runden: [{ nr: 1, art, start: jetzt(), frist, teilnehmer, erinnertAm: null, beendetAm: null }],
      verlauf: [{ am: jetzt(), vonId: n.id, text: `Verfahren gestartet: ${RUNDEN_ARTEN[art].label}, ${teilnehmer.length} Teilnehmer` }],
    };
    db.dealroom.verfahren.push(vf);
    for (const iid of teilnehmer) {
      const i = db.interessen.find((x) => x.id === iid);
      benachrichtigen(db, nutzerById(db, i.investorId), { art: "nda", titel: `Bieterverfahren gestartet: ${p.titel}`, text: `${RUNDEN_ARTEN[art].label} bis ${new Date(frist).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}`, link: dealLink(p.id, "bieter"), objektArt: "interesse", objektId: i.id }, { mailText: MAIL_DEAL });
    }
    benachrichtigen(db, nutzerById(db, p.anbieterId), { art: "nachricht", titel: `Bieterverfahren gestartet: ${p.titel}`, text: `${teilnehmer.length} Interessenten eingeladen, ${RUNDEN_ARTEN[art].label}.`, link: dealLink(p.id, "bieter"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
    protokoll(db, n, "bieter", "projekt", p.id, `Bieterverfahren ${vf.id} gestartet (${teilnehmer.length} Teilnehmer)`);
    return verfahrenAusgabe(db, vf, "admin", n, p);
  });
}

/** Backoffice steuert das Verfahren: frist · beenden · naechsteRunde · anbieterFreigabe · erinnern · zuschlag · abbrechen */
export async function bieterAktion(n, id, daten = {}) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  const aktion = v.auswahl(daten.aktion, ["frist", "beenden", "naechsteRunde", "anbieterFreigabe", "erinnern", "zuschlag", "abbrechen"], "");
  v.pflicht(aktion, "Unbekannte Aktion.");
  return aendernBereit((db) => {
    const vf = db.dealroom.verfahren.find((x) => x.id === v.kennung(id));
    if (!vf) throw nichtGefunden("Bieterverfahren nicht gefunden.");
    const p = projektLaden(db, vf.projektId);
    const status = verfahrenStatus(db, vf);
    const r = aktuelleRunde(vf);
    const log = (text) => vf.verlauf.push({ am: jetzt(), vonId: n.id, text });
    const ende = ["zuschlag", "abgeschlossen", "abgebrochen"].includes(status);
    let hinweis = "";

    if (aktion === "frist") {
      if (ende) throw konflikt("Das Verfahren ist beendet.");
      r.frist = fristPruefen(daten.frist);
      r.beendetAm = null;
      r.erinnertAm = null;
      vf.status = "laufend";
      log(`Frist Runde ${r.nr} geändert`);
      for (const iid of r.teilnehmer) {
        const i = db.interessen.find((x) => x.id === iid);
        if (i) benachrichtigen(db, nutzerById(db, i.investorId), { art: "nda", titel: `Neue Angebotsfrist: ${p.titel}`, text: `${RUNDEN_ARTEN[r.art].label} bis ${new Date(r.frist).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}`, link: dealLink(p.id, "bieter"), objektArt: "interesse", objektId: i.id }, { mailText: MAIL_DEAL });
      }
    } else if (aktion === "beenden") {
      if (!rundeOffen(r) || ende) throw konflikt("Die Runde ist bereits beendet.");
      r.beendetAm = jetzt();
      log(`Runde ${r.nr} vorzeitig beendet`);
    } else if (aktion === "naechsteRunde") {
      if (ende) throw konflikt("Das Verfahren ist beendet.");
      if (rundeOffen(r)) throw konflikt("Die laufende Runde ist noch offen – bitte zuerst beenden oder Frist abwarten.");
      const frist = fristPruefen(daten.frist);
      const art = v.auswahl(daten.art, RUNDEN_ARTEN, "verbindlich");
      const erlaubt = new Set(db.interessen.filter((i) => i.projektId === p.id && DATENRAUM_STATUS.includes(i.status) && i.status !== "abgeschlossen").map((i) => i.id));
      const teilnehmer = (Array.isArray(daten.teilnehmer) ? daten.teilnehmer : []).map(v.kennung).filter((x) => x && erlaubt.has(x));
      v.pflicht(teilnehmer.length >= 1, "Bitte wählen Sie mindestens einen Bieter für die nächste Runde (Shortlist).");
      if (!r.beendetAm) r.beendetAm = r.frist;
      vf.runden.push({ nr: r.nr + 1, art, start: jetzt(), frist, teilnehmer: [...new Set(teilnehmer)], erinnertAm: null, beendetAm: null });
      vf.status = "laufend";
      log(`Runde ${r.nr + 1} gestartet: ${RUNDEN_ARTEN[art].label}, Shortlist ${teilnehmer.length}`);
      for (const iid of erlaubt) {
        const i = db.interessen.find((x) => x.id === iid);
        const dabei = teilnehmer.includes(iid);
        const warDabei = r.teilnehmer.includes(iid);
        if (!dabei && !warDabei) continue;
        benachrichtigen(db, nutzerById(db, i.investorId), {
          art: "nda",
          titel: dabei ? `Sie sind in der nächsten Runde: ${p.titel}` : `Bieterverfahren: nächste Runde ohne Ihr Angebot`,
          text: dabei ? `${RUNDEN_ARTEN[art].label} bis ${new Date(frist).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}` : "Ihr Angebot wurde für die nächste Runde nicht berücksichtigt.",
          link: dealLink(p.id, "bieter"),
          objektArt: "interesse",
          objektId: i.id,
        }, { mailText: MAIL_DEAL });
      }
    } else if (aktion === "anbieterFreigabe") {
      vf.anbieterFreigabe = v.wahr(daten.an);
      log(vf.anbieterFreigabe ? "Bieterstand für den Anbieter freigegeben (anonymisiert)" : "Bieterstand für den Anbieter gesperrt");
      if (vf.anbieterFreigabe) benachrichtigen(db, nutzerById(db, p.anbieterId), { art: "nachricht", titel: `Bieterstand freigegeben: ${p.titel}`, text: "Sie können die Angebote (anonymisiert) im Deal-Room vergleichen.", link: dealLink(p.id, "bieter"), objektArt: "projekt", objektId: p.id }, { mailText: MAIL_DEAL });
    } else if (aktion === "erinnern") {
      if (!rundeOffen(r)) throw konflikt("Die Runde ist nicht offen.");
      hinweis = `${erinnern(db, vf, p, { sofort: true })} Erinnerung(en) gesendet.`;
      log(hinweis);
    } else if (aktion === "zuschlag") {
      if (ende) throw konflikt("Das Verfahren ist bereits beendet.");
      if (rundeOffen(r)) throw konflikt("Ein Zuschlag ist erst nach Ablauf bzw. Ende der Runde möglich (Gleichbehandlung).");
      const g = db.dealroom.gebote.find((x) => x.id === v.kennung(daten.gebotId) && x.verfahrenId === vf.id && x.runde === r.nr && x.status === "abgegeben"); // nur Gebote der letzten Runde
      v.pflicht(g, "Bitte wählen Sie ein gültiges Gebot.");
      anbieterZuschlagPruefen(db, g); // Stellungnahme des Verkäufers: Ablehnung sperrt den Zuschlag (409 „votum“)
      const i = db.interessen.find((x) => x.id === g.interesseId);
      v.pflicht(i && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(i.status), "Der Bieter hat keinen gültigen Datenraum-Status mehr.");
      kycSperre(db, "zuschlag", { kontoId: i.investorId, organisationId: i.organisationId || null, text: "Zuschlag nicht möglich: Der Bieter ist noch nicht verifiziert (KYC/KYB)." }); // KYC/KYB
      if (!["veroeffentlicht", "reserviert"].includes(p.status)) throw konflikt("Das Projekt ist nicht mehr in der Börse.");
      const gesamt = gebotGesamt(g, p.mwp);
      for (const x of db.dealroom.gebote.filter((y) => y.verfahrenId === vf.id && y.status === "abgegeben")) x.status = x.id === g.id ? "zuschlag" : "unterlegen";
      vf.status = "zuschlag";
      vf.zuschlag = { gebotId: g.id, interesseId: i.id, am: jetzt(), preisGesamt: gesamt, vonId: n.id };
      const kommentar = v.mehrzeilig(daten.kommentar, 500);
      log(`Zuschlag an ${g.id}${kommentar ? ` – ${kommentar}` : ""}`);
      // Automat gezielt erweitert: Interesse → loi_angenommen (system), Projekt → reserviert (system)
      if (!i.loi) i.loi = { betrag: gesamt, text: `Angebot im Bieterverfahren ${vf.id}, Runde ${g.runde} (${RUNDEN_ARTEN[g.rundeArt]?.label || ""}).`, bedingungen: g.bedingungen || "", gueltigBis: g.gueltigBis || "", am: g.am };
      if (i.status !== "loi_angenommen") systemWechsel(db, "interesse", i, "loi_angenommen", `Zuschlag im Bieterverfahren.${kommentar ? ` ${kommentar}` : ""}`);
      if (p.status === "veroeffentlicht") systemWechsel(db, "projekt", p, "reserviert", "Zuschlag im Bieterverfahren erteilt.");
      for (const x of db.dealroom.gebote.filter((y) => y.verfahrenId === vf.id && y.status === "unterlegen")) {
        if (x.interesseId === i.id) continue;
        const ui = db.interessen.find((y) => y.id === x.interesseId);
        if (ui) benachrichtigen(db, nutzerById(db, ui.investorId), { art: "nda", titel: `Bieterverfahren entschieden: ${p.titel}`, text: "Der Zuschlag ging an einen anderen Bieter. Vielen Dank für Ihr Angebot.", link: dealLink(p.id, "bieter"), objektArt: "interesse", objektId: ui.id }, { mailText: MAIL_DEAL });
      }
      protokoll(db, n, "bieter", "projekt", p.id, `Zuschlag im Bieterverfahren ${vf.id}: ${g.id} (${gesamt ?? "–"} €)`);
    } else if (aktion === "abbrechen") {
      if (ende) throw konflikt("Das Verfahren ist bereits beendet.");
      const grund = v.mehrzeilig(daten.grund, 500);
      v.pflicht(grund.length >= 3, "Bitte geben Sie eine Begründung an.");
      vf.status = "abgebrochen";
      if (!r.beendetAm) r.beendetAm = jetzt();
      for (const x of db.dealroom.gebote.filter((y) => y.verfahrenId === vf.id && y.status === "abgegeben")) x.status = "unterlegen";
      log(`Abgebrochen: ${grund}`);
      for (const iid of new Set(vf.runden.flatMap((x) => x.teilnehmer))) {
        const i = db.interessen.find((x) => x.id === iid);
        if (i) benachrichtigen(db, nutzerById(db, i.investorId), { art: "nda", titel: `Bieterverfahren beendet: ${p.titel}`, text: "Das Verfahren wurde ohne Zuschlag beendet.", link: dealLink(p.id, "bieter"), objektArt: "interesse", objektId: i.id }, { mailText: MAIL_DEAL });
      }
    }
    if (aktion !== "erinnern") protokoll(db, n, "bieter", "projekt", p.id, `Bieterverfahren ${vf.id}: ${aktion}`);
    return { ...verfahrenAusgabe(db, vf, "admin", n, p), hinweis };
  });
}

function textPflicht(wert, pflichtig, label, max = 2000) {
  const a = anonymisieren(v.mehrzeilig(wert, max));
  if (pflichtig) v.pflicht(a.text.length >= 3, `Pflichtangabe fehlt: ${label}`);
  return a.text;
}

/** Investor gibt ein verdecktes Gebot ab (ersetzt ein eigenes Gebot derselben Runde) */
export async function gebotAbgeben(n, daten = {}) {
  angemeldet(n);
  if (!hatRolle(n, ["investor"]) || istAdmin(n)) throw verboten("Gebote geben Investoren ab.");
  return aendernBereit((db) => {
    const vf = db.dealroom.verfahren.find((x) => x.id === v.kennung(daten.verfahrenId));
    if (!vf) throw nichtGefunden("Bieterverfahren nicht gefunden.");
    const p = projektLaden(db, vf.projektId);
    const { rolle, interesse } = rolleIm(db, n, p);
    if (rolle !== "investor") throw verboten();
    const r = aktuelleRunde(vf);
    const status = verfahrenStatus(db, vf);
    if (!r.teilnehmer.includes(interesse.id)) throw verboten("Sie sind für diese Runde nicht zugelassen.");
    kycSperre(db, "gebot", { kontoId: interesse.investorId, organisationId: interesse.organisationId || null }); // KYC/KYB
    bonitaetSperre(db, "gebot", { kontoId: interesse.investorId, organisationId: interesse.organisationId || null }); // Dienste: Bonität vor Gebot
    if (status !== "laufend" || !rundeOffen(r)) throw konflikt("Die Angebotsfrist ist abgelaufen – Gebote sind nicht mehr möglich.");
    const preisModus = v.auswahl(daten.preisModus, ["gesamt", "proKwp"], "gesamt");
    const preis = preisModus === "gesamt" ? v.zahl(daten.preis, { min: 1000, max: 1e11 }) : null;
    const preisProKwp = preisModus === "proKwp" ? v.zahl(daten.preisProKwp, { min: 1, max: 20000, stellen: 2 }) : null;
    v.pflicht(preis || preisProKwp, preisModus === "gesamt" ? "Bitte geben Sie einen Gesamtpreis in Euro an." : "Bitte geben Sie einen Preis je kWp an.");
    const pf = new Set(vf.pflicht || []);
    const verbindlich = r.art === "verbindlich";
    const eintrag = {
      preisModus,
      preis,
      preisProKwp,
      bedingungen: textPflicht(daten.bedingungen, pf.has("bedingungen"), GEBOT_PFLICHT.bedingungen),
      finanzierung: textPflicht(daten.finanzierung, pf.has("finanzierung") || verbindlich, GEBOT_PFLICHT.finanzierung),
      zeitplan: textPflicht(daten.zeitplan, pf.has("zeitplan") || verbindlich, GEBOT_PFLICHT.zeitplan, 1000),
      gueltigBis: /^\d{4}-\d{2}-\d{2}$/.test(String(daten.gueltigBis || "")) ? daten.gueltigBis : "",
      finanzierungDokumentId: null,
    };
    if (daten.finanzierungDokumentId) {
      const d = db.dokumente.find((x) => x.id === v.kennung(daten.finanzierungDokumentId) && x.hochgeladenVon === n.id);
      v.pflicht(d, "Finanzierungsnachweis: Dokument nicht gefunden.");
      eintrag.finanzierungDokumentId = d.id;
    }
    let g = db.dealroom.gebote.find((x) => x.verfahrenId === vf.id && x.runde === r.nr && x.interesseId === interesse.id && x.status === "abgegeben");
    if (g) {
      g.historie = [...(g.historie || []), { am: g.am, preisGesamt: gebotGesamt(g, p.mwp), version: g.version }].slice(-20);
      Object.assign(g, eintrag, { am: jetzt(), version: (g.version || 1) + 1 });
    } else {
      g = { id: neueId("GB"), verfahrenId: vf.id, projektId: p.id, runde: r.nr, rundeArt: r.art, interesseId: interesse.id, investorId: n.id, ...eintrag, status: "abgegeben", am: jetzt(), version: 1, historie: [] };
      db.dealroom.gebote.push(g);
    }
    for (const adm of aktiveAdmins(db)) {
      benachrichtigen(db, adm, { art: "nachricht", titel: `Gebot eingegangen: ${p.titel}`, text: `${RUNDEN_ARTEN[r.art].label} · Runde ${r.nr}${g.version > 1 ? ` · Version ${g.version}` : ""}`, link: dealLink(p.id, "bieter"), objektArt: "projekt", objektId: p.id }, { mail: false });
    }
    protokoll(db, n, "gebot", "interesse", interesse.id, `Gebot ${g.id} (Runde ${r.nr}, Version ${g.version}) abgegeben`);
    return gebotAusgabe(db, g, "investor", null, p);
  });
}

export async function gebotZurueckziehen(n, id) {
  angemeldet(n);
  return aendernBereit((db) => {
    const g = db.dealroom.gebote.find((x) => x.id === v.kennung(id));
    if (!g || g.investorId !== n.id) throw nichtGefunden("Gebot nicht gefunden.");
    const vf = db.dealroom.verfahren.find((x) => x.id === g.verfahrenId);
    const r = aktuelleRunde(vf);
    if (g.status !== "abgegeben" || g.runde !== r.nr || !rundeOffen(r)) throw konflikt("Das Gebot kann nicht mehr zurückgezogen werden.");
    g.status = "zurueckgezogen";
    protokoll(db, n, "gebot", "interesse", g.interesseId, `Gebot ${g.id} zurückgezogen`);
    return { ok: true };
  });
}

// ================================================================ Datenraum 2.0

function metaVon(db, d) {
  const m = db.dealroom.dokMeta[d.id] || {};
  return { ordner: DATENRAUM_ORDNER_IDS.includes(m.ordner) ? m.ordner : ordnerVorschlag(d), stufe: m.stufe === 2 ? 2 : 1, versionVon: m.versionVon || null };
}

/** Datenraum eines Projekts: Ordner nach Standard-Index, Versionen, Freigabestufen */
export async function datenraum(n, projektId, { besuch = false, ip = "" } = {}) {
  let db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle, interesse } = rolleIm(db, n, p);
  if (rolle === "investor" && besuch) {
    const letzte = db.dealroom.zugriffe.findLast?.((z) => z.projektId === p.id && z.nutzerId === n.id && z.art === "datenraum");
    if (!letzte || Date.now() - new Date(letzte.am).getTime() > 30 * 60e3) {
      await aendernBereit((d) => zugriffLoggen(d, { projektId: p.id, nutzerId: n.id, interesseId: interesse.id, art: "datenraum", ip }));
      db = await lesen();
    }
  }
  const stufe = rolle === "investor" ? investorStufe(interesse, { verbindlichZugelassen: verbindlichZugelassen(db, interesse) }) : 2;
  let doks = db.dokumente.filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id);
  if (rolle === "investor") doks = doks.filter((d) => d.kategorie === "datenraum");
  const metas = new Map(doks.map((d) => [d.id, metaVon(db, d)]));
  const nachfolger = new Map();
  for (const d of doks) {
    const vv = metas.get(d.id).versionVon;
    if (vv && metas.has(vv)) nachfolger.set(vv, d.id);
  }
  const aktuelle = doks.filter((d) => !nachfolger.has(d.id));
  const byId = new Map(doks.map((d) => [d.id, d]));
  const eintraege = aktuelle.map((d) => {
    const kette = [];
    let x = d;
    const gesehen = new Set();
    while (x && !gesehen.has(x.id)) {
      gesehen.add(x.id);
      kette.push(x);
      const vv = metas.get(x.id).versionVon;
      x = vv ? byId.get(vv) : null;
    }
    const m = metas.get(d.id);
    const gesperrt = rolle === "investor" && m.stufe > stufe;
    const version = kette.length;
    return {
      id: d.id,
      name: d.name,
      mime: d.mime,
      groesse: d.groesse,
      am: d.am,
      kategorie: d.kategorie,
      checkliste: d.checkliste || "",
      ordner: m.ordner,
      stufe: m.stufe,
      version,
      gesperrt,
      versionen: kette.slice(1).map((k, idx) => ({ id: k.id, name: k.name, am: k.am, groesse: k.groesse, version: version - idx - 1, gesperrt: rolle === "investor" && metas.get(k.id).stufe > stufe })),
      eigenerUpload: d.hochgeladenVon === n.id,
    };
  });
  const ordner = DATENRAUM_ORDNER.map((o) => ({ ...o, dokumente: eintraege.filter((e) => e.ordner === o.id).sort((a, b) => a.name.localeCompare(b.name, "de")) }));
  return { rolle, stufe, ordner, anzahl: eintraege.length, gesperrt: eintraege.filter((e) => e.gesperrt).length, projekt: { id: p.id, titel: p.titel } };
}

/** Anbieter/Backoffice ordnet ein Dokument ein: Ordner, Stufe, Vorversion */
export async function datenraumEinordnen(n, dokumentId, daten = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const d = db.dokumente.find((x) => x.id === v.kennung(dokumentId));
    if (!d || d.bezugArt !== "projekt") throw nichtGefunden("Dokument nicht gefunden.");
    const p = projektLaden(db, d.bezugId);
    const { rolle } = rolleIm(db, n, p);
    if (!["admin", "anbieter"].includes(rolle)) throw verboten();
    const alt = metaVon(db, d);
    const neu = { ...alt };
    if (daten.ordner !== undefined) neu.ordner = v.auswahl(daten.ordner, DATENRAUM_ORDNER_IDS, alt.ordner);
    if (daten.stufe !== undefined) neu.stufe = Number(daten.stufe) === 2 ? 2 : 1;
    if (daten.versionVon !== undefined) {
      const vv = daten.versionVon ? v.kennung(daten.versionVon) : null;
      if (vv) {
        const vor = db.dokumente.find((x) => x.id === vv && x.bezugArt === "projekt" && x.bezugId === p.id);
        v.pflicht(vor && vor.id !== d.id, "Vorversion muss ein anderes Dokument desselben Projekts sein.");
        const belegt = Object.entries(db.dealroom.dokMeta).find(([k, m]) => m.versionVon === vv && k !== d.id);
        if (belegt) throw konflikt("Zu diesem Dokument gibt es bereits eine neuere Version.");
        let x = vv;
        const gesehen = new Set([d.id]);
        while (x) {
          if (gesehen.has(x)) throw konflikt("Versionen dürfen keinen Kreis bilden.");
          gesehen.add(x);
          x = db.dealroom.dokMeta[x]?.versionVon || null;
        }
        if (daten.ordner === undefined) neu.ordner = metaVon(db, vor).ordner;
        if (daten.stufe === undefined) neu.stufe = metaVon(db, vor).stufe;
      }
      neu.versionVon = vv;
    }
    db.dealroom.dokMeta[d.id] = neu;
    protokoll(db, n, "datenraum", "projekt", p.id, `Datenraum: ${d.name} → ${DATENRAUM_ORDNER.find((o) => o.id === neu.ordner)?.label}, Stufe ${neu.stufe}${neu.versionVon ? ", neue Version" : ""}`);
    return { id: d.id, ...neu };
  });
}

function zugriffLoggen(db, { projektId, nutzerId, interesseId, art, dokumentId = null, dokumentName = "", ip = "" }) {
  db.dealroom.zugriffe.push({ id: neueId("ZG"), projektId, nutzerId, interesseId, art, dokumentId, dokumentName: v.text(dokumentName, 160), am: jetzt(), ip: v.text(ip, 64) });
  if (db.dealroom.zugriffe.length > 20000) db.dealroom.zugriffe.splice(0, db.dealroom.zugriffe.length - 20000);
}

/** Datenraum-Dokument öffnen: Rechte inkl. Freigabestufe, Zugriffsprotokoll, Dateiname mit Empfänger + Datum */
export async function datenraumDokument(n, id, { ip = "", anzeigen = false } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const d = db.dokumente.find((x) => x.id === v.kennung(id));
  if (!d || d.bezugArt !== "projekt") throw nichtGefunden("Dokument nicht gefunden.");
  const p = projektLaden(db, d.bezugId);
  const i = interesseVon(db, p.id, n.id);
  const admin = istAdmin(n);
  const anbieter = p.anbieterId === n.id;
  if (!admin && !anbieter) {
    if (!i || !DATENRAUM_STATUS.includes(i.status) || d.kategorie !== "datenraum") throw verboten();
    if (!datenraumStufeOk(db, d, i)) throw verboten(`Dieses Dokument ist für Stufe 2 (nach LOI bzw. Zulassung zur verbindlichen Runde) freigegeben.`);
  }
  if (!darfDokument(db, n, d)) throw verboten();
  const daten = await uploadLesen(d.datei);
  const u = nutzerById(db, n.id);
  const dateiname = wasserzeichenName(d.name, u);
  await aendernBereit((db2) => {
    if (!admin && !anbieter) zugriffLoggen(db2, { projektId: p.id, nutzerId: n.id, interesseId: i?.id || null, art: anzeigen ? "ansehen" : "download", dokumentId: d.id, dokumentName: d.name, ip });
    protokoll(db2, n, "download", "projekt", p.id, `Dokument ${d.name} ${anzeigen ? "angesehen" : "heruntergeladen"} (Datenraum)`, ip);
  });
  return { meta: dokumentMeta(d), daten, dateiname };
}

/** Zugriffsprotokoll je Investor (Anbieter: Pseudonyme bis Kontaktfreigabe) */
export async function datenraumZugriffe(n, projektId, { limit = 300 } = {}) {
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle } = rolleIm(db, n, p);
  if (!["admin", "anbieter"].includes(rolle)) throw verboten("Das Zugriffsprotokoll sehen Anbieter und Backoffice.");
  const pseudo = pseudonyme(db, p.id);
  const investorIds = new Map(db.interessen.filter((i) => i.projektId === p.id).map((i) => [i.investorId, i.id]));
  const eintraege = db.dealroom.zugriffe.filter((z) => z.projektId === p.id && investorIds.has(z.nutzerId)).map((z) => ({ am: z.am, art: z.art, dokumentId: z.dokumentId, dokumentName: z.dokumentName, interesseId: z.interesseId || investorIds.get(z.nutzerId), ip: rolle === "admin" ? z.ip : undefined }));
  // Downloads über die bisherige Dokumentliste (Aktivitätsprotokoll) ergänzen
  for (const a of db.aktivitaeten.filter((x) => x.aktion === "download" && x.objektArt === "projekt" && x.objektId === p.id && investorIds.has(x.nutzerId) && !/\(Datenraum\)$/.test(x.text || ""))) {
    eintraege.push({ am: a.am, art: "download", dokumentId: null, dokumentName: String(a.text || "").replace(/^Dokument\s+/, "").replace(/\s+geöffnet$/, ""), interesseId: investorIds.get(a.nutzerId), ip: rolle === "admin" ? a.ip : undefined });
  }
  eintraege.sort((a, b) => b.am.localeCompare(a.am));
  const proInvestor = new Map();
  for (const e of eintraege) {
    const x = proInvestor.get(e.interesseId) || { interesseId: e.interesseId, zugriffe: 0, besuche: 0, dokumente: new Set(), letzter: e.am, erster: e.am };
    x.zugriffe++;
    if (e.art === "datenraum") x.besuche++;
    else if (e.dokumentName) x.dokumente.add(e.dokumentName);
    if (e.am > x.letzter) x.letzter = e.am;
    if (e.am < x.erster) x.erster = e.am;
    proInvestor.set(e.interesseId, x);
  }
  const anzeige = (iid) => investorAnzeige(db, rolle, p.id, iid, pseudo);
  return {
    rolle,
    investoren: [...proInvestor.values()].map((x) => ({ ...anzeige(x.interesseId), interesseId: rolle === "admin" ? x.interesseId : undefined, zugriffe: x.zugriffe, besuche: x.besuche, dokumente: [...x.dokumente], letzter: x.letzter, erster: x.erster })).sort((a, b) => b.letzter.localeCompare(a.letzter)),
    eintraege: eintraege.slice(0, Math.min(1000, Math.max(1, limit))).map((e) => ({ ...e, von: anzeige(e.interesseId), interesseId: rolle === "admin" ? e.interesseId : undefined })),
  };
}

// ================================================================ Investor-Pipeline

function suchprofilBereinigen(p = {}, idx = 0) {
  const zahl = (x, max) => v.zahl(x, { min: 0, max });
  const schwelle = v.zahl(p.schwelle, { min: SUCHPROFIL_SCHWELLE.min, max: SUCHPROFIL_SCHWELLE.max });
  return {
    id: v.kennung(p.id) || neueId("SP"),
    name: v.text(p.name, 60) || `Suchprofil ${idx + 1}`,
    mwpMin: zahl(p.mwpMin, 5000),
    mwpMax: zahl(p.mwpMax, 5000),
    phasen: v.mehrfach(p.phasen, PHASEN.map((x) => x.id)),
    laender: v.mehrfach(p.laender, LAENDER),
    typen: v.mehrfach(p.typen, PROJEKT_TYPEN),
    ticketMin: zahl(p.ticketMin, 1e11),
    ticketMax: zahl(p.ticketMax, 1e11),
    schwelle: schwelle ?? SUCHPROFIL_SCHWELLE.standard,
  };
}

/** Deal-Pipeline des Investors: alle Interessen als Kanban, Notizen, Kennzahlen, Suchprofile */
export async function pipeline(n) {
  angemeldet(n);
  if (!hatRolle(n, ["investor"])) throw verboten("Die Deal-Pipeline steht Investoren zur Verfügung.");
  const db = await lesenBereit();
  const notizen = new Map(db.dealroom.notizen.filter((x) => x.nutzerId === n.id).map((x) => [x.projektId, x]));
  const karten = [];
  for (const i of db.interessen.filter((x) => x.investorId === n.id)) {
    const p = db.projekte.find((x) => x.id === i.projektId);
    if (!p) continue;
    const eigene = db.dealroom.gebote.filter((g) => g.interesseId === i.id && g.status !== "zurueckgezogen");
    const zuschlag = eigene.some((g) => g.status === "zuschlag");
    const auto = pipelineSpalte(i, { gebotAbgegeben: eigene.length > 0, zuschlag });
    const notiz = notizen.get(p.id);
    const letztes = eigene.sort((a, b) => b.am.localeCompare(a.am))[0];
    if (!i.gemerkt && i.status === "gemerkt" && !notiz) continue;
    karten.push({
      interesseId: i.id,
      status: i.status,
      statusLabel: statusLabel("interesse", i.status),
      spalteAuto: auto,
      spalte: notiz?.spalte && PIPELINE_SPALTEN_IDS.includes(notiz.spalte) ? notiz.spalte : auto,
      manuell: !!(notiz?.spalte && notiz.spalte !== auto),
      projekt: projektOeffentlich(p),
      projektStatus: p.status,
      notiz: notiz ? { text: notiz.text, tags: notiz.tags || [], geaendertAm: notiz.geaendertAm } : null,
      gebote: eigene.length,
      letztesGebot: letztes ? { preisGesamt: gebotGesamt(letztes, p.mwp), runde: letztes.runde, status: letztes.status, am: letztes.am } : null,
      dealroom: DATENRAUM_STATUS.includes(i.status),
      geaendertAm: [i.geaendertAm, notiz?.geaendertAm].filter(Boolean).sort().pop(),
    });
  }
  karten.sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm)));
  const aktiv = karten.filter((k) => AKTIVE_SPALTEN.includes(k.spalteAuto));
  const mitPreis = aktiv.filter((k) => k.projekt.preisModus !== "anfrage" && (k.projekt.preisProKwp || k.projekt.preis) && k.projekt.mwp);
  const kwpSumme = mitPreis.reduce((s, k) => s + k.projekt.mwp * 1000, 0);
  const preisSumme = mitPreis.reduce((s, k) => s + (k.projekt.preisModus === "proKwp" ? k.projekt.preisProKwp * k.projekt.mwp * 1000 : k.projekt.preis), 0);
  const verteilung = (feld) => {
    const o = {};
    for (const k of aktiv) {
      const key = k.projekt[feld] || "–";
      o[key] = o[key] || { anzahl: 0, mwp: 0 };
      o[key].anzahl++;
      o[key].mwp = Math.round((o[key].mwp + (k.projekt.mwp || 0)) * 10) / 10;
    }
    return o;
  };
  const sichtbar = db.projekte.filter((p) => BOERSE_STATUS.includes(p.status));
  const profile = (db.dealroom.suchprofile[n.id] || []).map((sp) => {
    const treffer = sichtbar.map((p) => ({ p, m: matching(p, sp) })).filter((x) => x.m.score >= (sp.schwelle || SUCHPROFIL_SCHWELLE.standard)).sort((a, b) => b.m.score - a.m.score);
    return { ...sp, treffer: treffer.length, beste: treffer.slice(0, 3).map((x) => ({ id: x.p.id, titel: x.p.titel, score: x.m.score })) };
  });
  const tags = [...new Set(karten.flatMap((k) => k.notiz?.tags || []))].sort((a, b) => a.localeCompare(b, "de"));
  return {
    karten,
    tags,
    suchprofile: profile,
    kennzahlen: {
      aktiv: aktiv.length,
      mwpPipeline: Math.round(aktiv.reduce((s, k) => s + (k.projekt.mwp || 0), 0) * 10) / 10,
      preisProKwpMittel: kwpSumme ? Math.round(preisSumme / kwpSumme) : null,
      preisBasis: mitPreis.length,
      gewonnen: karten.filter((k) => k.spalteAuto === "gewonnen").length,
      mwpGewonnen: Math.round(karten.filter((k) => k.spalteAuto === "gewonnen").reduce((s, k) => s + (k.projekt.mwp || 0), 0) * 10) / 10,
      verloren: karten.filter((k) => k.spalteAuto === "verloren").length,
      laender: verteilung("land"),
      phasen: verteilung("phase"),
      typen: verteilung("typ"),
    },
  };
}

/** Private Notiz, Tags und (optional) eigene Spalte je Projekt – nur für den Investor selbst */
export async function notizSpeichern(n, { projektId, text, tags, spalte } = {}) {
  angemeldet(n);
  if (!hatRolle(n, ["investor"])) throw verboten("Notizen stehen Investoren zur Verfügung.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const i = interesseVon(db, p.id, n.id);
    if (!i) throw konflikt("Bitte merken Sie das Projekt zuerst.");
    let x = db.dealroom.notizen.find((z) => z.nutzerId === n.id && z.projektId === p.id);
    if (!x) {
      x = { id: neueId("NZ"), nutzerId: n.id, projektId: p.id, text: "", tags: [], spalte: "", geaendertAm: jetzt() };
      db.dealroom.notizen.push(x);
    }
    if (text !== undefined) x.text = v.mehrzeilig(text, 4000);
    if (tags !== undefined) x.tags = [...new Set(v.textListe(tags, { max: NOTIZ_TAGS_MAX, laenge: 30 }).map((t) => t.replace(/^#/, "")))].filter(Boolean);
    if (spalte !== undefined) x.spalte = v.auswahl(spalte, PIPELINE_SPALTEN_IDS, "");
    x.geaendertAm = jetzt();
    return { projektId: p.id, text: x.text, tags: x.tags, spalte: x.spalte, geaendertAm: x.geaendertAm };
  });
}

/** Gespeicherte Suchprofile (zusätzlich zum Hauptprofil am Konto) – vollständige Liste speichern */
export async function suchprofileSpeichern(n, profile = []) {
  angemeldet(n);
  if (!hatRolle(n, ["investor"])) throw verboten("Suchprofile stehen Investoren zur Verfügung.");
  v.pflicht(Array.isArray(profile), "Ungültige Suchprofile.");
  v.pflicht(profile.length <= SUCHPROFILE_MAX, `Höchstens ${SUCHPROFILE_MAX} Suchprofile.`);
  const liste = profile.map((p, i) => suchprofilBereinigen(p, i));
  return aendernBereit((db) => {
    db.dealroom.suchprofile[n.id] = liste;
    protokoll(db, n, "suchprofile", "nutzer", n.id, `${liste.length} Suchprofile gespeichert`);
    return liste;
  });
}

// ================================================================ Anbieter-Cockpit & Backoffice-Übersicht

/** Cockpit je Projekt: Trichter, Aufrufe über Zeit, offene Fragen, Bieterstand (nach Freigabe) */
export async function dealCockpit(n, projektId, { tage = 60 } = {}) {
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const { rolle } = rolleIm(db, n, p);
  if (!["admin", "anbieter"].includes(rolle)) throw verboten("Das Cockpit sehen Anbieter und Backoffice.");
  const ints = db.interessen.filter((i) => i.projektId === p.id);
  const warIn = (i, st) => i.status === st || (i.statusVerlauf || []).some((e) => e.status === st);
  const bieter = new Set(db.dealroom.gebote.filter((g) => g.projektId === p.id && g.status !== "zurueckgezogen").map((g) => g.interesseId));
  const angebote = ints.filter((i) => i.loi || bieter.has(i.id)).length;
  const trichter = [
    { id: "aufrufe", label: "Aufrufe", wert: p.aufrufe || 0 },
    { id: "merker", label: "Merker", wert: ints.filter((i) => i.gemerkt || i.status !== "gemerkt").length },
    { id: "nda", label: "NDA", wert: ints.filter((i) => i.nda || i.status !== "gemerkt").length },
    { id: "datenraum", label: "Datenraum", wert: ints.filter((i) => warIn(i, "nda_freigegeben")).length },
    { id: "angebote", label: "Angebote", wert: angebote },
  ];
  const verlaufDb = db.aufrufVerlauf?.[p.id] || {};
  const anzahlTage = Math.min(365, Math.max(7, Number(tage) || 60));
  const verlauf = [];
  for (let t = anzahlTage - 1; t >= 0; t--) {
    const tag = tagHeute(new Date(Date.now() - t * 86400e3));
    verlauf.push({ tag, aufrufe: verlaufDb[tag] || 0 });
  }
  const qa = await qaListe(n, p.id);
  const bv = await bieterverfahren(n, p.id);
  const zg = await datenraumZugriffe(n, p.id, { limit: 20 });
  return {
    rolle,
    projekt: { id: p.id, titel: p.titel, status: p.status, veroeffentlichtAm: p.veroeffentlichtAm, mwp: p.mwp },
    trichter,
    verlauf,
    aufrufeZeitraum: verlauf.reduce((s, x) => s + x.aufrufe, 0),
    fragen: { offen: qa.fragen.filter((f) => f.status === "freigegeben"), zaehler: qa.zaehler },
    bieter: bv.verfahren,
    zugriffe: { investoren: zg.investoren.slice(0, 8), letzte: zg.eintraege.slice(0, 8) },
  };
}

/** Backoffice: Moderationsschlange, laufende Verfahren, überfällige Antworten */
export async function dealroomUebersicht(n) {
  angemeldet(n);
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
  if (!darfLesen(n, "interessen")) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „NDA & LOI“ kein Lesen."); // Rechte-Matrix (auch für den direkten Seitenaufruf)
  const db = await lesenBereit();
  const titel = (id) => db.projekte.find((p) => p.id === id)?.titel || id;
  const pseudoCache = new Map();
  const pseudo = (pid) => pseudoCache.get(pid) || pseudoCache.set(pid, pseudonyme(db, pid)).get(pid);
  const fragen = db.dealroom.fragen
    .filter((f) => ["eingereicht", "beantwortet", "freigegeben"].includes(f.status))
    .map((f) => ({ ...frageAusgabe(db, f, "admin", n, pseudo(f.projektId)), projektTitel: titel(f.projektId) }))
    .sort((a, b) => String(a.erstelltAm).localeCompare(String(b.erstelltAm)));
  return {
    moderation: fragen.filter((f) => ["eingereicht", "beantwortet"].includes(f.status)),
    beimAnbieter: fragen.filter((f) => f.status === "freigegeben"),
    verfahren: await bieterverfahrenListe(n),
    kennzahlen: {
      fragenGesamt: db.dealroom.fragen.length,
      moderation: fragen.filter((f) => ["eingereicht", "beantwortet"].includes(f.status)).length,
      ueberfaellig: fragen.filter((f) => f.ueberfaellig).length,
      zugriffe7: db.dealroom.zugriffe.filter((z) => Date.now() - new Date(z.am).getTime() < 7 * 86400e3).length,
      kontaktfreigaben: db.dealroom.freigaben.length,
    },
  };
}

// ================================================================ Demo-Daten (nur einmal, nur Demo-Projekte)

function demoErgaenzen(db) {
  const dr = db.dealroom;
  const finde = (teil) => db.projekte.find((p) => p.demo && p.titel?.includes(teil));
  const p1 = finde("Niederbayern");
  const p4 = finde("Innviertel");
  const investor = db.nutzer.find((u) => u.email === "investor@example.com");
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  if (!p1 || !investor || !admin) return;

  // Datenraum: Ordner/Stufen für vorhandene Unterlagen (Pachtverträge = Stufe 2)
  for (const d of db.dokumente.filter((x) => x.bezugArt === "projekt")) {
    dr.dokMeta[d.id] = { ordner: /pacht/i.test(d.name) ? "vertraege" : ordnerVorschlag(d), stufe: /pacht/i.test(d.name) ? 2 : 1, versionVon: null };
  }

  // Zwei weitere fiktive Investoren für das Bieterverfahren (Präfix deal-)
  const neuerInvestor = (email, vorname, nachname, firma) => {
    let u = db.nutzer.find((x) => x.email === email);
    if (!u) {
      u = { ...investor, id: neueId("U"), email, vorname, nachname, firma, rollen: ["investor"], sitzungVersion: 0, suchprofil: null, letzterLogin: null, erstelltAm: vorTagen(60), mailEinstellungen: null, demo: true };
      db.nutzer.push(u);
    }
    return u;
  };
  const inv2 = neuerInvestor("deal-investor1@example.com", "Bernd", "Bieter (Demo)", "Beispiel Infrastruktur Fonds (fiktiv)");
  const inv3 = neuerInvestor("deal-investor2@example.com", "Svenja", "Solar (Demo)", "Demo Stadtwerke Energie GmbH (fiktiv)");
  const verlauf = (eintraege) => eintraege.map(([status, tage, kommentar = "", vonRolle = "admin"]) => ({ status, am: vorTagen(tage), vonId: vonRolle === "admin" ? admin.id : null, vonRolle, kommentar }));
  const neuesInteresse = (u, tageNda) => {
    let i = db.interessen.find((x) => x.projektId === p1.id && x.investorId === u.id);
    if (!i) {
      i = {
        id: neueId("I"), projektId: p1.id, investorId: u.id, status: "nda_freigegeben", gemerkt: true,
        nda: { version: "2026-09", am: vorTagen(tageNda), ip: "", userAgent: "Demo" }, loi: null, ablehnGrund: "",
        statusVerlauf: verlauf([["gemerkt", tageNda + 1, "", "eigentuemer"], ["nda_angefragt", tageNda, "", "eigentuemer"], ["nda_freigegeben", tageNda - 1, "Datenraum freigeschaltet."]]),
        erstelltAm: vorTagen(tageNda + 1), geaendertAm: vorTagen(tageNda - 1),
      };
      db.interessen.push(i);
    }
    return i;
  };
  const i1 = db.interessen.find((x) => x.projektId === p1.id && x.investorId === investor.id);
  const i2 = neuesInteresse(inv2, 16);
  const i3 = neuesInteresse(inv3, 12);

  // Q&A
  const F = (i, kategorie, text, status, tage, extra = {}) => ({
    id: neueId("FR"), projektId: p1.id, interesseId: i.id, investorId: i.investorId, kategorie, text, textOriginal: "", bereinigt: false, status,
    antwort: "", antwortOriginal: "", oeffentlich: false, oeffentlichVorschlag: false, fristAm: null, erstelltAm: vorTagen(tage),
    verlauf: [{ status: "eingereicht", am: vorTagen(tage), vonId: i.investorId, kommentar: "" }], ...extra,
  });
  if (i1) {
    dr.fragen.push(
      F(i1, "netz", "Ist die Netzanschlusszusage an Bedingungen geknüpft (z. B. Baukostenzuschuss, Fristen für den Anschluss)? (Demo)", "veroeffentlicht", 14, {
        antwort: "Die Zusage gilt 24 Monate, ein Baukostenzuschuss fällt nach aktuellem Stand nicht an. Details im Ordner „Netz“. (Demo)", antwortAm: vorTagen(12), oeffentlich: true, fristAm: vorTagen(8), freigegebenAm: vorTagen(13), veroeffentlichtAm: vorTagen(11),
      }),
      F(i1, "rechtlich", "Sind die Pachtverträge grundbuchlich über beschränkte persönliche Dienstbarkeiten gesichert? (Demo)", "freigegeben", 3, { fristAm: new Date(Date.now() + 2 * 86400e3).toISOString(), freigegebenAm: vorTagen(2) }),
      F(i1, "kaufmaennisch", "Welche Kosten für Ausgleichsmaßnahmen sind im Kaufpreis bereits berücksichtigt? (Demo)", "eingereicht", 0.3)
    );
  }
  dr.fragen.push(
    F(i2, "technisch", "Welche Modulreihenabstände und Tischhöhen sieht das Layout vor? (Demo)", "beantwortet", 5, { antwort: "Reihenabstand ca. 3,5 m, Unterkante 0,8 m, Oberkante 2,6 m. (Demo)", antwortAm: vorTagen(1), oeffentlichVorschlag: true, fristAm: vorTagen(0), freigegebenAm: vorTagen(4) }),
    F(i3, "netz", "Gibt es eine Abschätzung zu Abregelungen (Redispatch) am Verknüpfungspunkt? (Demo)", "freigegeben", 9, { fristAm: vorTagen(1), freigegebenAm: vorTagen(8) })
  );

  // Bieterverfahren: indikative Runde läuft (Frist in 3 Tagen), zwei Gebote verdeckt
  const frist = new Date(Date.now() + 3 * 86400e3 + 5 * 3600e3).toISOString();
  const teilnehmer = [i1?.id, i2.id, i3.id].filter(Boolean);
  const vf = {
    id: neueId("BV"), projektId: p1.id, status: "laufend", pflicht: ["bedingungen", "finanzierung"], hinweis: "Indikative Angebote auf Basis des Datenraums (Stand Stufe 1). Die Shortlist erhält Zugang zu Stufe 2. (Demo)",
    anbieterFreigabe: true, zuschlag: null, erstelltAm: vorTagen(6), erstelltVon: admin.id,
    runden: [{ nr: 1, art: "indikativ", start: vorTagen(6), frist, teilnehmer, erinnertAm: null, beendetAm: null }],
    verlauf: [{ am: vorTagen(6), vonId: admin.id, text: `Verfahren gestartet: Indikative Angebote, ${teilnehmer.length} Teilnehmer` }, { am: vorTagen(5), vonId: admin.id, text: "Bieterstand für den Anbieter freigegeben (anonymisiert)" }],
  };
  dr.verfahren.push(vf);
  const G = (i, preisProKwp, bedingungen, finanzierung, zeitplan, tage) => ({
    id: neueId("GB"), verfahrenId: vf.id, projektId: p1.id, runde: 1, rundeArt: "indikativ", interesseId: i.id, investorId: i.investorId,
    preisModus: "proKwp", preis: null, preisProKwp, bedingungen, finanzierung, zeitplan, gueltigBis: "", finanzierungDokumentId: null, status: "abgegeben", am: vorTagen(tage), version: 1, historie: [],
  });
  const basis = p1.preisProKwp || 100;
  dr.gebote.push(
    G(i2, Math.round(basis * 1.04), "Vorbehaltlich technischer und rechtlicher Due Diligence (Demo)", "Eigenkapital aus Fonds, Zusage Investmentkomitee (Demo)", "Signing in 10 Wochen (Demo)", 2),
    G(i3, Math.round(basis * 0.97), "Vorbehaltlich Netzverträglichkeitsprüfung (Demo)", "Bankfinanzierung 70 %, Term Sheet liegt vor (Demo)", "Signing in 14 Wochen (Demo)", 1)
  );

  // Zugriffe (fiktiv) und Kontaktfreigabe beim reservierten Projekt
  const doks = db.dokumente.filter((d) => d.bezugArt === "projekt" && d.bezugId === p1.id && d.kategorie === "datenraum");
  const Z = (i, art, d, tage) => ({ id: neueId("ZG"), projektId: p1.id, nutzerId: i.investorId, interesseId: i.id, art, dokumentId: d?.id || null, dokumentName: d?.name || "", am: vorTagen(tage), ip: "" });
  for (const [i, tage] of [[i2, 15], [i3, 11], ...(i1 ? [[i1, 18]] : [])]) {
    dr.zugriffe.push(Z(i, "datenraum", null, tage));
    doks.slice(0, 5).forEach((d, k) => dr.zugriffe.push(Z(i, k % 2 ? "download" : "ansehen", d, tage - 0.2 - k * 0.3)));
  }
  const i4 = p4 && db.interessen.find((x) => x.projektId === p4.id && x.investorId === investor.id);
  if (i4) dr.freigaben.push({ projektId: p4.id, interesseId: i4.id, investorId: investor.id, am: vorTagen(5), vonId: admin.id });

  // Pipeline: Notizen und gespeicherte Suchprofile des Demo-Investors
  const notiz = (p, text, tags) => p && dr.notizen.push({ id: neueId("NZ"), nutzerId: investor.id, projektId: p.id, text, tags, spalte: "", geaendertAm: vorTagen(1) });
  notiz(p1, "Netzzusage prüfen lassen, Rückruf Bank zur Finanzierung vereinbart. (Demo)", ["Bayern", "Baurecht", "Prio A"]);
  notiz(finde("Oberschwaben"), "Agri-PV interessant für ESG-Quote, Preis noch offen. (Demo)", ["Agri-PV", "ESG"]);
  dr.suchprofile[investor.id] = [
    { id: neueId("SP"), name: "Baurecht DE/AT ab 5 MWp", mwpMin: 5, mwpMax: 60, phasen: ["satzung", "rtb"], laender: ["DE", "AT"], typen: ["freiflaeche", "agri"], ticketMin: null, ticketMax: null, schwelle: 70 },
    { id: neueId("SP"), name: "Bestand mit Cashflow", mwpMin: 2, mwpMax: 30, phasen: ["cod"], laender: [], typen: [], ticketMin: null, ticketMax: 20000000, schwelle: 70 },
  ];

  // Aufrufverlauf rückwirkend (fiktiv, Summe ≈ Aufrufzähler)
  db.aufrufVerlauf = db.aufrufVerlauf || {};
  for (const p of db.projekte.filter((x) => x.demo && x.veroeffentlichtAm && x.aufrufe)) {
    const start = new Date(p.veroeffentlichtAm).getTime();
    const tage = Math.max(1, Math.min(120, Math.round((Date.now() - start) / 86400e3)));
    const gewichte = Array.from({ length: tage }, (_, t) => (t < 4 ? 3.2 - t * 0.5 : 1) * (0.65 + 0.35 * Math.abs(Math.sin((t + p.aufrufe) * 1.7))) * (new Date(start + t * 86400e3).getDay() % 6 === 0 ? 0.55 : 1));
    const summe = gewichte.reduce((s, x) => s + x, 0);
    const vlf = (db.aufrufVerlauf[p.id] = db.aufrufVerlauf[p.id] || {});
    gewichte.forEach((g, t) => {
      const tag = tagHeute(new Date(start + t * 86400e3));
      if (vlf[tag] === undefined) vlf[tag] = Math.round((g / summe) * p.aufrufe);
    });
  }
}

void dokumentStufe;
