// src/lib/plattform/backend/entwicklung.js
//
// Backend-Teil „Projektentwicklung“ (internes Entwicklungsmanagement; eigene Schnittstelle, backend/index.js bleibt
// unverändert). Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build
// ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md Abschnitt 11.
//
// Operationen (n = angemeldeter Nutzer):
//   Backoffice: entwicklungPortfolio(n,{q,status}) · entwicklungProjekt(n,id) · entwicklungAuswahl(n) · entwicklungAnlegen(n,daten)
//               entwicklungAendern(n,id,daten) · entwicklungEintragSpeichern(n,projektId,{art,id?,daten})
//               entwicklungEintragLoeschen(n,projektId,{art,id})  (art: flaeche|meilenstein|risiko|entscheidung|budget|kontakt|freigabe)
//               entwicklungAktion(n,projektId,{aktion,begruendung}) (plan_neu|vorlage_anwenden|uebergabe_boerse|uebergabe_anlage|erpnext_sync)
//               entwicklungAssistent(n,{flaecheId,land,typ,start}) · entwicklungGutachterEinladen(n,projektId,{email,meilensteinIds,basisUrl})
//               entwicklungFristen(n) (Erinnerungen; Frappe: Scheduler täglich)
//   Extern:     entwicklungMeine(n) · entwicklungExtern(n,id) · entwicklungMeilensteinMelden(n,projektId,meilensteinId,{aktion})
//               entwicklungRueckfrage(n,projektId,{meilensteinId,text,anId?}) · entwicklungDokumentSpeichern(n,{…,daten})
//               entwicklungDokumentLesen(n,id) · entwicklungEinladungInfo(token) · entwicklungEinladungAnnehmen(n,token)
//               entwicklungZaehler(n)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/entwicklung";
import * as frappe from "./frappe/entwicklung";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const ENTWICKLUNG_OPERATIONEN = [
  "entwicklungPortfolio", "entwicklungProjekt", "entwicklungAuswahl", "entwicklungAnlegen", "entwicklungAendern", "entwicklungEintragSpeichern",
  "entwicklungEintragLoeschen", "entwicklungAktion", "entwicklungAssistent", "entwicklungGutachterEinladen", "entwicklungFristen", "entwicklungMeine",
  "entwicklungExtern", "entwicklungMeilensteinMelden", "entwicklungRueckfrage", "entwicklungDokumentSpeichern", "entwicklungDokumentLesen",
  "entwicklungEinladungInfo", "entwicklungEinladungAnnehmen", "entwicklungZaehler",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = ENTWICKLUNG_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Entwicklung ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function entwicklungBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
