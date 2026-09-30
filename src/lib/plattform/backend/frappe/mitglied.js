// src/lib/plattform/backend/frappe/mitglied.js
//
// Frappe-Adapter „Mitglied & Genossenschaft“. Methoden in oekoinvest_app.plattform.api.mitglied – Vertrag: docs/API.md,
// Abschnitt „Mitglied & Genossenschaft“. Signaturen identisch zu backend/demo/mitglied.js. Frappe prüft Rolle UND Eigentum selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  mgUebersicht: "mitglied.uebersicht",
  mgBeitritt: "mitglied.beitritt",
  mgAktion: "mitglied.aktion",
  gvDetail: "mitglied.gv_detail",
  gvAbstimmen: "mitglied.gv_abstimmen",
  egBeitreten: "mitglied.eg_beitreten",
  egTeilnahmeAktion: "mitglied.eg_teilnahme_aktion",
  mgDokument: "mitglied.dokument",
  boGeno: "mitglied.bo_geno",
  boGenoSpeichern: "mitglied.bo_geno_speichern",
  boMitgliedAktion: "mitglied.bo_mitglied_aktion",
  boGvSpeichern: "mitglied.bo_gv_speichern",
  boGvAktion: "mitglied.bo_gv_aktion",
  boAusschuettungAnlegen: "mitglied.bo_ausschuettung_anlegen",
  boAusschuettungAktion: "mitglied.bo_ausschuettung_aktion",
  boEg: "mitglied.bo_eg",
  boEgSpeichern: "mitglied.bo_eg_speichern",
  boTeilnahmeAktion: "mitglied.bo_teilnahme_aktion",
  boEgAbrechnen: "mitglied.bo_eg_abrechnen",
});

export const mgUebersicht = (n) => aufruf("mgUebersicht", {}, n);
export const mgBeitritt = (n, genoId, daten = {}, { ip = "" } = {}) => aufruf("mgBeitritt", { genoId, daten, ip }, n);
export const mgAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("mgAktion", { id, daten, ip }, n);
export const gvDetail = (n, gvId) => aufruf("gvDetail", { gvId }, n);
export const gvAbstimmen = (n, gvId, stimmen = {}, { ip = "" } = {}) => aufruf("gvAbstimmen", { gvId, stimmen, ip }, n);
export const egBeitreten = (n, egId, daten = {}, { ip = "" } = {}) => aufruf("egBeitreten", { egId, daten, ip }, n);
export const egTeilnahmeAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("egTeilnahmeAktion", { id, daten, ip }, n);
export const mgDokument = (n, { art = "", id = "" } = {}, { ip = "" } = {}) => aufruf("mgDokument", { art, id, ip }, n);
export const boGeno = (n) => aufruf("boGeno", {}, n);
export const boGenoSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("boGenoSpeichern", { id, daten }, n);
export const boMitgliedAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("boMitgliedAktion", { id, daten, ip }, n);
export const boGvSpeichern = (n, { id = null, genoId = "", daten = {} } = {}) => aufruf("boGvSpeichern", { id, genoId, daten }, n);
export const boGvAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("boGvAktion", { id, daten, ip }, n);
export const boAusschuettungAnlegen = (n, { genoId = "", daten = {} } = {}) => aufruf("boAusschuettungAnlegen", { genoId, daten }, n);
export const boAusschuettungAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("boAusschuettungAktion", { id, daten, ip }, n);
export const boEg = (n) => aufruf("boEg", {}, n);
export const boEgSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("boEgSpeichern", { id, daten }, n);
export const boTeilnahmeAktion = (n, id, daten = {}, { ip = "" } = {}) => aufruf("boTeilnahmeAktion", { id, daten, ip }, n);
export const boEgAbrechnen = (n, egId, { monat = "", messwerte = {} } = {}) => aufruf("boEgAbrechnen", { egId, monat, messwerte }, n);
