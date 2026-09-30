// src/lib/plattform/backend/bankakte.js
//
// Backend-Teil „Bank-Akte“ (Unterlagen-Anforderungen, Q&A, Zuständigkeit, Kreditentscheidung, CP-Bestätigung, Auszahlungen,
// Monitoring-Berichte, Bank-Team) – eigene Schnittstelle neben backend/finanzierung.js. Auswahl wie backend(): Frappe bei
// PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1). Regeln: finanzierung/bankakte.js.
//
// Operationen (n = angemeldeter Nutzer; Bank-Seite und Backoffice nutzen dieselben Operationen, Rechte je Aktion):
//   baAkte(n,anfrageId) · baStaende(n,{fallId}) · baAktion(n,anfrageId,{aktion,…}) · baDateiSpeichern(n,anfrageId,{name,mime,daten})
//   baDateiLesen(n,anfrageId,dateiId,{ip}) · baBerichtDaten(n,anfrageId,berichtId,{ip})
//   baTeam(n,{bankId}) · baTeamAktion(n,{aktion,…}) · baTeamEinladungInfo(token) · baTeamEinladungAnnehmen(n,token)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/bankakte";
import * as frappe from "./frappe/bankakte";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const BANKAKTE_OPERATIONEN = ["baAkte", "baStaende", "baAktion", "baDateiSpeichern", "baDateiLesen", "baBerichtDaten", "baTeam", "baTeamAktion", "baTeamEinladungInfo", "baTeamEinladungAnnehmen"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = BANKAKTE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Bank-Akte ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function bankakteBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
