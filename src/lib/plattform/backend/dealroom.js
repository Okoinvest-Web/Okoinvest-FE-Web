// src/lib/plattform/backend/dealroom.js
//
// Backend-Teil „Deal-Room & Investoren“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build
// ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md Abschnitt 7:
//   Kopf/Umgehungsschutz: dealroomKopf(n,projektId) · kontaktFreigabe(n,{projektId,interesseId,an})
//   Q&A:        qaListe(n,projektId) · qaFrageStellen(n,{projektId,kategorie,text}) · qaAktion(n,id,{aktion,…})
//   Bieter:     bieterverfahren(n,projektId) · bieterverfahrenListe(n) · bieterStarten(n,daten) · bieterAktion(n,id,{aktion,…})
//               gebotAbgeben(n,daten) · gebotZurueckziehen(n,id)
//   Datenraum:  datenraum(n,projektId,{besuch,ip}) · datenraumEinordnen(n,dokumentId,{ordner,stufe,versionVon})
//               datenraumDokument(n,id,{ip,anzeigen}) → {meta,daten,dateiname} · datenraumZugriffe(n,projektId,{limit})
//   Pipeline:   pipeline(n) · notizSpeichern(n,{projektId,text,tags,spalte}) · suchprofileSpeichern(n,profile[])
//   Cockpit:    dealCockpit(n,projektId,{tage}) · dealroomUebersicht(n) (Backoffice)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/dealroom";
import * as frappe from "./frappe/dealroom";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const DEALROOM_OPERATIONEN = [
  "dealroomKopf", "kontaktFreigabe", "qaListe", "qaFrageStellen", "qaAktion", "bieterverfahren", "bieterverfahrenListe", "bieterStarten",
  "bieterAktion", "gebotAbgeben", "gebotZurueckziehen", "datenraum", "datenraumEinordnen", "datenraumDokument", "datenraumZugriffe",
  "pipeline", "notizSpeichern", "suchprofileSpeichern", "dealCockpit", "dealroomUebersicht",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = DEALROOM_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Deal-Room ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function dealroom() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
