// DELETE /api/portal/organisation/[id]/einladungen/[eid] – offene Einladung widerrufen (ab Admin)
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const DELETE = route({ json: false }, async ({ nutzer, params }) => sicherheit().einladungWiderrufen(nutzer, params.id, params.eid));
