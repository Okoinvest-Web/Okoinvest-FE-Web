// src/lib/plattform/backend/frappe/gutachter.js
//
// Frappe-Adapter „Gutachteraufträge“. Methoden in oekoinvest_app.plattform.api.gutachterauftrag – Signaturen identisch zu
// backend/demo/gutachter.js. Frappe prüft Rolle UND Eigentum, rechnet die Regeln mit plattform/gutachter_kern.py (Spiegel von
// src/lib/plattform/gutachter/kern.js), speichert, benachrichtigt und bucht bezahlte Rechnungen als Ist-Kosten.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  gaMeine: "gutachterauftrag.meine",
  gaAuftrag: "gutachterauftrag.holen",
  gaAktion: "gutachterauftrag.aktion",
  gaDateiSpeichern: "gutachterauftrag.datei_speichern",
  gaDateiLesen: "gutachterauftrag.datei_lesen",
  gaPdfDaten: "gutachterauftrag.pdf_daten",
  gaZaehler: "gutachterauftrag.zaehler",
  gaUebersicht: "gutachterauftrag.uebersicht",
  gaAnfrageAnlegen: "gutachterauftrag.anfrage_anlegen",
  gaZahlung: "gutachterauftrag.zahlung",
  gaFristen: "gutachterauftrag.fristen",
});

export const gaMeine = (n) => aufruf("gaMeine", {}, n);
export const gaAuftrag = (n, id) => aufruf("gaAuftrag", { id }, n);
export const gaAktion = (n, id, daten = {}) => aufruf("gaAktion", { id, daten }, n);
/** Upload als Base64 (≤ 10 MB, Typ bereits an den ersten Bytes geprüft) – Frappe legt die Datei privat ab */
export const gaDateiSpeichern = (n, id, { daten, ...rest } = {}) => aufruf("gaDateiSpeichern", { id, ...rest, inhalt: Buffer.from(daten).toString("base64") }, n);
export async function gaDateiLesen(n, id, dateiId) {
  const r = await aufruf("gaDateiLesen", { id, dateiId }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const gaPdfDaten = (n, id, { art = "auftrag" } = {}) => aufruf("gaPdfDaten", { id, art }, n);
export const gaZaehler = (n) => aufruf("gaZaehler", {}, n).catch(() => ({ offen: 0 }));
export const gaUebersicht = (n, filter = {}) => aufruf("gaUebersicht", filter, n);
export const gaAnfrageAnlegen = (n, daten = {}) => aufruf("gaAnfrageAnlegen", { daten }, n);
export const gaZahlung = (n, id, daten = {}) => aufruf("gaZahlung", { id, ...daten }, n);
export const gaFristen = (n) => aufruf("gaFristen", {}, n);
