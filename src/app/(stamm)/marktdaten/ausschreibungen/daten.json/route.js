// GET /marktdaten/ausschreibungen/daten.json[?land=DE|AT|CH] – Ausschreibungs-Monitor als JSON (CC BY 4.0)
// Welle 3, Paket B9. Daten: src/data/ausschreibungsmonitor.js, Export: src/lib/marktdaten/monitor.js.
// Ohne land: alle Länder (jede Reihe mit Länderkennung). Unbekanntes Land → 400.
import { alsJson, MONITOR_LAENDER } from "@/lib/marktdaten/monitor";

export const revalidate = 3600;

export function GET(request) {
  const roh = new URL(request.url).searchParams.get("land");
  const land = roh ? roh.toUpperCase() : null;
  if (land && !MONITOR_LAENDER.includes(land)) return Response.json({ fehler: "Unbekanntes Land (DE, AT oder CH)." }, { status: 400 });
  return Response.json(alsJson(land, new Date()), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
      Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"',
    },
  });
}
