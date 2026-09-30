// GET /api/portal/grundbuch/[id]/dokumente/[dok] – Nachweis herunterladen (Backoffice alle, Eigentümer nur den Grundbuchauszug); protokolliert
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({}, async ({ nutzer, params, ip }) => {
  const d = await closingBackend().gbDokumentLesen(nutzer, params.id, params.dok, { ip });
  const name = String(d.name).replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(d.daten, { headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
});
