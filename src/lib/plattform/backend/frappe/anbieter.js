// src/lib/plattform/backend/frappe/anbieter.js
//
// Frappe-Adapter „Anbieter / Verkäufer“. Methoden in oekoinvest_app.plattform.api.anbieter – Vertrag: docs/API.md, Abschnitt
// „Anbieter / Verkäufer“. Signaturen identisch zu backend/demo/anbieter.js. Frappe prüft Rolle UND Eigentum selbst (als_benutzer).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  anbieterAkte: "anbieter.akte",
  anbieterAktion: "anbieter.aktion",
  anbieterAdminAktion: "anbieter.admin_aktion",
  anbieterCockpit: "anbieter.cockpit",
  vermittlungsauftragDaten: "anbieter.vermittlungsauftrag_daten",
  anbieterFristLauf: "anbieter.frist_lauf",
});

export const anbieterAkte = (n, projektId) => aufruf("anbieterAkte", { projektId }, n);
export const anbieterAktion = (n, projektId, daten = {}, { ip = "" } = {}) => aufruf("anbieterAktion", { projektId, daten, ip }, n);
export const anbieterAdminAktion = (n, projektId, daten = {}, { ip = "" } = {}) => aufruf("anbieterAdminAktion", { projektId, daten, ip }, n);
export const anbieterCockpit = (n) => aufruf("anbieterCockpit", {}, n);
export const vermittlungsauftragDaten = (n, projektId, { ip = "" } = {}) => aufruf("vermittlungsauftragDaten", { projektId, ip }, n);
export const anbieterFristLauf = (n) => aufruf("anbieterFristLauf", {}, n);
