// POST /api/portal/eg/kuendigung – Kündigung der eigenen Mitgliedschaft {mitgliedId, zum} bzw. Rückzug eines offenen
// Antrags (WP6). Die Abmeldung beim Netzbetreiber (CM_REV_SP) übernimmt die Gemeinschaft.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, body }) => egBackend().ptKuendigung(nutzer, String(body.mitgliedId || ""), { zum: String(body.zum || "") }));
