// src/lib/plattform/backend/dienste.js
//
// Backend-Teil „Firmen-, Bonitäts- & Identitätsdienste + SPV-Gründung“ (eigene Schnittstelle, backend/index.js bleibt
// unverändert). Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build
// ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Dienste“, Recherche/Anbieter: docs/DIENSTE-EXTERN.md.
//
// Operationen (n = angemeldeter Nutzer):
//   Identität:      identStatus(n) · identStarten(n,{basisUrl}) · identDemoAbschluss(n,{sitzungId,ergebnis}) · mrzPruefen(n,{zeilen})
//                   identWebhook({anbieter,kopf,roh}) (System, HMAC-geprüft)
//   Register:       registerSuche(n,{land,q}) · registerAbruf(n,{land,nummer,kycFallId,zweck}) · registerAuskuenfte(n,{q})
//                   registerAuskunft(n,id) · registerAuskunftPdf(n,id) → {pdf,name}
//   Bonität:        bonitaetUebersicht(n,{q}) · bonitaetBeauftragen(n,{subjekt:{art,id},land,registernummer,anlass,rechtsgrundlage,interesseId,informieren})
//                   bonitaetDetail(n,id,{ip}) · bonitaetFreigeben(n,id,{begruendung}) · bonitaetEinstellungenSpeichern(n,daten) · bonitaetStatus(n,{kontoId,organisationId})
//   Gesellschaften: gesellschaftenListe(n,{q,status}) · gesellschaftAuswahl(n) · gesellschaftNamenPruefen(n,{rechtsform,name})
//                   gesellschaftAnlegen(n,daten) · gesellschaft(n,id) · gesellschaftAendern(n,id,daten) · gesellschaftSchritt(n,id,{schluessel,status,datum,notiz,wert})
//                   gesellschaftDokumente(n,id,{dok}) → {pdf,name} · gesellschaftErp(n,id) · gesellschaftFristen(n)
//
// FÜR ANDERE TEAMS: Bonitätspflicht vor LOI/Gebot im Demo-Backend innerhalb der Transaktion:
//   import { bonitaetSperre } from "./demo/diensteRegeln";  bonitaetSperre(db, "loi"|"gebot", { kontoId, organisationId });
//   Frappe: oekoinvest_app.plattform.dienste_kern.bonitaet_sperre(schritt, konto_id=…, organisation_id=…)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/dienste";
import * as frappe from "./frappe/dienste";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const DIENSTE_OPERATIONEN = [
  "identStatus", "identStarten", "identDemoAbschluss", "mrzPruefen", "identWebhook", "registerSuche", "registerAbruf", "registerAuskuenfte", "registerAuskunft",
  "registerAuskunftPdf", "bonitaetUebersicht", "bonitaetBeauftragen", "bonitaetDetail", "bonitaetFreigeben", "bonitaetEinstellungenSpeichern", "bonitaetStatus",
  "gesellschaftenListe", "gesellschaftAuswahl", "gesellschaftNamenPruefen", "gesellschaftAnlegen", "gesellschaft", "gesellschaftAendern", "gesellschaftSchritt",
  "gesellschaftDokumente", "gesellschaftErp", "gesellschaftFristen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = DIENSTE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Dienste ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function diensteBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
