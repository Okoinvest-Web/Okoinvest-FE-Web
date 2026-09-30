// GET /api/admin/entwicklung/[id]/kalkulation – Projektkostenkalkulation (Vorschlag aus markt.js, falls noch nicht gespeichert)
// PUT /api/admin/entwicklung/[id]/kalkulation – { parameter, positionen? } speichern (Bereich „entwicklung“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { planungBackend } from "@/lib/plattform/backend/planung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => planungBackend().kalkulationHolen(nutzer, params.id));

export const PUT = route({ admin: true, maxBytes: 256 * 1024 }, async ({ nutzer, params, body }) => ({
  ok: true,
  kalkulation: await planungBackend().kalkulationSpeichern(nutzer, params.id, { parameter: body?.parameter || {}, positionen: Array.isArray(body?.positionen) ? body.positionen : null }),
}));
