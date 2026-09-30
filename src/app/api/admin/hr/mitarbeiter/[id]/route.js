// PATCH /api/admin/hr/mitarbeiter/[id] – { funktion?, employeeId?, vertretungId?, kapazitaetStunden?, aktiv? } (Leitung: „team“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  mitarbeiter: await serviceBackend().mitarbeiterSpeichern(nutzer, params.id, body),
}));
