// src/lib/plattform/backend/closing.js
//
// Backend-Teil „Grundbuch & Dienstbarkeiten + Deal-Abschluss (Closing)“ – eigene Schnittstelle, backend/index.js bleibt
// unverändert. Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Grundbuch & Closing“; Recherche: docs/GRUNDBUCH-CLOSING.md.
//
// Operationen (n = angemeldeter Nutzer):
//   Grundbuch:  gbListe(n,{status,land,q}) · gbMeine(n) · gbZuBezug(n,{bezugArt,bezugId}) · gbAkte(n,id) · gbAuswahl(n)
//               gbAnlegen(n,daten) · gbAendern(n,id,daten) · gbSchritt(n,id,{schluessel,status,datum,nachweisWert,notiz,frist})
//               gbSignatur(n,id,{pdf,dateiname,ip}) · gbDokumentSpeichern(n,id,{schritt,name,mime,daten}) · gbDokumentLesen(n,id,dokId,{ip})
//               gbMusterDaten(n,id,{vorlage,ip}) · gbFristenLauf(n|null)
//   Closing:    clListe(n,{status}) · clMeine(n) · clAkte(n,id) · clAnlegen(n,daten) · clAendern(n,id,daten)
//               clAktion(n,id,{aktion,…}) · clPortalAktion(n,id,{aktion:"cp_melden",schluessel,nachweis})
//               clDokumentDaten(n,id,{art:"spa"|"bericht",ip}) · clTermin(n,id)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/closing";
import * as frappe from "./frappe/closing";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const CLOSING_OPERATIONEN = [
  "gbListe", "gbMeine", "gbZuBezug", "gbAkte", "gbAuswahl", "gbAnlegen", "gbAendern", "gbSchritt", "gbSignatur", "gbDokumentSpeichern", "gbDokumentLesen",
  "gbMusterDaten", "gbFristenLauf", "clListe", "clMeine", "clAkte", "clAnlegen", "clAendern", "clAktion", "clPortalAktion", "clDokumentDaten", "clTermin",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = CLOSING_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Grundbuch/Closing ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function closingBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
