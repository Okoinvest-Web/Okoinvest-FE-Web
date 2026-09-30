// src/lib/plattform/backend/finanzen.js
//
// Backend-Teil „Finanzen & Abrechnung“ (eigene Schnittstelle, backend/index.js bleibt unverändert). Gleiche Auswahl wie
// backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// In Frappe wird ERPNext nur genutzt, wenn es installiert ist UND `oekoinvest_erpnext` in site_config gesetzt ist –
// sonst Eigenbetrieb mit Plattform-Abrechnungen (gleiche Ausgabe).
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md, Abschnitt „Finanzen & Abrechnung“:
//   Portal:      meineAbrechnungen(n,{jahr}) · abrechnung(n,id) · abrechnungPdfDaten(n,id,{ip})
//   Backoffice:  finanzCockpit(n) · finanzAbrechnungen(n,{art,status,q,limit}) · abrechnungAktion(n,id,{aktion,datum?,grund?})
//                abrechnungslauf(n,{art,stichtag?,monat?,trockenlauf?,vertragIds?,anlageIds?})
//                pachtvertraege(n,{status,q}) · pachtvertrag(n,id) · pachtvertragSpeichern(n,{id?,daten}) · pachtAuswahl(n)
//                klaerfaelle(n,{status}) · klaerfallAktion(n,id,{aktion,kommentar})
//                zahlungsvorschlag(n,{bis}) · sepaExport(n,{ids,ausfuehrungAm},{ip}) · zahlungslaufAktion(n,id,{aktion})
//                vpiWerte(n) · vpiSpeichern(n,{reihe,jahr,wert,quelle}) · finanzAnlagen(n) · finanzAnlageSpeichern(n,anlageId,daten)
//                entwicklungKosten(n) · entwicklungIst(n,projektId) · entwicklungKostenBuchen(n,daten)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/finanzen";
import * as frappe from "./frappe/finanzen";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const FINANZ_OPERATIONEN = [
  "meineAbrechnungen", "abrechnung", "abrechnungPdfDaten", "finanzCockpit", "finanzAbrechnungen", "abrechnungAktion", "abrechnungslauf",
  "pachtvertraege", "pachtvertrag", "pachtvertragSpeichern", "pachtAuswahl", "klaerfaelle", "klaerfallAktion", "zahlungsvorschlag", "sepaExport",
  "zahlungslaufAktion", "vpiWerte", "vpiSpeichern", "finanzAnlagen", "finanzAnlageSpeichern", "entwicklungKosten", "entwicklungIst", "entwicklungKostenBuchen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = FINANZ_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Finanzen ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function finanzenBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
