// GET /api/portal/eg/[id] – Mitglieder-Dashboard einer Gemeinschaft (WP6): eigenes Mitglied, Teilnahmen, Kennzahlen,
// Belege, grüne Stunden, Empfehlungen. Recht „eigene_daten“ (eg/rechte.js); ohne Rolle 404.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await egBackend().ptGemeinschaft(nutzer, params.id)) }));
