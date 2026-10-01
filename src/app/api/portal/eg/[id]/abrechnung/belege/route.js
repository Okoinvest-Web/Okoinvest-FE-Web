// GET /api/portal/eg/[id]/abrechnung/belege?periodeId=&mitgliedId= – Belege der Gemeinschaft (Organe/Backoffice) bzw. eigene Belege
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const mitgliedId = suche.get("mitgliedId") || "";
  const r = await egBackend().abBelege(nutzer, mitgliedId ? { mitgliedId } : { gemeinschaftId: params.id, periodeId: suche.get("periodeId") || "" });
  return { ok: true, ...r, belege: (r.belege || []).filter((b) => b.gemeinschaftId === params.id) };
});
