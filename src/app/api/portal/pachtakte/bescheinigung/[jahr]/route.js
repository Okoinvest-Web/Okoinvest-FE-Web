// GET /api/portal/pachtakte/bescheinigung/[jahr] – Jahresbescheinigung über Pachtzahlungen als PDF (nur eigene
// Gutschriften; Abruf wird protokolliert). `?anzeigen=1` zeigt das PDF im Browser statt Download.
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { istDemo } from "@/lib/plattform/backend";
import { jahresbescheinigungPdf } from "@/lib/plattform/server/pachtakte-pdf";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ rollen: ["flaeche", "landwirt"] }, async ({ nutzer, params, ip, suche }) => {
  if (!/^\d{4}$/.test(String(params.jahr))) throw new PlattformFehler(404, "Unbekanntes Jahr.");
  const d = await pachtakteBackend().jahresbescheinigungDaten(nutzer, { jahr: Number(params.jahr) }, { ip });
  const pdf = jahresbescheinigungPdf(d, { demo: istDemo() });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="Jahresbescheinigung-Pacht-${d.jahr}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
});
