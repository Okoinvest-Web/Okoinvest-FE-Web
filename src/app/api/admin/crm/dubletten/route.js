// GET  /api/admin/crm/dubletten – mögliche Dubletten (E-Mail, Name + PLZ, Name + Organisation, Telefon)
// POST /api/admin/crm/dubletten – zusammenführen { zielId, quelleId }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, dubletten: await backend.crmDubletten(nutzer) }));
export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, kontakt: await backend.crmZusammenfuehren(nutzer, body) }));
