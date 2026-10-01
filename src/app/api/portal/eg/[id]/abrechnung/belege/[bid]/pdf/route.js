// GET /api/portal/eg/[id]/abrechnung/belege/[bid]/pdf – selbsterklärender Beleg (Rechnung, Gutschrift, Storno) als PDF
//     Mitglieder nur eigene, versendete Belege; Organe/Backoffice alle der Gemeinschaft. Der Abruf wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { istDemo } from "@/lib/plattform/backend";
import { egBelegPdf } from "@/lib/plattform/eg/beleg-pdf";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const d = await egBackend().abBelegPdf(nutzer, params.bid);
  if (d.beleg.gemeinschaftId !== params.id) throw new PlattformFehler(404, "Beleg nicht gefunden.");
  const name = String(d.beleg.nummer || "Beleg").replace(/\W+/g, "_") + ".pdf";
  return new Response(egBelegPdf(d.beleg, { demo: istDemo() }), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" },
  });
});
