// POST /api/admin/finanzen/buchhaltung/mahnlauf – { ids?: [Beleg-IDs], trockenlauf? } → Mahnbelege (MA-Nummer) für fällige Vorschläge
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, ...(await werkzeugeBackend().bhMahnlauf(nutzer, { ids: body.ids, trockenlauf: body.trockenlauf })) }));
