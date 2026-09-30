// GET /api/admin/hr/auswertung?projekt=&von=&bis= – Schnittstelle Projektentwicklung/Finanzen: Stunden je Projekt und Tätigkeit
// (Bereich team, entwicklung oder finanzen lesen – prüft das Backend)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true, recht: [{ bereich: "cockpit", stufe: 1 }] }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await serviceBackend().zeitenAuswertung(nutzer, { projektId: suche.get("projekt") || "", von: suche.get("von") || "", bis: suche.get("bis") || "" })),
}));
