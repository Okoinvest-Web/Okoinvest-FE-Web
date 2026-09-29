// GET /api/admin/provisionen – Deals & Provisionen (nur admin). Statuswechsel über /api/admin/status (art: provision).
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, provisionen: await backend.provisionen(nutzer) }));
