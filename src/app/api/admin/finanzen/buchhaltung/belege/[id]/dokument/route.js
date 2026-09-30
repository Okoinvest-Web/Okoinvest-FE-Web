// GET /api/admin/finanzen/buchhaltung/belege/[id]/dokument?art=mahnung&nr=MA-…|art=storno – PDF (Backoffice)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { istDemo } from "@/lib/plattform/backend";
import { dokumentPdf } from "@/lib/plattform/buchhaltung/dokument-pdf";
const pdfAntwort = (pdf, name, anzeigen) => new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${anzeigen ? "inline" : "attachment"}; filename="${name.replace(/[^A-Za-z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });

export const GET = route({ admin: true }, async ({ nutzer, params, suche, ip }) => {
  const d = await werkzeugeBackend().bhBelegDokument(nutzer, params.id, { art: suche.get("art"), nr: suche.get("nr") || "", ip });
  return pdfAntwort(dokumentPdf(d, { demo: istDemo() }), `${d.art === "storno" ? "Storno" : "Mahnung"}-${d.art === "storno" ? d.storno.nummer : d.mahnung.nr}.pdf`, suche.get("anzeigen") === "1");
});
