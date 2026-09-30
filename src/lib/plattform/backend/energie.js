// src/lib/plattform/backend/energie.js
//
// Backend-Teil „Energiebeschaffung & Versorger-Ausschreibung“ (Team A3; eigene Schnittstelle, backend/index.js bleibt
// unverändert). Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne
// PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt „Energiebeschaffung“. Reine Rechenlogik: src/lib/plattform/energie/*.
//
// Operationen (n = angemeldeter Nutzer):
//   Markt:        energieSpot(n,{zone,tage}) · energieTermin(n,{zone,produkt}) · energieTerminSpeichern(n,{eintrag|csv,quelleStandard})
//                 energieTerminLoeschen(n,id) · energieEinstellungen(n) · energieEinstellungenSpeichern(n,daten) · energieUebersicht(n)
//   Kunden:       energieKunden(n) · energieKunde(n,kundeId) · energieVertragSpeichern(n,{id?,kundeId?,daten}) · energieMeine(n)
//                 energieVollmachtErteilen(n,{zustimmung,ip,userAgent}) · energieVollmachtWiderrufen(n,{ip}) · energieVollmachtSignatur(n,kundeId,signaturId)
//   Lieferanten:  energieLieferanten(n) · energieLieferant(n,id) · energieLieferantSpeichern(n,{id?,daten}) · energieLieferantBewerten(n,id,{sterne,text})
//                 energieLieferantEinladen(n,id,{email,basisUrl,ausschreibungId?}) · energieEinladungInfo(token)
//                 energieEinladungAnnehmen(n|null,token,{vorname,nachname,passwort,ip})
//   Ausschreibung: energieAusschreibungen(n,{status}) · energieAusschreibung(n,id) · energieAusschreibungAnlegen(n,daten)
//                 energieAusschreibungAktion(n,id,{aktion,…}) · energieAngebotAbgeben(n,id,preisblatt) · energieAngebotZurueckziehen(n,angebotId)
//                 energieFrageStellen(n,id,{text}) · energieFreigabe(n,id,{entscheidung,kommentar,ip})
//   Portfolio:    energiePortfolio(n) · energieTrancheSpeichern(n,daten) · energieTrancheStornieren(n,id)
//   Sonstiges:    energieDokumentDaten(n,{art,id}) (PDF erzeugt die Website) · energieLauf(n) · energieSystemLauf() (Demo: Scheduler-Ersatz)
//   Bericht:      energieDokumentDaten(n,{art:"kundenbericht",id:kundeId}) – Beschaffungsbericht je Kunde (PDF)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/energie";
import * as frappe from "./frappe/energie";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const ENERGIE_OPERATIONEN = [
  "energieSpot", "energieTermin", "energieTerminSpeichern", "energieTerminLoeschen", "energieEinstellungen", "energieEinstellungenSpeichern", "energieUebersicht",
  "energieKunden", "energieKunde", "energieVertragSpeichern", "energieMeine", "energieVollmachtErteilen", "energieVollmachtWiderrufen", "energieVollmachtSignatur",
  "energieLieferanten", "energieLieferant", "energieLieferantSpeichern", "energieLieferantBewerten", "energieLieferantEinladen", "energieEinladungInfo", "energieEinladungAnnehmen",
  "energieAusschreibungen", "energieAusschreibung", "energieAusschreibungAnlegen", "energieAusschreibungAktion", "energieAngebotAbgeben", "energieAngebotZurueckziehen",
  "energieFrageStellen", "energieFreigabe", "energiePortfolio", "energieTrancheSpeichern", "energieTrancheStornieren", "energieDokumentDaten", "energieLauf", "energieSystemLauf",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = ENERGIE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Energie ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function energieBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
