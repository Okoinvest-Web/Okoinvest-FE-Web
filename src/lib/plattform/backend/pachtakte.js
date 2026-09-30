// src/lib/plattform/backend/pachtakte.js
//
// Backend-Teil „Pachtakte“ (Team 1 – Flächeneigentümer, Landwirt, Dacheigentümer; backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md, Abschnitt „Pachtakte“:
//   Eigentümer:  meinePachtakte(n) · anliegenAnlegen(n,{vertragId,art,daten}) · anliegenAktion(n,id,{nach,kommentar,…})
//                agriNachweisSpeichern(n,{vertragId,id?,daten,einreichen}) · rueckbauAktion(n,vertragId,{ziel:"rueckbau",nach,kommentar})
//                jahresbescheinigungDaten(n,{jahr})
//   Backoffice:  pachtakteBackoffice(n,{vertragId?}) · anliegenAktion · agriNachweisAktion(n,id,{nach,kommentar})
//                rueckbauAktion(n,vertragId,{ziel:"rueckbau"|"sicherheit"|"vertrag",nach,…})
// Reine Regeln: src/lib/plattform/pachtakte.js. Nur serverseitig verwenden.

import * as demo from "./demo/pachtakte";
import * as frappe from "./frappe/pachtakte";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const PACHTAKTE_OPERATIONEN = ["meinePachtakte", "anliegenAnlegen", "anliegenAktion", "agriNachweisSpeichern", "agriNachweisAktion", "rueckbauAktion", "jahresbescheinigungDaten", "pachtakteBackoffice"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = PACHTAKTE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Pachtakte ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function pachtakteBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
