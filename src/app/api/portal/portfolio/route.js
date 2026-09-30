// GET /api/portal/portfolio – eigene Positionen (Investor bzw. Organisation) mit Kennzahlen
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ rollen: ["investor"] }, async ({ nutzer }) => ({ ok: true, ...(await portfolioBackend().pfMeine(nutzer)) }));
