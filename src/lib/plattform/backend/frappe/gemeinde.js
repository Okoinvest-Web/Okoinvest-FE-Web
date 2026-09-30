// src/lib/plattform/backend/frappe/gemeinde.js
//
// Frappe-Adapter „Gemeindecockpit“. Methoden in oekoinvest_app.plattform.api.gemeinde – Vertrag: docs/API.md,
// Abschnitt „Gemeindecockpit“. Signaturen identisch zu backend/demo/gemeinde.js. Frappe prüft Rolle UND Eigentum selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  gdCockpit: "gemeinde.cockpit",
  gdAktion: "gemeinde.aktion",
  gdMaterial: "gemeinde.material",
});

export const gdCockpit = (n, { vorgangId = null } = {}) => aufruf("gdCockpit", { vorgangId }, n);
export const gdAktion = (n, vorgangId, daten = {}, { ip = "" } = {}) => aufruf("gdAktion", { vorgangId, daten, ip }, n);
export const gdMaterial = (n, vorgangId, { art = "", projektRef = "" } = {}, { ip = "" } = {}) => aufruf("gdMaterial", { vorgangId, art, projektRef, ip }, n);
