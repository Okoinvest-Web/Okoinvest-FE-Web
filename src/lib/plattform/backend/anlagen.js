// src/lib/plattform/backend/anlagen.js
//
// Backend-Teil „Anlagen & Monitoring“ (Stammdaten und Prozesse; eigene Schnittstelle, backend/index.js bleibt
// unverändert). Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im
// Produktions-Build ohne PLATTFORM_DEMO=1). Messdaten (Zeitreihen) liefert src/lib/plattform/messdaten.
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md Abschnitt 10:
//   Anlagen:    anlagen(n,{q,typ,status}) · anlage(n,id) · anlagenKunden(n) · anlageAnlegen(n,daten) · anlageAendern(n,id,daten)
//   Einträge:   anlageEintragSpeichern(n,anlageId,{art,id?,daten}) · anlageEintragLoeschen(n,anlageId,{art,id})
//               (art: komponente | messpunkt | wartung | vertrag | monatswert)
//   Zähler:     zaehlerMonatswerte(n,anlageId)
//   Geräte:     geraetZugangAnlegen(n,anlageId,{bezeichnung}) → {zugang, passwort (einmalig), broker}
//               geraetZugang(n,id) · geraetZugangAktion(n,id,{aktion: sperren|entsperren|neu|testnachricht})
//   Störungen:  stoerungen(n,{anlageId,status,limit}) · stoerungAnlegen(n,{anlageId,schwere,titel,text})
//               stoerungAktion(n,id,{aktion: kommentar|quittieren|status|zuweisen|schwere, …}) · anlagenLeitstand(n)
//   Nur Demo:   stoerungSystem(befund) – nachgebildete Regeln des Ingest-Dienstes (Frappe: no-op, der Dienst meldet selbst)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/anlagen";
import * as frappe from "./frappe/anlagen";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const ANLAGEN_OPERATIONEN = [
  "anlagen", "anlage", "anlagenKunden", "anlageAnlegen", "anlageAendern", "anlageEintragSpeichern", "anlageEintragLoeschen", "zaehlerMonatswerte",
  "geraetZugangAnlegen", "geraetZugang", "geraetZugangAktion", "stoerungen", "stoerungAnlegen", "stoerungAktion", "anlagenLeitstand", "stoerungSystem",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = ANLAGEN_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Anlagen ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function anlagenBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
