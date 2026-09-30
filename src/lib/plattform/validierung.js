// src/lib/plattform/validierung.js
//
// Eingaben bereinigen – jede API übernimmt Felder nur über diese Helfer
// (Positivliste statt „alles speichern“). Client- und serverseitig nutzbar.

import { ungueltig } from "./fehler";

const STEUER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Einzeiliger Text: Steuerzeichen und Zeilenumbrüche raus, gekürzt */
export function text(v, max = 200) {
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v).replace(STEUER, "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}

/** Mehrzeiliger Text (Beschreibungen, Nachrichten) */
export function mehrzeilig(v, max = 5000) {
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v).replace(STEUER, "").replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max);
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function email(v) {
  const e = text(v, 190).toLowerCase();
  return EMAIL.test(e) ? e : "";
}

/** Zahl in Grenzen oder null */
export function zahl(v, { min = -Infinity, max = Infinity, stellen } = {}) {
  if (v === undefined || v === null || v === "" || typeof v === "object") return null;
  let s = typeof v === "number" ? "" : String(v).replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, ""); // eindeutige Tausenderpunkte (1.500.000 / 2.500,50)
  const n = typeof v === "number" ? v : Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return stellen === undefined ? n : Math.round(n * 10 ** stellen) / 10 ** stellen;
}

export function auswahl(v, erlaubt, standard = "") {
  const liste = Array.isArray(erlaubt) ? erlaubt : Object.keys(erlaubt);
  return liste.includes(v) ? v : standard;
}

export function mehrfach(v, erlaubt) {
  const liste = Array.isArray(erlaubt) ? erlaubt : Object.keys(erlaubt);
  return Array.isArray(v) ? [...new Set(v.filter((x) => liste.includes(x)))] : [];
}

export const wahr = (v) => v === true || v === "true" || v === "on" || v === 1;

export function textListe(v, { max = 10, laenge = 160 } = {}) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => text(x, laenge)).filter(Boolean).slice(0, max);
}

/** Datum im Format JJJJ-MM oder JJJJ (geplante Inbetriebnahme) */
export function monat(v) {
  const s = text(v, 7);
  return /^20\d\d(-(0[1-9]|1[0-2]))?$/.test(s) ? s : "";
}

export function plz(v) {
  const s = text(v, 10);
  return /^[0-9A-Za-z -]{3,10}$/.test(s) ? s : "";
}

/** Passwortregeln – liefert Fehlermeldung oder "" */
export function passwortFehler(pw) {
  const p = typeof pw === "string" ? pw : "";
  if (p.length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";
  if (p.length > 200) return "Das Passwort ist zu lang.";
  if (!/[A-Za-zÄÖÜäöüß]/.test(p) || !/[^A-Za-zÄÖÜäöüß]/.test(p)) {
    return "Bitte verwenden Sie Buchstaben und mindestens eine Ziffer oder ein Sonderzeichen.";
  }
  return "";
}

/** Wirft 422, wenn Bedingung nicht erfüllt */
export function pflicht(bedingung, meldung) {
  if (!bedingung) throw ungueltig(meldung);
}

/** Interne Kennungen (z. B. V-26-AB12CD) */
export const kennung = (v) => (/^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(String(v || "")) ? String(v) : "");

/** URL-Slug */
export const slug = (v) => (/^[a-z0-9-]{3,120}$/.test(String(v || "")) ? String(v) : "");
