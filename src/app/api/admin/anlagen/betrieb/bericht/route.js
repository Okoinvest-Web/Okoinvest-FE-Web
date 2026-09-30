// GET /api/admin/anlagen/betrieb/bericht?anlageId=AL-…&zeitraum=JJJJ-MM|JJJJ – Monats- bzw. Jahresbericht der Anlage (PDF)
// Rechte: Backoffice mit Leserecht „anlagen“; Messdaten erst nach der Rechteprüfung über das Backend.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { berichtDaten } from "@/lib/plattform/betrieb/auswertung";
import { betriebsberichtPdf } from "@/lib/plattform/betrieb/pdf";
import { BetriebFehler } from "@/lib/plattform/betrieb/kern";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  rateLimit(`betrieb-pdf:${nutzer.id}`, ...grenze("upload")); // je Konto (Backoffice), nicht je IP
  let d;
  try {
    d = await berichtDaten(nutzer, suche.get("anlageId") || "", suche.get("zeitraum") || "");
  } catch (e) {
    if (e instanceof BetriebFehler) throw new PlattformFehler(e.status, e.message);
    throw e;
  }
  const name = `oekoinvest-${d.zeitraum.art === "jahr" ? "jahresbericht" : "monatsbericht"}-${d.anlage.id}-${d.zeitraum.schluessel}.pdf`;
  return new Response(betriebsberichtPdf(d), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
