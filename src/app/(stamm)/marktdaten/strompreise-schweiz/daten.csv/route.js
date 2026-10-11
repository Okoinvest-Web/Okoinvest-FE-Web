// GET /marktdaten/strompreise-schweiz/daten.csv – CH-Strompreis-Atlas als CSV (CC BY 4.0)
// Welle 4, Paket CHATLAS. Daten: src/data/strompreisatlasCh.js, Export: src/lib/marktdaten/strompreisatlasCh.js.
// Statischer, versionierter Auszug der amtlichen ElCom-Tarifdaten (LINDAS) – kein Live-Abruf.
import { alsCsv } from "@/lib/marktdaten/strompreisatlasCh";

export const dynamic = "force-static";

export function GET() {
  return new Response("﻿" + alsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="oekoinvest-strompreisatlas-schweiz.csv"',
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
      Link: '<https://creativecommons.org/licenses/by/4.0/>; rel="license"',
    },
  });
}
