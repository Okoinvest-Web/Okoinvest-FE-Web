// GET /api/portal/pipeline – Deal-Pipeline des Investors (Kanban, Notizen, Kennzahlen, Suchprofile)
// PUT /api/portal/pipeline – private Notiz { projektId, text?, tags?[], spalte? ("" = automatisch) }
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({ rollen: ["investor"] }, async ({ nutzer }) => ({ ok: true, ...(await dealroom().pipeline(nutzer)) }));

export const PUT = route({ rollen: ["investor"] }, async ({ nutzer, body }) => ({
  ok: true,
  notiz: await dealroom().notizSpeichern(nutzer, { projektId: body.projektId, text: body.text, tags: body.tags, spalte: body.spalte }),
}));
