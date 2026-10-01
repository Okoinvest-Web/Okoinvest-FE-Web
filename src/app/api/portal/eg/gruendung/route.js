// /api/portal/eg/gruendung – Gründungsaufträge (WP5)
//   GET  ?status=&paket=&q=   eigene Aufträge (Auftraggeber bzw. Organe der Gemeinschaft); Backoffice (Bereich „eg“): alle mit Kennzahlen
//   POST { daten: { paket, arbeitsname, modell, zonelevel?, rechtsform?, plz, ort, bundesland?, netzbetreiberId?, erwarteteMitglieder?, erzeugungKwp?,
//          speicherKwh?, gemeindeBeteiligt?, investitionGeplant?, bestehend? (Wechsel), ansprechpartner?, nachricht?, einwilligung } }
// Rechte prüft das Backend (backend/eg.js → grAuftraege/grAuftragAnlegen).
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await egBackend().grAuftraege(nutzer, { status: suche.get("status") || "", paket: suche.get("paket") || "", q: suche.get("q") || "" })) }));

export const POST = route({}, async ({ nutzer, body }) => {
  rateLimit(`eg-gruendung:${nutzer.id}`, ...grenze("anfrage"));
  return Response.json({ ok: true, auftrag: await egBackend().grAuftragAnlegen(nutzer, { daten: body?.daten || {} }) }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
