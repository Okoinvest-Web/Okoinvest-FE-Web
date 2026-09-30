// src/lib/plattform/backend/gutachter.js
//
// Backend-Teil „Gutachteraufträge“ (Angebot, Beauftragung, Termine, Lieferungen mit Version/Prüfung/Mängeln, Abnahme,
// Rechnung/Zahlung, Bewertung) – eigene Schnittstelle, backend/index.js bleibt unverändert. Auswahl wie backend(): Frappe bei
// PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt
// „Gutachteraufträge“; Regeln: src/lib/plattform/gutachter/kern.js.
//
// Operationen (n = angemeldeter Nutzer):
//   Gutachter:  gaMeine(n) · gaAuftrag(n,id) · gaAktion(n,id,{aktion,…}) · gaDateiSpeichern(n,id,{zweck,name,mime,daten,art,rechnung})
//               gaDateiLesen(n,id,dateiId) · gaPdfDaten(n,id,{art}) · gaZaehler(n)
//   Backoffice: gaUebersicht(n,{projektId,status}) · gaAnfrageAnlegen(n,daten) · gaAuftrag · gaAktion · gaZahlung(n,id,{rechnungId,datum})
//               gaFristen(n|null) (Frappe: Scheduler täglich)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/gutachter";
import * as frappe from "./frappe/gutachter";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const GUTACHTER_OPERATIONEN = ["gaMeine", "gaAuftrag", "gaAktion", "gaDateiSpeichern", "gaDateiLesen", "gaPdfDaten", "gaZaehler", "gaUebersicht", "gaAnfrageAnlegen", "gaZahlung", "gaFristen"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = GUTACHTER_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Gutachter ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function gutachterBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
