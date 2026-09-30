// POST /api/admin/vorlagen/[id]/wiederherstellen – { version } → als neue Version übernehmen
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, vorlage: await backend.vorlageWiederherstellen(nutzer, params.id, body.version) }));
