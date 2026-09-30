// src/lib/plattform/backend/planung.js
//
// Backend-Teil „Planungsdateien (CAD) & Projektkostenkalkulation“ (eigene Schnittstelle, backend/index.js bleibt
// unverändert). Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Planungsdateien & Projektkosten“.
//
// Operationen (n = angemeldeter Nutzer):
//   Pläne:       planungListe(n,projektId) · planungMeine(n) · planungPlanSpeichern(n,projektId,{id?,daten})
//                planungHochladen(n,{projektId,planId?,plan,version,name,daten(Buffer)}) · planungVersionAktion(n,versionId,{aktion,kommentar})
//                planungDatei(n,versionId,{abgeleitet}) · planungVersion(n,versionId)
//   Kalkulation: kalkulationHolen(n,projektId) · kalkulationSpeichern(n,projektId,{parameter,positionen})
//                kalkulationAktion(n,projektId,{aktion,…}) · kalkulationKennzahlen(n,projektId) (Übergabe an Finanzierung/Bewertung)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/planung";
import * as frappe from "./frappe/planung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const PLANUNG_OPERATIONEN = [
  "planungListe", "planungMeine", "planungPlanSpeichern", "planungHochladen", "planungVersionAktion", "planungDatei", "planungVersion",
  "kalkulationHolen", "kalkulationSpeichern", "kalkulationAktion", "kalkulationKennzahlen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = PLANUNG_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Planung ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function planungBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
