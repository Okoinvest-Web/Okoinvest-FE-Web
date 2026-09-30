// src/lib/plattform/backend/frappe/kycIdent.js
//
// Frappe-Adapter „KYC – Eigene Identifizierung“ (Videoidentifizierung). Methoden in oekoinvest_app.plattform.api.kyc_ident –
// Signaturen identisch zu backend/demo/kycIdent.js. Frappe prüft Rolle, Eigentum und Compliance-Unterrolle selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  kycVideo: "kyc_ident.video",
  kycVideoBuchen: "kyc_ident.video_buchen",
  kycVideoStornieren: "kyc_ident.video_stornieren",
  kycVideoAktion: "kyc_ident.video_aktion",
  kycVideoProtokoll: "kyc_ident.video_protokoll",
});

export const kycVideo = (n, { von = "", bis = "" } = {}) => aufruf("kycVideo", { von, bis }, n);
export const kycVideoBuchen = (n, { start } = {}) => aufruf("kycVideoBuchen", { start }, n);
export const kycVideoStornieren = (n) => aufruf("kycVideoStornieren", {}, n);
export const kycVideoAktion = (n, fallId, daten = {}) => aufruf("kycVideoAktion", { id: fallId, daten }, n);
export const kycVideoProtokoll = (n, fallId, protokollId, { ip = "" } = {}) => aufruf("kycVideoProtokoll", { id: fallId, protokollId, ip }, n);
