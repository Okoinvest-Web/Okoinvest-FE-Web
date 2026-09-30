// src/lib/plattform/backend/frappe/pachtakte.js
//
// Frappe-Adapter „Pachtakte“ (Methoden in oekoinvest_app.plattform.api.pachtakte). Signaturen identisch zu
// backend/demo/pachtakte.js. Frappe prüft Rolle UND Eigentum selbst (als_benutzer) sowie den Bereich „pachtakte“.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  meinePachtakte: "pachtakte.meine",
  anliegenAnlegen: "pachtakte.anliegen_anlegen",
  anliegenAktion: "pachtakte.anliegen_aktion",
  agriNachweisSpeichern: "pachtakte.agri_speichern",
  agriNachweisAktion: "pachtakte.agri_aktion",
  rueckbauAktion: "pachtakte.rueckbau_aktion",
  jahresbescheinigungDaten: "pachtakte.jahresbescheinigung",
  pachtakteBackoffice: "pachtakte.backoffice",
});

export const meinePachtakte = (n) => aufruf("meinePachtakte", {}, n);
export const anliegenAnlegen = (n, { vertragId, art, daten } = {}, { ip = "" } = {}) => aufruf("anliegenAnlegen", { vertragId, art, daten, ip }, n);
export const anliegenAktion = (n, id, eingabe = {}, { ip = "" } = {}) => aufruf("anliegenAktion", { id, eingabe, ip }, n);
export const agriNachweisSpeichern = (n, { vertragId, id = null, daten, einreichen = false } = {}, { ip = "" } = {}) => aufruf("agriNachweisSpeichern", { vertragId, id, daten, einreichen: !!einreichen, ip }, n);
export const agriNachweisAktion = (n, id, eingabe = {}, { ip = "" } = {}) => aufruf("agriNachweisAktion", { id, eingabe, ip }, n);
export const rueckbauAktion = (n, vertragId, eingabe = {}, { ip = "" } = {}) => aufruf("rueckbauAktion", { vertragId, eingabe, ip }, n);
export const jahresbescheinigungDaten = (n, { jahr } = {}, { ip = "" } = {}) => aufruf("jahresbescheinigungDaten", { jahr, ip }, n);
export const pachtakteBackoffice = (n, { vertragId = null } = {}) => aufruf("pachtakteBackoffice", { vertragId }, n);
