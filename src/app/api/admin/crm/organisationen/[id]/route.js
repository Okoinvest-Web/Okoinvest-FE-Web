// GET   /api/admin/crm/organisationen/[id] – Organisation mit Kontakten, Aktivitäten, Objekten
// PATCH /api/admin/crm/organisationen/[id] – Stammdaten
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, params }) => ({ ok: true, organisation: await backend.crmOrganisation(nutzer, params.id) }));
export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, organisation: await backend.crmOrganisationSpeichern(nutzer, params.id, body) }));
