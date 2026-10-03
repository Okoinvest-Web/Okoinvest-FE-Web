// src/lib/plattform/backend/demo/bericht.js
//
// Demo-Backend „Bericht“ (Welle 2, Paket B4) – JSON-Datei .data/plattform.json, Signaturen wie frappe/bericht.js.
//
//   db.berichte      { id, tokenHash, rechner, land, eingaben, ergebnis, pruefId, stand, status, erstelltAm, ablauf,
//                      beginnAm, bestaetigtAm, personId, vorgangId, einwilligungen, kanal }
//                    – OHNE Klartext-Token und OHNE Personendaten (nur Verweis personId auf db.leadPersonen).
//   db.leadPersonen  bis zur Bestätigung eine Zeile mit vorgangId null und zweck "bericht_ausstehend" (Paket B3-Struktur);
//                    sie wird nach der Bestätigung (die Anfrage legt eine eigene Personenzeile an) oder nach Ablauf
//                    der 48 Stunden gelöscht. Art. 17 (personLoeschen) erfasst sie über das Pseudonym mit.
//   db.postausgang   die Bestätigungs-Mail (Demo: es geht nichts raus). Nur hier steht der Link mit dem Token –
//                    der Postausgang simuliert das Postfach der Empfängerin/des Empfängers.
//
// Abgelaufene Berichte werden zu „Grabsteinen“ (nur tokenHash, ablauf, status) verkürzt, damit der Link 410 statt
// 404 liefert; Grabsteine verschwinden nach 90 Tagen.

import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import { pseudonym } from "@/lib/anfrage/protokoll";
import { berichtZustand } from "@/lib/bericht/token";

const GRABSTEIN_TAGE = 90;
const SPERRE_MS = 2 * 60 * 1000; // „in_bestaetigung“ gilt danach als verwaist
const MAIL_HINWEIS = "Demo-Postausgang: Diese E-Mail wurde nicht versendet.";

function sicher(db) {
  db.berichte = Array.isArray(db.berichte) ? db.berichte : [];
  db.leadPersonen = Array.isArray(db.leadPersonen) ? db.leadPersonen : [];
  db.postausgang = Array.isArray(db.postausgang) ? db.postausgang : [];
}

const finde = (db, tokenHash) => db.berichte.find((b) => b.tokenHash === tokenHash) || null;
const personWeg = (db, id) => {
  if (id) db.leadPersonen = db.leadPersonen.filter((p) => !(p.id === id && p.zweck === "bericht_ausstehend"));
};

/** Abgelaufene Berichte zu Grabsteinen verkürzen, alte Grabsteine löschen. Liefert die Zahl der Änderungen. */
export function aufraeumenDb(db, jetztMs = Date.now()) {
  sicher(db);
  let n = 0;
  for (const b of db.berichte) {
    if (b.status === "abgelaufen" || berichtZustand(b, jetztMs) !== "abgelaufen") continue;
    personWeg(db, b.personId);
    for (const k of ["rechner", "land", "eingaben", "ergebnis", "pruefId", "stand", "einwilligungen", "kanal", "personId", "vorgangId", "beginnAm"]) delete b[k];
    b.status = "abgelaufen";
    n++;
  }
  const vorher = db.berichte.length;
  db.berichte = db.berichte.filter((b) => !(b.status === "abgelaufen" && Date.parse(b.ablauf) + GRABSTEIN_TAGE * 864e5 < jetztMs));
  return n + (vorher - db.berichte.length);
}

/**
 * Anforderung speichern (Token nur als Hash) + Personenzeile (ausstehend) + Bestätigungs-Mail in den Postausgang.
 * daten: { tokenHash, rechner, land, eingaben, ergebnis, pruefId, stand, ablauf, kontakt, einwilligungen, kanal, mail }
 */
export async function berichtAnlegen(daten = {}) {
  const { tokenHash, kontakt = {}, mail = {} } = daten;
  if (!/^[0-9a-f]{64}$/.test(tokenHash || "")) throw new Error("tokenHash fehlt");
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db);
    const am = jetzt();
    const person = {
      id: neueId("LP"),
      pseudonym: pseudonym(kontakt.email),
      vorgangId: null,
      zweck: "bericht_ausstehend",
      vorname: kontakt.vorname,
      nachname: kontakt.nachname,
      firma: "",
      email: kontakt.email,
      telefon: kontakt.telefon || "",
      ipGekuerzt: "",
      ipLoeschenAb: null,
      land: daten.land,
      erstelltAm: am,
    };
    db.leadPersonen.push(person);
    const b = {
      id: neueId("BR"),
      tokenHash,
      rechner: daten.rechner,
      land: daten.land,
      eingaben: daten.eingaben,
      ergebnis: daten.ergebnis,
      pruefId: daten.pruefId,
      stand: daten.stand,
      status: "offen",
      erstelltAm: am,
      ablauf: daten.ablauf,
      beginnAm: null,
      bestaetigtAm: null,
      personId: person.id,
      vorgangId: null,
      einwilligungen: Array.isArray(daten.einwilligungen) ? daten.einwilligungen : [],
      kanal: daten.kanal || "",
    };
    db.berichte.push(b);
    db.postausgang.unshift({ id: neueId("E"), am, an: kontakt.email, anName: "", nutzerId: null, art: "bericht_doi", betreff: mail.betreff, text: mail.text, link: mail.link, linkText: mail.linkText || "Bestätigen", hinweis: MAIL_HINWEIS });
    if (db.postausgang.length > 500) db.postausgang.length = 500;
    return { id: b.id };
  });
}

