// GET  /api/portal/support[?status=offen|erledigt] – eigene Tickets bzw. Tickets der Organisation
// POST /api/portal/support – Ticket eröffnen { betreff, text, kategorie, prioritaet?, anlageId? } (Anlage nur, wenn sichtbar)
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, tickets: await serviceBackend().tickets(nutzer, { status: suche.get("status") || "" }) }));

export const POST = route({}, async ({ nutzer, body }) => {
  rateLimit(`ticket:${nutzer.id}`, ...grenze("anfrage"));
  const ticket = await serviceBackend().ticketAnlegen(
    nutzer,
    { betreff: body.betreff, text: body.text, kategorie: body.kategorie, prioritaet: body.prioritaet, anlageId: body.anlageId || "" },
    { anlagePruefen: (id) => anlagenBackend().anlage(nutzer, id) } // Demo: Zugriff über das Anlagen-Modul (fremd → 403)
  );
  return Response.json({ ok: true, ticket }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
