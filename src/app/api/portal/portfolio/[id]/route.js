// GET  /api/portal/portfolio/[id] – Position (Ertrag Soll/Ist, Covenants, Ausschüttungen, Kapitalabrufe, Dokumente, Steuerhinweise)
// POST /api/portal/portfolio/[id] – { aktion: abruf_melden { abrufId, referenz } | wiederverkauf { preisvorstellung?, zeitpunkt, struktur,
//      anteilProzent?, grund } | wiederverkauf_zurueck | provision_akzeptieren } – Teamrolle „Nur lesen“ → 403
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ rollen: ["investor"] }, async ({ nutzer, params }) => ({ ok: true, position: await portfolioBackend().pfPosition(nutzer, params.id) }));
export const POST = route({ rollen: ["investor"] }, async ({ nutzer, params, body, ip }) => ({ ok: true, position: await portfolioBackend().pfPortalAktion(nutzer, params.id, { ...body, ip }) }));
