// src/lib/plattform/backend/service.js
//
// Backend-Teil „Dokumente, Signatur, Termine, Service & HR“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// Vertrag: docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“. Alle Frappe-App-Integrationen (Drive, Helpdesk, HRMS, Event) sind optional
// und werden in der Frappe-App geschaltet (site_config) – die Website sieht nur diese Operationen.
//
// Operationen (n = angemeldeter Nutzer, null = öffentlich):
//   Signatur:  signaturen(n,{status,alle}) · signatur(n,id) · signaturAnlegen(n,daten,{ip}) · signaturCodeAnfordern(n,id,{ip,userAgent})
//              signaturUnterschreiben(n,id,{code,art,bild,name,zustimmung,ip,userAgent}) → {vorgang, folgeAktion}
//              signaturAblehnen(n,id,{grund,ip}) · signaturWiderrufen(n,id,{grund,ip}) · signaturErinnern(n,id)
//              signaturDatei(n,id,{variante,ip}) → {name,mime,daten} · signaturEinstellungen(n) · signaturEinstellungenSpeichern(n,daten)
//              signaturStandard(n,{art,projektId,ip}) (Klick-NDA/Provision im Modus „signatur“)
//   Termine:   terminSlots(n|null,{art,von,bis,mitarbeiterId}) · terminBuchen(n|null,daten,{ip}) · termine(n,{alle,von,bis,mitarbeiterId,status})
//              termin(n,id) · terminIcs(n,id) · terminAendern(n,id,{aktion,start,grund,mitarbeiterId})
//              terminPerToken(token) · terminPerTokenAendern(token,{aktion,start,grund}) · verfuegbarkeiten(n) · verfuegbarkeitSpeichern(n,kontoId,daten)
//   Tickets:   tickets(n,{status,alle,q}) · ticket(n,id) · ticketAnlegen(n,daten,{anlagePruefen}) · ticketAntworten(n,id,{text,intern})
//              ticketAktion(n,id,{aktion,status,prioritaet,zustaendigId}) · ticketAusStoerung(n,stoerungId)
//              ticketAnhangSpeichern(n,id,{name,mime,daten}) · ticketAnhangLesen(n,id,anhangId) · ticketKennzahlen(n)
//   HR:        team(n) · mitarbeiterSpeichern(n,kontoId,daten) · abwesenheiten(n,filter) · abwesenheitAnlegen(n,daten) · abwesenheitLoeschen(n,id)
//              vertretung(n,{kontoId,tag}) · zeiten(n,filter) · zeitErfassen(n,daten) · zeitLoeschen(n,id) · zeitenAuswertung(n,{projektId,von,bis})
//              wissen(n,{q,kategorie}) · wissenArtikel(n,id) · wissenSpeichern(n,daten) · wissenLoeschen(n,id) · ablageStatus(n)
//
// Nur serverseitig verwenden.

import * as demo from "./demo/service";
import * as frappe from "./frappe/service";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const SERVICE_OPERATIONEN = [
  "signaturen", "signatur", "signaturAnlegen", "signaturCodeAnfordern", "signaturUnterschreiben", "signaturAblehnen", "signaturWiderrufen", "signaturErinnern",
  "signaturDatei", "signaturEinstellungen", "signaturEinstellungenSpeichern", "signaturStandard",
  "terminSlots", "terminBuchen", "termine", "termin", "terminIcs", "terminAendern", "terminPerToken", "terminPerTokenAendern", "verfuegbarkeiten", "verfuegbarkeitSpeichern",
  "tickets", "ticket", "ticketAnlegen", "ticketAntworten", "ticketAktion", "ticketAusStoerung", "ticketAnhangSpeichern", "ticketAnhangLesen", "ticketKennzahlen",
  "team", "mitarbeiterSpeichern", "abwesenheiten", "abwesenheitAnlegen", "abwesenheitLoeschen", "vertretung", "zeiten", "zeitErfassen", "zeitLoeschen", "zeitenAuswertung",
  "wissen", "wissenArtikel", "wissenSpeichern", "wissenLoeschen", "ablageStatus",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = SERVICE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Service ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function serviceBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}
