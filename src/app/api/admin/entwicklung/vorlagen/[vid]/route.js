// GET  /api/admin/entwicklung/vorlagen/[vid] – Entscheidungsvorlage mit Momentaufnahme (Kennzahlen beim Einreichen), Verlauf
// POST /api/admin/entwicklung/vorlagen/[vid] – { aktion: einreichen|zurueckziehen|genehmigen|ablehnen|zurueckstellen,
//      begruendung?, option? } – Entscheidung nur Leitung, Vier-Augen-Prinzip (409), Begründung bei Ablehnung/Zurückstellung (422)
import { route } from "@/lib/plattform/server/route";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, vorlage: await steuerungBackend().vorlageHolen(nutzer, params.vid) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  vorlage: await steuerungBackend().vorlageAktion(nutzer, params.vid, { aktion: String(body?.aktion || ""), begruendung: String(body?.begruendung || ""), option: String(body?.option || "") }),
}));
