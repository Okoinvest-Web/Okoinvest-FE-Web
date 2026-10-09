// GET /api/land – stillgelegt (Ländermodell nach Vorgabe des Inhabers)
//
// Der Ländervorschlag aus Welle 2 (Accept-Language/Geo-Header → Banner) entfällt: Das Land wählt
// der Besucher selbst in der Kopfleiste oder über die Adresse (/de, /at, /ch). Die Route wertet
// keine Kopfzeilen mehr aus und antwortet mit 410. Sie kann gelöscht werden (offener Punkt).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ vorschlag: null, quelle: null, hinweis: "entfallen" }, { status: 410, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
