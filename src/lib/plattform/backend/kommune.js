// src/lib/plattform/backend/kommune.js
//
// Backend-Teil „Fachprüfung Flächen & Kommunen“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer):
//   kommuneUebersicht(n,{vorgangId}) → { admin, anliegen[], gemeinden[{name, land, schluessel, vorgangId, projekte[], summe, ansprechpartner}], geprueft }
//   fachDemoBereit()                 → ergänzt einmalig Demo-Fachdaten (nur Demo; Frappe: nichts)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/flaecheFach";
import * as frappe from "./frappe/kommune";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export function fachBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
