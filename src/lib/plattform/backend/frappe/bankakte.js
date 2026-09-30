// src/lib/plattform/backend/frappe/bankakte.js
//
// Frappe-Adapter „Bank-Akte“. Methoden in oekoinvest_app.plattform.api.bankakte – Signaturen identisch zu backend/demo/bankakte.js.
// Frappe prüft Rolle, Bank-Zugehörigkeit und Teamrolle selbst (plattform/bankakte_kern.py = finanzierung/bankakte.js).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  baAkte: "bankakte.akte",
  baStaende: "bankakte.staende",
  baAktion: "bankakte.aktion",
  baDateiSpeichern: "bankakte.datei_speichern",
  baDateiLesen: "bankakte.datei_lesen",
  baBerichtDaten: "bankakte.bericht_daten",
  baTeam: "bankakte.team",
  baTeamAktion: "bankakte.team_aktion",
  baTeamEinladungInfo: "bankakte.team_einladung_info",
  baTeamEinladungAnnehmen: "bankakte.team_einladung_annehmen",
});

export const baAkte = (n, anfrageId) => aufruf("baAkte", { anfrageId }, n);
export const baStaende = (n, { fallId = "" } = {}) => aufruf("baStaende", { fallId }, n);
export const baAktion = (n, anfrageId, daten = {}) => aufruf("baAktion", { anfrageId, daten }, n);
/** Upload als Base64 (≤ 10 MB, Typ bereits an den ersten Bytes geprüft) – Frappe legt die Datei privat ab */
export const baDateiSpeichern = (n, anfrageId, { daten, ...rest } = {}) => aufruf("baDateiSpeichern", { anfrageId, ...rest, inhalt: Buffer.from(daten).toString("base64") }, n);
export async function baDateiLesen(n, anfrageId, dateiId, { ip = "" } = {}) {
  const r = await aufruf("baDateiLesen", { anfrageId, dateiId, ip }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const baBerichtDaten = (n, anfrageId, berichtId, { ip = "" } = {}) => aufruf("baBerichtDaten", { anfrageId, berichtId, ip }, n);
export const baTeam = (n, { bankId = "" } = {}) => aufruf("baTeam", { bankId }, n);
export const baTeamAktion = (n, daten = {}) => aufruf("baTeamAktion", { daten }, n);
export const baTeamEinladungInfo = (token) => aufruf("baTeamEinladungInfo", { token });
export const baTeamEinladungAnnehmen = (n, token) => aufruf("baTeamEinladungAnnehmen", { token }, n);
