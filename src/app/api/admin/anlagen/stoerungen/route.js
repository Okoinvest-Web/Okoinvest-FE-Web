// POST /api/admin/anlagen/stoerungen – { anlageId, schwere, titel, text } manuell erfasste Störung (Betrieb, schreiben)
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const stoerung = await anlagenBackend().stoerungAnlegen(nutzer, body);
  return Response.json({ ok: true, stoerung }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
