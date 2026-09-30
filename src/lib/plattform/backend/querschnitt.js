// src/lib/plattform/backend/querschnitt.js
//
// Backend-Teil „Querschnitt“ (Team 10; eigene Schnittstelle, backend/index.js bleibt unverändert). Gleiche Auswahl wie
// backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer):
//   Dokumente:     dokumentVersionen(n,id) · dokumentNeueVersion(n,id,{name,mime,daten}) · dokumentFreigeben(n,id,{status,kommentar})
//   Protokoll:     protokollSuche(n,{q,aktion,objektArt,nutzer,von,bis,seite,proSeite,alle}) → {filter,gesamt,eintraege,facetten,seiten}
//   Hinweise:      mailRhythmus(n) → {rhythmus,digestZuletzt,vorgemerkt} · mailRhythmusSpeichern(n,{rhythmus})
//                  digestLauf(n|null,{erzwingen}) → {konten,mails} (Frappe: Scheduler täglich querschnitt_kern.digest_lauf)
// Außerdem (bestehende Operationen erweitert): nachrichtSenden(n,{…,anhaenge}) · nachrichten() liefert `gelesen` und
// `anhaenge` · dokumentSpeichern(n,{…,stumm}) · Dokument-Metadaten mit version/vorgaengerId/ersetztDurch/freigabe.
//
// Nur serverseitig verwenden.

import * as demo from "./demo/querschnitt";
import * as frappe from "./frappe/querschnitt";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const QUERSCHNITT_OPERATIONEN = ["dokumentVersionen", "dokumentNeueVersion", "dokumentFreigeben", "protokollSuche", "mailRhythmus", "mailRhythmusSpeichern", "digestLauf"];

export function querschnittBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
