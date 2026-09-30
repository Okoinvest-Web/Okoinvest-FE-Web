// GET /api/portal/kundenenergie/anliegen/[id]/pdf – Eingangsbestätigung, Angebot bzw. Entscheidung als PDF (Kunde, Team, Backoffice Finanzen)
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";
import { anliegenPdf } from "@/lib/plattform/server/kundenenergiePdf";

export const GET = route({ limit: "export" }, async ({ nutzer, params }) => {
  const d = await kundenenergieBackend().kundenAnliegenDokument(nutzer, params.id);
  return new Response(anliegenPdf(d), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-anliegen-${d.anliegen.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
