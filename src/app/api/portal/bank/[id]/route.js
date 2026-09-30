// GET  /api/portal/bank/[id] – Anfrage aus Sicht der Bank: Vorhaben, NUR freigegebene Bausteine des Bankenpakets, eigenes Term Sheet
// POST /api/portal/bank/[id] – { aktion: "termsheet", termsheet } | { aktion: "absage" | "rueckfrage", text }
//      Fremde Bank → 403; zurückgezogene Anfrage → 403; nach der Entscheidung kein Term Sheet mehr (409)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, params }) => ({ ok: true, ...(await finanzierungBackend().fzBankAnfrage(nutzer, params.id)) }));

export const POST = route({ rollen: ["bank"] }, async ({ nutzer, params, body }) => finanzierungBackend().fzBankAktion(nutzer, params.id, body));
