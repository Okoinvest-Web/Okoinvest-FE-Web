// GET /api/land – Ländervorschlag (Welle 2, Masterplan Abschnitt 4)
//
// Liefert NUR einen Vorschlag aus Accept-Language bzw. dem Länder-Header des Hostings.
// Keine Weiterleitung, kein Cookie, kein Vary auf Geo-Header, nie zwischenspeichern.
// Das Client-Banner (src/components/Land/LaenderHinweis.js) zeigt daraus einen schließbaren Hinweis.
import { NextResponse } from "next/server";
import { GEO_HEADER, landVorschlag } from "@/lib/land";

export const dynamic = "force-dynamic";

export function GET(request) {
  const geo = GEO_HEADER.map((h) => request.headers.get(h)).find(Boolean) || null;
  const ergebnis = landVorschlag({ acceptLanguage: request.headers.get("accept-language"), geo });
  return NextResponse.json(ergebnis, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
