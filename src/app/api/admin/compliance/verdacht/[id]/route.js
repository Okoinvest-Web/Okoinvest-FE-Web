// POST /api/admin/compliance/verdacht/[id] – { aktion: pruefen|meldung_vorbereiten|gemeldet|keine_meldung|abschliessen|notiz, … } – kein Versand an die Meldestelle
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, fall: await werkzeugeBackend().verdachtAktion(nutzer, params.id, body) }));
