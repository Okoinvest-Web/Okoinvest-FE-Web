// GET   /api/admin/finanzierung/[id] – Fall: Financial Model, Anfragen, Term-Sheet-Vergleich, Paket, CPs, Kreditvertrag, Covenants – lesen
// PATCH /api/admin/finanzierung/[id] – { titel, spv, spvOrganisationId, notiz, betragWunsch, eingaben, status (abgebrochen|vorbereitung) + begruendung }
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, fall: await finanzierungBackend().fzFall(nutzer, params.id) }));

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, fall: await finanzierungBackend().fzFallAendern(nutzer, params.id, body) }));
