// GET /api/portal/grundbuch/[id] – Akte: Eigentümer/Dachgeber nur die eigene (vereinfacht, „Was bedeutet das für Sie?“), Backoffice alle; fremd → 403
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, akte: await closingBackend().gbAkte(nutzer, params.id) }));
