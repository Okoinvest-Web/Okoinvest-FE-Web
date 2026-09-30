// GET /api/portal/bank/[id]/dokument/[dok] – Download aus dem Bankenpaket, nur freigegebene Bausteine:
//     dok = steckbrief | financial_model (PDF; `?format=csv` Financial Model als CSV) | Dokument-ID (Upload). Abruf protokolliert.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { modellCsv, modellPdf } from "@/lib/plattform/server/finanzierung-pdf";

const KOPF = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" };

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, params, ip, suche }) => {
  const b = finanzierungBackend();
  if (params.dok === "steckbrief" || params.dok === "financial_model") {
    const m = await b.fzModellDaten(nutzer, "", { anfrageId: params.id, baustein: params.dok, ip });
    if (suche.get("format") === "csv" && params.dok === "financial_model") return new Response(modellCsv(m), { headers: { ...KOPF, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="Financial-Model.csv"' } });
    return new Response(modellPdf(m, { art: params.dok }), { headers: { ...KOPF, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${params.dok === "steckbrief" ? "Projektsteckbrief" : "Financial-Model"}.pdf"` } });
  }
  if (!/^FD-/.test(params.dok)) throw new PlattformFehler(404, "Nicht gefunden.");
  const d = await b.fzDokumentLesen(nutzer, params.dok, { anfrageId: params.id, ip });
  return new Response(d.daten, { headers: { ...KOPF, "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${String(d.name).replace(/[^A-Za-z0-9._-]/g, "_")}"` } });
});
