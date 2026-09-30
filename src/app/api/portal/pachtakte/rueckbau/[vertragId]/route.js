// POST /api/portal/pachtakte/rueckbau/[vertragId] – Eigentümer: Rückbau abnehmen { nach: "abgenommen" }
// oder Mängel melden { nach: "maengel", kommentar }. Übrige Schritte: /api/admin/pachtakte/rueckbau/[vertragId].
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const POST = route({ rollen: ["flaeche", "landwirt"] }, async ({ nutzer, params, body, ip }) => ({
  ok: true,
  akte: await pachtakteBackend().rueckbauAktion(nutzer, params.vertragId, { ziel: "rueckbau", nach: body.nach, kommentar: body.kommentar }, { ip }),
}));
