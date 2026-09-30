// GET /api/portal/kundenenergie/vertragsdaten?ausschreibung=EA-…[&format=pdf] – Kundendaten und Lokationen für den Liefervertrag
// Nur der bezuschlagte Versorger (nach Freigabe durch alle Kunden) bzw. das Backoffice (Energie); jeder Abruf wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";
import { vertragsdatenPdf } from "@/lib/plattform/server/kundenenergiePdf";

export const GET = route({ rollen: ["lieferant"], limit: "export" }, async ({ nutzer, suche, ip }) => {
  const d = await kundenenergieBackend().vertragsdaten(nutzer, suche.get("ausschreibung") || "", { ip });
  if (suche.get("format") !== "pdf") return { ok: true, vertragsdaten: d };
  return new Response(vertragsdatenPdf(d), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-vertragsdatenblatt-${d.ausschreibung.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
