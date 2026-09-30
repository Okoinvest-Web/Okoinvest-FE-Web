// src/lib/plattform/backend/frappe/energie.js
//
// Frappe-Adapter „Energiebeschaffung & Versorger-Ausschreibung“. Methoden in oekoinvest_app.plattform.api.energie –
// Vertrag: docs/API.md, Abschnitt „Energiebeschaffung“. Signaturen identisch zu backend/demo/energie.js. Frappe prüft
// Rolle UND Eigentum selbst (Lieferanten nur eingeladene Ausschreibungen und eigene Angebote; Kunden nur eigene Daten).
// Spotpreise liefert Frappe aus „Plattform Marktpreis Spot“ (Scheduler energie_quellen.spot_taeglich, Energy-Charts).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  energieSpot: "energie.spot",
  energieTermin: "energie.termin",
  energieTerminSpeichern: "energie.termin_speichern",
  energieTerminLoeschen: "energie.termin_loeschen",
  energieEinstellungen: "energie.einstellungen",
  energieEinstellungenSpeichern: "energie.einstellungen_speichern",
  energieUebersicht: "energie.uebersicht",
  energieKunden: "energie.kunden",
  energieKunde: "energie.kunde",
  energieVertragSpeichern: "energie.vertrag_speichern",
  energieMeine: "energie.meine",
  energieVollmachtErteilen: "energie.vollmacht_erteilen",
  energieVollmachtWiderrufen: "energie.vollmacht_widerrufen",
  energieVollmachtSignatur: "energie.vollmacht_signatur",
  energieLieferanten: "energie.lieferanten",
  energieLieferant: "energie.lieferant",
  energieLieferantSpeichern: "energie.lieferant_speichern",
  energieLieferantBewerten: "energie.lieferant_bewerten",
  energieLieferantEinladen: "energie.lieferant_einladen",
  energieEinladungInfo: "energie.einladung_info",
  energieEinladungAnnehmen: "energie.einladung_annehmen",
  energieAusschreibungen: "energie.ausschreibungen",
  energieAusschreibung: "energie.ausschreibung",
  energieAusschreibungAnlegen: "energie.ausschreibung_anlegen",
  energieAusschreibungAktion: "energie.ausschreibung_aktion",
  energieAngebotAbgeben: "energie.angebot_abgeben",
  energieAngebotZurueckziehen: "energie.angebot_zurueckziehen",
  energieFrageStellen: "energie.frage_stellen",
  energieFreigabe: "energie.freigabe",
  energiePortfolio: "energie.portfolio",
  energieTrancheSpeichern: "energie.tranche_speichern",
  energieTrancheStornieren: "energie.tranche_stornieren",
  energieDokumentDaten: "energie.dokument_daten",
  energieLauf: "energie.lauf",
});

export const energieSpot = (n, { zone = "DE", tage = 400 } = {}) => aufruf("energieSpot", { zone, tage }, n);
export const energieTermin = (n, { zone = "DE", produkt = "" } = {}) => aufruf("energieTermin", { zone, produkt }, n);
export const energieTerminSpeichern = (n, daten = {}) => aufruf("energieTerminSpeichern", { daten }, n);
export const energieTerminLoeschen = (n, id) => aufruf("energieTerminLoeschen", { id }, n);
export const energieEinstellungen = (n) => aufruf("energieEinstellungen", {}, n);
export const energieEinstellungenSpeichern = (n, daten = {}) => aufruf("energieEinstellungenSpeichern", { daten }, n);
export const energieUebersicht = (n) => aufruf("energieUebersicht", {}, n);
export const energieKunden = (n) => aufruf("energieKunden", {}, n);
export const energieKunde = (n, kundeId) => aufruf("energieKunde", { kunde_id: kundeId }, n);
export const energieVertragSpeichern = (n, { id = null, kundeId = null, daten = {} } = {}) => aufruf("energieVertragSpeichern", { id, kunde_id: kundeId, daten }, n);
export const energieMeine = (n) => aufruf("energieMeine", {}, n);
export const energieVollmachtErteilen = (n, { zustimmung, ip = "", userAgent = "" } = {}) => aufruf("energieVollmachtErteilen", { zustimmung, ip, user_agent: userAgent }, n);
export const energieVollmachtWiderrufen = (n, { ip = "" } = {}) => aufruf("energieVollmachtWiderrufen", { ip }, n);
export const energieVollmachtSignatur = (n, kundeId, signaturId) => aufruf("energieVollmachtSignatur", { kunde_id: kundeId, signatur_id: signaturId }, n);
export const energieLieferanten = (n) => aufruf("energieLieferanten", {}, n);
export const energieLieferant = (n, id) => aufruf("energieLieferant", { id }, n);
export const energieLieferantSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("energieLieferantSpeichern", { id, daten }, n);
export const energieLieferantBewerten = (n, id, daten = {}) => aufruf("energieLieferantBewerten", { id, daten }, n);
export const energieLieferantEinladen = (n, id, { email, basisUrl = "", ausschreibungId = null } = {}) =>
  aufruf("energieLieferantEinladen", { id, email, basis_url: basisUrl, ausschreibung_id: ausschreibungId }, n);
export const energieEinladungInfo = (token) => aufruf("energieEinladungInfo", { token });
export const energieEinladungAnnehmen = (n, token, daten = {}) => aufruf("energieEinladungAnnehmen", { token, daten }, n);
export const energieAusschreibungen = (n, filter = {}) => aufruf("energieAusschreibungen", filter, n);
export const energieAusschreibung = (n, id) => aufruf("energieAusschreibung", { id }, n);
export const energieAusschreibungAnlegen = (n, daten = {}) => aufruf("energieAusschreibungAnlegen", { daten }, n);
export const energieAusschreibungAktion = (n, id, daten = {}) => aufruf("energieAusschreibungAktion", { id, daten }, n);
export const energieAngebotAbgeben = (n, id, daten = {}) => aufruf("energieAngebotAbgeben", { id, daten }, n);
export const energieAngebotZurueckziehen = (n, id) => aufruf("energieAngebotZurueckziehen", { id }, n);
export const energieFrageStellen = (n, id, { text } = {}) => aufruf("energieFrageStellen", { id, text }, n);
export const energieFreigabe = (n, id, daten = {}) => aufruf("energieFreigabe", { id, daten }, n);
export const energiePortfolio = (n) => aufruf("energiePortfolio", {}, n);
export const energieTrancheSpeichern = (n, daten = {}) => aufruf("energieTrancheSpeichern", { daten }, n);
export const energieTrancheStornieren = (n, id) => aufruf("energieTrancheStornieren", { id }, n);
export const energieDokumentDaten = (n, { art, id = "" } = {}) => aufruf("energieDokumentDaten", { art, id }, n);
export const energieLauf = (n) => aufruf("energieLauf", {}, n);
/** Im Betrieb laufen Wechselanalyse und Fristen per Frappe-Scheduler (energie.lauf_woechentlich / energie.fristen_taeglich) */
export const energieSystemLauf = async () => null;
