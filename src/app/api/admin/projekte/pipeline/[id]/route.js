// POST /api/admin/projekte/pipeline/[id] – Prognose { wahrscheinlichkeit (0–100 | null), closingErwartet (JJJJ-MM), notiz } (Bereich „projekte“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, karte: await werkzeugeBackend().dealPrognose(nutzer, params.id, body) }));
