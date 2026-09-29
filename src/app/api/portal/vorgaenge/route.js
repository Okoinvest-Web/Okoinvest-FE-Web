// GET /api/portal/vorgaenge – eigene Anfragen
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, suche }) => ({
  ok: true,
  vorgaenge: await backend.vorgaenge(nutzer, { status: suche.get("status") || undefined }),
}));
