// GET /api/portal/mitglied/pdf?art=beitritt|bestaetigung|ausschuettung|einladung|protokoll|eg&id=… – Muster-PDFs des
//     Mitgliederbereichs (eigene Mitgliedschaft bzw. Backoffice „genossenschaft“), Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { mitgliedPdf } from "@/lib/plattform/server/mitglied-pdf";
import { istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";

const ARTEN = ["beitritt", "bestaetigung", "ausschuettung", "einladung", "protokoll", "eg"];

export const GET = route({ rollen: ["mitglied"] }, async ({ nutzer, suche, ip }) => {
  const art = suche.get("art") || "";
  const id = String(suche.get("id") || "").slice(0, 60);
  if (!ARTEN.includes(art) || !id) throw new PlattformFehler(422, "Unbekanntes Dokument.");
  const daten = await mitgliedBackend().mgDokument(nutzer, { art, id }, { ip });
  const { pdf, name } = mitgliedPdf(daten, { demo: istDemo() });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
