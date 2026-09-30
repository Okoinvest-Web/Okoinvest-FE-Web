// src/lib/plattform/backend/fach.js
//
// Backend-Teil „Fachprüfung Kapitalseite“ (eigene Schnittstelle, backend/index.js bleibt unverändert). Auswahl wie
// backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// Vertrag: docs/API.md, Abschnitt 11. Datenblatt, LOI und Suchprofil laufen über die bestehenden Operationen
// (projektAendern, statusWechsel, suchprofilSpeichern) – hier nur die neuen Bereiche.
//
// Operationen (n = angemeldeter Nutzer):
//   Energie:    energieDaten(n,{nutzerId?}) · abnahmestelleSpeichern(n,{id?,daten}) · abnahmestelleLoeschen(n,id)
//               lastgangHochladen(n,{name,inhalt,einheit?,abnahmestelleId?,parameter?}) · lastgangNeuRechnen(n,id,parameter)
//               lastgangLoeschen(n,id) · lastgangAnfrage(n,id,{nachricht,ip})
//   Mitglied:   egTeilnahmeSpeichern(n,daten) · genoInteresseSpeichern(n,daten,{ip})
//   Bewertung:  bewertung(n,projektId) · szenarioSpeichern(n,projektId,{name,eingaben}) · szenarioLoeschen(n,id)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/fach";
import * as frappe from "./frappe/fach";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const FACH_OPERATIONEN = [
  "energieDaten", "abnahmestelleSpeichern", "abnahmestelleLoeschen", "lastgangHochladen", "lastgangNeuRechnen", "lastgangLoeschen", "lastgangAnfrage",
  "egTeilnahmeSpeichern", "genoInteresseSpeichern", "bewertung", "szenarioSpeichern", "szenarioLoeschen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = FACH_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Fach ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function fachBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
