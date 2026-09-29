// GET /api/auth/ich – angemeldeter Nutzer oder null
import { route, nutzerFuerBrowser } from "@/lib/plattform/server/route";

export const GET = route({ auth: "optional" }, async ({ nutzer }) => ({ ok: true, nutzer: nutzerFuerBrowser(nutzer) }));
