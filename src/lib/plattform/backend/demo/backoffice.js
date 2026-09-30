// src/lib/plattform/backend/demo/backoffice.js
//
// Backoffice-Ausbau des Demo-Backends (CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte,
// Hash-Kette). demo.js re-exportiert alle Operationen von hier und ruft
//   werkzeugeSetzen({...})        – interne Helfer (Nachricht, Postausgang, Statuswechsel …)
//   backofficeEreignis(db, e)     – bei neuem Vorgang, Statuswechsel, Dokument, Suchprofil-Treffer
//   protokollAnhaengen(db, e)     – Aktivitätsprotokoll mit Hash-Kette
// auf. Operationen: siehe BACKOFFICE_OPERATIONEN in backend/frappe/backoffice.js.

import { boSeedSetzen, boSicher } from "./bo-kern";
import { boSeed } from "./bo-seed";
import { crmAusVorgang } from "./crm";
import { automationAusfuehren } from "./automation";

boSeedSetzen(boSeed);

export { werkzeugeSetzen } from "./bo-kern";
export { protokollAnhaengen } from "./kette";

/**
 * Ereignis aus dem Kern (synchron, innerhalb der laufenden Schreibtransaktion).
 * e = { typ: vorgang_neu|status|dokument|suchprofil, art, objekt, von?, nach?, extra? }
 * Fehler im Backoffice-Teil dürfen den eigentlichen Vorgang nie verhindern → nur Log.
 */
export function backofficeEreignis(db, e) {
  try {
    boSicher(db);
    if (e.typ === "vorgang_neu") crmAusVorgang(db, e.objekt);
    automationAusfuehren(db, e);
  } catch (fehler) {
    console.error("[plattform-backoffice] Ereignis", e?.typ, e?.objekt?.id, fehler);
  }
}

export * from "./crm-ops";
