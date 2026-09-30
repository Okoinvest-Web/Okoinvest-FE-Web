// GET /api/portal/anlagen/[id]/zaehler[?format=csv&art=abrechnung|monitoring]
//   abrechnung  – Zählerstand-Monatswerte der abrechnungsrelevanten (geeichten) Messpunkte aus dem Backend
//   monitoring  – Monatsstände aus den MQTT-Messwerten (nicht eichrechtskonform)
// Rechteprüfung über das Backend (fremde Anlage → 403).
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { messdaten } from "@/lib/plattform/messdaten";
import { csv } from "@/lib/plattform/csv";

const kopf = (dateiname) => ({
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": `attachment; filename="${dateiname}"`,
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
});

async function monitoringLaden(a) {
  try {
    return await messdaten().zaehlerMonat(a, { monate: 13 });
  } catch {
    return [];
  }
}

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const b = anlagenBackend();
  const a = await b.anlage(nutzer, params.id);
  const [abrechnung, monitoring] = await Promise.all([b.zaehlerMonatswerte(nutzer, a.id), monitoringLaden(a)]);
  if (suche.get("format") === "csv") {
    if (suche.get("art") === "monitoring") {
      const spalten = [
        { label: "Monat", wert: "monat" },
        { label: "Vollständig", wert: "vollstaendig" },
        { label: "Erzeugung Beginn (kWh)", wert: (z) => z.beginn?.erzeugungKwh },
        { label: "Erzeugung Ende (kWh)", wert: (z) => z.ende?.erzeugungKwh },
        { label: "Erzeugung (kWh)", wert: "erzeugungKwh" },
        { label: "Netzbezug (kWh)", wert: "netzbezugKwh" },
        { label: "Einspeisung (kWh)", wert: "einspeisungKwh" },
        { label: "Hinweis", wert: () => "Monitoring (MQTT) – nicht abrechnungsrelevant" },
      ];
      return new Response(csv(spalten, monitoring), { headers: kopf(`zaehler-monitoring-${a.id}.csv`) });
    }
    const spalten = [
      { label: "Monat", wert: "monat" },
      { label: "Zählernummer", wert: "zaehlernummer" },
      { label: "Messpunkt", wert: "bezeichnung" },
      { label: "Register (OBIS)", wert: "register" },
      { label: "Register", wert: "registerLabel" },
      { label: "Zählerstand (kWh)", wert: "stand" },
      { label: "Menge (kWh)", wert: "menge" },
      { label: "Quelle", wert: "quelle" },
      { label: "Geprüft", wert: "geprueft" },
    ];
    return new Response(csv(spalten, abrechnung), { headers: kopf(`zaehlerstaende-${a.id}.csv`) });
  }
  return { ok: true, abrechnung, monitoring };
});
