// GET /api/admin/projekte?status= – alle Projekte inkl. Anbieter (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  projekte: await backend.projekte(nutzer, { alle: true, status: suche.get("status") || undefined }),
}));
