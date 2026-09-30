// POST /api/portal/entwicklung/[id]/meilensteine/[mid] – { aktion: in_arbeit | eingereicht } – nur zugewiesener Gutachter
//      („eingereicht“ erst nach eigenem Upload; erledigen kann nur die Projektleitung)
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ rollen: ["gutachter"] }, async ({ nutzer, params, body }) =>
  entwicklungBackend().entwicklungMeilensteinMelden(nutzer, params.id, params.mid, { aktion: String(body.aktion || "") })
);
