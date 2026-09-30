// src/lib/plattform/backend/portfolio.js
//
// Backend-Teil „Portfolio“ (Investor nach dem Kauf: Positionen, Ertrag Soll/Ist, Covenants, Ausschüttungen, Kapitalabrufe,
// Dokumente, Berichte, Wiederverkauf) – eigene Schnittstelle, backend/index.js bleibt unverändert. Auswahl wie backend():
// Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md,
// Abschnitt „Portfolio“. Regeln: portfolio/kern.js.
//
// Operationen (n = angemeldeter Nutzer):
//   Investor:   pfMeine(n) · pfPosition(n,id) · pfPortalAktion(n,id,{aktion: abruf_melden|wiederverkauf|wiederverkauf_zurueck|provision_akzeptieren,…})
//               pfBerichtDaten(n,id,{art,periode,ip}) (PDF erzeugt die Website) · pfDokumentLesen(n,dokId,{ip})
//   Backoffice: pfUebersicht(n) · pfAuswahl(n) · pfAnlegen(n,daten) · pfAendern(n,id,daten)
//               pfAktion(n,id,{aktion: status|ertrag|abruf|abruf_bestaetigen|abruf_stornieren|ausschuettung|ausschuettung_storno|boerse,…})
//               pfDokumentSpeichern(n,{positionId,art,name,mime,daten,freigabe}) · pfFristenLauf(n|null) (Frappe: Scheduler täglich)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/portfolio";
import * as frappe from "./frappe/portfolio";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const PORTFOLIO_OPERATIONEN = [
  "pfMeine", "pfPosition", "pfPortalAktion", "pfBerichtDaten", "pfDokumentLesen",
  "pfUebersicht", "pfAuswahl", "pfAnlegen", "pfAendern", "pfAktion", "pfDokumentSpeichern", "pfFristenLauf",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = PORTFOLIO_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Portfolio ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function portfolioBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
