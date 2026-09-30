// src/lib/plattform/backend/bedienung.js
//
// Backend-Teil „Bedienung & Onboarding“ (eigene Schnittstelle, damit backend/index.js
// unverändert bleibt). Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe,
// sonst Demo (bzw. 503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer):
//   suchen(n,{q,limit})            → { q, treffer:[{ art, id, titel, untertitel, href }] } – nur Berechtigtes
//   onboarding(n)                  → { status, schritt, erledigt[], checklisteAus, aktualisiertAm }
//   onboardingSpeichern(n,aenderung) → neuer Zustand ({ status?, schritt?, erledigt?[], checklisteAus? })
//
// Nur serverseitig verwenden.

import * as demo from "./demo/bedienung";
import * as frappe from "./frappe/bedienung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export function bedienung() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
