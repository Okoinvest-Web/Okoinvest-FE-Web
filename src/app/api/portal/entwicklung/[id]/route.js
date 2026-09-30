// GET /api/portal/entwicklung/[id] – externe Sicht eines Entwicklungsprojekts (je Beteiligung gefiltert; fremd → 403)
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, projekt: await entwicklungBackend().entwicklungExtern(nutzer, params.id) }));
