// GET /api/admin/finanzierung/[id]/reporting – Quartalsbericht an die Bank (PDF: DSCR/LLCR, Ampel, Monatswerte, Berichtspflichten)
//     – lesen; setzt die nächste Reporting-Frist, protokolliert
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { reportingPdf } from "@/lib/plattform/server/finanzierung-pdf";

export const GET = route({ admin: true }, async ({ nutzer, params, ip, suche }) => {
  const d = await finanzierungBackend().fzReportingDaten(nutzer, params.id, { ip });
  return new Response(reportingPdf(d), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="Bank-Reporting-${params.id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
});
