// GET  /api/admin/register?land=AT|DE|CH&q=… – Firmensuche (Zefix live mit Zugang, sonst Demo) – Bereich „register“ lesen
// POST /api/admin/register – kostenpflichtiger Abruf { land, nummer, kycFallId?, zweck? } → Auskunft (+ Hinweis im KYC-Fall,
//      nur mit Compliance schreiben) – Bereich „register“ schreiben
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await diensteBackend().registerSuche(nutzer, { land: suche.get("land") || "", q: suche.get("q") || "" })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, ...(await diensteBackend().registerAbruf(nutzer, { land: body.land, nummer: body.nummer, kycFallId: body.kycFallId || null, zweck: body.zweck || "" })) }));
