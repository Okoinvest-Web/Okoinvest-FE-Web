// POST /api/portal/projekte/[id]/provision – { akzeptiert: true } Provisionsvereinbarung (Zeitstempel + IP protokolliert)
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ rollen: ["anbieter"] }, async ({ backend, nutzer, params, body, ip }) => {
  if (body.akzeptiert !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie die Provisionsvereinbarung.");
  return { ok: true, projekt: await backend.provisionAkzeptieren(nutzer, params.id, { ip }) };
});
