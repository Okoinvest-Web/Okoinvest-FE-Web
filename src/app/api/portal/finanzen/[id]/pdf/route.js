// GET /api/portal/finanzen/[id]/pdf – Beleg als PDF (Gutschrift/Rechnung). Rechte wie /api/portal/finanzen/[id];
// Abruf wird protokolliert. `?anzeigen=1` zeigt das PDF im Browser statt Download.
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";
import { istDemo } from "@/lib/plattform/backend";
import { belegPdf } from "@/lib/plattform/finanzen/beleg-pdf";

export const GET = route({}, async ({ nutzer, params, ip, suche }) => {
  const b = await finanzenBackend().abrechnungPdfDaten(nutzer, params.id, { ip });
  const pdf = belegPdf(b, { demo: istDemo() });
  const name = `${b.beleg === "gutschrift" ? "Gutschrift" : "Rechnung"}-${b.nummer}.pdf`.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
});
