// POST /api/admin/finanzen/zahlungen/sepa – { ids: [Gutschrift-IDs], ausfuehrungAm? } → SEPA-Datei pain.001.001.09 (XML)
// Nur Bereich „finanzen“ schreiben (Leitung, Buchhaltung). Jede Gutschrift: offen + KYC verifiziert + geprüfte IBAN,
// sonst 409 (code „kyc“) und es entsteht keine Datei. Die Datei wird im Online-Banking eingereicht (keine Zahlung durch die App).
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const POST = route({ admin: true }, async ({ nutzer, body, ip }) => {
  const r = await finanzenBackend().sepaExport(nutzer, { ids: body.ids, ausfuehrungAm: body.ausfuehrungAm }, { ip });
  return new Response(r.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${r.dateiname}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Zahlungslauf": r.zahlungslauf.id,
    },
  });
});
