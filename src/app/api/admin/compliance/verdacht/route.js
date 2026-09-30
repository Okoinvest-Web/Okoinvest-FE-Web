// GET  /api/admin/compliance/verdacht?status= – interne Verdachtsfälle (NUR Unterrolle Compliance)
// POST … – Verdachtsfall erfassen { anlass, land, sachverhalt, kontoId?, kycFallId?, projektId?, betrag?, transaktionSperren? }
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await werkzeugeBackend().verdachtListe(nutzer, { status: suche.get("status") || "offen" })) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => werkzeugeBackend().verdachtMelden(nutzer, body));
