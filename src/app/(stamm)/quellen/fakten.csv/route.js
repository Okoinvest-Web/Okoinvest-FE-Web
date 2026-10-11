// /quellen/fakten.csv – CSV-Export des Faktenregisters (Welle 4, Paket FAKTEN)
//
// Dieselben Einträge wie die Seite /quellen (quellenEintraege(), ohne Entwürfe), als CSV
// mit Semikolon und UTF-8 (RFC-4180-Anführung). Lizenz der Zusammenstellung: CC BY 4.0
// (Spalte „lizenz“ und Link-Kopfzeile); die je Zeile genannte Primärquelle behält ihre
// eigenen Bedingungen. Höchstens stündlich neu erzeugt (wie die Seite).

import { LIZENZ, alsCsv, quellenEintraege } from "@/lib/quellen/fakten";

export const revalidate = 3600;

export async function GET() {
  const csv = alsCsv(quellenEintraege({ heute: new Date() }));
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="oekoinvest-faktenregister.csv"',
      Link: `<${LIZENZ.url}>; rel="license"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
