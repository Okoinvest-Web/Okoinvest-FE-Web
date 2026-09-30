// POST /api/portal/organisation/[id]/einladungen – { email, rolle (admin|mitglied|lesen) } Einladungslink per E-Mail (7 Tage)
import { route, basisUrl } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ limit: "einladung" }, async ({ nutzer, params, body, request }) => ({
  ok: true,
  einladung: await sicherheit().einladungAnlegen(nutzer, params.id, { email: body.email, rolle: body.rolle, basisUrl: basisUrl(request) }),
}));
