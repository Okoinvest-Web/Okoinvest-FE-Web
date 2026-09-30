// POST /api/portal/querschnitt/dokumente/[id]/freigabe – { status: eingegangen|in_pruefung|freigegeben|abgelehnt, kommentar } (nur Backoffice)
import { route } from "@/lib/plattform/server/route";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  dokument: await querschnittBackend().dokumentFreigeben(nutzer, String(params.id || ""), { status: String(body?.status || ""), kommentar: String(body?.kommentar || "") }),
}));
