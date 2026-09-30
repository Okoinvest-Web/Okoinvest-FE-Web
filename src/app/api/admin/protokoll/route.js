// GET /api/admin/protokoll?limit= – Hash-Kette des Aktivitätsprotokolls prüfen (verify_chain) + letzte Einträge mit Hashes
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({ ok: true, kette: await backend.protokollKette(nutzer, { limit: Number(suche.get("limit")) || 30 }) }));
