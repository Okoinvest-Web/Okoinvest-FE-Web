// src/lib/plattform/backend/demo.js
//
// Demo-Backend: vollständige Referenz-Implementierung der Plattform-Schnittstelle
// (siehe backend/index.js und docs/API.md) auf einer lokalen JSON-Datei.
// Rechte (Rolle UND Eigentum) und Zustandsautomaten (prozesse.js) werden HIER
// erzwungen – die API-Routen prüfen zusätzlich vorab Anmeldung und Rolle.

import { PROVISION } from "@/lib/invest/markt";
import {
  AUFGABE_BEZUG_ARTEN, AUFGABE_STATUS, BENACHRICHTIGUNG_ARTEN, BENACHRICHTIGUNG_ART_IDS, BEZUG_ARTEN, DOKUMENT_KATEGORIEN, FLAECHE_NUTZUNG,
  LAENDER, NDA, NETZANSCHLUSS, PREIS_MODUS, PROJEKT_TYPEN, ROLLE_FUER_TYP, ROLLEN_IDS, SUCHPROFIL_SCHWELLE, UPLOAD, VORGANG_TYPEN, BUNDESLAENDER,
  mailEinstellungenStandard,
} from "../konstanten";
import { BOERSE_STATUS, DATENRAUM_STATUS, OFFENE_STATUS, PROZESSE, pruefeUebergang, statusLabel } from "../prozesse";
import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../fehler";
import * as v from "../validierung";
import { projektOeffentlich, projektVertraulich } from "../oeffentlich";
import { matching } from "../matching";
import { CHECKLISTE_IDS, checklisteFlaeche, checklisteProjekt } from "../checkliste";
import { PHASEN } from "@/lib/invest/markt";
import { passwortHash, passwortPruefen } from "../server/passwort";
import { aendern, lesen, nachSeedSetzen, seedSetzen, uploadLesen, uploadLoeschen, uploadSchreiben } from "./demo/speicher";
import { demoVorbereitenEinmal } from "./demo/vorbereiten"; // Alle Fachmodul-Seeds (Demo-Konten) nach dem ersten Seed bzw. bei unbekannter Demo-Adresse
import { seedErstellen } from "./demo/seed";
import { jetzt, neueId, sha256, slugify, zufallsToken } from "./demo/hilfen";
import { aufrufVerlaufZaehlen, datenraumStufeOk } from "./demo/dealroomRegeln"; // Deal-Room: Aufrufe je Tag, Freigabestufen
import * as org from "./demo/teams"; // Login, Sicherheit & Teams: Organisationsrechte
import { sicherheitWerkzeugeSetzen } from "./demo/sicherheitWerkzeuge";
import { fehlversuchBuchen, mitZweiFaktor, sitzungNutzer, sperrePruefen } from "./demo/sicherheit"; // Login, Sicherheit & Teams
import { backofficeEreignis, protokollAnhaengen, werkzeugeSetzen } from "./demo/backoffice"; // Backoffice: CRM, Automationen, Hash-Kette
import { kycUebergangPruefen } from "./demo/kycRegeln"; // KYC/KYB: Freigaben nur mit verifiziertem Konto
import { bonitaetUebergangPruefen } from "./demo/diensteRegeln"; // Dienste: Bonitätsauskunft vor LOI (konfigurierbar)
import { anbieterUebergangPruefen, anbieterVorkenntnisAnerkannt } from "./demo/anbieterRegeln"; // Anbieter: Rückfragen, Anonymisierung, Verkäufer-Stellungnahme zur LOI, anerkannte Vorkenntnis
export * from "./demo/crm-ops"; // Backoffice-Operationen (CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte)
import { EIGENTUM_IDS, fachAusAnfrage, flaecheFachDaten, pachtangebotBereinigen } from "../flaecheFach"; // Fachprüfung Flächen: Flurstücke je Land, Fachangaben, Pachtangebot
import { kommuneDaten } from "../kommune"; // Fachprüfung Kommunen: strukturierte Anfrage
import { gebietFuer } from "../akquise"; // Paket C: Routing je Land/Gebiet bei neuer Anfrage
import { NUTZUNG_ALIAS, anfrageLand } from "@/lib/anfrage/laender"; // Paket C: Land aus Kontext, Nutzung aus dem Flächencheck
import { zaehlerSchluessel } from "@/lib/anfrage/zaehler"; // Paket C: Server-Zähler ohne Kennung
import { leadAnlegenDb } from "./demo/leadkette"; // Welle 2, Paket B3: Routing/Score/SLA, getrennte Personendaten, Einwilligungsprotokoll
import { datenblattBereinigen, ddIndex } from "../fach/datenblatt"; // Fachprüfung Kapitalseite: Projektdatenblatt, DD-Index
import { loiBereinigen } from "../fach/loi"; // Fachprüfung Kapitalseite: strukturierte LOI
import { suchprofilErweiterung } from "../fach/suchprofil"; // Fachprüfung Kapitalseite: Suchprofil (Investorentyp, ESG …)
import { fachBereit } from "./demo/fach"; // Fachprüfung Kapitalseite: Demo-Datenblätter einmalig ergänzen

seedSetzen(seedErstellen);
nachSeedSetzen(demoVorbereitenEinmal); // frische Demo-DB: alle Demo-Konten und -Daten sofort anlegen

export const name = "demo";

// ================================================================ Helfer

const SAMMLUNG = { vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen", provision: "provisionen" };

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const hatRolle = (n, rollen) => istAdmin(n) || rollen.some((r) => n?.rollen?.includes(r));

function rolleNoetig(n, rollen, text) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!hatRolle(n, rollen)) throw verboten(text);
}
function adminNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!istAdmin(n)) throw verboten("Nur für das Backoffice.");
}

function ohneGeheimnis(u) {
  if (!u) return null;
  const { passwortHash: _p, ...rest } = u;
  return rest;
}
const kurz = (u) => (u ? { id: u.id, vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma || "" } : null);
const nutzerById = (db, id) => db.nutzer.find((u) => u.id === id) || null;

function objekt(db, art, id) {
  const liste = db[SAMMLUNG[art]];
  if (!liste) throw ungueltig("Unbekannte Objektart");
  return liste.find((o) => o.id === id) || null;
}

/** Besitzer eines Objekts (Nutzer-ID) */
function besitzer(db, art, o) {
  if (!o) return null;
  if (art === "vorgang" || art === "flaeche") return o.nutzerId || null;
  if (art === "projekt") return o.anbieterId;
  if (art === "interesse") return o.investorId;
  if (art === "provision") return o.anbieterId;
  if (art === "nutzer") return o.id;
  return null;
}

function bezugObjekt(db, art, id) {
  if (art === "nutzer") return nutzerById(db, id);
  return objekt(db, art, id);
}

function darfBezug(db, n, art, id, { schreiben = false } = {}) {
  if (!BEZUG_ARTEN.includes(art)) throw ungueltig("Unbekannter Bezug");
  const o = bezugObjekt(db, art, id);
  if (!o) throw nichtGefunden();
  if (istAdmin(n)) return o;
  // Organisation: Mitglieder sehen Objekte ihres Teams, schreiben ab Teamrolle „Mitglied“
  if (besitzer(db, art, o) !== n.id && !(schreiben ? org.darfTeamSchreibenObjekt(db, n, o) : org.darfTeamLesenObjekt(db, n, o))) throw verboten();
  return o;
}

function protokoll(db, n, aktion, objektArt, objektId, text, ip = "") {
  // Hash-Kette (prevHash + hash, Archiv-Anker bei > 5000 Einträgen): backend/demo/kette.js
  protokollAnhaengen(db, { id: neueId("A"), am: jetzt(), nutzerId: n?.id || null, aktion, objektArt, objektId, text: v.text(text, 300), ip: ip || "" });
}

/**
 * Nachricht im Thread (bezugArt, bezugId). Standard: gelesenNutzer = weder Admin noch System,
 * gelesenAdmin = vom Admin. `melden` (true | "ohneMail" | false) erzeugt Benachrichtigungen für
 * die Seite, die die Nachricht noch nicht gelesen hat (Glocke + ggf. E-Mail, siehe benachrichtigen).
 */
function nachricht(db, { bezugArt, bezugId, vonId, vonAdmin = false, system = false, text, gelesenNutzer, gelesenAdmin, ereignis, melden = true }) {
  const m = {
    id: neueId("M"),
    bezugArt,
    bezugId,
    vonId: vonId || null,
    vonAdmin,
    system,
    text: v.mehrzeilig(text, 5000),
    am: jetzt(),
    gelesenNutzer: gelesenNutzer ?? (!vonAdmin && !system),
    gelesenAdmin: gelesenAdmin ?? !!vonAdmin,
  };
  db.nachrichten.push(m);
  if (melden) nachrichtMelden(db, m, { ereignis, mail: melden !== "ohneMail" });
  return m;
}

// ================================================================ Benachrichtigungen & Postausgang

const MAIL_VORLAGEN = {
  status: { betreff: "Neuigkeiten zu Ihrem Vorgang – ÖkoInvest", text: "Der Status eines Ihrer Vorgänge hat sich geändert. Details finden Sie im Portal." },
  nachricht: { betreff: "Neue Nachricht im Portal – ÖkoInvest", text: "Sie haben eine neue Nachricht im Portal von ÖkoInvest erhalten." },
  nda: { betreff: "Neuigkeiten zu Ihrem Projektinteresse – ÖkoInvest", text: "Zu einem Projekt, für das Sie sich interessieren, gibt es Neuigkeiten (z. B. die Freigabe des Datenraums). Details finden Sie im Portal." },
  suchprofil: { betreff: "Neues Projekt passend zu Ihrem Suchprofil – ÖkoInvest", text: "In der Projektbörse wurde ein Projekt veröffentlicht, das zu Ihrem Suchprofil passt." },
  anfrage: { betreff: "Neue Anfrage über die Website – ÖkoInvest", text: "Über die Website ist eine neue Anfrage eingegangen." },
  aufgabe: { betreff: "Aufgabe im Backoffice – ÖkoInvest", text: "Ihnen wurde eine Aufgabe zugewiesen bzw. eine Wiedervorlage ist fällig." },
  energie: { betreff: "Neuigkeiten zu Ihrer Energiebeschaffung – ÖkoInvest", text: "Zu Ihrer Energiebeschaffung bzw. einer Angebotsanfrage gibt es Neuigkeiten. Details finden Sie im Portal." }, // Energiebeschaffung
};
const MAIL_HINWEIS = "Aus Gründen der Vertraulichkeit enthält diese E-Mail keine Inhalte. Bitte melden Sie sich im Portal an.";

/** E-Mail, die Frappe versenden würde, im Demo-Postausgang ablegen (Vorschau im Backoffice) */
function postausgangAnlegen(db, { an, anName = "", nutzerId = null, art, betreff, text, link, linkText = "Zum Portal", hinweis = MAIL_HINWEIS }) {
  db.postausgang = db.postausgang || [];
  const e = { id: neueId("E"), am: jetzt(), an, anName, nutzerId, art, betreff: v.text(betreff, 200), text: v.mehrzeilig(text, 2000), link: link || "/portal", linkText, hinweis };
  db.postausgang.unshift(e);
  if (db.postausgang.length > 500) db.postausgang.length = 500;
  return e;
}

/** Nur interne Portal-Pfade als Ziel einer Benachrichtigung */
const portalLink = (l) => (typeof l === "string" && l.startsWith("/portal") && !l.startsWith("//") ? l.slice(0, 300) : "/portal");

/**
 * Benachrichtigung für ein Konto anlegen und – je nach Einstellung des Kontos – eine E-Mail
 * (ohne vertrauliche Inhalte, nur Hinweis + Link) in den Postausgang legen.
 */
function benachrichtigen(db, u, { art, titel, text, link, objektArt = null, objektId = null }, { mail = true, mailText, mailBetreff } = {}) {
  if (!u || !u.aktiv || !BENACHRICHTIGUNG_ARTEN[art]) return null;
  db.benachrichtigungen = db.benachrichtigungen || [];
  const b = { id: neueId("B"), nutzerId: u.id, art, titel: v.text(titel, 160), text: v.text(text, 300), link: portalLink(link), objektArt, objektId, am: jetzt(), gelesen: false, mail: false };
  db.benachrichtigungen.push(b);
  if (db.benachrichtigungen.length > 5000) {
    const idx = db.benachrichtigungen.findIndex((x) => x.gelesen);
    db.benachrichtigungen.splice(idx >= 0 ? idx : 0, 1);
  }
  const einstellung = { ...mailEinstellungenStandard(), ...(u.mailEinstellungen || {}) };
  // Querschnitt: Tages-Digest – E-Mail wird gesammelt (demo/querschnitt.js → digestLauf), Sicherheit immer sofort
  if (mail && einstellung[art] && u.komfort?.kanaele?.email !== false && u.mailRhythmus === "taeglich" && art !== "sicherheit") b.digest = true;
  else if (mail && einstellung[art] && u.komfort?.kanaele?.email !== false) { // Kanal E-Mail global abschaltbar (Konto-Komfort)
    const vorlage = MAIL_VORLAGEN[art];
    postausgangAnlegen(db, {
      an: u.email,
      anName: [u.vorname, u.nachname].filter(Boolean).join(" "),
      nutzerId: u.id,
      art,
      betreff: mailBetreff || vorlage.betreff,
      text: mailText || vorlage.text,
      link: b.link,
    });
    b.mail = true;
  }
  return b;
}

const aktiveAdmins = (db) => db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin"));

