// POST /api/admin/compliance/datenschutz/[id] – { aktion: identitaet_anfordern|identitaet_bestaetigen|verlaengern|erledigen|ablehnen|konto_verknuepfen|anonymisieren, … }
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, anfrage: await werkzeugeBackend().dsAktion(nutzer, params.id, body) }));
