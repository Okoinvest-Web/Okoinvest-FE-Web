// GET /api/admin/portfolio/dokumente/[id] – Dokument einer Position herunterladen (Bereich „portfolio“ lesen) (protokolliert)
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => {
  const d = await portfolioBackend().pfDokumentLesen(nutzer, params.id, { ip });
  const name = String(d.name).replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(d.daten, { headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
});