/** Aus einer neuen Nachricht die Benachrichtigungen ableiten (Eigentümer bzw. Backoffice) */
function nachrichtMelden(db, m, { ereignis, mail = true } = {}) {
  const o = bezugObjekt(db, m.bezugArt, m.bezugId);
  if (!o) return;
  const statusText = m.system && m.text.startsWith("Status:");
  const art = ereignis || (statusText ? (m.bezugArt === "interesse" ? "nda" : "status") : "nachricht");
  const kurzText = m.text.replace(/\s+/g, " ").slice(0, 200);
  const eigentuemerId = besitzer(db, m.bezugArt, o);
  if (!m.gelesenNutzer && eigentuemerId && eigentuemerId !== m.vonId) {
    const u = nutzerById(db, eigentuemerId);
    const info = u ? threadInfo(db, m.bezugArt, m.bezugId, { ...u, rollen: u.rollen.filter((r) => r !== "admin") }) : null;
    if (info) benachrichtigen(db, u, { art, titel: info.titel, text: statusText ? kurzText : `${m.vonAdmin ? "ÖkoInvest Backoffice" : nameVon(db, m.vonId) || "System"}: ${kurzText}`, link: info.link, objektArt: m.bezugArt, objektId: m.bezugId }, { mail });
  }
  if (!m.gelesenAdmin) {
    const z = o.zustaendigId ? nutzerById(db, o.zustaendigId) : null;
    const empfaenger = z && z.aktiv && z.rollen.includes("admin") ? [z] : aktiveAdmins(db);
    for (const a of empfaenger) {
      if (a.id === m.vonId || a.id === eigentuemerId) continue;
      const info = threadInfo(db, m.bezugArt, m.bezugId, a);
      if (info) benachrichtigen(db, a, { art: art === "nda" ? "status" : art, titel: info.titel, text: `${nameVon(db, m.vonId) || info.gegenueber || "Nutzer"}: ${kurzText}`, link: info.link, objektArt: m.bezugArt, objektId: m.bezugId }, { mail });
    }
  }
}

function verlaufEintrag(status, n, rolle, kommentar = "") {
  return { status, am: jetzt(), vonId: n?.id || null, vonRolle: rolle, kommentar: v.mehrzeilig(kommentar, 1000) };
}

function linkZuDemo(db, art, email, link) {
  db.demoLinks.unshift({ am: jetzt(), art, email, link });
  db.demoLinks = db.demoLinks.slice(0, 50);
  console.info(`[plattform-demo] ${art === "reset" ? "Passwort-Link" : "Bestätigungs-Link"} für ${email}: ${link}`);
}

function tokenAnlegen(db, art, nutzerId, stunden) {
  const token = zufallsToken();
  db.tokens = db.tokens.filter((t) => !(t.nutzerId === nutzerId && t.art === art && !t.benutzt));
  db.tokens.push({ hash: sha256(token), art, nutzerId, ablauf: new Date(Date.now() + stunden * 3600e3).toISOString(), benutzt: false });
  return token;
}

function tokenEinloesen(db, art, token) {
  const h = sha256(String(token || ""));
  const t = db.tokens.find((x) => x.hash === h && x.art === art);
  if (!t || t.benutzt || new Date(t.ablauf) < new Date()) throw ungueltig("Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.");
  t.benutzt = true;
  const u = nutzerById(db, t.nutzerId);
  if (!u || !u.aktiv) throw ungueltig("Der Link ist ungültig oder abgelaufen.");
  return u;
}

/** Offene Anfragen mit gleicher (bestätigter) E-Mail dem Konto zuordnen */
function verknuepfen(db, u) {
  if (!u?.emailBestaetigt) return 0;
  let anzahl = 0;
  for (const vg of db.vorgaenge) {
    if (vg.nutzerId || vg.email !== u.email) continue;
    vg.nutzerId = u.id;
    anzahl++;
    const rolle = ROLLE_FUER_TYP[vg.typ];
    if (rolle && vg.typ !== "kontakt" && !u.rollen.includes(rolle)) u.rollen.push(rolle);
    if (vg.flaecheId) {
      const f = objekt(db, "flaeche", vg.flaecheId);
      if (f && !f.nutzerId) f.nutzerId = u.id;
    }
  }
  return anzahl;
}

/** Freie Zusatzdaten einer Anfrage bereinigen (flach, begrenzt) */
function datenBereinigen(d, tiefe = 0) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const out = {};
  for (const [k, wert] of Object.entries(d).slice(0, 60)) {
    const key = String(k).replace(/[^\w.-]/g, "").slice(0, 60);
    if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (typeof wert === "string") out[key] = v.mehrzeilig(wert, 2000);
    else if (typeof wert === "number" && Number.isFinite(wert)) out[key] = wert;
    else if (typeof wert === "boolean") out[key] = wert;
    else if (Array.isArray(wert)) out[key] = wert.slice(0, 30).map((x) => (typeof x === "number" || typeof x === "boolean" ? x : v.text(x, 200)));
    else if (wert && typeof wert === "object" && tiefe < 1) out[key] = datenBereinigen(wert, tiefe + 1);
  }
  return out;
}

/** Bezeichnungen geänderter Felder (für das Aktivitätsprotokoll „wer hat was geändert“) */
const FELD_NAMEN_FLAECHE = {
  bezeichnung: "Bezeichnung", land: "Land", bundesland: "Bundesland", plz: "PLZ", ort: "Ort", gemarkung: "Gemarkung", flurstuecke: "Flurstücke",
  ha: "Größe", nutzung: "Nutzung", agri: "Agri-PV", eigentum: "Eigentum", hinweise: "Hinweise",
  fach: "Fachangaben", // Fachprüfung Flächen
};
const FELD_NAMEN_PROJEKT = {
  titel: "Titel", typ: "Typ", land: "Land", bundesland: "Bundesland", region: "Region", mwp: "Leistung", mwhSpeicher: "Speicher", flaecheHa: "Fläche",
  phase: "Phase", netzanschluss: "Netzanschluss", codGeplant: "COD", preisModus: "Preismodus", preis: "Preis", preisProKwp: "Preis je kWp",
  beschreibung: "Beschreibung", highlights: "Highlights", vertraulich: "vertrauliche Angaben",
  datenblatt: "Datenblatt", // Fachprüfung Kapitalseite
};
function geaenderteFelder(alt, neu, namen) {
  return Object.keys(namen).filter((k) => k in neu && JSON.stringify(alt[k] ?? null) !== JSON.stringify(neu[k] ?? null)).map((k) => namen[k]);
}

const nachDatum = (feld = "geaendertAm") => (a, b) => String(b[feld] || "").localeCompare(String(a[feld] || ""));

// ================================================================ Konto

export async function anmelden({ email, passwort, ip = "", userAgent = "", land = "" }) {
  const e = v.email(email);
  let db = await lesen();
  sperrePruefen(db, e); // Kontosperre mit exponentiellem Backoff (backend/demo/sicherheit.js) → 429
  let u = db.nutzer.find((x) => x.email === e);
  if (!u && e.endsWith("@example.com")) {
    // Demo-Konto eines Fachmoduls, dessen Seed noch nicht lief → alle Seeds einmal pro Prozess anstoßen
    await demoVorbereitenEinmal();
    db = await lesen();
    u = db.nutzer.find((x) => x.email === e);
  }
  const ok = await passwortPruefen(String(passwort || ""), u?.passwortHash);
  if (!u || !ok || !u.aktiv) {
    await aendern((db2) => fehlversuchBuchen(db2, { email: e, nutzer: u ? nutzerById(db2, u.id) : null, ip, userAgent, land, grund: ok ? "gesperrt" : "passwort" }));
    return null;
  }
  return aendern((db2) => {
    const x = nutzerById(db2, u.id);
    x.letzterLogin = jetzt();
    verknuepfen(db2, x);
    protokoll(db2, x, "login", "nutzer", x.id, "Anmeldung");
    return mitZweiFaktor(db2, ohneGeheimnis(x)); // + zweiFaktorAktiv (steuert den 2FA-Schritt)
  });
}

/** kontext { sitzungId } (aus dem signierten Cookie): Sitzung muss bestehen – siehe backend/demo/sicherheit.js */
export async function nutzerFuerSitzung(id, kontext = {}) {
  const db = await lesen();
  const u = nutzerById(db, id);
  return u && u.aktiv ? sitzungNutzer(db, ohneGeheimnis(u), kontext) : null;
}

export async function registrieren({ email, passwort, vorname, nachname, firma, telefon, rollen, vorgangId, basisUrl, ip }) {
  const e = v.email(email);
  v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  const pwFehler = v.passwortFehler(passwort);
  v.pflicht(!pwFehler, pwFehler);
  const vn = v.text(vorname, 80);
  const nn = v.text(nachname, 80);
  v.pflicht(vn && nn, "Bitte geben Sie Vor- und Nachnamen an.");
  const r = v.mehrfach(rollen, ROLLEN_IDS);
  v.pflicht(r.length > 0, "Bitte wählen Sie mindestens eine Rolle.");
  const hash = await passwortHash(passwort);

  return aendern((db) => {
    if (db.nutzer.some((u) => u.email === e)) {
      throw konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.");
    }
    const u = {
      id: neueId("U"),
      email: e,
      vorname: vn,
      nachname: nn,
      firma: v.text(firma, 120),
      telefon: v.text(telefon, 40),
      rollen: r,
      passwortHash: hash,
      sitzungVersion: 0,
      aktiv: true,
      emailBestaetigt: false,
      erstelltAm: jetzt(),
      letzterLogin: jetzt(),
      suchprofil: null,
    };
    db.nutzer.push(u);

    // Anfrage aus demselben Ablauf sofort zuordnen (Kennung + E-Mail müssen passen)
    let verknuepft = null;
    const vid = v.kennung(vorgangId);
    if (vid) {
      const vg = objekt(db, "vorgang", vid);
      if (vg && !vg.nutzerId && vg.email === e) {
        vg.nutzerId = u.id;
        verknuepft = vg.id;
        if (vg.flaecheId) {
          const f = objekt(db, "flaeche", vg.flaecheId);
          if (f && !f.nutzerId) f.nutzerId = u.id;
        }
      }
    }
    const token = tokenAnlegen(db, "email", u.id, 72);
    const link = `${basisUrl}/api/auth/email-bestaetigen?token=${token}`;
    linkZuDemo(db, "email", e, link);
    postausgangAnlegen(db, {
      an: e, anName: `${vn} ${nn}`, nutzerId: u.id, art: "bestaetigung", betreff: "Bitte bestätigen Sie Ihre E-Mail-Adresse – ÖkoInvest",
      text: "vielen Dank für Ihre Registrierung im Portal von ÖkoInvest. Bitte bestätigen Sie Ihre E-Mail-Adresse – danach ordnen wir frühere Anfragen mit dieser Adresse automatisch Ihrem Konto zu. Der Link ist 72 Stunden gültig.",
      link, linkText: "E-Mail-Adresse bestätigen", hinweis: "Sie haben sich nicht registriert? Dann ignorieren Sie diese E-Mail bitte.",
    });
    protokoll(db, u, "registrierung", "nutzer", u.id, `Registrierung als ${r.join(", ")}`, ip);
    nachricht(db, {
      bezugArt: "nutzer",
      bezugId: u.id,
      vonAdmin: true,
      system: true,
      text: "Willkommen im Portal von ÖkoInvest. Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben – danach ordnen wir frühere Anfragen mit dieser Adresse automatisch Ihrem Konto zu.",
      melden: "ohneMail",
    });
    return { nutzer: ohneGeheimnis(u), vorgangVerknuepft: verknuepft };
  });
}

export async function emailBestaetigen({ token }) {
  return aendern((db) => {
    const u = tokenEinloesen(db, "email", token);
    u.emailBestaetigt = true;
    const anzahl = verknuepfen(db, u);
    protokoll(db, u, "email", "nutzer", u.id, `E-Mail bestätigt, ${anzahl} Anfrage(n) zugeordnet`);
    return ohneGeheimnis(u);
  });
}

export async function passwortVergessen({ email, basisUrl, ip }) {
  const e = v.email(email);
  if (!e) return { ok: true };
  await aendern((db) => {
    const u = db.nutzer.find((x) => x.email === e && x.aktiv);
    if (!u) return;
    const token = tokenAnlegen(db, "reset", u.id, 1);
    const link = `${basisUrl}/passwort-vergessen?token=${token}`;
    linkZuDemo(db, "reset", e, link);
    postausgangAnlegen(db, {
      an: e, anName: [u.vorname, u.nachname].filter(Boolean).join(" "), nutzerId: u.id, art: "passwort", betreff: "Neues Passwort festlegen – ÖkoInvest",
      text: "Sie haben ein neues Passwort für Ihr Konto im Portal von ÖkoInvest angefordert. Über den folgenden Link legen Sie es fest. Der Link ist eine Stunde gültig und kann nur einmal verwendet werden.",
      link, linkText: "Neues Passwort festlegen", hinweis: "Sie haben kein neues Passwort angefordert? Dann ignorieren Sie diese E-Mail – Ihr bisheriges Passwort bleibt gültig.",
    });
    protokoll(db, u, "passwort_vergessen", "nutzer", u.id, "Passwort-Link angefordert", ip);
  });
  return { ok: true };
}

export async function passwortSetzen({ token, passwort, ip }) {
  const pwFehler = v.passwortFehler(passwort);
  v.pflicht(!pwFehler, pwFehler);
  const hash = await passwortHash(passwort);
  return aendern((db) => {
    const u = tokenEinloesen(db, "reset", token);
    u.passwortHash = hash;
    u.sitzungVersion = (u.sitzungVersion || 0) + 1;
    u.emailBestaetigt = true; // Besitz der Adresse nachgewiesen
    verknuepfen(db, u);
    protokoll(db, u, "passwort_gesetzt", "nutzer", u.id, "Passwort neu gesetzt", ip);
    return ohneGeheimnis(u);
  });
}

export async function passwortAendern(n, { alt, neu }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const pwFehler = v.passwortFehler(neu);
  v.pflicht(!pwFehler, pwFehler);
  const db0 = await lesen();
  const u0 = nutzerById(db0, n.id);
  sperrePruefen(db0, u0?.email);
  if (!(await passwortPruefen(String(alt || ""), u0?.passwortHash))) {
    // Pen-Test-Befund S1 (Paket SECURITY): auch „Passwort ändern“ zählt zur Kontosperre – sonst ließe
    // sich das alte Passwort aus einer gekaperten Sitzung im Takt des IP-Rate-Limits raten.
    await aendern((db) => fehlversuchBuchen(db, { email: u0.email, nutzer: nutzerById(db, u0.id), grund: "passwort" }));
    throw ungueltig("Das bisherige Passwort stimmt nicht.");
  }
  const hash = await passwortHash(neu);
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    u.passwortHash = hash;
    u.sitzungVersion = (u.sitzungVersion || 0) + 1;
    protokoll(db, u, "passwort_geaendert", "nutzer", u.id, "Passwort geändert");
    return ohneGeheimnis(u);
  });
}

