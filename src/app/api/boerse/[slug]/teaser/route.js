// GET /api/boerse/[slug]/teaser – öffentlicher Projekt-Teaser als PDF (nur Felder der Positivliste, ohne Datenraum)
// Bewusst ohne Nutzer abgefragt: auch angemeldete Nutzer erhalten hier nie vertrauliche Angaben.
import { route } from "@/lib/plattform/server/route";
import { exposeDateiname, exposePdf } from "@/lib/plattform/server/expose";
import { SITE } from "@/data/site";

export const GET = route({ auth: false }, async ({ backend, params }) => {
  const d = await backend.boerseDetail(null, params.slug, { zaehlen: false });
  const p = d.projekt;
  const pdf = exposePdf({ projekt: p, teaser: true, portalUrl: `${String(SITE.url).replace(/[/]$/, "")}/projektboerse/${p.slug}` });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${exposeDateiname(p, true)}"`,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
