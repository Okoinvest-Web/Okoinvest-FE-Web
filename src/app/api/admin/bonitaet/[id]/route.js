// GET  /api/admin/bonitaet/[id] – Auskunft mit Ergebnis (Einsicht wird protokolliert)
// POST /api/admin/bonitaet/[id] – manuelle Freigabe trotz roter Ampel/fehlender Daten { begruendung } (≥ 10 Zeichen)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => ({ ok: true, ...(await diensteBackend().bonitaetDetail(nutzer, params.id, { ip })) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, ...(await diensteBackend().bonitaetFreigeben(nutzer, params.id, { begruendung: body.begruendung })) }));
