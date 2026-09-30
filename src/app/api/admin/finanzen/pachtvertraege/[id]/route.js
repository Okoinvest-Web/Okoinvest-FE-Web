// GET   /api/admin/finanzen/pachtvertraege/[id] – Vertrag (Backoffice)
// PATCH /api/admin/finanzen/pachtvertraege/[id] – Felder ändern { daten } (z. B. Pachtbeginn nach Inbetriebnahme setzen)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, vertrag: await finanzenBackend().pachtvertrag(nutzer, params.id) }));

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, vertrag: await finanzenBackend().pachtvertragSpeichern(nutzer, { id: params.id, daten: body.daten || body }) }));