export async function profilSpeichern(n, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    const vn = v.text(daten.vorname, 80);
    const nn = v.text(daten.nachname, 80);
    v.pflicht(vn && nn, "Bitte geben Sie Vor- und Nachnamen an.");
    u.vorname = vn;
    u.nachname = nn;
    u.firma = v.text(daten.firma, 120);
    u.telefon = v.text(daten.telefon, 40);
    if (Array.isArray(daten.rollen)) {
      const r = v.mehrfach(daten.rollen, ROLLEN_IDS);
      v.pflicht(r.length > 0, "Bitte wählen Sie mindestens eine Rolle.");
      u.rollen = [...r, ...u.rollen.filter((x) => x === "admin" || x === "gutachter" || x === "lieferant" || x === "bank")]; // nicht selbst wählbar: Backoffice, Gutachter (Projektentwicklung), Lieferant (Energiebeschaffung), Bank (Finanzierung)
    }
    protokoll(db, u, "profil", "nutzer", u.id, "Profil aktualisiert");
    return ohneGeheimnis(u);
  });
}

export async function suchprofilSpeichern(n, p) {
  rolleNoetig(n, ["investor"], "Suchprofile sind für Investoren.");
  const profil = {
    mwpMin: v.zahl(p?.mwpMin, { min: 0, max: 5000 }),
    mwpMax: v.zahl(p?.mwpMax, { min: 0, max: 5000 }),
    phasen: v.mehrfach(p?.phasen, PHASEN.map((x) => x.id)),
    laender: v.mehrfach(p?.laender, LAENDER),
    typen: v.mehrfach(p?.typen, PROJEKT_TYPEN),
    ticketMin: v.zahl(p?.ticketMin, { min: 0, max: 1e10 }),
    ticketMax: v.zahl(p?.ticketMax, { min: 0, max: 1e10 }),
    benachrichtigen: v.wahr(p?.benachrichtigen),
    schwelle: v.zahl(p?.schwelle, { min: SUCHPROFIL_SCHWELLE.min, max: SUCHPROFIL_SCHWELLE.max, stellen: 0 }) ?? SUCHPROFIL_SCHWELLE.standard,
    ...suchprofilErweiterung(p, Object.values(BUNDESLAENDER).flat()), // Fachprüfung Kapitalseite
  };
  if (profil.mwpMin !== null && profil.mwpMax !== null) v.pflicht(profil.mwpMin <= profil.mwpMax, "MWp: Minimum größer als Maximum.");
  if (profil.ticketMin !== null && profil.ticketMax !== null) v.pflicht(profil.ticketMin <= profil.ticketMax, "Ticket: Minimum größer als Maximum.");
  return aendern((db) => {
    if (org.teamSuchprofilSetzen(db, n, profil)) return profil; // aktive Organisation → Team-Suchprofil
    const u = nutzerById(db, n.id);
    u.suchprofil = profil;
    protokoll(db, u, "suchprofil", "nutzer", u.id, "Suchprofil gespeichert");
    return profil;
  });
}

// ================================================================ Anfrage (öffentlich)

/**
 * Team-Postfach je Land (Paket C): Adresse aus ANFRAGE_POSTFACH_DE / _AT / _CH (Umgebung, Hosting).
 * Nicht gesetzt → kein Team-Postfach (dann wie bisher nur Benachrichtigungen im Portal).
 * TODO Inhaber (W0-3): Funktionspostfächer je Land freigeben und in der Umgebung setzen.
 */
function teamPostfach(land) {
  const roh = land ? String(process.env[`ANFRAGE_POSTFACH_${land}`] || "").trim() : "";
  return v.email(roh) || "";
}

/** Server-Zähler ohne Kennung, dauerhaft in der Demo-Datei (Tag × Typ × Land × Kanal; Paket C) */
function anfrageZaehlerBuchen(db, { typ, land, kanal }) {
  const s = zaehlerSchluessel({ ereignis: "angelegt", typ, land, kanal });
  db.anfrageZaehler = db.anfrageZaehler || {};
  const k = `${s.tag}|${s.typ}|${s.land}|${s.kanal}`;
  db.anfrageZaehler[k] = (db.anfrageZaehler[k] || 0) + 1;
  const tage = [...new Set(Object.keys(db.anfrageZaehler).map((x) => x.slice(0, 10)))].sort();
  if (tage.length > 400) for (const x of Object.keys(db.anfrageZaehler)) if (x.slice(0, 10) < tage[tage.length - 400]) delete db.anfrageZaehler[x];
}

export async function anfrageAnlegen({ typ, kontakt, daten, herkunft, ip, einwilligungText, hinweis, einwilligungen, nutzer }) {
  const t = v.auswahl(typ, VORGANG_TYPEN);
  v.pflicht(t, "Unbekannter Anfragetyp.");
  const k = {
    anrede: v.text(kontakt?.anrede, 20),
    vorname: v.text(kontakt?.vorname, 80),
    nachname: v.text(kontakt?.nachname, 80),
    firma: v.text(kontakt?.firma, 120),
    email: v.email(kontakt?.email),
    telefon: v.text(kontakt?.telefon, 40),
    plz: v.plz(kontakt?.plz),
    ort: v.text(kontakt?.ort, 80),
    // Paket C: Land aus dem Formular, sonst aus dem Seitenkontext (daten.land / daten.eingaben.land), sonst eindeutige PLZ
    land: v.auswahl(anfrageLand({ land: kontakt?.land, plz: v.plz(kontakt?.plz) }, daten), LAENDER, ""),
  };
  v.pflicht(k.vorname && k.nachname, "Bitte geben Sie Vor- und Nachnamen an.");
  v.pflicht(k.email, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  let d = datenBereinigen(daten);
  if (t === "kommune") d = { ...d, ...kommuneDaten(daten, k.land, k) }; // Fachprüfung Kommunen: Positivliste + Gemeindeschlüssel
  v.pflicht(JSON.stringify(d).length <= 20000, "Zu viele Zusatzdaten.");
  const h = datenBereinigen(herkunft);
  // Hinweis (lit. b) und optionale Einwilligungen – nur bekannte Felder übernehmen (Texte: src/lib/anfrage/hinweise.js)
  const hw = hinweis && typeof hinweis === "object" ? hinweis : {};
  const optional = (Array.isArray(einwilligungen) ? einwilligungen : [])
    .slice(0, 10)
    .map((e) => ({ id: v.text(e?.id, 40), erteilt: e?.erteilt === true, am: v.text(e?.am, 40), version: v.text(e?.version, 40), sprache: v.auswahl(e?.sprache, ["de", "en"], "de"), textHash: v.text(e?.textHash, 64), ...(e?.doi ? { doi: v.text(e.doi, 20) } : {}) }))
    .filter((e) => e.id && e.erteilt);

  return aendern((db) => {
    const u = nutzer && nutzer.email === k.email && nutzer.emailBestaetigt ? nutzerById(db, nutzer.id) : null;
    // Routing „Team je Land“ (Paket C): zuständig nach Gebiet (Land, Bundesland/Kanton, PLZ); ohne Treffer bleibt der Vorgang offen
    const ein = d.eingaben && typeof d.eingaben === "object" ? d.eingaben : {};
    const laenderListe = BUNDESLAENDER[k.land] || [];
    const bundesland = v.auswahl(d.bundesland, laenderListe, "") || v.auswahl(d.regionName, laenderListe, ""); // Regionsseiten senden regionName
    const gebiet = k.land ? gebietFuer(db.bo?.gebiete || [], { land: k.land, bundesland, plz: k.plz }) : null;
    const vg = {
      id: neueId("V"),
      typ: t,
      status: PROZESSE.vorgang.start,
      statusVerlauf: [verlaufEintrag(PROZESSE.vorgang.start, u, "eigentuemer", "")],
      nutzerId: u?.id || null,
      email: k.email,
      kontakt: k,
      daten: d,
      herkunft: h,
      ip: "", // Welle 2, Paket B3: IP nur gekürzt und getrennt (db.leadPersonen), Löschung nach 30 Tagen
      einwilligung: {
        am: jetzt(),
        ip: "",
        text: v.text(einwilligungText, 400),
        art: "hinweis", // Paket C: Hinweis nach Art. 6 Abs. 1 lit. b statt Pflicht-Einwilligung
        rechtsgrundlage: v.text(hw.rechtsgrundlage, 60),
        version: v.text(hw.version, 40),
        textHash: v.text(hw.textHash, 64),
        optional,
      },
      zustaendigId: null,
      flaecheId: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    // Welle 2, Paket B3: Land (Pflicht, sonst „unbekannt“), Routing Land × Typ × Größe (Desk → Gebiet → ohne
    // Zuständigkeit), Score, SLA-Klasse; Personendaten getrennt; Protokoll nur mit Pseudonym (demo/leadkette.js)
    const lead = leadAnlegenDb(db, {
      vg,
      kontakt: k,
      daten: d,
      ip,
      hinweis: hw,
      einwilligungText,
      optional,
      gebiet: gebiet ? { mitarbeiterId: gebiet.gebiet.mitarbeiterId, name: gebiet.gebiet.name, grund: gebiet.grund } : null,
      rueckruf: d.rueckrufGewuenscht === true,
      kanal: u ? "portal" : "web_formular",
    });
    const { zustaendigId } = lead; // bleibt auch in der Meta (Routing-Ergebnis; spätere Umverteilung = „manuell“)
    vg.zustaendigId = zustaendigId;
    vg.land = lead.land;
    vg.herkunft = { ...vg.herkunft, lead }; // Lead-Meta unter herkunft: dem Anfragenden nicht sichtbar (siehe demo/leadkette.js)
    if (t === "flaeche" || t === "agri") {
      // Paket C: Flächencheck sendet ha/nutzung flach UND unter daten.eingaben – beides lesen
      const haWert = v.zahl(d.ha ?? d.hektar ?? d.flaeche ?? d.flaecheHa ?? ein.flaecheHa, { min: 0, max: 100000, stellen: 2 });
      const nutzungRoh = d.nutzung ?? ein.nutzungId;
      const f = {
        id: neueId("F"),
        nutzerId: u?.id || null,
        vorgangId: vg.id,
        bezeichnung: v.text(d.bezeichnung, 120) || `Fläche ${[k.plz, k.ort].filter(Boolean).join(" ") || "aus Anfrage"}`,
        land: k.land || "DE", // unbekannt (keine PLZ, kein Kontext) → wie bisher DE; der Vorgang behält kontakt.land = ""
        bundesland,
        plz: k.plz,
        ort: k.ort,
        gemarkung: "",
        flurstuecke: [],
        ha: haWert,
        nutzung: d.art === "dach" ? "dach" : v.auswahl(NUTZUNG_ALIAS[nutzungRoh] || nutzungRoh, FLAECHE_NUTZUNG, "acker"), // /dachflaeche-verpachten sendet daten.art = "dach"
        agri: t === "agri",
        eigentum: "eigentum",
        fach: fachAusAnfrage(t, d), // z. B. Dachart/Dachfläche aus /dachflaeche-verpachten
        hinweise: v.mehrzeilig(d.nachricht, 2000),
        status: "entwurf",
        statusVerlauf: [verlaufEintrag("entwurf", u, "system", "Aus Anfrage angelegt")],
        pachtangebot: null,
        ablehnGrund: "",
        zustaendigId,
        erstelltAm: jetzt(),
        geaendertAm: jetzt(),
      };
      db.flaechen.push(f);
      vg.flaecheId = f.id;
    }
    db.vorgaenge.push(vg);
    // Keine Personendaten und keine IP im (unveränderlichen) Aktivitätsprotokoll – Welle 2, Paket B3
    protokoll(db, u, "anfrage", "vorgang", vg.id, `Anfrage ${VORGANG_TYPEN[t]} (${lead.land}) · Score ${lead.score.klasse} · SLA ${lead.slaKlasse}`);
    if (zustaendigId) protokoll(db, null, "zuweisen", "vorgang", vg.id, `Zuständig: ${nameVon(db, zustaendigId)} (${lead.routingGruende[0] || lead.desk.label})`);
    else protokoll(db, null, "zuweisen", "vorgang", vg.id, `Ohne Zuständigkeit (${lead.desk.label})`);
    anfrageZaehlerBuchen(db, { typ: t, land: k.land, kanal: h.kanal });
    backofficeEreignis(db, { typ: "vorgang_neu", art: "vorgang", objekt: vg }); // CRM-Lead + Automationen
    const meldung = { art: "anfrage", titel: `Neue Anfrage: ${VORGANG_TYPEN[t]}${k.land ? ` (${k.land})` : ""}`, text: `${k.vorname} ${k.nachname}${k.firma ? ` · ${k.firma}` : ""} · ${vg.id}`, link: `/portal/admin/vorgaenge/${vg.id}`, objektArt: "vorgang", objektId: vg.id };
    // Alle aktiven Admins wie bisher (keine Anfrage darf unbemerkt bleiben); die Zuständigkeit steht am Vorgang
    for (const a of aktiveAdmins(db)) benachrichtigen(db, a, meldung);
    const postfach = teamPostfach(k.land);
    if (postfach) {
      // Nur Hinweis + Link, keine Personendaten in der Mail (wie benachrichtigen)
      postausgangAnlegen(db, { an: postfach, anName: `Team ${LAENDER[k.land]}`, art: "anfrage", betreff: `Neue Anfrage ${vg.id}: ${VORGANG_TYPEN[t]} (${k.land})`, text: "Über die Website ist eine neue Anfrage eingegangen.", link: `/portal/admin/vorgaenge/${vg.id}`, linkText: "Im Backoffice öffnen" });
    }
    return { id: vg.id, vorgang: { id: vg.id, typ: vg.typ, status: vg.status, flaecheId: vg.flaecheId, land: k.land } };
  });
}

// ================================================================ Vorgänge

function vorgangListenEintrag(db, vg, admin) {
  const z = nutzerById(db, vg.zustaendigId);
  const letzte = vg.statusVerlauf[vg.statusVerlauf.length - 1];
  return {
    id: vg.id,
    typ: vg.typ,
    status: vg.status,
    erstelltAm: vg.erstelltAm,
    geaendertAm: vg.geaendertAm,
    kontakt: { vorname: vg.kontakt.vorname, nachname: vg.kontakt.nachname, firma: vg.kontakt.firma, email: vg.email },
    nutzerId: admin ? vg.nutzerId : undefined,
    zustaendig: z ? kurz(z) : null,
    flaecheId: vg.flaecheId,
    letzterKommentar: letzte?.kommentar || "",
  };
}

export async function vorgaenge(n, { alle = false, status, typ, q } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.vorgaenge : db.vorgaenge.filter((x) => x.nutzerId === n.id);
  if (status) liste = liste.filter((x) => x.status === status);
  if (typ) liste = liste.filter((x) => x.typ === typ);
  if (q) {
    const s = String(q).toLowerCase();
    liste = liste.filter((x) => [x.id, x.email, x.kontakt.vorname, x.kontakt.nachname, x.kontakt.firma].join(" ").toLowerCase().includes(s));
  }
  return liste.sort(nachDatum()).map((x) => vorgangListenEintrag(db, x, alle));
}

export async function vorgang(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const vg = objekt(db, "vorgang", id);
  if (!vg) throw nichtGefunden("Anfrage nicht gefunden.");
  if (!istAdmin(n) && vg.nutzerId !== n.id) throw verboten();
  const out = { ...vg, zustaendig: kurz(nutzerById(db, vg.zustaendigId)) };
  if (istAdmin(n)) out.nutzer = kurz(nutzerById(db, vg.nutzerId));
  else {
    delete out.ip;
    delete out.herkunft;
  }
  return out;
}

// ================================================================ Flächen

function flaecheDaten(daten, basis = {}) {
  const land = v.auswahl(daten.land, LAENDER, basis.land || "DE");
  // Fachprüfung Flächen: Flurstücke je Land mit Formatprüfung (422), strukturierte Fachangaben `fach`
  const { flurstuecke, fach } = flaecheFachDaten(daten, basis, land);
  return {
    bezeichnung: v.text(daten.bezeichnung, 120),
    land,
    bundesland: v.auswahl(daten.bundesland, BUNDESLAENDER[land], ""),
    plz: v.plzLand(daten.plz, land),
    ort: v.text(daten.ort, 80),
    gemarkung: v.text(daten.gemarkung, 80),
    flurstuecke,
    ha: v.zahl(daten.ha, { min: 0.01, max: 100000, stellen: 2 }),
    nutzung: v.auswahl(daten.nutzung, FLAECHE_NUTZUNG, "acker"),
    agri: v.wahr(daten.agri),
    eigentum: v.auswahl(daten.eigentum, EIGENTUM_IDS, "eigentum"),
    fach,
    hinweise: v.mehrzeilig(daten.hinweise, 3000),
  };
}

function flaecheAusgabe(db, f, n) {
  const doks = db.dokumente.filter((d) => d.bezugArt === "flaeche" && d.bezugId === f.id);
  const out = { ...f, zustaendig: kurz(nutzerById(db, f.zustaendigId)), dokumente: doks.length, checkliste: checklisteFlaeche(f, doks) };
  if (istAdmin(n)) out.eigentuemer = kurz(nutzerById(db, f.nutzerId));
  Object.assign(out, org.zugriffInfo(db, n, f, f.nutzerId)); // organisation, meinZugriff
  return out;
}

export async function flaechen(n, { alle = false, status } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.flaechen : db.flaechen.filter(org.listenFilter(db, n, "nutzerId")); // eigene bzw. der aktiven Organisation
  if (status) liste = liste.filter((f) => f.status === status);
  return liste.sort(nachDatum()).map((f) => flaecheAusgabe(db, f, n));
}

export async function flaeche(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const f = objekt(db, "flaeche", id);
  if (!f) throw nichtGefunden("Fläche nicht gefunden.");
  if (!istAdmin(n) && f.nutzerId !== n.id && !org.darfTeamLesenObjekt(db, n, f)) throw verboten();
  return flaecheAusgabe(db, f, n);
}

export async function flaecheAnlegen(n, daten, { ip } = {}) {
  rolleNoetig(n, ["flaeche", "landwirt"], "Flächen können Flächeneigentümer und Landwirte anlegen.");
  const d = flaecheDaten(daten || {});
  v.pflicht(d.bezeichnung, "Bitte geben Sie eine Bezeichnung an.");
  return aendern((db) => {
    const f = {
      id: neueId("F"),
      nutzerId: n.id,
      organisationId: org.organisationFuerNeu(db, n), // aktive Organisation (Rolle ≥ Mitglied) oder null
      vorgangId: null,
      ...d,
      status: "entwurf",
      statusVerlauf: [verlaufEintrag("entwurf", n, "eigentuemer", "")],
      pachtangebot: null,
      ablehnGrund: "",
      zustaendigId: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    db.flaechen.push(f);
    protokoll(db, n, "anlegen", "flaeche", f.id, `Fläche „${f.bezeichnung}“ angelegt`, ip);
    // Direkt einreichen, wenn vollständig und gewünscht
    if (v.wahr(daten?.einreichen)) {
      const p = pruefeUebergang("flaeche", f, "eingegangen", "eigentuemer", {});
      if (!p.ok) throw new PlattformFehler(p.status, p.fehler);
      uebergangAnwenden(db, n, "flaeche", f, "eingegangen", "eigentuemer", {}, ip);
    }
    return flaecheAusgabe(db, f, n);
  });
}

export async function flaecheAendern(n, id, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const f = objekt(db, "flaeche", id);
    if (!f) throw nichtGefunden("Fläche nicht gefunden.");
    const admin = istAdmin(n);
    if (!admin && f.nutzerId !== n.id && !org.darfTeamSchreibenObjekt(db, n, f)) throw verboten();
    if (!admin && !["entwurf", "eingegangen"].includes(f.status)) throw konflikt("Die Fläche ist bereits in Bearbeitung – Änderungen bitte per Nachricht mitteilen.");
    const d = flaecheDaten(daten || {}, f);
    v.pflicht(d.bezeichnung, "Bitte geben Sie eine Bezeichnung an.");
    const felder = geaenderteFelder(f, d, FELD_NAMEN_FLAECHE);
    Object.assign(f, d, { geaendertAm: jetzt() });
    protokoll(db, n, "aendern", "flaeche", f.id, felder.length ? `Fläche bearbeitet: ${felder.join(", ")}` : "Fläche gespeichert (ohne Änderung)");
    return flaecheAusgabe(db, f, n);
  });
}

// ================================================================ Projekte

function projektDaten(daten, basis = {}) {
  const land = v.auswahl(daten.land, LAENDER, basis.land || "DE");
  const preisModus = v.auswahl(daten.preisModus, PREIS_MODUS, "anfrage");
  const vt = daten.vertraulich && typeof daten.vertraulich === "object" ? daten.vertraulich : {};
  return {
    titel: v.text(daten.titel, 120),
    typ: v.auswahl(daten.typ, PROJEKT_TYPEN, ""),
    land,
    bundesland: v.auswahl(daten.bundesland, BUNDESLAENDER[land], ""),
    region: v.text(daten.region, 80),
    mwp: v.zahl(daten.mwp, { min: 0.05, max: 5000, stellen: 2 }),
    mwhSpeicher: v.zahl(daten.mwhSpeicher, { min: 0, max: 20000, stellen: 1 }),
    flaecheHa: v.zahl(daten.flaecheHa, { min: 0, max: 100000, stellen: 1 }),
    phase: v.auswahl(daten.phase, PHASEN.map((x) => x.id), ""),
    netzanschluss: v.auswahl(daten.netzanschluss, NETZANSCHLUSS, "offen"),
    codGeplant: v.monat(daten.codGeplant),
    preisModus,
    preis: preisModus === "gesamt" ? v.zahl(daten.preis, { min: 0, max: 1e10 }) : null,
    preisProKwp: preisModus === "proKwp" ? v.zahl(daten.preisProKwp, { min: 0, max: 10000 }) : null,
    beschreibung: v.mehrzeilig(daten.beschreibung, 4000),
    highlights: v.textListe(daten.highlights, { max: 6, laenge: 90 }),
    vertraulich: {
      gemeinde: v.text(vt.gemeinde, 120),
      gemarkung: v.text(vt.gemarkung, 120),
      flurstuecke: v.text(vt.flurstuecke, 300),
      netzbetreiber: v.text(vt.netzbetreiber, 120),
      einspeisepunkt: v.text(vt.einspeisepunkt, 160),
      entfernungNetzKm: v.zahl(vt.entfernungNetzKm, { min: 0, max: 500, stellen: 1 }),
      sicherung: v.text(vt.sicherung, 200),
      planungsrecht: v.text(vt.planungsrecht, 200),
      ertragKwhKwp: v.zahl(vt.ertragKwhKwp, { min: 0, max: 3000 }),
      verguetung: v.text(vt.verguetung, 200),
      details: v.mehrzeilig(vt.details, 3000),
    },
    datenblatt: datenblattBereinigen(daten.datenblatt, basis.datenblatt), // Fachprüfung Kapitalseite: Standard-Projektdatenblatt (vertraulich)
  };
}

function projektStatistik(db, p) {
  const ints = db.interessen.filter((i) => i.projektId === p.id);
  return {
    aufrufe: p.aufrufe || 0,
    merker: ints.filter((i) => i.gemerkt).length,
    ndaAnfragen: ints.filter((i) => i.status !== "gemerkt").length,
    lois: ints.filter((i) => ["loi_abgegeben", "loi_angenommen", "abgeschlossen"].includes(i.status)).length,
  };
}

const projektDokumente = (db, p) => db.dokumente.filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id);

