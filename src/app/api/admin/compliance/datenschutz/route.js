// GET  /api/admin/compliance/datenschutz?status=offen|alle|… – Betroffenenanfragen (Compliance/Leitung lesen)
// POST … – neue Anfrage { art, eingangAm, land, name, email, kontoId?, kanal, beschreibung, vorgangId? } (Compliance)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await werkzeugeBackend().dsUebersicht(nutzer, { status: suche.get("status") || "offen" })) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, anfrage: await werkzeugeBackend().dsAnlegen(nutzer, body) }));
