// POST /api/portal/termine/oeffentlich/verwalten – Termin per Einmal-Link aus der E-Mail (Token, nur Hash gespeichert)
//   { token } → Termin · { token, aktion: "umbuchen", start } · { token, aktion: "stornieren", grund? }
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const POST = route({ auth: false, limit: "passwort", maxBytes: 8 * 1024 }, async ({ body }) => {
  const token = String(body.token || "").slice(0, 100);
  const s = serviceBackend();
  if (!body.aktion) return { ok: true, termin: await s.terminPerToken(token) };
  return { ok: true, termin: await s.terminPerTokenAendern(token, { aktion: body.aktion, start: body.start, grund: body.grund }) };
});