function projektAusgabe(db, p, n) {
  const doks = projektDokumente(db, p);
  const out = { ...p, statistik: projektStatistik(db, p), dokumente: doks.length, checkliste: checklisteProjekt(p, doks) };
  out.provision = db.provisionen.find((x) => x.projektId === p.id) || null;
  if (istAdmin(n)) {
    out.anbieter = kurz(nutzerById(db, p.anbieterId));
    out.zustaendig = kurz(nutzerById(db, p.zustaendigId));
  }
  Object.assign(out, org.zugriffInfo(db, n, p, p.anbieterId)); // organisation, meinZugriff
  return out;
}

export async function projekte(n, { alle = false, status } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  else rolleNoetig(n, ["anbieter"], "Nur für Projektanbieter.");
  const db = await lesen();
  let liste = alle ? db.projekte : db.projekte.filter(org.listenFilter(db, n, "anbieterId")); // eigene bzw. der aktiven Organisation
  if (status) liste = liste.filter((p) => p.status === status);
  return liste.sort(nachDatum()).map((p) => projektAusgabe(db, p, n));
}

export async function projekt(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  await fachBereit(); // Fachprüfung Kapitalseite
  const db = await lesen();
  const p = objekt(db, "projekt", id);
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  if (!istAdmin(n) && p.anbieterId !== n.id && !org.darfTeamLesenObjekt(db, n, p)) throw verboten();
  return projektAusgabe(db, p, n);
}

export async function projektAnlegen(n, daten, { ip } = {}) {
  rolleNoetig(n, ["anbieter"], "Projekte können Projektanbieter anlegen.");
  const d = projektDaten(daten || {});
  v.pflicht(d.titel, "Bitte geben Sie einen Projekttitel an.");
  return aendern((db) => {
    const p = {
      id: neueId("P"),
      slug: "",
      anbieterId: n.id,
      organisationId: org.organisationFuerNeu(db, n), // aktive Organisation (Rolle ≥ Mitglied) oder null
      ...d,
      status: "entwurf",
      statusVerlauf: [verlaufEintrag("entwurf", n, "eigentuemer", "")],
      provisionAkzeptiert: null,
      provisionSatz: null,
      ablehnGrund: "",
      aufrufe: 0,
      zustaendigId: null,
      veroeffentlichtAm: null,
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    p.slug = `${slugify(p.titel)}-${p.id.slice(-4).toLowerCase()}`;
    db.projekte.push(p);
    protokoll(db, n, "anlegen", "projekt", p.id, `Projekt „${p.titel}“ angelegt`, ip);
    return projektAusgabe(db, p, n);
  });
}

export async function projektAendern(n, id, daten) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const p = objekt(db, "projekt", id);
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    const admin = istAdmin(n);
    if (!admin && p.anbieterId !== n.id && !org.darfTeamSchreibenObjekt(db, n, p)) throw verboten();
    if (!admin && p.status !== "entwurf") throw konflikt("Nur Entwürfe können bearbeitet werden. Nehmen Sie das Projekt ggf. zuerst von der Börse bzw. ziehen Sie die Einreichung zurück.");
    const d = projektDaten(daten || {}, p);
    v.pflicht(d.titel, "Bitte geben Sie einen Projekttitel an.");
    const felder = geaenderteFelder(p, d, FELD_NAMEN_PROJEKT);
    Object.assign(p, d, { geaendertAm: jetzt() });
    if (!p.veroeffentlichtAm) p.slug = `${slugify(p.titel)}-${p.id.slice(-4).toLowerCase()}`;
    protokoll(db, n, "aendern", "projekt", p.id, felder.length ? `Projekt bearbeitet: ${felder.join(", ")}` : "Projekt gespeichert (ohne Änderung)");
    return projektAusgabe(db, p, n);
  });
}

export async function provisionAkzeptieren(n, id, { ip } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const p = objekt(db, "projekt", id);
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    if (p.anbieterId !== n.id && !org.darfTeamVerwaltenObjekt(db, n, p)) throw verboten("Nur der Anbieter (bzw. Admin/Inhaber der Organisation) kann die Provisionsvereinbarung akzeptieren.");
    p.provisionAkzeptiert = { am: jetzt(), ip: ip || "", version: "2026-09", text: PROVISION.verkaeufer.text };
    p.geaendertAm = jetzt();
    protokoll(db, n, "provision_akzeptiert", "projekt", p.id, "Provisionsvereinbarung akzeptiert", ip);
    return projektAusgabe(db, p, n);
  });
}

// ================================================================ Börse

function boerseEintrag(db, p, n) {
  const o = projektOeffentlich(p);
  o.datenraumQualitaet = checklisteProjekt(p, projektDokumente(db, p)).quote;
  if (n && hatRolle(n, ["investor"])) {
    const i = org.interesseFuer(db, n, p.id); // eigenes bzw. Interesse der aktiven Organisation
    o.meinInteresse = i ? { id: i.id, status: i.status, gemerkt: i.gemerkt } : null;
    const profil = org.suchprofilFuer(db, n); // Konto- bzw. Team-Suchprofil
    if (profil) o.matching = matching(p, profil);
  }
  return o;
}

