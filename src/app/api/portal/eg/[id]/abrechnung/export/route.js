// GET /api/portal/eg/[id]/abrechnung/export?art=bmd|rzl|datev|ea|kassabuch|belegjournal|paket&jahr= – Download (protokolliert)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { latin1 } from "@/lib/plattform/buchhaltung/export";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const d = await egBackend().abExport(nutzer, params.id, { art: suche.get("art") || "ea", jahr: suche.get("jahr") || "" });
  const inhalt = String(d.mime).includes("windows-1252") ? Buffer.from(latin1(d.inhalt), "latin1") : d.inhalt;
  const name = String(d.dateiname || "export.csv").replace(/\s+/g, "_");
  return new Response(inhalt, { headers: { "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
