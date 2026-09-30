// GET /api/admin/entwicklung/steuerung/export?format=pdf|csv – Pipeline-Bericht (MWp je Phase × Land, Ziel-Abgleich,
//     Projektampel, Kapazität, Top-Risiken) als PDF (Bereich „entwicklung“ lesen) bzw. Projektliste als CSV für Excel-DE
//     (zusätzlich Bereich „export“). ?anzeigen=1 zeigt das PDF im Browser.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { fehlendeRechte } from "@/lib/plattform/rechte";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";
import { pipelineBerichtCsv, pipelineBerichtPdf } from "@/lib/plattform/server/entwicklung-steuerung-pdf";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const format = suche.get("format") === "csv" ? "csv" : "pdf";
  if (format === "csv" && fehlendeRechte(nutzer, [{ bereich: "export", stufe: 1 }]).length) throw new PlattformFehler(403, "Für CSV-Exporte fehlt Ihnen das Recht „Export“.");
  const d = await steuerungBackend().steuerungUebersicht(nutzer);
  const basis = `Pipeline-Bericht_${d.stand}`;
  if (format === "csv") {
    return new Response(pipelineBerichtCsv(d), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${basis}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  const pdf = pipelineBerichtPdf(d, { ersteller: nutzer });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${basis}.pdf"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
