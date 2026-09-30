// GET  /api/admin/support?status=&q= – alle Tickets mit SLA und Kennzahlen (Bereich „support“ lesen)
// POST /api/admin/support – { stoerungId } Ticket aus Anlagen-Störung | { fuerKontoId, betreff, text, kategorie, prioritaet } (schreiben)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const s = serviceBackend();
  const [tickets, kennzahlen] = await Promise.all([s.tickets(nutzer, { alle: true, status: suche.get("status") || "", q: suche.get("q") || "" }), s.ticketKennzahlen(nutzer)]);
  return { ok: true, tickets, kennzahlen };
});

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const s = serviceBackend();
  const ticket = body.stoerungId ? await s.ticketAusStoerung(nutzer, body.stoerungId) : await s.ticketAnlegen(nutzer, body);
  return Response.json({ ok: true, ticket }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
