// GET /api/portal/eg/belege – eigene Belege aller Mitgliedschaften (WP6 liest über WP4 abBelege).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await egBackend().ptBelege(nutzer)) }));
