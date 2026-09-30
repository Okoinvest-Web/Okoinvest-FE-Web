// GET /api/portal/closing/[id]/termin – Notartermin als Kalenderdatei (.ics) für Beteiligte und Backoffice
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { notarIcs } from "@/lib/plattform/closing/pdfSatz";

export const GET = route({}, async ({ nutzer, params }) => {
  const t = await closingBackend().clTermin(nutzer, params.id);
  return new Response(notarIcs(t), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="notartermin-${t.id}.ics"`, "Cache-Control": "private, no-store" } });
});
