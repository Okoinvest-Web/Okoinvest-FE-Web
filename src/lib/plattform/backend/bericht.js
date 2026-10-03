// src/lib/plattform/backend/bericht.js
//
// Backend-Teil „Bericht“ (Welle 2, Paket B4) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo. Nur serverseitig verwenden.
//
//   berichtAnlegen({ tokenHash, rechner, land, eingaben, ergebnis, pruefId, stand, ablauf, kontakt, einwilligungen,
//                    kanal, mail: { betreff, text, link, linkText } })                      → { id }
//   berichtBestaetigungBeginnen({ tokenHash, jetztMs })      → { zustand, eintrag? }  (eintrag inkl. kontakt)
//   berichtBestaetigungAbschliessen({ tokenHash, vorgangId, ablauf, jetztMs }) → { ok }
//   berichtBestaetigungZuruecksetzen({ tokenHash })          → { ok }
//   berichtLesen({ tokenHash, jetztMs })                     → { zustand, bericht? }   (nie Personendaten)
//   berichtAufraeumen()                                      → { geaendert }
//
// zustand: null (unbekannt) | "offen" | "in_bestaetigung" | "bestaetigt" | "abgelaufen" (siehe src/lib/bericht/token.js)
// Gespeichert wird nur der SHA-256 des Tokens. Ablauf der Orchestrierung: src/lib/bericht/dienst.js.

import * as demo from "./demo/bericht";
import * as frappe from "./frappe/bericht";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const BERICHT_OPERATIONEN = [
  "berichtAnlegen", "berichtBestaetigungBeginnen", "berichtBestaetigungAbschliessen", "berichtBestaetigungZuruecksetzen", "berichtLesen", "berichtAufraeumen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = BERICHT_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Bericht ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function berichtBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
