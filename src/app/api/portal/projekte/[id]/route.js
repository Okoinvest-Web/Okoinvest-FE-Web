// GET   /api/portal/projekte/[id] – Projekt (Anbieter oder Admin)
// PATCH /api/portal/projekte/[id] – bearbeiten (Anbieter nur im Entwurf)
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, params }) => ({ ok: true, projekt: await backend.projekt(nutzer, params.id) }));

export const PATCH = route({ maxBytes: 96 * 1024 }, async ({ backend, nutzer, params, body }) => ({
  ok: true,
  projekt: await backend.projektAendern(nutzer, params.id, body),
}));
