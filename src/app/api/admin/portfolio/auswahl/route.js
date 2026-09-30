// GET /api/admin/portfolio/auswahl – Investorenkonten, Entwicklungsprojekte (Co-Development), Arten und Typen für „Position anlegen“
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await portfolioBackend().pfAuswahl(nutzer)) }));
