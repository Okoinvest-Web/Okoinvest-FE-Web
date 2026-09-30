// POST /api/admin/crm/massenaktion – { ids[], tag?, tagEntfernen?, zustaendigId?, rolle? }
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, ...(await backend.crmMassenaktion(nutzer, body)) }));
