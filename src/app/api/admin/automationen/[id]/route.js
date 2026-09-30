// PATCH  /api/admin/automationen/[id] – Regel ändern (gleiches Format wie POST)
// DELETE /api/admin/automationen/[id] – Regel löschen (Ausführungsprotokoll bleibt)
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, regel: await backend.automationSpeichern(nutzer, params.id, body) }));
export const DELETE = route({ admin: true, json: false }, async ({ backend, nutzer, params }) => backend.automationLoeschen(nutzer, params.id));
