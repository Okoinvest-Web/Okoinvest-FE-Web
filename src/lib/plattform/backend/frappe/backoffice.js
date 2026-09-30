// src/lib/plattform/backend/frappe/backoffice.js
//
// Frappe-Adapter des Backoffice-Ausbaus (CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte,
// Hash-Kette). Methoden in oekoinvest_app.plattform.api.{crm,automation,berichte} – Vertrag: docs/API.md,
// Abschnitt „Backoffice (Ausbaustufe 3)“. Signaturen identisch zum Demo-Backend (backend/demo/backoffice.js).

import { METHODEN, frappeAufruf } from "../frappe";

/** Operation → Frappe-Methode */
export const BACKOFFICE_METHODEN = {
  crmKontakte: "crm.kontakte",
  crmKontakt: "crm.kontakt",
  crmKontaktSpeichern: "crm.kontakt_speichern",
  crmBeziehung: "crm.beziehung",
  crmOrganisationen: "crm.organisationen",
  crmOrganisation: "crm.organisation",
  crmOrganisationSpeichern: "crm.organisation_speichern",
  crmAktivitaetAnlegen: "crm.aktivitaet_anlegen",
  crmDubletten: "crm.dubletten",
  crmZusammenfuehren: "crm.zusammenfuehren",
  crmMassenaktion: "crm.massenaktion",
  akquise: "crm.akquise",
  akquiseSetzen: "crm.akquise_setzen",
  gebiete: "crm.gebiete",
  gebieteSpeichern: "crm.gebiete_speichern",
  akquiseZuweisen: "crm.akquise_zuweisen",
  automationen: "automation.liste",
  automationSpeichern: "automation.speichern",
  automationLoeschen: "automation.loeschen",
  automationTestlauf: "automation.testlauf",
  fristenPruefen: "automation.fristen_pruefen",
  objektTagSetzen: "automation.tag_setzen",
  vorlagen: "automation.vorlagen",
  vorlageSpeichern: "automation.vorlage_speichern",
  vorlageWiederherstellen: "automation.vorlage_wiederherstellen",
  vorlageVorschau: "automation.vorlage_vorschau",
  vorlageSenden: "automation.vorlage_senden",
  bericht: "berichte.bericht",
  backofficeRechte: "berichte.rechte",
  backofficeRollenSetzen: "berichte.rollen_setzen",
  protokollKette: "berichte.kette_pruefen",
};
export const BACKOFFICE_OPERATIONEN = Object.keys(BACKOFFICE_METHODEN);

// Methoden erst beim ersten Aufruf eintragen (frappe.js re-exportiert dieses Modul – zyklischer Import)
let eingetragen = false;
function aufruf(op, args, n) {
  if (!eingetragen) {
    Object.assign(METHODEN, BACKOFFICE_METHODEN);
    eingetragen = true;
  }
  return frappeAufruf(op, args, n);
}
const m = (op) => op;

export const crmKontakte = (n, filter = {}) => aufruf(m("crmKontakte"), filter, n);
export const crmKontakt = (n, id) => aufruf(m("crmKontakt"), { id }, n);
export const crmKontaktSpeichern = (n, id, daten) => aufruf(m("crmKontaktSpeichern"), { id, daten }, n);
export const crmBeziehung = (n, kontaktId, daten) => aufruf(m("crmBeziehung"), { kontaktId, ...daten }, n);
export const crmOrganisationen = (n, filter = {}) => aufruf(m("crmOrganisationen"), filter, n);
export const crmOrganisation = (n, id) => aufruf(m("crmOrganisation"), { id }, n);
export const crmOrganisationSpeichern = (n, id, daten) => aufruf(m("crmOrganisationSpeichern"), { id, daten }, n);
export const crmAktivitaetAnlegen = (n, daten) => aufruf(m("crmAktivitaetAnlegen"), { daten }, n);
export const crmDubletten = (n) => aufruf(m("crmDubletten"), {}, n);
export const crmZusammenfuehren = (n, daten) => aufruf(m("crmZusammenfuehren"), daten, n);
export const crmMassenaktion = (n, daten) => aufruf(m("crmMassenaktion"), daten, n);
export const akquise = (n, filter = {}) => aufruf(m("akquise"), filter, n);
export const akquiseSetzen = (n, flaecheId, daten) => aufruf(m("akquiseSetzen"), { flaecheId, daten }, n);
export const gebiete = (n) => aufruf(m("gebiete"), {}, n);
export const gebieteSpeichern = (n, liste) => aufruf(m("gebieteSpeichern"), { liste }, n);
export const akquiseZuweisen = (n, daten) => aufruf(m("akquiseZuweisen"), daten, n);
export const automationen = (n, filter = {}) => aufruf(m("automationen"), filter, n);
export const automationSpeichern = (n, id, regel) => aufruf(m("automationSpeichern"), { id, regel }, n);
export const automationLoeschen = (n, id) => aufruf(m("automationLoeschen"), { id }, n);
export const automationTestlauf = (n, daten) => aufruf(m("automationTestlauf"), daten, n);
export const fristenPruefen = (n) => aufruf(m("fristenPruefen"), {}, n);
export const objektTagSetzen = (n, daten) => aufruf(m("objektTagSetzen"), daten, n);
export const vorlagen = (n) => aufruf(m("vorlagen"), {}, n);
export const vorlageSpeichern = (n, id, daten) => aufruf(m("vorlageSpeichern"), { id, daten }, n);
export const vorlageWiederherstellen = (n, id, version) => aufruf(m("vorlageWiederherstellen"), { id, version }, n);
export const vorlageVorschau = (n, daten) => aufruf(m("vorlageVorschau"), daten, n);
export const vorlageSenden = (n, daten) => aufruf(m("vorlageSenden"), daten, n);
export const bericht = (n, filter = {}) => aufruf(m("bericht"), filter, n);
export const backofficeRechte = (n) => aufruf(m("backofficeRechte"), {}, n);
export const backofficeRollenSetzen = (n, nutzerId, rollen) => aufruf(m("backofficeRollenSetzen"), { nutzerId, rollen }, n);
export const protokollKette = (n, filter = {}) => aufruf(m("protokollKette"), filter, n);
