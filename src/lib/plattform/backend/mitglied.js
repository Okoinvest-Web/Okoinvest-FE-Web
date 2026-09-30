// src/lib/plattform/backend/mitglied.js
//
// Backend-Teil „Mitglied & Genossenschaft“ (Team 5) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// Vertrag: docs/API.md, Abschnitt „Mitglied & Genossenschaft“. Regeln: src/lib/plattform/mitglied/*.js.
//
// Operationen (n = angemeldeter Nutzer):
//   Portal:     mgUebersicht(n) · mgBeitritt(n,genoId,daten,{ip}) · mgAktion(n,id,{aktion,…},{ip}) · gvDetail(n,gvId)
//               gvAbstimmen(n,gvId,stimmen,{ip}) · egBeitreten(n,egId,daten,{ip}) · egTeilnahmeAktion(n,id,{aktion},{ip})
//               mgDokument(n,{art,id},{ip})
//   Backoffice: boGeno(n) · boGenoSpeichern(n,{id,daten}) · boMitgliedAktion(n,id,{aktion,…},{ip})
//               boGvSpeichern(n,{id,genoId,daten}) · boGvAktion(n,id,{aktion,…},{ip})
//               boAusschuettungAnlegen(n,{genoId,daten}) · boAusschuettungAktion(n,id,{aktion,…},{ip})
//               boEg(n) · boEgSpeichern(n,{id,daten}) · boTeilnahmeAktion(n,id,{aktion,…},{ip}) · boEgAbrechnen(n,egId,{monat,messwerte})
//
// Nur serverseitig verwenden.

import * as demo from "./demo/mitglied";
import * as frappe from "./frappe/mitglied";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const MITGLIED_OPERATIONEN = [
  "mgUebersicht", "mgBeitritt", "mgAktion", "gvDetail", "gvAbstimmen", "egBeitreten", "egTeilnahmeAktion", "mgDokument",
  "boGeno", "boGenoSpeichern", "boMitgliedAktion", "boGvSpeichern", "boGvAktion", "boAusschuettungAnlegen", "boAusschuettungAktion",
  "boEg", "boEgSpeichern", "boTeilnahmeAktion", "boEgAbrechnen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = MITGLIED_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Mitglied ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function mitgliedBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
