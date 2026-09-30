// src/lib/plattform/backend/frappe/dealroom.js
//
// Frappe-Adapter des Deal-Rooms (Q&A, Bieterverfahren, Datenraum 2.0, Pipeline, Cockpit).
// Methoden in oekoinvest_app.plattform.api.{qa,bieter,dealroom} – Vertrag: docs/API.md, Abschnitt 7.
// Signaturen identisch zu backend/demo/dealroom.js.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  dealroomKopf: "dealroom.kopf",
  kontaktFreigabe: "dealroom.kontakt_freigabe",
  qaListe: "qa.liste",
  qaFrageStellen: "qa.frage_stellen",
  qaAktion: "qa.aktion",
  bieterverfahren: "bieter.verfahren",
  bieterverfahrenListe: "bieter.liste",
  bieterStarten: "bieter.starten",
  bieterAktion: "bieter.aktion",
  gebotAbgeben: "bieter.gebot_abgeben",
  gebotZurueckziehen: "bieter.gebot_zurueckziehen",
  datenraum: "dealroom.datenraum",
  datenraumEinordnen: "dealroom.einordnen",
  datenraumDokument: "dealroom.dokument",
  datenraumZugriffe: "dealroom.zugriffe",
  pipeline: "dealroom.pipeline",
  notizSpeichern: "dealroom.notiz_speichern",
  suchprofileSpeichern: "dealroom.suchprofile_speichern",
  dealCockpit: "dealroom.cockpit",
  dealroomUebersicht: "dealroom.uebersicht",
});

export const dealroomKopf = (n, projektId) => aufruf("dealroomKopf", { projektId }, n);
export const kontaktFreigabe = (n, daten = {}) => aufruf("kontaktFreigabe", daten, n);
export const qaListe = (n, projektId) => aufruf("qaListe", { projektId }, n);
export const qaFrageStellen = (n, daten = {}) => aufruf("qaFrageStellen", daten, n);
export const qaAktion = (n, id, daten = {}) => aufruf("qaAktion", { id, daten }, n);
export const bieterverfahren = (n, projektId) => aufruf("bieterverfahren", { projektId }, n);
export const bieterverfahrenListe = (n) => aufruf("bieterverfahrenListe", {}, n);
export const bieterStarten = (n, daten = {}) => aufruf("bieterStarten", { daten }, n);
export const bieterAktion = (n, id, daten = {}) => aufruf("bieterAktion", { id, daten }, n);
export const gebotAbgeben = (n, daten = {}) => aufruf("gebotAbgeben", { daten }, n);
export const gebotZurueckziehen = (n, id) => aufruf("gebotZurueckziehen", { id }, n);
export const datenraum = (n, projektId, { besuch = false, ip = "" } = {}) => aufruf("datenraum", { projektId, besuch, ip }, n);
export const datenraumEinordnen = (n, dokumentId, daten = {}) => aufruf("datenraumEinordnen", { dokumentId, daten }, n);
export async function datenraumDokument(n, id, { ip = "", anzeigen = false } = {}) {
  const r = await aufruf("datenraumDokument", { id, ip, anzeigen }, n);
  return { meta: r.meta, daten: Buffer.from(r.inhaltBase64 || "", "base64"), dateiname: r.dateiname };
}
export const datenraumZugriffe = (n, projektId, { limit = 300 } = {}) => aufruf("datenraumZugriffe", { projektId, limit }, n);
export const pipeline = (n) => aufruf("pipeline", {}, n);
export const notizSpeichern = (n, daten = {}) => aufruf("notizSpeichern", daten, n);
export const suchprofileSpeichern = (n, profile = []) => aufruf("suchprofileSpeichern", { profile }, n);
export const dealCockpit = (n, projektId, { tage = 60 } = {}) => aufruf("dealCockpit", { projektId, tage }, n);
export const dealroomUebersicht = (n) => aufruf("dealroomUebersicht", {}, n);
