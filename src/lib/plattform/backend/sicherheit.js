// src/lib/plattform/backend/sicherheit.js
//
// Backend-Teil „Login, Sicherheit & Teams“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build
// ohne PLATTFORM_DEMO=1). Vertrag: docs/API.md, Abschnitt 8.
//
// Operationen (n = angemeldeter Nutzer):
//   Sitzungen:  sitzungAnlegen(n,{ip,userAgent,land,methode,zweiFaktor,geraetToken,geraetMerken,ersetzt}) → {sitzung:{id},geraetToken,neuesGeraet}
//               sitzungen(n) · sitzungBeenden(n,{id}|{alleAnderen}) · anmeldungen(n,{limit})
//               geraete(n,{geraetToken}) · geraetVergessen(n,id) · geraetVertraut({nutzerId,geraetToken})
//   2FA:        zweiFaktorStatus(n) · zweiFaktorStarten(n) → {geheimnis,uri} · zweiFaktorBestaetigen(n,{code}) → {codes,status}
//               zweiFaktorDeaktivieren(n,{passwort,code}) · wiederherstellungscodesNeu(n,{code})
//               zweiFaktorPruefen({nutzerId,code,ip,userAgent,land}) → Konto (+zweiFaktorMethode, codesUebrig)
//               zweiFaktorPflicht(n) · zweiFaktorPflichtSpeichern(n,{rollen})   (Backoffice)
//   E-Mail-Link: magicLinkAnfordern({email,basisUrl,ip}) → {ok} · magicLinkEinloesen({token}) → Konto
//   Konto:      komfortSpeichern(n,komfort) · emailAendernAnfordern(n,{neu,passwort,basisUrl}) · emailAendernBestaetigen({token})
//               datenExport(n) → JSON · kontoLoeschen(n,{passwort,bestaetigung})
//   Teams:      organisationen(n) · organisationAnlegen(n,{name,art}) · organisation(n,id) · organisationAendern(n,id,daten)
//               organisationLoeschen(n,id) · einladungAnlegen(n,id,{email,rolle,basisUrl}) · einladungWiderrufen(n,id,einladungId)
//               einladungInfo(token) · einladungAnnehmen(n,token) · mitgliedAendern(n,id,mitgliedId,{rolle})
//               mitgliedEntfernen(n,id,mitgliedId) · organisationWechseln(n,organisationId|null) · objektZuordnen(n,{art,id,organisationId})
//
// Nur serverseitig verwenden.

import * as demoSicherheit from "./demo/sicherheit";
import * as demoOrganisation from "./demo/teams";
import * as frappe from "./frappe/sicherheit";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const SICHERHEIT_OPERATIONEN = [
  "sitzungAnlegen", "sitzungen", "sitzungBeenden", "anmeldungen", "geraete", "geraetVergessen", "geraetVertraut",
  "zweiFaktorStatus", "zweiFaktorStarten", "zweiFaktorBestaetigen", "zweiFaktorDeaktivieren", "wiederherstellungscodesNeu", "zweiFaktorPruefen",
  "zweiFaktorPflicht", "zweiFaktorPflichtSpeichern", "magicLinkAnfordern", "magicLinkEinloesen", "komfortSpeichern", "emailAendernAnfordern",
  "emailAendernBestaetigen", "datenExport", "kontoLoeschen",
  "organisationen", "organisationAnlegen", "organisation", "organisationAendern", "organisationLoeschen", "einladungAnlegen", "einladungWiderrufen",
  "einladungInfo", "einladungAnnehmen", "mitgliedAendern", "mitgliedEntfernen", "organisationWechseln", "objektZuordnen",
];

const demo = Object.fromEntries(
  SICHERHEIT_OPERATIONEN.map((op) => [op, demoSicherheit[op] || demoOrganisation[op]]).filter(([, f]) => typeof f === "function")
);

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = SICHERHEIT_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Sicherheit ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function sicherheit() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
