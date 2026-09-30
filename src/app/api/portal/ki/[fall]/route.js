// POST /api/portal/ki/[fall] – Assistent ausführen (JSON, Origin-Prüfung über route()).
//   expose    { projektId }                          Anbieter (eigenes Projekt), Backoffice
//   triage    { vorgangId }                          nur Backoffice
//   frage     { projektId, frage, stream? }          Investor mit freigegebenem Datenraum, Anbieter, Backoffice
//   flaeche   { flaecheId, frage?, stream? }         Flächeneigentümer/Landwirt (eigene Fläche), Backoffice
//   nachricht { bezugArt, bezugId, stichpunkte?, stream? }  alle Rollen, nur eigene Threads (Backoffice: alle)
// Antwort: { ok, fall, modus: "ki"|"regel", ergebnis, quellen, hinweis, kontingent } bzw. NDJSON-Stream.
// Rechte (Rolle UND Eigentum) prüft der Kontext-Bauer über das Backend, bevor Daten zusammengestellt werden.
import { route } from "@/lib/plattform/server/route";
import { ausfuehren } from "@/lib/plattform/ki";

export const POST = route({ maxBytes: 16 * 1024 }, async ({ params, nutzer, body, backend, ip }) =>
  ausfuehren({ fall: String(params.fall || ""), nutzer, body, backend, ip })
);
