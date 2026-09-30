// POST /api/portal/pachtakte/anliegen/[id] – Eigentümer: auf Rückfrage antworten { nach: "eingereicht", kommentar }
// oder zurückziehen { nach: "zurueckgezogen" }. Backoffice-Schritte: /api/admin/pachtakte/anliegen/[id].
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ rollen: ["flaeche", "landwirt"] }, async ({ nutzer, params, body, ip }) => {
  if (!["eingereicht", "zurueckgezogen"].includes(body.nach)) throw new PlattformFehler(422, "Dieser Schritt ist hier nicht möglich.");
  return { ok: true, anliegen: await pachtakteBackend().anliegenAktion(nutzer, params.id, { nach: body.nach, kommentar: body.kommentar }, { ip }) };
});
