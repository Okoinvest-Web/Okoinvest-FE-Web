// GET   /api/admin/portfolio/[id] – Position mit allen Details (Bereich „portfolio“ lesen)
// PATCH /api/admin/portfolio/[id] – Stammdaten (P50, Vergütung, Betriebskosten, Schuldendienst, Covenant-Grenzen, Zusage …)
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, position: await portfolioBackend().pfPosition(nutzer, params.id) }));
export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, position: await portfolioBackend().pfAendern(nutzer, params.id, body) }));
