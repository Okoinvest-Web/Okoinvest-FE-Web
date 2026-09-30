// src/lib/plattform/backend/onboarding.js
//
// Backend-Teil „Onboarding-Assistenten je Rolle und Untertyp“ (Team B1; eigene Schnittstelle, backend/index.js bleibt
// unverändert). Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Onboarding-Assistenten“.
//
// Operationen (n = angemeldeter Nutzer):
//   onbZustand(n) · onbSpeichern(n, zustand, {aktion, auswertung, protokollText}) · onbMail(n, art, {pfadTitel, offen})
//   onbTeam(n) (nur Leitung) · onbMailLauf(n|null) (Frappe: Scheduler täglich)
// Die Prüfung erlaubter Schritte passiert im Server (server/onboarding.js) UND in Frappe (plattform/onboarding_kern.py).
//
// Nur serverseitig verwenden.

import * as demo from "./demo/onboarding";
import * as frappe from "./frappe/onboarding";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const ONBOARDING_OPERATIONEN = ["onbZustand", "onbSpeichern", "onbMail", "onbTeam", "onbMailLauf"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = ONBOARDING_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Onboarding ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function onboardingBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
