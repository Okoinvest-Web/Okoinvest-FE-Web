// GET /api/portal/sicherheit/pflicht – Pflicht-2FA je Rolle (Backoffice) { ok, pflicht {rollen, umgebung, wirksam, kontenOhne2fa} }
// PUT /api/portal/sicherheit/pflicht – { rollen: [...] } (zusätzlich wirkt PLATTFORM_2FA_PFLICHT)
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const GET = route({ admin: true, ohne2fa: true }, async ({ nutzer }) => ({ ok: true, pflicht: await sicherheit().zweiFaktorPflicht(nutzer) }));

export const PUT = route({ admin: true }, async ({ nutzer, body }) => ({
  ok: true,
  pflicht: await sicherheit().zweiFaktorPflichtSpeichern(nutzer, { rollen: Array.isArray(body.rollen) ? body.rollen : [] }),
}));
