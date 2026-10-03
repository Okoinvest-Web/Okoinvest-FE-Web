// src/lib/bericht/token.js
//
// Bericht-Baustein (Welle 2, Paket B4): Token für Double-Opt-in und Berichtslink.
//  - Zufällig, 32 Byte (base64url, 43 Zeichen). Der Klartext steht NUR im Link der E-Mail.
//  - Gespeichert wird ausschließlich der SHA-256-Hash (Hex, 64 Zeichen).
//  - Ein Token für beides: vor der Bestätigung öffnet der Link die Bestätigungsseite (Knopf → POST),
//    danach dieselbe Adresse den Bericht. So bestätigen Mail-Scanner (GET) nie automatisch.
//
// Fristen (TODO Datenschutz/Rechtsabteilung: Fristen bestätigen bzw. je Land festlegen):
//  - Bestätigung: 48 Stunden ab Anforderung, danach verfällt die Anforderung (Personendaten werden gelöscht).
//  - Berichtslink: 30 Tage ab Bestätigung, danach 410 „abgelaufen“.

import { createHash, randomBytes } from "node:crypto";

export const BESTAETIGUNG_STUNDEN = 48;
export const BERICHT_TAGE = 30;
const STUNDE = 3600 * 1000;

export const TOKEN_MUSTER = /^[A-Za-z0-9_-]{43}$/;
export const HASH_MUSTER = /^[0-9a-f]{64}$/;

/** Neues Token + Hash. Nur der Hash wird gespeichert. */
export function tokenErzeugen() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token) };
}

/** SHA-256 eines formal gültigen Tokens, sonst null (kein Hash für Müll-Eingaben) */
export function tokenHash(token) {
  if (typeof token !== "string" || !TOKEN_MUSTER.test(token)) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const ms = (iso) => (iso ? Date.parse(iso) : NaN);

/** Ablauf der Bestätigung ab Anforderung (ISO) */
export const bestaetigungBis = (ab = new Date()) => new Date(new Date(ab).getTime() + BESTAETIGUNG_STUNDEN * STUNDE).toISOString();
/** Ablauf des Berichtslinks ab Bestätigung (ISO) */
export const berichtBis = (ab = new Date()) => new Date(new Date(ab).getTime() + BERICHT_TAGE * 24 * STUNDE).toISOString();

/**
 * Zustand eines gespeicherten Berichts:
 *   "offen"            angefordert, Bestätigung ausstehend (und nicht abgelaufen)
 *   "in_bestaetigung"  Bestätigung läuft gerade (Sperre gegen doppelte Vorgänge)
 *   "bestaetigt"       Bericht abrufbar
 *   "abgelaufen"       Bestätigungs- oder Berichtsfrist vorbei (→ HTTP 410)
 */
export function berichtZustand(eintrag, jetzt = Date.now()) {
  if (!eintrag) return null;
  const t = typeof jetzt === "number" ? jetzt : new Date(jetzt).getTime();
  const ablauf = ms(eintrag.ablauf);
  if (!Number.isFinite(ablauf) || t > ablauf) return "abgelaufen";
  if (eintrag.bestaetigtAm) return "bestaetigt";
  if (eintrag.status === "in_bestaetigung") return "in_bestaetigung";
  return "offen";
}
