// PATCH /api/admin/anlagen/[id] – Stammdaten ändern (Teilmenge der Felder wie beim Anlegen, inkl. kundeId/organisationId)
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, anlage: await anlagenBackend().anlageAendern(nutzer, params.id, body) }));
