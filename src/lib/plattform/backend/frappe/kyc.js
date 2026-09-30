// src/lib/plattform/backend/frappe/kyc.js
//
// Frappe-Adapter „KYC/KYB“. Methoden in oekoinvest_app.plattform.api.kyc – Vertrag: docs/API.md, Abschnitt „KYC/KYB“.
// Signaturen identisch zu backend/demo/kyc.js. Frappe prüft Rolle, Eigentum und Compliance-Unterrolle selbst;
// Unterlagen verschlüsselt Frappe (privates File + AES-256-GCM, plattform/kyc_kern.py).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  kycFall: "kyc.fall",
  kycSpeichern: "kyc.speichern",
  kycDokumentSpeichern: "kyc.dokument_speichern",
  kycDokumentLesen: "kyc.dokument_lesen",
  kycDokumentLoeschen: "kyc.dokument_loeschen",
  kycEinreichen: "kyc.einreichen",
  kycErneut: "kyc.erneut",
  kycStatus: "kyc.status",
  kycFreigabePruefen: "kyc.freigabe",
  kycWarteschlange: "kyc.warteschlange",
  kycFallDetail: "kyc.fall_detail",
  kycAktion: "kyc.aktion",
  kycEinstellungen: "kyc.einstellungen",
  kycEinstellungenSpeichern: "kyc.einstellungen_speichern",
  kycSanktionsliste: "kyc.sanktionsliste",
  kycSanktionPruefen: "kyc.sanktion_pruefen",
  kycFristen: "kyc.fristen",
  kycErgebnisAnhaengen: "kyc.ergebnis_anhaengen",
});

export const kycFall = (n) => aufruf("kycFall", {}, n);
export const kycSpeichern = (n, { abschnitt, daten = {} } = {}) => aufruf("kycSpeichern", { abschnitt, daten }, n);
export const kycDokumentSpeichern = (n, { daten, ...meta } = {}) => aufruf("kycDokumentSpeichern", { ...meta, inhaltBase64: Buffer.from(daten).toString("base64") }, n);
export async function kycDokumentLesen(n, id, { ip = "" } = {}) {
  const r = await aufruf("kycDokumentLesen", { id, ip }, n);
  return { meta: r.meta, daten: Buffer.from(r.inhaltBase64 || "", "base64") };
}
export const kycDokumentLoeschen = (n, id) => aufruf("kycDokumentLoeschen", { id }, n);
export const kycEinreichen = (n, { ip = "" } = {}) => aufruf("kycEinreichen", { ip }, n);
export const kycErneut = (n) => aufruf("kycErneut", {}, n);
/** n = null: Systemaufruf des API-Nutzers (nur Status, keine Personendaten) */
export const kycStatus = (n, { kontoId = null, organisationId = null } = {}) => aufruf("kycStatus", { kontoId, organisationId }, n);
export const kycFreigabePruefen = (n, daten = {}) => aufruf("kycFreigabePruefen", daten, n);
export const kycFreigabeSystem = (schritt, daten = {}) => aufruf("kycFreigabePruefen", { schritt, ...daten }, null);
export const kycWarteschlange = (n, filter = {}) => aufruf("kycWarteschlange", filter, n);
export const kycFallDetail = (n, id, { ip = "" } = {}) => aufruf("kycFallDetail", { id, ip }, n);
export const kycAktion = (n, id, daten = {}) => aufruf("kycAktion", { id, daten }, n);
export const kycEinstellungen = (n) => aufruf("kycEinstellungen", {}, n);
export const kycEinstellungenSpeichern = (n, daten = {}) => aufruf("kycEinstellungenSpeichern", { daten }, n);
export const kycSanktionsliste = (n) => aufruf("kycSanktionsliste", {}, n);
export const kycSanktionPruefen = (n, daten = {}) => aufruf("kycSanktionPruefen", daten, n);
export const kycFristen = (n, { stichtag = null, fallId = null } = {}) => aufruf("kycFristen", { stichtag, fallId }, n);
/** Systemaufruf (API-Nutzer): externes Prüfergebnis anhängen – fall: "KY-…" oder { kontoId } / { organisationId } */
export const kycErgebnisAnhaengen = (fall, eintrag = {}) => aufruf("kycErgebnisAnhaengen", { ...(typeof fall === "string" ? { fallId: fall } : fall || {}), eintrag }, null);
