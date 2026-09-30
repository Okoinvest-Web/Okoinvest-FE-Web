// src/lib/plattform/backend/frappe/akquise2.js
//
// Frappe-Adapter „Akquise Ausbaustufe 2“: Methoden in oekoinvest_app.plattform.api.akquise_kampagne (DocTypes
// „Plattform Kampagne“, „Plattform Kampagnenziel“ (+ Kindtabelle „Plattform Kampagnenempfaenger“), „Plattform Sperrliste“,
// „Plattform Gemeinde Potenzial“). Signaturen identisch zur Demo; Frappe prüft Rolle und Unterrolle selbst.
// Die öffentlichen angebot*-Methoden laufen über den API-Benutzer der Website OHNE als_benutzer (Frappe gibt nur den
// Flächen-Steckbrief ohne Eigentümerdaten zurück).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

const M = "akquise_kampagne";
Object.assign(METHODEN, {
  kampagnen: `${M}.kampagnen`,
  kampagne: `${M}.kampagne`,
  kampagneAnlegen: `${M}.kampagne_anlegen`,
  kampagneAendern: `${M}.kampagne_aendern`,
  kampagneStarten: `${M}.kampagne_starten`,
  kampagneLoeschen: `${M}.kampagne_loeschen`,
  kampagnenNachfassen: `${M}.nachfassen`,
  grundbuchErgebnis: `${M}.grundbuch_ergebnis`,
  empfaengerAendern: `${M}.empfaenger_aendern`,
  empfaengerSperren: `${M}.empfaenger_sperren`,
  serienbriefDaten: `${M}.serienbrief_daten`,
  versandBestaetigen: `${M}.versand_bestaetigen`,
  sperrliste: `${M}.sperrliste`,
  sperreAnlegen: `${M}.sperre_anlegen`,
  sperreAufheben: `${M}.sperre_aufheben`,
  angebotFuerCode: `${M}.angebot_fuer_code`,
  angebotAufruf: `${M}.angebot_aufruf`,
  angebotAnfrageVerknuepfen: `${M}.angebot_anfrage`,
  angebotWiderspruch: `${M}.angebot_widerspruch`,
  gemeindenScreening: `${M}.gemeinden_screening`,
  gemeindeSpeichern: `${M}.gemeinde_speichern`,
  konkurrenzAnlegen: `${M}.konkurrenz_anlegen`,
  konkurrenzEntfernen: `${M}.konkurrenz_entfernen`,
  gemeindeUebergeben: `${M}.gemeinde_uebergeben`,
  uebergabeZuruecknehmen: `${M}.uebergabe_zuruecknehmen`,
  gemeindeZuruecksetzen: `${M}.gemeinde_zuruecksetzen`,
});

export const kampagnen = (n) => aufruf("kampagnen", {}, n);
export const kampagne = (n, id) => aufruf("kampagne", { id }, n);
/** `kandidaten` stammen serverseitig aus dem Geodaten-Adapter (nie ungeprüft vom Browser) */
export const kampagneAnlegen = (n, kandidaten, daten = {}) => aufruf("kampagneAnlegen", { kandidaten, daten }, n);
export const kampagneAendern = (n, id, daten = {}) => aufruf("kampagneAendern", { id, daten }, n);
export const kampagneStarten = (n, id) => aufruf("kampagneStarten", { id }, n);
export const kampagneLoeschen = (n, id) => aufruf("kampagneLoeschen", { id }, n);
export const kampagnenNachfassen = (n) => aufruf("kampagnenNachfassen", {}, n);
export const grundbuchErgebnis = (n, zielId, daten = {}) => aufruf("grundbuchErgebnis", { ziel_id: zielId, daten }, n);
export const empfaengerAendern = (n, zielId, empfaengerId, daten = {}) => aufruf("empfaengerAendern", { ziel_id: zielId, empfaenger_id: empfaengerId, daten }, n);
export const empfaengerSperren = (n, zielId, empfaengerId, daten = {}) => aufruf("empfaengerSperren", { ziel_id: zielId, empfaenger_id: empfaengerId, daten }, n);
export const serienbriefDaten = (n, id, { stufe = 1 } = {}) => aufruf("serienbriefDaten", { id, stufe }, n);
export const versandBestaetigen = (n, id, daten = {}) => aufruf("versandBestaetigen", { id, daten }, n);
export const sperrliste = (n) => aufruf("sperrliste", {}, n);
export const sperreAnlegen = (n, daten = {}) => aufruf("sperreAnlegen", { daten }, n);
export const sperreAufheben = (n, id, daten = {}) => aufruf("sperreAufheben", { id, daten }, n);
export const angebotFuerCode = (code) => aufruf("angebotFuerCode", { code }, null);
export const angebotAufruf = (code) => aufruf("angebotAufruf", { code }, null);
export const angebotAnfrageVerknuepfen = (code, daten = {}) => aufruf("angebotAnfrageVerknuepfen", { code, daten }, null);
export const angebotWiderspruch = (code) => aufruf("angebotWiderspruch", { code }, null);
export const gemeindenScreening = (n, kandidaten, kapazitaeten, filter = {}) => aufruf("gemeindenScreening", { kandidaten, filter }, n);
export const gemeindeSpeichern = (n, schluessel, daten = {}) => aufruf("gemeindeSpeichern", { schluessel, daten }, n);
export const konkurrenzAnlegen = (n, schluessel, daten = {}) => aufruf("konkurrenzAnlegen", { schluessel, daten }, n);
export const konkurrenzEntfernen = (n, schluessel, id) => aufruf("konkurrenzEntfernen", { schluessel, id }, n);
export const gemeindeUebergeben = (n, schluessel, daten = {}) => aufruf("gemeindeUebergeben", { schluessel, daten }, n);
export const uebergabeZuruecknehmen = (n, schluessel) => aufruf("uebergabeZuruecknehmen", { schluessel }, n);
export const gemeindeZuruecksetzen = (n, schluessel) => aufruf("gemeindeZuruecksetzen", { schluessel }, n);
