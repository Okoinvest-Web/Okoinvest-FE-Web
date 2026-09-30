// src/lib/plattform/backend/betrieb.js
//
// Backend-Teil „Betriebsführung“ der Anlagen (Team Anlagenbetrieb; eigene Schnittstelle, backend/index.js bleibt
// unverändert). Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Betriebsführung“. Reine Regeln: src/lib/plattform/betrieb/kern.js,
// Auswertung mit Messdaten (Kennzahlen, Plausibilisierung, Bericht): src/lib/plattform/betrieb/auswertung.js.
//
// Operationen (n = angemeldeter Nutzer, nur Backoffice mit Bereich „anlagen“):
//   Übersicht:     betriebUebersicht(n) · betriebAnlage(n,anlageId) · betriebLauf(n) · betriebSystemLauf() (nur Demo)
//   Störung:       betriebStoerung(n,id) · betriebStoerungSpeichern(n,id,daten,kontext) · betriebStoerungBeheben(n,id,{text})
//   Aufträge:      betriebAuftragSpeichern(n,daten) · betriebAuftragAktion(n,id,{status,…}) · betriebAuftrag(n,id)
//   Versicherung:  betriebVersicherungSpeichern(n,daten) · betriebVersicherungAktion(n,id,{status,…})
//   Wartung:       betriebPlanSpeichern(n,anlageId,daten) · betriebPlanLoeschen(n,anlageId,id) · betriebPlaeneVorschlagen(n,anlageId)
//                  betriebProtokollSpeichern(n,anlageId,daten) · betriebProtokoll(n,id)
//   Lager:         betriebErsatzteilSpeichern(n,daten) · betriebErsatzteilBewegung(n,id,{art,menge,…})
//   Kennzahlen:    betriebEinstrahlungSpeichern(n,anlageId,{monat,kwhM2,quelle}) · betriebMonatswertFreigeben(n,anlageId,{…})
//   Bericht:       betriebBerichtDaten(n,anlageId,{von,bis})
//
// Nur serverseitig verwenden.

import * as demo from "./demo/betrieb";
import * as frappe from "./frappe/betrieb";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const BETRIEB_OPERATIONEN = [
  "betriebUebersicht", "betriebAnlage", "betriebStoerung", "betriebStoerungSpeichern", "betriebStoerungBeheben", "betriebAuftragSpeichern", "betriebAuftragAktion", "betriebAuftrag",
  "betriebVersicherungSpeichern", "betriebVersicherungAktion", "betriebPlanSpeichern", "betriebPlanLoeschen", "betriebPlaeneVorschlagen", "betriebProtokollSpeichern", "betriebProtokoll",
  "betriebErsatzteilSpeichern", "betriebErsatzteilBewegung", "betriebEinstrahlungSpeichern", "betriebMonatswertFreigeben", "betriebBerichtDaten", "betriebLauf", "betriebSystemLauf",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = BETRIEB_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Betrieb ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function betriebBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
