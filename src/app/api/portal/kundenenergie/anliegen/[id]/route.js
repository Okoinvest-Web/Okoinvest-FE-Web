// POST /api/portal/kundenenergie/anliegen/[id] – Kundenaktion: { aktion: zurueckziehen | annehmen {bestaetigt:true} | ausschlagen {begruendung?} }
// Entscheidungen des Backoffice laufen über /api/admin/finanzen/anliegen/[id] (Bereich „finanzen“). Rechte prüft das Backend.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, params, body }) => {
  rateLimit(`kundenanliegen-aktion:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, anliegen: await kundenenergieBackend().kundenAnliegenAktion(nutzer, params.id, body) };
});
