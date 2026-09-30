// src/lib/plattform/backend/frappe/werkzeuge.js
//
// Frappe-Adapter „Backoffice-Werkzeuge“ (Buchhaltung, Datenschutz & GwG, Deal-Pipeline). Methoden in
// oekoinvest_app.plattform.api.{buchhaltung,datenschutz,transaktion} – Signaturen identisch zu backend/demo/{buchhaltung,
// datenschutz,transaktion}.js. Frappe prüft Rolle UND Bereich selbst (rechte.py).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  bhUebersicht: "buchhaltung.uebersicht",
  bhEinstellungenSpeichern: "buchhaltung.einstellungen_speichern",
  bhMahnlauf: "buchhaltung.mahnlauf",
  bhMahnsperre: "buchhaltung.mahnsperre",
  bhStorno: "buchhaltung.storno",
  bhBelegDokument: "buchhaltung.beleg_dokument",
  bhMeineDokumente: "buchhaltung.meine_dokumente",
  bhZahlungImport: "buchhaltung.zahlung_import",
  bhZahlungAktion: "buchhaltung.zahlung_aktion",
  bhExport: "buchhaltung.export",
  bhAbschluss: "buchhaltung.abschluss",
  bhAbschlussAktion: "buchhaltung.abschluss_aktion",
  dsUebersicht: "datenschutz.uebersicht",
  dsAnlegen: "datenschutz.anlegen",
  dsAktion: "datenschutz.aktion",
  dsExport: "datenschutz.export",
  vvtExport: "datenschutz.vvt_export",
  kycSlaUebersicht: "datenschutz.kyc_sla",
  verdachtListe: "datenschutz.verdacht_liste",
  verdachtMelden: "datenschutz.verdacht_melden",
  verdachtAktion: "datenschutz.verdacht_aktion",
  dealPipeline: "transaktion.pipeline",
  dealPrognose: "transaktion.prognose",
  dealBericht: "transaktion.bericht",
});

export const bhUebersicht = (n) => aufruf("bhUebersicht", {}, n);
export const bhEinstellungenSpeichern = (n, daten = {}) => aufruf("bhEinstellungenSpeichern", { daten }, n);
export const bhMahnlauf = (n, daten = {}) => aufruf("bhMahnlauf", { daten }, n);
export const bhMahnsperre = (n, belegId, daten = {}) => aufruf("bhMahnsperre", { beleg_id: belegId, daten }, n);
export const bhStorno = (n, belegId, daten = {}) => aufruf("bhStorno", { beleg_id: belegId, daten }, n);
export const bhBelegDokument = (n, belegId, { art, nr = "", ip = "" } = {}) => aufruf("bhBelegDokument", { beleg_id: belegId, art, nr, ip }, n);
export const bhMeineDokumente = (n) => aufruf("bhMeineDokumente", {}, n);
export const bhZahlungImport = (n, daten = {}) => aufruf("bhZahlungImport", { daten }, n);
export const bhZahlungAktion = (n, id, daten = {}) => aufruf("bhZahlungAktion", { id, daten }, n);
export const bhExport = (n, daten = {}) => aufruf("bhExport", { daten }, n);
export const bhAbschluss = (n, monat) => aufruf("bhAbschluss", { monat }, n);
export const bhAbschlussAktion = (n, monat, daten = {}) => aufruf("bhAbschlussAktion", { monat, daten }, n);
export const dsUebersicht = (n, filter = {}) => aufruf("dsUebersicht", filter, n);
export const dsAnlegen = (n, daten = {}) => aufruf("dsAnlegen", { daten }, n);
export const dsAktion = (n, id, daten = {}) => aufruf("dsAktion", { id, daten }, n);
export const dsExport = (n, id, { ip = "" } = {}) => aufruf("dsExport", { id, ip }, n);
export const vvtExport = (n, { format = "csv" } = {}) => aufruf("vvtExport", { format }, n);
export const kycSlaUebersicht = (n) => aufruf("kycSlaUebersicht", {}, n);
export const verdachtListe = (n, filter = {}) => aufruf("verdachtListe", filter, n);
export const verdachtMelden = (n, daten = {}) => aufruf("verdachtMelden", { daten }, n);
export const verdachtAktion = (n, id, daten = {}) => aufruf("verdachtAktion", { id, daten }, n);
export const dealPipeline = (n, filter = {}) => aufruf("dealPipeline", filter, n);
export const dealPrognose = (n, projektId, daten = {}) => aufruf("dealPrognose", { projekt_id: projektId, daten }, n);
export const dealBericht = (n, filter = {}) => aufruf("dealBericht", filter, n);
