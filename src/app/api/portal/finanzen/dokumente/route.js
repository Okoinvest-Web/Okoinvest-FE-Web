// GET /api/portal/finanzen/dokumente – eigene Mahnungen und Stornobelege (Empfänger/Organisation)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, dokumente: await werkzeugeBackend().bhMeineDokumente(nutzer) }));
