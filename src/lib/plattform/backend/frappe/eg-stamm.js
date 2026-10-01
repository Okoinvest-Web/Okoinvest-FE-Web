// src/lib/plattform/backend/frappe/eg-stamm.js
//
// Frappe-Adapter WP1 „Kern-Stammdaten“ des Moduls Energiegemeinschaften. Methoden in oekoinvest_app.plattform.api.eg_stamm –
// Signaturen identisch zu backend/demo/eg-stamm.js (Vertrag: docs/EG-SCHNITTSTELLEN.md). Frappe prüft Rolle, Kontext-Rolle
// je Gemeinschaft (eg_stamm_kern.rollen_von) und Bereich „eg“ der Rechte-Matrix selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  egKontext: "eg_stamm.kontext",
  egGemeinschaften: "eg_stamm.gemeinschaften",
  egGemeinschaft: "eg_stamm.gemeinschaft",
  egGemeinschaftSpeichern: "eg_stamm.gemeinschaft_speichern",
  egGemeinschaftStatus: "eg_stamm.gemeinschaft_status",
  egOrganSpeichern: "eg_stamm.organ_speichern",
  egOrganBeenden: "eg_stamm.organ_beenden",
  egMitgliedSpeichern: "eg_stamm.mitglied_speichern",
  egMitgliedStatus: "eg_stamm.mitglied_status",
  egZaehlpunktSpeichern: "eg_stamm.zaehlpunkt_speichern",
  egTeilnahmeSpeichern: "eg_stamm.teilnahme_speichern",
  egTeilnahmeUebergang: "eg_stamm.teilnahme_uebergang",
  egAnlageSpeichern: "eg_stamm.anlage_speichern",
  egTarifSpeichern: "eg_stamm.tarif_speichern",
  egVerteilschluesselSpeichern: "eg_stamm.verteilschluessel_speichern",
  egVerteilschluesselStatus: "eg_stamm.verteilschluessel_status",
  egMassenaktion: "eg_stamm.massenaktion",
  egCsvImport: "eg_stamm.csv_import",
  egCsvExport: "eg_stamm.csv_export",
  egNetzbetreiber: "eg_stamm.netzbetreiber",
  egNetzentgeltRegeln: "eg_stamm.netzentgelt_regeln",
  egVerwaltung: "eg_stamm.verwaltung",
  egMigrationVorschau: "eg_stamm.migration_vorschau",
  egMigrationAusfuehren: "eg_stamm.migration_ausfuehren",
});

export const egKontext = (n, { gemeinschaftId = "" } = {}) => aufruf("egKontext", { gemeinschaftId }, n);
export const egGemeinschaften = (n, filter = {}) => aufruf("egGemeinschaften", { filter }, n);
export const egGemeinschaft = (n, id) => aufruf("egGemeinschaft", { id }, n);
export const egGemeinschaftSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("egGemeinschaftSpeichern", { id, daten }, n);
export const egGemeinschaftStatus = (n, id, daten = {}) => aufruf("egGemeinschaftStatus", { id, daten }, n);
export const egOrganSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egOrganSpeichern", { gemeinschaftId, id, daten }, n);
export const egOrganBeenden = (n, id, daten = {}) => aufruf("egOrganBeenden", { id, daten }, n);
export const egMitgliedSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egMitgliedSpeichern", { gemeinschaftId, id, daten }, n);
export const egMitgliedStatus = (n, id, daten = {}) => aufruf("egMitgliedStatus", { id, daten }, n);
export const egZaehlpunktSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egZaehlpunktSpeichern", { gemeinschaftId, id, daten }, n);
export const egTeilnahmeSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egTeilnahmeSpeichern", { gemeinschaftId, id, daten }, n);
export const egTeilnahmeUebergang = (n, teilnahmeId, daten = {}) => aufruf("egTeilnahmeUebergang", { teilnahmeId, daten }, n);
export const egAnlageSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egAnlageSpeichern", { gemeinschaftId, id, daten }, n);
export const egTarifSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egTarifSpeichern", { gemeinschaftId, id, daten }, n);
export const egVerteilschluesselSpeichern = (n, { gemeinschaftId = "", id = null, daten = {} } = {}) => aufruf("egVerteilschluesselSpeichern", { gemeinschaftId, id, daten }, n);
export const egVerteilschluesselStatus = (n, id, daten = {}) => aufruf("egVerteilschluesselStatus", { id, daten }, n);
export const egMassenaktion = (n, gemeinschaftId, daten = {}) => aufruf("egMassenaktion", { gemeinschaftId, daten }, n);
export const egCsvImport = (n, gemeinschaftId, daten = {}) => aufruf("egCsvImport", { gemeinschaftId, daten }, n);
export const egCsvExport = (n, gemeinschaftId, { art = "" } = {}) => aufruf("egCsvExport", { gemeinschaftId, art }, n);
export const egNetzbetreiber = (n) => aufruf("egNetzbetreiber", {}, n);
export const egNetzentgeltRegeln = (n, { stichtag = "" } = {}) => aufruf("egNetzentgeltRegeln", { stichtag }, n);
export const egVerwaltung = (n, gemeinschaftId) => aufruf("egVerwaltung", { gemeinschaftId }, n);
export const egMigrationVorschau = (n) => aufruf("egMigrationVorschau", {}, n);
export const egMigrationAusfuehren = (n) => aufruf("egMigrationAusfuehren", {}, n);
