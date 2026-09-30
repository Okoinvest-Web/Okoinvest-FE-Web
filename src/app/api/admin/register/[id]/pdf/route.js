// GET /api/admin/register/[id]/pdf – Registerauskunft als PDF (Ablage im KYC-Fall: rohdatenRef zeigt hierher)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, params }) => {
  const { pdf, name } = await diensteBackend().registerAuskunftPdf(nutzer, params.id);
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
