// GET /api/portal/gutachter/[id]/pdf?art=auftrag|abnahme – Auftragsbestätigung bzw. Abnahmeprotokoll des eigenen Auftrags
import { route } from "@/lib/plattform/server/route";
import { pdfAntwort } from "@/lib/plattform/server/formularDatei";
import { abnahmePdf, auftragPdf } from "@/lib/plattform/server/gutachter-pdf";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ rollen: ["gutachter"] }, async ({ nutzer, params, suche }) => {
  const art = suche.get("art") === "abnahme" ? "abnahme" : "auftrag";
  const d = await gutachterBackend().gaPdfDaten(nutzer, params.id, { art });
  return pdfAntwort(art === "abnahme" ? abnahmePdf(d) : auftragPdf(d), `${art === "abnahme" ? "Abnahmeprotokoll" : "Auftragsbestaetigung"}-${params.id}.pdf`);
});
