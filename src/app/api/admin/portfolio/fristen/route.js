// POST /api/admin/portfolio/fristen – Fristenlauf manuell (Erinnerung vor Fälligkeit, Verzug, Covenant-Ampel); Frappe: Scheduler täglich
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const POST = route({ admin: true }, async ({ nutzer }) => ({ ok: true, lauf: await portfolioBackend().pfFristenLauf(nutzer) }));
