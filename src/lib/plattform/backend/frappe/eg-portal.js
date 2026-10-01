// src/lib/plattform/backend/frappe/eg-portal.js
//
// Frappe-Adapter WP6 „Portale Mitglied, Interessent, Gemeinde, öffentlicher Rechner“. Methoden in
// oekoinvest_app.plattform.api.eg_portal – Signaturen identisch zu backend/demo/eg-portal.js (Vertrag: docs/EG-SCHNITTSTELLEN.md).
// Frappe prüft Konto, Kontext-Rolle je Gemeinschaft (eg_stamm_kern.eg_rollen, Recht „eigene_daten“) und Eigentum selbst.
// Öffentlich (ohne Konto, Aufruf über den API-Benutzer der Website, kein allow_guest): interesse, rechner.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  ptUebersicht: "eg_portal.uebersicht",
  ptGemeinschaft: "eg_portal.gemeinschaft",
  ptBeitrittAntrag: "eg_portal.beitritt_antrag",
  ptKuendigung: "eg_portal.kuendigung",
  ptTfWunsch: "eg_portal.tf_wunsch",
  ptInteresse: "eg_portal.interesse",
  ptGemeindeSicht: "eg_portal.gemeinde_sicht",
  ptDatenauskunft: "eg_portal.datenauskunft",
  ptRechner: "eg_portal.rechner",
  ptBelege: "eg_portal.belege",
  ptEnergie: "eg_portal.energie",
});

const ohneSystem = (n) => (n && !n.system ? n : null);

export const ptUebersicht = (n) => aufruf("ptUebersicht", {}, n);
export const ptGemeinschaft = (n, gemeinschaftId) => aufruf("ptGemeinschaft", { gemeinschaftId }, n);
export const ptBeitrittAntrag = (n, gemeinschaftId, { daten = {} } = {}, { ip = "" } = {}) => aufruf("ptBeitrittAntrag", { gemeinschaftId, daten, ip }, n);
export const ptKuendigung = (n, mitgliedId, { zum = "" } = {}) => aufruf("ptKuendigung", { mitgliedId, zum }, n);
export const ptTfWunsch = (n, teilnahmeId, { teilnahmefaktor } = {}) => aufruf("ptTfWunsch", { teilnahmeId, teilnahmefaktor }, n);
export const ptInteresse = (n, { daten = {} } = {}, { ip = "" } = {}) => aufruf("ptInteresse", { daten, ip }, ohneSystem(n));
export const ptGemeindeSicht = (n) => aufruf("ptGemeindeSicht", {}, n);
export const ptDatenauskunft = (n) => aufruf("ptDatenauskunft", {}, n);
export const ptRechner = (_n, { daten = {} } = {}) => aufruf("ptRechner", { daten }, null);
export const ptBelege = (n) => aufruf("ptBelege", {}, n);
export const ptEnergie = (n, { zaehlpunktId = "", von = "", bis = "" } = {}) => aufruf("ptEnergie", { zaehlpunktId, von, bis }, n);

// Integration: TF-Wünsche der Mitglieder in Verwaltung/Backoffice (Frappe: Protokoll eg_tf_wunsch → edaTfAendern)
Object.assign(METHODEN, { ptTfWuensche: "eg_portal.tf_wuensche", ptTfWunschUmsetzen: "eg_portal.tf_wunsch_umsetzen" });
export const ptTfWuensche = (n, gemeinschaftId) => aufruf("ptTfWuensche", { gemeinschaftId }, n);
export const ptTfWunschUmsetzen = (n, gemeinschaftId, { wunschIds = [], entscheidung = "melden", ab = "", grund = "" } = {}) => aufruf("ptTfWunschUmsetzen", { gemeinschaftId, daten: { wunschIds, entscheidung, ab, grund } }, n);
