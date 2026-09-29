// GET /api/admin/vorgaenge?status=&typ=&q= – alle Vorgänge (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  vorgaenge: await backend.vorgaenge(nutzer, { alle: true, status: suche.get("status") || undefined, typ: suche.get("typ") || undefined, q: suche.get("q") || undefined }),
}));
