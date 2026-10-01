// src/lib/plattform/backend/frappe/eg-energie.js
//
// Frappe-Adapter WP3 „Energiedaten, Verteilung, Simulation und Prognose“. Methoden in oekoinvest_app.plattform.api.eg_energie –
// Signaturen identisch zu backend/demo/eg-energie.js (Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4). Frappe prüft Rolle,
// Kontext-Rolle je Gemeinschaft (api/eg_stamm.zugriff) und protokolliert Einzeleinsichten selbst.
// Tagesblöcke liegen im DocType „Plattform EG Messreihe“ (je ZP × Gemeinschaft × Tag × Größe), Monatswerte in
// „Plattform EG Messmonat“, Simulationen in „Plattform EG Simulation“. Rechenkern: plattform/eg_energie_kern.py.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  enMessreihen: "eg_energie.messreihen",
  enEnergiedatenEmpfangen: "eg_energie.energiedaten_empfangen",
  enPeriodenwerte: "eg_energie.periodenwerte",
  enQualitaet: "eg_energie.qualitaet",
  enAbweichungsbericht: "eg_energie.abweichungsbericht",
  enCsvImport: "eg_energie.csv_import",
  enSimulation: "eg_energie.simulation",
  enSimulationen: "eg_energie.simulationen",
  enPrognose: "eg_energie.prognose",
  enOptimierung: "eg_energie.optimierung",
});

export const enMessreihen = (n, filter = {}) => aufruf("enMessreihen", { filter }, n);
export const enEnergiedatenEmpfangen = (sys, payload = {}) => aufruf("enEnergiedatenEmpfangen", { payload }, sys);
export const enPeriodenwerte = (n, gemeinschaftId, von, bis) => aufruf("enPeriodenwerte", { gemeinschaftId, von, bis }, n);
export const enQualitaet = (n, gemeinschaftId, daten = {}) => aufruf("enQualitaet", { gemeinschaftId, daten }, n);
export const enAbweichungsbericht = (n, gemeinschaftId, daten = {}) => aufruf("enAbweichungsbericht", { gemeinschaftId, daten }, n);
export const enCsvImport = (n, gemeinschaftId, daten = {}) => aufruf("enCsvImport", { gemeinschaftId, daten }, n);
export const enSimulation = (n, { daten = {} } = {}) => aufruf("enSimulation", { daten }, n);
export const enSimulationen = (n, { gemeinschaftId = "" } = {}) => aufruf("enSimulationen", { gemeinschaftId }, n);
export const enPrognose = (n, gemeinschaftId, daten = {}) => aufruf("enPrognose", { gemeinschaftId, daten }, n);
export const enOptimierung = (n, { zaehlpunktId = "" } = {}) => aufruf("enOptimierung", { zaehlpunktId }, n);

/** Dashboard (Zusatz, nicht im Vertrag): aus drei Messreihen-Abfragen zusammengesetzt wie im Demo-Backend */
export async function enDashboard(n, gemeinschaftId) {
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const tag = (d) => new Date(Date.parse(`${heute}T12:00:00Z`) + d * 864e5).toISOString().slice(0, 10);
  const m = new Date(Date.parse(`${heute.slice(0, 7)}-15T12:00:00Z`));
  m.setUTCMonth(m.getUTCMonth() - 13);
  const [monate, tage, woche] = await Promise.all([
    enMessreihen(n, { gemeinschaftId, von: `${m.toISOString().slice(0, 7)}-01`, bis: tag(-1), aufloesung: "monat" }),
    enMessreihen(n, { gemeinschaftId, von: tag(-30), bis: tag(-1), aufloesung: "tag" }),
    enMessreihen(n, { gemeinschaftId, von: tag(-7), bis: tag(-1) }),
  ]);
  return { monate: monate.zeilen, tage: tage.zeilen, woche: woche.tage, heute };
}
