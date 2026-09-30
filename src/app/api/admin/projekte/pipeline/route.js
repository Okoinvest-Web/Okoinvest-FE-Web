// GET /api/admin/projekte/pipeline?land=&phase=&format=csv – Verkaufs-Pipeline aller Projekte (Kanban, Wahrscheinlichkeit, erwartete Provision)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
const datei = (text, name, typ, latin1 = false) => new Response(latin1 ? Buffer.from(text, "latin1") : text, { headers: { "Content-Type": typ, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const filter = { land: suche.get("land") || "", phase: suche.get("phase") || "" };
  if (suche.get("format") === "csv") {
    const r = await werkzeugeBackend().dealBericht(nutzer, filter);
    return datei(r.csv, `Deal-Bericht-${r.heute}.csv`, "text/csv; charset=utf-8");
  }
  return { ok: true, ...(await werkzeugeBackend().dealPipeline(nutzer, filter)) };
});