export async function boerse(n, filter = {}) {
  const db = await lesen();
  let liste = db.projekte.filter((p) => BOERSE_STATUS.includes(p.status));
  const typ = v.auswahl(filter.typ, PROJEKT_TYPEN);
  const land = v.auswahl(filter.land, LAENDER);
  const phase = v.auswahl(filter.phase, PHASEN.map((x) => x.id));
  const mwpMin = v.zahl(filter.mwpMin, { min: 0 });
  const mwpMax = v.zahl(filter.mwpMax, { min: 0 });
  if (typ) liste = liste.filter((p) => p.typ === typ);
  if (land) liste = liste.filter((p) => p.land === land);
  if (phase) liste = liste.filter((p) => p.phase === phase);
  if (mwpMin !== null) liste = liste.filter((p) => p.mwp >= mwpMin);
  if (mwpMax !== null) liste = liste.filter((p) => p.mwp <= mwpMax);
  const eintraege = liste.sort(nachDatum("veroeffentlichtAm")).map((p) => boerseEintrag(db, p, n));
  const alleSichtbar = db.projekte.filter((p) => BOERSE_STATUS.includes(p.status));
  return {
    projekte: eintraege,
    kennzahlen: {
      anzahl: alleSichtbar.length,
      mwp: Math.round(alleSichtbar.reduce((s, p) => s + (p.mwp || 0), 0) * 10) / 10,
      laender: [...new Set(alleSichtbar.map((p) => p.land))].length,
      verkauft: db.projekte.filter((p) => p.status === "verkauft").length,
    },
    demo: true,
  };
}

export async function boerseDetail(n, schluessel, { zaehlen = false } = {}) {
  await fachBereit(); // Fachprüfung Kapitalseite
  const s = String(schluessel || "");
  const finden = (db) => db.projekte.find((p) => p.slug === s || p.id === s);
  let db = await lesen();
  let p = finden(db);
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  const eigentuemer = n && (p.anbieterId === n.id || org.darfTeamLesenObjekt(db, n, p)); // auch Team des Anbieters
  const admin = istAdmin(n);
  if (!BOERSE_STATUS.includes(p.status) && !eigentuemer && !admin) throw nichtGefunden("Projekt nicht gefunden.");

  if (zaehlen && !eigentuemer && !admin) {
    await aendern((d) => {
      const x = finden(d);
      if (x) x.aufrufe = (x.aufrufe || 0) + 1;
      if (x) aufrufVerlaufZaehlen(d, x.id); // Deal-Room-Cockpit: Aufrufe über Zeit
    });
    db = await lesen();
    p = finden(db);
  }

  const interesse = n ? org.interesseFuer(db, n, p.id) : null; // eigenes bzw. Interesse der aktiven Organisation
  const ndaFrei = interesse && DATENRAUM_STATUS.includes(interesse.status);
  const zugriff = admin ? "admin" : eigentuemer ? "eigentuemer" : ndaFrei ? "nda" : "oeffentlich";
  const out = { projekt: boerseEintrag(db, p, n), zugriff, interesse, vertraulich: null, dokumente: [] };
  if (zugriff !== "oeffentlich") {
    out.vertraulich = projektVertraulich(p);
    out.datenblatt = p.datenblatt || {}; // Fachprüfung Kapitalseite: Datenblatt + Due-Diligence-Index nur nach NDA
    out.ddIndex = ddIndex(p, checklisteProjekt(p, projektDokumente(db, p)));
    out.dokumente = db.dokumente
      .filter((d) => d.bezugArt === "projekt" && d.bezugId === p.id && (zugriff !== "nda" || (d.kategorie === "datenraum" && datenraumStufeOk(db, d, interesse))))
      .map(dokumentMeta);
  }
  return out;
}

// ================================================================ Interessen

