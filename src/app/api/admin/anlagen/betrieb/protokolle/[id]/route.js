// GET /api/admin/anlagen/betrieb/protokolle/[id] – Prüfprotokoll als PDF
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { pruefprotokollPdf } from "@/lib/plattform/betrieb/pdf";

export const GET = route({ admin: true }, async ({ nutzer, params }) => {
  rateLimit(`betrieb-pdf:${nutzer.id}`, ...grenze("upload")); // je Konto (Backoffice), nicht je IP
  const d = await betriebBackend().betriebProtokoll(nutzer, params.id);
  return new Response(pruefprotokollPdf(d), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-pruefprotokoll-${d.protokoll.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
