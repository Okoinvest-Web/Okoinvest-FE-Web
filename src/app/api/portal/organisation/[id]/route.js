// GET    /api/portal/organisation/[id] – Details inkl. Mitglieder, Einladungen (ab Admin), Objekte { ok, organisation }
// PATCH  /api/portal/organisation/[id] – { name?, art? } (ab Admin)
// DELETE /api/portal/organisation/[id] – nur Inhaber; Objekte werden wieder persönlich
// Nicht-Mitglieder → 403.
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, organisation: await sicherheit().organisation(nutzer, params.id) }));

export const PATCH = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  organisation: await sicherheit().organisationAendern(nutzer, params.id, { name: body.name, art: body.art }),
}));

export const DELETE = route({ json: false }, async ({ nutzer, params }) => sicherheit().organisationLoeschen(nutzer, params.id));
