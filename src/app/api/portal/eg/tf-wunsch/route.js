// POST /api/portal/eg/tf-wunsch – Wunsch zum Teilnahmefaktor {teilnahmeId, teilnahmefaktor} (WP6). Entwurf: sofort;
// aktive Teilnahme: an die Gemeinschaft (EC_PRTFACT_CHG über WP2).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, body }) => egBackend().ptTfWunsch(nutzer, String(body.teilnahmeId || ""), { teilnahmefaktor: body.teilnahmefaktor }));
