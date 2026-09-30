// GET /api/admin/portfolio/[id]/bericht?art=quartal|jahr&periode=2026-Q2|2025 – Quartals- bzw. Jahresbericht als PDF (protokolliert)
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";
import { portfolioBerichtPdf } from "@/lib/plattform/portfolio/pdf";
import { istDemo } from "@/lib/plattform/backend";

export const GET = route({ admin: true }, async ({ nutzer, params, suche, ip }) => {
  const daten = await portfolioBackend().pfBerichtDaten(nutzer, params.id, { art: suche.get("art") === "jahr" ? "jahr" : "quartal", periode: String(suche.get("periode") || "").slice(0, 7), ip });
  const { pdf, name } = portfolioBerichtPdf(daten, { demo: istDemo() });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
