// GET /api/admin/finanzierung/[id]/dokumente/[dok] – Dokument des Bankenpakets herunterladen (lesen, protokolliert)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => {
  const d = await finanzierungBackend().fzDokumentLesen(nutzer, params.dok, { ip });
  const name = String(d.name).replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(d.daten, {
    headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" },
  });
});
