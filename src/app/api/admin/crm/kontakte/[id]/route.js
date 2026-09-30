// GET   /api/admin/crm/kontakte/[id] – Kontakt mit Beziehungen, Aktivitäten, Verlauf, Dubletten-Kandidaten
// PATCH /api/admin/crm/kontakte/[id] – Stammdaten, Rollen, Tags, Zuständig
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, params }) => ({ ok: true, kontakt: await backend.crmKontakt(nutzer, params.id) }));
export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, kontakt: await backend.crmKontaktSpeichern(nutzer, params.id, body) }));
