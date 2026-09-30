// src/lib/plattform/backend/frappe/querschnitt.js
//
// Frappe-Adapter „Querschnitt“ (Methoden in oekoinvest_app.plattform.api.querschnitt). Signaturen identisch zu
// backend/demo/querschnitt.js. Frappe prüft Rolle UND Eigentum selbst (als_benutzer); Dateien base64-kodiert.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  dokumentVersionen: "querschnitt.dokument_versionen",
  dokumentNeueVersion: "querschnitt.dokument_neue_version",
  dokumentFreigeben: "querschnitt.dokument_freigeben",
  protokollSuche: "querschnitt.protokoll_suche",
  mailRhythmus: "querschnitt.mail_rhythmus",
  mailRhythmusSpeichern: "querschnitt.mail_rhythmus_speichern",
  digestLauf: "querschnitt.digest_lauf",
});

export const dokumentVersionen = async (n, id) => (await aufruf("dokumentVersionen", { id }, n)) || [];
export const dokumentNeueVersion = (n, id, { name, mime, daten }) => aufruf("dokumentNeueVersion", { id, name, mime, inhaltBase64: Buffer.from(daten).toString("base64") }, n);
export const dokumentFreigeben = (n, id, { status, kommentar = "" } = {}) => aufruf("dokumentFreigeben", { id, status, kommentar }, n);
export const protokollSuche = (n, filter = {}) => aufruf("protokollSuche", { filter }, n);
export const mailRhythmus = (n) => aufruf("mailRhythmus", {}, n);
export const mailRhythmusSpeichern = (n, { rhythmus } = {}) => aufruf("mailRhythmusSpeichern", { rhythmus }, n);
/** n = null: im Frappe-Betrieb erledigt der Scheduler den Lauf – hier nichts zu tun */
export const digestLauf = async (n, { erzwingen = false } = {}) => (n ? aufruf("digestLauf", { erzwingen: !!erzwingen }, n) : { konten: 0, mails: 0 });
