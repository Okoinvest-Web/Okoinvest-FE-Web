// src/lib/plattform/backend/gemeinde.js
//
// Backend-Teil „Gemeindecockpit“ (Team 5, Rolle kommune) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo. Vertrag: docs/API.md, Abschnitt „Gemeindecockpit“.
//
// Operationen (n = angemeldeter Nutzer):
//   gdCockpit(n,{vorgangId}) → Cockpit oder null (noch nicht geprüft) · gdAktion(n,vorgangId,{aktion,…},{ip})
//   gdMaterial(n,vorgangId,{art,projektRef},{ip}) → Entwurfstext (Bürgerinfo/Presse)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/gemeinde";
import * as frappe from "./frappe/gemeinde";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const GEMEINDE_OPERATIONEN = ["gdCockpit", "gdAktion", "gdMaterial"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = GEMEINDE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Gemeinde ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function gemeindeBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
