// src/lib/plattform/backend/eid.js
//
// Backend-Teil „Staatliche eID“ (ID Austria, Online-Ausweis) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/EID.md.
//
// Operationen (n = angemeldeter Nutzer):
//   eidStatus(n) · eidStarten(n,{methode,basisUrl}) → {vorgang,url,bindung} · eidDemoCode(n,{state,nonce,codeChallenge,auswahl})
//   eidAbschluss(n,{state,code,fehler,bindung}) · eidEinstellungen(n) · eidEinstellungenSpeichern(n,{hochBestaetigt})
// Nur serverseitig verwenden.

import * as demo from "./demo/eid";
import * as frappe from "./frappe/eid";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const EID_OPERATIONEN = ["eidStatus", "eidStarten", "eidDemoCode", "eidAbschluss", "eidEinstellungen", "eidEinstellungenSpeichern"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = EID_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] eID ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function eidBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
