// GET  /api/portal/termine – eigene Termine (Kunde) bzw. eigene Termine als Mitarbeiter
// POST /api/portal/termine – Termin buchen als angemeldetes Konto { art, start, kanal?, notiz?, telefon?, bezugArt?, bezugId?, kontakt?{plz,ort,land} }
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, termine: await serviceBackend().termine(nutzer, {}) }));

export const POST = route({}, async ({ nutzer, body, ip }) => {
  rateLimit(`termin:${nutzer.id}`, ...grenze("anfrage"));
  const r = await serviceBackend().terminBuchen(nutzer, body, { ip });
  return Response.json({ ok: true, termin: r.termin }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
