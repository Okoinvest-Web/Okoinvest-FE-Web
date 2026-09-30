// src/lib/plattform/backend/frappe/betrieb.js
//
// Frappe-Adapter „Betriebsführung“. Methoden in oekoinvest_app.plattform.api.betrieb – Vertrag: docs/API.md,
// Abschnitt „Betriebsführung“. Signaturen identisch zu backend/demo/betrieb.js. Frappe prüft Rolle (Bereich „anlagen“) selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  betriebUebersicht: "betrieb.uebersicht",
  betriebAnlage: "betrieb.anlage",
  betriebStoerung: "betrieb.stoerung",
  betriebStoerungSpeichern: "betrieb.stoerung_speichern",
  betriebStoerungBeheben: "betrieb.stoerung_beheben",
  betriebAuftragSpeichern: "betrieb.auftrag_speichern",
  betriebAuftragAktion: "betrieb.auftrag_aktion",
  betriebAuftrag: "betrieb.auftrag",
  betriebVersicherungSpeichern: "betrieb.versicherung_speichern",
  betriebVersicherungAktion: "betrieb.versicherung_aktion",
  betriebPlanSpeichern: "betrieb.plan_speichern",
  betriebPlanLoeschen: "betrieb.plan_loeschen",
  betriebPlaeneVorschlagen: "betrieb.plaene_vorschlagen",
  betriebProtokollSpeichern: "betrieb.protokoll_speichern",
  betriebProtokoll: "betrieb.protokoll",
  betriebErsatzteilSpeichern: "betrieb.ersatzteil_speichern",
  betriebErsatzteilBewegung: "betrieb.ersatzteil_bewegung",
  betriebEinstrahlungSpeichern: "betrieb.einstrahlung_speichern",
  betriebMonatswertFreigeben: "betrieb.monatswert_freigeben",
  betriebBerichtDaten: "betrieb.bericht_daten",
  betriebLauf: "betrieb.lauf",
});

export const betriebUebersicht = (n) => aufruf("betriebUebersicht", {}, n);
export const betriebAnlage = (n, anlageId) => aufruf("betriebAnlage", { anlage_id: anlageId }, n);
export const betriebStoerung = (n, stoerungId) => aufruf("betriebStoerung", { stoerung_id: stoerungId }, n);
export const betriebStoerungSpeichern = (n, stoerungId, daten = {}, kontext = {}) => aufruf("betriebStoerungSpeichern", { stoerung_id: stoerungId, daten, kontext }, n);
export const betriebStoerungBeheben = (n, stoerungId, daten = {}) => aufruf("betriebStoerungBeheben", { stoerung_id: stoerungId, daten }, n);
export const betriebAuftragSpeichern = (n, daten = {}) => aufruf("betriebAuftragSpeichern", { daten }, n);
export const betriebAuftragAktion = (n, id, daten = {}) => aufruf("betriebAuftragAktion", { id, daten }, n);
export const betriebAuftrag = (n, id) => aufruf("betriebAuftrag", { id }, n);
export const betriebVersicherungSpeichern = (n, daten = {}) => aufruf("betriebVersicherungSpeichern", { daten }, n);
export const betriebVersicherungAktion = (n, id, daten = {}) => aufruf("betriebVersicherungAktion", { id, daten }, n);
export const betriebPlanSpeichern = (n, anlageId, daten = {}) => aufruf("betriebPlanSpeichern", { anlage_id: anlageId, daten }, n);
export const betriebPlanLoeschen = (n, anlageId, id) => aufruf("betriebPlanLoeschen", { anlage_id: anlageId, id }, n);
export const betriebPlaeneVorschlagen = (n, anlageId) => aufruf("betriebPlaeneVorschlagen", { anlage_id: anlageId }, n);
export const betriebProtokollSpeichern = (n, anlageId, daten = {}) => aufruf("betriebProtokollSpeichern", { anlage_id: anlageId, daten }, n);
export const betriebProtokoll = (n, id) => aufruf("betriebProtokoll", { id }, n);
export const betriebErsatzteilSpeichern = (n, daten = {}) => aufruf("betriebErsatzteilSpeichern", { daten }, n);
export const betriebErsatzteilBewegung = (n, id, daten = {}) => aufruf("betriebErsatzteilBewegung", { id, daten }, n);
export const betriebEinstrahlungSpeichern = (n, anlageId, daten = {}) => aufruf("betriebEinstrahlungSpeichern", { anlage_id: anlageId, daten }, n);
export const betriebMonatswertFreigeben = (n, anlageId, daten = {}) => aufruf("betriebMonatswertFreigeben", { anlage_id: anlageId, daten }, n);
export const betriebBerichtDaten = (n, anlageId, zeitraum = {}) => aufruf("betriebBerichtDaten", { anlage_id: anlageId, von: zeitraum.von, bis: zeitraum.bis }, n);
export const betriebLauf = (n) => aufruf("betriebLauf", {}, n);
/** Im Betrieb läuft der Fristen-Lauf per Frappe-Scheduler (hooks.py, täglich) */
export const betriebSystemLauf = async () => null;
