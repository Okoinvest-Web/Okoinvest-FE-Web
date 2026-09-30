// GET /api/portal/kundenenergie/kosten?jahr=JJJJ[&format=csv|pdf] – Energiekostenbericht (Netzbezug × Energiepreis + Contracting-Solarstrom)
// Nur Unternehmen für die eigenen Verträge, Lastgänge und Rechnungen.
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";
import { csv } from "@/lib/plattform/csv";
import { kostenberichtPdf } from "@/lib/plattform/server/kundenenergiePdf";

const SPALTEN = [
  { label: "Monat", wert: "monat" },
  { label: "Lieferant", wert: "lieferant" },
  { label: "Netzbezug kWh", wert: "netzKwh" },
  { label: "Netzbezug geschätzt", wert: "netzGeschaetzt" },
  { label: "Energiepreis ct/kWh", wert: "netzCt" },
  { label: "Energiekosten Netz €", wert: "netzEur" },
  { label: "Solarstrom kWh", wert: "pvKwh" },
  { label: "Solarstrom € netto", wert: "pvEur" },
  { label: "Solarstrom ct/kWh", wert: "pvCt" },
  { label: "Gesamt kWh", wert: "gesamtKwh" },
  { label: "Gesamt €", wert: "gesamtEur" },
  { label: "Mischpreis ct/kWh", wert: "mischpreisCt" },
  { label: "Ersparnis Solarstrom €", wert: "pvErsparnisEur" },
];

export const GET = route({ rollen: ["unternehmen"] }, async ({ nutzer, suche }) => {
  const format = suche.get("format") || "";
  const d = await kundenenergieBackend().kostenbericht(nutzer, { jahr: suche.get("jahr") || "" });
  const kopf = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (format === "csv") return new Response(csv(SPALTEN, d.monate), { headers: { ...kopf, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="oekoinvest-energiekosten-${d.jahr}.csv"` } });
  if (format === "pdf") return new Response(kostenberichtPdf(d), { headers: { ...kopf, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="oekoinvest-energiekosten-${d.jahr}.pdf"` } });
  return { ok: true, bericht: d };
});
