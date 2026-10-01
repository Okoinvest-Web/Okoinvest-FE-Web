// src/lib/plattform/backend/frappe/eg-abrechnung.js
//
// Frappe-Adapter WP4 „Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung“. Methoden in oekoinvest_app.plattform.api.eg_abrechnung –
// Signaturen identisch zu backend/demo/eg-abrechnung.js (Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4). Frappe prüft Rolle,
// Kontext-Rolle je Gemeinschaft (eg_stamm_kern.eg_rollen/eg_stufe) und Vier-Augen selbst; Regeln: plattform/eg_abrechnung_kern.py.
// abBelegPdf liefert die Belegdaten – das PDF rendert die API-Route mit eg/beleg-pdf.js (gleiches Layout wie Demo).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  abPerioden: "eg_abrechnung.perioden",
  abPeriodeAnlegen: "eg_abrechnung.periode_anlegen",
  abPeriodeAktion: "eg_abrechnung.periode_aktion",
  abBelege: "eg_abrechnung.belege",
  abBelegPdf: "eg_abrechnung.beleg_pdf",
  abZahlungslauf: "eg_abrechnung.zahlungslauf",
  abZahlungslaufAktion: "eg_abrechnung.zahlungslauf_aktion",
  abCamtImport: "eg_abrechnung.camt_import",
  abZahlungErfassen: "eg_abrechnung.zahlung_erfassen",
  abMahnlauf: "eg_abrechnung.mahnlauf",
  abMandate: "eg_abrechnung.mandate",
  abBuchungen: "eg_abrechnung.buchungen",
  abBuchungSpeichern: "eg_abrechnung.buchung_speichern",
  abPruefvermerk: "eg_abrechnung.pruefvermerk",
  abExport: "eg_abrechnung.export",
  abKleinunternehmer: "eg_abrechnung.kleinunternehmer",
  abJahresbescheinigung: "eg_abrechnung.jahresbescheinigung",
  abEinstellungenSpeichern: "eg_abrechnung.einstellungen_speichern",
});

export const abPerioden = (n, gemeinschaftId) => aufruf("abPerioden", { gemeinschaftId }, n);
export const abPeriodeAnlegen = (n, gemeinschaftId, daten = {}) => aufruf("abPeriodeAnlegen", { gemeinschaftId, daten }, n);
export const abPeriodeAktion = (n, id, daten = {}) => aufruf("abPeriodeAktion", { id, daten }, n);
export const abBelege = (n, filter = {}) => aufruf("abBelege", { filter }, n);
export const abBelegPdf = (n, id) => aufruf("abBelegPdf", { id }, n);
export const abZahlungslauf = (n, gemeinschaftId, daten = {}) => aufruf("abZahlungslauf", { gemeinschaftId, daten }, n);
export const abZahlungslaufAktion = (n, id, daten = {}) => aufruf("abZahlungslaufAktion", { id, daten }, n);
export const abCamtImport = (n, gemeinschaftId, daten = {}) => aufruf("abCamtImport", { gemeinschaftId, daten }, n);
export const abZahlungErfassen = (n, id, daten = {}) => aufruf("abZahlungErfassen", { id, daten }, n);
export const abMahnlauf = (n, gemeinschaftId, daten = {}) => aufruf("abMahnlauf", { gemeinschaftId, daten }, n);
export const abMandate = (n, gemeinschaftId) => aufruf("abMandate", { gemeinschaftId }, n);
export const abBuchungen = (n, gemeinschaftId, { jahr = "" } = {}) => aufruf("abBuchungen", { gemeinschaftId, jahr }, n);
export const abBuchungSpeichern = (n, gemeinschaftId, { daten = {} } = {}) => aufruf("abBuchungSpeichern", { gemeinschaftId, daten }, n);
export const abPruefvermerk = (n, gemeinschaftId, { daten = {} } = {}) => aufruf("abPruefvermerk", { gemeinschaftId, daten }, n);
export const abExport = (n, gemeinschaftId, { art = "ea", jahr = "" } = {}) => aufruf("abExport", { gemeinschaftId, art, jahr }, n);
export const abKleinunternehmer = (n, gemeinschaftId) => aufruf("abKleinunternehmer", { gemeinschaftId }, n);
export const abJahresbescheinigung = (n, mitgliedId, { jahr = "" } = {}) => aufruf("abJahresbescheinigung", { mitgliedId, jahr }, n);
export const abEinstellungenSpeichern = (n, gemeinschaftId, { daten = {} } = {}) => aufruf("abEinstellungenSpeichern", { gemeinschaftId, daten }, n);
