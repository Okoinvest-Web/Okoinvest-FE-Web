// POST /api/admin/grundbuch/[id]/schritt – { schluessel, status: offen|in_arbeit|erledigt|entfaellt, datum?, nachweisWert?, notiz?, frist? }
//      Reihenfolge und Pflichtnachweise serverseitig (409 bzw. 422)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, akte: await closingBackend().gbSchritt(nutzer, params.id, body) }));
