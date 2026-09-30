// GET /api/admin/finanzierung/bankakte/[anfrageId]/berichte/[bid] – eingereichter Covenant-Report als PDF (Bereich „finanzierung“ lesen)
import { route } from "@/lib/plattform/server/route";
import { pdfAntwort } from "@/lib/plattform/server/formularDatei";
import { reportingPdf } from "@/lib/plattform/server/finanzierung-pdf";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => {
  const d = await bankakteBackend().baBerichtDaten(nutzer, params.anfrageId, params.bid, { ip });
  return pdfAntwort(reportingPdf(d), `Covenant-Report-${String(d.periode || "").replace(/[^A-Za-z0-9]/g, "-")}.pdf`);
});
