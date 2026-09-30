// GET  /api/admin/entwicklung/[id]/planung – Planliste des Entwicklungsprojekts (Backoffice, Bereich „entwicklung“ lesen)
// POST /api/admin/entwicklung/[id]/planung – Plankopf anlegen/ändern { id?, daten: { plannummer, titel, planart, massstab,
//      blattformat, planer, meilensteinId } } (Bereich „entwicklung“ schreiben). Uploads: POST /api/portal/planung/upload.
import { route } from "@/lib/plattform/server/route";
import { planungBackend } from "@/lib/plattform/backend/planung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => planungBackend().planungListe(nutzer, params.id));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, plan: await planungBackend().planungPlanSpeichern(nutzer, params.id, { id: body?.id || null, daten: body?.daten || {} }) }));
