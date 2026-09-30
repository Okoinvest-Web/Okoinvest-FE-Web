// GET /api/portal/closing/[id]/pdf?art=spa|bericht – SPA-Muster (keine Rechtsberatung) bzw. Abschlussbericht (nach Closing) als PDF;
//     Beteiligte und Backoffice, Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { closingPdf } from "@/lib/plattform/closing/pdfSatz";
import { istDemo } from "@/lib/plattform/backend";

export const GET = route({}, async ({ nutzer, params, suche, ip }) => {
  const art = suche.get("art") === "bericht" ? "bericht" : "spa";
  const daten = await closingBackend().clDokumentDaten(nutzer, params.id, { art, ip });
  const { pdf, name } = closingPdf(daten, { demo: istDemo() });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
