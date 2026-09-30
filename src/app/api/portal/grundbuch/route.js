// GET /api/portal/grundbuch – eigene Grundbuch-Akten (Eigentümer bzw. Dachgeber); mit ?bezugArt=flaeche|anlage&bezugId= nur Akten zu diesem Objekt
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({}, async ({ nutzer, suche }) => {
  const bezugArt = ["flaeche", "anlage"].includes(suche.get("bezugArt")) ? suche.get("bezugArt") : "";
  if (bezugArt) return { ok: true, ...(await closingBackend().gbZuBezug(nutzer, { bezugArt, bezugId: String(suche.get("bezugId") || "").slice(0, 40) })) };
  return { ok: true, ...(await closingBackend().gbMeine(nutzer)) };
});
