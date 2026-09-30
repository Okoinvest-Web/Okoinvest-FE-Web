// GET /api/portal/bank/[id]/akte/berichte/[bid] – eingereichter Covenant-Report als PDF (Momentaufnahme bei Einreichung); Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { pdfAntwort } from "@/lib/plattform/server/formularDatei";
import { reportingPdf } from "@/lib/plattform/server/finanzierung-pdf";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, params, ip }) => {
  const d = await bankakteBackend().baBerichtDaten(nutzer, params.id, params.bid, { ip });
  return pdfAntwort(reportingPdf(d), `Covenant-Report-${String(d.periode || "").replace(/[^A-Za-z0-9]/g, "-")}.pdf`);
});
