// GET   /api/portal/flaechen/[id] – eine Fläche (Eigentümer oder Admin)
// PATCH /api/portal/flaechen/[id] – bearbeiten (Eigentümer nur in Entwurf/Eingegangen)
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, params }) => ({ ok: true, flaeche: await backend.flaeche(nutzer, params.id) }));

export const PATCH = route({}, async ({ backend, nutzer, params, body }) => ({ ok: true, flaeche: await backend.flaecheAendern(nutzer, params.id, body) }));
