// src/lib/plattform/backend/frappe/anlagen.js
//
// Frappe-Adapter „Anlagen & Monitoring“. Methoden in oekoinvest_app.plattform.api.anlagen – Vertrag: docs/API.md,
// Abschnitt 10. Signaturen identisch zu backend/demo/anlagen.js. Frappe prüft Rolle UND Eigentum selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  anlagen: "anlagen.liste",
  anlage: "anlagen.holen",
  anlagenKunden: "anlagen.kunden",
  anlageAnlegen: "anlagen.anlegen",
  anlageAendern: "anlagen.aendern",
  anlageEintragSpeichern: "anlagen.eintrag_speichern",
  anlageEintragLoeschen: "anlagen.eintrag_loeschen",
  zaehlerMonatswerte: "anlagen.monatswerte",
  geraetZugangAnlegen: "anlagen.geraet_anlegen",
  geraetZugang: "anlagen.geraet",
  geraetZugangAktion: "anlagen.geraet_aktion",
  stoerungen: "anlagen.stoerungen",
  stoerungAnlegen: "anlagen.stoerung_anlegen",
  stoerungAktion: "anlagen.stoerung_aktion",
  anlagenLeitstand: "anlagen.leitstand",
});

export const anlagen = (n, filter = {}) => aufruf("anlagen", filter, n);
export const anlage = (n, id) => aufruf("anlage", { id }, n);
export const anlagenKunden = (n) => aufruf("anlagenKunden", {}, n);
export const anlageAnlegen = (n, daten = {}) => aufruf("anlageAnlegen", { daten }, n);
export const anlageAendern = (n, id, daten = {}) => aufruf("anlageAendern", { id, daten }, n);
export const anlageEintragSpeichern = (n, anlageId, { art, id = null, daten = {} } = {}) => aufruf("anlageEintragSpeichern", { anlageId, art, id, daten }, n);
export const anlageEintragLoeschen = (n, anlageId, { art, id } = {}) => aufruf("anlageEintragLoeschen", { anlageId, art, id }, n);
export const zaehlerMonatswerte = (n, anlageId) => aufruf("zaehlerMonatswerte", { anlageId }, n);
export const geraetZugangAnlegen = (n, anlageId, { bezeichnung = "" } = {}) => aufruf("geraetZugangAnlegen", { anlageId, bezeichnung }, n);
export const geraetZugang = (n, id) => aufruf("geraetZugang", { id }, n);
export const geraetZugangAktion = (n, id, daten = {}) => aufruf("geraetZugangAktion", { id, daten }, n);
export const stoerungen = (n, filter = {}) => aufruf("stoerungen", filter, n);
export const stoerungAnlegen = (n, daten = {}) => aufruf("stoerungAnlegen", { daten }, n);
export const stoerungAktion = (n, id, daten = {}) => aufruf("stoerungAktion", { id, daten }, n);
export const anlagenLeitstand = (n) => aufruf("anlagenLeitstand", {}, n);
/** Im Betrieb meldet der Ingest-Dienst Störungen direkt an Frappe (anlagen.dienst_stoerung) */
export const stoerungSystem = async () => null;
