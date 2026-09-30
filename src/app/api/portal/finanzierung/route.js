// GET  /api/portal/finanzierung – Finanzierungscockpit: Projekte mit Cockpit-Zugriff (Datenraum frei bzw. eigene) + eigene Szenarien
// POST /api/portal/finanzierung – Szenario speichern { projektId?, name, eingaben, fokus } – Server rechnet selbst nach (201)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await finanzierungBackend().fzCockpitListe(nutzer)) }));

export const POST = route({}, async ({ nutzer, body }) => {
  const szenario = await finanzierungBackend().fzSzenarioSpeichern(nutzer, { projektId: body.projektId || "", name: body.name, eingaben: body.eingaben, fokus: body.fokus });
  return Response.json({ ok: true, szenario }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
