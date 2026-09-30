// GET /api/portal/pipeline/cockpit?projekt=P-…[&tage=60] – Anbieter-Cockpit: Trichter, Aufrufe über Zeit,
//     offene Fragen, Bieterstand (nach Freigabe), Zugriffe – nur Anbieter des Projekts und Backoffice
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({ rollen: ["anbieter"] }, async ({ nutzer, suche }) => ({
  ok: true,
  cockpit: await dealroom().dealCockpit(nutzer, suche.get("projekt") || "", { tage: Number(suche.get("tage")) || 60 }),
}));
