// GET /api/portal/termine/[id]/ics – Kalenderdatei (RFC 5545) des Termins
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer, params }) => {
  const ics = await serviceBackend().terminIcs(nutzer, params.id);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="termin-${String(params.id).replace(/[^A-Z0-9-]/g, "")}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
