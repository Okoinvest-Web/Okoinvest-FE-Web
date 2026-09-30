// src/lib/plattform/backend/frappe/kundenenergie.js
//
// Frappe-Adapter „Kundenseite Energie“. Methoden in oekoinvest_app.plattform.api.kundenenergie – Signaturen identisch zu
// backend/demo/kundenenergie.js. Frappe prüft Rolle UND Eigentum selbst (Kunde nur eigene Anliegen/Wechsel, Versorger nur
// eigener Zuschlag, Backoffice nach Bereich „finanzen“ bzw. „energie“).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  kundenAnliegen: "kundenenergie.anliegen_liste",
  kundenAnliegenAuswahl: "kundenenergie.anliegen_auswahl",
  kundenAnliegenAnlegen: "kundenenergie.anliegen_anlegen",
  kundenAnliegenAktion: "kundenenergie.anliegen_aktion",
  kundenAnliegenDokument: "kundenenergie.anliegen_dokument",
  kundenStoerungMelden: "kundenenergie.stoerung_melden",
  lieferantenwechsel: "kundenenergie.wechsel_liste",
  lieferantenwechselAktion: "kundenenergie.wechsel_aktion",
  vertragsdaten: "kundenenergie.vertragsdaten",
  kostenbericht: "kundenenergie.kostenbericht",
});

export const kundenAnliegen = (n, { status = "alle" } = {}) => aufruf("kundenAnliegen", { status }, n);
export const kundenAnliegenAuswahl = (n) => aufruf("kundenAnliegenAuswahl", {}, n);
export const kundenAnliegenAnlegen = (n, daten = {}) => aufruf("kundenAnliegenAnlegen", { daten }, n);
export const kundenAnliegenAktion = (n, id, daten = {}) => aufruf("kundenAnliegenAktion", { id, daten }, n);
export const kundenAnliegenDokument = (n, id) => aufruf("kundenAnliegenDokument", { id }, n);
export const kundenStoerungMelden = (n, daten = {}) => aufruf("kundenStoerungMelden", { daten }, n);
export const lieferantenwechsel = (n, { ausschreibungId = "" } = {}) => aufruf("lieferantenwechsel", { ausschreibung_id: ausschreibungId }, n);
export const lieferantenwechselAktion = (n, id, daten = {}) => aufruf("lieferantenwechselAktion", { id, daten }, n);
export const vertragsdaten = (n, ausschreibungId, { ip = "" } = {}) => aufruf("vertragsdaten", { ausschreibung_id: ausschreibungId, ip }, n);
export const kostenbericht = (n, { jahr } = {}) => aufruf("kostenbericht", { jahr: jahr || "" }, n);
