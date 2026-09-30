// GET /api/admin/entwicklung/vorlagen/[vid]/pdf – Entscheidungsvorlage für die Geschäftsführung als PDF (Bereich „entwicklung“
//     lesen). Inhalt: Beschlussvorschlag, Sachverhalt, Kennzahlen-Momentaufnahme, Ampel, Termine, Risiken, Geschäftsmodell-
//     Vergleich, Entscheidung. ?anzeigen=1 zeigt das PDF im Browser.
import { route } from "@/lib/plattform/server/route";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";
import { vorlagePdf } from "@/lib/plattform/server/entwicklung-steuerung-pdf";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const x = await steuerungBackend().vorlageHolen(nutzer, params.vid);
  const pdf = vorlagePdf(x, { ersteller: nutzer });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf", "Content-Length": String(pdf.length),
      "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="Entscheidungsvorlage_${x.id}.pdf"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
