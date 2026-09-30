// POST /api/admin/gesellschaften/[id]/schritt – Checklisten-Schritt { schluessel, status: offen|in_arbeit|erledigt|entfaellt,
//      datum?, notiz?, wert? (registernummer | betrag | uid | termin {datum, notariat, art, ort}) } – Reihenfolge wird geprüft (409)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, ...(await diensteBackend().gesellschaftSchritt(nutzer, params.id, body)) }));
