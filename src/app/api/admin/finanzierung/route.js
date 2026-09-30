// GET  /api/admin/finanzierung – Übersicht: Finanzierungsfälle (Status, Covenant-Ampel, Reporting), Bankenstamm, Kennzahlen – lesen
// POST /api/admin/finanzierung – Finanzierungsfall anlegen { titel?, spv, spvOrganisationId?, bezugArt: entwicklung|anlage|frei, bezugId?,
//      betragWunsch?, eingaben?, notiz? } – Bereich „finanzierung“ schreiben (201)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzierungBackend().fzUebersicht(nutzer)) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const fall = await finanzierungBackend().fzFallAnlegen(nutzer, body);
  return Response.json({ ok: true, fall }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
