// PATCH  /api/portal/fach/energie/lastgang/[id] – Analyse neu rechnen { pvKwp, preisCt, produzierend }
// POST   /api/portal/fach/energie/lastgang/[id] – Angebotsanfrage aus der Analyse { nachricht } → Vorgang „reststrom“
// DELETE /api/portal/fach/energie/lastgang/[id]
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const PATCH = route({}, async ({ nutzer, params, body }) => ({ ok: true, lastgang: await fachBackend().lastgangNeuRechnen(nutzer, params.id, body || {}) }));
export const POST = route({ rollen: ["unternehmen"], limit: "anfrage" }, async ({ nutzer, params, body, ip }) => ({ ok: true, ...(await fachBackend().lastgangAnfrage(nutzer, params.id, { nachricht: body.nachricht, ip })) }));
export const DELETE = route({ rollen: ["unternehmen"], json: false }, async ({ nutzer, params }) => fachBackend().lastgangLoeschen(nutzer, params.id));
