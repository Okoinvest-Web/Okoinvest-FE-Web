// GET /api/portal/anbieter/[projektId]/vermittlungsauftrag – Vermittlungsauftrag als PDF (Muster; Anbieter/Team und Backoffice, Abruf protokolliert)
import { route } from "@/lib/plattform/server/route";
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";
import { vermittlungsauftragPdf } from "@/lib/plattform/server/vermittlungsauftrag-pdf";

export const GET = route({ rollen: ["anbieter", "investor"] }, async ({ nutzer, params, ip }) => {
  const d = await anbieterBackend().vermittlungsauftragDaten(nutzer, params.projektId, { ip });
  const pdf = vermittlungsauftragPdf(d);
  const name = `Vermittlungsauftrag-${String(params.projektId).replace(/[^A-Z0-9-]/gi, "")}.pdf`;
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