/**
 * Bestätigung beginnen (atomar): offen → in_bestaetigung, liefert die zwischengespeicherten Daten inkl. Kontakt.
 * → { zustand: "offen", eintrag } | { zustand: "bestaetigt" | "abgelaufen" | "in_bestaetigung" } | { zustand: null }
 */
export async function berichtBestaetigungBeginnen({ tokenHash, jetztMs = Date.now() } = {}) {
  return aendern((db) => {
    sicher(db);
    aufraeumenDb(db, jetztMs);
    const b = finde(db, tokenHash);
    if (!b) return { zustand: null };
    let z = berichtZustand(b, jetztMs);
    if (z === "in_bestaetigung" && (!b.beginnAm || jetztMs - Date.parse(b.beginnAm) > SPERRE_MS)) z = "offen";
    if (z !== "offen") return { zustand: z };
    const p = db.leadPersonen.find((x) => x.id === b.personId);
    if (!p) return { zustand: "abgelaufen" }; // Personenzeile gelöscht (z. B. Art. 17) – nichts mehr zu bestätigen
    b.status = "in_bestaetigung";
    b.beginnAm = new Date(jetztMs).toISOString();
    return {
      zustand: "offen",
      eintrag: {
        rechner: b.rechner,
        land: b.land,
        eingaben: b.eingaben,
        ergebnis: b.ergebnis,
        pruefId: b.pruefId,
        stand: b.stand,
        einwilligungen: b.einwilligungen,
        kanal: b.kanal,
        kontakt: { vorname: p.vorname, nachname: p.nachname, email: p.email, telefon: p.telefon },
      },
    };
  });
}

/** Bestätigung abschließen: Vorgang verknüpfen, Berichtsfrist setzen, ausstehende Personenzeile löschen */
export async function berichtBestaetigungAbschliessen({ tokenHash, vorgangId, ablauf, jetztMs = Date.now() } = {}) {
  return aendern((db) => {
    sicher(db);
    const b = finde(db, tokenHash);
    if (!b || b.status !== "in_bestaetigung") return { ok: false };
    personWeg(db, b.personId);
    const neu = db.leadPersonen.find((p) => p.vorgangId === vorgangId);
    b.personId = neu?.id || null;
    b.vorgangId = vorgangId || null;
    b.status = "bestaetigt";
    b.bestaetigtAm = new Date(jetztMs).toISOString();
    b.ablauf = ablauf;
    b.beginnAm = null;
    return { ok: true };
  });
}

/** Bestätigung zurücksetzen (Fehler unterwegs) – die Anforderung bleibt bis zum Ablauf bestätigbar */
export async function berichtBestaetigungZuruecksetzen({ tokenHash } = {}) {
  return aendern((db) => {
    sicher(db);
    const b = finde(db, tokenHash);
    if (b && b.status === "in_bestaetigung") {
      b.status = "offen";
      b.beginnAm = null;
    }
    return { ok: true };
  });
}

/** Bericht lesen – ohne Personendaten. → { zustand, bericht? } */
export async function berichtLesen({ tokenHash, jetztMs = Date.now() } = {}) {
  const db = await lesen();
  const b = (Array.isArray(db.berichte) ? db.berichte : []).find((x) => x.tokenHash === tokenHash);
  if (!b) return { zustand: null };
  const zustand = b.status === "abgelaufen" ? "abgelaufen" : berichtZustand(b, jetztMs);
  if (zustand !== "bestaetigt") return { zustand, bericht: zustand === "abgelaufen" ? null : { rechner: b.rechner, land: b.land, ablauf: b.ablauf } };
  return {
    zustand,
    bericht: { id: b.id, rechner: b.rechner, land: b.land, eingaben: b.eingaben, ergebnis: b.ergebnis, pruefId: b.pruefId, stand: b.stand, erstelltAm: b.erstelltAm, bestaetigtAm: b.bestaetigtAm, ablauf: b.ablauf },
  };
}

/** Aufräumen (Tests, später Zeitplan) */
export async function berichtAufraeumen({ jetztMs = Date.now() } = {}) {
  return aendern((db) => ({ geaendert: aufraeumenDb(db, jetztMs) }));
}
