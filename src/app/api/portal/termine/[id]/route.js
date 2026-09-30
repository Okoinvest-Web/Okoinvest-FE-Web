// GET   /api/portal/termine/[id] – Termin (Kunde: eigener; Mitarbeiter: zugewiesener; Backoffice: alle)
// PATCH /api/portal/termine/[id] – { aktion: "umbuchen", start } | { aktion: "stornieren", grund? } (Kunde);
//       Backoffice zusätzlich bestaetigen | erledigt | nicht_erschienen | zuweisen { mitarbeiterId }
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, termin: await serviceBackend().termin(nutzer, params.id) }));

export const PATCH = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  termin: await serviceBackend().terminAendern(nutzer, params.id, { aktion: body.aktion, start: body.start, grund: body.grund, mitarbeiterId: body.mitarbeiterId }),
}));
