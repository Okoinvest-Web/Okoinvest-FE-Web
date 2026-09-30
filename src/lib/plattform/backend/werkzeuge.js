// src/lib/plattform/backend/werkzeuge.js
//
// Backend-Teil „Backoffice-Werkzeuge“ (Team 8: Transaktion, Compliance, Buchhaltung) – eigene Schnittstelle,
// backend/index.js bleibt unverändert. Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo.
//
// Operationen (n = angemeldeter Nutzer):
//   Buchhaltung  bhUebersicht(n) · bhEinstellungenSpeichern(n,{mahnwesen,konten}) · bhMahnlauf(n,{ids,trockenlauf})
//                bhMahnsperre(n,belegId,{bis,grund}) · bhStorno(n,belegId,{grund,provisionStornieren})
//                bhBelegDokument(n,belegId,{art:"mahnung"|"storno",nr,ip}) · bhMeineDokumente(n)
//                bhZahlungImport(n,{inhalt,dateiname,format}) · bhZahlungAktion(n,id,{aktion,belegId,grund})
//                bhExport(n,{format:"datev"|"bmd"|"op",von,bis}) · bhAbschluss(n,monat) · bhAbschlussAktion(n,monat,{aktion,punkt,erledigt,notiz,grund})
//   Datenschutz  dsUebersicht(n,{status}) · dsAnlegen(n,daten) · dsAktion(n,id,{aktion,…}) · dsExport(n,id,{ip}) · vvtExport(n,{format})
//                kycSlaUebersicht(n)
//   GwG          verdachtListe(n,{status}) · verdachtMelden(n,daten) · verdachtAktion(n,id,{aktion,…})
//   Transaktion  dealPipeline(n,{land,phase}) · dealPrognose(n,projektId,{wahrscheinlichkeit,closingErwartet,notiz}) · dealBericht(n,filter)
//
// Nur serverseitig verwenden.

import * as bh from "./demo/buchhaltung";
import * as ds from "./demo/datenschutz";
import * as tr from "./demo/transaktion";
import * as frappe from "./frappe/werkzeuge";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

const demo = { ...bh, ...ds, ...tr };

export const WERKZEUG_OPERATIONEN = [
  "bhUebersicht", "bhEinstellungenSpeichern", "bhMahnlauf", "bhMahnsperre", "bhStorno", "bhBelegDokument", "bhMeineDokumente", "bhZahlungImport", "bhZahlungAktion",
  "bhExport", "bhAbschluss", "bhAbschlussAktion", "dsUebersicht", "dsAnlegen", "dsAktion", "dsExport", "vvtExport", "kycSlaUebersicht", "verdachtListe",
  "verdachtMelden", "verdachtAktion", "dealPipeline", "dealPrognose", "dealBericht",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = WERKZEUG_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Backoffice-Werkzeuge ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function werkzeugeBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
