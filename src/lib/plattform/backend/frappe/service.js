// src/lib/plattform/backend/frappe/service.js
//
// Frappe-Adapter „Dokumente, Signatur, Termine, Service & HR“. Methoden in oekoinvest_app.plattform.api.{signatur,termine,
// support,hr} – Vertrag: docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Signaturen identisch zu backend/demo/service.js. Frappe prüft
// Rolle UND Eigentum selbst; Dateien werden base64-kodiert übertragen.
//
// Signiertes PDF: Nach der letzten Unterschrift meldet Frappe `abschlussNoetig`. Die Website erzeugt die Prüfseite und
// hängt sie per inkrementellem Update an (signatur/pruefseite.js – gleicher Code wie im Demo-Backend) und übergibt das
// Ergebnis an `signatur.abschliessen`. Frappe prüft, dass die Datei mit den unveränderten Originalbytes beginnt
// (SHA-256 des Präfixes = protokollierte Prüfsumme), und speichert Datei und Prüfsumme.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { signiertesPdf } from "../../signatur/pruefseite";

Object.assign(METHODEN, {
  signaturen: "signatur.liste",
  signatur: "signatur.holen",
  signaturAnlegen: "signatur.anlegen",
  signaturCodeAnfordern: "signatur.code_anfordern",
  signaturUnterschreiben: "signatur.unterschreiben",
  signaturAbschlussDaten: "signatur.abschluss_daten",
  signaturAbschliessen: "signatur.abschliessen",
  signaturAblehnen: "signatur.ablehnen",
  signaturWiderrufen: "signatur.widerrufen",
  signaturErinnern: "signatur.erinnern",
  signaturDatei: "signatur.datei",
  signaturEinstellungen: "signatur.einstellungen",
  signaturEinstellungenSpeichern: "signatur.einstellungen_speichern",
  signaturStandard: "signatur.standard",
  terminSlots: "termine.slots",
  terminBuchen: "termine.buchen",
  termine: "termine.liste",
  termin: "termine.holen",
  terminIcs: "termine.ics",
  terminAendern: "termine.aendern",
  terminPerToken: "termine.per_token",
  terminPerTokenAendern: "termine.per_token_aendern",
  verfuegbarkeiten: "termine.verfuegbarkeiten",
  verfuegbarkeitSpeichern: "termine.verfuegbarkeit_speichern",
  tickets: "support.liste",
  ticket: "support.holen",
  ticketAnlegen: "support.anlegen",
  ticketAntworten: "support.antworten",
  ticketAktion: "support.aktion",
  ticketAusStoerung: "support.aus_stoerung",
  ticketAnhangSpeichern: "support.anhang_speichern",
  ticketAnhangLesen: "support.anhang_lesen",
  ticketKennzahlen: "support.kennzahlen",
  team: "hr.team",
  mitarbeiterSpeichern: "hr.mitarbeiter_speichern",
  abwesenheiten: "hr.abwesenheiten",
  abwesenheitAnlegen: "hr.abwesenheit_anlegen",
  abwesenheitLoeschen: "hr.abwesenheit_loeschen",
  vertretung: "hr.vertretung",
  zeiten: "hr.zeiten",
  zeitErfassen: "hr.zeit_erfassen",
  zeitLoeschen: "hr.zeit_loeschen",
  zeitenAuswertung: "hr.zeiten_auswertung",
  wissen: "hr.wissen",
  wissenArtikel: "hr.wissen_artikel",
  wissenSpeichern: "hr.wissen_speichern",
  wissenLoeschen: "hr.wissen_loeschen",
  ablageStatus: "hr.integrationen",
});

// ---------------------------------------------------------------- Signatur
export const signaturen = (n, filter = {}) => aufruf("signaturen", filter, n);
export const signatur = (n, id) => aufruf("signatur", { id }, n);
export const signaturAnlegen = (n, { pdf, ...daten } = {}, { ip = "" } = {}) =>
  aufruf("signaturAnlegen", { daten: { ...daten, ...(pdf ? { pdfBase64: Buffer.from(pdf).toString("base64") } : {}) }, ip }, n);
export const signaturCodeAnfordern = (n, id, { ip = "", userAgent = "" } = {}) => aufruf("signaturCodeAnfordern", { id, ip, userAgent }, n);

/** Abschluss: Prüfseite erzeugen, anhängen, an Frappe übergeben (idempotent – Frappe lehnt doppelte Abschlüsse ab) */
async function abschliessen(n, id) {
  const d = await aufruf("signaturAbschlussDaten", { id }, n);
  const original = Buffer.from(d.originalBase64 || "", "base64");
  const r = signiertesPdf(original, d.vorgang, { erzeugtAm: d.vorgang.abgeschlossenAm });
  return aufruf("signaturAbschliessen", { id, pdfBase64: r.pdf.toString("base64"), sha256: r.sha256 }, n);
}

