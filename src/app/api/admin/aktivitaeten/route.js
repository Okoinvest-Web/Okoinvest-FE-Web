// GET /api/admin/aktivitaeten?limit=&objekt=&objekte=a,b – Aktivitätsprotokoll (nur admin), optional je Objekt(en)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  aktivitaeten: await backend.aktivitaeten(nutzer, {
    limit: Math.min(500, Number(suche.get("limit")) || 100),
    objektId: suche.get("objekt") || undefined,
    objektIds: suche.get("objekte") ? suche.get("objekte").split(",").slice(0, 50) : undefined,
  }),
}));
