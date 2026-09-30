// GET  /api/admin/anlagen/betrieb/auftraege/[id] – Auftragsschreiben als PDF (an den Dienstleister)
// POST /api/admin/anlagen/betrieb/auftraege/[id] – { status: beauftragt|terminiert|vor_ort|erledigt|storniert, termin?, bericht?, erledigtAm?, grund?, kostenEur? }
//      oder { aendern: true, … } (Angaben eines offenen Auftrags ändern)
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { serviceauftragPdf } from "@/lib/plattform/betrieb/pdf";

export const GET = route({ admin: true }, async ({ nutzer, params }) => {
  rateLimit(`betrieb-pdf:${nutzer.id}`, ...grenze("upload")); // je Konto (Backoffice), nicht je IP
  const d = await betriebBackend().betriebAuftrag(nutzer, params.id);
  return new Response(serviceauftragPdf(d), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-serviceauftrag-${d.auftrag.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const b = betriebBackend();
  if (body.aendern) return { ok: true, auftrag: await b.betriebAuftragSpeichern(nutzer, { ...body, id: params.id }) };
  return { ok: true, auftrag: await b.betriebAuftragAktion(nutzer, params.id, body) };
});
