// src/lib/plattform/backend/kundenenergie.js
//
// Backend-Teil „Kundenseite Energie“ (Team 4: Contracting-Kunde, Reststrom-Kunde, Energieversorger). Eigene Schnittstelle,
// backend/index.js bleibt unverändert. Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo.
// Vertrag: docs/API.md, Abschnitt „Kundenseite Energie“. Regeln: src/lib/plattform/kundenenergie.js.
//
// Operationen (n = angemeldeter Nutzer):
//   Anliegen:   kundenAnliegen(n,{status}) · kundenAnliegenAuswahl(n) · kundenAnliegenAnlegen(n,daten)
//               kundenAnliegenAktion(n,id,{aktion,…}) · kundenAnliegenDokument(n,id)
//   Störung:    kundenStoerungMelden(n,{anlageId,titel,text,auswirkung})
//   Wechsel:    lieferantenwechsel(n,{ausschreibungId}) · lieferantenwechselAktion(n,id,{schritt,bemerkung})
//   Versorger:  vertragsdaten(n,ausschreibungId,{ip})
//   Kosten:     kostenbericht(n,{jahr})
//
// Nur serverseitig verwenden.

import * as demo from "./demo/kundenenergie";
import * as frappe from "./frappe/kundenenergie";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const KUNDENENERGIE_OPERATIONEN = [
  "kundenAnliegen", "kundenAnliegenAuswahl", "kundenAnliegenAnlegen", "kundenAnliegenAktion", "kundenAnliegenDokument", "kundenStoerungMelden",
  "lieferantenwechsel", "lieferantenwechselAktion", "vertragsdaten", "kostenbericht",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = KUNDENENERGIE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Kundenseite Energie ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function kundenenergieBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
