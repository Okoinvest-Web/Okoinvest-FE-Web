// GET /marktdaten/ausschreibungen/daten.csv[?land=DE|AT|CH] – Ausschreibungs-Monitor als CSV (CC BY 4.0)
// Welle 3, Paket B9. Daten: src/data/ausschreibungsmonitor.js, Export: src/lib/marktdaten/monitor.js.
// Ohne land: alle Länder, jede Zeile mit Länderkennung. Unbekanntes Land → 400.
import { alsCsv, MONITOR_LAENDER } from "@/lib/marktdaten/monitor";

export const revalidate = 3600;

export function GET(request) {
  const roh = new URL(request.url).searchParams.get("land");
  const land = roh ? roh.toUpperCase() : null;
  if (land && !MONITOR_LAENDER.includes(land)) return new Response("Unbekanntes Land (DE, AT oder CH).", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const name = `oekoinvest-ausschreibungsmonitor-${(land || "dach").toLowerCase()}.csv`;
  return new Response("﻿" + alsCsv(land), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
      Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"',
    },
  });
}
