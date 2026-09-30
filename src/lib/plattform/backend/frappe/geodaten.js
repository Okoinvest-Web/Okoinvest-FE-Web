// src/lib/plattform/backend/frappe/geodaten.js
//
// Frappe-Adapter „Geodaten & Akquise-Engine“: Methoden in oekoinvest_app.plattform.api.geodaten (DocType
// „Plattform Akquise Ziel“). Signaturen identisch zu backend/demo/geodaten.js. Frappe prüft Rolle und Unterrolle selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  akquiseZiele: "geodaten.ziele",
  akquiseZielUebernehmen: "geodaten.ziel_uebernehmen",
  netzkapazitaeten: "geodaten.kapazitaeten",
  netzkapazitaetSetzen: "geodaten.kapazitaet_setzen",
});

export const akquiseZiele = (n) => aufruf("akquiseZiele", {}, n);
/** `kandidat` stammt serverseitig aus dem Geodaten-Dienst (nie ungeprüft vom Browser) */
export const akquiseZielUebernehmen = (n, kandidat, { notiz = "" } = {}) => aufruf("akquiseZielUebernehmen", { kandidat, notiz }, n);
export const netzkapazitaeten = (n) => aufruf("netzkapazitaeten", {}, n);
export const netzkapazitaetSetzen = (n, knotenId, daten = {}) => aufruf("netzkapazitaetSetzen", { knotenId, daten }, n);
