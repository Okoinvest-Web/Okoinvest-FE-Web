// GET /api/portal/grundbuch/[id]/muster[?vorlage=dienstbarkeit_freiflaeche|dachnutzung_servitut|rangruecktritt|loeschung_hinweis] –
//     Muster-PDF (keine Rechtsberatung) für Eigentümer der Akte bzw. Backoffice; Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { grundbuchPdf } from "@/lib/plattform/closing/pdfSatz";
import { istDemo } from "@/lib/plattform/backend";

export const GET = route({}, async ({ nutzer, params, suche, ip }) => {
  const vorlage = /^[a-z_]{3,40}$/.test(suche.get("vorlage") || "") ? suche.get("vorlage") : "";
  const daten = await closingBackend().gbMusterDaten(nutzer, params.id, { vorlage, ip });
  const { pdf, name } = grundbuchPdf(daten, { demo: istDemo() });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
