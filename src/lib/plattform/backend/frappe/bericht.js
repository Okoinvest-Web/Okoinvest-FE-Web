// src/lib/plattform/backend/frappe/bericht.js
//
// Frappe-Adapter „Bericht“ (Welle 2, Paket B4). Methoden in oekoinvest_app.plattform.api.bericht – Signaturen
// identisch zu backend/demo/bericht.js. Frappe speichert nur den Token-Hash (DocType Plattform Bericht) und die
// Personendaten getrennt in Plattform Lead Person (B3). Den Versand der Bestätigungs-Mail übernimmt Frappe – nur,
// wenn site_config bericht_testversand = 1 und site_env ≠ production (zweite Sperre zu src/lib/bericht/versand.js).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  berichtAnfordern: "bericht.anfordern",
  berichtBestaetigen: "bericht.bestaetigen",
  berichtLesen: "bericht.lesen",
  berichtAufraeumen: "bericht.aufraeumen",
});

const iso = (ms) => new Date(ms).toISOString();

export const berichtAnlegen = (daten = {}) => aufruf("berichtAnfordern", { daten });
export const berichtBestaetigungBeginnen = ({ tokenHash, jetztMs = Date.now() } = {}) => aufruf("berichtBestaetigen", { token_hash: tokenHash, phase: "beginnen", jetzt: iso(jetztMs) });
export const berichtBestaetigungAbschliessen = ({ tokenHash, vorgangId, ablauf, jetztMs = Date.now() } = {}) =>
  aufruf("berichtBestaetigen", { token_hash: tokenHash, phase: "abschliessen", vorgang_id: vorgangId, ablauf, jetzt: iso(jetztMs) });
export const berichtBestaetigungZuruecksetzen = ({ tokenHash } = {}) => aufruf("berichtBestaetigen", { token_hash: tokenHash, phase: "zuruecksetzen" });
export const berichtLesen = ({ tokenHash, jetztMs = Date.now() } = {}) => aufruf("berichtLesen", { token_hash: tokenHash, jetzt: iso(jetztMs) });
export const berichtAufraeumen = () => aufruf("berichtAufraeumen", {});
