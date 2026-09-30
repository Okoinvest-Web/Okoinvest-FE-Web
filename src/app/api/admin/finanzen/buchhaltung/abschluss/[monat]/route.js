// GET  /api/admin/finanzen/buchhaltung/abschluss/[monat] – Monatsabschluss-Checkliste (JJJJ-MM)
// POST … – { aktion: punkt {punkt, erledigt, notiz} | abschliessen | wiedereroeffnen {grund} }
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, abschluss: await werkzeugeBackend().bhAbschluss(nutzer, params.monat) }));
export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, abschluss: await werkzeugeBackend().bhAbschlussAktion(nutzer, params.monat, body) }));
