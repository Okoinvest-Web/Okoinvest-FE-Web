// src/lib/plattform/backend/finanzierung.js
//
// Backend-Teil „Finanzierung“ (Investoren-Cockpit, Bankfinanzierung Eigenbetrieb, Bank-Portal) – eigene Schnittstelle,
// backend/index.js bleibt unverändert. Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo
// (503 im Produktions-Build ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Finanzierung“; Recherche docs/FINANZIERUNG.md.
//
// Operationen (n = angemeldeter Nutzer):
//   Investor:   fzCockpitListe(n) · fzCockpitProjekt(n,projektId) · fzSzenarioSpeichern(n,{projektId?,name,eingaben,fokus})
//               fzSzenarioLoeschen(n,id) · fzSzenario(n,id,{ip}) (PDF-Daten)
//   Backoffice: fzUebersicht(n) · fzFall(n,id) · fzAuswahl(n) · fzFallAnlegen(n,daten) · fzFallAendern(n,id,daten)
//               fzBankSpeichern(n,daten) · fzAktion(n,fallId,{aktion,…}) (anfragen|einladung_neu|anfrage_zurueck|paket|termsheet|
//               entscheidung|kreditvertrag|cp|covenant|geschaeftsmodell) · fzDokumentSpeichern(n,{fallId,baustein,name,mime,daten})
//               fzDokumentLesen(n,id,{anfrageId,ip}) · fzModellDaten(n,fallId,{anfrageId,baustein,ip}) · fzReportingDaten(n,fallId,{ip})
//               fzCovenantLauf(n|null) (Frappe: Scheduler täglich) · fzGeschaeftsmodell(n,{fallId?,eingaben,annahmen})
//   Bank:       fzBankEinladungInfo(token) · fzBankEinladungAnnehmen(n,token) · fzBankMeine(n) · fzBankAnfrage(n,anfrageId)
//               fzBankAktion(n,anfrageId,{aktion: termsheet|absage|rueckfrage,…}) · fzBankZaehler(n)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/finanzierung";
import * as frappe from "./frappe/finanzierung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const FINANZIERUNG_OPERATIONEN = [
  "fzCockpitListe", "fzCockpitProjekt", "fzSzenarioSpeichern", "fzSzenarioLoeschen", "fzSzenario", "fzUebersicht", "fzFall", "fzAuswahl",
  "fzFallAnlegen", "fzFallAendern", "fzBankSpeichern", "fzAktion", "fzDokumentSpeichern", "fzDokumentLesen", "fzModellDaten", "fzReportingDaten",
  "fzCovenantLauf", "fzGeschaeftsmodell", "fzBankEinladungInfo", "fzBankEinladungAnnehmen", "fzBankMeine", "fzBankAnfrage", "fzBankAktion", "fzBankZaehler",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = FINANZIERUNG_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Finanzierung ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function finanzierungBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
