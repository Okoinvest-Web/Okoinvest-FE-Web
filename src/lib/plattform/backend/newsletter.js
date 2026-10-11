// src/lib/plattform/backend/newsletter.js
//
// Backend-Teil „Newsletter je Land“ (Welle 3, Paket NL) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Nur serverseitig verwenden. Signaturen: src/lib/plattform/backend/demo/newsletter.js.
//
//   newsletterAnlegen({ tokenHash, email, land, sprache, themen, quelle, kanal, ablauf, protokoll, mail }) → { id }
//   newsletterBestaetigen({ tokenHash, jetztMs, doi, willkommen })   → { zustand, bereits? }
//   newsletterAbmelden({ tokenHash, kanal, textId, textVersion, jetztMs }) → { zustand, bereits? }
//   newsletterLesen({ tokenHash, jetztMs })                          → { zustand, abo? }   (nie Personendaten)
//   newsletterEmpfaenger({ land, thema })                            → [{ aboId, email, sprache }]
//   newsletterAufraeumen({ jetztMs })                                → { geaendert }
//
// Backoffice (Plattform-Armee, Paket MARKETING – Rechteprüfung in Route/Seite, Bereich „crm“):
//   newsletterUebersicht({ jetztMs })   → { kennzahlen, matrix, abos, abmeldungen }
//   newsletterExport({ aboId })         → Datenexport eines Empfängers (Art. 15/20)
//   newsletterLoeschen({ aboId })       → Löschung eines Empfängers (Art. 17), { geloescht, bereits }
//
// Frappe: noch kein Spiegel (TODO Betrieb, vor dem Livegang: DocType „Plattform Newsletter Abo“, gleiche Felder,
// Protokoll über api/einwilligung.py). Bis dahin antwortet jede Operation außerhalb des Demo-Modus mit 503 –
// zusätzlich zur Sperre in src/lib/newsletter/versand.js, die dann gar keine Adressen annimmt.

import * as demo from "./demo/newsletter";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const NEWSLETTER_OPERATIONEN = ["newsletterAnlegen", "newsletterBestaetigen", "newsletterAbmelden", "newsletterLesen", "newsletterEmpfaenger", "newsletterAufraeumen", "newsletterUebersicht", "newsletterExport", "newsletterLoeschen"];

export const NEWSLETTER_AUS = "Der Newsletter startet mit dem Livegang.";

export function newsletterBackend() {
  let n;
  try {
    n = backendName();
  } catch {
    throw new PlattformFehler(503, KONFIG_FEHLER);
  }
  if (n === "demo") return demo;
  throw new PlattformFehler(503, NEWSLETTER_AUS, "newsletter_aus");
}
