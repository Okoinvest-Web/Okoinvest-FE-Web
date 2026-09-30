// POST   /api/portal/fach/energie/abnahmestellen – { id?, daten } anlegen/ändern (MaLo-/Zählpunkt-Prüfung serverseitig)
// DELETE /api/portal/fach/energie/abnahmestellen – { id }
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body }) => ({ ok: true, abnahmestelle: await fachBackend().abnahmestelleSpeichern(nutzer, { id: body.id || null, daten: body.daten || {} }) }));
export const DELETE = route({ rollen: ["unternehmen"] }, async ({ nutzer, body }) => fachBackend().abnahmestelleLoeschen(nutzer, body.id));
