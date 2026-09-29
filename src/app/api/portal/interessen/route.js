// GET /api/portal/interessen – eigene Projektinteressen (Investor)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ rollen: ["investor"] }, async ({ backend, nutzer }) => ({ ok: true, interessen: await backend.interessen(nutzer) }));
