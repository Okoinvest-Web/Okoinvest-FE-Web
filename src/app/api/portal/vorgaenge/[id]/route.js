// GET /api/portal/vorgaenge/[id] – eine Anfrage (nur Eigentümer oder Admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, params }) => ({ ok: true, vorgang: await backend.vorgang(nutzer, params.id) }));
