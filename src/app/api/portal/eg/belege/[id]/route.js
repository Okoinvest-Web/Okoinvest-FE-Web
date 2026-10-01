// GET /api/portal/eg/belege/[id] – PDF eines eigenen Belegs (WP6 reicht an WP4 abBelegPdf weiter; WP4 prüft das Eigentum).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => {
  const r = await egBackend().abBelegPdf(nutzer, params.id);
  const pdf = r?.pdf || r?.inhalt || (r instanceof Uint8Array ? r : null);
  if (!pdf) return { ok: true, beleg: r };
  const name = String(r?.name || r?.dateiname || `beleg-${params.id}.pdf`).replace(/[^\w.-]/g, "_");
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
