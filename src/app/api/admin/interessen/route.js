// GET /api/admin/interessen?status=a,b – NDA-Anfragen, LOIs usw. (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => {
  const status = suche.get("status");
  return { ok: true, interessen: await backend.interessen(nutzer, { alle: true, status: status ? status.split(",") : undefined }) };
});
