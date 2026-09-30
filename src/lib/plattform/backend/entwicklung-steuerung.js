// src/lib/plattform/backend/entwicklung-steuerung.js
//
// Backend-Teil „Projektentwicklung – Steuerung“ (eigene Schnittstelle, backend/index.js bleibt unverändert). Gleiche Auswahl
// wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// Vertrag: docs/API.md Abschnitt 11a.
//
// Operationen (n = angemeldeter Nutzer, Backoffice mit Bereich „entwicklung“):
//   steuerungUebersicht(n)                       Projektampel, Pipeline Phase × Land, Ziel-Abgleich, Kapazität, Risiken, Fristen, Vorlagen
//   steuerungProjekt(n, projektId)               Ampel, Flächensicherung, Vorlagen, Geschäftsmodell-Vergleich, Aufgaben eines Projekts
//   steuerungKapazitaetSetzen(n, nutzerId, {stundenMonat})   nur Leitung
//   steuerungSicherung(n, projektId, flaecheId, {grundbuch, grundbuchDatum, optionBis})
//   steuerungAufgabenErzeugen(n, {projektId?})   Aufgaben aus fälligen Meilensteinen und Optionsfristen (Frappe: täglich)
//   vorlageSpeichern(n, projektId, {id?, daten}) · vorlageHolen(n, id) · vorlageAktion(n, id, {aktion, begruendung, option})
//
// Nur serverseitig verwenden.

import * as demo from "./demo/entwicklung-steuerung";
import * as frappe from "./frappe/entwicklung-steuerung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const STEUERUNG_OPERATIONEN = [
  "steuerungUebersicht", "steuerungProjekt", "steuerungKapazitaetSetzen", "steuerungSicherung", "steuerungAufgabenErzeugen",
  "vorlageSpeichern", "vorlageHolen", "vorlageAktion",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = STEUERUNG_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Entwicklungssteuerung ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function steuerungBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
