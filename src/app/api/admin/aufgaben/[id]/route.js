// PATCH /api/admin/aufgaben/[id] – { status?: offen|erledigt, titel?, beschreibung?, faelligAm?, zustaendigId? } (nur admin)
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, aufgabe: await backend.aufgabeAendern(nutzer, params.id, body) }));
