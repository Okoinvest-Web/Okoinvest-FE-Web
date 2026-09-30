// GET /api/admin/finanzierung/[id]/modell[?art=steckbrief|financial_model][&format=csv] – Financial Model bzw. Projektsteckbrief
//     als PDF (Financial Model auch als CSV) – lesen, protokolliert
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { modellCsv, modellPdf } from "@/lib/plattform/server/finanzierung-pdf";

const KOPF = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" };

export const GET = route({ admin: true }, async ({ nutzer, params, ip, suche }) => {
  const art = suche.get("art") === "steckbrief" ? "steckbrief" : "financial_model";
  const m = await finanzierungBackend().fzModellDaten(nutzer, params.id, { baustein: art, ip });
  if (suche.get("format") === "csv") {
    return new Response(modellCsv(m), { headers: { ...KOPF, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="Financial-Model-${params.id}.csv"` } });
  }
  const datei = `${art === "steckbrief" ? "Projektsteckbrief" : "Financial-Model"}-${params.id}.pdf`;
  return new Response(modellPdf(m, { art }), { headers: { ...KOPF, "Content-Type": "application/pdf", "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${datei}"` } });
});
