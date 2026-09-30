// POST /api/admin/entwicklung/[id]/aktion – { aktion: plan_neu | vorlage_anwenden | uebergabe_boerse | uebergabe_anlage | erpnext_sync, begruendung? }
//      uebergabe_boerse legt ein Börsen-Projekt (Entwurf, Anbieter = ÖkoInvest-Konto) an und verknüpft es (zweimal → 409);
//      uebergabe_anlage braucht zusätzlich „Anlagen & Monitoring“ schreiben und Phase RTB
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) =>
  entwicklungBackend().entwicklungAktion(nutzer, params.id, { aktion: String(body.aktion || ""), begruendung: typeof body.begruendung === "string" ? body.begruendung : "" })
);
