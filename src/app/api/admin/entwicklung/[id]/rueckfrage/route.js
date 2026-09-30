// POST /api/admin/entwicklung/[id]/rueckfrage – { meilensteinId, text, anId? } Rückfrage/Antwort an einen zugewiesenen Gutachter
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ admin: true, limit: "nachricht" }, async ({ nutzer, params, body }) =>
  entwicklungBackend().entwicklungRueckfrage(nutzer, params.id, { meilensteinId: body.meilensteinId, text: body.text, anId: body.anId || null })
);
