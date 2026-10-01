// src/lib/plattform/backend/fristErinnerung.js
//
// Backend-Teil „Fristerinnerungen“ (täglicher Lauf: Pachtakte, Genossenschaft, Gemeinde). Gleiche Auswahl wie backend():
// Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo. Regeln: src/lib/plattform/fristErinnerung.js.
//
//   fristErinnerungLauf(n)   → Backoffice-Knopf: fällige Erinnerungen jetzt senden (Frappe: Scheduler daily
//                              frist_erinnerung.erinnerungen_taeglich, manuell frist_erinnerung.lauf)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/fristErinnerung";
import * as frappe from "./frappe/fristErinnerung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export function fristErinnerungBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
