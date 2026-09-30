// GET /api/portal/finanzen/[id] – Abrechnung im Detail (Empfänger, Organisation oder Backoffice; fremde → 403)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, abrechnung: await finanzenBackend().abrechnung(nutzer, params.id) }));
