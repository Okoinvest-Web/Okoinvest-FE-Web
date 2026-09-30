// src/lib/plattform/backend/demo/service-kern.js
//
// Gemeinsamer Kern „Dokumente, Signatur, Termine, Service & HR“ im Demo-Backend:
// Datenbestand db.service (beim ersten Zugriff einmalig mit Demo-Daten ergänzt, übrige Daten unberührt),
// Rechte-Helfer, E-Mail in den Postausgang (mit Anhang, z. B. ICS), Dateiablage unter .data/uploads.
//
// Dateien werden SYNCHRON gelesen/geschrieben (readFileSync/writeFileSync): Die Seed-Ergänzung kann beim
// Rendern einer Portalseite laufen – awaited fs.promises-Rückgaben landen sonst im Dev-HTML (docs/BRIEFING.md).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PlattformFehler, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen, UPLOAD_ORDNER } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import { serviceSeed } from "./service-seed";

export const { benachrichtigen, protokoll, nutzerById, nameVon, kurz, aktiveAdmins } = intern;

export const istAdmin = (n) => !!n?.rollen?.includes("admin");
export const boLesen = (n, bereich) => istAdmin(n) && darfLesen(n, bereich);
export const boSchreiben = (n, bereich) => istAdmin(n) && darfSchreiben(n, bereich);

export function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
export function leseNoetig(n, bereich, text = "Nur für das Backoffice.") {
  angemeldet(n);
  if (!boLesen(n, bereich)) throw verboten(text);
}
export function schreibNoetig(n, bereich, label) {
  angemeldet(n);
  if (!boSchreiben(n, bereich)) throw verboten(istAdmin(n) ? `Ihre Backoffice-Rolle erlaubt im Bereich „${label}“ kein Schreiben.` : "Nur für das Backoffice.");
}

// ================================================================ Datenbestand

function leer() {
  return {
    v: 1,
    einstellungen: { ndaModus: "klick", provisionModus: "klick", ablage: { drive: false } },
    signaturen: [],
    termine: [],
    verfuegbarkeit: {}, // kontoId → { arbeitszeiten, terminarten, puffer, aktiv }
    feiertage: [],
    tickets: [],
    mitarbeiter: {}, // kontoId → { employeeId, vertretungId, kapazitaetStunden, aktiv, funktion }
    abwesenheiten: [],
    zeiten: [],
    wissen: [],
  };
}

export async function lesenBereit() {
  const db = await lesen();
  if (db.service?.v) return db;
  await aendern(async (d) => {
    if (d.service?.v) return;
    d.service = leer();
    try {
      serviceSeed(d);
    } catch (e) {
      console.warn("[plattform-demo] Service-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}

export async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

// ================================================================ Dateien (synchron, siehe Kopf)

export function dateiSchreiben(praefix, endung, daten) {
  mkdirSync(UPLOAD_ORDNER, { recursive: true });
  const name = `${praefix}-${neueId("X").slice(-6)}-${Date.now().toString(36)}.${endung}`;
  writeFileSync(path.join(UPLOAD_ORDNER, name), daten);
  return name;
}

export function dateiLesen(name) {
  return readFileSync(path.join(UPLOAD_ORDNER, path.basename(String(name || ""))));
}

export function dateiLoeschen(name) {
  try {
    rmSync(path.join(UPLOAD_ORDNER, path.basename(String(name || ""))), { force: true });
  } catch {
    /* egal */
  }
}

// ================================================================ E-Mail (Postausgang)

const HINWEIS = "Aus Gründen der Vertraulichkeit enthält diese E-Mail keine Vertragsinhalte. Bitte melden Sie sich im Portal an.";

/**
 * E-Mail, die Frappe versenden würde, im Demo-Postausgang ablegen. `anhang` = { name, mime, inhalt } (z. B. ICS).
 * Links: Portal-Pfade oder öffentliche Terminverwaltung (/termin/…).
 */
export function mailAblegen(db, { an, anName = "", nutzerId = null, art, betreff, text, link = "/portal", linkText = "Zum Portal", hinweis = HINWEIS, anhang = null }) {
  if (!an) return null;
  db.postausgang = db.postausgang || [];
  const sicher = typeof link === "string" && (link.startsWith("/portal") || link.startsWith("/termin")) && !link.startsWith("//") ? link.slice(0, 400) : "/portal";
  const e = { id: neueId("E"), am: jetzt(), an, anName, nutzerId, art, betreff: v.text(betreff, 200), text: v.mehrzeilig(text, 2000), link: sicher, linkText, hinweis, anhang: anhang ? { name: v.text(anhang.name, 80), mime: anhang.mime, inhalt: String(anhang.inhalt).slice(0, 20000) } : null };
  db.postausgang.unshift(e);
  if (db.postausgang.length > 500) db.postausgang.length = 500;
  return e;
}

/** Benachrichtigung + (je nach Einstellung) Mail ohne Inhalte – Standardtexte je Art */
const MAIL = {
  signatur: "Im Portal von ÖkoInvest gibt es Neuigkeiten zu einem Dokument zur elektronischen Unterschrift.",
  termin: "Im Portal von ÖkoInvest gibt es Neuigkeiten zu einem Termin.",
  ticket: "Im Portal von ÖkoInvest gibt es Neuigkeiten zu Ihrer Support-Anfrage.",
  aufgabe: "Ihnen wurde im Backoffice etwas zugewiesen (z. B. als Vertretung). Details finden Sie im Portal.",
};
const BETREFF = { signatur: "Elektronische Unterschrift – ÖkoInvest", termin: "Ihr Termin – ÖkoInvest", ticket: "Ihre Support-Anfrage – ÖkoInvest", aufgabe: "Zuweisung im Backoffice – ÖkoInvest" };

export function melden(db, kontoId, { art, titel, text = "", link = "/portal", objektArt = null, objektId = null }, { mail = true } = {}) {
  const u = kontoId ? nutzerById(db, kontoId) : null;
  if (!u) return null;
  return benachrichtigen(db, u, { art, titel, text, link, objektArt, objektId }, { mail, mailText: MAIL[art], mailBetreff: BETREFF[art] });
}

/** Aktive Backoffice-Konten (für Zuständigkeiten) */
export const backofficeKonten = (db) => db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin"));

export const kontoKurz = (db, id) => {
  const u = id ? nutzerById(db, id) : null;
  return u ? { id: u.id, name: nameVon(db, u.id), email: u.email } : null;
};
