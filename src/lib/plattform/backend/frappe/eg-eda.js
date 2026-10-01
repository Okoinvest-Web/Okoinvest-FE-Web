// src/lib/plattform/backend/frappe/eg-eda.js
//
// Frappe-Adapter WP2 „EDA-Marktkommunikation“ – Methoden in oekoinvest_app.plattform.api.eg_eda, Signaturen identisch zu
// backend/demo/eg-eda.js (Vertrag: docs/EG-SCHNITTSTELLEN.md). Frappe prüft Rolle, Kontext-Rolle je Gemeinschaft
// (eg_stamm.zugriff) und Vier-Augen-Prinzip selbst. Der Transport zum Netzbetreiber läuft dort über den Gateway-Dienst
// (Backend-Import/dienste/eda-gateway: E-Mail/KEP bzw. Simulator), Fristen und Wiederholungen im Scheduler (eg_eda_jobs.py).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  edaProzesse: "eg_eda.prozesse",
  edaProzess: "eg_eda.prozess",
  edaAnmelden: "eg_eda.anmelden",
  edaTfAendern: "eg_eda.tf_aendern",
  edaAbmelden: "eg_eda.abmelden",
  edaVerteilschluesselSenden: "eg_eda.verteilschluessel_senden",
  edaPodlistAnfordern: "eg_eda.podlist_anfordern",
  edaNachforderung: "eg_eda.nachforderung",
  edaNachrichtEingang: "eg_eda.nachricht_eingang",
  edaFristenLauf: "eg_eda.fristen_lauf",
  edaGemeinschaftBereit: "eg_eda.gemeinschaft_bereit",
  edaUebersicht: "eg_eda.uebersicht",
  edaJournal: "eg_eda.journal",
  edaFreigaben: "eg_eda.freigaben",
  edaFreigeben: "eg_eda.freigeben",
  edaErneutAnstossen: "eg_eda.erneut_anstossen",
  edaErinnern: "eg_eda.erinnern",
  edaReklamation: "eg_eda.reklamation",
  edaSimulator: "eg_eda.simulator",
  edaAusgang: "eg_eda.ausgang",
  edaAusgangQuittung: "eg_eda.ausgang_quittung",
});

export const edaProzesse = (n, gemeinschaftId, filter = {}) => aufruf("edaProzesse", { gemeinschaftId, filter }, n);
export const edaProzess = (n, id) => aufruf("edaProzess", { id }, n);
export const edaAnmelden = (n, gemeinschaftId, daten = {}) => aufruf("edaAnmelden", { gemeinschaftId, daten }, n);
export const edaTfAendern = (n, gemeinschaftId, daten = {}) => aufruf("edaTfAendern", { gemeinschaftId, daten }, n);
export const edaAbmelden = (n, gemeinschaftId, daten = {}) => aufruf("edaAbmelden", { gemeinschaftId, daten }, n);
export const edaVerteilschluesselSenden = (n, verteilschluesselId) => aufruf("edaVerteilschluesselSenden", { verteilschluesselId }, n);
export const edaPodlistAnfordern = (n, gemeinschaftId) => aufruf("edaPodlistAnfordern", { gemeinschaftId: typeof gemeinschaftId === "object" ? gemeinschaftId?.gemeinschaftId : gemeinschaftId }, n?.system ? null : n);
export const edaNachforderung = (n, daten = {}) => aufruf("edaNachforderung", { daten }, n?.system ? null : n);
export const edaNachrichtEingang = (n, daten = {}) => aufruf("edaNachrichtEingang", { daten }, n?.system ? null : n);
export const edaFristenLauf = (n, daten = {}) => aufruf("edaFristenLauf", { daten }, n?.system ? null : n);
export const edaGemeinschaftBereit = (n, daten = {}) => aufruf("edaGemeinschaftBereit", { daten }, n?.system ? null : n);
export const edaUebersicht = (n, gemeinschaftId) => aufruf("edaUebersicht", { gemeinschaftId }, n);
export const edaJournal = (n, gemeinschaftId, filter = {}) => aufruf("edaJournal", { gemeinschaftId, filter }, n);
export const edaFreigaben = (n, gemeinschaftId) => aufruf("edaFreigaben", { gemeinschaftId }, n);
export const edaFreigeben = (n, gemeinschaftId, daten = {}) => aufruf("edaFreigeben", { gemeinschaftId, daten }, n);
export const edaErneutAnstossen = (n, gemeinschaftId, daten = {}) => aufruf("edaErneutAnstossen", { gemeinschaftId, daten }, n);
export const edaErinnern = (n, gemeinschaftId, daten = {}) => aufruf("edaErinnern", { gemeinschaftId, daten }, n);
export const edaReklamation = (n, gemeinschaftId, daten = {}) => aufruf("edaReklamation", { gemeinschaftId, daten }, n);
export const edaSimulator = (n, gemeinschaftId, daten = {}) => aufruf("edaSimulator", { gemeinschaftId, daten }, n);
export const edaAusgang = (n, daten = {}) => aufruf("edaAusgang", { daten }, null);
export const edaAusgangQuittung = (n, daten = {}) => aufruf("edaAusgangQuittung", { daten }, null);
