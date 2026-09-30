// GET ?art=vergleich|zuschlag|vollmacht|kundenbericht&id= – PDF (Angebotsvergleich, Zuschlagsschreiben, Beschaffungsvollmacht,
//     Beschaffungsbericht je Kunde: Backoffice mit id = Kunde, Kunde nur eigener Bericht).
// Rechte prüft das Backend (Backoffice; Kunde nur eigene Ausschreibung/Vollmacht; Versorger nur eigenes Zuschlagsschreiben).
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { angebotsvergleichPdf, vollmachtPdf, zuschlagPdf } from "@/lib/plattform/energie/pdf";
import { kundenberichtPdf } from "@/lib/plattform/energie/kundenbericht-pdf"; // Beschaffungsbericht je Kunde

export const GET = route({ limit: "export" }, async ({ nutzer, suche }) => {
  const art = suche.get("art") || "";
  if (!["vergleich", "zuschlag", "vollmacht", "kundenbericht"].includes(art)) throw new PlattformFehler(422, "Unbekannte Dokumentart.");
  const d = await energieBackend().energieDokumentDaten(nutzer, { art, id: suche.get("id") || "" });
  const pdf = art === "vergleich" ? angebotsvergleichPdf(d) : art === "zuschlag" ? zuschlagPdf(d) : art === "kundenbericht" ? kundenberichtPdf(d) : vollmachtPdf(d);
  const name = { vergleich: "angebotsvergleich", zuschlag: "zuschlagsschreiben", vollmacht: "beschaffungsvollmacht", kundenbericht: "beschaffungsbericht" }[art];
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-${name}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
