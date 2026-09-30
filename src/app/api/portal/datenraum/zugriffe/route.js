// GET /api/portal/datenraum/zugriffe?projekt=P-… – Zugriffsprotokoll je Investor (Anbieter: Pseudonyme, Backoffice: Namen)
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({ rollen: ["anbieter"] }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await dealroom().datenraumZugriffe(nutzer, suche.get("projekt") || "", { limit: Number(suche.get("limit")) || 300 })),
}));
