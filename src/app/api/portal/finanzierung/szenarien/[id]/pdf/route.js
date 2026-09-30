// GET /api/portal/finanzierung/szenarien/[id]/pdf – Finanzierungsvergleich als PDF (nur eigenes Szenario; mit Projektbezug
//     wird der Datenraum-Zugriff erneut geprüft). Abruf wird protokolliert. `?anzeigen=1` zeigt das PDF im Browser.
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { szenarioPdf } from "@/lib/plattform/server/finanzierung-pdf";

export const GET = route({}, async ({ nutzer, params, ip, suche }) => {
  const s = await finanzierungBackend().fzSzenario(nutzer, params.id, { ip });
  const name = `Finanzierungsvergleich-${s.name}.pdf`.replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(szenarioPdf(s), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
});