export async function merken(n, projektId, an = true) {
  rolleNoetig(n, ["investor"], "Die Merkliste steht Investoren zur Verfügung.");
  return aendern((db) => {
    const p = objekt(db, "projekt", projektId);
    if (!p || !BOERSE_STATUS.includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    let i = org.interesseFuer(db, n, p.id); // eigenes bzw. Interesse der aktiven Organisation
    if (i && i.investorId !== n.id && !org.darfTeamSchreibenObjekt(db, n, i)) throw verboten("Mit der Rolle „Nur lesen“ können Sie die Merkliste des Teams nicht ändern.");
    if (!i) {
      if (!an) return null;
      i = neuesInteresse(n, p);
      i.organisationId = org.organisationFuerNeu(db, n);
      db.interessen.push(i);
    }
    i.gemerkt = !!an;
    i.geaendertAm = jetzt();
    protokoll(db, n, an ? "merken" : "entmerken", "projekt", p.id, an ? "Projekt gemerkt" : "Von Merkliste entfernt");
    return i;
  });
}

function neuesInteresse(n, p) {
  return {
    id: neueId("I"),
    projektId: p.id,
    investorId: n.id,
    status: "gemerkt",
    gemerkt: false,
    statusVerlauf: [verlaufEintrag("gemerkt", n, "eigentuemer", "")],
    nda: null,
    loi: null,
    ablehnGrund: "",
    erstelltAm: jetzt(),
    geaendertAm: jetzt(),
  };
}

export async function ndaAnfragen(n, projektId, { akzeptiert, ip, userAgent } = {}) {
  rolleNoetig(n, ["investor"], "NDA-Anfragen sind Investoren vorbehalten.");
  return aendern((db) => {
    const p = objekt(db, "projekt", projektId);
    if (!p || !BOERSE_STATUS.includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    if (p.anbieterId === n.id) throw konflikt("Für eigene Projekte ist keine NDA nötig.");
    let i = org.interesseFuer(db, n, p.id); // eigenes bzw. Interesse der aktiven Organisation
    if (i && i.investorId !== n.id && !org.darfTeamSchreibenObjekt(db, n, i)) throw verboten("Mit der Rolle „Nur lesen“ können Sie keine NDA für das Team anfragen.");
    if (!i) {
      i = neuesInteresse(n, p);
      i.organisationId = org.organisationFuerNeu(db, n);
      db.interessen.push(i);
    }
    if (i.status !== "gemerkt") return i; // bereits angefragt – idempotent
    const extra = { ndaAkzeptiert: v.wahr(akzeptiert) };
    const pr = pruefeUebergang("interesse", i, "nda_angefragt", "eigentuemer", extra);
    if (!pr.ok) throw new PlattformFehler(pr.status, pr.fehler);
    i.nda = { version: NDA.version, am: jetzt(), ip: ip || "", userAgent: v.text(userAgent, 300) };
    uebergangAnwenden(db, n, "interesse", i, "nda_angefragt", "eigentuemer", extra, ip);
    protokoll(db, n, "nda", "interesse", i.id, `NDA ${NDA.version} akzeptiert für ${p.id}`, ip);
    return i;
  });
}

function interesseAusgabe(db, i, n) {
  const p = objekt(db, "projekt", i.projektId);
  const out = { ...i, projekt: p ? { ...projektOeffentlich(p), anbieterId: istAdmin(n) ? p.anbieterId : undefined } : null };
  if (istAdmin(n)) {
    out.investor = kurz(nutzerById(db, i.investorId));
    out.anbieter = p ? kurz(nutzerById(db, p.anbieterId)) : null;
  } else if (out.nda) out.nda = { ...out.nda, ip: undefined, userAgent: undefined };
  Object.assign(out, org.zugriffInfo(db, n, i, i.investorId)); // organisation, meinZugriff
  return out;
}

export async function interessen(n, { alle = false, status, projektId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (alle) adminNoetig(n);
  const db = await lesen();
  let liste = alle ? db.interessen : db.interessen.filter(org.listenFilter(db, n, "investorId")); // eigene bzw. der aktiven Organisation
  if (status) {
    const st = Array.isArray(status) ? status : [status];
    liste = liste.filter((i) => st.includes(i.status));
  }
  if (projektId) {
    // Anbieter sieht anonymisierte Interessen am eigenen Projekt nur als Zählwerte (projektAusgabe) – hier nur Admin/Investor
    liste = liste.filter((i) => i.projektId === projektId);
  }
  return liste.sort(nachDatum()).map((i) => interesseAusgabe(db, i, n));
}

// ================================================================ Statuswechsel

/** Übergang anwenden (nach erfolgreicher Prüfung) inkl. Nebenwirkungen und Nachricht */
function uebergangAnwenden(db, n, art, o, nach, als, extra = {}, ip = "") {
  const von = o.status;
  const kommentar = v.mehrzeilig(extra.grund || extra.kommentar || "", 1000);

  kycUebergangPruefen(db, art, o, nach); // KYC/KYB: NDA-Freigabe, LOI, Veröffentlichung nur verifiziert (409 „kyc“)
  bonitaetUebergangPruefen(db, art, o, nach); // Dienste: LOI nur mit gültiger Bonitätsauskunft, wenn Pflicht (409 „bonitaet“)
  anbieterUebergangPruefen(db, art, o, nach); // Anbieter: offene Rückfragen (422), Pflicht-Prüfpunkte/Anonymisierung (409), LOI vom Verkäufer abgelehnt (409)
  // Nebenwirkungen vor dem Wechsel (Validierung)
  if (extra.grund) o.ablehnGrund = kommentar;
  if (art === "flaeche" && nach === "pachtangebot") {
    // Fachprüfung Flächen: vollständiger Angebotsbogen (Modell, Indexierung, Reservierung, Rückbau, Dienstbarkeit …)
    o.pachtangebot = pachtangebotBereinigen(extra.pachtangebot, { am: jetzt() });
  }
  const erstVeroeffentlicht = art === "projekt" && nach === "veroeffentlicht" && !o.veroeffentlichtAm; // Suchprofil-Alarm nur einmal
  if (art === "projekt" && nach === "veroeffentlicht" && (von === "pruefung" || extra.provisionSatz !== undefined)) {
    // Satz nur bei Freigabe aus der Prüfung Pflicht; „Reservierung aufheben“ behält den vereinbarten Satz
    let satz = v.zahl(extra.provisionSatz, { min: 0, max: 100 });
    if (satz !== null && satz > 0.2) satz = satz / 100; // Eingabe in Prozent
    v.pflicht(satz !== null && satz >= PROVISION.verkaeufer.min - 1e-9 && satz <= PROVISION.verkaeufer.max + 1e-9, `Provisionssatz muss zwischen ${PROVISION.verkaeufer.min * 100} und ${PROVISION.verkaeufer.max * 100} % liegen.`);
    o.provisionSatz = Math.round(satz * 10000) / 10000;
    if (!o.veroeffentlichtAm) o.veroeffentlichtAm = jetzt();
  }
  if (art === "interesse" && nach === "loi_abgegeben") {
    // Fachprüfung Kapitalseite: strukturierte LOI (Preisbasis, Struktur, Bedingungen, Exklusivität, Gültigkeit) – fach/loi.js
    let loi;
    try {
      loi = loiBereinigen(extra.loi || {}, { mwp: objekt(db, "projekt", o.projektId)?.mwp });
    } catch (e) {
      throw e?.status === 422 && !(e instanceof PlattformFehler) ? ungueltig(e.message) : e;
    }
    o.loi = { ...loi, am: jetzt() };
  }
  let provision = null;
  let provisionEntfaellt = null; // Anbieter: anerkannte Vorkenntnis zum Käufer → keine Provision
  if (art === "projekt" && nach === "verkauft") {
    const kaeufer = objekt(db, "interesse", v.kennung(extra.interesseId));
    v.pflicht(kaeufer && kaeufer.projektId === o.id && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(kaeufer.status), "Käufer muss ein Interessent mit freigegebenem Datenraum sein.");
    const kaufpreis = v.zahl(extra.kaufpreis, { min: 1, max: 1e11 });
    v.pflicht(kaufpreis, "Bitte Kaufpreis angeben.");
    const satz = o.provisionSatz ?? PROVISION.verkaeufer.min;
    const vk = anbieterVorkenntnisAnerkannt(db, o.id, kaeufer.id);
    if (vk) {
      provisionEntfaellt = { grund: "Vorkenntnis anerkannt", vorkenntnisId: vk.id, interesseId: kaeufer.id, kaufpreis, am: jetzt() };
      o.provisionEntfallen = provisionEntfaellt;
    } else provision = {
      id: neueId("PV"),
      projektId: o.id,
      anbieterId: o.anbieterId,
      investorId: kaeufer.investorId,
      interesseId: kaeufer.id,
      kaufpreis,
      satz,
      betrag: Math.round(kaufpreis * satz),
      status: "offen",
      statusVerlauf: [verlaufEintrag("offen", null, "system", "Automatisch bei Verkauf berechnet.")],
      erstelltAm: jetzt(),
    };
    if (provision) db.provisionen.push(provision);
    // Käufer → abgeschlossen, alle anderen offenen Interessen → abgelehnt
    for (const i of db.interessen.filter((x) => x.projektId === o.id)) {
      if (i.id === kaeufer.id) systemWechsel(db, "interesse", i, "abgeschlossen", "Kauf abgeschlossen.");
      else if (!["abgelehnt", "abgeschlossen"].includes(i.status)) systemWechsel(db, "interesse", i, "abgelehnt", "Projekt anderweitig verkauft.");
    }
  }

  o.status = nach;
  o.statusVerlauf = o.statusVerlauf || [];
  o.statusVerlauf.push(verlaufEintrag(nach, n, als, kommentar));
  o.geaendertAm = jetzt();

  // Neu veröffentlicht → Investoren mit passendem Suchprofil benachrichtigen (nicht erneut nach Reservierung/Rücknahme)
  if (erstVeroeffentlicht) {
    suchprofilAlarm(db, o);
  }

  // LOI angenommen → Projekt reserviert
  if (art === "interesse" && nach === "loi_angenommen") {
    const p = objekt(db, "projekt", o.projektId);
    if (p && p.status === "veroeffentlicht") systemWechsel(db, "projekt", p, "reserviert", "LOI eines Investors angenommen.");
  }

  if (art !== "provision") {
    const text = `Status: „${statusLabel(art, von)}“ → „${statusLabel(art, nach)}“.${kommentar ? ` ${kommentar}` : ""}`;
    const eigen = als === "eigentuemer";
    nachricht(db, { bezugArt: art, bezugId: o.id, vonId: n?.id, vonAdmin: als === "admin", system: true, text, ...(eigen ? { gelesenNutzer: true, gelesenAdmin: false } : {}) });
  }
  if (provision) {
    protokoll(db, n, "provision", "provision", provision.id, `Provision ${provision.betrag} € (${provision.satz * 100} %) für ${o.id}`, ip);
  }
  if (provisionEntfaellt) {
    protokoll(db, n, "provision_entfallen", "projekt", o.id, `Keine Provision für ${o.id}: Vorkenntnis anerkannt (${provisionEntfaellt.vorkenntnisId})`, ip);
    nachricht(db, { bezugArt: "projekt", bezugId: o.id, vonId: n?.id, vonAdmin: true, system: true, text: "Keine Provision: Für den Käufer wurde Ihre Vorkenntnis anerkannt (Vorkenntnis anerkannt)." });
  }
  protokoll(db, n, "status", art, o.id, `${statusLabel(art, von)} → ${statusLabel(art, nach)}`, ip);
  backofficeEreignis(db, { typ: "status", art, objekt: o, von, nach }); // Automationen
}

/**
 * Suchprofil-Alarm: Projekt neu veröffentlicht → Investoren mit `suchprofil.benachrichtigen` und
 * Matching-Score ≥ eigener Schwelle (Standard 70) erhalten Nachricht, Benachrichtigung und – je nach
 * Einstellung – eine E-Mail (nur öffentlicher Titel und Passung, keine vertraulichen Angaben).
 */
function suchprofilAlarm(db, o) {
  for (const inv of db.nutzer.filter((x) => x.aktiv && x.rollen.includes("investor") && x.suchprofil?.benachrichtigen && x.id !== o.anbieterId)) {
    const m = matching(o, inv.suchprofil);
    const schwelle = Number(inv.suchprofil.schwelle) || SUCHPROFIL_SCHWELLE.standard;
    if (m.score < schwelle) continue;
    nachricht(db, { bezugArt: "nutzer", bezugId: inv.id, vonAdmin: true, system: true, text: `Neues Projekt passend zu Ihrem Suchprofil (${m.score} % Passung): ${o.titel}. Zum Exposé: /portal/boerse/${o.id}`, melden: false });
    benachrichtigen(
      db,
      inv,
      { art: "suchprofil", titel: `Passendes Projekt: ${o.titel}`, text: `${m.score} % Passung${m.gruende.length ? ` · ${m.gruende.join(", ")}` : ""}`, link: `/portal/boerse/${o.id}`, objektArt: "projekt", objektId: o.id },
      { mailText: `In der Projektbörse wurde ein Projekt veröffentlicht, das zu Ihrem Suchprofil passt (${m.score} % Passung): „${o.titel}“. Vertrauliche Angaben und Datenraum sehen Sie nach Klick-NDA im Portal.` }
    );
    protokoll(db, null, "suchprofil_treffer", "projekt", o.id, `Suchprofil-Treffer für ${inv.email} (${m.score} %)`);
    backofficeEreignis(db, { typ: "suchprofil", art: "projekt", objekt: o, extra: { score: m.score, investorId: inv.id } }); // Automationen
  }
  // Team-Suchprofile der Organisationen (je Person höchstens ein Alarm)
  const bereits = new Set(db.nutzer.filter((x) => x.aktiv && x.rollen.includes("investor") && x.suchprofil?.benachrichtigen && matching(o, x.suchprofil).score >= (Number(x.suchprofil.schwelle) || SUCHPROFIL_SCHWELLE.standard)).map((x) => x.id));
  org.organisationsAlarm(db, o, {
    matching, schwelleStandard: SUCHPROFIL_SCHWELLE.standard, bereits,
    melden: (u, m, team) => {
      benachrichtigen(db, u, { art: "suchprofil", titel: `Passendes Projekt: ${o.titel}`, text: `${m.score} % Passung (Team ${team.name})`, link: `/portal/boerse/${o.id}`, objektArt: "projekt", objektId: o.id },
        { mailText: `In der Projektbörse wurde ein Projekt veröffentlicht, das zum Suchprofil Ihres Teams „${team.name}“ passt (${m.score} % Passung): „${o.titel}“.` });
      protokoll(db, null, "suchprofil_treffer", "projekt", o.id, `Team-Suchprofil-Treffer für ${u.email} (${m.score} %, ${team.name})`);
    },
  });
}

function systemWechsel(db, art, o, nach, kommentar) {
  const von = o.status;
  const erlaubt = PROZESSE[art].uebergaenge.some((u) => u.nach === nach && u.von.includes(von) && (u.wer === "system" || u.wer === "admin"));
  if (!erlaubt) return;
  if (!kycUebergangPruefen(db, art, o, nach, { werfen: false })) return; // KYC/KYB: Systemwechsel ohne Verifizierung überspringen
  o.status = nach;
  o.statusVerlauf.push(verlaufEintrag(nach, null, "system", kommentar));
  o.geaendertAm = jetzt();
  if (art === "interesse" && nach === "abgelehnt") o.ablehnGrund = kommentar;
  nachricht(db, { bezugArt: art, bezugId: o.id, vonAdmin: true, system: true, text: `Status: „${statusLabel(art, von)}“ → „${statusLabel(art, nach)}“. ${kommentar}` });
  backofficeEreignis(db, { typ: "status", art, objekt: o, von, nach }); // Automationen
}

export async function statusWechsel(n, { art, id, nach, als, extra = {}, ip = "" }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!PROZESSE[art] || art === undefined) throw ungueltig("Unbekannte Objektart.");
  if (!["admin", "eigentuemer"].includes(als)) throw ungueltig("Ungültige Rolle.");
  if (als === "admin") adminNoetig(n);
  return aendern((db) => {
    const o = objekt(db, art, id);
    if (!o) throw nichtGefunden();
    if (als === "eigentuemer" && besitzer(db, art, o) !== n.id && !org.darfTeamSchreibenObjekt(db, n, o)) throw verboten();
    if (art === "interesse" && nach === "nda_angefragt") throw ungueltig("Bitte nutzen Sie die NDA-Anfrage im Projekt.");
    const p = pruefeUebergang(art, o, nach, als, extra || {});
    if (!p.ok) throw new PlattformFehler(p.status, p.fehler);
    uebergangAnwenden(db, n, art, o, nach, als, extra || {}, ip);
    return o;
  });
}

// ================================================================ Nachrichten

function threadInfo(db, art, id, n) {
  const admin = istAdmin(n);
  const o = bezugObjekt(db, art, id);
  if (!o) return null;
  switch (art) {
    case "vorgang":
      return { titel: `Anfrage ${VORGANG_TYPEN[o.typ] || o.typ} · ${o.id}`, link: admin ? `/portal/admin/vorgaenge/${o.id}` : `/portal/anfragen/${o.id}`, gegenueber: [o.kontakt?.vorname, o.kontakt?.nachname].filter(Boolean).join(" ") };
    case "flaeche":
      return { titel: `Fläche: ${o.bezeichnung}`, link: `/portal/flaechen/${o.id}`, gegenueber: nameVon(db, o.nutzerId) };
    case "projekt":
      return { titel: `Projekt: ${o.titel}`, link: `/portal/projekte/${o.id}`, gegenueber: nameVon(db, o.anbieterId) };
    case "interesse": {
      const p = objekt(db, "projekt", o.projektId);
      return { titel: `Interesse: ${p?.titel || o.projektId}`, link: admin ? `/portal/admin/interessen?id=${o.id}` : `/portal/boerse/${o.projektId}`, gegenueber: nameVon(db, o.investorId) };
    }
    case "nutzer":
      return { titel: admin ? `Allgemein · ${nameVon(db, o.id)}` : "Allgemeine Nachrichten", link: `/portal/nachrichten?bezug=nutzer:${o.id}`, gegenueber: nameVon(db, o.id) };
    default:
      return null;
  }
}

function nameVon(db, id) {
  const u = nutzerById(db, id);
  return u ? [u.vorname, u.nachname].filter(Boolean).join(" ") : "";
}

export async function nachrichtenThreads(n, { nurUngelesen = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const admin = istAdmin(n);
  const gruppen = new Map();
  for (const m of db.nachrichten) {
    const key = `${m.bezugArt}:${m.bezugId}`;
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push(m);
  }
  const threads = [];
  for (const [key, liste] of gruppen) {
    const [art, id] = key.split(":");
    const o = bezugObjekt(db, art, id);
    if (!o) continue;
    const eigen = besitzer(db, art, o) === n.id || org.darfTeamLesenObjekt(db, n, o); // auch Threads der eigenen Teams
    if (!admin && !eigen) continue;
    const info = threadInfo(db, art, id, n);
    const sortiert = liste.sort((a, b) => a.am.localeCompare(b.am));
    const letzte = sortiert[sortiert.length - 1];
    const ungelesen = sortiert.filter((m) => (admin && !eigen ? !m.gelesenAdmin : !m.gelesenNutzer)).length;
    if (nurUngelesen && !ungelesen) continue;
    threads.push({ bezugArt: art, bezugId: id, ...info, anzahl: sortiert.length, ungelesen, letzte: { text: letzte.text.slice(0, 160), am: letzte.am, vonAdmin: letzte.vonAdmin, system: letzte.system } });
  }
  return threads.sort((a, b) => b.letzte.am.localeCompare(a.letzte.am));
}

export async function nachrichten(n, bezugArt, bezugId, { markieren = true } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const o = darfBezug(db, n, bezugArt, bezugId);
  const eigen = besitzer(db, bezugArt, o) === n.id;
  const alsAdmin = istAdmin(n) && !eigen;
  const liste = db.nachrichten.filter((m) => m.bezugArt === bezugArt && m.bezugId === bezugId).sort((a, b) => a.am.localeCompare(b.am));
  const offen = liste.filter((m) => (alsAdmin ? !m.gelesenAdmin : !m.gelesenNutzer));
  const hinweise = (db.benachrichtigungen || []).filter((b) => b.nutzerId === n.id && !b.gelesen && b.objektArt === bezugArt && b.objektId === bezugId && ["status", "nachricht", "nda"].includes(b.art));
  if (markieren && (offen.length || hinweise.length)) {
    await aendern((d) => {
      const ids = new Set(offen.map((m) => m.id));
      for (const m of d.nachrichten) if (ids.has(m.id)) m[alsAdmin ? "gelesenAdmin" : "gelesenNutzer"] = true;
      const bIds = new Set(hinweise.map((b) => b.id));
      for (const b of d.benachrichtigungen || []) if (bIds.has(b.id)) b.gelesen = true;
    });
  }
  return {
    ...threadInfo(db, bezugArt, bezugId, n),
    bezugArt,
    bezugId,
    nachrichten: liste.map((m) => ({
      id: m.id,
      text: m.text,
      am: m.am,
      system: m.system,
      vonAdmin: m.vonAdmin,
      eigene: m.vonId === n.id && !m.system,
      vonName: m.vonAdmin ? "ÖkoInvest Backoffice" : nameVon(db, m.vonId) || "Nutzer",
      neu: alsAdmin ? !m.gelesenAdmin : !m.gelesenNutzer,
      // Querschnitt: Lesebestätigung (nur eigene Nachrichten: hat die Gegenseite gelesen?) und Anhänge
      gelesen: m.vonId === n.id && !m.system ? (m.vonAdmin ? !!m.gelesenNutzer : !!m.gelesenAdmin) : undefined,
      anhaenge: (m.anhaenge || []).map((id) => db.dokumente.find((d) => d.id === id)).filter((d) => d && darfDokument(db, n, d)).map((d) => ({ id: d.id, name: d.name, mime: d.mime, groesse: d.groesse })),
    })),
  };
}

export async function nachrichtSenden(n, { bezugArt, bezugId, text, anhaenge = [] }) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const anh = [...new Set((Array.isArray(anhaenge) ? anhaenge : []).slice(0, 10).map(v.kennung).filter(Boolean))]; // Querschnitt: Anhänge (vorher mit stumm hochgeladen)
  const t = v.mehrzeilig(text, 5000) || (anh.length ? "Anhang" : "");
  v.pflicht(t.length >= 2, "Bitte geben Sie eine Nachricht ein.");
  return aendern((db) => {
    const o = darfBezug(db, n, bezugArt, bezugId, { schreiben: true });
    const eigen = besitzer(db, bezugArt, o) === n.id;
    const alsAdmin = istAdmin(n) && !eigen;
    for (const id of anh) {
      const d = db.dokumente.find((x) => x.id === id);
      if (!d || d.bezugArt !== bezugArt || d.bezugId !== bezugId || d.hochgeladenVon !== n.id) throw ungueltig("Anhang gehört nicht zu dieser Unterhaltung.");
    }
    const m = nachricht(db, { bezugArt, bezugId, vonId: n.id, vonAdmin: alsAdmin, text: t, gelesenAdmin: alsAdmin, gelesenNutzer: !alsAdmin });
    if (anh.length) m.anhaenge = anh;
    protokoll(db, n, "nachricht", bezugArt, bezugId, "Nachricht gesendet");
    return { id: m.id, am: m.am };
  });
}

// ================================================================ Dokumente

function dokumentMeta(d) {
  return { id: d.id, bezugArt: d.bezugArt, bezugId: d.bezugId, name: d.name, mime: d.mime, groesse: d.groesse, kategorie: d.kategorie, checkliste: d.checkliste || "", am: d.am, hochgeladenVon: d.hochgeladenVon,
    version: d.version || 1, vorgaengerId: d.vorgaengerId || null, ersetztDurch: d.ersetztDurch || null, freigabe: d.freigabe || null }; // Querschnitt: Versionen, Freigabe
}

/** Darf n dieses Dokument sehen? */
function darfDokument(db, n, d) {
  if (istAdmin(n)) return true;
  if (d.hochgeladenVon === n.id) return true;
  const o = bezugObjekt(db, d.bezugArt, d.bezugId);
  if (!o) return false;
  if (besitzer(db, d.bezugArt, o) === n.id || org.darfTeamLesenObjekt(db, n, o)) return true; // auch Team des Eigentümers
  if (d.bezugArt === "projekt" && d.kategorie === "datenraum" && BOERSE_STATUS.concat(["verkauft"]).includes(o.status)) {
    // eigenes Interesse oder – im Team – das Interesse der Organisation mit freigegebenem Datenraum
    const i = db.interessen.find((x) => x.projektId === o.id && DATENRAUM_STATUS.includes(x.status) && (x.investorId === n.id || org.darfTeamLesenObjekt(db, n, x))) || db.interessen.find((x) => x.projektId === o.id && x.investorId === n.id);
    return !!i && DATENRAUM_STATUS.includes(i.status) && datenraumStufeOk(db, d, i); // Deal-Room: Stufe 2 erst nach LOI
  }
  return false;
}

export async function dokumente(n, { bezugArt, bezugId } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  let liste = db.dokumente;
  if (bezugArt) liste = liste.filter((d) => d.bezugArt === bezugArt && d.bezugId === bezugId);
  else if (!istAdmin(n)) {
    // Übersicht: nur Dokumente an eigenen Objekten bzw. eigene Uploads (kein Datenraum fremder Projekte)
    // Im Organisationskontext zusätzlich die Dokumente an Objekten der aktiven Organisation
    const aktivOrg = org.aktiveOrganisation(db, n);
    liste = liste.filter((d) => d.hochgeladenVon === n.id || besitzer(db, d.bezugArt, bezugObjekt(db, d.bezugArt, d.bezugId)) === n.id || (aktivOrg && bezugObjekt(db, d.bezugArt, d.bezugId)?.organisationId === aktivOrg));
  }
  return liste
    .filter((d) => darfDokument(db, n, d))
    .sort((a, b) => b.am.localeCompare(a.am))
    .slice(0, 500)
    .map((d) => ({ ...dokumentMeta(d), bezugTitel: threadInfo(db, d.bezugArt, d.bezugId, n)?.titel || d.bezugId, bezugLink: threadInfo(db, d.bezugArt, d.bezugId, n)?.link || null }));
}

export async function dokumentLesen(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const d = db.dokumente.find((x) => x.id === id);
  if (!d) throw nichtGefunden("Dokument nicht gefunden.");
  if (!darfDokument(db, n, d)) throw verboten();
  const daten = await uploadLesen(d.datei);
  // Download-Protokoll (Datenraum: wer hat wann welche Unterlage geöffnet)
  await aendern((db2) => protokoll(db2, n, "download", d.bezugArt, d.bezugId, `Dokument ${d.name} geöffnet`));
  return { meta: dokumentMeta(d), daten };
}

export async function dokumentSpeichern(n, { bezugArt, bezugId, name: dateiname, mime, daten, kategorie, checkliste, stumm = false }) { // stumm: Anhang einer Nachricht (ohne Systemnachricht)
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  if (!daten?.length || daten.length > UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist leer oder größer als 10 MB.");
  const kat = v.auswahl(kategorie, DOKUMENT_KATEGORIEN, "allgemein");
  if (kat === "datenraum" && bezugArt !== "projekt") throw ungueltig("Datenraum-Dokumente gehören zu einem Projekt.");
  const punkt = v.auswahl(checkliste, CHECKLISTE_IDS[bezugArt] || [], "");
  const sauber = v.text(dateiname, 120).replace(/[\\/:*?"<>|]/g, "_") || `dokument.${UPLOAD.typen[mime]}`;
  const datei = `${neueId("D")}-${sha256(Math.random() + sauber).slice(0, 16)}.${UPLOAD.typen[mime]}`;
  // Rechte vor dem Schreiben der Datei prüfen
  const db0 = await lesen();
  darfBezug(db0, n, bezugArt, bezugId, { schreiben: true });
  await uploadSchreiben(datei, daten);
  try {
    return await aendern((db) => {
      const o = darfBezug(db, n, bezugArt, bezugId, { schreiben: true });
      const eigen = besitzer(db, bezugArt, o) === n.id;
      const d = { id: neueId("D"), bezugArt, bezugId, name: sauber, mime, groesse: daten.length, datei, kategorie: kat, checkliste: punkt, hochgeladenVon: n.id, am: jetzt(), sha256: sha256(daten) };
      db.dokumente.push(d);
      const alsAdmin = istAdmin(n) && !eigen;
      if (!stumm) nachricht(db, { bezugArt, bezugId, vonId: n.id, vonAdmin: alsAdmin, system: true, text: `Dokument hochgeladen: ${sauber}`, ereignis: "nachricht", ...(alsAdmin ? {} : { gelesenNutzer: true, gelesenAdmin: false }) });
      protokoll(db, n, "upload", bezugArt, bezugId, `Dokument ${sauber} (${d.groesse} B)`);
      backofficeEreignis(db, { typ: "dokument", art: bezugArt, objekt: o, extra: { kategorie: kat } }); // Automationen
      return dokumentMeta(d);
    });
  } catch (e) {
    await uploadLoeschen(datei);
    throw e;
  }
}

export async function dokumentLoeschen(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const datei = await aendern((db) => {
    const idx = db.dokumente.findIndex((x) => x.id === id);
    if (idx < 0) throw nichtGefunden("Dokument nicht gefunden.");
    const d = db.dokumente[idx];
    if (!istAdmin(n) && d.hochgeladenVon !== n.id) throw verboten("Nur eigene Uploads können gelöscht werden.");
    db.dokumente.splice(idx, 1);
    protokoll(db, n, "loeschen", d.bezugArt, d.bezugId, `Dokument ${d.name} gelöscht`);
    return d.datei;
  });
  await uploadLoeschen(datei);
  return { ok: true };
}

// ================================================================ Admin

export async function zuweisen(n, { art, id, zustaendigId }) {
  adminNoetig(n);
  return aendern((db) => {
    const o = objekt(db, art, id);
    if (!o) throw nichtGefunden();
    if (zustaendigId) {
      const z = nutzerById(db, zustaendigId);
      v.pflicht(z && z.rollen.includes("admin") && z.aktiv, "Zuständig kann nur ein aktives Backoffice-Konto sein.");
    }
    o.zustaendigId = zustaendigId || null;
    o.geaendertAm = jetzt();
    protokoll(db, n, "zuweisen", art, id, `Zuständig: ${zustaendigId ? nameVon(db, zustaendigId) : "–"}`);
    return { id: o.id, zustaendigId: o.zustaendigId };
  });
}

export async function nutzerListe(n, { q, rolle } = {}) {
  adminNoetig(n);
  const db = await lesen();
  let liste = db.nutzer;
  if (rolle) liste = liste.filter((u) => u.rollen.includes(rolle));
  if (q) {
    const s = String(q).toLowerCase();
    liste = liste.filter((u) => [u.email, u.vorname, u.nachname, u.firma].join(" ").toLowerCase().includes(s));
  }
  return liste
    .sort(nachDatum("erstelltAm"))
    .map((u) => ({
      ...ohneGeheimnis(u),
      zaehler: {
        vorgaenge: db.vorgaenge.filter((x) => x.nutzerId === u.id).length,
        flaechen: db.flaechen.filter((x) => x.nutzerId === u.id).length,
        projekte: db.projekte.filter((x) => x.anbieterId === u.id).length,
        interessen: db.interessen.filter((x) => x.investorId === u.id).length,
      },
    }));
}

export async function nutzerAendern(n, id, { rollen, aktiv }) {
  adminNoetig(n);
  return aendern((db) => {
    const u = nutzerById(db, id);
    if (!u) throw nichtGefunden("Konto nicht gefunden.");
    if (Array.isArray(rollen)) {
      const r = v.mehrfach(rollen, [...ROLLEN_IDS, "admin", "gutachter", "lieferant", "bank"]); // gutachter: Projektentwicklung · lieferant: Energiebeschaffung · bank: Finanzierung
      v.pflicht(r.length, "Mindestens eine Rolle.");
      if (u.id === n.id && !r.includes("admin")) throw konflikt("Die eigene Admin-Rolle kann nicht entfernt werden.");
      u.rollen = r;
    }
    if (typeof aktiv === "boolean") {
      if (u.id === n.id && !aktiv) throw konflikt("Das eigene Konto kann nicht gesperrt werden.");
      if (u.aktiv && !aktiv) u.sitzungVersion = (u.sitzungVersion || 0) + 1; // sofort abmelden
      u.aktiv = aktiv;
    }
    protokoll(db, n, "nutzer", "nutzer", u.id, `Rollen: ${u.rollen.join(", ")}, aktiv: ${u.aktiv}`);
    return ohneGeheimnis(u);
  });
}

export async function provisionen(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.provisionen
    .sort(nachDatum("erstelltAm"))
    .map((pv) => ({ ...pv, projekt: projektOeffentlich(objekt(db, "projekt", pv.projektId)), anbieter: kurz(nutzerById(db, pv.anbieterId)), investor: kurz(nutzerById(db, pv.investorId)) }));
}

export async function aktivitaeten(n, { limit = 100, objektId, objektIds } = {}) {
  adminNoetig(n);
  const db = await lesen();
  let liste = db.aktivitaeten;
  const ids = new Set([objektId, ...(Array.isArray(objektIds) ? objektIds.slice(0, 50) : [])].filter(Boolean).map(String));
  if (ids.size) liste = liste.filter((a) => ids.has(a.objektId));
  return liste
    .slice(-Math.min(500, Math.max(1, Number(limit) || 100)))
    .reverse()
    .map((a) => ({ ...a, nutzer: nameVon(db, a.nutzerId) || (a.nutzerId ? a.nutzerId : "Gast/System") }));
}

export async function demoLinks(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.demoLinks.slice(0, 20);
}

export async function adminKonten(n) {
  adminNoetig(n);
  const db = await lesen();
  return db.nutzer.filter((u) => u.rollen.includes("admin") && u.aktiv).map(kurz);
}

export async function adminUebersicht(n) {
  adminNoetig(n);
  const db = await lesen();
  const zaehle = (liste, feld = "status") => liste.reduce((acc, x) => ((acc[x[feld]] = (acc[x[feld]] || 0) + 1), acc), {});
  const tage = (iso) => (Date.now() - new Date(iso).getTime()) / 86400e3;
  const erreicht = (liste, art, ziel) => {
    const pipe = PROZESSE[art].pipeline;
    const idx = pipe.indexOf(ziel);
    return liste.filter((x) => (x.statusVerlauf || []).some((e) => pipe.indexOf(e.status) >= idx)).length;
  };
  const ungelesenAdmin = db.nachrichten.filter((m) => !m.gelesenAdmin).length;
  return {
    vorgaenge: {
      gesamt: db.vorgaenge.length,
      neu7: db.vorgaenge.filter((x) => tage(x.erstelltAm) <= 7).length,
      offen: db.vorgaenge.filter((x) => OFFENE_STATUS.vorgang.includes(x.status)).length,
      ohneZustaendig: db.vorgaenge.filter((x) => OFFENE_STATUS.vorgang.includes(x.status) && !x.zustaendigId).length,
      status: zaehle(db.vorgaenge),
      typ: zaehle(db.vorgaenge, "typ"),
      trichter: PROZESSE.vorgang.pipeline.map((s) => ({ status: s, anzahl: erreicht(db.vorgaenge, "vorgang", s) })),
    },
    flaechen: {
      gesamt: db.flaechen.length,
      ha: Math.round(db.flaechen.filter((f) => f.status !== "abgelehnt").reduce((s, f) => s + (f.ha || 0), 0)),
      status: zaehle(db.flaechen),
      trichter: PROZESSE.flaeche.pipeline.map((s) => ({ status: s, anzahl: erreicht(db.flaechen, "flaeche", s) })),
    },
    projekte: {
      gesamt: db.projekte.length,
      inPruefung: db.projekte.filter((p) => p.status === "pruefung").length,
      mwpBoerse: Math.round(db.projekte.filter((p) => BOERSE_STATUS.includes(p.status)).reduce((s, p) => s + (p.mwp || 0), 0) * 10) / 10,
      status: zaehle(db.projekte),
    },
    interessen: {
      status: zaehle(db.interessen),
      ndaOffen: db.interessen.filter((i) => i.status === "nda_angefragt").length,
      loiOffen: db.interessen.filter((i) => i.status === "loi_abgegeben").length,
      trichter: [
        { status: "veroeffentlicht", label: "Projekte in der Börse", anzahl: db.projekte.filter((p) => ["veroeffentlicht", "reserviert", "verkauft"].includes(p.status)).length },
        { status: "nda", label: "NDA angefragt", anzahl: db.interessen.filter((i) => i.nda).length },
        { status: "loi", label: "LOI abgegeben", anzahl: db.interessen.filter((i) => i.loi).length },
        { status: "verkauft", label: "Verkauft", anzahl: db.projekte.filter((p) => p.status === "verkauft").length },
      ],
    },
    provisionen: {
      anzahl: db.provisionen.length,
      offen: db.provisionen.filter((p) => ["offen", "in_rechnung"].includes(p.status)).reduce((s, p) => s + p.betrag, 0),
      bezahlt: db.provisionen.filter((p) => p.status === "bezahlt").reduce((s, p) => s + p.betrag, 0),
    },
    nutzer: { gesamt: db.nutzer.length, rollen: db.nutzer.reduce((acc, u) => (u.rollen.forEach((r) => (acc[r] = (acc[r] || 0) + 1)), acc), {}) },
    nachrichten: { ungelesen: ungelesenAdmin },
    aufgaben: aufgabenKennzahlen(db, n),
  };
}

// ================================================================ Benachrichtigungen (Glocke)

const TZ = "Europe/Vienna";
/** Heutiges Datum (JJJJ-MM-TT) in der Zeitzone des Backoffice */
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const datumDe = (tag) => String(tag || "").split("-").reverse().join(".");

/** Fällige Wiedervorlagen einmalig als Benachrichtigung melden (Frappe: täglicher Scheduler) */
function wiedervorlagenMelden(db, u) {
  const t = heute();
  let neu = 0;
  for (const a of db.aufgaben || []) {
    if (a.status !== "offen" || a.zustaendigId !== u.id || !a.faelligAm || a.faelligAm > t || a.erinnertAm) continue;
    a.erinnertAm = jetzt();
    const info = a.bezugArt ? threadInfo(db, a.bezugArt, a.bezugId, u) : null;
    benachrichtigen(db, u, { art: "aufgabe", titel: `Wiedervorlage fällig: ${a.titel}`, text: `Fällig am ${datumDe(a.faelligAm)}${info ? ` · ${info.titel}` : ""}`, link: "/portal/admin/aufgaben?ansicht=meine", objektArt: a.bezugArt || "aufgabe", objektId: a.bezugId || a.id });
    neu++;
  }
  return neu;
}

export async function benachrichtigungen(n, { nurUngelesen = false, limit = 50 } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  let db = await lesen();
  if (istAdmin(n) && (db.aufgaben || []).some((a) => a.status === "offen" && a.zustaendigId === n.id && a.faelligAm && a.faelligAm <= heute() && !a.erinnertAm)) {
    await aendern((d) => wiedervorlagenMelden(d, nutzerById(d, n.id)));
    db = await lesen();
  }
  const eigene = (db.benachrichtigungen || []).filter((b) => b.nutzerId === n.id).sort((a, b) => b.am.localeCompare(a.am));
  const liste = nurUngelesen ? eigene.filter((b) => !b.gelesen) : eigene;
  const u = nutzerById(db, n.id);
  return {
    eintraege: liste.slice(0, Math.min(200, Math.max(1, Number(limit) || 50))),
    ungelesen: eigene.filter((b) => !b.gelesen).length,
    gesamt: eigene.length,
    einstellungen: { ...mailEinstellungenStandard(), ...(u?.mailEinstellungen || {}) },
  };
}

export async function benachrichtigungenGelesen(n, { ids, alle = false } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const auswahl = new Set(Array.isArray(ids) ? ids.slice(0, 200).map(v.kennung).filter(Boolean) : []);
  v.pflicht(alle === true || auswahl.size, "Keine Benachrichtigung ausgewählt.");
  return aendern((db) => {
    let geaendert = 0;
    for (const b of db.benachrichtigungen || []) {
      if (b.nutzerId !== n.id || b.gelesen) continue;
      if (alle === true || auswahl.has(b.id)) {
        b.gelesen = true;
        geaendert++;
      }
    }
    return { geaendert, ungelesen: (db.benachrichtigungen || []).filter((b) => b.nutzerId === n.id && !b.gelesen).length };
  });
}

export async function mailEinstellungenSpeichern(n, einstellungen = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  return aendern((db) => {
    const u = nutzerById(db, n.id);
    const neu = { ...mailEinstellungenStandard(), ...(u.mailEinstellungen || {}) };
    for (const k of BENACHRICHTIGUNG_ART_IDS) if (typeof einstellungen?.[k] === "boolean") neu[k] = einstellungen[k];
    u.mailEinstellungen = neu;
    protokoll(db, u, "einstellungen", "nutzer", u.id, `E-Mail-Benachrichtigungen: ${Object.entries(neu).filter(([, x]) => x).map(([k]) => k).join(", ") || "keine"}`);
    return neu;
  });
}

// ================================================================ Postausgang (nur Demo)

export async function postausgang(n, { limit = 100 } = {}) {
  adminNoetig(n);
  const db = await lesen();
  return (db.postausgang || []).slice(0, Math.min(500, Math.max(1, Number(limit) || 100)));
}

// ================================================================ Aufgaben & Wiedervorlagen (Backoffice)

const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const datumTag = (x) => {
  const s = v.text(x, 10);
  if (!DATUM.test(s)) return "";
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : ""; // 31.02. o. Ä. ablehnen
};

function aufgabeAusgabe(db, a, n) {
  const t = heute();
  const info = a.bezugArt ? threadInfo(db, a.bezugArt, a.bezugId, n) : null;
  return {
    ...a,
    zustaendig: kurz(nutzerById(db, a.zustaendigId)),
    erstelltVonName: nameVon(db, a.erstelltVon),
    bezugTitel: info?.titel || "",
    bezugLink: info?.link || null,
    ueberfaellig: a.status === "offen" && !!a.faelligAm && a.faelligAm < t,
    heuteFaellig: a.status === "offen" && a.faelligAm === t,
  };
}

function aufgabenSortieren(a, b) {
  if (a.status !== b.status) return a.status === "offen" ? -1 : 1;
  if (a.status === "offen") return String(a.faelligAm || "9999").localeCompare(String(b.faelligAm || "9999"));
  return String(b.erledigtAm || "").localeCompare(String(a.erledigtAm || ""));
}

function aufgabenKennzahlen(db, n) {
  const t = heute();
  const offen = (db.aufgaben || []).filter((a) => a.status === "offen");
  const meine = offen.filter((a) => a.zustaendigId === n.id);
  return {
    offen: offen.length,
    ueberfaellig: offen.filter((a) => a.faelligAm && a.faelligAm < t).length,
    heute: offen.filter((a) => a.faelligAm === t).length,
    meineOffen: meine.length,
    meineUeberfaellig: meine.filter((a) => a.faelligAm && a.faelligAm < t).length,
    meine: [...meine].sort(aufgabenSortieren).slice(0, 6).map((a) => aufgabeAusgabe(db, a, n)),
  };
}

export async function aufgaben(n, { zustaendigId, status, bezugArt, bezugId, nurUeberfaellig = false } = {}) {
  adminNoetig(n);
  const db = await lesen();
  let liste = db.aufgaben || [];
  if (zustaendigId) liste = liste.filter((a) => a.zustaendigId === zustaendigId);
  if (status && AUFGABE_STATUS[status]) liste = liste.filter((a) => a.status === status);
  if (bezugArt) liste = liste.filter((a) => a.bezugArt === bezugArt && a.bezugId === bezugId);
  if (nurUeberfaellig) liste = liste.filter((a) => a.status === "offen" && a.faelligAm && a.faelligAm < heute());
  return [...liste].sort(aufgabenSortieren).slice(0, 500).map((a) => aufgabeAusgabe(db, a, n));
}

function zustaendigPruefen(db, id) {
  const z = nutzerById(db, v.kennung(id));
  v.pflicht(z && z.aktiv && z.rollen.includes("admin"), "Zuständig kann nur ein aktives Backoffice-Konto sein.");
  return z;
}

function aufgabeMelden(db, n, a, z) {
  if (!z || z.id === n.id) return;
  benachrichtigen(
    db,
    z,
    { art: "aufgabe", titel: `Neue Aufgabe: ${a.titel}`, text: `Von ${nameVon(db, n.id)} · fällig am ${datumDe(a.faelligAm)}`, link: "/portal/admin/aufgaben?ansicht=meine", objektArt: a.bezugArt || "aufgabe", objektId: a.bezugId || a.id },
    { mailText: `Ihnen wurde im Backoffice eine Aufgabe zugewiesen (fällig am ${datumDe(a.faelligAm)}). Details finden Sie im Portal.` }
  );
}

export async function aufgabeAnlegen(n, daten = {}) {
  adminNoetig(n);
  const titel = v.text(daten.titel, 160);
  v.pflicht(titel.length >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).");
  const faelligAm = datumTag(daten.faelligAm);
  v.pflicht(faelligAm, "Bitte geben Sie ein gültiges Fälligkeitsdatum an.");
  const bezugArt = daten.bezugArt ? v.auswahl(daten.bezugArt, AUFGABE_BEZUG_ARTEN, "") : "";
  if (daten.bezugArt) v.pflicht(bezugArt, "Unbekannter Bezug.");
  return aendern((db) => {
    const z = zustaendigPruefen(db, daten.zustaendigId || n.id);
    let bezugId = null;
    if (bezugArt) {
      const o = objekt(db, bezugArt, v.kennung(daten.bezugId));
      if (!o) throw nichtGefunden("Bezug nicht gefunden.");
      bezugId = o.id;
    }
    db.aufgaben = db.aufgaben || [];
    const a = {
      id: neueId("AF"),
      titel,
      beschreibung: v.mehrzeilig(daten.beschreibung, 2000),
      faelligAm,
      zustaendigId: z.id,
      bezugArt: bezugArt || null,
      bezugId,
      status: "offen",
      erstelltVon: n.id,
      erstelltAm: jetzt(),
      erledigtAm: null,
      erledigtVon: null,
      erinnertAm: null,
    };
    db.aufgaben.push(a);
    protokoll(db, n, "aufgabe", bezugArt || "aufgabe", bezugId || a.id, `Aufgabe „${titel}“ angelegt (fällig ${datumDe(faelligAm)}, zuständig ${nameVon(db, z.id)})`);
    aufgabeMelden(db, n, a, z);
    return aufgabeAusgabe(db, a, n);
  });
}

export async function aufgabeAendern(n, id, daten = {}) {
  adminNoetig(n);
  return aendern((db) => {
    const a = (db.aufgaben || []).find((x) => x.id === id);
    if (!a) throw nichtGefunden("Aufgabe nicht gefunden.");
    const aenderungen = [];
    if (daten.titel !== undefined) {
      const t = v.text(daten.titel, 160);
      v.pflicht(t.length >= 3, "Bitte geben Sie einen Titel an (mind. 3 Zeichen).");
      if (t !== a.titel) aenderungen.push("Titel");
      a.titel = t;
    }
    if (daten.beschreibung !== undefined) {
      const b = v.mehrzeilig(daten.beschreibung, 2000);
      if (b !== a.beschreibung) aenderungen.push("Beschreibung");
      a.beschreibung = b;
    }
    if (daten.faelligAm !== undefined) {
      const f = datumTag(daten.faelligAm);
      v.pflicht(f, "Bitte geben Sie ein gültiges Fälligkeitsdatum an.");
      if (f !== a.faelligAm) {
        a.faelligAm = f;
        a.erinnertAm = null;
        aenderungen.push(`fällig ${datumDe(f)}`);
      }
    }
    let neuZustaendig = null;
    if (daten.zustaendigId !== undefined && daten.zustaendigId !== a.zustaendigId) {
      neuZustaendig = zustaendigPruefen(db, daten.zustaendigId);
      a.zustaendigId = neuZustaendig.id;
      a.erinnertAm = null;
      aenderungen.push(`zuständig ${nameVon(db, neuZustaendig.id)}`);
    }
    if (daten.status !== undefined) {
      const st = v.auswahl(daten.status, AUFGABE_STATUS, "");
      v.pflicht(st, "Unbekannter Status.");
      if (st !== a.status) {
        a.status = st;
        a.erledigtAm = st === "erledigt" ? jetzt() : null;
        a.erledigtVon = st === "erledigt" ? n.id : null;
        aenderungen.push(st === "erledigt" ? "erledigt" : "wieder geöffnet");
      }
    }
    if (aenderungen.length) protokoll(db, n, "aufgabe", a.bezugArt || "aufgabe", a.bezugId || a.id, `Aufgabe „${a.titel}“: ${aenderungen.join(", ")}`);
    if (neuZustaendig) aufgabeMelden(db, n, a, neuZustaendig);
    return aufgabeAusgabe(db, a, n);
  });
}

// ================================================================ Exposé (PDF-Daten)

/**
 * Daten für das vertrauliche Exposé-PDF. Berechtigt: Backoffice, Anbieter des Projekts und Investoren mit
 * freigegebenem Datenraum (NDA). Jeder Abruf wird protokolliert. Das PDF selbst erzeugt die Website.
 */
export async function exposeDaten(n, id, { ip = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await lesen();
  const p = db.projekte.find((x) => x.id === id || x.slug === id);
  if (!p) throw nichtGefunden("Projekt nicht gefunden.");
  const admin = istAdmin(n);
  const eigen = p.anbieterId === n.id || org.darfTeamLesenObjekt(db, n, p); // auch Team des Anbieters
  let zugriff = admin ? "admin" : eigen ? "eigentuemer" : null;
  let i = null;
  if (!zugriff) {
    if (![...BOERSE_STATUS, "verkauft"].includes(p.status)) throw nichtGefunden("Projekt nicht gefunden.");
    i = db.interessen.find((x) => x.projektId === p.id && DATENRAUM_STATUS.includes(x.status) && (x.investorId === n.id || org.darfTeamLesenObjekt(db, n, x))) || db.interessen.find((x) => x.projektId === p.id && x.investorId === n.id);
    if (!i || !DATENRAUM_STATUS.includes(i.status)) throw verboten("Das vollständige Exposé steht nach Freigabe Ihrer NDA-Anfrage zur Verfügung.");
    zugriff = "nda";
  }
  const doks = projektDokumente(db, p);
  const u = nutzerById(db, n.id);
  await aendern((d) => protokoll(d, n, "expose", "projekt", p.id, `Exposé-PDF abgerufen (${zugriff})`, ip));
  return {
    projekt: { ...projektOeffentlich(p), datenraumQualitaet: checklisteProjekt(p, doks).quote },
    vertraulich: projektVertraulich(p),
    datenblatt: p.datenblatt || {}, // Projektdatenblatt im Exposé (Portal-Logik)
    dokumente: doks.filter((d) => zugriff !== "nda" || (d.kategorie === "datenraum" && datenraumStufeOk(db, d, i))).map(dokumentMeta), // Deal-Room: Stufe 2 erst nach LOI (wie boerseDetail)
    zugriff,
    empfaenger: { name: nameVon(db, n.id), firma: u?.firma || "", email: u?.email || "", rolle: zugriff === "nda" ? "investor" : zugriff },
    erstelltAm: jetzt(),
  };
}

// ================================================================ Protokoll (z. B. CSV-Export)

const PROTOKOLL_AKTIONEN = ["export"];

export async function protokollEintrag(n, { aktion, objektArt, objektId, text, ip = "" } = {}) {
  adminNoetig(n);
  v.pflicht(PROTOKOLL_AKTIONEN.includes(aktion), "Unbekannte Aktion.");
  await aendern((db) => protokoll(db, n, aktion, v.text(objektArt, 40), v.text(objektId, 60), text, ip));
  return { ok: true };
}

// ================================================================ Interne Helfer für Themen-Module (backend/demo/<thema>.js)
// Nur serverseitig; kein Teil der Backend-Schnittstelle (OPERATIONEN).
export const intern = { nachricht, benachrichtigen, protokoll, systemWechsel, darfDokument, dokumentMeta, nutzerById, kurz, nameVon, aktiveAdmins };
// Login, Sicherheit & Teams (backend/demo/sicherheit.js, backend/demo/organisation.js)
sicherheitWerkzeugeSetzen({ benachrichtigen, protokoll, postausgangAnlegen, ohneGeheimnis, tokenAnlegen, tokenEinloesen, verknuepfen });

// Backoffice (backend/demo/backoffice.js): interne Helfer für CRM, Automationen, Vorlagen
werkzeugeSetzen({ protokoll, nachricht, benachrichtigen, postausgangAnlegen, uebergangAnwenden, besitzer, nutzerById, aktiveAdmins });
