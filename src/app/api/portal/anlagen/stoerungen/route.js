// GET /api/portal/anlagen/stoerungen?anlage=AL-…&status=offen|behoben|alle – Störungen der sichtbaren Anlagen
// (Kunde: eigene Anlagen, ohne interne Kommentare; Betrieb: alle, nach Priorität)
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const GET = route({}, async ({ nutzer, suche }) => ({
  ok: true,
  stoerungen: await anlagenBackend().stoerungen(nutzer, { anlageId: suche.get("anlage") || "", status: suche.get("status") || "offen" }),
}));
