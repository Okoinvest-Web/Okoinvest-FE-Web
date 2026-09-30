// GET /api/admin/entwicklung/[id]/kalkulation/export?format=pdf|csv – Kostenrahmen als PDF (Bereich „entwicklung“ lesen)
//     bzw. CSV für Excel-DE (zusätzlich Bereich „export“). ?anzeigen=1 zeigt das PDF im Browser.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { fehlendeRechte } from "@/lib/plattform/rechte";
import { planungBackend } from "@/lib/plattform/backend/planung";
import { kostenCsv, kostenPdf } from "@/lib/plattform/server/kosten-pdf";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const format = suche.get("format") === "csv" ? "csv" : "pdf";
  if (format === "csv" && fehlendeRechte(nutzer, [{ bereich: "export", stufe: 1 }]).length) throw new PlattformFehler(403, "Für CSV-Exporte fehlt Ihnen das Recht „Export“.");
  const k = await planungBackend().kalkulationHolen(nutzer, params.id);
  const basis = `Kostenkalkulation_${k.projekt.id}_${k.kostenstand}_${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    return new Response(kostenCsv(k), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${basis}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
  const pdf = kostenPdf(k, { ersteller: nutzer });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": `${suche.get("anzeigen") === "1" ? "inline" : "attachment"}; filename="${basis}.pdf"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
