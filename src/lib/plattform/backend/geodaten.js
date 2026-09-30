// src/lib/plattform/backend/geodaten.js
//
// Backend-Teil „Geodaten & Akquise-Engine“ (Übernahme von Kandidatenflächen als Akquise-Ziel, gepflegte
// Netzkapazitäten). Eigene Schnittstelle – backend/index.js bleibt unverändert. Gleiche Auswahl wie backend():
// Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// Die Geodaten selbst (Kandidaten, Netzknoten, Ebenen) liefert src/lib/plattform/geodaten (Dienst oder Demo-Dateien).
//
// Operationen (n = angemeldeter Nutzer, Vertrag docs/API.md Abschnitt „Geodaten“):
//   akquiseZiele(n) · akquiseZielUebernehmen(n, kandidat, { notiz }) · netzkapazitaeten(n) · netzkapazitaetSetzen(n, knotenId, daten)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/geodaten";
import * as frappe from "./frappe/geodaten";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const GEODATEN_OPERATIONEN = ["akquiseZiele", "akquiseZielUebernehmen", "netzkapazitaeten", "netzkapazitaetSetzen"];

export function geodatenBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
