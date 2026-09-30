// POST /api/portal/fach/energie/lastgang – Lastgang-CSV als Text { name, inhalt, einheit?, abnahmestelleId?, parameter? } (≤ 4 MB)
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const POST = route({ rollen: ["unternehmen"], limit: "upload", maxBytes: 4.5 * 1024 * 1024 }, async ({ nutzer, body }) => ({
  ok: true,
  lastgang: await fachBackend().lastgangHochladen(nutzer, { name: body.name, inhalt: body.inhalt, einheit: body.einheit, abnahmestelleId: body.abnahmestelleId || null, parameter: body.parameter || {} }),
}));
