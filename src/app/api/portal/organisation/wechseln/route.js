// POST /api/portal/organisation/wechseln – { organisationId | null } aktive Organisation dieser Sitzung (null = persönlich)
// Fremde Organisation → 403.
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({}, async ({ nutzer, body }) => ({ ok: true, ...(await sicherheit().organisationWechseln(nutzer, body.organisationId || null)) }));
