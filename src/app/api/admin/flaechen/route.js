// GET /api/admin/flaechen?status= – alle Flächen (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  flaechen: await backend.flaechen(nutzer, { alle: true, status: suche.get("status") || undefined }),
}));
