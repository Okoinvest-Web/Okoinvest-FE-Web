// src/lib/plattform/backend/akquise2.js
//
// Backend-Teil „Akquise Ausbaustufe 2“ (Kampagnen, Sperrliste, Angebotsseite per Einmalcode, Gemeinde-Screening).
// Eigene Schnittstelle – backend/index.js bleibt unverändert. Gleiche Auswahl wie backend(): Frappe bei
// PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1). Nur serverseitig verwenden.
//
// Operationen (n = angemeldeter Nutzer; Vertrag docs/API.md Abschnitt „Akquise-Kampagnen“):
//   Kampagnen:  kampagnen(n) · kampagne(n, id) · kampagneAnlegen(n, kandidaten, daten) · kampagneAendern(n, id, daten) ·
//               kampagneStarten(n, id) · kampagneLoeschen(n, id) · kampagnenNachfassen(n) · grundbuchErgebnis(n, zielId, daten) ·
//               empfaengerAendern(n, zielId, empfaengerId, daten) · empfaengerSperren(n, zielId, empfaengerId, daten) ·
//               serienbriefDaten(n, id, { stufe }) · versandBestaetigen(n, id, { stufe, empfaengerIds })
//   Sperrliste: sperrliste(n) · sperreAnlegen(n, daten) · sperreAufheben(n, id, { begruendung })
//   Öffentlich: angebotFuerCode(code) · angebotAufruf(code) · angebotAnfrageVerknuepfen(code, daten) · angebotWiderspruch(code)
//   Gemeinden:  gemeindenScreening(n, kandidaten, kapazitaeten, filter) · gemeindeSpeichern · konkurrenzAnlegen ·
//               konkurrenzEntfernen · gemeindeUebergeben · uebergabeZuruecknehmen · gemeindeZuruecksetzen

import * as demoKampagne from "./demo/akquise-kampagne";
import * as demoGemeinde from "./demo/gemeinde-screening";
import * as frappe from "./frappe/akquise2";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

const demo = { ...demoKampagne, ...demoGemeinde };

export function akquise2Backend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
