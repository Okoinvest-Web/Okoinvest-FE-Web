// POST /api/portal/entwicklung/[id]/rueckfragen – { meilensteinId, text } Rückfrage des Gutachters an die Projektleitung
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ rollen: ["gutachter"], limit: "nachricht" }, async ({ nutzer, params, body }) =>
  entwicklungBackend().entwicklungRueckfrage(nutzer, params.id, { meilensteinId: body.meilensteinId, text: body.text })
);
