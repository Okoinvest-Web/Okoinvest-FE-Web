// src/lib/plattform/backend/frappe/eid.js
//
// Frappe-Adapter „Staatliche eID“. Methoden in oekoinvest_app.plattform.api.eid (Vertrag: docs/EID.md). Signaturen
// identisch zu backend/demo/eid.js. Frappe hält Client-Secret, Pfeffer und Vorgänge (state/nonce nur als Hash), tauscht
// den Code beim Aussteller und prüft das ID-Token selbst; die Website reicht nur state, code und die Browser-Bindung
// (aus dem HttpOnly-Cookie) durch.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  eidStatus: "eid.eid_status",
  eidStarten: "eid.eid_starten",
  eidDemoCode: "eid.eid_demo_code",
  eidAbschluss: "eid.eid_abschluss",
  eidEinstellungen: "eid.eid_einstellungen",
  eidEinstellungenSpeichern: "eid.eid_einstellungen_speichern",
});

export const eidStatus = (n) => aufruf("eidStatus", {}, n);
export const eidStarten = (n, { methode, basisUrl = "" } = {}) => aufruf("eidStarten", { methode, basisUrl }, n);
export const eidDemoCode = (n, daten = {}) => aufruf("eidDemoCode", daten, n);
export const eidAbschluss = (n, { state, code, fehler, bindung } = {}) => aufruf("eidAbschluss", { state, code, fehler, bindung }, n);
export const eidEinstellungen = (n) => aufruf("eidEinstellungen", {}, n);
export const eidEinstellungenSpeichern = (n, daten = {}) => aufruf("eidEinstellungenSpeichern", { daten }, n);