export async function signaturUnterschreiben(n, id, daten = {}) {
  const r = await aufruf("signaturUnterschreiben", { id, daten }, n);
  if (r?.abschlussNoetig) r.vorgang = await abschliessen(n, id);
  return r;
}
export const signaturAblehnen = (n, id, daten = {}) => aufruf("signaturAblehnen", { id, ...daten }, n);
export const signaturWiderrufen = (n, id, daten = {}) => aufruf("signaturWiderrufen", { id, ...daten }, n);
export const signaturErinnern = (n, id) => aufruf("signaturErinnern", { id }, n);
export async function signaturDatei(n, id, { variante = "original", ip = "" } = {}) {
  const r = await aufruf("signaturDatei", { id, variante, ip }, n);
  return { name: r.name, mime: r.mime || "application/pdf", daten: Buffer.from(r.inhaltBase64 || "", "base64") };
}
export const signaturEinstellungen = (n) => aufruf("signaturEinstellungen", {}, n);
export const signaturEinstellungenSpeichern = (n, daten = {}) => aufruf("signaturEinstellungenSpeichern", { daten }, n);
export const signaturStandard = (n, daten = {}) => aufruf("signaturStandard", daten, n);

// ---------------------------------------------------------------- Termine
export const terminSlots = (n, filter = {}) => aufruf("terminSlots", filter, n || null);
export const terminBuchen = (n, daten = {}, { ip = "" } = {}) => aufruf("terminBuchen", { daten, ip }, n || null);
export const termine = (n, filter = {}) => aufruf("termine", filter, n);
export const termin = (n, id) => aufruf("termin", { id }, n);
export async function terminIcs(n, id) {
  const r = await aufruf("terminIcs", { id }, n);
  return String(r?.ics || "");
}
export const terminAendern = (n, id, daten = {}) => aufruf("terminAendern", { id, daten }, n);
export const terminPerToken = (token) => aufruf("terminPerToken", { token });
export const terminPerTokenAendern = (token, daten = {}) => aufruf("terminPerTokenAendern", { token, daten });
export const verfuegbarkeiten = (n) => aufruf("verfuegbarkeiten", {}, n);
export const verfuegbarkeitSpeichern = (n, kontoId, daten = {}) => aufruf("verfuegbarkeitSpeichern", { kontoId, daten }, n);

// ---------------------------------------------------------------- Tickets
export const tickets = (n, filter = {}) => aufruf("tickets", filter, n);
export const ticket = (n, id) => aufruf("ticket", { id }, n);
/** Frappe prüft den Anlagen-Zugriff selbst (anlagePruefen der Demo entfällt) */
export const ticketAnlegen = (n, daten = {}) => aufruf("ticketAnlegen", { daten }, n);
export const ticketAntworten = (n, id, daten = {}) => aufruf("ticketAntworten", { id, ...daten }, n);
export const ticketAktion = (n, id, daten = {}) => aufruf("ticketAktion", { id, daten }, n);
export const ticketAusStoerung = (n, stoerungId) => aufruf("ticketAusStoerung", { stoerungId }, n);
export const ticketAnhangSpeichern = (n, id, { name, mime, daten }) => aufruf("ticketAnhangSpeichern", { id, name, mime, inhaltBase64: Buffer.from(daten).toString("base64") }, n);
export async function ticketAnhangLesen(n, id, anhangId) {
  const r = await aufruf("ticketAnhangLesen", { id, anhangId }, n);
  return { meta: r.meta, daten: Buffer.from(r.inhaltBase64 || "", "base64") };
}
export const ticketKennzahlen = (n) => aufruf("ticketKennzahlen", {}, n);

// ---------------------------------------------------------------- HR & Wissen
export const team = (n) => aufruf("team", {}, n);
export const mitarbeiterSpeichern = (n, kontoId, daten = {}) => aufruf("mitarbeiterSpeichern", { kontoId, daten }, n);
export const abwesenheiten = (n, filter = {}) => aufruf("abwesenheiten", filter, n);
export const abwesenheitAnlegen = (n, daten = {}) => aufruf("abwesenheitAnlegen", { daten }, n);
export const abwesenheitLoeschen = (n, id) => aufruf("abwesenheitLoeschen", { id }, n);
export const vertretung = (n, filter = {}) => aufruf("vertretung", filter, n);
export const zeiten = (n, filter = {}) => aufruf("zeiten", filter, n);
export const zeitErfassen = (n, daten = {}) => aufruf("zeitErfassen", { daten }, n);
export const zeitLoeschen = (n, id) => aufruf("zeitLoeschen", { id }, n);
export const zeitenAuswertung = (n, filter = {}) => aufruf("zeitenAuswertung", filter, n);
export const wissen = (n, filter = {}) => aufruf("wissen", filter, n);
export const wissenArtikel = (n, id) => aufruf("wissenArtikel", { id }, n);
export const wissenSpeichern = (n, daten = {}) => aufruf("wissenSpeichern", { daten }, n);
export const wissenLoeschen = (n, id) => aufruf("wissenLoeschen", { id }, n);
export const ablageStatus = (n) => aufruf("ablageStatus", {}, n);
