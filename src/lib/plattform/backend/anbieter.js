// src/lib/plattform/backend/anbieter.js
//
// Backend-Teil „Anbieter / Verkäufer“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer) – Vertrag: docs/API.md, Abschnitt „Anbieter / Verkäufer“:
//   anbieterAkte(n, projektId)                       → Akte je Rolle (anbieter | admin | investor: nur Bestandsdaten)
//   anbieterAktion(n, projektId, daten, {ip})        → Anbieter: mandat_erteilen · mandat_kuendigen · exklusivitaet_beenden ·
//                                                      pruefpunkt_antworten · votum · gebot_votum · vorkenntnis_melden · bestand_speichern · ertrag_import
//   anbieterAdminAktion(n, projektId, daten, {ip})   → Backoffice (Bereich „projekte“ schreiben): pruefpunkt_anlegen · pruefpunkt ·
//                                                      mandat_bestaetigen · vorkenntnis_entscheiden
//   anbieterCockpit(n)                               → offene Schritte je Projekt (Anbieter) bzw. Punkte für das Backoffice
//   vermittlungsauftragDaten(n, projektId, {ip})     → Inhalt für das PDF des Vermittlungsauftrags (Muster)
//   anbieterFristLauf(n)                             → Erinnerung an überfällige Rückfragen (Frappe: täglicher Scheduler)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/anbieter";
import * as frappe from "./frappe/anbieter";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export function anbieterBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
