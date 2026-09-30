// GET /api/portal/querschnitt/dokumente/[id]/versionen – Versionskette (älteste zuerst), nur sichtbare Versionen
import { route } from "@/lib/plattform/server/route";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, versionen: await querschnittBackend().dokumentVersionen(nutzer, String(params.id || "")) }));
