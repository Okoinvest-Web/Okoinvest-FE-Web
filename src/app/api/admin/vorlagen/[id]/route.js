// PATCH /api/admin/vorlagen/[id] – neue Version { name, kanal, betreff, text, kommentar?, aktiv? }
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, vorlage: await backend.vorlageSpeichern(nutzer, params.id, body) }));
