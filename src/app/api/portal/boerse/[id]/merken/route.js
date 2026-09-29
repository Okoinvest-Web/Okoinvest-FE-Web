// POST /api/portal/boerse/[id]/merken – { an: true|false } Merkliste (Investor)
import { route } from "@/lib/plattform/server/route";

export const POST = route({ rollen: ["investor"] }, async ({ backend, nutzer, params, body }) => ({
  ok: true,
  interesse: await backend.merken(nutzer, params.id, body.an !== false),
}));
