// GET /api/portal/support/[id]/anhang/[aid] – Anhang herunterladen (nur Beteiligte/Backoffice)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer, params }) => {
  const { meta, daten } = await serviceBackend().ticketAnhangLesen(nutzer, params.id, params.aid);
  const ascii = String(meta.name).replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Length": String(daten.length),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
