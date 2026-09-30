// GET /api/portal/projekte/[id]/expose – vertrauliches Exposé als PDF
// Berechtigt: Backoffice, Anbieter des Projekts, Investoren mit freigegebenem Datenraum (NDA). Abruf wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { exposeDateiname, exposePdf } from "@/lib/plattform/server/expose";

export const GET = route({}, async ({ backend, nutzer, params, ip }) => {
  const d = await backend.exposeDaten(nutzer, params.id, { ip });
  const pdf = exposePdf({ ...d, teaser: false });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${exposeDateiname(d.projekt)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
