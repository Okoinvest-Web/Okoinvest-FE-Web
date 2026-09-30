// src/lib/plattform/backend/kycIdent.js
//
// Backend-Teil „KYC – Eigene Identifizierung“ (Videoidentifizierung durch die Compliance). MRZ und Methodenwahl laufen über
// kycSpeichern (Abschnitte „mrz“, „methode“) in backend/kyc.js. Auswahl wie kycBackend(): Frappe bei
// PLATTFORM_BACKEND=frappe, sonst Demo.
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md, Abschnitt „KYC/KYB – Eigene Identifizierung“:
//   Nutzer:      kycVideo(n,{von,bis}) · kycVideoBuchen(n,{start}) · kycVideoStornieren(n)
//   Compliance:  kycVideoAktion(n,fallId,{aktion,…}) · kycVideoProtokoll(n,fallId,protokollId,{ip})
// Nur serverseitig verwenden.

import * as demo from "./demo/kycIdent";
import * as frappe from "./frappe/kycIdent";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const KYC_IDENT_OPERATIONEN = ["kycVideo", "kycVideoBuchen", "kycVideoStornieren", "kycVideoAktion", "kycVideoProtokoll"];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = KYC_IDENT_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] KYC-Ident ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function kycIdentBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
