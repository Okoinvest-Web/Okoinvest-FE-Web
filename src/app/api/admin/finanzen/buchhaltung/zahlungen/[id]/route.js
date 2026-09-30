// POST /api/admin/finanzen/buchhaltung/zahlungen/[id] – { aktion: zuordnen {belegId} | ignorieren {grund} | zuruecksetzen }; id „alle“ = sichere Treffer übernehmen
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, ...(await werkzeugeBackend().bhZahlungAktion(nutzer, params.id === "alle" ? null : params.id, { aktion: params.id === "alle" ? "sichere_uebernehmen" : body.aktion, belegId: body.belegId, grund: body.grund })) }));
