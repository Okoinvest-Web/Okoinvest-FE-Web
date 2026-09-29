// GET  /api/portal/projekte – eigene Projekte (Anbieter) inkl. Statistik
// POST /api/portal/projekte – Projekt als Entwurf anlegen
import { route } from "@/lib/plattform/server/route";

export const GET = route({ rollen: ["anbieter"] }, async ({ backend, nutzer }) => ({ ok: true, projekte: await backend.projekte(nutzer) }));

export const POST = route({ rollen: ["anbieter"], maxBytes: 96 * 1024 }, async ({ backend, nutzer, body, ip }) => ({
  ok: true,
  projekt: await backend.projektAnlegen(nutzer, body, { ip }),
}));
