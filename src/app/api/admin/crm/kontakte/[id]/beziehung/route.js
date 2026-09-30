// POST /api/admin/crm/kontakte/[id]/beziehung – { art: vorgang|flaeche|projekt|interesse, id, rolle?, entfernen? }
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, ...(await backend.crmBeziehung(nutzer, params.id, body)) }));
