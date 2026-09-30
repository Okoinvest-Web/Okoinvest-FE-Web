// src/lib/plattform/backend/frappe/finanzen.js
//
// Frappe-Adapter „Finanzen & Abrechnung“. Methoden in oekoinvest_app.plattform.api.finanzen – Vertrag: docs/API.md,
// Abschnitt „Finanzen & Abrechnung“. Signaturen identisch zu backend/demo/finanzen.js. Frappe prüft Rolle UND Eigentum selbst; ob ERPNext
// genutzt wird, entscheidet Frappe (installiert + site_config `oekoinvest_erpnext`).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  meineAbrechnungen: "finanzen.meine",
  abrechnung: "finanzen.abrechnung",
  abrechnungPdfDaten: "finanzen.abrechnung_pdf",
  finanzCockpit: "finanzen.cockpit",
  finanzAbrechnungen: "finanzen.abrechnungen",
  abrechnungAktion: "finanzen.abrechnung_aktion",
  abrechnungslauf: "finanzen.lauf",
  pachtvertraege: "finanzen.pachtvertraege",
  pachtvertrag: "finanzen.pachtvertrag",
  pachtvertragSpeichern: "finanzen.pachtvertrag_speichern",
  pachtAuswahl: "finanzen.pacht_auswahl",
  klaerfaelle: "finanzen.klaerfaelle",
  klaerfallAktion: "finanzen.klaerfall_aktion",
  zahlungsvorschlag: "finanzen.zahlungsvorschlag",
  sepaExport: "finanzen.sepa_export",
  zahlungslaufAktion: "finanzen.zahlungslauf_aktion",
  vpiWerte: "finanzen.vpi_werte",
  vpiSpeichern: "finanzen.vpi_speichern",
  finanzAnlagen: "finanzen.anlagen",
  finanzAnlageSpeichern: "finanzen.anlage_speichern",
  entwicklungKosten: "finanzen.entwicklung_kosten",
  entwicklungIst: "finanzen.entwicklung_ist",
  entwicklungKostenBuchen: "finanzen.entwicklung_kosten_buchen",
});

export const meineAbrechnungen = (n, { jahr = null } = {}) => aufruf("meineAbrechnungen", { jahr }, n);
export const abrechnung = (n, id) => aufruf("abrechnung", { id }, n);
export const abrechnungPdfDaten = (n, id, { ip = "" } = {}) => aufruf("abrechnungPdfDaten", { id, ip }, n);
export const finanzCockpit = (n) => aufruf("finanzCockpit", {}, n);
export const finanzAbrechnungen = (n, filter = {}) => aufruf("finanzAbrechnungen", filter, n);
export const abrechnungAktion = (n, id, daten = {}) => aufruf("abrechnungAktion", { id, daten }, n);
export const abrechnungslauf = (n, daten = {}) => aufruf("abrechnungslauf", { daten }, n);
export const pachtvertraege = (n, filter = {}) => aufruf("pachtvertraege", filter, n);
export const pachtvertrag = (n, id) => aufruf("pachtvertrag", { id }, n);
export const pachtvertragSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("pachtvertragSpeichern", { id, daten }, n);
export const pachtAuswahl = (n) => aufruf("pachtAuswahl", {}, n);
export const klaerfaelle = (n, filter = {}) => aufruf("klaerfaelle", filter, n);
export const klaerfallAktion = (n, id, daten = {}) => aufruf("klaerfallAktion", { id, daten }, n);
export const zahlungsvorschlag = (n, { bis = null } = {}) => aufruf("zahlungsvorschlag", { bis }, n);
export const sepaExport = (n, { ids = [], ausfuehrungAm = null } = {}, { ip = "" } = {}) => aufruf("sepaExport", { ids, ausfuehrungAm, ip }, n);
export const zahlungslaufAktion = (n, id, daten = {}) => aufruf("zahlungslaufAktion", { id, daten }, n);
export const vpiWerte = (n) => aufruf("vpiWerte", {}, n);
export const vpiSpeichern = (n, daten = {}) => aufruf("vpiSpeichern", { daten }, n);
export const finanzAnlagen = (n) => aufruf("finanzAnlagen", {}, n);
export const finanzAnlageSpeichern = (n, anlageId, daten = {}) => aufruf("finanzAnlageSpeichern", { anlageId, daten }, n);
export const entwicklungKosten = (n) => aufruf("entwicklungKosten", {}, n);
export const entwicklungIst = (n, projektId) => aufruf("entwicklungIst", { projektId }, n);
export const entwicklungKostenBuchen = (n, daten = {}) => aufruf("entwicklungKostenBuchen", { daten }, n);
