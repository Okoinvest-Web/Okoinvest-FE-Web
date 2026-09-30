// src/lib/plattform/backend/frappe/closing.js
//
// Frappe-Adapter „Grundbuch & Closing“. Methoden in oekoinvest_app.plattform.api.closing – Vertrag: docs/API.md, Abschnitt
// „Grundbuch & Closing“. Signaturen identisch zu backend/demo/closing.js. Frappe prüft Rolle UND Eigentum selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  gbListe: "closing.gb_liste",
  gbMeine: "closing.gb_meine",
  gbZuBezug: "closing.gb_zu_bezug",
  gbAkte: "closing.gb_akte",
  gbAuswahl: "closing.gb_auswahl",
  gbAnlegen: "closing.gb_anlegen",
  gbAendern: "closing.gb_aendern",
  gbSchritt: "closing.gb_schritt",
  gbSignatur: "closing.gb_signatur",
  gbDokumentSpeichern: "closing.gb_dokument_speichern",
  gbDokumentLesen: "closing.gb_dokument_lesen",
  gbMusterDaten: "closing.gb_muster_daten",
  gbFristenLauf: "closing.gb_fristen_lauf",
  clListe: "closing.cl_liste",
  clMeine: "closing.cl_meine",
  clAkte: "closing.cl_akte",
  clAnlegen: "closing.cl_anlegen",
  clAendern: "closing.cl_aendern",
  clAktion: "closing.cl_aktion",
  clPortalAktion: "closing.cl_portal_aktion",
  clDokumentDaten: "closing.cl_dokument_daten",
  clTermin: "closing.cl_termin",
});

export const gbListe = (n, filter = {}) => aufruf("gbListe", filter, n);
export const gbMeine = (n) => aufruf("gbMeine", {}, n);
export const gbZuBezug = (n, { bezugArt = "", bezugId = "" } = {}) => aufruf("gbZuBezug", { bezugArt, bezugId }, n);
export const gbAkte = (n, id) => aufruf("gbAkte", { id }, n);
export const gbAuswahl = (n) => aufruf("gbAuswahl", {}, n);
export const gbAnlegen = (n, daten = {}) => aufruf("gbAnlegen", { daten }, n);
export const gbAendern = (n, id, daten = {}) => aufruf("gbAendern", { id, daten }, n);
export const gbSchritt = (n, id, daten = {}) => aufruf("gbSchritt", { id, daten }, n);
/** PDF (Muster) als Base64 – Frappe legt den Signaturvorgang über plattform/api/signatur an */
export const gbSignatur = (n, id, { pdf, dateiname = "", ip = "" } = {}) => aufruf("gbSignatur", { id, dateiname, ip, pdfBase64: Buffer.from(pdf || []).toString("base64") }, n);
export const gbDokumentSpeichern = (n, id, { daten, ...rest } = {}) => aufruf("gbDokumentSpeichern", { id, ...rest, inhalt: Buffer.from(daten || []).toString("base64") }, n);
export async function gbDokumentLesen(n, id, dokId, { ip = "" } = {}) {
  const r = await aufruf("gbDokumentLesen", { id, dokId, ip }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const gbMusterDaten = (n, id, { vorlage = "", ip = "" } = {}) => aufruf("gbMusterDaten", { id, vorlage, ip }, n);
export const gbFristenLauf = (n) => aufruf("gbFristenLauf", {}, n);
export const clListe = (n, filter = {}) => aufruf("clListe", filter, n);
export const clMeine = (n) => aufruf("clMeine", {}, n);
export const clAkte = (n, id) => aufruf("clAkte", { id }, n);
export const clAnlegen = (n, daten = {}) => aufruf("clAnlegen", { daten }, n);
export const clAendern = (n, id, daten = {}) => aufruf("clAendern", { id, daten }, n);
export const clAktion = (n, id, daten = {}) => aufruf("clAktion", { id, daten }, n);
export const clPortalAktion = (n, id, daten = {}) => aufruf("clPortalAktion", { id, daten }, n);
export const clDokumentDaten = (n, id, { art = "spa", ip = "" } = {}) => aufruf("clDokumentDaten", { id, art, ip }, n);
export const clTermin = (n, id) => aufruf("clTermin", { id }, n);
