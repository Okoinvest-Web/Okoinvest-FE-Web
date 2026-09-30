// POST /api/admin/finanzen/klaerfaelle/[id] – { aktion: erledigt | verworfen, kommentar } (schreiben)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, klaerfall: await finanzenBackend().klaerfallAktion(nutzer, params.id, body) }));
