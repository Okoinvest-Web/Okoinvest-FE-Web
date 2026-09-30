// GET /api/portal/datenraum?projekt=P-…[&besuch=1] – Datenraum nach Standard-Index (Ordner, Versionen, Stufen)
//     besuch=1 protokolliert beim Investor „Datenraum geöffnet“ (höchstens alle 30 Minuten)
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({}, async ({ nutzer, suche, ip }) => ({
  ok: true,
  datenraum: await dealroom().datenraum(nutzer, suche.get("projekt") || "", { besuch: suche.get("besuch") === "1", ip }),
}));
