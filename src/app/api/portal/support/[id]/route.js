// GET   /api/portal/support/[id] – Ticket mit Verlauf (Kunde ohne interne Notizen)
// POST  /api/portal/support/[id] – Antwort { text, intern? } (intern nur Backoffice)
// PATCH /api/portal/support/[id] – { aktion: "schliessen" } (Kunde) bzw. status | prioritaet | zuweisen (Backoffice)
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ticket: await serviceBackend().ticket(nutzer, params.id) }));

export const POST = route({}, async ({ nutzer, params, body }) => {
  rateLimit(`nachricht:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, ticket: await serviceBackend().ticketAntworten(nutzer, params.id, { text: body.text, intern: body.intern === true }) };
});

export const PATCH = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  ticket: await serviceBackend().ticketAktion(nutzer, params.id, { aktion: body.aktion, status: body.status, prioritaet: body.prioritaet, zustaendigId: body.zustaendigId }),
}));
